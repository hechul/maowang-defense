# 마왕키우기 (Raise the Demon Lord) — 인수인계 가이드 (HANDOFF)

> 앱인토스(토스 미니앱) 픽셀아트 스핀 디펜스 로그라이크. MVP 수준 + 5차 게임성 패스 완료. 외부 개발자가 압축을 풀고 즉시 이어서 작업할 수 있도록 정리한 문서.

---

## 1. 기술 스택

| 영역 | 사용 기술 | 비고 |
|---|---|---|
| 언어 | TypeScript ^5.5 | strict, `tsc --noEmit` 으로 lint |
| 프레임워크 | React 18 + Vite 5 | 코드 스플리팅(`React.lazy` + `Suspense`) |
| 상태관리 | Zustand 4 + `persist` 미들웨어 | localStorage 영구 저장 |
| 렌더링 | HTML5 Canvas 2D | 60fps 타겟 |
| 토스 SDK | `@apps-in-toss/web-framework` ^2.0.0 | 동적 import + fallback |
| AIT 빌드 | `granite.config.ts` | `npm run ait:build/deploy` |
| 픽셀 처리 | 자체 flood-fill 누끼 + bbox 정렬 | `spriteLoader.ts` |
| 폰트 | Google Fonts (Press Start 2P + Gugi) | index.html에서 로드 |
| 패키지 매니저 | npm | (yarn/pnpm 미사용) |

---

## 2. 폴더 구조

```
maowang-defense/
├── HANDOFF.md                   # 이 문서
├── README.md                    # 프로젝트 개요
├── ASSET_PROMPTS.md             # GPT 에셋 발주 프롬프트 v1
├── ASSET_PROMPTS_V2.md          # v2 (보스/유물/시너지/PVP)
├── docs/                        # 검수/QA/디자인 문서 10종
│   ├── APP_IN_TOSS_RELEASE_CHECKLIST.md
│   ├── CHANGELOG_AUTO_QA.md
│   ├── FIRST_3_MINUTES_UX_REVIEW.md
│   ├── GAME_DESIGN_OVERHAUL.md
│   ├── MANUAL_QA_SCENARIOS.md
│   ├── POLICY_RISK_AUDIT.md
│   ├── PROJECT_OVERVIEW_FOR_REVIEW.md
│   ├── PROJECT_REVIEW_FOR_GPT.md
│   ├── QA_REPORT.md
│   └── SOAK_TEST_CHECKLIST.md
├── package.json
├── tsconfig.json / tsconfig.node.json
├── vite.config.ts
├── granite.config.ts            # ★ 앱인토스 manifest (appName/icon/permissions)
├── index.html                   # 셸 + 로딩 splash + Google Fonts
├── public/
│   └── sprites/                 # ★ 395장 PNG (런타임 fetch)
├── assets/
│   ├── extracted/               # 324장 원본 추출본 (런타임 미참조 — 빌드 미포함)
│   └── source/                  # (현재 비어있음)
├── scripts/
│   └── strip_bg.py              # 배경 제거 헬퍼 (Python)
├── tools/
│   ├── apply_v2_assets.py
│   ├── extract_all.py
│   └── extract_sprites.py       # PSD/시트 → 개별 PNG 추출 도구
└── src/
    ├── main.tsx                 # ★ 진입점 (SDK init, 푸시 등록, 스프라이트 preload)
    ├── App.tsx                  # ★ 27 화면 라우팅 + 컷씬 트리거
    ├── vite-env.d.ts
    ├── styles/global.css        # safe-area, 픽셀 폰트
    ├── audio/AudioEngine.ts     # WebAudio (BGM/SFX, 미디 톤 합성)
    ├── sdk/AitBridge.ts         # ★ 앱인토스 SDK 추상화 (광고/IAP/리더보드/푸시/햅틱/공유)
    ├── store/useSaveStore.ts    # ★ Zustand persist — 영혼석/스킬/도감/시즌/IAP/소셜
    ├── game/
    │   ├── GameEngine.ts        # ★ 메인 루프 + 60+ 시스템 import 통합
    │   ├── missionTracker.ts    # 일일/누적 미션 진행도
    │   ├── data/                # ★ 53개 게임 데이터 모듈 (몬스터/용사/보스/유물/시너지/이벤트/시즌/스토리…)
    │   ├── entities/            # (현재 비어있음 — GameEngine 내부 클래스 사용)
    │   ├── systems/             # 11개 시스템
    │   │   ├── BossSystem.ts
    │   │   ├── CardSystem.ts
    │   │   ├── CastleSystem.ts
    │   │   ├── CombatSystem.ts
    │   │   ├── DamageSystem.ts
    │   │   ├── EconomySystem.ts
    │   │   ├── HeroStatsSystem.ts
    │   │   ├── MonsterStatsSystem.ts
    │   │   ├── OverlayController.ts
    │   │   ├── StageSystem.ts
    │   │   └── WaveSystem.ts
    │   └── rendering/
    │       ├── palette.ts       # 마스터 32색 (PIXEL §)
    │       ├── pixelArt.ts      # 함수형 픽셀 빌더 (PNG fallback용)
    │       ├── spriteLoader.ts  # ★ PNG 캐시 + flood-fill 누끼 + bbox bottom-center 정렬
    │       └── sprites/         # 캐릭터별 픽셀 데이터(legacy)
    └── ui/
        ├── screens/             # ★ 27개 화면
        │   ├── CastleHubScreen.tsx     # 메인 허브 (게임 시작점)
        │   ├── GameScreen.tsx          # ★ 인게임 (Canvas + HUD)
        │   ├── ResultScreen.tsx
        │   ├── TitleScreen.tsx         # (라우팅에서 castleHub로 폴백, 데드코드)
        │   ├── StageSelectScreen.tsx
        │   ├── RecruitScreen.tsx       # 용사 모집(가챠)
        │   ├── SkillTreeScreen.tsx
        │   ├── BestiaryScreen.tsx      # 도감
        │   ├── DeckScreen.tsx
        │   ├── CardEnhanceScreen.tsx
        │   ├── DemonSelectScreen.tsx
        │   ├── ShopScreen.tsx          # IAP + 광고 제거 + 스타터팩
        │   ├── InteriorScreen.tsx      # 마왕성 인테리어
        │   ├── ThroneRoomScreen.tsx
        │   ├── SeasonPassScreen.tsx
        │   ├── AchievementsScreen.tsx
        │   ├── ChallengesScreen.tsx
        │   ├── MissionsScreen.tsx
        │   ├── DailyChallengeScreen.tsx
        │   ├── LeaderboardScreen.tsx
        │   ├── EventsScreen.tsx
        │   ├── InboxScreen.tsx         # 우편함 (시즌 환영 메일)
        │   ├── AsyncPvpScreen.tsx      # 비동기 PVP
        │   ├── FriendsScreen.tsx
        │   ├── MemoryGameScreen.tsx    # 미니게임
        │   ├── PrivacyScreen.tsx       # ★ 운영 검수 필수 (개인정보)
        │   └── SupportScreen.tsx       # ★ 운영 검수 필수 (고객 문의)
        ├── components/                  # 7개 공용 UI
        │   ├── AttendanceModal.tsx
        │   ├── CutsceneOverlay.tsx
        │   ├── DailyQuestModal.tsx
        │   ├── IntroCutscene.tsx
        │   ├── LoadingScreen.tsx
        │   ├── StageStartModal.tsx
        │   └── StarterPackModal.tsx
        └── debug/DebugOverlay.tsx
```

