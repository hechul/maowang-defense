/**
 * 몬스터 데이터 (GDD §4 — 20종 + 진화)
 * - PNG 우선 로딩 (`public/sprites/{id}.png`)
 * - PNG 없으면 함수형 builder fallback
 * - GPT/외주 PNG 추가만 하면 자동 적용
 */
import { makeSprite, row, empty, type Sprite } from '../rendering/pixelArt';
import { pngOrBuild, pngSheetOrBuild } from '../rendering/spriteLoader';

export type MonsterRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface MonsterDef {
  id: string;
  name: string;
  star: 1 | 2 | 3;
  rarity: MonsterRarity;
  hp: number;
  atk: number;
  range: number;
  spd: number;
  atkCd: number;
  tags: string[];
  evolveTo?: string;
  summonCount?: number;
  aoe?: number;
  knockback?: number;
  revive?: number;
  mpGen?: number;
  auraBuff?: { atk: number; range: number };
  dot?: { dmg: number; dur: number };
  buildSprite: () => Sprite;
}

/* ===========================================================
   각 라인별 fallback 그리드 (PNG 없을 때만 사용)
   상세 디자인은 asset_pixel.md 참조 — GPT가 PNG로 만드는 것이 권장.
   =========================================================== */

// 슬라임 라인 팔레트 (보라 계열)
const SLIME_PAL = [null, '#e0c3f0', '#c194e0', '#9b59b6', '#7b2d8e', '#4a1f5e', '#FFFFFF', '#1A1A2E', '#D63031', '#FFFFFF', '#FDCB6E', '#FF6B6B', '#FD79A8', '#4a2068', '#E74C3C'];

const SLIME_GRID = [
  empty(), empty(), empty(), empty(), empty(), empty(), empty(), empty(), empty(),
  row('111111'), row('11122222111'), row('1112222222111'), row('111222222222111'),
  row('11222c233322221'), row('112222c2233332221'), row('1122222233333322221'),
  row('1122266622266622221'), row('1122676722676722221'), row('1122676722676722221'),
  row('1122266622266622221'), row('11222222232222222221'), row('11222288882222222221'),
  row('1112224888422222221'), row('11122222222222222221'), row('1112233333333333321'),
  row('11233444444443332'), row('1133344455443331'), row('113344555443331'),
  row('11334554431'), row('1133331'), empty(), empty(),
];
const KSLIME_GRID = [
  empty(), empty(), empty(), row('a...a...a'), row('aa.aa.aa'), row('aaaaaaaaa'),
  row('abaaaaaba'), row('aaaaaaaaa'), row('.aaaaaaa.'),
  row('111111'), row('11122222111'), row('1112222222111'), row('111222222222111'),
  row('11222c233322221'), row('112222c2233332221'), row('1122222233333322221'),
  row('1122266622266622221'), row('1122676722676722221'), row('1122676722676722221'),
  row('1122266622266622221'), row('11222222232222222221'), row('11222288882222222221'),
  row('1112224888422222221'), row('11122222222222222221'), row('1112233333333333321'),
  row('11233444444443332'), row('1133344455443331'), row('113344555443331'),
  row('11334554431'), row('1133331'), empty(), empty(),
];
const SLORD_GRID = [
  row('a.a.a.a.a'), row('aaaaaaaaaaa'), row('abaaaaaaaba'),
  row('aaaaaaaaaaa'), row('aaababaaaba.a'), row('.aaaaaaaaaaa.'),
  row('..aaaaaaaaa..'), row('...aaaaaaa...'), row('....aaaaa....'),
  row('111111'), row('11122222111'), row('1112222222111'),
  row('d111222222222111d'), row('dd1222c233322221dd'),
  row('dd112222c223333222111dd'), row('dd11222223333332222111dd'),
  row('dd1122ee666622ee66222211dd'), row('dd1122e7e722e7e722222211dd'),
  row('dd1122e7e722e7e722222211dd'), row('dd1122ee666622ee6622222211dd'),
  row('dd11222222232222222211dd'), row('dd11222288882222222211dd'),
  row('dd112224888422222221dd'), row('ddd11122222222222221dd'),
  row('dddd112233333333333321dd'), row('ddddd11233444444443331d'),
  row('dddddd1133344455443331'), row('ddddddd113344555443331'),
  row('dddddddd11334554431d'), row('dddddddddd1133331dd'),
  row('dddd........dddd'), row('dd.dd.dd.dd.dd.dd'),
];

