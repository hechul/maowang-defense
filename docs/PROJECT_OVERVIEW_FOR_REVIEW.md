# 마왕 디펜스 — 프로젝트 종합 개요 (외부 피드백용)

> **목적**: 이 문서를 GPT/외부 리뷰어에게 던져 게임의 현재 상태를 한눈에 파악하고 피드백 받기 위한 자료다.
> 게임은 **앱인토스(WebView) 출시 목표**의 모바일 세로형 카드 + 디펜스 + 로그라이크 하이브리드.
> "마왕이 되어 운명의 카드로 어둠의 군세를 소환해 침공하는 용사들로부터 마왕성을 지키는" 컨셉.
>
> 작성일: 2026-05-01
> 버전: Phase 5 (5차 고도화 완료, 출시 후보)

---

## 1. 프로젝트 정체성

### 1.1 핵심 컨셉
- **카드 기반 자동 디펜스 로그라이크**
- 사용자 = 마왕 (1인칭 시점), 적 = 침공하는 용사 파티
- 좌측 마왕성, 우측 적 진영, 1차원 횡방향 진군 (모바일 세로형)
- 한 런 ≈ 20~30분, "다시 도전" 1탭 즉시 재시작

### 1.2 장르 위치
| 영감 | 차용 요소 |
|---|---|
| Vampire Survivors | 자동 전투 + 60초 사이클 + 도감 + 빌드 다양성 |
| Brotato | 카드(상점) 픽 → 자동 전투 → 다음 라운드 |
| Slay the Spire | 분기 카드 / 빌드 컨셉 / 유물 / 보스 패턴 |
| Hades | 메타 진행(영혼강화) + 마왕 캐릭터 |
| 카이로소프트 | 도트 + 따뜻한 어둠 톤 + "한 턴만 더" 중독성 + 시즌 한정 / 인테리어 |

### 1.3 차별점
- **"운명의 카드"** — 카드 펼치기는 명시적으로 슬롯/리롤이 아닌 "어둠을 소환하는 의식"
- 자동 전투 + 능동 개입(Rally / 어둠의 손 / 필살기) 균형
- 메타 4중 진행 (영혼강화 / 마왕 강화 / 빌드 칭호 / 적 도감 조각) — 사용자가 항상 진행 중인 무언가가 있음

### 1.4 앱인토스 검수 정책 준수
- 슬롯/릴/스핀/잭팟/배팅/카지노 등 금지어 사용자 노출 0건 (코드 grep 검증)
- 확률 가중치 코드 명시 (`SPIN_POOL`, 시너지 임계값 등)
- 광고/IAP는 mock 처리 (실제 토스 SDK 미연동)

---

## 2. 파일 구조

