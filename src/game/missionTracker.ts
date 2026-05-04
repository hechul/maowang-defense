/**
 * 미션 진행 추적 헬퍼 (cyclic import 회피용)
 * GameEngine 이벤트에서 호출.
 */
import { useSaveStore } from '../store/useSaveStore';
import { MISSION_POOL, type MissionType } from './data/missions';
import { ACHIEVEMENTS } from './data/achievements';
import { Audio } from '../audio/AudioEngine';

export function trackMissionProgress(type: MissionType, value: number, mode: 'add' | 'max' = 'add') {
  const state = useSaveStore.getState();
  const today = new Date().toISOString().slice(0, 10);
  if (state.daily.date !== today) return;
  const updated = state.daily.missions.map((m) => {
    if (m.claimed) return m;
    const def = MISSION_POOL.find((x) => x.id === m.id);
    if (!def || def.type !== type) return m;
    const newProgress = mode === 'add'
      ? Math.min(def.target, m.progress + value)
      : Math.max(m.progress, value);
    // QO Q-2: 미션 target 도달 순간 큐에 추가 (UI banner용)
    if (m.progress < def.target && newProgress >= def.target) {
      missionCompletedQueue.push({ id: def.id, name: def.name, reward: def.reward, icon: def.icon });
    }
    return { ...m, progress: newProgress };
  });
  useSaveStore.setState({ daily: { ...state.daily, missions: updated } });
}

/** QO Q-2: 미션 완료 알림 큐 — UI에서 polling */
export const missionCompletedQueue: { id: string; name: string; reward: number; icon: string }[] = [];
export function popMissionCompleted() {
  return missionCompletedQueue.shift() || null;
}

/** 업적 잠금 해제 + 영혼석 자동 적립 + 알림 큐 */
export function unlockAchievement(id: string): boolean {
  const store = useSaveStore.getState();
  if (store.achievements.includes(id)) return false;
  const ach = ACHIEVEMENTS[id];
  if (!ach) return false;
  store.unlockAchievement(id);
  store.addStones(ach.reward);
  Audio.evolve_sfx();
  // 알림은 UI 레이어에서 큐 처리
  achievementQueue.push(id);
  return true;
}

/** 업적 알림 큐 (UI에서 polling) */
export const achievementQueue: string[] = [];

export function popAchievement(): string | null {
  return achievementQueue.shift() || null;
}

/** 챌린지 완료 체크 (웨이브 15 도달 시) */
export function checkChallengeClear(challengeId: string, wave: number) {
  if (wave < 15) return false;
  const store = useSaveStore.getState();
  if (store.challengesDone.includes(challengeId)) return false;
  store.markChallengeDone(challengeId);
  return true;
}