// 고블린 라인 (녹색 계열)
const GOB_PAL = [null, '#A3D9A5', '#2ECC71', '#0B3D2E', '#FFFFFF', '#1A1A2E', '#BDC3C7', '#DFE6E9', '#8B5A2B', '#2C3E50', '#FDCB6E', '#E74C3C'];
const GOB_FALLBACK = (variant: 'gob' | 'gobw' | 'ggen') => {
  const armor = variant === 'gob' ? '8' : variant === 'gobw' ? '6' : 'a';
  const grid = [
    empty(), empty(), empty(), empty(),
    row('1.........1'), row('11.......11'), row('221.....122'),
    row('2221111111222'), row('1' + '2'.repeat(11) + '1'),
    row('1' + '2'.repeat(12) + '1'), row('1' + '2'.repeat(13) + '1'),
    row('1224422' + '5'.repeat(0) + '224422_1'.replace('_', '1')),
    // 단순화 — 자세한 디자인은 PNG 의뢰
    row('1' + '2'.repeat(13) + '1'), row('1' + '2'.repeat(13) + '1'),
    row('33' + '2'.repeat(11) + '33'),
    row('.' + armor.repeat(11) + '.'), row(armor.repeat(13)),
    row(armor + '9'.repeat(11) + armor), row(armor.repeat(13)),
    row('.' + armor.repeat(11) + '.'), row('9'.repeat(11)),
    row('3333...3333'), row('9999...9999'), row('9999...9999'),
    row('9999...9999'), row('9999...9999'), row('9999...9999'),
    row('8888...8888'), row('8888...8888'),
    row('88888.88888'), row('88888.88888'),
  ];
  return grid;
};

// 위치 라인 (보라/마법)
const WITCH_PAL = [null, '#D5A6E6', '#9B59B6', '#7B2D8E', '#FFFFFF', '#1A1A2E', '#F8C291', '#E17055', '#FDCB6E', '#4A2068', '#FD79A8', '#74B9FF'];
const WITCH_FALLBACK = (variant: 'witch' | 'dwitch' | 'awitch') => {
  const hat = variant === 'witch' ? '3' : '9';
  const trim = variant === 'witch' ? '9' : variant === 'dwitch' ? '3' : 'a';
  const robe = variant === 'witch' ? '2' : '3';
  const robeS = variant === 'witch' ? '3' : '9';
  return [
    row(hat), row(hat.repeat(3)), row(hat + hat.repeat(3) + hat), row(hat.repeat(7)),
    row(hat + trim.repeat(7) + hat), row(hat + trim.repeat(9) + hat),
    row(hat + trim.repeat(11) + hat), row(hat + hat.repeat(13) + hat),
    row('33' + '6'.repeat(7) + '33'), row('3' + '6'.repeat(9) + '3'),
    row('3' + '6' + '4' + '5' + '666' + '4' + '5' + '6' + '3'),
    row('3' + '6'.repeat(9) + '3'),
    row('33' + '6'.repeat(3) + '5' + '6'.repeat(3) + '33'),
    row('33' + '6'.repeat(7) + '33'),
    row(robeS + robe.repeat(11) + robeS), row(robeS + robe.repeat(12) + robeS),
    row(robeS + robe.repeat(13) + robeS), row(robeS + robe.repeat(13) + robeS),
    row(robeS + robe.repeat(13) + robeS), row(robeS + robe.repeat(14) + robeS),
    row(robeS + robe.repeat(14) + robeS), row(robeS + robe.repeat(15) + robeS),
    row(robeS + robe.repeat(15) + robeS), row(robeS + robe.repeat(16) + robeS),
    row(robeS + robe.repeat(16) + robeS), row(robeS + robe.repeat(17) + robeS),
    row(robeS.repeat(19)), row(robeS + robe.repeat(5) + robeS + robe.repeat(5) + robeS),
    row(robeS.repeat(3) + robe.repeat(3) + robeS.repeat(3) + robe.repeat(3) + robeS.repeat(3)),
    row(robeS.repeat(13)), row(robeS.repeat(11)),
  ];
};