```
maowang-defense/
├── package.json                     (Vite + React + TS + Zustand + AIT SDK)
├── vite.config.ts
├── tsconfig.json
├── index.html                       (Google Fonts: Press Start 2P + Gugi)
├── public/sprites/                  (PNG 141개 — 캐릭터/효과/UI/타일)
└── src/
    ├── main.tsx                     (root render + SDK init + 스프라이트 preload)
    ├── App.tsx                      (라우팅: 13개 화면 lazy import)
    ├── vite-env.d.ts
    ├── styles/
    │   └── global.css               (카이로 컬러 토큰 + 폰트 + safe-area)
    ├── audio/
    │   └── AudioEngine.ts           (Web Audio API 칩튠 BGM 9종 + SE)
    ├── sdk/
    │   └── AitBridge.ts             (앱인토스 mock — 광고/리더보드/푸시/공유)
    ├── store/
    │   └── useSaveStore.ts          (Zustand persist v4 — 영혼석/스킬/도감/업적/IAP/접근성/빌드칭호/조각/마왕강화/인테리어)
    ├── game/
    │   ├── GameEngine.ts            (4052줄 — 메인 게임 루프 + 모든 시스템)
    │   ├── missionTracker.ts        (일일 미션 진행도 + 업적 + 미션 완료 큐)
    │   ├── rendering/
    │   │   ├── palette.ts           (마스터 32색 + amber/cream 카이로 톤)
    │   │   ├── pixelArt.ts          (도트 sprite 빌더)
    │   │   └── spriteLoader.ts      (PNG cache + sequence + sheet)
    │   └── data/                    (모든 게임 데이터 JSON처럼 분리)
    │       ├── monsters.ts          (1성 10종 + 2/3성 진화, SPIN_POOL 가중치)
    │       ├── heroes.ts            (8종 — apprentice/swordsman/archer/mage/spear/rogue/shield/healer)
    │       ├── bosses.ts            (5종 — captain/archmage/saint/king/priest)
    │       ├── relics.ts            (30종 영구 효과)
    │       ├── synergies.ts         (8종 — magic/undead/tank/mob/rage/inferno/fulldark/lifescream)
    │       ├── events.ts            (5종 랜덤 이벤트 — merchant/blessing/bonus/trap/duel)
    │       ├── challenges.ts        (6종 도전 모드 — modifier 기반)
    │       ├── seasons.ts           (12개월 시즌 + demonSkin 스킨 토큰)
    │       ├── skilltree.ts         (영혼강화 9종)
    │       ├── missions.ts          (일일 미션 풀 8종)
    │       ├── achievements.ts      (업적 14종)
    │       ├── strata.ts            ★ 던전 층 7층 (Phase 5 신규)
    │       ├── builds.ts            ★ 빌드 컨셉 9종 + 진행도 측정 (Phase 5 신규)
    │       ├── demonLines.ts        ★ 마왕 대사 30+종 (Phase 5 신규)
    │       ├── demonPowers.ts       ★ 마왕 강화 8종 (Phase 5 신규)
    │       ├── edicts.ts            ★ 일일 칙령 5종 (Phase 5 신규)
    │       ├── riskCards.ts         ★ 리스크 카드 5종 + 분기 카드 5종 (Phase 5 신규)
    │       ├── interior.ts          ★ 인테리어 4카테고리 14종 (Phase 5 신규)
    │       └── products.ts          (IAP 상품 5종)
    └── ui/
        ├── components/
        │   ├── IntroCutscene.tsx    (3프레임 컷씬, skippable)
        │   ├── AttendanceModal.tsx  (7일 출석)
        │   ├── StarterPackModal.tsx (스타터팩 노출)
        │   └── LoadingScreen.tsx    (Suspense fallback)
        └── screens/
            ├── TitleScreen.tsx              (메인 메뉴 + 챕터 진행도 + 마왕 강화 + 칙령)
            ├── GameScreen.tsx       (2198줄 — Canvas + HUD + 모달 통합)
            ├── ResultScreen.tsx     (런 결과 + 빌드 칭호 + 마왕 코멘트)
            ├── SkillTreeScreen.tsx  (영혼강화 9종)
            ├── BestiaryScreen.tsx   (도감 + 빌드 가이드 + 조각 진행도)
            ├── AchievementsScreen.tsx
            ├── LeaderboardScreen.tsx
            ├── ChallengesScreen.tsx
            ├── MissionsScreen.tsx
            ├── ShopScreen.tsx       (IAP)
            ├── InteriorScreen.tsx   ★ 마왕성 꾸미기 (Phase 5 신규)
            ├── PrivacyScreen.tsx    (검수 §운영)
            └── SupportScreen.tsx    (고객 문의)
└── docs/
    ├── QA_REPORT.md                          (60+ QA 항목 §3-A~§3-N)
    ├── GAME_DESIGN_OVERHAUL.md               (5차 고도화 마스터 플랜)
    ├── APP_IN_TOSS_RELEASE_CHECKLIST.md
    ├── CHANGELOG_AUTO_QA.md
    ├── FIRST_3_MINUTES_UX_REVIEW.md
    ├── MANUAL_QA_SCENARIOS.md
    ├── POLICY_RISK_AUDIT.md
    └── PROJECT_OVERVIEW_FOR_REVIEW.md        ★ (이 문서)
```

총 라인 수:
- `GameEngine.ts`: 4052줄 (단일 파일에 모든 게임 로직)
- `GameScreen.tsx`: 2198줄 (UI + 모달 + HUD)
- `useSaveStore.ts`: 455줄 (persist v4)

---

## 3. 게임 플레이 구조

### 3.1 전체 흐름
```
인트로 컷씬 (5.4s, skip)
  ↓
타이틀 (영혼석 + 챕터 + 마왕강화 + 오늘의 칙령)
  ↓
[전투 시작] ─────────────────────┐
  ↓                              │
게임 진행 (1런 20~30분)           │
├─ 카드 펼치기 (마력 100 / 14초)  │
├─ 카드 3장 → 픽 (5런까지 paused)│
├─ 몬스터 자동 전투               │
├─ 5wave마다 보스 + 분기 카드     │
├─ wave 클리어 시 25% 이벤트 / 75% 유물 │
└─ 마왕성 HP 0 → ResultScreen ───┘
  ↓
영혼석 적립 + 빌드 칭호 + 다음 강화 추천
  ↓
[다시 도전] (1탭) → 게임 시작 루프
  ↓
[메뉴] → 영혼강화 / 도감 / 미션 / 도전 / 인테리어 / 상점 / 리더보드
```

