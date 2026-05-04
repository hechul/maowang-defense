/**
 * 업적 정의 — AIT §전략3 D1~D30 리텐션
 */
export interface AchievementDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  reward: number;  // 영혼석 보상
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  firstBlood:  { id: 'firstBlood',  icon: '🩸', name: '첫 피',           desc: '5웨이브 도달',           reward: 50 },
  waveMaster:  { id: 'waveMaster',  icon: '⚔', name: '전선의 지배자',    desc: '10웨이브 도달',          reward: 100 },
  waveLegend:  { id: 'waveLegend',  icon: '👑', name: '전설의 영역',      desc: '20웨이브 도달',          reward: 300 },
  infinity:    { id: 'infinity',    icon: '♾', name: '무한의 끝',        desc: '30웨이브 도달',          reward: 1000 },
  evolved:     { id: 'evolved',     icon: '⭐', name: '진화의 시작',      desc: '2성 진화 첫 달성',      reward: 50 },
  ascended:    { id: 'ascended',    icon: '✨', name: '최종 진화',        desc: '3성 진화 첫 달성',      reward: 200 },
  combo20:     { id: 'combo20',     icon: '🔥', name: '연쇄 살자',        desc: '20 콤보 달성',          reward: 50 },
  combo50:     { id: 'combo50',     icon: '☄', name: '학살자',           desc: '50 콤보 달성',          reward: 300 },
  luckySummon: { id: 'luckySummon', icon: '✨', name: '희귀 발견자',      desc: '같은 카드 3장 동시 발견 1회',     reward: 100 },
  synergyAll:  { id: 'synergyAll',  icon: '🌀', name: '시너지 마스터',    desc: '한 런에 시너지 4종 동시', reward: 300 },
  relicHoard:  { id: 'relicHoard',  icon: '💎', name: '유물 사냥꾼',      desc: '한 런에 유물 8개',       reward: 200 },
  allBosses:   { id: 'allBosses',   icon: '🏆', name: '보스 슬레이어',     desc: '5종 보스 모두 처치',     reward: 500 },
  // 챕터 클리어 (P1-5 엔딩 시스템)
  chapter1:    { id: 'chapter1',    icon: '✨', name: '챕터 1 클리어',     desc: '25웨이브 클리어',        reward: 500 },
  chapter2:    { id: 'chapter2',    icon: '👑', name: '챕터 2 클리어',     desc: '50웨이브 클리어',        reward: 1500 },
  chapter3:    { id: 'chapter3',    icon: '🌑', name: '신화 등급 도달',    desc: '100웨이브 클리어',       reward: 5000 },
};