// 스켈레톤 라인 (뼈/회색)
const SKEL_PAL = [null, '#ECF0F1', '#BDC3C7', '#636E72', '#FFFFFF', '#1A1A2E', '#D63031', '#DFE6E9', '#7B2D8E', '#FDCB6E', '#2C3E50'];
const SKEL_FALLBACK = (variant: 'skel' | 'sknt') => {
  const eye = variant === 'sknt' ? '6' : '5';
  return [
    empty(), empty(), empty(), empty(),
    row('1'.repeat(9)), row('1' + '2'.repeat(9) + '1'), row('2' + '2'.repeat(11) + '2'),
    row('2' + '2' + eye + eye + '2' + '2' + '2' + eye + eye + '2' + '2'),
    row('2' + '2' + '5' + eye + '2' + '2' + '2' + eye + '5' + '2' + '2'),
    row('2' + '2'.repeat(4) + '5' + '2'.repeat(4) + '2'),
    row('2' + '2'.repeat(9) + '2'),
    row('3' + '14141414141' + '3'), row('3' + '3'.repeat(9) + '3'),
    row('333'),
    row('222...222'), row('2222...2222'), row('2222.5.2222'),
    row('2222...2222'), row('2222...2222'), row('22222.22222'),
    row('2'.repeat(11)), row('3' + '2'.repeat(9) + '3'), row('3'.repeat(11)),
    row('22...22'), row('22...22'), row('33...33'),
    row('22...22'), row('22...22'), row('33...33'),
    row('333.333'), row('22222.22222'), row('22222.22222'),
  ];
};

// 오크 라인 (녹색/큰 어깨)
const ORC_PAL = [null, '#A3D9A5', '#2ECC71', '#0B3D2E', '#FFFFFF', '#1A1A2E', '#8B5A2B', '#6B1A1A', '#BDC3C7', '#DFE6E9', '#FDCB6E', '#D63031', '#E74C3C'];
const ORC_FALLBACK = (variant: 'orc' | 'orcb' | 'owar') => {
  const armor = variant === 'owar' ? 'a' : '6';
  const eye = variant === 'owar' ? 'c' : '5';
  return [
    empty(), empty(), empty(),
    row('2'.repeat(11)), row('1' + '2'.repeat(11) + '1'),
    row('11' + '2'.repeat(11) + '11'), row('2' + '2'.repeat(13) + '2'),
    row('2' + '33' + '2'.repeat(9) + '33' + '2'),
    row('2' + '3' + '4' + eye + '2' + '2' + '2' + '2' + '2' + eye + '4' + '3' + '2'),
    row('2' + '2'.repeat(5) + '5' + '2'.repeat(5) + '2'),
    row('2' + '2'.repeat(11) + '2'),
    row('3' + '2' + '4' + '2'.repeat(7) + '4' + '2' + '3'),
    row('3' + '3'.repeat(11) + '3'),
    row('3'.repeat(9)),
    row(armor.repeat(19)), row(armor.repeat(21)),
    row(armor + '1' + armor.repeat(5) + '2'.repeat(3) + armor.repeat(5) + '1' + armor),
    row(armor + '1' + armor.repeat(4) + '2'.repeat(5) + armor.repeat(4) + '1' + armor),
    row(armor + '2' + '2' + armor.repeat(3) + '2'.repeat(5) + armor.repeat(3) + '2' + '2' + armor),
    row(armor + '3' + '3' + armor.repeat(3) + '3'.repeat(3) + armor.repeat(3) + '3' + '3' + armor),
    row(armor + '3' + armor.repeat(5) + '3'.repeat(3) + armor.repeat(5) + '3' + armor),
    row(armor + armor.repeat(17) + armor),
    row('a' + armor.repeat(11) + 'a'),
    row('33333...33333'), row('22222...22222'), row('22222...22222'),
    row('33333...33333'), row('66666...66666'), row('66666...66666'),
    row('77777.77777'), row('666666.666666'), row('666666.666666'),
  ];
};