### 3.2 핵심 행동 (사용자 인터랙션)
| 행동 | 입력 | 효과 |
|---|---|---|
| 카드 펼치기 | 하단 큰 버튼 / Space | 마력 100 소비 → 3장 reveal |
| 카드 픽 | 카드 탭 / Click | 몬스터 즉시 소환 + 빌드 stats |
| 카드 잠금 | 카드 아래 🔒 50 | 다음 펼치기에 1슬롯 유지 (마력 -50) |
| Rally(돌격) | 화면 탭 / Q | 1.5초 몬스터 가속 + ATK +20% |
| 어둠의 손 | 화면 1초 장탭 | 가장 가까운 적 0.7초 정지 (마력 30) |
| 필살기 | 우하단 버튼 / E | 게이지 100% 시 광역기 (3종 순환) |
| AUTO/속도 | 토글 버튼 | 자동 픽 + 시간 가속 |
| 일시정지 | ⏸ / Esc | 메뉴 (포기/속도/AUTO/접근성) |

### 3.3 5층 루프 위계
```
Micro (~14초): 마력 충전 → 카드 펼치기 → 픽 → 소환 → 처치 콤보
Meso (1~2분): wave 클리어 → 마력 +50 / 영혼석 +5 → 25% 이벤트 / 75% 유물
Macro (5분): 보스 wave (W5/10/15/20/25+) → 페이즈 1/2 패턴 → wave-break
Meta (20~30분/런): 사망 → ResultScreen → 영혼강화 → 다시 도전 → 챕터 W25/50/100
Daily: 출석 7일 cycle / 미션 3종 / 친구 초대 / 시즌 / 일일 칙령
```

---

## 4. 시스템 인벤토리 (모든 게임 데이터)

### 4.1 몬스터 (사용자 카드)
- 1성 10종 (기본 SPIN_POOL): slime, goblin, skel, zombie, witch, orc, imp, mimic, mino, lich
- 2성 진화: kslime, gobw, sknt, zomk, dwitch, orcb, devil, gmimic, minok, dlich
- 3성 진화: slord, ggen, awitch, owar (slime/goblin/witch/orc 라인 최종)
- 태그: tank/melee/magic/undead/zombie/dark/fire/beast/orc/mob/support/brute/holy
- 특수 능력: aoe / knockback / revive / mpGen / auraBuff / dot

### 4.2 적 (용사 hero)
- 8종 — apprentice(W1+) / swordsman(W2+) / archer/spear(W3+) / mage/rogue(W4+) / shield(W6+) / healer(W8+)
- wave scl: `1 + (wave-1) * 0.085` (W5=1.34, W10=1.77, W20=2.36)

### 4.3 보스 (5wave마다)
| Wave | ID | 특수 |
|---|---|---|
| 5 | captain | 단순 피통 (학습용) |
| 10 | archmage | range 100 마법 |
| 15 | saint | bossHeal range 80 (1초 텔레그래프) |
| 20 | king | invuln 2s/9s (페이즈 2 시 차단) |
| 25+ | priest | castleStrike 7s / -120 dmg (1초 텔레그래프) |

### 4.4 시너지 (8종)
- magic / undead / tank / mob (4 기본)
- rage(orc+beast) / inferno(fire) / fulldark(dark) / lifescream(undead+zombie)

### 4.5 유물 (30종)
- reaper/vault/mask/hourglass/pact/heart/inferno/crown/tomb/dice/freeze/fang/surge/fate (1차 14종)
- titan/wrath/swarm/sprint/echo/bloodmoon/iron/wisdom/tide/razor/abyss/greed/nightfall/hex/oracle/serpent (2차 16종)

### 4.6 이벤트 (5종)
- merchant(epic 즉시 소환 mp200) / blessing(전 회복) / bonus(다음 wave 마력 ×2) / trap(-100 HP / +50 영혼석) / duel(엘리트 보스 +150)

