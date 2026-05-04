/**
 * D4 봉인의 서판 — 100 글귀 콜렉션.
 *
 * 1대 마왕(므렐) 시대의 글귀들 — 신전이 천 년 동안 봉인하고 있던 것.
 * 게임 안에서 점진적으로 해금된다 (보스 처치 / 카드 강화 / NPC 호감 / 시즌 종료 등).
 *
 * 100 모두 모으면 → 1대 마왕의 진명 + 결말 분기 토대.
 */

export type TabletUnlockKind =
  | 'bossKill'           // bossId 처치 시
  | 'cardEvolve'         // 카드 진화 시
  | 'cardEnhance'        // 카드 강화 LV 도달 시
  | 'npcAffinity'        // NPC 호감도 도달 시
  | 'chapterClear'       // 챕터 클리어
  | 'seasonEnd'          // 시즌 종료
  | 'recallSeen'         // 회상 누적
  | 'auto';              // 자동 (특정 마일스톤)

export interface TabletEntry {
  id: string;            // t001 ~ t100
  text: string;          // 글귀 본문
  attribution: string;   // 누구의 말 (또는 묘사)
  unlock: { kind: TabletUnlockKind; param?: string | number };
}

/** Helper — 단순 배열 정의용. 실제로는 unlock 조건이 분산돼 있다. */
const make = (
  id: string, text: string, attr: string,
  kind: TabletUnlockKind, param?: string | number,
): TabletEntry => ({ id, text, attribution: attr, unlock: { kind, param } });