**굵은 표시(★)** 는 인수자가 가장 먼저 읽으면 좋은 진입점.

---

## 3. 에셋 현황

### 3-1. 사용 중 (유지) — `public/sprites/` 395장

| 카테고리 | 파일 패턴 | 사용처 |
|---|---|---|
| 마왕 마스코트 | `demon_lord_48*.png` (4 tier) | 허브, 컷씬 |
| 마왕성 | `castle_main.png`, `castle_destroyed.png` | GameEngine |
| 보스 V2 | `captain_64.png`, `archmage_64.png`, `saint_64.png`, `king_64.png`, `priest_64.png` | BossSystem |
| 시즌 보스 | `sb_*.png` (4종) | seasonalBosses |
| 용사 walk sheet (4프레임) | `apprentice/swordsman/archer/mage/spear/shield/rogue/healer.png` | spawn |
| 용사 추가 액션 (개별 프레임) | `*_attack_f{1-3}`, `*_hit_f{1-2}`, `*_death_f{1-3}` | 전투 애니메이션 |
| 몬스터 멀티-row 시트 | `*_sheet.png` (slime/goblin/witch/skel/imp/lich/mimic/mino/orc/zombie) | `loadSpriteGrid`로 진화 라인 분리 |
| 유물 진화 V2 | `relic_fuse_*.png` (10종) | relicFusions |
| 숨겨진 시너지 | `hidden_synergy_*` + `_locked` (12장) | hiddenSynergies |
| 마왕 비밀 능력 | `secret_*.png` (6종) | demonSecrets |
| PVP 등급 메달 | `pvp_tier_*.png` (7종) | AsyncPvpScreen |
| 카드 시스템 | `card_back_*`, `card_flip_*`, `card_unseal_*`, `card_frame_*` (rarity 5종) | CardSystem |
| 궁극기 버튼 | `btn_ulti_*`, `btn_reveal_*` | GameScreen.tsx |
| HUD | `hud_bar_hp_frame`, `hud_bar_mp_frame`, `hud_kill_badge`, `hud_wave_*` | GameScreen |
| 메뉴 플레이트 | `menu_plate_*.png` | TitleScreen |
| 로고 | `logo_main.png` | TitleScreen |
| 타일 | `tile_{stone,dirt,grass,lava_*,magic_*}.png` | 배경 |
| 이펙트 시퀀스 | `hit_{physical,fire,ice,dark}_f{1-3}`, `summon_{common,rare,epic,legend}_f{1-6}`, `evolve_f{1-8}`, `death_{ally,enemy}_f{1-3}` | DamageSystem |
| 상점 NPC | `npc_merchant_f{1-4}.png` | ShopScreen |

