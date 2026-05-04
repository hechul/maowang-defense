/**
 * 보스 데이터 (GDD §5-2 — 5종)
 * Phase B: PNG 우선 (`captain_64.png`, `archmage_64.png`, ...)
 */
import { makeSprite, row, empty, type Sprite } from '../rendering/pixelArt';
import { pngOrBuild } from '../rendering/spriteLoader';

export interface BossDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  range: number;
  spd: number;
  atkCd: number;
  mp: number;
  scale: number;
  invuln?: { cd: number; dur: number };
  bossHeal?: { amt: number; cd: number; range: number };
  castleStrike?: { cd: number; dmg: number };
  buildSprite: () => Sprite;
}

const BOSS_PAL = [null, '#FFEAA7', '#FDCB6E', '#F1C40F', '#FFFFFF', '#1A1A2E', '#F8C291', '#E17055', '#DFE6E9', '#BDC3C7', '#0984E3', '#1B3A5C', '#D63031', '#7B2D8E', '#74B9FF', '#FF6B6B'];

const fallbackBoss = (color: string, accent: string) => [
  empty(), empty(), empty(), empty(),
  row(color.repeat(10)), row(color.repeat(12)),
  row(color.repeat(14)), row(color.repeat(14)),
  row(color + color + '6' + '5' + '5' + '6' + color.repeat(2) + '6' + '5' + '5' + '6' + color + color),
  row(color.repeat(14)), row(color.repeat(14)),
  row(color + accent.repeat(12) + color),
  row(color.repeat(18)), row(color.repeat(20)), row(color.repeat(20)),
  row(color + color + '2'.repeat(16) + color + color),
  row(color + color + color.repeat(16) + color + color),
  row(color + color + color.repeat(16) + color + color),
  row(color + color + '2'.repeat(16) + color + color),
  row(color + color + color.repeat(16) + color + color),
  row('a' + '2'.repeat(18) + 'a'),
  row('cccc....cccc'), row('cccc....cccc'),
  row('cccc....cccc'), row('cccc....cccc'),
  row('cccc....cccc'), row('cccc....cccc'),
  row('5555....5555'), row('5555....5555'),
  row('5555....5555'), row('5555....5555'),
];

export const BOSSES: Record<string, BossDef> = {
  captain: {
    id: 'captain', name: '기사단장',
    // BAL-1: 첫 보스 학습 단계 — HP 600→400. invuln 정의 X (단순 피통)
    hp: 400, atk: 30, range: 22, spd: 14, atkCd: 0.85, mp: 200, scale: 1.1,
    buildSprite: () => pngOrBuild('captain_64', () => makeSprite(fallbackBoss('8', '2'), BOSS_PAL, 2, true), 2),
  },
  archmage: {
    id: 'archmage', name: '대마법사',
    // BAL-2: range 140→100 (마왕성 도달 전 멀리서 공격 방지)
    hp: 1200, atk: 38, range: 100, spd: 14, atkCd: 1.1, mp: 400, scale: 1.1,
    buildSprite: () => pngOrBuild('archmage_64', () => makeSprite(fallbackBoss('d', '3'), BOSS_PAL, 2, true), 2),
  },
  saint: {
    id: 'saint', name: '성녀',
    // BAL-6: bossHeal range 140→80 (자기 옆 hero만 회복)
    hp: 1800, atk: 35, range: 120, spd: 14, atkCd: 1.2, mp: 600, scale: 1.1,
    bossHeal: { amt: 80, cd: 5, range: 80 },
    buildSprite: () => pngOrBuild('saint_64', () => makeSprite(fallbackBoss('4', '3'), BOSS_PAL, 2, true), 2),
  },
  king: {
    id: 'king', name: '용사왕',
    // BAL-3: invuln dur 3→2 (대응 가능 시간 확보)
    hp: 3000, atk: 55, range: 24, spd: 16, atkCd: 0.85, mp: 900, scale: 1.2,
    invuln: { cd: 9, dur: 2 },
    buildSprite: () => pngOrBuild('king_64', () => makeSprite(fallbackBoss('3', 'c'), BOSS_PAL, 2, true), 2),
  },
  priest: {
    id: 'priest', name: '빛의 신관',
    hp: 4000, atk: 80, range: 200, spd: 12, atkCd: 1.4, mp: 1200, scale: 1.2,
    castleStrike: { cd: 7, dmg: 120 },
    buildSprite: () => pngOrBuild('priest_64', () => makeSprite(fallbackBoss('4', '3'), BOSS_PAL, 2, true), 2),
  },
};

export function bossForWave(wave: number): string {
  if (wave === 5) return 'captain';
  if (wave === 10) return 'archmage';
  if (wave === 15) return 'saint';
  if (wave === 20) return 'king';
  if (wave >= 25) {
    // 무한 사이클: 25부터 boss/king/saint/archmage/captain 반복
    const cycle = ['priest', 'king', 'saint', 'archmage', 'captain'];
    return cycle[Math.floor((wave - 25) / 5) % cycle.length];
  }
  return 'captain';
}