// 임프 라인 (빨강/날개)
const IMP_PAL = [null, '#FF6B6B', '#E74C3C', '#6B1A1A', '#FFFFFF', '#1A1A2E', '#FFEAA7', '#FF6B35', '#FDCB6E', '#2D1B4E', '#1A1A2E'];
const IMP_FALLBACK = (variant: 'imp' | 'devil') => {
  const eye = variant === 'devil' ? '6' : '4';
  return [
    empty(), empty(), empty(),
    row('a.....a'), row('aa...aa'), row('aa.....aa'),
    row('1'.repeat(9)), row('1' + '2'.repeat(9) + '1'),
    row('2' + '2'.repeat(11) + '2'),
    row('2' + '22' + eye + '5' + '2' + '2' + '2' + '5' + eye + '22' + '2'),
    row('2' + '2'.repeat(11) + '2'),
    row('2' + '3' + '5'.repeat(7) + '3' + '2'),
    row('3' + '2'.repeat(9) + '3'),
    row('3'.repeat(5)),
    row('99...22 222...99'.replace(/ /g, '')), row('999..' + '2'.repeat(5) + '..999'),
    row('9999.' + '2'.repeat(7) + '.9999'), row('999.' + '2'.repeat(9) + '.999'),
    row('99' + '2'.repeat(11) + '99'),
    row('2' + '2'.repeat(9) + '2'), row('2' + '2'.repeat(9) + '2'),
    row('3' + '2'.repeat(7) + '3'), row('3' + '3'.repeat(5) + '3'),
    row('22.22.22'), row('22.22.22'), row('33.33.7'),
    row('22.22'), row('22.22'), row('33.33'),
    row('aa.aa'),
  ];
};

// 미노타우르스 라인 (갈색/뿔)
const MINO_PAL = [null, '#c89368', '#8B5A2B', '#5c3a18', '#FFFFFF', '#1A1A2E', '#D63031', '#BDC3C7', '#DFE6E9', '#FDCB6E', '#2C3E50'];
const MINO_FALLBACK = (variant: 'mino' | 'minok') => {
  const eye = variant === 'minok' ? '6' : '5';
  return [
    empty(), empty(),
    row('aa...........aa'), row('aaa.........aaa'),
    row('aaaa.......aaaa'), row('aaaa.......aaaa'),
    row('.aaa.......aaa.'), row('..aa.......aa..'),
    row('1'.repeat(13)), row('1' + '2'.repeat(13) + '1'),
    row('2' + '2'.repeat(13) + '2'),
    row('2' + '33' + eye + '5' + '2'.repeat(3) + '5' + eye + '33' + '2'),
    row('2' + '2'.repeat(11) + '2'),
    row('2' + '333' + '9' + '2'.repeat(3) + '9' + '333' + '2'),
    row('333' + '5555' + '333'),
    row('3' + '3'.repeat(7) + '3'),
    row('2'.repeat(17)), row('2'.repeat(19)),
    row('2' + '2'.repeat(17) + '2'), row('2' + '2'.repeat(17) + '2'),
    row('2' + '2'.repeat(13) + '2'), row('9' + '2'.repeat(11) + '9'),
    row('22222...22222'), row('22222...22222'), row('33333...33333'),
    row('22222...22222'), row('33333...33333'),
    row('aaaaa.aaaaa'), row('aaaaa.aaaaa'), row('aaaaa.aaaaa'),
    row('aaaaaaaaaaa'), row('aaaaaaaaaaa'),
  ];
};