> 모든 PNG는 런타임 `loadSprite/loadSpriteSheet/loadSpriteGrid`로 로드 + `Map` 캐싱 + 자동 누끼(flood-fill) + bbox bottom-center 정렬. 로드 실패 시 `pixelArt.ts`의 함수형 builder로 fallback.

### 3-2. 보존 필요 (런타임 미참조이나 백업/소스)

```
assets/extracted/   ← 324장 PSD 추출 중간 산출물. 빌드에 미포함. 디자인 수정 시 참고용.
                    └ apprentice/, archer/, goblin/, ... (캐릭터별 폴더)
                    └ _standalone/, v2/ (V2 패스 작업물)
assets/source/      ← 현재 비어있음. 원본 PSD 보관 위치.
```

### 3-3. 잠재 정리 후보

| 파일 | 상태 | 비고 |
|---|---|---|
| `public/sprites/logo_main_orig.png` | `_orig` 백업 | 현 사용은 `logo_main.png`. 디자인 확정 시 삭제 가능 |
| `public/sprites/menu_plate_{primary,dark,disabled}_orig.png` | `_orig` 백업 | 동상 |
| `public/sprites/btn_ulti_pulse_sheet.png` + `_f{1-8}` 개별 | 시트와 개별 프레임 양쪽 존재 | 주 사용처가 어느 쪽인지 확인 후 정리 |
| `public/sprites/card_*_sheet.png` + `_f{1-N}` | 동상 | |
| `tools/__pycache__/` | Python 캐시 | `.gitignore`에 추가됨 (이미 트랙 중이면 `git rm -r --cached`) |

> 안전을 위해 자동 삭제하지 않음. 인수자가 빌드 결과 비교 후 결정.

### 3-4. 빈 폴더

- `src/audio/` 에 `AudioEngine.ts`만 있음 — 별도 wav/mp3 파일은 코드 내 합성 (oscillator 기반). 발주 받으면 이 폴더에 PNG/wav 추가 후 `AudioEngine.loadSfx()` 연결.
- `src/game/entities/` 비어있음 — `GameEngine.ts` 내부에 클래스 인라인.

---

## 4. 구현 상태

### ✅ 완성 (정상 동작 검증됨)

**메인 게임 루프**
- [x] 자동 디펜스 + 카드 픽 → 시너지 빌드
- [x] Wave 시스템 + 보스 + 시즌 보스 + 엘리트 + 마일스톤
- [x] 봉인의 탑(Sealed Tower) — 무한 모드 (`floorFromWave`, milestone 진행)
- [x] 스테이지 모드 (6 챕터 × 5 스테이지 = 30) + 일일 도전 + 엔드리스 3종 모드
- [x] 챌린지 모드 + Edict(요일 칙령) + Daily side quest
- [x] NG+ 모드 + Risk Card(branch) 시스템
- [x] 60+ 시스템 통합 (CombatSystem, EconomySystem, OverlayController 등)

**메타 진행**
- [x] 마왕 레벨 (EXP/보상 곡선) + 마왕 캐릭터 4 tier (crowned/lord/mythic)
- [x] 28 화면 (게임/허브/모집/스킬트리/도감/카드강화/덱/시즌패스/PVP/우편함/이벤트/인테리어/문양/...)
- [x] 영혼석 + 유물 파편 2차 이코노미
- [x] 도감(몬스터/용사/보스/유물/숨겨진 시너지/마왕 비밀)
- [x] 업적, 칭호 평가, 봉인 석판(SealedTablets) 트루네임
- [x] 컷씬 자동 트리거 (챕터 시작/끝, 보스 첫 처치, 마왕 레벨 마일스톤)
- [x] 일일 출석, 일일 미션, 시즌 환영 메일, 우편함 만료 정리
- [x] 비동기 PVP + 친구
- [x] 5차 게임성 패스 — 빌드 보너스, 유물 진화, 숨겨진 시너지, 마왕 비밀, 단골 적, PVP 등급, 시즌 보스