export const SEALED_TABLETS: TabletEntry[] = [
  // ─── 보스 처치 (5개) ───
  make('t001', '"마왕은 — 외로움을 — 받아들이는 자다."', '— 1대 마왕 므렐', 'bossKill', 'captain'),
  make('t002', '"마법의 정점은 — 마법을 — 쓰지 않는 것이다."', '— 1대 마왕의 마법사 동료', 'bossKill', 'archmage'),
  make('t003', '"빛은 — 어둠을 — 두려워한다. 그것이 — 빛의 약점이다."', '— 1대 마왕 므렐', 'bossKill', 'saint'),
  make('t004', '"왕관은 — 머리에 무겁다. 마음에 — 더 무겁다."', '— 천 년 전 인간 왕의 일기', 'bossKill', 'king'),
  make('t005', '"기다림은 — 가장 긴 — 마법이다."', '— 봉인을 지킨 대신관', 'bossKill', 'priest'),

  // ─── 카드 진화 (8개 — 진화 라인 종결자) ───
  make('t006', '"슬라임은 — 단순하다. 그러므로 — 영원하다."', '— 1대 마왕 므렐', 'cardEvolve', 'slord'),
  make('t007', '"고블린의 노래는 — 천 년을 견딘다."', '— Krug의 옛 친구 그르크', 'cardEvolve', 'ggen'),
  make('t008', '"마녀는 — 신전이 만든다. 신전은 — 자신의 적을 만든다."', '— Iset', 'cardEvolve', 'awitch'),
  make('t009', '"오크는 — 부족이 자랑이다. 부족은 — 마왕이 자랑이다."', '— Owar', 'cardEvolve', 'owar'),
  make('t010', '"좀비는 — 죽음 후의 — 자유다."', '— 잊혀진 자', 'cardEvolve', 'zomk'),
  make('t011', '"리치는 — 영혼을 — 마왕에게 — 맡긴 자다."', '— Dlich', 'cardEvolve', 'dlich'),
  make('t012', '"미궁의 짐승은 — 미궁이 — 그의 집이다."', '— Minok', 'cardEvolve', 'minok'),
  make('t013', '"미믹은 — 흉내가 끝났을 때 — 진짜다."', '— 마왕성 보물고의 글귀', 'cardEvolve', 'gmimic'),

  // ─── 카드 강화 MAX (8개) ───
  make('t014', '"강화의 끝은 — 자기 자신을 — 받아들이는 것이다."', '— 1대 마왕 므렐', 'cardEnhance', 'slime'),
  make('t015', '"부하의 강함은 — 마왕의 강함이다."', '— Krug', 'cardEnhance', 'goblin'),
  make('t016', '"천 년 후에도 — 뼈는 — 충성을 — 잊지 않는다."', '— Sknt', 'cardEnhance', 'skel'),
  make('t017', '"잊혀진 자가 — 가장 — 자유롭다."', '— 잊혀진 좀비', 'cardEnhance', 'zombie'),
  make('t018', '"마녀의 — 마지막 마법은 — 자비다."', '— Awitch', 'cardEnhance', 'witch'),
  make('t019', '"오크의 — 마지막 싸움은 — 가장 작은 싸움이다."', '— Krug', 'cardEnhance', 'orc'),
  make('t020', '"악마는 — 인간이 — 두려워하는 — 자기 자신이다."', '— 1대 마왕 므렐', 'cardEnhance', 'imp'),
  make('t021', '"리치의 — 마지막 주문은 — 침묵이다."', '— Dlich', 'cardEnhance', 'lich'),

  // ─── NPC 호감도 (12개 — 4 NPC × 3) ───
  make('t022', '"시종은 — 마왕보다 — 마왕성을 — 더 잘 안다."', '— Vael', 'npcAffinity', 'vael:5'),
  make('t023', '"천 년의 침묵은 — 가장 큰 가르침이다."', '— Vael', 'npcAffinity', 'vael:15'),
  make('t024', '"마왕의 — 다음 명령을 — 기다린다."', '— Vael', 'npcAffinity', 'vael:30'),
  make('t025', '"칼은 — 든 자의 무게다."', '— Krug', 'npcAffinity', 'krug:5'),
  make('t026', '"노래는 — 죽지 않는다. 부르는 자가 — 잊혀도."', '— Krug', 'npcAffinity', 'krug:15'),
  make('t027', '"마왕은 — 부하 옆에 — 있는 자다."', '— Krug', 'npcAffinity', 'krug:30'),
  make('t028', '"두려움은 — 가장 작은 마법이다."', '— Iset의 어머니', 'npcAffinity', 'iset:5'),
  make('t029', '"눈물은 — 천 년 동안 — 멈추지 않는다."', '— Iset', 'npcAffinity', 'iset:15'),
  make('t030', '"죄는 — 회복될 수 없다. 다만 — 다음 일에 — 정성을 다할 뿐이다."', '— Iset', 'npcAffinity', 'iset:30'),
  make('t031', '"호기심은 — 가장 큰 무기다."', '— Lyra', 'npcAffinity', 'lyra:5'),
  make('t032', '"비밀은 — 흘리지 않을 때 — 가치 있다."', '— Lyra', 'npcAffinity', 'lyra:15'),
  make('t033', '"가족은 — 천 년 전부터 — 정해진 것이다."', '— Lyra', 'npcAffinity', 'lyra:30'),

  // ─── 챕터 클리어 (12개 — 6챕터 × 2) ───
  make('t034', '"봉인의 입구는 — 시작이다. 끝이 아니다."', '— 1대 마왕 므렐', 'chapterClear', 'ch1'),
  make('t035', '"인간이 — 처음 마왕성에 도달했을 때 — 마왕은 웃었다. 처음으로."', '— Vael', 'chapterClear', 'ch1'),
  make('t036', '"잊혀진 묘지는 — 잊혀진 자들의 — 집이다."', '— 잊혀진 좀비', 'chapterClear', 'ch2'),
  make('t037', '"부하들이 깨어난 날 — 마왕도 — 깨어났다."', '— Krug', 'chapterClear', 'ch2'),
  make('t038', '"화염은 — 정화하지 않는다. 다만 — 새로 시작한다."', '— Devil', 'chapterClear', 'ch3'),
  make('t039', '"왕은 — 자기 결정을 — 옳다고 증명하기 위해 — 더 강한 결정을 내린다."', '— Lyra', 'chapterClear', 'ch3'),
  make('t040', '"겨울은 — 모든 것을 — 덮는다. 다만 — 옛 동료의 얼굴은 — 덮이지 않는다."', '— Iset', 'chapterClear', 'ch4'),
  make('t041', '"빙결의 사도는 — 1대 마왕을 봉인했다. 그러나 — 새 마왕에게 — 무릎을 꿇었다."', '— Iset', 'chapterClear', 'ch4'),
  make('t042', '"심연의 법정은 — 정의를 묻지 않는다. 다만 — 결정을 묻는다."', '— 대신관', 'chapterClear', 'ch5'),
  make('t043', '"마왕의 결정이 — 마왕성의 — 다음 천 년이다."', '— 1대 마왕 므렐', 'chapterClear', 'ch5'),
  make('t044', '"역침공은 — 복수가 아니다. 다만 — 균형이다."', '— 1대 마왕 므렐', 'chapterClear', 'ch6'),
  make('t045', '"인간의 천 년이 끝났다. 마왕의 천 년이 — 시작된다."', '— Vael', 'chapterClear', 'ch6'),

  // ─── 시즌 종료 (8개 — 시즌 4편 × 2) ───
  make('t046', '"봄에는 — 인간의 칼끝이 — 무뎌진다."', '— 1대 마왕 므렐', 'seasonEnd', 'spring:1'),
  make('t047', '"벚꽃은 — 곧 떨어지기 때문에 아름답다."', '— 1대 마왕 므렐', 'seasonEnd', 'spring:2'),
  make('t048', '"여름의 광기는 — 무뎌진 칼보다 — 위험하다."', '— Devil', 'seasonEnd', 'summer:1'),
  make('t049', '"불꽃 속에서 — 가족은 — 사라진다."', '— Devil의 옛 가족', 'seasonEnd', 'summer:2'),
  make('t050', '"수확의 노래 뒤에 — 진군의 북소리가 따라온다."', '— Krug', 'seasonEnd', 'autumn:1'),
  make('t051', '"가을은 — 끝의 시작이다. 다음 시작의 — 끝이기도 하다."', '— 1대 마왕 므렐', 'seasonEnd', 'autumn:2'),
  make('t052', '"겨울 별빛은 — 천 년 전과 — 같다."', '— Iset', 'seasonEnd', 'winter:1'),
  make('t053', '"기억이 무거워질수록 — 마왕은 — 1대 마왕에 가까워진다."', '— Vael', 'seasonEnd', 'winter:2'),

  // ─── 회상 누적 (10개) ───
  make('t054', '"낯선 얼굴은 — 천 년 전의 — 자기 얼굴이다."', '— 1대 마왕 므렐', 'recallSeen', 5),
  make('t055', '"늙은 자의 칭찬은 — 1대 마왕의 — 마지막 스승의 — 목소리다."', '— 잊혀진 스승', 'recallSeen', 8),
  make('t056', '"\"므...\" — 그것은 — 진명의 — 첫 음절이다."', '— 1대 마왕 므렐', 'recallSeen', 10),
  make('t057', '"옥좌실의 — 휘장 일곱 개는 — 일곱 사도를 — 위한 것이다."', '— Vael', 'recallSeen', 12),
  make('t058', '"검 손잡이의 — 감각은 — 천 년이 지나도 — 잊혀지지 않는다."', '— 1대 마왕 므렐', 'recallSeen', 15),
  make('t059', '"누가 부르는 노래는 — Iset의 — 옛 노래다."', '— Iset', 'recallSeen', 18),
  make('t060', '"여자의 미소는 — 천 년 전 Iset이 — 1대 마왕에게 — 보낸 미소다."', '— Vael', 'recallSeen', 20),
  make('t061', '"\"다시 깨어날 것이다\" — 1대 마왕의 — 마지막 약속이다."', '— Vael', 'recallSeen', 22),
  make('t062', '"검은 꽃밭은 — Iset이 — 1대 마왕을 위해 심은 것이다."', '— Iset', 'recallSeen', 25),
  make('t063', '"\"적이 아닌 자들이여\" — 1대 마왕은 — 인간을 그렇게 불렀다. 단 한 번."', '— Vael', 'recallSeen', 28),

  // ─── 자동 마일스톤 (15개) ───
  make('t064', '"마왕의 — 첫 명령은 — 깨어남이다."', '— 1대 마왕 므렐', 'auto', 'first_run'),
  make('t065', '"카드는 — 운명이 아니다. 운명은 — 카드 뒤에 있다."', '— 1대 마왕 므렐', 'auto', 'first_card_pick'),
  make('t066', '"진화는 — 자기 자신을 — 받아들이는 것이다."', '— 1대 마왕 므렐', 'auto', 'first_evolve'),
  make('t067', '"시너지는 — 부하들이 — 서로를 — 받아들이는 것이다."', '— 1대 마왕 므렐', 'auto', 'first_synergy'),
  make('t068', '"필살기는 — 마왕의 — 마지막 자비다."', '— 1대 마왕 므렐', 'auto', 'first_ulti'),
  make('t069', '"부활은 — 죽음을 — 받아들인 후에 — 가능하다."', '— Iset', 'auto', 'first_revive'),
  make('t070', '"보스 처치는 — 적을 — 사람으로 받아들이는 것이다."', '— 1대 마왕 므렐', 'auto', 'first_boss_kill'),
  make('t071', '"마왕 강화는 — 마왕의 무게를 — 받아들이는 것이다."', '— Vael', 'auto', 'demon_lv:5'),
  make('t072', '"마왕 레벨 10 — 봉인의 — 첫 자물쇠가 — 풀린다."', '— Vael', 'auto', 'demon_lv:10'),
  make('t073', '"마왕 레벨 25 — 잊혀진 마왕의 — 힘이 깨어난다."', '— Vael', 'auto', 'demon_lv:25'),
  make('t074', '"마왕 레벨 50 — 모든 봉인이 — 깨졌다."', '— Vael', 'auto', 'demon_lv:50'),
  make('t075', '"우편은 — 옛 동료의 — 안부다."', '— Iset', 'auto', 'first_mail_claim'),
  make('t076', '"친구는 — 마왕성 안의 — 다른 마왕성이다."', '— Lyra', 'auto', 'first_friend'),
  make('t077', '"PvP는 — 다른 마왕과의 — 거울이다."', '— 1대 마왕 므렐', 'auto', 'first_pvp'),
  make('t078', '"이벤트는 — 시간이 — 마왕에게 — 주는 — 선물이다."', '— Vael', 'auto', 'first_event_claim'),

  // ─── 결정/결말 토대 (10개 — 후반 콘텐츠) ───
  make('t079', '"자비는 — 약함이 아니다. 다만 — 다음 결정을 — 가능하게 한다."', '— 1대 마왕 므렐', 'chapterClear', 'ch1:perfect'),
  make('t080', '"잔혹은 — 강함이 아니다. 다만 — 빠른 결정을 — 가능하게 한다."', '— 1대 마왕 므렐', 'chapterClear', 'ch2:perfect'),
  make('t081', '"균형은 — 자비와 잔혹의 — 사이가 아니다. 그 너머다."', '— 1대 마왕 므렐', 'chapterClear', 'ch3:perfect'),
  make('t082', '"진왕은 — 어둠을 — 받아들인 자다."', '— 1대 마왕 므렐', 'chapterClear', 'ch5:king'),
  make('t083', '"신왕은 — 어둠 너머를 — 본 자다."', '— 1대 마왕 므렐', 'chapterClear', 'ch6:perfect'),
  make('t084', '"천 년의 끝은 — 새 천 년의 — 시작이다."', '— Vael', 'auto', 'season:13'),
  make('t085', '"마왕의 — 가장 큰 — 적은 — 자기 자신이다."', '— Iset', 'auto', 'recall_complete'),
  make('t086', '"마왕의 — 가장 큰 — 동료는 — 자기 자신이다."', '— Vael', 'auto', 'all_npc_max'),
  make('t087', '"마왕은 — 다음 마왕을 — 기다린다."', '— 1대 마왕 므렐', 'auto', 'all_chapters_clear'),
  make('t088', '"진명을 — 받아들인 자는 — 마침내 — 자신이 된다."', '— 1대 마왕 므렐', 'recallSeen', 30),

  // ─── 마지막 12개 — 진명 해금 후의 글귀 ───
  make('t089', '"\"므렐(Mrel)\" — 그것이 — 1대 마왕의 진명이다."', '— 봉인의 서판 핵심', 'recallSeen', 30),
  make('t090', '"므렐은 — 천 년 전 — 자신의 영혼을 — 흩뿌렸다."', '— Vael', 'recallSeen', 30),
  make('t091', '"흩뿌린 영혼은 — 시간 너머에 — 흘러갔다."', '— Iset', 'recallSeen', 30),
  make('t092', '"천 년 후 — 그 영혼이 — 한 사람의 몸으로 — 모였다."', '— 1대 마왕 므렐', 'recallSeen', 30),
  make('t093', '"그 한 사람이 — 당신이다."', '— 봉인의 서판', 'recallSeen', 30),
  make('t094', '"당신은 — 므렐이지만 — 므렐만은 — 아니다."', '— 1대 마왕 므렐', 'recallSeen', 30),
  make('t095', '"천 년 전의 므렐은 — 봉인을 — 받아들였다."', '— Vael', 'recallSeen', 30),
  make('t096', '"천 년 후의 당신은 — 봉인을 — 받아들이지 않을 수 있다."', '— Iset', 'recallSeen', 30),
  make('t097', '"그것이 — 당신의 — 자유다."', '— 1대 마왕 므렐', 'recallSeen', 30),
  make('t098', '"진왕이 되는가 — 봉인을 받아들이는가 — 당신이 결정한다."', '— Vael', 'auto', 'tablets:90'),
  make('t099', '"어떤 결정이든 — 마왕성은 — 당신의 — 집이다."', '— Vael', 'auto', 'tablets:95'),
  make('t100', '"천 년의 끝에서 — 시작이 — 다시 — 온다. 어둠은 — 시즌이 아니라 — 계속이다."', '— 1대 마왕 므렐, 진왕', 'auto', 'tablets:99'),
];

export const SEALED_TABLET_COUNT = SEALED_TABLETS.length;

export function getTablet(id: string): TabletEntry | undefined {
  return SEALED_TABLETS.find((t) => t.id === id);
}

/** 진명 해금 여부 (서판 80+ 모음) */
export function isTrueNameUnlocked(seenIds: string[]): boolean {
  return seenIds.length >= 80;
}