### 4.7 챌린지 모드 (6종)
- arcane(마법 풀만) / silent(spinCost ×2 + mpRegen ×0.5) / weakling(적 HP -50%) / swift(적 spd/atkSpd ↑) / minimal(maxMonsters 5) / trial(영구강화 비활성)

### 4.8 영혼강화 (9종 / Skill Tree 3트리)
| 트리 | 노드 |
|---|---|
| 지배 (rule) | castleHp / startMp / spinCost |
| 소환 (summon) | monAtk / monHp / startMon |
| 파멸 (doom) | ultiDmg / ultiCharge / aura |

### 4.9 ★ 던전 층 (7층 + cycle)
1. 봉인의 입구 (W1~5) — 학습
2. 잊혀진 묘지 (W6~10) — 언데드 boost / 적 부활
3. 화염 전당 (W11~15) — 화염 빌드 보상
4. 광기의 미궁 (W16~20) — RNG 모디파이어
5. 신의 영역 (W21~25) — 보상 ×1.3
6. 영원의 겨울 (W26~30) — 5초마다 적 동결
7. 심연의 법정 (W31~35) — 적/마왕성 동시 -10%
- W36+ cycle (1~5층 반복)
- 층별 BGM 5종 + 배경 그라디언트 + heroPoolBoost

### 4.10 ★ 빌드 컨셉 (9종)
좀비 군단 / 화염 폭주 / 마법 학파 / 슬라임 왕국 / 언데드 군주 / 야수의 분노 / 어둠 신비주의 / 탐욕의 길 / 폭군의 일격
- 각 빌드 진행도 측정(tagPicks/relicAny/synergyActiveProcs/ultiUses/bossKills)
- 100% 달성 시 영혼석 reward + 영구 칭호 + 첫 달성 +100 보너스

### 4.11 ★ 마왕 강화 (8종 — 누적 보스 처치 영구)
- 1보스: 시작 마력 +30
- 5보스: 마왕성 HP +5%
- 10보스: 필살기 충전 +10%
- 20보스: 카드 비용 -3%
- 30보스: Rally 쿨 -0.3초
- 50보스: 위급 펼치기 +1회
- 75보스: 부활 HP 60%
- 100보스: 시작 마력 +50 + 마왕성 +10% + 필살기 +10% (통합)

### 4.12 ★ 일일 칙령 (5종 — 날짜 결정론)
- 어둠의 시간 (다크 시너지 ×2)
- 약자의 심판 (적 HP -20% / 마왕성 -30%)
- 황금의 비 (영혼석 +50% / 적 ATK +30%)
- 부활의 밤 (tomb 자동 / 진화 4마리)
- 운명의 변동 (reroll 무제한)
- 모두 영혼석 +20% 추가

### 4.13 ★ 분기 카드 (5종 — 5wave마다)
화염의 길 / 언데드의 길 / 방벽의 길 / 마법의 길 / 폭도의 길
- 다음 5wave 동안 해당 태그 50% 강제 등장 + buff (atk/hp/spd)

### 4.14 ★ 리스크 카드 (5종 — wave≥5 + 15% 확률)
- 피의 계약 (마왕성 -10% HP / 전설 카드)
- 죽음의 계약 (아군 1 희생 / epic 언데드)
- 침입자 유인 (적 3 추가 / 강한 카드)
- 마력 번제 (마력 -100 / epic 화염)
- 혼돈의 부름 (HP -15% + 마력 -50 / 전설)

### 4.15 ★ 인테리어 (4카테고리 14종)
- 간판: 나무 / 은빛 / 황금(stoneMul) / 용
- 깃발: 검은 / 자줏빛(startMp) / 불사조
- 오라: 기본 / 핏빛(castleHp) / 호박 / 심연
- 마법진: 기본 / 룬 / 공허
- 영혼석 0 ~ 4000 sink

### 4.16 ★ 적 도감 조각 (영구 약화)
- 적 hero 처치 시 +1 조각 누적
- 100 도달 → baneActive → 해당 hero 매번 -10% (HP/ATK)

### 4.17 일일 미션 (8종 풀 → 매일 3개)
kill100 / evolve3 / combo30 / jackpot1 / boss2 / syn3 / wave10 / spin20

### 4.18 업적 (14종)
firstBlood/waveMaster/waveLegend/infinity/evolved/ascended/combo20/combo50/jackpot/synergyAll/relicHoard/allBosses/chapter1/chapter2/chapter3

### 4.19 시즌 (12개월)
월별 stoneMul + demonSkin (인테리어와 함께 마왕 외형 변화)

