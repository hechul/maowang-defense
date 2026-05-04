import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initialize as initSdk, schedulePush } from './sdk/AitBridge';
import { preloadSprites, preloadSequence, loadSpriteSheet, loadSpriteGrid } from './game/rendering/spriteLoader';
import { useSaveStore } from './store/useSaveStore';
import { daysUntilSeasonEnd } from './game/data/seasonPass';
import { makeMail } from './game/data/mailbox';
import { getSeasonStory } from './game/data/seasonStories';
import './styles/global.css';

// 앱인토스 SDK 초기화 (병렬, 비차단)
initSdk().catch((e) => console.warn('SDK init failed:', e));

// P0-5 푸시 알림 트리거 — SDK 초기화 후 비동기 등록
queueMicrotask(() => {
  try {
    const save = useSaveStore.getState();
    // 1) 출석 리마인드 — 마지막 플레이로부터 24시간 후
    const since = save.lastPlayedAt ? Date.now() - save.lastPlayedAt : 0;
    const dayMs = 86400000;
    if (since < dayMs) {
      schedulePush({
        title: '🦇 마왕성이 부른다',
        body: '오늘의 일일 도전이 기다리고 있다. 출석 보상도 잊지 마라.',
        afterMs: Math.max(60000, dayMs - since),
      }).catch(() => {});
    }
    // 2) 시즌 종료 임박 — 시즌 종료 24시간 전
    const daysLeft = daysUntilSeasonEnd();
    if (daysLeft > 0) {
      schedulePush({
        title: '🎫 시즌 종료 임박',
        body: `이번 시즌이 ${daysLeft}일 남았다. 미수령 보상을 챙겨라.`,
        afterMs: Math.max(60000, (daysLeft - 1) * dayMs),
      }).catch(() => {});
    }
    // P0-2 / P1-6: 시즌 변경 감지 → 시즌 시작 환영 메일
    save.ensureCurrentSeason();
    const today = new Date().toISOString().slice(0, 10);
    const mailMarkerId = `season-welcome-${save.seasonPass.seasonId}`;
    if (!save.mailbox.find((m) => m.id === mailMarkerId) && save.mailboxLastDeliveryDate !== today) {
      const story = getSeasonStory(save.seasonPass.seasonId);
      const m = makeMail(
        mailMarkerId,
        `🎫 ${story.name}`,
        `${story.subtitle}\n\n${story.greeting}`,
        { kind: 'stones', amount: 100 },
        7 * dayMs,
      );
      save.pushMail(m);
    }
    // 만료 메일 정리
    save.cleanupExpiredMails();
  } catch (e) {
    console.warn('[push/mail] init failed:', e);
  }
});

// A-1: 접근성 — haptic 플래그 초기 동기화 + largerText 적용
try {
  const acc = useSaveStore.getState().accessibility;
  (window as any).__hapticEnabled = acc.haptic;
  // ACC A-1: largerText ON 시 root font-size 14→17 (~+20%)
  document.documentElement.style.fontSize = acc.largerText ? '17px' : '14px';
  // ACC A-4: data-larger-text 속성 동기화 (CSS 셀렉터 기반 색 격상)
  document.documentElement.setAttribute('data-larger-text', String(acc.largerText));
  // 시각 폴리싱: reduceMotion data 속성 동기화 (CSS 애니메이션 ¼ 속도/비활성)
  document.documentElement.setAttribute('data-reduce-motion', String(acc.reduceMotion));
} catch (e) {}

// 핵심 PNG 사전 로드 (asset_pixel.md P0)
preloadSprites([
  'slime', 'kslime', 'slord',     // 슬라임 라인
  'demon_lord_48',                 // 마왕 마스코트
  'demon_lord_48_crowned', 'demon_lord_48_lord', 'demon_lord_48_mythic',  // 마왕 4 tier
  'castle_main', 'castle_destroyed',  // 마왕성
], 2).catch(() => {});

// V2 — 보스 5종 (64×64)
preloadSprites([
  'captain_64', 'archmage_64', 'saint_64', 'king_64', 'priest_64',
], 2).catch(() => {});

// V2 — 시즌 보스 4종 (64×64)
preloadSprites([
  'sb_sakura_envoy', 'sb_flame_priest', 'sb_harvest_envoy', 'sb_first_demon_shadow',
], 2).catch(() => {});

