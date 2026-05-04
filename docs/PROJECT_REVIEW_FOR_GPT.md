# 마왕 디펜스 (Maowang Defense) — 외부 피드백용 프로젝트 명세

> 출시 전 GPT Pro 등 외부 검토자에게 게임 디자인/구현 상태를 공유하기 위한 종합 문서.
> 모바일 앱인토스(Apps in Toss) WebView 제출을 목표로 한 React + Canvas 카드 디펜스 로그라이트.

---

## 0. 한 문장 요약

플레이어는 **마왕** 입장에서 카드를 펼쳐 몬스터를 소환해 침공하는 용사들을 막는다.
자동 전투 + 카드 의사결정 + 4종 능동 조작(Rally / 어둠의 손 / 필살기 / 카드 잠금)으로
짧은 1런(평균 3~7분, 최대 30웨이브 ≈ 12~15분) 안에 결정을 반복하는 로그라이트 디펜스.

---

## 1. 개발 스택

### 런타임
- **React 18.3 + TypeScript 5.5 + Vite 5.4**
- **Zustand 4.5 (persist middleware)** — localStorage 기반 영구 데이터
- **HTML5 Canvas 2D** — 360×640 모바일 portrait, RAF 게임루프
- **Web Audio API** — 5층(stratum)별 chiptune BGM + SFX (외부 라이브러리 없음)
- **`@apps-in-toss/web-framework` 2.0** — 광고/리더보드/푸시/공유 SDK (Mock fallback 포함)

### 자산
- 픽셀 PNG 스프라이트 + 절차적 fallback (`pixelArt.ts`)
- `MASTER_PAL` 팔레트 — 어둠/보라/핫핑크 톤 (마왕 컨셉)

### 디자인 타깃
- **앱인토스 WebView 360×640 portrait** (safe-area-inset 대응)
- 권장 디바이스: iPhone SE 2nd / Pixel 5 (저~중사양 기준)
- 60FPS 목표, 입자 cap 250

---

## 2. 디렉터리 구조 (요점)

```
src/
├── main.tsx               # entry
├── App.tsx                # 화면 라우팅 (lazy load)
├── vite-env.d.ts
├── audio/
│   └── AudioEngine.ts     # Web Audio chiptune
├── sdk/
│   └── AitBridge.ts       # 앱인토스 SDK (Mock 포함)
├── store/
│   └── useSaveStore.ts    # zustand persist v5 + migrate (479 lines)
├── game/
│   ├── GameEngine.ts      # 메인 클래스 (4415 lines, 의도적 단일 클래스)
│   ├── missionTracker.ts
│   ├── data/              # 순수 데이터 (몬스터/유물/이벤트/...)
│   │   ├── monsters.ts    # MONSTERS dict + CARD_POOL 가중치
│   │   ├── heroes.ts      # 용사 정의 + heroPoolForWave
│   │   ├── bosses.ts      # 보스 (페이즈 2 / castleStrike / heal / invuln)
│   │   ├── synergies.ts   # 8종 시너지 (test+apply pure functions)
│   │   ├── relics.ts      # 유물 14+종
│   │   ├── builds.ts      # 빌드 컨셉 9종 + dominantBuild 산식
│   │   ├── strata.ts      # 던전 5층 (BGM + heroPoolBoost)
│   │   ├── challenges.ts  # 도전 모드
│   │   ├── events.ts      # 랜덤 이벤트 풀
│   │   ├── riskCards.ts   # 리스크 카드 + 분기 카드
│   │   ├── edicts.ts      # 오늘의 칙령 (일일 modifier)
│   │   ├── demonPowers.ts # 마왕 강화 (누적 보스 처치 unlock)
│   │   ├── interior.ts    # 마왕성 인테리어 (4 카테고리)
│   │   ├── achievements.ts
│   │   ├── missions.ts    # 일일 미션 풀
│   │   ├── skilltree.ts   # 영혼 강화 9종
│   │   ├── seasons.ts
│   │   ├── demonLines.ts  # 상황별 마왕 대사
│   │   └── products.ts    # IAP SKU 정의
│   ├── systems/           # 1차 분리된 순수 함수 모듈 (총 9개)
│   │   ├── OverlayController.ts  # 모달/일시정지 중앙 판단 + 큐
│   │   ├── CardSystem.ts          # 11개 함수 (cost/choices/lock/reroll/score/...)
│   │   ├── WaveSystem.ts          # 7개 함수 + 마일스톤
│   │   ├── EconomySystem.ts       # 영혼석 보상 산식
│   │   ├── CastleSystem.ts        # HP/MP/필살기 산식
│   │   ├── CombatSystem.ts        # 시너지 set + 단위 mul
│   │   ├── HeroStatsSystem.ts     # hero spawn 스케일링
│   │   ├── MonsterStatsSystem.ts  # 몬스터 spawn cap/스탯/dot
│   │   ├── DamageSystem.ts        # 방어/크리트/부활
│   │   └── BossSystem.ts          # 보스 페이즈 2 파라미터
│   └── rendering/
│       ├── palette.ts
│       ├── pixelArt.ts
│       └── spriteLoader.ts
└── ui/
    ├── debug/
    │   └── DebugOverlay.tsx       # dev 전용 30분 soak 계측
    ├── screens/
    │   ├── GameScreen.tsx         # 게임 화면 (2241 lines)
    │   ├── ResultScreen.tsx       # 작전 화면 (678 lines)
    │   ├── TitleScreen.tsx        # 진입 + 진행성 메뉴 잠금 해제
    │   ├── BestiaryScreen.tsx
    │   ├── SkillTreeScreen.tsx
    │   ├── MissionsScreen.tsx
    │   ├── AchievementsScreen.tsx
    │   ├── LeaderboardScreen.tsx
    │   ├── ChallengesScreen.tsx
    │   ├── InteriorScreen.tsx
    │   ├── ShopScreen.tsx
    │   ├── SupportScreen.tsx
    │   └── PrivacyScreen.tsx
    └── components/
        ├── LoadingScreen.tsx
        ├── StarterPackModal.tsx
        ├── AttendanceModal.tsx
        └── IntroCutscene.tsx
```