### 4.20 출석 + 친구 초대
- 출석 7일 cycle: 10/20/30/50/75/100/200 영혼석
- 공유 200/일

### 4.21 IAP (5종 mock)
starter_pack / remove_ads / stones_small / stones_medium / season_pass

### 4.22 접근성
- reduceMotion (shake/flash/slowMo/hitStop 감소)
- largerText (root font-size 14→17)
- haptic toggle

---

## 5. 코드 아키텍처

### 5.1 GameEngine.ts (단일 클래스, 4052줄)
- `start(challengeId)` / `dispose()` / RAF loop
- 상태: castleHp / mp / wave / monsters[] / heroes[] / projectiles[] / particles[] / damageTexts[] / banners[] / effects[]
- 메서드: `beginSpin / chooseCard / lockCard / rerollChoices / rally / shadowGrasp / castUlti / acceptRevival`
- 페이즈 매트릭스: paused / spinChoices / slot.active / pendingRelicChoices / pendingEvent / pendingRevival / waveBreakActive / pendingBranchChoices / tutorialQueue
- snapshot(): UI polling용 (50ms — Phase 5 패치)

### 5.2 React UI 흐름
- App.tsx — `screen` state로 13화면 전환
- GameScreen.tsx — Canvas + 50ms snapshot polling + 모달 z-index 위계 (튜토리얼 250 > 부활 200 > 일시정지 100 > wave-break 95 > 유물 40)
- 키보드 단축키 (PC): Space / Q / E / Esc

### 5.3 상태 저장 (Zustand persist v4)
```ts
{
  // 자원
  soulstones, totalStones, shards, runs, bestWave, totalKills, lastPlayedAt
  // 영구 강화
  skills: Record<SkillId, number>
  // 컬렉션
  discoveredMonsters[], discoveredHeroes[], discoveredBosses[], discoveredRelics[]
  achievements[], bossesKilled[], challengesDone[]
  // 메타 진행
  totalBossKills              ★ (마왕 강화)
  buildTitles[]               ★ (빌드 칭호)
  heroFragments               ★ (적 조각)
  heroBaneActive[]            ★ (적 약화 활성)
  ownedInteriors[]            ★ (인테리어 보유)
  equippedInteriors           ★ (인테리어 장착)
  // 일일
  daily: { date, missions[] }
  attendance: { streak, lastDate, rewardsClaimed }
  social: { sharesCount, lastShareReward }
  // 결제 / 옵션
  iap: { purchasedSkus[], adsRemoved, starterPackShown, starterPackPurchased }
  tutorialSeen[]
  accessibility: { reduceMotion, largerText, haptic }
}
```
- migrate v4: Number.isFinite 검증 + 기본값 보강

### 5.4 렌더링
- 단일 360×640 Canvas 2D
- 스프라이트: PNG 우선 + 절차적 fallback (`pixelArt.ts` 픽셀 그리드 빌더)
- 스프라이트 시트 처리: 4프레임 walk + multi-row 진화 라인
- 효과: hitSpark / summonCircle / evolve / death / coinFlow / aoeRing
- 이펙트 레이어: edgeRing / screenFlash / banners / particles (250개 cap)

### 5.5 사운드 (AudioEngine.ts)
- Web Audio API 자체 칩튠 합성
- BGM 9종 (title/battle/boss/result + stratum 5종)
- SE 다수 (tone/noise/주사위 합성)

---

## 6. 적용된 QA 패치 (60+ 항목)

### 6.1 §3-A 첫 3분 UX 개선 (HIGH 5 + MEDIUM 6 + LOW 5)
- H-1 카드 모달 동안 게임 정지 (5런까지)
- H-2 신규 출석 모달 스킵
- H-3 controlRow에 AUTO/속도 노출 + ⏸ 아이콘
- H-4 첫 카드 픽 시 정보량 다이어트
- H-5 legendary 페널티 항상 표시
- M-1 long-press 충돌 완화 + 카드 잠금 별도 버튼
- M-2 부활 패키지화 (50% HP + 적 3초 freeze + 마력 풀 + 무료 카드)
- M-3 첫 보스 후 wave-break 강제
- M-4 마력 부족 + 적 침투 시 컨텍스트 힌트
- M-5 첫 보스 텔레그래프 화면 중앙 강조
- M-6 첫 사망 시 영혼석 부족해도 다음 목표 표시
- L-1~L-5 (이벤트 거절 약화 / 첫 보스 마일스톤 / 할인 표시 / AUTO 카운트다운 / 부활 카운트다운)

