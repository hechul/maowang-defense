/**
 * 랜덤 이벤트 (GDD 핵심) — 웨이브 클리어 후 25% 확률
 * 유물 선택을 대체 (1회당 둘 중 하나)
 */
import type { GameEngine } from '../GameEngine';

export interface EventDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
  acceptLabel: string;
  canAccept: (g: GameEngine) => boolean;
  apply: (g: GameEngine) => void;
}

export const EVENTS: Record<string, EventDef> = {
  merchant: {
    id: 'merchant', icon: '🧙', title: '신비한 상인', acceptLabel: '수락 (200 MP)',
    desc: '영웅 등급 몬스터 1체를 즉시 소환해드립니다.',
    canAccept: (g) => g.mp >= 200 && g.monsters.filter((m) => !m.dead).length < 14,
    apply: (g) => {
      g.mp -= 200;
      const epicPool = ['dwitch', 'orcb', 'devil'];
      g.spawnMonster(epicPool[Math.floor(Math.random() * epicPool.length)]);
    },
  },
  blessing: {
    id: 'blessing', icon: '✨', title: '어둠의 축복', acceptLabel: '받기',
    desc: '전 몬스터 HP가 가득 회복됩니다.',
    canAccept: (g) => g.monsters.filter((m) => !m.dead).length > 0,
    apply: (g) => {
      for (const m of g.monsters) {
        if (m.dead) continue;
        m.hp = m.maxHp * m.hpMul;
      }
    },
  },
  bonus: {
    id: 'bonus', icon: '💰', title: '보너스 웨이브', acceptLabel: '수락',
    desc: '다음 웨이브 동안 마력 보상이 2배가 됩니다.',
    canAccept: () => true,
    apply: (g) => { g.bonusWaveActive = true; },
  },
  trap: {
    id: 'trap', icon: '⚠', title: '운명의 함정', acceptLabel: '감수 (-100 HP)',
    desc: '마왕성이 100 데미지 / 영혼석 +50',
    canAccept: (g) => g.castleHp > 100,
    apply: (g) => {
      g.castleHp -= 100;
      g.queueBonusStones(50);
    },
  },
  duel: {
    id: 'duel', icon: '⚔', title: '결투', acceptLabel: '결투 시작',
    desc: '엘리트 보스 1체 등장 / 처치 시 영혼석 +150',
    canAccept: () => true,
    apply: (g) => {
      g.duelActive = true;
      const pool = ['captain', 'archmage'];
      const id = pool[Math.floor(Math.random() * pool.length)];
      g.spawnHeroPublic(id, true);
      // 결투 보스는 약화 (60% HP)
      if (g.bossUnit) {
        g.bossUnit.hp *= 0.6;
        g.bossUnit.maxHp *= 0.6;
      }
    },
  },
  // 5차 — 상점 NPC: 유물 즉시 1개 (300 MP)
  shop_relic: {
    id: 'shop_relic', icon: '🛒', title: '암시장 상인',
    acceptLabel: '거래 (300 MP)',
    desc: '유물 1개를 즉시 양도합니다 (3개 중 선택).',
    canAccept: (g) => g.mp >= 300,
    apply: (g) => {
      g.mp -= 300;
      // 유물 선택 모달을 강제로 띄움 (offerRelics 재사용)
      g.offerRelics();
    },
  },
  // 5차 — 마력 ↔ 영혼석 환전
  shop_exchange: {
    id: 'shop_exchange', icon: '🪙', title: '환전상',
    acceptLabel: '환전 (현재 마력 ½ → 영혼석)',
    desc: '현재 마력의 절반을 영혼석으로 환전합니다.',
    canAccept: (g) => g.mp >= 100,
    apply: (g) => {
      const trade = Math.floor(g.mp / 2);
      g.mp -= trade;
      const stones = Math.floor(trade / 10);
      g.queueBonusStones(stones);
    },
  },
};

export function pickRandomEvent(g: GameEngine): string | null {
  const available = Object.keys(EVENTS).filter((id) => EVENTS[id].canAccept(g));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}
