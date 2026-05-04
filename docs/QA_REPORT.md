# QA 리포트 — 자동 진단

작성: 2026-05-01 (Claude Code Auto QA)

## 1. 실행 환경
- 프로젝트 경로: `maowang-defense/`
- Node: v24.13.0 / Vite 5.4.21 / React 18.3 / TS 5.5
- 명령: `npm run lint` / `npm run build`

## 2. 빌드 결과 (2026-05-01)

| 명령 | 상태 | 결과 |
|---|---|---|
| `npm run lint` (`tsc --noEmit`) | ✅ 통과 | 오류 0 |
| `npm run build` (`tsc && vite build`) | ✅ 통과 | 89 modules transformed, ~664~799ms |

총 번들 ≈ 392KB (gzip ≈ 130KB), 최대 청크: react 140.8KB / GameScreen 108KB.

## 3. 이번 세션에서 수정한 항목

### 빌드 차단 이슈
- `src/ui/screens/SupportScreen.tsx`에서 `import.meta.env`가 타입 미정의로 TS2339 (2건). `src/vite-env.d.ts`를 추가해 `vite/client` 참조 + `VITE_SUPPORT_EMAIL`, `VITE_SUPPORT_HOURS` 인터페이스 선언으로 해결.
- 빌드 캐시 충돌(기존 dist 잔존 시 rendering 단계에서 비정상 종료) 확인 → `rm -rf dist` 후 정상 완료. CI에서는 항상 클린 빌드 권장.

### 정책/검수 리스크 (P0)
- `src/game/GameEngine.ts:1911` 사용자 노출 floating text "+다음 스핀 할인" → "+다음 카드 할인" 으로 교체 (금지어 '스핀' 제거).
- 전체 `src/` 한국어/영문 금지어 grep 재확인: 사용자 노출 문자열 0건. 잔존하는 spin/reel/jackpot 등은 모두 내부 식별자·주석으로 사용자에게 노출되지 않음.

### 저장/로드 안정성 (P0)
- `useSaveStore`에 `version: 4` + `migrate` + `onRehydrateStorage` 추가
- `Number.isFinite` 검사로 비정상 영혼석/소울석 방어
- 배열/객체 기본값 보강 — null/undefined 충돌 방지
- haptic 플래그 rehydrate 시 자동 동기화

### 사용자 경험 (이전 세션 유지)
- 인트로 컷씬 + 챕터 진행 표시 + 빌드 가이드 + 보스 캐릭터 대사 모두 적용

## 3-A. 초보 유저 첫 플레이 QA (2026-05-01) — 13개 항목 적용

코드 정적 분석으로 도출된 5 HIGH / 6 MEDIUM / 5 LOW 항목 전체 적용.

### HIGH (5개)
- **H-1 카드 모달 중 게임 정지** — `GameEngine.finalizeSlot()` 끝에서 `runs<=5 && !autoSpin` 시 `paused=true`. 슬롯 reveal 끝난 시점부터 카드 선택 시점까지 정지. `chooseCard()` 직후 paused 자동 해제(다른 모달/튜토리얼 큐 없을 때).
- **H-2 신규 출석 모달 스킵** — `TitleScreen.tsx`에서 `runs===0`이면 출석 모달/스타터팩 스킵. 첫 게임 종료 후 타이틀 복귀 시점부터 정상 노출.
- **H-3 AUTO/속도 표면화** — controlRow에 AUTO 토글·속도 토글을 항상 노출 (☰ 메뉴 안에서 외부로 이동). 5회 카드 펼치기 후 `tut_auto` 학습 모달 1회. ☰ 아이콘을 ⏸로 변경해 일시정지 의미 명확화.
- **H-4 첫 카드 픽 정보량 다이어트** — `runs<=1 && spinCount<=1 && (spinChoices||slotActive)` 시 isFirstCardReveal=true. (1) 카드 본체 HP/ATK 스탯 숨김 (2) Rally 힌트 숨김 (3) 좌상단 시너지 칩 숨김.
- **H-5 legendary 페널티 항상 표시** — 카드 트레이드오프 라벨(⚠ 마력 -50, +다음 펼치기 할인, +다음 마법 등장률 ↑)을 모든 런에서 노출 (기존 `runs > 5` 조건 제거).

### MEDIUM (6개)
- **M-1 long-press 충돌 완화** — 필드 어둠의 손 700ms→1000ms. CardChoiceButton의 long-press 잠금 로직 제거, 카드 아래에 별도 🔒 50 버튼으로 분리. 튜토리얼 텍스트 "길게 누르면" → "🔒 50 버튼" 으로 갱신.
- **M-2 부활 패키지화** — `acceptRevival()`이 50% HP만 회복하던 것을 (1) freeze 1.5→3.0초 (2) 마력 풀충전 (3) 무료 카드 1회 자동 발동 (0.5초 지연)으로 확장. RevivalModal 설명 문구 동기화.
- **M-3 첫 보스 후 wave-break 강제** — `startWave`에서 `firstBossBreak = wave === 6 && !_waveBreakShown` 추가. 영혼석/runs 조건 무시하고 1회 노출. 배너 라벨에 "스킵 OK" 추가.
- **M-4 마력 부족 컨텍스트 힌트** — `heroNearCastle && mp < spinCost && rallyReady` 시 castleWarn 옆에 "💡 ⚡ 돌격으로 시간 벌기" 토스트 표시.
- **M-5 첫 보스 위험 텔레그래프 강조** — `runs<=1 && bossNext.danger` 시 텔레그래프를 화면 중앙(top:40%) 22pt 큰 글씨 + 빨간 배경으로 노출 (`bossTelegraphFirstDanger`).
- **M-6 첫 사망 가이드** — ResultScreen에서 영혼석 부족으로 `recommendedUpgrade=null`일 때 `upcomingUpgrade` 계산: 가장 적은 영혼석 차이의 강화를 "🎯 다음 목표 — N개 더 모으면 가능"으로 표시.

### LOW (5개)
- **L-1 이벤트 거절 약화** — `runs<=1` 첫 런에서는 이벤트 거절 버튼을 작은 underline 텍스트(`eventDeclineWeak`)로 약화.
- **L-2 첫 보스 마일스톤** — TitleScreen 챕터 박스 다음 목표 라벨에 W5(첫 보스), W10(대마법사) 단계 추가.
- **L-3 spinCost 할인 표시** — 카드 펼치기 버튼 sub 텍스트에 `⚡할인(N/3)` 표시 (spinCount<3일 때).
- **L-4 AUTO 카운트다운** — 카드 영역 라벨에 AUTO + spinChoices 시 "🔁 자동 선택 X.Xs" 카운트다운(`autoPickT` snapshot 노출).
- **L-5 부활 카운트다운 실시간** — RevivalModal에 `useState/setInterval`로 1초마다 줄어드는 숫자 표시.

## 3-B. 버그 헌팅 패치 (2026-05-01) — 동시성/상태기계 이상

코드 정적 분석으로 발견한 18개 항목 중 우선처리 8건 + LOW 5건 패치.