### 6.2 §3-B 동시성/상태기계 버그 (8 P0/P1 + 5 LOW)
- BUG-001 튜토리얼 paused 가드 (다른 모달 활성 시 paused 유지)
- BUG-002 부활 광고 race 방지 (loading 중 자동 종료 timer 일시정지)
- BUG-003 wave-break + 유물 직렬화
- BUG-004 ⏸ 모달 활성 시 비활성
- BUG-005/006 emergency 처리 + 부활 시 리셋
- BUG-007 visibilitychange 자동 paused
- BUG-008 confirm() → 자체 React 모달
- BUG-018 chooseCard 진화 paused 보호
- BUG-009/012/013/016/017 (인트로 onDone 가드 / AUTO toggle paused / 챌린지 잠금 / 출석 backdrop / addStones 음수)

### 6.3 §3-C 튜토리얼/온보딩
- tut_combo5/relic/synergy/ulti_ready/rally/boss_phase2 본문 단축
- tut_first_pick 신규 (첫 카드 픽 직후)
- tut_hp_danger 신규 (HP<20% 첫 도달)

### 6.4 §3-D 레벨 디자인
- LD-A 14마리 클러스터 분산 (6마리/줄)
- LD-B 라인 가시성 (alpha 0.18 + 🛡⚔🏹 라벨)
- LD-C 방어선 위치 보정 (x=80→110)
- LD-D 챕터별 배경 색조 (이후 §3.1 strata로 대체)
- LD-E 적 진영 시각 매스 강화

### 6.5 §3-E 전투 밸런스
- B-1 페이즈 2 + invuln 동시 회피 불가 → invuln 차단
- B-2 healer/shield/rogue 첫 만남 학습 + healer 회복 텔레그래프
- B-3 captain 첫 보스 폭발 -200/5s → -100/7s
- B-4 6런째 보너스 종료 안내
- B-5 priest castleStrike 1초 텔레그래프
- B-6 emergency 발동 조건 완화
- B-7 6런 이후 카드 슬로모 (slowMoT 1.5)

### 6.6 §3-F 조작감/카메라/피드백
- F-1 snap polling 100→50ms
- F-2 long-press 진행 ring (RAF)
- F-3 ulti disabled opacity 0.55 + grayscale
- F-4 강한 shake 쿨다운 무시
- F-5 적 spawn 우측 빨간 edge ring
- F-6 AOE 시각화 (0.25초 ring)
- F-7 cap 14 도달 시 카드 영역 라벨

### 6.7 §3-G UI/UX
- U-1 보스 HP % 표시
- U-2 HP <50% % 우선 라벨
- U-3 controlRow gap + 속도 OFF 색
- U-4 카드 잠금 버튼 강화
- U-5 PauseQuit 빨간 점선
- U-6 mp/HP 라벨 즉시값

### 6.8 §3-H + §3-I 퀘스트/목표 안내
- Q-1 게임 HUD 활성 미션 1줄
- Q-2 미션 완료 banner
- Q-3 첫 wave 클리어 안내
- Q-4 보스 wave 사전 안내
- Q-5 챌린지 라벨
- Q-6 진화 임박 칩
- QO2-A bossActive 시 좌측 라벨 정리
- QO2-B 미션 완료 수령 경로 명시
- QO2-C 5런 신규 메뉴 토스트
- QO2-D 챌린지 진입 modifier banner
- QO2-E 일일 미션 미수령 도트

### 6.9 §3-J 성장/보상/경제
- E-1 파편 UI 노출 숨김 (사용처 미구현)
- E-2 신규 5런 rank 1=70%, rank 2=85% 추가 할인
- E-3 챌린지 재도전 10% 보상
- E-4 spinCost 90→60, aura 200→150
- E-5 startMon max 3 + 실제 spawn 코드 추가 (이전 데드 스킬)

### 6.10 §3-K 접근성/가독성
- A-1 largerText 활성화 (이전 데드 옵션) — root font-size + Press Start 2P/Gugi
- A-2 카드 등급 텍스트 라벨 (희귀/영웅/전설) — 색맹 보조
- A-3 reduceMotion 확장 (slowMo/hitStop)
- A-4 secondary 텍스트 대비 격상