// V2 — 유물 진화 10종
preloadSprites([
  'relic_fuse_necropolis', 'relic_fuse_solar_crown', 'relic_fuse_fortress',
  'relic_fuse_bloodmask', 'relic_fuse_prophecy', 'relic_fuse_midas',
  'relic_fuse_eternal_pact', 'relic_fuse_eternal_winter',
  'relic_fuse_venomfang', 'relic_fuse_karma',
], 2).catch(() => {});

// V2 — 숨겨진 시너지 6종 + locked 6종
preloadSprites([
  'hidden_synergy_arcane_circle', 'hidden_synergy_dark_pact',
  'hidden_synergy_kings_guard', 'hidden_synergy_chaos_lab',
  'hidden_synergy_undying_legion', 'hidden_synergy_beast_horde',
  'hidden_synergy_arcane_circle_locked', 'hidden_synergy_dark_pact_locked',
  'hidden_synergy_kings_guard_locked', 'hidden_synergy_chaos_lab_locked',
  'hidden_synergy_undying_legion_locked', 'hidden_synergy_beast_horde_locked',
], 2).catch(() => {});

// V2 — 마왕 비밀 능력 6종
preloadSprites([
  'secret_combo_master', 'secret_full_magic', 'secret_jackpot_legend',
  'secret_undying', 'secret_centurion', 'secret_genesis',
], 2).catch(() => {});

// V2 — PVP 등급 메달 7종
preloadSprites([
  'pvp_tier_bronze', 'pvp_tier_silver', 'pvp_tier_gold',
  'pvp_tier_platinum', 'pvp_tier_diamond', 'pvp_tier_master',
  'pvp_tier_grandmaster',
], 2).catch(() => {});

// V2 — 상점 NPC 4프레임 (개별 파일 f1~f4)
preloadSequence('npc_merchant', 4).catch(() => {});

// 4프레임 walk sheet 용사 8종 (apprentice/swordsman/archer/mage/spear/shield/rogue/healer)
// scale=1로 native 해상도 보존 + 누끼(흰색 키컬러) 자동 제거 + 프레임별 bbox bottom-center 정렬
// 화면 출력 크기는 GameEngine.drawUnit에서 정규화 (HERO_RENDER_H 기준)
['apprentice', 'swordsman', 'archer', 'mage', 'spear', 'shield', 'rogue', 'healer'].forEach((id) => {
  loadSpriteSheet(id, 4, 1).catch(() => {});
});

// 몬스터 멀티-row 시트 (한 PNG에 진화 라인 전체)
// 각 행 = 진화 단계, 4프레임 walk
loadSpriteGrid('slime_sheet',  ['slime',  'kslime', 'slord'],  4).catch(() => {});
loadSpriteGrid('goblin_sheet', ['goblin', 'gobw',   'ggen'],   4).catch(() => {});
loadSpriteGrid('witch_sheet',  ['witch',  'dwitch', 'awitch'], 4).catch(() => {});
loadSpriteGrid('skel_sheet',   ['skel',   'sknt'],             4).catch(() => {});
loadSpriteGrid('imp_sheet',    ['imp',    'devil'],            4).catch(() => {});
loadSpriteGrid('lich_sheet',   ['lich',   'dlich'],            4).catch(() => {});
loadSpriteGrid('mimic_sheet',  ['mimic',  'gmimic'],           4).catch(() => {});
loadSpriteGrid('mino_sheet',   ['mino',   'minok'],            4).catch(() => {});
loadSpriteGrid('orc_sheet',    ['orc',    'orcb',   'owar'],   4).catch(() => {});
loadSpriteGrid('zombie_sheet', ['zombie', 'zomk'],             4).catch(() => {});

// 카테고리 E: 배경 타일 (16×16, scale 1로 로드)
preloadSprites([
  'tile_stone', 'tile_dirt', 'tile_grass',
  'tile_lava_f1', 'tile_lava_f2',
  'tile_magic_f1', 'tile_magic_f2', 'tile_magic_f3', 'tile_magic_f4',
], 1).catch(() => {});

// 카테고리 F: 이펙트 시퀀스
Promise.all([
  preloadSequence('hit_physical', 3),
  preloadSequence('hit_fire', 3),
  preloadSequence('hit_ice', 3),
  preloadSequence('hit_dark', 3),
  preloadSequence('summon_common', 6),
  preloadSequence('summon_rare', 6),
  preloadSequence('summon_epic', 6),
  preloadSequence('summon_legend', 6),
  preloadSequence('evolve', 8),
  preloadSequence('death_ally', 3),
  preloadSequence('death_enemy', 3),
]).catch(() => {});

// 첫 페인트 후 splash 제거
requestAnimationFrame(() => {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 200);
  }
});

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