### P0~P1 (8건)
- **BUG-001 튜토리얼 paused 가드** — `consumeTutorial`이 큐가 비면 무조건 `paused=false`로 풀어 다른 모달(유물/이벤트/부활/wave-break/카드)이 살아있을 때 게임이 의도치 않게 재개되던 버그. 다른 모달 활성 가드 추가.
- **BUG-002 부활 광고 race** — 9초대 광고 클릭 시 광고 success 콜백과 10초 자동 종료 setTimeout 경쟁. RevivalModal에 `onLoadingChange` prop 추가, 광고 시청 중 외부 자동 종료 timer + countdown 일시정지(deps에 `revivalAdLoading` 추가).
- **BUG-003 wave-break + 유물 직렬화** — wave-break(z:95) + 유물 모달(z:40)이 동시 활성될 때 유물이 가려지고 wave-break 종료 시 paused 풀려 유물 모달 위로 게임 진행되던 문제. `_pendingPostBreakOffer` 큐에 보관하고 `waveBreakStart` 종료 후 400ms 뒤 발동.
- **BUG-004 ⏸ 모달 활성 시 비활성** — pauseBtn(z:11)이 모든 모달 위에 노출되어 PauseMenu/포기 통해 카드·유물 손실 가능. 카드/유물/이벤트/부활/wave-break/튜토리얼 활성 시 disabled + opacity 0.4.
- **BUG-005 emergency spinCount 분리** — emergency 무료 펼치기가 `spinCount++`하여 첫 3회 할인 카운트가 부정 소모되던 문제. `isEmergency` 플래그로 카운트 분리.
- **BUG-006 부활 시 emergency 리셋** — 부활은 새 라이프이므로 `acceptRevival`에서 `emergencySpinUsed=false` 리셋. 부활 후 같은 위급 상황에서 다시 무료 펼치기 1회 가능.
- **BUG-007 visibilitychange 일시정지** — `App.tsx`의 빈 핸들러 + GameEngine에 `_onVisibilityChange` 등록. hidden 시 `paused=true`(원래 paused 상태 기억), visible 복귀 시 `lastTime` 재설정 + 자동 일시정지였으면 복원. `dispose`에서 listener 정리.
- **BUG-008 포기 confirm 자체 모달** — `window.confirm` 의존 제거. React 자체 모달(`quitConfirmOverlay/Card`, z:300) 추가. 모달 가드는 BUG-004와 함께 작동.
- **BUG-018 chooseCard 진화 paused 보호** — chooseCard 끝의 paused 해제 로직에 `slowMoT > 0 || hitStopT > 0` 가드 추가. 진화 컷씬 중 paused 유지, 컷씬 길이만큼 지연 후 모달 가드 재검사 후 paused 해제.

### LOW (5건)
- **BUG-009 IntroCutscene onDone 1회 가드** — `useRef<boolean>(doneRef)` + `fireDone()` 헬퍼로 onClick과 timer 동시 발동 시에도 한 번만 호출.
- **BUG-012 AUTO toggle 시 paused 해제** — H-1 paused 상태에서 AUTO ON 시 자동 픽이 동작하도록 paused 해제 (다른 모달 가드 동일 적용).
- **BUG-013 챌린지 잠금 정리** — 잠긴 카드 typeId가 챌린지 monsterPool에 없으면 폐기.
- **BUG-016 출석 모달 backdrop 가드** — 보상 미수령 상태에서 backdrop 탭으로 닫히지 않도록(`alreadyClaimed`일 때만 backdrop 닫기 허용).
- **BUG-017 addStones 음수 가드** — `Number.isFinite + n>=0` 검증.

### 변경 안 한 항목
- **BUG-010 sprite preload 실패 fallback** — 이미 `.catch(() => {})`로 graceful, 시각만 누락. 게임 진행 차단 없음.
- **BUG-011 잠금 변경 비용** — 정책 결정 필요(현재 누적 비용 정상 동작). UX 결정 후 추후.
- **BUG-014 포기 시 runs 카운트 별도** — 포기 시 wave/kills/stones가 적어 영혼석/카운트 영향 미미.
- **BUG-015 contextHint 작은 디바이스 layout** — 실 디바이스 검증 후 결정.

### 검증
- `npm run lint` ✅ 통과
- `npm run build` ✅ 통과 (89 modules, 650ms)

## 3-C. 튜토리얼/온보딩 평가 (2026-05-01)

"설명 → 연습 → 실전 적용 → 피드백" 흐름 기준으로 학습 모달 11종(`tut_relic, tut_combo5, tut_synergy, tut_ulti_ready, tut_rally, tut_lock, tut_first_pick, tut_boss_phase2, tut_auto, tut_hp_danger, intro`)을 평가.

### 강점
- **JIT 학습**: 각 시스템이 *실제로 처음 발생하는 순간*에 모달이 뜸. 사전 강의가 아니라 "방금 일어난 일을 설명" 패턴이라 직접 해보면서 배우는 학습 선호와 일치.
- **모달 우선순위**: 튜토리얼 z-index 250으로 다른 모달 위에 표시, paused=true로 게임 멈춤 → 차분히 읽을 수 있음.
- **재노출 방지**: `tutorialSeen` 영구 저장으로 한 번 본 학습은 다시 안 뜸 (재학습 부담 없음).
- **컨텍스트 신호**: HP 위험 시 빨간 비네트, Rally 준비 시 hint, mp 부족 + 적 침투 시 "⚡ 돌격" 토스트 등 **시각/색**으로 비언어적 학습 보강.
- **실전 적용**: 첫 카드 펼치기 펄스 + role legend(🛡⚔🏹🔮)로 카드 선택 즉시 연습 가능.

### 발견한 문제 (적용된 패치)

#### 1. tut_combo5 본문 정보량 과다 (5단계 보상 표를 한 번에 던짐)
- **배워야 할 요소**: 콤보로 보상 받는다는 핵심 규칙
- **현재 전달 방식(이전)**: 5/10/20/30/50 콤보별 보상을 텍스트로 한꺼번에 나열 (5줄)
- **문제점**: 첫 5콤보 도달 시 사용자는 5콤보 보상만 경험. 나머지 4단계는 *아직 일어나지 않은 일*이라 기억하기 어렵고 텍스트 길이만 늘림
- **개선(적용)**: 본문을 "5초 안에 다음 적 처치 시 콤보 유지 + 방금 5콤보 보상은 마력 +20" 핵심 2줄로 단축. 후속 마일스톤(10/20/30/50)은 도달 시점의 banner subText("⛇ 시간 정지!", "🔥 화염 폭발!" 등)로 학습.
- **권장 학습 순서**: 5콤보 도달(연습) → 모달(설명) → 10콤보 도달 시 banner(피드백/실전 적용 신호)

#### 2. tut_relic 본문에 "최대 ~10개" 등 메타 정보 포함
- **배워야 할 요소**: 유물 = 이번 런 영구 효과, 1개 선택, 재선택 불가
- **현재 전달 방식(이전)**: "최대 ~10개 / 빌드와 어울리는 / 같은 종류 카드 + 시너지 + 유물 = 강한 빌드" 등 5줄
- **문제점**: 첫 유물 모달은 W3 클리어 시점 — 시너지 학습 *전*. "빌드 가이드"를 미리 던지면 추상적
- **개선(적용)**: 핵심 3줄로 단축, 빌드 가이드는 시너지 학습(`tut_synergy`) 시점에 노출되는 것으로 자연스럽게 분산.

#### 3. tut_ulti_ready 본문에 3종 필살기 효과 나열
- **배워야 할 요소**: 보라 버튼이 빛나면 탭으로 발동
- **현재 전달 방식(이전)**: "어둠의 파동/지옥 소환진/암흑 멸망" 효과를 모두 설명
- **문제점**: 3종은 자동 순환 — 사용자는 어차피 선택 못 함. 효과 이름 외울 필요 없음
- **개선(적용)**: 본문을 "보라 버튼 탭 = 필살기" + "위급한 순간/보스에 사용" 2줄로 압축.