### 6.11 §3-L 코어 루프/재미
- C-1 W10/15/20 중간 마일스톤 +100/+200/+300
- C-2 신규 5런 카드 reroll 1회 무료
- C-3 도감 진행도 보상 (5/10/15/20 → 50/100/200/500)

### 6.12 §3-M 내러티브/몰입
- N-1 ResultScreen "패배" → "잠시 봉인" + 회차
- N-2 보스 dialog largerText 시 ×1.5
- N-3 챕터 클리어 마왕 반응
- N-4 부활 모달 reframe ("어둠의 제물")

### 6.13 §3-N 입력 장치
- I-1 PC 키보드 단축키 (Space/Q/E/Esc)
- I-2 카드 잠금 버튼 height 28px+
- I-3 잠긴 카드 라벨 (펼치기 버튼 sub)
- I-4 focus outline + canvas cursor pointer

---

## 7. 5차 고도화 (게임성/작품성 강화)

### 7.1 던전 층 시스템
- 7층 + W36+ cycle, 층별 색조/BGM/heroPool

### 7.2 빌드 컨셉 9종 + 칭호 영구 적립
- 한 런 stats 추적 → dominantBuild 100% 시 영혼석 reward + 첫 달성 +100

### 7.3 마왕 캐릭터 시스템
- 좌상단 마왕 초상 + 표정 4종 + 말풍선
- 30+종 대사 (시작/첫픽/진화/시너지/보스등장/페이즈2/처치/HP위급/사망/층진입)
- ResultScreen 마왕 직접 코멘트 (5단계 분기)
- 마왕 외형 챕터별 (base/crowned/lord/mythic) + 인테리어 + 시즌 스킨 우선순위

### 7.4 마왕 강화 시스템 (8종)
- 누적 보스 처치 영구 적립
- start() 시 자동 합산 적용 (mp/HP/필살기/spinCost/rallyCd/emergency/부활HP)

### 7.5 적 도감 조각 시스템
- 처치 +1, 100 도달 → 영구 -10% baneActive
- BestiaryScreen heroes 탭에 progress bar + 호박 테두리

### 7.6 일일 칙령 (5종)
- 날짜 결정론 셔플 + start() 자동 적용

### 7.7 분기 카드 + 리스크 카드
- 분기: 5wave마다 강제 모달 (5종 중 1)
- 리스크: 15% 확률 1슬롯 교체 (5종)

### 7.8 카이로 감성
- 컬러: amber/cream 추가, splash 호박 글로우
- 폰트: Press Start 2P + Gugi (Google Fonts)
- BGM: stratum별 5종 + 보스 처치 후 stratum 트랙 복귀

### 7.9 인테리어 시스템
- 4카테고리 14종 + 영혼석 sink + 마왕 외형 즉시 반영

### 7.10 시즌 한정 스킨
- 12개월 demonSkin + 인테리어와 우선순위 결합

---

## 8. 검증 / 빌드 상태

### 8.1 빌드 결과 (2026-05-01)
| 명령 | 결과 |
|---|---|
| `npm run lint` (tsc --noEmit) | ✅ 0 에러 |
| `npm run build` (tsc + vite) | ✅ 89 modules, ~667ms |

### 8.2 번들 사이즈 (gzip)
| 청크 | 크기 |
|---|---|
| react | 45.26 kB |
| GameScreen | 42.04 kB |
| index | 24.59 kB |
| ResultScreen | 4.54 kB |
| BestiaryScreen | 3.97 kB |
| relics | 6.35 kB |
| 기타 lazy chunks | 합 ~10 kB |

### 8.3 정책 / 검수
- 사용자 노출 금지어 grep ✅ 0건
- 확률 가중치 코드 명시 ✅
- 광고/IAP mock — 실 SDK 미연동
- 결제 환불 안내 ShopScreen에 명시
- 개인정보 처리방침 + 고객 문의 메뉴 OK

---

## 9. 알려진 미해결 / 후속 작업

### 9.1 데이터/시스템 측면
- 영혼석 후반 sink 부재 (모든 강화 max 도달 후 사용처 부족 — 인테리어로 일부 완화)
- 파편(shards) 사용처 미구현 (UI 숨김 처리)
- 시즌 한정 칭호/한정 보스 미구현
- 챌린지 별점 시스템 (W15/20/25 단계 보상) 미구현

### 9.2 UX 측면
- ⏸ 위치 옵션화 (한 손/왼손잡이) 미구현
- 어둠의 손 발동 시간 옵션화 (운동 약자 보조) 미구현
- 색맹 모드 전용 토글 미구현 (라벨로 일부 보강)