// 좀비 라인 (썩은 녹색)
const ZOM_PAL = [null, '#A3D9A5', '#7a8a5a', '#3a4a2a', '#FFFFFF', '#1A1A2E', '#6B1A1A', '#8B5A2B', '#2C3E50', '#7B2D8E', '#FDCB6E', '#BDC3C7'];
const ZOM_FALLBACK = (variant: 'zombie' | 'zomk') => {
  const cloth = variant === 'zomk' ? 'b' : '7';
  const eye = variant === 'zomk' ? '6' : '4';
  return [
    empty(), empty(), empty(), empty(),
    row('1'.repeat(9)), row('1' + '2'.repeat(9) + '1'),
    row('2' + '2'.repeat(11) + '2'),
    row('2' + '2' + '4' + eye + '4' + '2' + '2' + '2' + '2' + '5' + '2' + '2' + '2'),
    row('2' + '2' + '4' + '5' + '4' + '2' + '2' + '2' + '2' + '5' + '2' + '2' + '2'),
    row('3' + '2'.repeat(5) + '5' + '2'.repeat(5) + '3'),
    row('2' + '2'.repeat(11) + '2'),
    row('3' + '2' + '5'.repeat(7) + '2' + '3'),
    row('33' + '2'.repeat(7) + '33'),
    row('333'),
    row(cloth.repeat(5) + '2'.repeat(3) + cloth.repeat(5)),
    row(cloth + '8' + cloth.repeat(3) + '2'.repeat(3) + cloth.repeat(3) + '8' + cloth),
    row(cloth + cloth + '6' + cloth.repeat(10)),
    row(cloth + cloth.repeat(11) + cloth),
    row(cloth + '8' + cloth.repeat(9) + '8' + cloth),
    row('8' + cloth.repeat(9) + '8'), row('8'.repeat(11)), row(cloth.repeat(9)),
    row('33...33'), row('22...22'), row('22...22'), row('33...33'),
    row('22...22'), row('22...22'),
    row(cloth.repeat(2) + '...' + cloth.repeat(2)), row(cloth.repeat(2) + '...' + cloth.repeat(2)),
    row('33333.33333'), row('33333.33333'),
  ];
};

// 리치 라인 (보라/해골/지팡이)
const LICH_PAL = [null, '#9B59B6', '#7B2D8E', '#4A2068', '#FFFFFF', '#1A1A2E', '#ECF0F1', '#BDC3C7', '#FDCB6E', '#D63031', '#FD79A8', '#74B9FF'];
const LICH_FALLBACK = (variant: 'lich' | 'dlich') => {
  const eye = variant === 'dlich' ? '9' : '5';
  return [
    empty(), empty(),
    row('2'.repeat(5)), row('2' + '2'.repeat(5) + '2'),
    row('3' + '2'.repeat(7) + '3'), row('3' + '2'.repeat(9) + '3'),
    row('3' + '2' + '2'.repeat(9) + '2' + '3'), row('2' + '2'.repeat(11) + '2'),
    row('33' + '5' + '6' + '5' + '33' + '5' + '6' + '5' + '33'),
    row('3' + '5' + '6' + eye + '6' + '5' + '6' + eye + '6' + '5' + '3'),
    row('3' + '5' + '6'.repeat(3) + '5' + '6'.repeat(3) + '5' + '3'),
    row('3' + '6'.repeat(2) + '5'.repeat(5) + '6'.repeat(2) + '3'),
    row('33' + '6'.repeat(7) + '33'),
    row('3' + '2'.repeat(11) + '3'), row('3' + '2'.repeat(13) + '3'),
    row('3' + '2'.repeat(13) + '3'), row('3' + '2' + '2'.repeat(13) + '2' + '3'),
    row('3' + '2' + '2'.repeat(13) + '2' + '3'), row('3' + '2'.repeat(17) + '3'),
    row('3' + '2'.repeat(17) + '3'), row('3' + '2' + '2'.repeat(17) + '2' + '3'),
    row('3' + '2'.repeat(19) + '3'), row('3' + '2'.repeat(19) + '3'),
    row('3'.repeat(21)),
    row('3' + '2.2.2.3.2.3.2.3.2.2.3'),
    row('3' + '2.2.3.2.3.2.3.2.2.3'),
    row('3' + '2.3.2.3.2.3.2.3'),
    row('3.3.3.3.3.3'),
    row('3...3...3...3'), row('3....3....3'),
    row('.3.....3.'), row('3'),
  ];
};

