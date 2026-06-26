/**
 * 앱인토스 SDK 브리지
 * - 패키지 설치 후 실제 SDK 호출로 교체
 * - 미설치/개발 환경에서는 안전한 fallback (콘솔 로그 + 시뮬레이션)
 *
 * AIT_SENIOR_DEV §검수 영역 3 (기능): 광고/IAP/오프라인 안전 처리 필수
 */

import { ENABLE_MONETIZATION } from '../config/mvpFlags';

export type AdResult = { success: boolean; reward?: { type: string; amount: number } };
export type IapResult = { success: boolean; itemId: string; transactionId?: string; error?: string };
export type UserInfo = { userId: string; nickname: string; profileImageUrl?: string };

let sdkLoaded = false;
let sdkApi: any = null;

/**
 * SDK 동적 로드 — 번들 사이즈 절약 (lazy)
 * 실 환경: import('@apps-in-toss/web-framework').then(...)
 * 현재: 미설치 시 fallback 모드
 */
export async function ensureSdk(): Promise<boolean> {
  if (sdkLoaded) return sdkApi != null;
  try {
    sdkApi = await import('@apps-in-toss/web-framework');
    sdkLoaded = true;
    return true;
  } catch (e) {
    console.warn('[AitBridge] SDK 미설치 — fallback 모드');
    sdkLoaded = true;
    sdkApi = null;
    return false;
  }
}

/* ===== 초기화 ===== */
export async function initialize(): Promise<void> {
  const ok = await ensureSdk();
  if (!ok) return;
  try {
    await sdkApi.initialize?.({ appName: 'maowang-defense' });
  } catch (e) {
    console.warn('[AitBridge] initialize 실패', e);
  }
}

/* ===== 유저 정보 ===== */
export async function getUser(): Promise<UserInfo> {
  await ensureSdk();
  if (sdkApi?.getUser) {
    try {
      const u = await sdkApi.getUser();
      return { userId: u.id, nickname: u.nickname, profileImageUrl: u.profileImageUrl };
    } catch (e) {}
  }
  // Fallback: localStorage 기반 익명 ID
  let anon = localStorage.getItem('anonUserId');
  if (!anon) {
    anon = 'anon_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('anonUserId', anon);
  }
  return { userId: anon, nickname: '마왕수습생' };
}

/* ===== 광고 =====
 * 시뮬레이션 길이는 한국 모바일 시장 평균 보상 광고 5~7초에 맞춤.
 * 실제 SDK 호출 시에는 광고 네트워크 길이 그대로 사용 (보통 15~30초).
 */
const AD_SIMULATION_MS = {
  rewarded: 6000,   // 5~7초 보상 광고
  interstitial: 4000, // 4초 전면 광고
};

export async function showRewardedAd(placement: string): Promise<AdResult> {
  if (!ENABLE_MONETIZATION) {
    console.warn('[AitBridge] monetization disabled:', placement);
    return { success: false };
  }
  await ensureSdk();
  if (sdkApi?.showAd) {
    try {
      const r = await sdkApi.showAd({ type: 'rewarded', placement });
      return { success: r.completed === true, reward: r.reward };
    } catch (e) {
      return { success: false };
    }
  }
  // Fallback: 6초 시뮬레이션 (5~7초 평균)
  console.log('[AitBridge] 광고 시뮬레이션:', placement, AD_SIMULATION_MS.rewarded + 'ms');
  return new Promise((resolve) => {
    setTimeout(
      () => resolve({ success: true, reward: { type: placement, amount: 1 } }),
      AD_SIMULATION_MS.rewarded,
    );
  });
}

export async function showInterstitialAd(): Promise<void> {
  if (!ENABLE_MONETIZATION) return;
  await ensureSdk();
  if (sdkApi?.showAd) {
    try { await sdkApi.showAd({ type: 'interstitial' }); } catch (e) {}
    return;
  }
  // Fallback: 4초 전면 광고
  return new Promise((resolve) => {
    setTimeout(() => resolve(), AD_SIMULATION_MS.interstitial);
  });
}