**시스템**
- [x] 토스 SDK 동적 import + 일반 브라우저 fallback (`AitBridge.ts`)
- [x] 광고 시뮬레이션 (rewarded 6초, interstitial 4초 — 한국 시장 평균 기준)
- [x] localStorage persist (`useSaveStore`)
- [x] 푸시 알림 (`navigator.Notification` fallback)
- [x] 햅틱 (SDK 우선, `navigator.vibrate` fallback) + 접근성 OFF 옵션
- [x] 배경 자동 누끼(flood-fill + 다중 패스 softening) + 프레임별 bbox bottom-center 정렬 (walk cycle 미끄러짐 방지)
- [x] 코드 스플리팅 (`React.lazy` 24개 화면)
- [x] Suspense + LoadingScreen
- [x] Safe Area CSS, 노치 대응, 백그라운드/포그라운드 핸들링

### ⚠ 부분 구현 / Mock / 미구현

| 항목 | 위치 | 상태 |
|---|---|---|
| 토스 광고 SDK | `src/sdk/AitBridge.ts:73~91` | SDK 미설치 시 `setTimeout` 6초/4초 시뮬레이션. SDK가 `showAd` 노출 시 자동 사용 |
| 토스 IAP | `src/sdk/AitBridge.ts:106~119` | SDK 미설치 시 항상 success 반환(시뮬레이션). 실 결제 흐름 검증 필요 |
| 리더보드 | `src/sdk/AitBridge.ts:124~151` | SDK 우선, fallback은 localStorage 100명 cap. 실 글로벌 리더보드 연결 필요 |
| 푸시 알림 | `src/sdk/AitBridge.ts:154~167` | SDK 우선, fallback은 `Notification API` (브라우저) |
| 공유 | `src/sdk/AitBridge.ts:170~180` | `navigator.share` fallback. 실 토스 피드 공유 SDK 호출 검증 필요 |
| `TitleScreen.tsx` | `src/ui/screens/` | App.tsx 라우팅에서 `castleHub`로 폴백 — **데드코드**. 정리 권장 (코멘트만 표시) |
| `src/game/entities/` | 비어있음 | 향후 클래스 분리 시 사용 |
| 사운드 파일 | `src/audio/AudioEngine.ts` | WebAudio oscillator 합성. 외부 wav/mp3 미사용 |
| 진화 라인 일부 PNG | `public/sprites/` | `loadSpriteGrid`가 누락 행은 코드 빌더로 fallback. 주요 라인은 모두 있음 |
| `_orig` 백업 PNG | `public/sprites/*_orig.png` | 현재 미참조 — 디자인 확정 시 삭제 가능 |

---

## 5. 토스 연동 & 수익화 Placeholder

### 5-1. 수익화 모델

**광고 + IAP 혼합** — 영혼석 IAP 상품 + 광고 제거 IAP + Rewarded 광고 보상.

| 종류 | 트리거 | 코드 위치 |
|---|---|---|
| Rewarded — 일반 보상 | 광고 보상 픽 / 일일 보상 / 부활 | `AitBridge.showRewardedAd(placement)` |
| Interstitial | N판마다 1회 | `AitBridge.showInterstitialAd()` |
| IAP — 영혼석 팩 | ShopScreen | `AitBridge.purchaseItem(itemId)` |
| IAP — 스타터팩 | StarterPackModal (1회 노출) | `useSaveStore.iap.starterPackShown/Purchased` |
| IAP — 광고 제거 | ShopScreen | `useSaveStore.iap.adsRemoved` |
| IAP — 시즌패스 | SeasonPassScreen | `useSaveStore.seasonPass` |

### 5-2. SDK 연동 체크리스트 (인수자가 해야 할 일)