// 미믹 라인 (보물상자)
const MIM_PAL = [null, '#c89368', '#8B5A2B', '#5c3a18', '#FFFFFF', '#1A1A2E', '#FDCB6E', '#FFD700', '#D63031', '#BDC3C7', '#F1C40F'];
const MIM_FALLBACK = (variant: 'mimic' | 'gmimic') => {
  const wood = variant === 'gmimic' ? '6' : '2';
  const gold = variant === 'gmimic' ? 'a' : '6';
  return [
    empty(), empty(), empty(), empty(), empty(),
    row('1' + wood.repeat(13) + '1'), row('1' + wood.repeat(15) + '1'),
    row(wood + wood.repeat(17) + wood),
    row(wood + gold + wood.repeat(15) + gold + wood),
    row(wood + gold + '4'.repeat(15) + gold + wood),
    row(wood + gold + '5454545454545454' + gold + wood),
    row(wood + gold + '4'.repeat(15) + gold + wood),
    row(wood + gold + '5555' + '8'.repeat(7) + '5555' + gold + wood),
    row(wood + wood.repeat(17) + wood),
    row(wood + '3' + wood.repeat(15) + '3' + wood),
    row(wood + wood.repeat(17) + wood),
    row(wood + gold + wood.repeat(15) + gold + wood),
    row(wood + gold + wood.repeat(7) + '9' + wood.repeat(7) + gold + wood),
    row(wood + gold + wood.repeat(7) + '9' + wood.repeat(7) + gold + wood),
    row(wood + gold + wood.repeat(15) + gold + wood),
    row(wood + '3' + wood.repeat(15) + '3' + wood),
    row(wood + wood.repeat(17) + wood),
    row('3'.repeat(19)),
    row('33333.....33333'), row('22222.....22222'),
    row('22222.....22222'), row('33333.....33333'),
    row('22222.....22222'), row('22222.....22222'),
    row('33333.....33333'), row('33333.....33333'),
  ];
};

/* ===== MONSTERS 데이터 (PNG 우선) ===== */
const buildPng = (id: string, grid: string[], pal: any[]) =>
  pngOrBuild(id, () => makeSprite(grid, pal, 2, true), 2);

/** 멀티-row 시트로 로드되는 몬스터 IDs */
export const MONSTER_SHEET_IDS = new Set([
  'slime', 'kslime', 'slord',       // slime_sheet (3 rows)
  'goblin', 'gobw', 'ggen',         // goblin_sheet (3 rows)
  'witch', 'dwitch', 'awitch',      // witch_sheet (3 rows)
  'skel', 'sknt',                   // skel_sheet (2 rows)
  'imp', 'devil',                   // imp_sheet (2 rows)
  'lich', 'dlich',                  // lich_sheet (2 rows)
  'mimic', 'gmimic',                // mimic_sheet (2 rows)
  'mino', 'minok',                  // mino_sheet (2 rows)
  'orc', 'orcb', 'owar',            // orc_sheet (3 rows)
  'zombie', 'zomk',                 // zombie_sheet (2 rows)
]);
export const MONSTER_SHEET_FRAMES = 4;

/** sheet PNG가 캐시된 경우 frame[0] 반환, 아니면 기존 절차적 fallback */
const buildSheet = (id: string, grid: string[], pal: any[]) =>
  pngSheetOrBuild(id, MONSTER_SHEET_FRAMES, () => makeSprite(grid, pal, 2, true), 1);