/* ===== 인앱결제 ===== */
export async function purchaseItem(itemId: string): Promise<IapResult> {
  if (!ENABLE_MONETIZATION) {
    console.warn('[AitBridge] purchase blocked while monetization disabled:', itemId);
    return { success: false, itemId, error: 'monetization_disabled' };
  }
  await ensureSdk();
  if (sdkApi?.purchaseItem) {
    try {
      const r = await sdkApi.purchaseItem({ itemId });
      return { success: r.status === 'success', itemId, transactionId: r.transactionId };
    } catch (e: any) {
      return { success: false, itemId, error: e?.message };
    }
  }
  // Fallback
  console.log('[AitBridge] IAP 시뮬레이션:', itemId);
  return { success: true, itemId, transactionId: 'sim_' + Date.now() };
}

/* ===== 리더보드 ===== */
export type LeaderEntry = { userId: string; nickname: string; score: number; rank: number };

function readLocalLeaderboard(key: string): any[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    localStorage.removeItem(key);
    return [];
  }
}

export async function submitScore(score: number, leaderboardId = 'wave'): Promise<void> {
  await ensureSdk();
  if (sdkApi?.submitScore) {
    try { await sdkApi.submitScore({ leaderboardId, score }); } catch (e) {}
  }
  // Fallback: localStorage 저장
  const key = `lb_${leaderboardId}`;
  const cur = readLocalLeaderboard(key);
  const user = await getUser();
  cur.push({ userId: user.userId, nickname: user.nickname, score, ts: Date.now() });
  cur.sort((a: any, b: any) => b.score - a.score);
  localStorage.setItem(key, JSON.stringify(cur.slice(0, 100)));
}

export async function getLeaderboard(leaderboardId = 'wave', top = 10): Promise<LeaderEntry[]> {
  await ensureSdk();
  if (sdkApi?.getLeaderboard) {
    try {
      return await sdkApi.getLeaderboard({ leaderboardId, top });
    } catch (e) {}
  }
  // Fallback
  const key = `lb_${leaderboardId}`;
  const cur = readLocalLeaderboard(key);
  return cur.slice(0, top).map((e: any, i: number) => ({
    userId: e.userId, nickname: e.nickname, score: e.score, rank: i + 1,
  }));
}

/* ===== 푸시 알림 ===== */
export async function schedulePush(opts: { title: string; body: string; afterMs: number }): Promise<void> {
  await ensureSdk();
  if (sdkApi?.schedulePush) {
    try { await sdkApi.schedulePush(opts); } catch (e) {}
  }
  // Fallback: 시뮬레이션 (브라우저 알림 권한 사용)
  if ('Notification' in window) {
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification(opts.title, { body: opts.body });
      }
    }, opts.afterMs);
  }
}

/* ===== 공유 ===== */
export async function shareToFeed(text: string, imageUrl?: string): Promise<void> {
  await ensureSdk();
  if (sdkApi?.shareToFeed) {
    try { await sdkApi.shareToFeed({ text, imageUrl }); } catch (e) {}
  } else {
    // Fallback: navigator.share
    if (navigator.share) {
      navigator.share({ text, url: imageUrl }).catch(() => {});
    }
  }
}

/* ===== 햅틱 ===== */
export function haptic(pattern: 'light' | 'medium' | 'heavy' = 'light') {
  // A-1: 접근성 — haptic OFF 옵션
  try {
    const acc = (window as any).__hapticEnabled;
    if (acc === false) return;
  } catch (e) {}
  // 토스 SDK가 햅틱을 노출하면 그걸 우선 사용
  if (sdkApi?.haptic) {
    try { sdkApi.haptic(pattern); return; } catch (e) {}
  }
  // Fallback: navigator.vibrate
  const map = { light: 8, medium: 20, heavy: 40 };
  try { navigator.vibrate?.(map[pattern]); } catch (e) {}
}