총 9,257 LOC (주요 파일 기준).

---

## 3. 게임 디자인 핵심 루프

### 3.1 1런 30~60초 흐름

1. **시작 (마력 200)** — 즉시 카드 1~2회 펼치기 가능
2. **카드 펼치기 (`cardChoices`)** — 비용 100 마력 (초반 3회 50% 할인)
   - 4% 트리플 발현 (jackpot → 모두 같은 카드)
   - 15% 리스크 카드 (페널티 + 강한 카드, wave≥5)
   - 50% 분기 카드 태그 가중 (활성 시)
3. **카드 선택 (`chooseCard`)** — 몬스터 소환 + 등급/태그 부수 효과 발동
4. **자동 전투 (RAF)** — 몬스터·hero·발사체·시너지·DOT 처리
5. **처치 → 마력 회복** + 콤보 + 시너지 갱신
6. **5웨이브마다 보스** — 페이즈 2 desperate (5/7초 카운트 → 마왕성 -100/-200)
7. **사망 시 부활(1회 한정)** — 광고 시청 후 50%/60% HP 복구

### 3.2 영구 진행 (메타)

- **영혼석 (소프트커런시)** — 런 종료 시 보상 (`computeSoulstoneReward`)
- **영혼 강화 9종** (`skills.castleHp / startMp / cardCost / monAtk / monHp / startMon / ultiDmg / ultiCharge / aura`)
  - 단계 5~10, 비용 곡선 `costMul × 0.85` after rank 4
  - 신규 5런 한정 rank 0~2 50/70/85% 할인
- **마왕 강화 (Demon Power)** — 누적 보스 처치로 unlock (1/5/10/20/30/50/75/100마리)
- **빌드 칭호** — 한 런에서 빌드 100% 달성 시 영구 (첫 달성 +100)
- **적 도감 조각** — hero별 100 도달 시 영구 -10% HP/ATK
- **인테리어** — 4 카테고리 (sign/flag/aura/circle) — 영혼석 비축 + 시작 마력 보너스
- **도전 모드 (Challenges)** — 클리어 시 영구 칭호 + 영혼석 다량
- **일일 미션 / 출석 / 칙령**

### 3.3 빌드 컨셉 9종