#### 4. tut_synergy 본문이 모달 변수 보간으로 "방금 X 활성화 — 효과" 직관적이나 "좌상단 🌀 칩" 위치 안내가 텍스트 의존
- **배워야 할 요소**: 시너지가 발동되었다는 사실 + 진행도 확인 위치
- **현재 전달 방식**: 텍스트로 좌상단 칩 위치 설명
- **문제점**: 칩 자체가 임박 시 "임박!" 글자로 빛나지만, 첫 발동 시 시각적 강조 부족 → 모달 닫은 후 어디 있는지 헷갈림
- **개선(적용)**: 본문을 시너지 이름 + 효과 + "🌀 칩 탭 = 진행도" 3줄로 단축. **추가 권장**: 첫 시너지 발동 후 모달 닫힐 때 좌상단 🌀 칩에 1.5초 펄스 애니메이션(미적용 — 후속 작업).

#### 5. 첫 카드 픽 직후 학습 모달 부재 → "내가 카드를 골라 몬스터를 소환했다"가 명시되지 않음
- **배워야 할 요소**: 카드 픽 = 몬스터 소환, 같은 종류 3마리 = 진화
- **현재 전달 방식(이전)**: ftueHint(↓ 카드를 펼쳐 몬스터 소환)와 firstHint(💡 같은 카드 3장 = 진화) 토스트만 있고 명시적 학습 모달 없음
- **문제점**: 토스트는 짧고 페이드되며 사용자가 *놓칠 수* 있음. 카드 시스템과 진화 규칙이 텍스트 전적으로 의존
- **개선(적용)**: `tut_first_pick` 신규 추가 — `chooseCard` 시 `killCount === 0 && !tutorialSeen('tut_first_pick')` 가드로 첫 픽 후 학습 모달 1회 발동. firstHint toast는 보조 신호로 유지(kills ≤ 5 가드 추가).

#### 6. HP 위험 첫 도달 시 학습 모달 부재 → 패닉 + 무엇을 해야 할지 모름
- **배워야 할 요소**: HP<20% 시 부활 + 대응 자원
- **현재 전달 방식(이전)**: banner "⚠ 마왕성 위급!" + 빨간 비네트만. 행동 가이드 없음
- **문제점**: "실패 직전인데 뭘 해야 하지?" 정보 공백
- **개선(적용)**: `tut_hp_danger` 신규 추가 — HP<20% 첫 도달 + runs>=3 시 학습 모달. ⚡ 돌격, 필살기, 부활 광고 안내. (runs<3은 첫 런 좌절 방지 정책상 부활 비활성이라 제외).

#### 7. tut_boss_phase2 본문 너무 긴 추천 대응 목록
- **배워야 할 요소**: 5초 카운트다운 + 즉시 처치 필요
- **현재 전달 방식(이전)**: "Rally + 필살기 동시 사용" 같은 고급 콤보까지 나열
- **개선(적용)**: 핵심만 — "5초 안에 처치 못하면 -200 HP / ⚡ + 필살기로 마무리" 2줄.

### 흐름 평가 — 설명 → 연습 → 실전 → 피드백

| 시스템 | 설명 | 연습 | 실전 적용 | 피드백 | 비고 |
|---|---|---|---|---|---|
| 카드 펼치기 | ftueHint + spin-pulse 버튼 | ✅ 첫 진입 마력 200으로 즉시 가능 | ✅ 카드 픽 = 몬스터 소환 | ✅ tut_first_pick (적용) | OK |
| 진화 | tut_first_pick + firstHint | △ aliveCounts 감지 의존, 자동 카드는 pick 다양성 ↑로 어려움 | ✅ 진화 발동 시 컷씬 + slowMo + showBanner | ✅ 시각 강함 | 진화 임박 카드 hint(노란 보더+"⚡ 진화 발동!") 양호 |
| 시너지 | tut_synergy | △ 무엇을 모아야 하는지 사전에 안 알려줌 | △ 우연히 발동 후 학습 | ✅ flashEdge + showBanner | 좌상단 칩 시각 강조는 부족 |
| Rally(돌격) | tut_rally + rallyHint 텍스트 | ✅ 첫 사용 후 모달 | ✅ 화면 탭으로 즉시 사용 | △ 효과 시각화는 황금 입자만 | OK |
| 필살기 | tut_ulti_ready | △ 충전 메커니즘(처치=+게이지) 미설명 | ✅ 충전 후 즉시 사용 | ✅ 펄스 애니메이션 | 충전 방법 학습 부재 |
| 유물 | tut_relic | ✅ 모달 즉시 선택 | ✅ 효과 즉시 발동 | ✅ showBanner + 황금 입자 | OK |
| 카드 잠금 | tut_lock + 🔒 50 버튼 | ✅ runs≥3부터 별도 버튼 | ✅ 다음 펼치기에 유지 | △ 잠긴 후 tag만 표시 | OK |
| AUTO 모드 | tut_auto (5회 펼치기 후) | ✅ controlRow 토글 노출 | ✅ 즉시 자동 진행 | ✅ "🔁 자동 선택 X.Xs" 카운트다운 | OK (M-2 적용 후) |
| HP 위험 | tut_hp_danger (적용) + 빨간 비네트 | △ 위급 직전에야 학습 | △ 자원 부족 가능 | ✅ 부활 모달 | OK |
| 보스 페이즈2 | tut_boss_phase2 | △ 첫 보스 직후 도달 가능, 정보 흡수 시간 부족 | ✅ 카운트다운 시각화 | ✅ flashScreen + shakeFx | OK |
| 콤보 | tut_combo5 | ✅ 첫 5콤보 자연 도달 | ✅ 5초 내 처치 압박 | ✅ flashEdge + showBanner | OK |

### 권장 학습 순서 (이상)

1. **인트로 컷씬** (3 frames, 5.4초) → 세계관/목표 설명
2. **첫 카드 펼치기** (mp 200 즉시) — `firstSpinPulse` 버튼 + ftueHint
3. **첫 카드 픽** → `tut_first_pick`(설명: 진화 규칙) → 적 처치 즉시(피드백)
4. **첫 5콤보** → `tut_combo5`(설명: 콤보 유지) → 후속 콤보(실전)
5. **첫 유물(W3)** → `tut_relic`(설명) → 즉시 선택(연습)
6. **첫 시너지 발동(자연)** → `tut_synergy`(설명) → 후속 픽 시 임박 신호 보임(실전)
7. **첫 필살기 충전** → `tut_ulti_ready`(설명) → 즉시 사용(연습) → 효과 발동(피드백)
8. **첫 보스(W5)** → 보스 패턴 시각화(연습) → 페이즈2(`tut_boss_phase2` 도달 시) → 5초 카운트다운(피드백)
9. **5회 카드 펼치기** → `tut_auto`(설명) — 단조로움 인식 시점에 자동화 옵션 제시
10. **첫 HP 위급** → `tut_hp_danger`(설명) → 대응 자원 사용(연습/실전)
11. **첫 사망** → ResultScreen `recommendedUpgrade` (피드백 + 다음 도전 안내)

### 미해결 / 후속 작업 권장
- **시너지 칩 위치 학습**: 모달 닫힘 시 좌상단 🌀 칩에 1.5초 펄스(현재 "임박!" 글자만 펄스).
- **필살기 충전 메커니즘 명시**: 처치 = +게이지 사실을 첫 처치 후 1회 toast로 가시화.
- **carryOver 이해**: 영혼석/스킬트리 = 영구, 유물 = 1런 한정 — 두 영역 차이 학습 부재. ResultScreen에서 첫 사망 후 1회 안내 가능.
- **카드 등급 체계**: common/uncommon/rare/epic/legendary 색 구분은 시각으로 보이나 등급 위계는 학습 없음. 첫 epic 카드 등장 시 "✨ 희귀 등급 — 강력함" 같은 banner 권장.
- **보스 패턴 사전 텔레그래프**: M-5(첫 위험 텔레그래프 화면 중앙 강조)는 적용됨. 패턴 종류(invuln/castleStrike/bossHeal) 자체는 학습 없음 — 첫 만남 시 1회 안내 권장.