export const MONSTERS: Record<string, MonsterDef> = {
  // 슬라임 라인
  slime:    { id:'slime',    name:'꼬마슬라임', star:1, rarity:'common',   hp:140, atk:11, range:18, spd:18, atkCd:0.85, tags:['tank','melee'],         evolveTo:'kslime', buildSprite: () => buildSheet('slime', SLIME_GRID, SLIME_PAL) },
  kslime:   { id:'kslime',   name:'킹슬라임',   star:2, rarity:'rare',     hp:340, atk:22, range:18, spd:16, atkCd:0.85, tags:['tank','melee'],         evolveTo:'slord',  buildSprite: () => buildSheet('kslime', KSLIME_GRID, SLIME_PAL) },
  slord:    { id:'slord',    name:'슬라임로드', star:3, rarity:'epic',     hp:780, atk:48, range:20, spd:18, atkCd:0.8,  tags:['tank','melee'], aoe:18,                    buildSprite: () => buildSheet('slord', SLORD_GRID, SLIME_PAL) },
  // 고블린 라인
  goblin:   { id:'goblin',   name:'고블린졸병', star:1, rarity:'common',   hp:75,  atk:18, range:18, spd:26, atkCd:0.6,  tags:['melee','mob'],          evolveTo:'gobw',   buildSprite: () => buildSheet('goblin', GOB_FALLBACK('gob'), GOB_PAL) },
  gobw:     { id:'gobw',     name:'고블린전사', star:2, rarity:'rare',     hp:175, atk:35, range:18, spd:28, atkCd:0.55, tags:['melee','mob'],          evolveTo:'ggen',   buildSprite: () => buildSheet('gobw', GOB_FALLBACK('gobw'), GOB_PAL) },
  ggen:     { id:'ggen',     name:'고블린장군', star:3, rarity:'epic',     hp:380, atk:72, range:20, spd:30, atkCd:0.5,  tags:['melee','mob'],                              buildSprite: () => buildSheet('ggen', GOB_FALLBACK('ggen'), GOB_PAL) },
  // 위치 라인
  witch:    { id:'witch',    name:'꼬마위치',   star:1, rarity:'uncommon', hp:60,  atk:25, range:130,spd:16, atkCd:1.1,  tags:['magic'],                evolveTo:'dwitch', buildSprite: () => buildSheet('witch', WITCH_FALLBACK('witch'), WITCH_PAL) },
  dwitch:   { id:'dwitch',   name:'다크위치',   star:2, rarity:'epic',     hp:140, atk:55, range:140,spd:18, atkCd:0.95, tags:['magic'],                evolveTo:'awitch', buildSprite: () => buildSheet('dwitch', WITCH_FALLBACK('dwitch'), WITCH_PAL) },
  awitch:   { id:'awitch',   name:'아크위치',   star:3, rarity:'epic',     hp:300, atk:115,range:150,spd:20, atkCd:0.85, tags:['magic','dark'],                              buildSprite: () => buildSheet('awitch', WITCH_FALLBACK('awitch'), WITCH_PAL) },
  // 스켈레톤 라인 (소환 시 2마리)
  skel:     { id:'skel',     name:'스켈레톤',   star:1, rarity:'common',   hp:65,  atk:13, range:18, spd:24, atkCd:0.7,  tags:['undead','melee'], summonCount:2, evolveTo:'sknt', buildSprite: () => buildSheet('skel', SKEL_FALLBACK('skel'), SKEL_PAL) },
  sknt:     { id:'sknt',     name:'데스나이트', star:2, rarity:'rare',     hp:160, atk:28, range:18, spd:24, atkCd:0.65, tags:['undead','melee'], summonCount:2,                  buildSprite: () => buildSheet('sknt', SKEL_FALLBACK('sknt'), SKEL_PAL) },
  // 오크 라인 (AOE)
  orc:      { id:'orc',      name:'오크',       star:1, rarity:'uncommon', hp:160, atk:24, range:22, spd:16, atkCd:1.0,  tags:['tank','melee','brute'], aoe:18, evolveTo:'orcb', buildSprite: () => buildSheet('orc', ORC_FALLBACK('orc'), ORC_PAL) },
  orcb:     { id:'orcb',     name:'오크버서커', star:2, rarity:'epic',     hp:340, atk:48, range:24, spd:18, atkCd:0.9,  tags:['tank','melee','brute'], aoe:24, evolveTo:'owar', buildSprite: () => buildSheet('orcb', ORC_FALLBACK('orcb'), ORC_PAL) },
  owar:     { id:'owar',     name:'오크워로드', star:3, rarity:'epic',     hp:720, atk:96, range:26, spd:20, atkCd:0.85, tags:['tank','melee','brute'], aoe:30, knockback:10,    buildSprite: () => buildSheet('owar', ORC_FALLBACK('owar'), ORC_PAL) },
  // 임프 라인 (DOT)
  imp:      { id:'imp',      name:'임프',       star:1, rarity:'uncommon', hp:55,  atk:18, range:110,spd:20, atkCd:1.0,  tags:['magic','fire'],         dot:{dmg:8,dur:2.5}, evolveTo:'devil', buildSprite: () => buildSheet('imp', IMP_FALLBACK('imp'), IMP_PAL) },
  devil:    { id:'devil',    name:'데빌',       star:2, rarity:'epic',     hp:130, atk:38, range:120,spd:22, atkCd:0.85, tags:['magic','fire'],         dot:{dmg:18,dur:2.5},                   buildSprite: () => buildSheet('devil', IMP_FALLBACK('devil'), IMP_PAL) },
  // 미노 라인 (knockback)
  mino:     { id:'mino',     name:'미노타우르스',star:1, rarity:'uncommon', hp:200, atk:22, range:22, spd:15, atkCd:1.1,  tags:['tank','melee','brute'], knockback:14, evolveTo:'minok', buildSprite: () => buildSheet('mino', MINO_FALLBACK('mino'), MINO_PAL) },
  minok:    { id:'minok',    name:'미노킹',     star:2, rarity:'epic',     hp:420, atk:48, range:24, spd:17, atkCd:1.0,  tags:['tank','melee','brute'], knockback:18, aoe:14,         buildSprite: () => buildSheet('minok', MINO_FALLBACK('minok'), MINO_PAL) },
  // 좀비 라인 (revive)
  zombie:   { id:'zombie',   name:'좀비',       star:1, rarity:'common',   hp:110, atk:14, range:18, spd:14, atkCd:0.9,  tags:['undead','melee'],       revive:0.4, evolveTo:'zomk',     buildSprite: () => buildSheet('zombie', ZOM_FALLBACK('zombie'), ZOM_PAL) },
  zomk:     { id:'zomk',     name:'좀비나이트', star:2, rarity:'rare',     hp:240, atk:30, range:18, spd:16, atkCd:0.85, tags:['undead','melee'],       revive:0.4,                          buildSprite: () => buildSheet('zomk', ZOM_FALLBACK('zomk'), ZOM_PAL) },
  // 리치 라인 (aura buff)
  lich:     { id:'lich',     name:'리치',       star:1, rarity:'rare',     hp:75,  atk:20, range:115,spd:14, atkCd:1.2,  tags:['undead','magic','dark'], auraBuff:{atk:0.20, range:60}, evolveTo:'dlich', buildSprite: () => buildSheet('lich', LICH_FALLBACK('lich'), LICH_PAL) },
  dlich:    { id:'dlich',    name:'다크리치',   star:2, rarity:'epic',     hp:180, atk:42, range:130,spd:16, atkCd:1.0,  tags:['undead','magic','dark'], auraBuff:{atk:0.35, range:70},                  buildSprite: () => buildSheet('dlich', LICH_FALLBACK('dlich'), LICH_PAL) },
  // 미믹 라인 (mp gen)
  mimic:    { id:'mimic',    name:'미믹',       star:1, rarity:'uncommon', hp:140, atk:8,  range:18, spd:8,  atkCd:1.5,  tags:['support'],              mpGen:5, evolveTo:'gmimic',     buildSprite: () => buildSheet('mimic', MIM_FALLBACK('mimic'), MIM_PAL) },
  gmimic:   { id:'gmimic',   name:'골드미믹',   star:2, rarity:'epic',     hp:280, atk:14, range:18, spd:10, atkCd:1.3,  tags:['support'],              mpGen:12,                              buildSprite: () => buildSheet('gmimic', MIM_FALLBACK('gmimic'), MIM_PAL) },
};

/* 카드 풀 가중치 (1성만 풀에 등장) */
export const CARD_POOL: [string, number][] = [
  ['slime',  55],
  ['goblin', 55],
  ['skel',   50],
  ['zombie', 45],
  ['witch',  25],
  ['orc',    22],
  ['imp',    20],
  ['mimic',  18],
  ['mino',   15],
  ['lich',   10],
];

export function pickRandomMonster(): string {
  let total = 0;
  for (const [, w] of CARD_POOL) total += w;
  let r = Math.random() * total;
  for (const [t, w] of CARD_POOL) {
    r -= w;
    if (r <= 0) return t;
  }
  return CARD_POOL[0][0];
}