| ID | 이름 | 핵심 컨셉 |
|---|---|---|
| `zombie_legion` | 좀비 군단 | 죽지 않는 물량 (tomb 유물 + revive) |
| `flame_rampage` | 화염 폭주 | 광역 화염 + 필살기 ≥3회 |
| `magic_school` | 마법 학파 | 원거리 폭딜 + 마법 시너지 30회 발동 |
| `slime_kingdom` | 슬라임 왕국 | 탱킹 + 수량 (swarm 유물) |
| `undead_lord` | 언데드 군주 | 부활 + bloodmoon, 보스 2킬 |
| `beast_wrath` | 야수의 분노 | 빠른 처치 + sprint/wrath |
| `dark_mystic` | 어둠 신비주의 | dark 시너지 풀어둠 |
| `greedy_path` | 탐욕의 길 | 자원 → 자원 (greed/vault) |
| `tyrant_strike` | 폭군의 일격 | 필살기 6회 (crown/oracle) |

각 빌드는 `goal.tagPicks + relicAny + synergyActiveProcs + ultiUses + bossKills` 합산으로 진행도 측정.

### 3.4 시너지 8종 (`src/game/data/synergies.ts`)

```ts
magic       (≥2 magic)        → 마법 atk ×1.4
undead      (≥2 undead)       → 언데드 atk ×1.3
tank        (≥2 tank)         → 탱커 hp ×1.4
mob         (≥3 mob)          → 몹 spd ×1.3
rage        (≥2 beast+orc)    → 분노 atk ×1.5
inferno     (≥2 fire)         → 화염 atk ×1.6
fulldark    (≥3 dark)         → 어둠 모든 능력치 ×1.25
lifescream  (≥3 undead+zombie)→ 언데드/좀비 hp ×1.4 + spd ×1.2
```

`Synergy.test()` / `Synergy.apply()` 둘 다 pure function.
`CombatSystem.calculateUnitMul`이 단위별 합산 인자 산출 (mutation-free), GameEngine은 적용만.

---

## 4. 아키텍처 결정 사항

### 4.1 단일 GameEngine 클래스 (4,415 LOC)
- RAF + sub-step physics + canvas 2D 직접 그리기
- 의도적 모놀리스 — 분리 비용 > 분리 이득. 대신 **순수 산식만** systems/로 분리.

### 4.2 OverlayController (모달/일시정지 중앙 판단)
- 11종 OverlayKind: `none/tutorial/revival/pause/waveBreak/relicChoice/eventChoice/branchChoice/cardChoice/riskChoice/result`
- 우선순위 표 + sim-block 표
- `topOverlay()` / `activeOverlays()` / `canResume()` / `requestOpen()` (큐 기반)
- 5단계 도입 — 1차 read-side helper → 2차 큐 + open API → 3차 진입점 위임 → 4차 paused derive → 5차 cutscene/risk 명시
- `derivePaused(flags)` — 매 frame engine.paused를 단일 진실원에서 도출

### 4.3 CardSystem 분리 (11 함수)
- `calculateCardCost / pickCardCandidate / createCardChoices / applyCardLock / rerollCardChoices / chooseCardResult / computeCardPickEffects / shouldHaveRerollAvailable / shouldGrantEmergencyReveal / scoreCardChoices / calculateEvoNeed`
- 모두 pure (Math.random은 직접 호출 — 향후 주입 가능)
- GameEngine은 사이드 이펙트(사운드/햅틱/배너/spawnMonster)만 담당

### 4.4 9개 System 모듈 (총 분리)
| 모듈 | 함수 수 | 책임 |
|---|---|---|
| OverlayController | 8+ | 모달/일시정지 |
| CardSystem | 11 | 카드 의사결정 |
| WaveSystem | 7+상수 | spawn 간격/cap/엘리트/별점/마일스톤 |
| EconomySystem | 1 | 영혼석 보상 |
| CastleSystem | 4 | HP/MP/필살기 |
| CombatSystem | 2 | 시너지 + 단위 mul |
| HeroStatsSystem | 1 | hero spawn 스케일링 |
| MonsterStatsSystem | 3 | 몬스터 spawn cap/스탯/dot |
| DamageSystem | 3 | 방어/크리트/부활 |
| BossSystem | 1 | 페이즈 2 파라미터 |

---

## 5. 능동 조작 4종 (출시 전 피드백 반영)

