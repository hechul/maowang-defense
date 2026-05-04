/**
 * P1-6 우편함 — 시즌 보상/이벤트/시스템 알림 비동기 수령.
 *
 * 정책:
 * - 새 메일은 unread, 클레임 후 자동 삭제 (id 보존).
 * - 만료(expiresAt) 지나면 UI에서 회색.
 * - 보상은 stones / recruit / interior / demonSkin / demonExp.
 */

export type MailRewardKind = 'stones' | 'recruit' | 'interior' | 'demonSkin' | 'demonExp' | 'none';

export interface MailReward {
  kind: MailRewardKind;
  amount?: number;
  id?: string;
}

export interface MailItem {
  id: string;                 // 중복 방지 키 (예: 'season-2026-S03-tier-10-free')
  title: string;
  body: string;
  reward: MailReward;
  sentAt: number;             // ms
  expiresAt?: number;         // ms (없으면 무기한)
  claimed: boolean;
}

export function makeMail(
  id: string,
  title: string,
  body: string,
  reward: MailReward,
  expiresInMs?: number,
): MailItem {
  const sentAt = Date.now();
  return {
    id,
    title,
    body,
    reward,
    sentAt,
    expiresAt: expiresInMs ? sentAt + expiresInMs : undefined,
    claimed: false,
  };
}

/** 보상 라벨 — UI 표기용. */
export function rewardLabel(r: MailReward): string {
  switch (r.kind) {
    case 'stones':    return `영혼석 +${r.amount ?? 0}`;
    case 'recruit':   return `한정 모집권: ${r.id}`;
    case 'interior':  return `인테리어: ${r.id}`;
    case 'demonSkin': return `마왕 외형: ${r.id}`;
    case 'demonExp':  return `마왕 EXP +${r.amount ?? 0}`;
    case 'none':      return '알림';
  }
}