### 검증
- `npm run lint` ✅ 통과
- `npm run build` ✅ 통과 (89 modules, 660ms)
- 변경 항목: tut_combo5/relic/synergy/ulti_ready/rally/boss_phase2 본문 단축, tut_first_pick 신규, tut_hp_danger 신규, firstHint kills≤5 가드.

## 3-D. 레벨 디자인 평가 (2026-05-01)

좌표: W=360, H=640, FIELD(0,78)~(360,418), GROUND_Y=378, 마왕성(8,278)~(94,378), 적진영(310~360). "플레이어 시선이 어디로 향할지" 기준 12개 위치 평가.

### 적용한 개선

#### LD-A — 14마리 클러스터 분산 (위치 4)
이전: `baseX = 90 + live * 12` + `min(220)` → 11번째부터 x=220 한 점에 겹침.
변경: 6마리당 1줄(`col = live % 6`, `row = floor/6`), `baseX = 100 + col*14 + row*4`, x cap 220→240. row 홀수면 y +4 오프셋.
효과: 동시 14마리 시 시각적으로 두 줄 분산, 누가 누구인지 분간 가능.

#### LD-B — 라인 가시성 (위치 3)
이전: alpha 0.08 + 라벨 없음 → 사실상 비가시.
변경: alpha 0.18, 라인 좌측 끝(x=100)에 🛡⚔🏹 라벨 추가 (앞=탱커, 중=근거리, 뒤=원거리).
효과: 라인 시스템 학습 가능, 카드 픽 시 어디 배치되는지 예측.

#### LD-C — 방어선 위치 보정 (위치 2)
이전: x=80 점선이 마왕성(8~94) 본체와 겹침.
변경: x=110 (마왕성에서 16px 밖), 점선 길이 60→80px, 펄스 alpha 0.4→0.5.
효과: 방어선 = 마왕성 외곽 안전선 개념 시각화.