### 5.1 카드 잠금 (`lockCard`)
- 카드 모달에서 🔒 버튼 → 마력 50 소모
- 다음 카드 펼치기에 첫 칸 유지 (빌드 잠가두기)

### 5.2 Rally (필드 짧게 탭)
- 모든 살아있는 몬스터에 1.5초간 spd ×1.5 / atk ×1.2
- 쿨다운 2초, 마왕 강화로 단축
- **피드백 강화**: 각 몬스터 위 황금 aoeRing 0.4초 + 황금 라인(가장 가까운 hero 향) + 발동 배너 매번 노출 + 비활성 사유(쿨다운/몬스터 부재) 즉시 표시

### 5.3 어둠의 손 (필드 1초 장탭)
- 가장 마왕성에 가까운 hero 0.7초 정지
- 마력 30 소모
- **피드백 강화**: 진행 ring 60% 도달 시 보라→골드 컬러 전환 + scale + boxShadow + 아이콘 🖐→✊→⛓ + 보스 패턴 차단(`castleStrike/bossHeal/invuln` <1.5s 임박) 시 "결정적 개입" 텍스트 + 추가 flash/shake/heavy haptic
- `SHADOW_GRASP_HOLD_MS = 1000` 상수화 — 향후 접근성 옵션 가능

### 5.4 필살기 (3변형 cycle)
- 변형 0: 어둠의 파동 — 모든 hero에 maxHp×30% (안정적)
- 변형 1: 지옥 소환진 — epic 몬스터 1체 즉시 + 화염 광역 (변수)
- 변형 2: 암흑 멸망 — 모든 hero 즉사 + 마왕성 자해 120 (일발역전)
- 처치당 게이지 +4 (보스 +30) × oracle 1.3 × demonPower
- **피드백 강화**: 버튼 좌상단 현재 변형 아이콘(🌊/🔥/💀) + 우상단 →다음변형 표시 + 충전 부족 시 "필살기 N% — 적 처치로 충전" 배너 + 발동 시 변형별 signature flashScreen + 변형명 배너

---

## 6. ResultScreen "작전 화면" 컨셉 (678 LOC)

단순 보상 화면이 아니라 **다음 판을 누르게 만드는 작전 화면**.

### 6.1 사망 원인 추정 (7단계 우선순위 `inferDeathCause`)
1. 보스에게 사망 (`diedDuringBoss`) → 보스명 + monAtk/ultiDmg 추천
2. 마왕성 순삭 (`castleDamageLast10s > maxHp×30%`) → castleHp
3. 힐러 미처치 (50% 미만 처치) → monAtk
4. 마력 부족 누적 (`lowMpStreaks > 30s`) → cardCost
5. 몬스터 수 부족 (`<3 + wave≥5`) → startMp
6. 5웨이브 못 넘김 → castleHp
7. 일반 시도 → monAtk

### 6.2 추천 강화 1개 (`recommendedUpgrade` resolver)
- 우선순위 후보열 순회 → 미Max + 영혼석 충분 채택
- 모두 부족 시 `upcomingUpgrade`에 "다음 목표 / 부족 N영혼석"

### 6.3 표시 정보
- 도달 wave / 처치 / 보스 처치
- MVP 카드 (가장 많이 픽한 몬스터, count≥2)
- dominant build 진행도 (50%+ 시 hint, 100% 시 칭호 알림)
- 빌드 미달성 시 fallback: 가장 많이 픽한 태그 (`topPickedTag`)
- 마왕 코멘트 (사망 원인 반영)
- 버튼 우선순위: **강화하고 재도전 (pulse) > 바로 재도전 > 메뉴**

---

## 7. 영구 저장 (zustand persist v5)

### 7.1 SaveState 구조
```
soulstones, totalStones, skills (9종), bestWave, totalKills, runs,
discoveredMonsters/Heroes/Bosses/Relics, achievements, bossesKilled,
challengesDone, daily { date, missions[] }, attendance,
iap, social, shards, tutorialSeen, accessibility,
buildTitles, heroFragments, heroBaneActive, totalBossKills,
ownedInteriors, equippedInteriors
```

