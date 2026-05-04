/**
 * P0-3 비동기 PvP — 다른 마왕 빌드 스냅샷과 같은 시드로 자동 대결.
 *
 * 정책:
 * - 자기 런 종료 시 마지막 빌드 스냅샷 자동 저장 (최근 5개 보존).
 * - PvP 진입: 시즌별 글로벌 NPC 풀 → 무작위 매칭 (실 SDK 미연동 시 mock).
 * - 비동기 = 결과는 도달 wave + 시간 비교 (양쪽 같은 시드로 동시 시뮬 X — 텍스트 결과 비교).
 * - 점수: wave * 100 + kills - duration * 2 (상대보다 높으면 승).
 * - 1주마다 랭크 리셋, 승점 누적.
 */

export interface PvpSnapshot {
  /** 스냅샷 ID — Date.now() */
  id: string;
  /** 닉네임 (자기 또는 상대) */
  nickname: string;
  /** 도달 wave */
  wave: number;
  /** 처치 수 */
  kills: number;
  /** 게임 진행 시간 (초) */
  durationSec: number;
  /** 사용한 마왕 ID */
  demonId: string;
  /** 시작 카드 풀 (덱 표시용) */
  deckPreview: string[];
  /** 사용한 유물 ID */
  relics: string[];
  /** 시즌 ID */
  seasonId: string;
}

export interface PvpMatch {
  me: PvpSnapshot;
  opponent: PvpSnapshot;
  myScore: number;
  oppScore: number;
  winner: 'me' | 'opponent' | 'draw';
}

export const PVP_SNAPSHOT_MAX = 5;

export function calcPvpScore(s: PvpSnapshot): number {
  return Math.max(0, s.wave) * 100 + Math.max(0, s.kills) - Math.floor(s.durationSec * 2);
}

/** 가짜 NPC 빌드 풀 — SDK 미연동 시 사용. 시즌별 결정론. */
const NPC_NAMES = [
  '망령왕', '심연 후작', '암흑 백작', '진홍 영주', '겨울 군주', '불꽃 마왕',
  '빙결의 주', '폐허 영혼', '잿빛 군주', '청흑 사도', '운명의 마왕', '심해 군주',
];

const NPC_DEMONS: string[] = ['shadow', 'crimson', 'azure', 'verdant'];
const NPC_DECK_OPTIONS = [
  ['slime', 'goblin', 'skel', 'zombie'],
  ['imp', 'orc', 'mino', 'devil'],
  ['witch', 'lich', 'mimic', 'apprentice'],
  ['skel', 'sknt', 'zombie', 'zomk'],
  ['slime', 'kslime', 'slord', 'witch'],
];

function seededRng(seed: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 매칭 — 내 점수 근처 ±20% 범위에서 NPC 1명 생성 (적정 난이도).
 */
export function pickOpponent(mySnap: PvpSnapshot, seedNonce = ''): PvpSnapshot {
  const rng = seededRng(`${mySnap.seasonId}-${seedNonce || mySnap.id}`);
  const idxName = Math.floor(rng() * NPC_NAMES.length);
  const idxDemon = Math.floor(rng() * NPC_DEMONS.length);
  const idxDeck = Math.floor(rng() * NPC_DECK_OPTIONS.length);
  // 내 wave 기준 ±25% 변동
  const myScore = calcPvpScore(mySnap);
  const variance = 0.5 + rng();   // 0.5 ~ 1.5
  const targetScore = Math.max(100, myScore * variance);
  // wave 추정 — score = wave*100 + kills - dur*2 → wave ≈ (targetScore + dur*2) / 100
  const oppDur = Math.max(60, mySnap.durationSec * (0.6 + rng() * 0.8));
  const oppKills = Math.max(0, Math.floor(mySnap.kills * (0.6 + rng() * 0.8)));
  const oppWave = Math.max(1, Math.floor((targetScore + oppDur * 2 - oppKills) / 100));
  return {
    id: `npc-${mySnap.seasonId}-${seedNonce}`,
    nickname: NPC_NAMES[idxName],
    wave: oppWave,
    kills: oppKills,
    durationSec: Math.floor(oppDur),
    demonId: NPC_DEMONS[idxDemon],
    deckPreview: NPC_DECK_OPTIONS[idxDeck],
    relics: [],
    seasonId: mySnap.seasonId,
  };
}

export function buildMatch(me: PvpSnapshot, opponent: PvpSnapshot): PvpMatch {
  const myScore = calcPvpScore(me);
  const oppScore = calcPvpScore(opponent);
  let winner: PvpMatch['winner'] = 'draw';
  if (myScore > oppScore) winner = 'me';
  else if (oppScore > myScore) winner = 'opponent';
  return { me, opponent, myScore, oppScore, winner };
}