#### LD-D — 챕터별 배경 색조 (위치 7)
이전: 모든 wave에서 같은 보라 grad.
변경: wave 1~24=보라(#2D1B4E), 25~49=붉은 보라(#3a0d4e), 50~99=피의 톤(#3a0d0d), 100+=독성 녹(#0a3a2a).
효과: 챕터 마일스톤 시각 진행감 + 단조로움 완화.

#### LD-E — 적 진영 시각 매스 강화 (위치 1)
이전: 우측 30px alpha 0.25 grad + 1px 깃대 + 6×8 깃발.
변경: 50px grad alpha 0.4, 깃대 2개(앞 큰 50px + 뒤 작은 42px), 펄럭 위상차, 텐트 삼각형 실루엣 추가.
효과: "적이 우측에서 온다" 시각 학습.

### 미적용 (후속 작업 권장)

| 항목 | 위치 | 영향 | 사유 |
|---|---|---|---|
| 적 spawn 시각 신호 | 5 | 예측 가능성 | hero spawn 함수 수정 필요, AOE 영향 검토 |
| 카드 모달이 데미지 텍스트 가림 | 6 | 인지 약화 | 데미지 텍스트 y 조정 vs HUD toast 설계 결정 |
| HUD 정보 밀집 | 8 | 시선 분산 | 큰 UI 재배치, 별도 작업 |
| 첫 보스 사전 텔레그래프 | 9 | 학습 | 1초 페이드 + 사운드 큐 추가 |
| 마왕성 HP별 시각 변화 | 10 | 위험 인지 | 첨탑 부서짐 sprite 추가 필요 |

### 검증
- `npm run lint` ✅ 통과
- `npm run build` ✅ 통과 (89 modules, 650ms)

### 수정 파일
`src/game/GameEngine.ts` (drawBackground / spawnMonster), `docs/QA_REPORT.md`

## 3-E. 전투 밸런스 평가 (2026-05-01)

코드 수치(HEROES/BOSSES/SPIN_POOL/wave scl) 기반 14개 항목 평가. 공정한 어려움(로그라이크 의도)과 불공정한 어려움(정보 부족·회피 불가)을 구분.

### 공정한 어려움 (의도된 도전)
- **wave scl `1+(w-1)*0.085`** + **1성 카드 풀 고정**: 후반 진화/시너지 빌드 강제
- **카드 50/100 mp ROI**: 강화 카드 잠금/시너지 학습 보상
- **로그라이크 wave 1 재시작**: 메타 진행으로 점진 극복
- **첫 5런 newbieBonus**: 보스 처치 시 마왕성 +30% HP, hero 0.85x

### 적용한 개선 (7건)

#### B-1 페이즈 2 + invuln 동시 회피 불가 → invuln 차단
- 문제: king HP 7080 페이즈2(25%=1770) 5초 안에 처치 필요. 그 사이 invuln 2초 발동 시 실효 dps 60% 손실 → 회피 불가.
- 변경: `bossDef?.invuln` 발동 조건에 `u.desperateT <= 0` 가드 추가. 페이즈 2 카운트다운 중에는 무적 발동 금지.

#### B-2 healer/shield/rogue 첫 만남 학습 + healer 회복 텔레그래프
- 문제: healer 회복으로 처치 ROI 음수, shield defense 0.4 비가시, rogue spd 38 우선순위 미인지.
- 변경:
  - `spawnHero`에서 healer/shield/rogue 첫 등장 시 `tut_enemy_healer / shield / rogue` 학습 모달 1회.
  - healer 회복 0.7초 전 ✚ floating text + 입자 텔레그래프 (`_healerTelegraphed` 플래그).

#### B-3 captain(첫 보스) 폭발 완화
- 문제: 첫 보스 페이즈2 폭발 -200/5s가 첫 사망 1순위.
- 변경: captain 한정 폭발 dmg -200→-100, 카운트다운 5s→7s. archmage부터는 기존 -200/5s 유지.

#### B-4 6런째 보너스 종료 안내
- 문제: 5런 보너스(newbie hero 약화, 보스 처치 자동 회복) 종료가 안내 없이 사라져 6런째 갑자기 어려워짐.
- 변경: ResultScreen에서 `runs === 5` 시 "🎓 신규 보호 종료 — 마왕성 HP 강화 추천" 안내.

#### B-5 priest castleStrike 텔레그래프
- 문제: priest(W25+) 7초마다 마왕성 -120 dmg, range 200으로 화면 밖에서도 공격 가능. 텔레그래프 부재.
- 변경: `castleStrikeCdT < 1.05~0.95` 윈도우에서 "☄ 마왕성 공격 임박! 1초" banner + flashEdge (`_castleStrikeTelegraphed` 플래그).

#### B-6 emergency 발동 조건 완화
- 문제: 적<2 조건 너무 좁음. 위급 직전엔 보통 적이 다수.
- 변경: `hpPct<0.2 || (hpPct<0.3 && aliveCount<4)`로 완화. HP 위급(<20%) 시 적 수 무시.

#### B-7 6런 이후 카드 슬로모
- 문제: H-1은 5런까지만 paused. 6런부터 카드 검토 시간 = 마왕성 손실.
- 변경: `runs > 5 && !autoSpin` 시 `slowMoT = max(slowMoT, 1.5)` — 0.4x 시간 압축으로 검토 시간 확보.

### 미적용 (후속)
- archmage range 100과 마왕성 공격 분기 일관성 (현재 일반 hero와 동일하게 작동 — 답답함은 아님)
- W20+ hero cap 18 / healer 동시 spawn 1명 제한
- 챌린지 모드 별도 밸런스 검토

### 검증
- `npm run lint` ✅
- `npm run build` ✅ (89 modules, 648ms)

### 수정 파일
`src/game/GameEngine.ts`, `src/ui/screens/ResultScreen.tsx`, `docs/QA_REPORT.md`

## 3-F. 조작감/카메라/피드백 평가 (2026-05-01)

"내가 잘못해서 실패" vs "게임이 불공정해서 실패" 기준으로 18개 항목 평가. 입력 응답성·시각 신호·판정 명확성 중심.

### 적용한 개선 (7건)

#### F-1 snap polling 100→50ms
- 문제: 사용자 클릭 → engine 즉시 반영, UI는 최대 100ms(6프레임) 후. "내가 눌렀나?" 미세 의심.
- 변경: `setInterval(..., 100)` → `setInterval(..., 50)`. 60fps와 더 가깝게 동기.

#### F-2 long-press 진행 ring 시각화
- 문제: 어둠의 손 1000ms 임계값 임박 시 시각 신호 없음 → 단탭/장탭 경계 모호.
- 변경: `handleFieldDown`에서 RAF 기반 0~1 진행도 측정 + 화면 중앙 conic-gradient ring 표시 (🖐 → ⛓ 아이콘 전환). `handleFieldUp`에서 정리.

#### F-3 ulti disabled 시각 강화
- 문제: opacity 0.85 = 1과 차이 미미. 입력 결함 오해.
- 변경: opacity 0.55 + `grayscale(0.7)` filter.

#### F-4 강한 shake 쿨다운 무시
- 문제: 150ms 쿨다운으로 큰 임팩트(보스 페이즈2) 누락 가능.
- 변경: 새 shake amt가 현재 진행 중 amt × 1.5 초과 시 쿨다운 무시(`isStrongOverride`). 작은 shake는 그대로 차단.

#### F-5 일반 hero spawn 가장자리 신호
- 문제: 화면 밖 spawn(x=W+30) 시 시각 신호 없음 → 화면 밖 위협.
- 변경: 보스 외 일반 hero spawn 시 `flashEdge('#FF6B6B', 0.25)` 짧은 빨간 외곽 ring.

#### F-6 AOE 시각화
- 문제: aoe 공격(slord 18, owar 30 등) 발동 시 범위가 데미지 다중 발생으로만 사후 인지.
- 변경: GameEffect union에 `'aoeRing'` 추가, `applyAttack` 내 aoe 처리 시 0.25초 ring effect 발생. `drawEffects`에 ring 그리기 분기.

#### F-7 cap 14 라벨
- 문제: 동시 14마리 도달 시 카드 픽 클릭이 ui_error만 발생, 원인 미표시.
- 변경: `getSnapshot()`에 `aliveMonsters` 노출. `cardAreaLabel`에서 14/14 도달 시 "⚠ 14/14 — 처치 후 다시 펼치기" 표시.

### 미적용 (후속 권장)
- 적 광역 효과 발동 시 보스 텔레그래프 가림 (z 우선순위 정리)
- 햅틱 강도 톤 정리 (heavy → medium/light 분배)
- 카드 모달 중 Rally 버튼만 활성 정책

### "공정/불공정" 분류

| 항목 | 분류 |
|---|---|
| Rally/어둠의 손 임계값 미시각화 | 불공정 → F-2 |
| AOE 시각화 부재 | 불공정 → F-6 |
| Cap 14 무반응 | 불공정 → F-7 |
| 화면 밖 spawn | 불공정 → F-5 |
| polling 100ms 지연 | 부분 → F-1 |
| ulti disabled 시각 | 부분 → F-3 |
| 강한 shake 누락 | 부분 → F-4 |
| 챕터 flash 0.85 | 공정 (위험 시점 외) |
| 보스 처치 슬로모 | 공정 (의도된 강조) |

### 검증
- `npm run lint` ✅
- `npm run build` ✅ (89 modules, 640ms)

### 수정 파일
`src/game/GameEngine.ts`, `src/ui/screens/GameScreen.tsx`, `docs/QA_REPORT.md`

## 4. 남은 문제 / 미수정

| 우선 | 항목 | 현재 상태 |
|---|---|---|
| P1 | 확률 공개 페이지 (확률형 아이템 고지) | 코드에 풀 가중치 명시되어 있음. UI 페이지 없음 |
| P1 | 실 디바이스 FPS/메모리 측정 | 코드 정적 분석만, AI는 측정 불가 |
| P2 | BGM 16~32 마디 확장 | 현재 4마디 루프 |
| P2 | Walk 4프레임 / Attack 3프레임 sprite 분리 | 일부만 (transform 위주) |
| P2 | 친구 초대 실 SDK 연동 | shareToFeed fallback만 |

## 5. 우선순위별 TODO

### P0 (출시 전 반드시)
- 없음 (모두 적용됨)

### P1 (출시 전 권장)
1. 확률 공개 페이지 추가 (앱인토스 §확률형 아이템)
2. 실 디바이스 (Galaxy A13급 + iPhone SE) FPS 60 확인
3. 30분 연속 플레이 메모리 누수 확인

### P2 (출시 후 패치)
1. BGM 마디 확장
2. 시즌 라이브 운영
3. 인터스티셜 광고 위치 다양화
4. 멀티 프레임 sprite

## 6. 수동 테스트 시나리오

`docs/MANUAL_QA_SCENARIOS.md` 별도 문서 참조 (시나리오 7개).

## 3-G. UI/UX 평가 (2026-05-01)

"지금 무엇을 해야 하는가"를 0.5초 안에 파악할 수 있는가? 기준으로 19개 항목 평가. HUD/메뉴/버튼/아이콘/알림/텍스트 영역.

### 적용한 개선 (6건)

#### U-1 보스 HP % 표시
- 문제: bossHp 패널이 fill width %만 — 절대 진행도 추측 어려움.
- 변경: bossLabel 옆에 `Math.ceil(snap.bossHp * 100)%` 표시 (`bossHpPct` 스타일).

#### U-2 HP < 50% 시 % 우선 라벨
- 문제: 후반 HP "1234 / 1500" 같은 11자+ 텍스트가 14px 바 안 가독성↓.
- 변경: hpRatio < 0.5일 때 `🏰 50% (500)` 형식으로 단축. 50% 이상은 기존 절대치.

#### U-3 controlRow gap + 속도 OFF 시각 분리
- 문제: gap 4px → 인접 버튼 오탭. AUTO/속도 OFF 둘 다 회색이라 시각 분리 약함.
- 변경: gap 4→10px. 속도 OFF 톤을 갈색조로 (AUTO OFF는 보라 그대로).

#### U-4 카드 잠금 버튼 라벨 강화
- 문제: "🔒 50"만으로는 동작 명확성 부족.
- 변경: "🔒 잠금 50" + 황금 보더 + boxShadow.

#### U-5 PauseQuit 버튼 위험 시각
- 문제: 회색 점선 — 실수 클릭 가능.
- 변경: 빨간 점선 보더 + 빨간 텍스트(#D63031).

#### U-6 mp/HP 라벨 즉시값 사용
- 문제: 라벨이 displayMp(lerp)이라 실제값과 0.5초 차이.
- 변경: 라벨 텍스트는 `this.mp` 즉시값. fill width만 displayMp lerp 유지.

### 미적용 (후속)
- WAVE 배지에 진행도 통합 (#3)
- 카드 모달 정보량 우선순위 정렬 (#4)
- TitleScreen 6메뉴 카테고리 그룹화 (#19)
- 알림 우선순위 큐 (#15)
- 우상단 영역 정보 밀집 분리 (#8)

### 핵심 평가 ("지금 무엇을 해야 하는가")
| 상황 | 즉답 가능 |
|---|---|
| 카드 펼치기 가능? | ✅ btnReveal 라벨 |
| 마왕성 위급? | ✅ HP 거대화 + dangerVignette |
| 다음 카드 픽? | ✅ 카드 모달 우선 |
| 보스 HP 남은량? | ✅ U-1 적용 |
| 진화 발동? | ✅ 노란 보더 + 배지 |
| Cap 14? | ✅ F-7 라벨 |
| Healer 우선? | ✅ B-2 학습 + 텔레그래프 |
| AOE 범위? | ✅ F-6 ring |

### 검증
- `npm run lint` ✅
- `npm run build` ✅ (89 modules, 652ms)

### 수정 파일
`src/game/GameEngine.ts`, `src/ui/screens/GameScreen.tsx`, `docs/QA_REPORT.md`

## 3-H. 퀘스트/목표 안내 평가 (2026-05-01)

"30초 이상 다음 행동을 고민할 가능성" 기준으로 16개 항목 평가. 본 게임은 NPC 퀘스트가 없는 로그라이크 + 일일 미션 + 챕터 마일스톤 구조.

### 적용한 개선 (6건)

#### Q-1 게임 HUD 활성 미션 1줄 표시
- 문제: 일일 미션 진행도가 MissionsScreen에만 — 게임 중에는 모름.
- 변경: snapshot에 `activeMissions` 노출. GameScreen에서 진행도 % 가장 높은 미션 1개를 좌측 상단에 "🎯 [이름] [12/30]" 칩으로 표시 (보스전 외, 첫 카드 픽 외).

#### Q-2 미션 완료 순간 banner
- 문제: progress가 target에 도달해도 in-game 알림 없음. 사용자가 보상 수령 잊음.
- 변경: missionTracker에 `missionCompletedQueue` 추가. progress가 target 도달 순간 큐에 push. GameEngine 루프에서 `popMissionCompleted` 소비하여 `🎯 [이름] 완료! +N 영혼석 (보상 받기)` banner.

#### Q-3 첫 wave 클리어 안내
- 문제: 첫 진입 사용자가 wave 1 클리어 후 다음 단계(보스/유물) 모름.
- 변경: clearedWave===1 + runs<=1 시 "✅ 웨이브 1 클리어! 5웨이브마다 보스가 등장합니다" 1회 banner.

#### Q-4 보스 wave 사전 안내
- 문제: "다음: WAVE 5" banner만 — 보스 등장 사전 인지 부족.
- 변경: 다음 wave가 5의 배수면 banner sub에 "⚡ 보스 등장 — [이름]" + 빨간 톤 + 1.6초 길이.

#### Q-5 챌린지 활성 시 상단 라벨
- 문제: 챌린지 진행 중 종료 조건/이름 안내 부재.
- 변경: snapshot에 `challengeId` 노출. 챌린지 활성 + 보스 비활성 시 상단에 "🏆 도전: [이름] — W15" 라벨.

#### Q-6 진화 임박 HUD 라벨
- 문제: 진화 임박 표시가 카드 모달에만 — 일반 진행 중 의도 잊음.
- 변경: snapshot에 `evoImminentTypes`(살아있는 같은 종류 evoNeed-1 도달) 노출. GameScreen에서 좌측 상단(missionHud 아래)에 "⚡ 진화 임박: [이름]" 칩.

### 미적용 (후속)
- 5런 도달 시 신규 메뉴 6개 short tour
- 챕터 박스 옆 "오늘 받을 보상" 1줄 요약
- WAVE 배지에 챕터 다음 마일스톤 통합

### 30초+ 고민 가능성 평가
| 시점 | 이전 | 적용 후 |
|---|---|---|
| 첫 진입 | ❌ | ❌ (변화 없음, 이미 좋음) |
| 첫 카드 픽 후 | ⚠ | ✅ Q-3 클리어 안내 |
| 미션 진행 | ⚠ | ✅ Q-1 HUD + Q-2 완료 알림 |
| 챌린지 진행 | ⚠ | ✅ Q-5 라벨 |
| 진화 의도 유지 | ⚠ | ✅ Q-6 임박 칩 |
| 보스 등장 임박 | △ | ✅ Q-4 사전 안내 |

### 검증
- `npm run lint` ✅
- `npm run build` ✅ (89 modules, 650ms)

### 수정 파일
`src/game/GameEngine.ts`, `src/game/missionTracker.ts`, `src/ui/screens/GameScreen.tsx`, `docs/QA_REPORT.md`

## 3-I. 퀘스트/목표 안내 후속 평가 (2026-05-01)

§3-H Q-1~Q-6 적용 후 잔존·신규 발생 이슈 5건 추가 패치.

### 적용한 개선
- **QO2-A** missionHud 가드 강화 — 카드 모달/슬롯/유물/이벤트 활성 시 자동 숨김. 좌측 라벨 stack(top:80~154 6중첩) 충돌 완화.
- **QO2-B** 미션 완료 banner sub 텍스트 명시 — "타이틀 → 일일 미션에서 +N 영혼석 수령" 1줄. 자동 적립 오해 제거. 길이 1.6→2.0초.
- **QO2-C** 5런 도달 신규 메뉴 해금 토스트 — `tut_unlock_5runs` 플래그로 1회 노출. 6개 메뉴(미션/도전/도감/업적/리더보드/상점) 한꺼번에 등장 시 학습 차단.
- **QO2-D** 챌린지 진입 시 modifier 안내 banner — `start()`에서 600ms 후 `🏆 [이름] / [desc]` 2.5초. 게임 중 "왜 평소보다 어렵지?" 30초+ 고민 제거.
- **QO2-E** 일일 미션 메뉴 미수령 도트 — TitleScreen 일일 미션 PlateButton 우상단에 미수령 카운트(빨간 도트 + 황금 보더). 매번 메뉴 진입 안 해도 보상 보유 인지 가능.

### 미적용 (후속)
- 챕터 박스 옆 "오늘 받을 보상" 요약 라인
- WAVE 배지에 챕터 마일스톤 통합

### 잔존 30초+ 고민 가능 시점
- 일반 진행 중 큰 공백 없음.
- 시즌 패스 D-day는 banner 1줄로만 — 별도 진입점 부재(후속 작업 영역).

### 검증
- `npm run lint` ✅
- `npm run build` ✅ (89 modules, 641ms)

### 수정 파일
`src/game/GameEngine.ts`, `src/ui/screens/GameScreen.tsx`, `src/ui/screens/TitleScreen.tsx`, `docs/QA_REPORT.md`

## 3-J. 성장/보상/경제 평가 (2026-05-01)

수치 + 기대감 + 체감 성장 + 다음 목표 4축으로 16개 항목 평가. 영혼석 흐름·스킬 비용·유물 풀·시즌·미션·챌린지·IAP 분석.

### 적용한 개선 (5건)

#### E-1 파편(shards) UI 노출 숨김
- 문제: 2차 이코노미 파편이 store에는 있지만 사용처 UI 0건. TitleScreen에 "🔮 파편 N" 표시만 — 사용자 혼란.
- 변경: TitleScreen 영혼석 옆 파편 표시 제거. store 데이터는 보존(향후 파편 상점 추가 시 복원).

#### E-2 스킬 곡선 완화 (rank 1~2 추가 할인 + 후반 보정 시작점 6→4)
- 문제: 첫 강화 50, 두 번째 140, 세 번째 196 — 3배 격차로 체감 cliff.
- 변경: `skillCost`에서 runs<5 시 rank 0=50% / rank 1=70% / rank 2=85% 할인. 후반 ×0.85 보정 시작점 6→4 rank.

#### E-3 챌린지 재도전 보상 10%
- 문제: 챌린지 1회 클리어 후 reward=0 → 재플레이 동기 부재.
- 변경: 이미 클리어한 챌린지 재도전 시 `Math.floor(ch.reward * 0.1)` 지급. 매번은 single 적립(런 종료 시).

#### E-4 spinCost / aura baseCost 완화
- 문제: spinCost(90) 효과 -5%/rank로 체감 약함, aura(200) 가장 비싼데 효과 +3%/rank.
- 변경: spinCost 90→60, aura 200→150. ROI 균형.

#### E-5 startMon 효과 강화 + 실제 적용
- 문제: max 1, baseCost 600 비효율. 게다가 코드에서 **실제 적용 안 됨** (GameEngine.start에서 사용 누락) — 데드 스킬.
- 변경: max 3 + costMul 1.5 (200/300/450), desc "시작 시 슬라임 N체 무료". GameEngine.start에서 `skills.startMon` 만큼 `spawnMonster('slime')` 호출. 데드 스킬 활성화.

### 미적용 (후속)
- 영혼석 sink 부재 (#4) — 파편 상점 미구현이 영구 해결책
- 시즌별 한정 칭호/유물 잠금 해제 (#11)
- 챌린지 별점 시스템 (W15/W20/W25 단계 보상)

### 평가 요약
| 영역 | 이전 | 적용 후 |
|---|---|---|
| 첫 5런 강화 곡선 | cliff | 완화 (E-2) |
| spinCost / aura ROI | 낮음 | 균형 (E-4) |
| startMon | 데드 스킬 | 활성 (E-5) |
| 챌린지 재플레이 | 0 | 10% (E-3) |
| 파편 데드 자원 | 노출됨 | 숨김 (E-1) |
| 후반 영혼석 sink | ⚠ | **미해결** (파편 상점 후속) |

### 검증
- `npm run lint` ✅
- `npm run build` ✅ (89 modules, 658ms)

### 수정 파일
`src/game/GameEngine.ts`, `src/game/data/skilltree.ts`, `src/ui/screens/TitleScreen.tsx`, `docs/QA_REPORT.md`

## 3-K. 접근성/가독성 평가 (2026-05-01)

"플레이 가능성" 기준(편의가 아닌)으로 17개 항목 평가. 옵션 없으면 사용 불가한 사용자가 있는지 중심.

### 적용한 개선 (4건)

#### A-1 largerText 활성화 (데드 옵션 → 실제 작동)
- 문제: `accessibility.largerText` 옵션이 store에 정의되어 있으나 (a) UI 토글 노출 X (b) CSS/스타일 적용 0건. 시각 약자 사용 불가.
- 변경:
  - `global.css`: `html { font-size: 14px }` 분리, body는 `font-size: 1rem`
  - `main.tsx`: rehydrate 시 root font-size 14↔17px 동기
  - `useSaveStore.toggleAccessibility`: largerText 토글 시 root font-size 갱신
  - `AccessibilityToggles`(PauseMenu): "🔍 큰 글씨 ON/OFF" 버튼 추가

#### A-2 카드 등급 텍스트 라벨 (색맹 보조)
- 문제: 카드 등급 구분이 보더 색 + 별점 의존. 적록 색맹(약 8% 남성)이 색만으로 epic/legendary 구분 어려움.
- 변경: rare 이상 카드에 등급명 텍스트 라벨 추가 — "희귀" / "영웅" / "전설". 색 + 텍스트 이중 인코딩.

#### A-3 reduceMotion 확장 (slowMo / hitStop)
- 문제: reduceMotion ON 시 shake/flashScreen만 비활성. slowMoT / hitStopT는 영향 안 받아 광민성/어지럼증 사용자 부담 잔존.
- 변경: GameEngine 루프에서 reduceMotion ON 시 hitStopT/slowMoT 소진 속도 ×2 (절반 시간), effDt도 50% 감소(완전 정지 대신 절반 속도).

#### A-4 secondary 텍스트 대비 (largerText ON 시 격상)
- 문제: #888~#bbb on 검정 배경 secondary 텍스트가 WCAG AA 대비 미달 영역.
- 변경: `html[data-larger-text="true"]` 셀렉터로 base color #f4f4f4 격상. main.tsx + store에서 data attribute 동기화.

### 미적용 (후속)
- ⏸ 위치 토글 (한 손/왼손잡이) — UI 재배치 영역
- 어둠의 손 1000ms 시간 옵션화 — 운동 약자
- 색맹 모드 전용 토글(고대비 모드) — 카드 보더 두께 +1, 등급별 패턴 등
- secondary 텍스트 일괄 inline #888 → CSS 변수화 리팩터

### 평가 요약 — "플레이 가능성"
| 사용자 군 | 이전 | 적용 후 |
|---|---|---|
| 시각 약자 | ❌ largerText 데드 | ✅ 토글 + 적용 |
| 색맹 | △ 등급 색만 | ✅ 텍스트 라벨 |
| 광민성/어지럼증 | △ slowMo 영향 X | ✅ A-3 확장 |
| 반응 속도 약자 | ✅ AUTO | ✅ |
| 청각 약자 | ✅ 시각 보강 | ✅ |
| 운동 약자 | △ long-press 1000ms | △ (옵션 후속) |
| 한 손 조작 | △ ⏸ 우상단 고정 | △ (후속) |

### 검증
- `npm run lint` ✅
- `npm run build` ✅ (89 modules, 662ms)

### 수정 파일
`src/main.tsx`, `src/store/useSaveStore.ts`, `src/styles/global.css`, `src/ui/screens/GameScreen.tsx`, `src/game/GameEngine.ts`, `docs/QA_REPORT.md`

## 3-L. 코어 루프/재미 평가 (2026-05-01)

"왜 한 판 더 하고 싶은가?" 기준으로 micro/meso/macro/meta/daily 5층 루프 평가. 시스템 간 연결성 매트릭스 + 부족 요소 정리.

### 적용한 개선 (3건)

#### C-1 W10/15/20 중간 마일스톤
- 문제: W5 첫 보스 → W25 챕터 1 사이 20wave에 큰 보상 텀 없음. 정체기 발생.
- 변경: `milestones` 객체에 W10(+100) / W15(+200) / W20(+300) 추가. 챕터 마일스톤과 동일 banner 시스템 사용 — 즉시 시각/사운드 피드백.

#### C-2 신규 5런 한정 카드 reroll 1회 무료
- 문제: reroll은 fate 유물 한정 — 첫 런 사용자가 RNG로 빌드 망가지면 회복 어려움.
- 변경: `finalizeSlot`에서 `runs <= 5`이면 매 카드 reveal마다 `rerollAvailable = true`. anti-frustration.

#### C-3 도감 진행도 보상 활성
- 문제: 도감 수집은 단순 컬렉션, 보상/효과 없음 — 시스템 간 연결성 가장 약함.
- 변경: `discover('monsters', id)` 호출 시 누적 5/10/15/20 도달하면 영혼석 +50/+100/+200/+500 자동 적립. 도감 → 인게임 연결 회복.

### 미적용 (후속)
- 마력 충전 28초 능동 옵션 (탭으로 마력 +0.5 등) — 코어 루프 변경 영역
- "오늘의 변수" 일일 모디파이어 — 매 런 새 변수 도입
- 시즌 패스 progress bar + 트랙 보상 시스템 — 큰 메타 신규
- 5분 짧은 챌린지 모드 ("오늘의 도전") — 컨텐츠 추가

### "왜 한 판 더?" 강도 (이전 → 적용 후)
| 동기 | 이전 | 적용 후 |
|---|---|---|
| 신기록 도전 | 강 | 강 |
| 영혼강화 | 강 | 강 |
| 챕터 마일스톤 | 강 | 강 + 중간 마일스톤(C-1) |
| 새 빌드 시도 | 중 | 중 + reroll 보장(C-2) |
| 도감 수집 | 약 | 중 (C-3 보상 연결) |
| 챌린지 재플레이 | 약 | 중 (E-3 패치) |

### 시스템 연결성 (적용 후)
| A → B | 강도 |
|---|---|
| 카드 → 진화/시너지/유물 | ✅ 강 |
| 영혼강화 → 코어 | △ 중 |
| 챌린지 → 메타 | △ 중 (재플레이 10%) |
| 도감 → 메타 | ✅ 중 (진행도 보상) |
| 일일 미션 → 코어 | △ passive 트래킹 |

### 검증
- `npm run lint` ✅
- `npm run build` ✅ (89 modules, 647ms)

### 수정 파일
`src/game/GameEngine.ts`, `src/store/useSaveStore.ts`, `docs/QA_REPORT.md`

## 3-M. 내러티브/몰입 평가 (2026-05-01)

"플레이어가 지금 행동에 의미를 느끼는가?" 기준으로 13개 항목 평가. 게임이 가벼운 세계관 + 강한 메타 진행 구조라는 전제 하에 핵심 충돌·몰입 단절 지점만 표적 패치.

### 적용한 개선 (4건)

#### N-1 ResultScreen "패배" reframe
- 문제: "패배 / 마왕성 함락"이 매번 같은 텍스트. "천 년 봉인 마왕"이 매 사망마다 wave 1로 시작 = 시스템 충돌.
- 변경: title "패배" → "잠시 봉인", sub에 회차(`runs`) + "다시 일어나리라" 추가. 메타 진행 회차로 reframe.

#### N-2 보스 dialog duration 가변
- 문제: 보스 dialog `showBanner(name, dialog, color, 2.0)` 2초. largerText(A-1) 사용자에게 짧음.
- 변경: `largerText` ON 시 2.0→3.0초.

#### N-3 챕터 클리어 시 마왕 반응 dialog
- 문제: 챕터 마일스톤 banner 후 즉시 다음 wave. 큰 사건 후 마왕(주인공) 반응 부재.
- 변경: W25/50/100 마일스톤 3.6초 후 `safeTimeout`으로 마왕 dialog banner 1.8초 — 25: "이제 시작일 뿐이다...", 50: "세상이 어둠에 잠긴다...", 100: "어둠이 곧 질서다." 보라색(#a55eea, 마왕 톤).

#### N-4 부활 모달 텍스트 reframe (광고 → 어둠의 제물)
- 문제: "🎬 광고 보고 부활" 4번째 벽 깨짐. 세계관 일시 단절.
- 변경:
  - 설명 "광고를 보고 부활" → "어둠의 제물을 바쳐 일어나리라"
  - 버튼 "🎬 광고 보고 부활" → "🎬 어둠의 제물 (광고)"
  - 로딩 "광고 로딩 중..." → "의식 진행 중..."
  - 광고 명시는 유지(앱인토스 검수 / 사용자 인지)

### 미적용 (후속)
- 마왕(주인공) 캐릭터 dialog 시스템 (#3) — 첫 카드 픽 / 보스 등장 반응 등 (sprite/voice 부재)
- 보스 페이즈 전환 시 마왕 반응 (#6)
- 인트로 컷씬 dur 늘리기 (#13)
- 챕터 클리어 후 명시적 "다음 챕터 시작" 버튼 (#5)
- AUTO 라벨 "어둠의 본능" 등 캐릭터 능력 reframe (#8)

### "지금 행동에 의미" 평가
| 행동 | 의미 인식 |
|---|---|
| 카드 펼치기 → 소환 | ✅ 강 (인트로 약속) |
| 진화 / 시너지 | ✅ 강 (시각 임팩트) |
| 사망 후 재시도 | △→✅ N-1 회차 reframe |
| 부활 광고 | △→✅ N-4 세계관 톤 |
| 챕터 클리어 | △→✅ N-3 마왕 반응 |
| 보스 dialog 학습 | ✅ N-2 가변 duration |

### 검증
- `npm run lint` ✅
- `npm run build` ✅ (89 modules, 663ms)

### 수정 파일
`src/game/GameEngine.ts`, `src/ui/screens/GameScreen.tsx`, `src/ui/screens/ResultScreen.tsx`, `docs/QA_REPORT.md`

## 3-N. 입력 장치별 조작 UX 평가 (2026-05-01)

"자주 쓰는 행동이 가장 편한 위치에 있는가" 기준으로 모바일/PC/패드 13개 항목 평가. 모바일 한 손 세로 우선 게임, PC는 보조 지원.

### 적용한 개선 (4건)

#### I-1 PC 키보드 단축키 (모바일 영향 없음)
- 문제: PC 브라우저 사용자는 마우스만 — 단축키 0건.
- 변경: GameScreen에 window keydown 핸들러 추가:
  - `Space` = 카드 펼치기
  - `Q` = ⚡ 돌격(Rally)
  - `E` = 필살기
  - `Esc` = 일시정지/메뉴 닫기
  - input/textarea 포커스, 모달 활성 시 가드. `e.preventDefault()` 처리.

#### I-2 카드 잠금 버튼 height 확대
- 문제: 잠금 버튼 padding 5px (height ~14px) — 손가락 큰 사용자가 카드 픽 영역과 혼동.
- 변경: padding 8px + minHeight 28px, fontSize 10→11, marginTop 4→6, boxShadow 강화.

#### I-3 잠긴 카드 라벨 (펼치기 버튼 sub에)
- 문제: lockedCardId가 잠긴 후 다음 펼치기까지 사용자가 무엇을 잠갔는지 확인 어려움. lockedTag(top:4 right:4 fontSize:9)는 카드 활성 중에만 보임.
- 변경: btnRevealSub 라벨에 `🔒 [카드명]` 추가 — 다음 펼치기 직전 사용자가 명확히 인지.

#### I-4 focus outline + canvas cursor pointer
- 문제: PC Tab 키보드 포커스 시각 신호 부재. canvas hover 시 클릭 가능 영역 신호 없음.
- 변경: `global.css`:
  - `button:focus-visible` outline 2px solid #FDCB6E
  - `canvas { cursor: pointer; }`

### 미적용 (후속)
- ⏸ 위치 옵션화 (좌/우 토글) — 한 손/왼손잡이 (#1)
- 모바일 어둠의 손 발동 직전 가장 가까운 적 위 ⛓ 미리 표시 (#3)
- 게임패드 API 지원 (#9) — 모바일 우선 게임으로 후순위
- 키바인딩 사용자 재설정 (#7 확장)

### "자주 쓰는 행동" 위치 평가
| 행동 | 모바일 | PC (적용 후) |
|---|---|---|
| 카드 펼치기 | ✅ 하단 큰 버튼 | ✅ Space |
| 카드 픽 | ✅ 하단 모달 | ✅ 클릭 |
| 필살기 | ✅ 하단 우측 | ✅ E |
| Rally | ✅ 하단 ⚡ + canvas | ✅ Q |
| 메뉴 ⏸ | ⚠ 우상단 (옵션 후속) | ✅ Esc |
| 카드 잠금 | △→✅ I-2 확대 | △ 클릭만 |

### 검증
- `npm run lint` ✅
- `npm run build` ✅ (89 modules, 654ms)

### 수정 파일
`src/ui/screens/GameScreen.tsx`, `src/styles/global.css`, `docs/QA_REPORT.md`