### 7.2 v4 → v5 Migration (정책 리스크 용어 정리)
1. `skills.spinCost` → `skills.cardCost` (단계 보존)
2. `achievements: 'jackpot'` → `'luckySummon'`
3. `daily.missions[*].id`: `'jackpot1'` → `'luckySummon1'`, `'spin20'` → `'cardReveal20'`
- 기존 v4 유저의 영혼 강화/도감/오늘의 미션 진행도 모두 보존

### 7.3 안티-좌절 안전장치
- 신규 5런 한정 rank 0~2 영혼 강화 50/70/85% 할인
- 첫 5런 게임오버 시 베이스 영혼석 +50 보장
- 첫 3세션 광고 없음
- 카드 모달 동안 게임 정지 (학습 곡선 보호)
- 6런부터 보스 자동 회복 종료 안내

---

## 8. 정책 리스크 용어 정리 (앱인토스 심사 대비)

도박/슬롯/베팅 연상 단어를 게임 세계관 용어로 모두 치환:

| 변경 전 | 변경 후 |
|---|---|
| `spinChoices` | `cardChoices` |
| `spinCount` | `cardRevealCount` |
| `spinCost()` 메서드 | `currentCardCost()` |
| `spinCost` 스킬 키 | `cardCost` (migration) |
| `autoSpin` | `autoReveal` |
| `nextSpinBonusTag` | `nextRevealBonusTag` |
| `emergencySpinUsed` | `emergencyRevealUsed` |
| `spinCostMul` (challenge) | `cardCostMul` |
| `spinCostReduction` (demonPower) | `cardCostReduction` |
| `emergencySpinExtra` | `emergencyRevealExtra` |
| `slot.jackpot` 필드 | `slot.tripleReveal` |
| `slotJackpot` UI 스냅샷 | `slotTripleReveal` |
| `Audio.jackpot_sfx` | `Audio.luckySummon_sfx` |
| `Audio.spin_start/tick/stop/reroll` | `Audio.cardReveal_start/tick/stop` + `cardReroll_sfx` |
| `SPIN_POOL` (monsters.ts) | `CARD_POOL` |
| achievement `'jackpot'` | `'luckySummon'` (migration) |
| MissionType `'jackpot'/'spin'` | `'luckySummon'/'cardReveal'` |
| 한국어 주석 "스핀" | "카드 펼치기" |

UI 노출 텍스트 "희귀 발견" / "어둠의 제의" / "카드 펼치기" — 도박 연상 0건.

---

## 9. 4종 빌드 전투 체감 강화