### 9.3 컨텐츠 측면
- 보스 6종+ 미정의 (priest 이후 cycle만)
- 도감 → 인게임 효과 연결 약함 (조각 시스템으로 부분 보강)
- 시즌 한정 스킨 외 라이브 운영 컨텐츠 부재

### 9.4 인프라
- 실 디바이스 FPS/메모리 측정 안 됨 (정적 분석만)
- 30분 연속 플레이 메모리 누수 검증 X
- 앱인토스 실 SDK 미연동 (mock만)

---

## 10. 외부 리뷰어에게 요청

### 10.1 게임성 관점
- "한 판 더" 중독성이 충분한가?
- 빌드 9종이 실제로 다양한 플레이를 만드는가, 아니면 표면적인가?
- 던전 층 7개 + W36+ cycle이 단조롭지 않은가?
- 자동 전투 + 능동 개입(Rally/어둠의손/필살기)의 균형이 적절한가?

### 10.2 작품성 관점
- 카이로 감성이 효과적으로 전달되는가? (어두운 보라 톤이 카이로의 따뜻함과 충돌하진 않는가?)
- 마왕 캐릭터 시스템이 몰입에 기여하는가?
- ResultScreen 마왕 코멘트 5단계가 자연스러운가?

### 10.3 코드 구조 관점
- GameEngine 4052줄 단일 파일 — 유지보수 가능한 수준인가?
- 모듈 분리 권장 (UnitSystem / SpinSystem / WaveSystem / RenderSystem)?
- Zustand store 30+ 필드 — 분리 필요?
- React 50ms polling vs 직접 subscribe 어느 쪽이 나은가?

### 10.4 출시 전 보강 우선순위
- 어떤 것을 먼저 손봐야 임팩트가 가장 큰가?
- 현재 기능 중 빼야 할 것이 있는가? (오버엔지니어링)
- 사용자 첫 30분 동안 가장 약한 지점은?

### 10.5 모바일 특화
- 360×640 세로형 한 손 조작이 효과적인가?
- 카드 모달 바닥 / canvas 위 / 좌측 마왕 / 우측 적 진영 레이아웃이 시선 분산을 일으키지 않는가?
- 정보 밀도가 모바일에 적합한가?

---

## 11. 빠른 시작 (리뷰어용)

```bash
cd maowang-defense
npm install
npm run dev
# → http://localhost:5173/
```

DevTools → Device Mode → iPhone SE (375×667) 또는 Galaxy S20 권장.
신규 유저 흐름 재현:
```js
localStorage.clear(); location.reload();
```

---

## 12. 핵심 코드 진입점 (리뷰어 참조)

| 시스템 | 파일 / 라인 |
|---|---|
| 게임 루프 | `src/game/GameEngine.ts:loop` |
| 카드 펼치기 | `src/game/GameEngine.ts:beginSpin` |
| 카드 픽 | `src/game/GameEngine.ts:chooseCard` |
| 던전 층 진입 | `src/game/GameEngine.ts:startWave` (stratum 분기) |
| 마왕 대사 | `src/game/GameEngine.ts:speakDemon` |
| 빌드 통계 | `src/game/data/builds.ts:dominantBuild` |
| 마왕 강화 | `src/game/data/demonPowers.ts:aggregatedDemonPower` |
| 일일 칙령 | `src/game/data/edicts.ts:todayEdict` |
| 인테리어 보너스 | `src/game/data/interior.ts:aggregatedInteriorBonus` |
| 메인 HUD | `src/ui/screens/GameScreen.tsx` |
| 결과 화면 | `src/ui/screens/ResultScreen.tsx` |
| 도감/빌드 칭호 | `src/ui/screens/BestiaryScreen.tsx` |
| 인테리어 | `src/ui/screens/InteriorScreen.tsx` |
| 저장 | `src/store/useSaveStore.ts` |
| QA 기록 | `docs/QA_REPORT.md` |
| 고도화 마스터 플랜 | `docs/GAME_DESIGN_OVERHAUL.md` |

---

이 문서를 기반으로 GPT 또는 외부 리뷰어가 게임의 현재 상태·강점·약점을 한 번에 파악할 수 있다.
피드백 시 §10의 5개 관점 중 어느 영역에 집중하고 싶은지 명시하면 깊이 있는 리뷰 가능.
