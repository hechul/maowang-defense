/**
 * 용사 데이터 (GDD §5-1 — 8종)
 * Phase B: PNG 우선 (`apprentice.png`, `swordsman.png`, ...)
 */
import { makeSprite, row, empty, type Sprite } from '../rendering/pixelArt';
import { pngOrBuild, pngSheetOrBuild } from '../rendering/spriteLoader';

export interface HeroDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  range: number;
  spd: number;
  atkCd: number;
  mp: number;
  defense?: number;
  healAmt?: number;
  healRange?: number;
  buildSprite: () => Sprite;
}

const HERO_PAL = [null, '#74b9ff', '#3498db', '#0984e3', '#1b3a5c', '#FFFFFF', '#1A1A2E', '#FDCB6E', '#FFEAA7', '#f8c291', '#e17055', '#D63031', '#7a1818', '#DFE6E9', '#BDC3C7', '#8B5A2B'];

// 단순 humanoid fallback (PNG 기다리는 동안)
const heroFallback = (helm: string, armor: string, weapon: string) => [
  empty(), empty(),
  row(weapon === 'crest' ? '11..11' : ''),  // 깃털 자리
  row(weapon === 'crest' ? '111111' : ''),
  row(helm.repeat(8)), row(helm.repeat(10)),
  row(helm + helm.repeat(11) + helm),
  row(helm + '8'.repeat(11) + helm),
  row(helm + helm + '9' + '6' + '9' + helm + '9' + '6' + '9' + helm + helm),
  row(helm + '9'.repeat(11) + helm),
  row(helm + '9'.repeat(11) + helm),
  row(helm + '8' + '9'.repeat(9) + '8' + helm),
  row(armor.repeat(13)),
  row(armor + '7' + armor.repeat(9) + '7' + armor),
  row(armor.repeat(13)),
  row(armor.repeat(13)),
  row(armor + '7' + armor.repeat(9) + '7' + armor),
  row(armor.repeat(13)),
  row(armor.repeat(13)),
  row('8' + armor.repeat(11) + '8'),
  row('cccc...cccc'), row('cccc...cccc'), row('cccc...cccc'),
  row('cccc...cccc'), row('cccc...cccc'), row('cccc...cccc'),
  row('eeee...eeee'), row('eeee...eeee'), row('eeee...eeee'),
  row('eeeee.eeeee'), row('eeeee.eeeee'),
];

const buildPng = (id: string, grid: string[]) =>
  pngOrBuild(id, () => makeSprite(grid, HERO_PAL, 2, true), 2);

/** 4프레임 walk sheet — apprentice/swordsman/archer/mage/spear 5종 (native 해상도) */
const buildSheet = (id: string, grid: string[]) =>
  pngSheetOrBuild(id, 4, () => makeSprite(grid, HERO_PAL, 2, true), 1);

/** 4프레임 walk sheet PNG 보유 용사 ID (drawUnit에서 walkT 기반 프레임 선택) */
export const HERO_SHEET_IDS = new Set([
  'apprentice', 'swordsman', 'archer', 'mage', 'spear',
  'shield', 'rogue', 'healer',
]);
export const HERO_SHEET_FRAMES = 4;

export const HEROES: Record<string, HeroDef> = {
  apprentice: {
    id: 'apprentice', name: '견습기사',
    hp: 50, atk: 9, range: 18, spd: 22, atkCd: 1.0, mp: 18,
    buildSprite: () => buildSheet('apprentice', heroFallback('8', '8', 'sword')),
  },
  swordsman: {
    id: 'swordsman', name: '검사',
    hp: 90, atk: 15, range: 18, spd: 24, atkCd: 0.9, mp: 28,
    buildSprite: () => buildSheet('swordsman', heroFallback('8', '8', 'crest')),
  },
  archer: {
    id: 'archer', name: '궁수',
    hp: 60, atk: 13, range: 120, spd: 22, atkCd: 0.7, mp: 32,
    buildSprite: () => buildSheet('archer', heroFallback('e', 'c', 'bow')),
  },
  mage: {
    id: 'mage', name: '마법사',
    hp: 55, atk: 22, range: 130, spd: 18, atkCd: 1.3, mp: 48,
    buildSprite: () => buildSheet('mage', heroFallback('3', '2', 'staff')),
  },
  spear: {
    id: 'spear', name: '창병',
    hp: 75, atk: 14, range: 32, spd: 22, atkCd: 0.95, mp: 30,
    buildSprite: () => buildSheet('spear', heroFallback('8', '8', 'spear')),
  },
  shield: {
    id: 'shield', name: '방패기사',
    hp: 180, atk: 11, range: 18, spd: 13, atkCd: 1.1, mp: 45,
    defense: 0.4,
    buildSprite: () => buildSheet('shield', heroFallback('8', '8', 'shield')),
  },
  rogue: {
    id: 'rogue', name: '도적',
    hp: 55, atk: 16, range: 18, spd: 38, atkCd: 0.55, mp: 25,
    buildSprite: () => buildSheet('rogue', heroFallback('4', '4', 'dagger')),
  },
  healer: {
    id: 'healer', name: '힐러',
    hp: 50, atk: 6, range: 80, spd: 20, atkCd: 1.4, mp: 55,
    healAmt: 30, healRange: 90,
    buildSprite: () => buildSheet('healer', heroFallback('5', '5', 'staff')),
  },
};

export function heroPoolForWave(wave: number): string[] {
  const pool = ['apprentice'];
  if (wave >= 2) pool.push('swordsman');
  if (wave >= 3) pool.push('archer', 'spear');
  if (wave >= 4) pool.push('mage', 'rogue');
  if (wave >= 6) pool.push('shield');
  if (wave >= 8) pool.push('healer');
  return pool;
}
