/**
 * 시즌 이벤트 (월간 한정 보너스) — AIT_SENIOR_DEV §리텐션
 * 월별 테마: 영혼석 보너스 배율 + 한정 칭호 표시.
 * 진입 게임 시작 시 적용 (1회/세션).
 */
export interface SeasonDef {
  id: string;
  name: string;
  banner: string;
  /** 시즌 동안 영혼석 획득 ×배율 */
  stoneMul: number;
  /** OVERHAUL §4.6: 시즌 한정 마왕 외형 토큰 (drawDemonLord에서 사용) */
  demonSkin?: { capeColor?: string; headColor?: string; auraColor?: string; effect?: string };
}

const SEASONS: Record<number, SeasonDef> = {
  1:  { id: 'newyear',  name: '신년 축제',     banner: '🎆 신년 — 영혼석 ×1.2', stoneMul: 1.2, demonSkin: { auraColor: 'rgba(241,196,15,', effect: 'sparkle' } },
  2:  { id: 'frost',    name: '한파',         banner: '❄ 한파 — 영혼석 ×1.1', stoneMul: 1.1, demonSkin: { auraColor: 'rgba(116,185,255,', capeColor: '#1B3A5C' } },
  3:  { id: 'bloom',    name: '개화',         banner: '🌸 개화 — 영혼석 ×1.1', stoneMul: 1.1, demonSkin: { auraColor: 'rgba(253,121,168,' } },
  4:  { id: 'spring',   name: '봄의 군림',    banner: '🌿 봄 — 영혼석 ×1.15', stoneMul: 1.15, demonSkin: { auraColor: 'rgba(38,222,129,' } },
  5:  { id: 'thunder',  name: '천둥의 달',    banner: '⚡ 천둥 — 영혼석 ×1.1', stoneMul: 1.1, demonSkin: { auraColor: 'rgba(241,196,15,' } },
  6:  { id: 'midsommar',name: '백야',         banner: '🌞 백야 — 영혼석 ×1.15', stoneMul: 1.15, demonSkin: { auraColor: 'rgba(255,234,167,' } },
  7:  { id: 'tropical', name: '태양의 폭정',  banner: '🔥 태양 — 영혼석 ×1.2', stoneMul: 1.2, demonSkin: { auraColor: 'rgba(245,166,35,' } },
  8:  { id: 'inferno',  name: '지옥불의 달',  banner: '🌋 지옥불 — 영혼석 ×1.25', stoneMul: 1.25, demonSkin: { auraColor: 'rgba(214,48,49,', capeColor: '#3a0d0d' } },
  9:  { id: 'autumn',   name: '낙엽의 의식',  banner: '🍁 가을 — 영혼석 ×1.1', stoneMul: 1.1, demonSkin: { auraColor: 'rgba(225,112,85,' } },
  10: { id: 'samhain',  name: '망자의 행진',  banner: '👻 할로윈 — 영혼석 ×1.3', stoneMul: 1.3, demonSkin: { auraColor: 'rgba(165,94,234,', capeColor: '#4A2068', effect: 'spooky' } },
  11: { id: 'eclipse',  name: '월식',         banner: '🌑 월식 — 영혼석 ×1.15', stoneMul: 1.15, demonSkin: { auraColor: 'rgba(45,27,78,' } },
  12: { id: 'frostbite',name: '동지의 어둠',  banner: '❄ 동지 — 영혼석 ×1.2', stoneMul: 1.2, demonSkin: { auraColor: 'rgba(116,185,255,', capeColor: '#1B3A5C' } },
};

export function currentSeason(now: Date = new Date()): SeasonDef {
  return SEASONS[now.getMonth() + 1];
}
