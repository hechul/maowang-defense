/**
 * 챌린지 모드 (특수 조건 런)
 * 웨이브 15 클리어 시 영혼석 보상 (1회만)
 */
export interface ChallengeDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  reward: number;  // 영혼석
  // GameEngine에 적용할 모디파이어
  modifiers: {
    monsterPool?: string[];     // 특정 몬스터만 허용
    cardCostMul?: number;       // 카드 펼치기 비용 배수
    mpRegenMul?: number;        // 마력 회복 배수
    monsterHpMul?: number;      // 몬스터 HP 배수
    heroSpdMul?: number;        // 용사 이속 배수
    heroAtkSpdMul?: number;     // 용사 공속 배수
    maxMonsters?: number;       // 동시 몬스터 수 제한
    noSkills?: boolean;         // 영구강화 비활성
  };
}

export const CHALLENGES: Record<string, ChallengeDef> = {
  arcane: {
    id: 'arcane', icon: '🔮', name: '마법 수련', reward: 500,
    desc: '마법 몬스터(위치/임프/리치)만 등장 — 웨이브 15 클리어',
    modifiers: { monsterPool: ['witch', 'imp', 'lich'] },
  },
  silent: {
    id: 'silent', icon: '🔇', name: '침묵의 성', reward: 400,
    desc: '카드 펼치기 비용 ×2, 마력 자연회복 ×0.5',
    modifiers: { cardCostMul: 2, mpRegenMul: 0.5 },
  },
  weakling: {
    id: 'weakling', icon: '💀', name: '약자의 의지', reward: 600,
    desc: '모든 몬스터 HP -50%',
    modifiers: { monsterHpMul: 0.5 },
  },
  swift: {
    id: 'swift', icon: '💨', name: '광속 침공', reward: 500,
    desc: '용사 이동속도 ×1.5, 공속 ×1.3',
    modifiers: { heroSpdMul: 1.5, heroAtkSpdMul: 1.3 },
  },
  minimal: {
    id: 'minimal', icon: '⚖', name: '미니멀 군세', reward: 600,
    desc: '몬스터 동시 배치 최대 5마리',
    modifiers: { maxMonsters: 5 },
  },
  trial: {
    id: 'trial', icon: '⚱', name: '영혼의 시험', reward: 1000,
    desc: '영구 강화 효과 비활성',
    modifiers: { noSkills: true },
  },
  // ===== 시즌 추가 챌린지 6종 =====
  undeadOnly: {
    id: 'undeadOnly', icon: '💀', name: '뼈와 살의 — 진군', reward: 700,
    desc: '언데드 몬스터(스켈/좀비/리치)만 — 웨이브 15+',
    modifiers: { monsterPool: ['skel', 'sknt', 'zombie', 'zomk', 'lich', 'dlich'] },
  },
  rageOnly: {
    id: 'rageOnly', icon: '🔥', name: '광기의 — 군세', reward: 700,
    desc: '광기/오크 라인만 — 시즌 한정',
    modifiers: { monsterPool: ['orc', 'orcb', 'owar', 'imp', 'devil', 'mino', 'minok'] },
  },
  hardSurge: {
    id: 'hardSurge', icon: '💥', name: '폭주의 — 시간', reward: 800,
    desc: '용사 HP/공격력 ×1.5 — 진정한 도전',
    modifiers: { monsterHpMul: 0.7, heroSpdMul: 1.2, heroAtkSpdMul: 1.2 },
  },
  goldRush: {
    id: 'goldRush', icon: '💎', name: '황금 — 러시', reward: 1500,
    desc: '용사 ×3 진군 + 영혼석 ×3 보상',
    modifiers: { heroSpdMul: 1.4, heroAtkSpdMul: 1.4 },
  },
  noUlti: {
    id: 'noUlti', icon: '🚫', name: '필살기 — 봉인', reward: 800,
    desc: '필살기 사용 불가 — 카드만으로 클리어',
    modifiers: { cardCostMul: 0.9 },
  },
  echoMirror: {
    id: 'echoMirror', icon: '🪞', name: '기억의 — 거울', reward: 1200,
    desc: '모든 적이 — 1대 마왕 부하 — 변형으로 — 등장',
    modifiers: { monsterHpMul: 1.2 },
  },
};