| 빌드 | 체감 효과 |
|---|---|
| **언데드/좀비** | 부활 시 보라/초록 영혼 입자 + 초록 aoeRing 28px. lifescream/undead 시너지 활성 + undead/zombie 사망 시 👻 텍스트 |
| **화염** | inferno 시너지 + fire 태그 hero 적중 시 25% 확률 빨간 splash ring 30px + 주변 30px hero에 maxHp 4% chip dmg |
| **마법** | magic 시너지 + 마법 태그 처치 시 마력 +2 + "🔮+2" 텍스트 + 룬 입자 (마력 경제 차별화) |
| **탱크** | tank 시너지 + tank 태그 데미지 받을 때 짧은 푸른(#74B9FF) deflection 광택 (flash 0.06s) |

전투 산식 변화 없음 — 시각/소량 자원 효과만.

---

## 10. 성능 최적화

### 10.1 snapshot polling versioning
- 50ms `setInterval` polling 유지 (HUD 반응성)
- `getSnapshot()`이 37개 핵심 필드로 cheap signature 합성 → 변화 시에만 `_snapVersion++`
- GameScreen이 `s.version === lastSnapVersionRef.current` 면 setState 생략
- 연속 float은 quantize (rallyCdT 0.1s, bossHp 1%, ultiGauge 1%, demonLine 5%)
- **유휴 상태에서 React rerender ≥50% 절감** 예상
- **카드 모달 열린 동안 setState 0** (paused이므로 sig 불변)

### 10.2 입자/이펙트 cap
- `spawnParticles`에 cap 250 (저사양 보호)
- 효과(`effects[]`)는 자체 `life` 타이머로 자동 정리

---

## 11. Debug 계측 (출시 전 30분 soak test)

### 11.1 DebugOverlay (`src/ui/debug/DebugOverlay.tsx`)
- **dev 빌드 + URL `?debug=1` 또는 localStorage `mw_debug=1`** — production에서는 `import.meta.env.DEV` 가드로 dead-code-elim
- 우상단 fixed, 9px monospace, 6줄
- **표시**: FPS / frame time / monsters/heroes alive&total / projectiles / particles / damageTexts / effects / banners / wave / runtime / snap Δ/sec / parent render count
- FPS 색상: ≥55 초록 / ≥45 노랑 / 그 미만 빨강
- 1초당 1회 setState (자체 측정이 게임 성능에 영향 안 줌)

### 11.2 GameEngine.getDebugStats()
- read-only, side effect 없음
- 매 frame 호출해도 영향 없음

### 11.3 SOAK_TEST_CHECKLIST.md
30분 측정 항목:
- A. 성능 안정성 (FPS / frame time)
- B. 메모리 누수 (heap < 50MB 증가)
- C. 객체 누수 (각 카운터별 임계)
- D. snapshot/rerender 효율
- E. visibilitychange / 복귀 (앱 전환, 화면 잠금, 모달 유지, 페이즈2 카운트다운)
- F. pause/resume
- G. 누적 카드 사용 (60회+ slot.strips canvas leak)
- H. OverlayController 충돌 검증
- I. 4종 빌드 체감 검증
- J. 오디오/햅틱

---

## 12. 출시 전 안전장치

### 12.1 RAF + visibilitychange
- 탭 전환 시 RAF 자동 중단 (브라우저 기본)
- `dt` cap (`Math.min(0.05, ...)`) — 복귀 시 시간 점프 방지

### 12.2 Save 손상 방어 (migrate 함수)
- 모든 필드에 `num()/arr()/obj()` 폴백
- 음수/NaN/null 가드

### 12.3 Particle / DOM / canvas leak 방지
- `dispose()` — RAF cancel + listeners clear
- `safeTimeout()` — 게임오버 후 stale callback 차단
- slot.strips canvas는 매 카드 펼치기 새로 생성, 이전 reference는 GC 대상

---

## 13. 기존 동작 보존 / 의도된 비결정

- **Math.random** 직접 사용 — pure function 입력 인자로 주입 가능하지만 이번 리팩터에선 미적용 (테스트 도입 시 후속).
- **GameEngine 단일 클래스 유지** — 분리 비용 > 분리 이득 판단. 산식만 9개 모듈로 외부화.
- **카드 잠금/리스크/분기 등 이미 출시 가능한 상태** — 카드 밸런스는 이번 작업에서 변경 없음.

---

## 14. 알려진 TODO / 리스크

### 14.1 코드/구조
- `useSyncExternalStore` 마이그레이션은 보류 (1차 setState 절감만)
- snapshot 채널 분리 (HUD-light + overlay-heavy) 보류
- `Math.random` 주입화 → 단위 테스트 도입 시 진행
- `applyRiskEffect`의 `spawn_extra_enemy / sacrifice_ally` 분리 보류 (게임 상태 깊은 의존)

### 14.2 디자인
- 빌드 9종 중 4종(언데드/화염/마법/탱크)만 체감 강화. 나머지 5종(beast_wrath/dark_mystic/greedy_path/tyrant_strike/...)은 기본 시너지/유물에 의존.
- ResultScreen은 현재 dominantBuild 한 개만 표시 — 복수 빌드 hint 제공 가능.
- 도전 모드(Challenges) 3~5종으로 한정. 확장 여지.

### 14.3 검증
- 30분 soak test 미실시 (도구만 준비됨).
- 실 디바이스 다양화 (iPhone SE → Pixel 5 → 앱인토스 WebView) 미진행.
- Privacy / Support 화면 컨텐츠 검수 필요.

---

## 15. 검토 시 보면 좋은 파일 (우선순위)

1. **`src/game/GameEngine.ts`** (4415 lines) — 메인 루프. 큰 파일이지만 의도적.
2. **`src/game/systems/OverlayController.ts`** (305) — 모달 충돌 해결 구조
3. **`src/game/systems/CardSystem.ts`** (488) — 카드 의사결정 분리
4. **`src/store/useSaveStore.ts`** (479) — persist v5 + migrate
5. **`src/ui/screens/ResultScreen.tsx`** (678) — 작전 화면 UX
6. **`src/ui/screens/GameScreen.tsx`** (2241) — UI + 입력 + snapshot polling
7. **`docs/SOAK_TEST_CHECKLIST.md`** — 출시 검증 체크리스트
8. **`src/game/data/builds.ts`** — 9종 빌드 정의
9. **`src/game/data/synergies.ts`** — 8종 시너지

---

## 16. 검토자에게 묻고 싶은 것

1. **모놀리식 GameEngine 4415 LOC** — 분리 vs 유지 트레이드오프, 추가 분리 가치 있는 영역?
2. **카드 의사결정 깊이** — 잠금/리롤/리스크/분기/트리플 4가지 메커니즘이 동시 동작 — 너무 많지 않은지?
3. **ResultScreen "작전 화면" 컨셉** — 7단계 사망 원인 추정이 신규 유저에게 과한지 (정보 다이어트 필요?)
4. **빌드 9종 vs 체감 강화 4종** — 나머지 5종도 체감 강화 필요 vs 오버슈팅?
5. **자동 전투 + 능동 조작 4종** — 모바일에서 터치 충돌 / 의사결정 피로?
6. **앱인토스 심사 정책** — 도박 연상 단어 정리 외에 추가 점검 항목?
7. **30분 soak test 임계값** — heap < 50MB 증가, FPS ≥50 유지 가 적절?
8. **빌드 칭호 100% 달성 보상** — 영혼석 +reward + 첫 달성 +100 — 메타 진행 보상 곡선?

---

## 17. 빌드/린트 현재 상태

- `npm run lint` (tsc --noEmit) — **통과**, 에러 0
- `npm run build` (tsc + vite build) — **통과**, ~700ms
- 메인 번들: **74.23 kB** / gzip **24.96 kB**
- GameScreen 청크: **156.54 kB** / gzip **48.51 kB**
- React 청크: **140.86 kB** / gzip **45.26 kB**

---

## 부록 A. 게임 흐름 다이어그램

```
[Title]
  ├─ Tier1: 시작 / 도감 (항상)
  ├─ Tier2 (runs≥2): 도감 + 업적
  ├─ Tier3 (runs≥3 OR boss≥1 OR best≥10): 미션 + 인테리어
  └─ Tier4 (runs≥5 OR best≥15): 도전 + 리더보드 + 상점
       ↓
[GameScreen — RAF 게임 루프]
  ├─ 마력 자연 회복 (3.5/sec, surge×3, mpRegenMul)
  ├─ 카드 펼치기 → CardSystem.createCardChoices
  │   ├─ 트리플(jackpot) 4%
  │   ├─ 리스크 카드 15% (wave≥5)
  │   └─ 분기/bonusTag/dominantTag 가중
  ├─ 카드 선택 → CardSystem.chooseCardResult + computeCardPickEffects
  │   ├─ 진화 트리거 (3마리 → 1마리)
  │   ├─ 등급/태그 부수 효과 (legendary -50mp, tank 할인, magic bonusTag, epic+undead +30hp)
  │   └─ 빌드 통계 누적 (tagPicks/synergyActiveProcs/...)
  ├─ Wave 진행 → WaveSystem (spawn 간격, 엘리트, 마일스톤)
  │   └─ 5웨이브마다 보스 → BossSystem (페이즈 2 파라미터)
  ├─ 시너지 갱신 → CombatSystem.activeSynergyIdsFor + calculateUnitMul
  ├─ 능동 조작 → Rally / Shadow Grasp / Ulti / Lock
  └─ Overlay → OverlayController (event/relic/branch/waveBreak/revival/result)
       ↓ (사망 시)
[ResultScreen — 작전 화면]
  ├─ EconomySystem.computeSoulstoneReward
  ├─ inferDeathCause (7단계)
  ├─ recommendedUpgrade (skill 1개)
  ├─ MVP 카드 / 빌드 진행도 / 픽 경향
  └─ [강화하고 재도전] / [바로 재도전] / [메뉴]
```

---

이 문서는 출시 전 외부 리뷰 시점(2026-05) 기준이며, GameEngine 4415 LOC와 9개 system 모듈 분리 + OverlayController 5단계 + persist v5 migration 완료 상태를 반영합니다.