1. **앱인토스 SDK 등록** — `granite.config.ts` (`appName: 'maowang-defense'`, `icon: '/icon.png'`)
2. **`public/icon.png`(144×144) 등록** — 현재 누락 가능성. 아이콘 파일 있는지 확인
3. **광고/IAP/리더보드 실 SDK 호출 검증** — `AitBridge.ts` 의 `sdkApi?.showAd`, `sdkApi?.purchaseItem`, `sdkApi?.submitScore` 가 실제 토스 SDK API 시그니처와 일치하는지 확인
4. **결제 상품 ID 등록** — 토스 콘솔에서 영혼석 팩/스타터팩/광고제거/시즌패스 SKU 발급 후 코드의 `itemId` 매칭
5. **푸시 알림 서버 연결** — `schedulePush` 호출 시 fallback이 브라우저 Notification으로 떨어짐. 토스 push topic 연결 필요
6. **AIT 빌드/배포 검증** — `npm run ait:build && npm run ait:deploy`

### 5-3. SDK 함수 호출 위치 (검색용 키워드)

- `ensureSdk()` — 동적 import 단일 진입점 (`AitBridge.ts:21`)
- `getUser()`, `showRewardedAd()`, `showInterstitialAd()`, `purchaseItem()`
- `submitScore()`, `getLeaderboard()`, `schedulePush()`, `shareToFeed()`, `haptic()`
- 모든 SDK 함수는 try/catch + fallback 처리됨 — 미설치 환경에서도 게임 동작

---

## 6. 실행 방법

### 6-1. 로컬 개발

```bash
cd maowang-defense
npm install
npm run dev          # http://localhost:5173
```

> 개발 서버에서는 SDK 미설치 모드 — 광고는 setTimeout 시뮬레이션, 익명 사용자(localStorage 기반).

### 6-2. 검증

```bash
npm run lint         # tsc --noEmit (타입체크)
```

### 6-3. 프로덕션 빌드

```bash
npm run build        # tsc && vite build → dist/
npm run preview      # 빌드 결과 미리보기
```

### 6-4. 앱인토스 빌드/배포

```bash
npm run ait:build    # AIT 번들
npm run ait:deploy   # 콘솔 배포
```

### 6-5. 권장 환경

- Node.js 20+
- npm 10+
- Chrome/Edge 최신 (Canvas 2D + ES2022)
- (선택) Python 3 — `tools/extract_sprites.py` 등 에셋 변환 시

---

## 7. 인수자에게 — 첫 1시간 추천 동선

1. `npm install && npm run dev` → 게임 직접 플레이 (인트로 컷씬 + 1웨이브)
2. `docs/PROJECT_OVERVIEW_FOR_REVIEW.md` → 게임 설계 큰 그림
3. `docs/APP_IN_TOSS_RELEASE_CHECKLIST.md` → 배포 검수 항목 점검
4. `src/store/useSaveStore.ts` → 영구 상태 키 파악
5. `src/game/GameEngine.ts` → 메인 루프 import 80줄로 시스템 전체 윤곽 파악
6. `src/sdk/AitBridge.ts` → SDK 호출 12개 함수 / fallback 동작 검증
7. `src/main.tsx` → preload 시트 목록 확인 (사용 중인 PNG 카테고리 한눈에 보기)

---

## 8. 알려진 제약 / 주의

- **`TitleScreen.tsx` 데드코드** — App.tsx에서 `screen === 'title'`일 때 castleHub로 폴백. 인수자가 정리 권장.
- **`src/game/entities/` 빈 폴더** — `GameEngine.ts` 내부에 모든 엔티티 클래스 인라인. 분리하려면 큰 리팩토링 필요.
- **`assets/extracted/` 는 빌드 미포함** — `vite`는 `public/` + `src/` 만 번들. 단, repo에 ~324장 추가 — 압축 시 용량 주의 (필요 없으면 제외 가능).
- **Python tooling** — `tools/`, `scripts/strip_bg.py` 는 디자이너 워크플로우용. JS 빌드와 무관.
- **누끼 자동화** — `spriteLoader.ts` 의 `removeBackgroundFlood`는 흰 배경 PNG 가정. 다른 배경색 에셋 추가 시 동작 안 함 → 발주 시 흰 배경 명시.
- **Walk cycle 정렬** — 4프레임 walk sheet의 발 위치를 균일 캔버스 bottom-center 로 맞춰 미끄러짐 방지. 수직 점프 모션은 별도 처리 필요.
- **저장 마이그레이션** — `useSaveStore`는 v7. 신규 필드 추가 시 `persist` migrate 함수 보강 권장.
- **`granite.config.ts:permissions: []`** — 추가 권한 없이 게임 동작. 광고/IAP 외 권한 요구 시 명시 필요.
- **폰트 외부 의존** — Google Fonts (Press Start 2P + Gugi). 오프라인/내부망 배포 시 sub-set 자체 호스팅 권장.

---

문의/질문은 원 작성자에게 이슈/메모로 전달 부탁드립니다. 즐거운 인수인계 되세요!
