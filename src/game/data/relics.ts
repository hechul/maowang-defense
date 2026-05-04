/**
 * 유물 데이터 (GDD §7-1) — 30종
 */
export interface RelicDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

export const RELICS: Record<string, RelicDef> = {
  // === 1차 14종 ===
  reaper:    { id: 'reaper',    icon: '🩸', name: '영혼 수확자', desc: '용사 처치 시 마력 +20%' },
  vault:     { id: 'vault',     icon: '💰', name: '탐욕의 금고', desc: '마력 최대치 +200' },
  mask:      { id: 'mask',      icon: '😈', name: '광기의 가면', desc: '전체 공격력 +30%' },
  hourglass: { id: 'hourglass', icon: '⏳', name: '시간의 모래', desc: '용사 이동속도 ×0.8' },
  pact:      { id: 'pact',      icon: '📜', name: '어둠의 계약', desc: '카드 펼치기 비용 ×0.7' },
  heart:     { id: 'heart',     icon: '❤',  name: '마왕의 심장', desc: '마왕성 HP +50%' },
  inferno:   { id: 'inferno',   icon: '🔥', name: '지옥불',     desc: '10초마다 전체 적 화염 데미지' },
  crown:     { id: 'crown',     icon: '👑', name: '어둠의 왕관', desc: '필살기 데미지 +50%' },
  tomb:      { id: 'tomb',      icon: '⚰',  name: '부활의 묘비', desc: '몬스터 첫 사망 시 50% HP로 부활' },
  dice:      { id: 'dice',      icon: '🎲', name: '혼돈의 주사위', desc: '카드를 펼칠 때 +1장 (4장)' },
  freeze:    { id: 'freeze',    icon: '❄',  name: '빙결의 결정', desc: '15초마다 적 1.5초 동결' },
  fang:      { id: 'fang',      icon: '🦷', name: '흡혈의 송곳니', desc: '몬스터 공격 시 5% HP 흡혈' },
  surge:     { id: 'surge',     icon: '⚡', name: '마력 폭주',     desc: '마력 자연회복 ×3' },
  fate:      { id: 'fate',      icon: '🌀', name: '운명의 카드',  desc: '카드 펼친 뒤 1회 다시 뽑기 가능' },
  // === 2차 16종 ===
  titan:     { id: 'titan',     icon: '🛡', name: '거인의 갑주',   desc: '마왕성이 받는 데미지 ×0.7' },
  wrath:     { id: 'wrath',     icon: '⚔', name: '진노',          desc: '몬스터 공격력 +20%' },
  swarm:     { id: 'swarm',     icon: '🐜', name: '군집',         desc: '동시 배치 +2' },
  sprint:    { id: 'sprint',    icon: '👟', name: '질주',         desc: '몬스터 이동속도 ×1.2' },
  echo:      { id: 'echo',      icon: '🌊', name: '메아리',       desc: '콤보 마력 보상 ×2' },
  bloodmoon: { id: 'bloodmoon', icon: '🌑', name: '핏빛 달',     desc: '보스 처치 시 영혼석 +30' },
  iron:      { id: 'iron',      icon: '⛓', name: '강철 비늘',    desc: '몬스터 HP +15%' },
  wisdom:    { id: 'wisdom',    icon: '📖', name: '지혜의 서',    desc: '진화 조건 3→2 마리' },
  tide:      { id: 'tide',      icon: '🌀', name: '밀물',         desc: '웨이브 시작 시 마력 +50' },
  razor:     { id: 'razor',     icon: '🪒', name: '면도날',       desc: '몬스터 공속 +15%' },
  abyss:     { id: 'abyss',     icon: '🌌', name: '심연',         desc: '보스 등장 시 마왕성 풀 회복' },
  greed:     { id: 'greed',     icon: '🪙', name: '탐욕',         desc: '용사 처치 시 영혼석 +1' },
  nightfall: { id: 'nightfall', icon: '🌙', name: '땅거미',       desc: '웨이브 시작 3초간 적 동결' },
  hex:       { id: 'hex',       icon: '🪦', name: '저주',         desc: '용사 공격력 -10%' },
  oracle:    { id: 'oracle',    icon: '🔮', name: '신탁',         desc: '필살기 게이지 충전 ×1.3' },
  serpent:   { id: 'serpent',   icon: '🐍', name: '독사의 송곳니', desc: '몬스터 공격에 독 DoT' },
};
