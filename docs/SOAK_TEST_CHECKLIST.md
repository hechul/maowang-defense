# 30분 Soak Test 체크리스트 — 마왕 디펜스

출시 전 실 디바이스에서 30분 연속 플레이 시 FPS 저하 / 메모리 증가 / 객체 누수 / WebView 복귀 문제를 검증합니다.

## 사전 준비

### 1. Debug Overlay 활성화

DebugOverlay는 **dev 빌드 + 활성 플래그** 두 조건을 모두 충족할 때만 마운트됩니다 (production에서는 코드 자체가 dead-code-elim으로 빠짐).

활성 방법 (둘 중 하나):
- URL 쿼리: `?debug=1` 추가 (예: `http://localhost:5173/?debug=1`)
- localStorage: `localStorage.setItem('mw_debug', '1')` 후 새로고침

비활성: 쿼리 제거 또는 `localStorage.removeItem('mw_debug')`.

### 2. 테스트 환경
- **권장 디바이스**: iPhone SE 2nd / Pixel 5 (저~중사양 기준)
- **브라우저**: Safari iOS / Chrome Android / 앱인토스 WebView (실제 환경)
- **저장 데이터 초기화**: `localStorage.clear()` 후 새 런 시작 (신규 유저 흐름 검증 시)

### 3. 측정 도구
- **DebugOverlay** (앱 내, 우상단): FPS / frame time / monsters / heroes / projectiles / particles / damageTexts / effects / banners / wave / runtime / snapshot Δ/sec / parent render count
- **Chrome DevTools → Performance Monitor**: JS heap size 추세 (1분당 +N MB 미만 권장)
- **Chrome DevTools → Performance**: 30분 중 5분 단위로 1초씩 record → frame drop 확인

---

## 30분 Soak Test 체크리스트

### A. 성능 안정성 (FPS / frame time)
- [ ] 시작 직후 (W1~W5): FPS 평균 ≥ 55 (DebugOverlay 표시)
- [ ] 중반 (W10 전후): FPS 평균 ≥ 50 — 몬스터 캡 14, hero cap 14에서도 유지
- [ ] 보스 wave (W5/W10/W15/W20): FPS dip이 1초 이상 ≤ 45 로 떨어지지 않음
- [ ] 시너지 4종 동시 활성 + 콤보 50+ 순간: 전체 frame drop 5frame 이내
- [ ] 마지막 5분(25~30분): 시작 평균 대비 FPS -10% 이내
- [ ] frame time 평균 ≤ 18ms (60Hz 기준)

### B. 메모리 누수
- [ ] JS heap size: 시작 직후 측정 후 30분 후 측정 — 증가량 < 50MB
- [ ] 게임오버 → 메뉴 → 새 런 5회 반복 후 heap 안정화 (마지막 런이 첫 런 대비 +20MB 미만)
- [ ] DevTools Memory 탭에서 detached DOM 노드 수 반복 측정 — 단조 증가하지 않음

### C. 객체 누수 (DebugOverlay 카운트 추적)
- [ ] **monsters**: 평소 alive ≤ 14 + dead 누적이 60초 이상 안 사라짐 → 누수 의심
- [ ] **heroes**: 평소 alive ≤ 18 (W20+) + dead 누적이 60초 이상 안 사라짐 → 누수 의심
- [ ] **projectiles**: 전투 외 시점에 ≥ 50 잔존 → 누수 의심
- [ ] **particles**: cap 250 이하로 유지 (코드에 cap 있음) — cap 초과 발견 시 버그
- [ ] **damageTexts**: 1초 idle 후 ≤ 5 — 그 이상이면 정리 안 됨
- [ ] **effects**: 1초 idle 후 ≤ 3 — 그 이상이면 정리 안 됨
- [ ] **banners**: 동시 표시 ≤ 3, 만료 시 자동 제거

### D. snapshot / rerender 효율
- [ ] **SNAP Δ/s**: idle 상태(보스 미등장, 모달 없음, 마력 충전 중)에서 ≤ 8/sec
- [ ] **SNAP Δ/s**: 카드 모달 열린 동안 = 0/sec (paused이므로)
- [ ] **RDR (parent render count)**: 30분 누적 ≤ 8000 (≈4.5/sec 평균) — 그 이상이면 sig 미커버 필드 의심

### E. visibilitychange / 복귀
- [ ] 게임 진행 중 다른 앱 전환 → 5초 후 복귀 → 화면 정상 (검은 화면 / 정지 X)
- [ ] 다른 앱 전환 → 1분 후 복귀 → 게임 시간이 1분 점프하지 않음 (dt cap 제대로 동작)
- [ ] 화면 잠금 → 30초 후 해제 → BGM 재개 정상
- [ ] 카드 모달 열린 상태로 전환 → 복귀 시 모달 그대로 표시
- [ ] 보스 페이즈 2 (desperate) 카운트다운 중 전환 → 복귀 시 타이머 정상
- [ ] 부활 광고 로딩 중 전환 → 복귀 시 게임오버 흐름 정상

### F. pause / resume
- [ ] 일시정지 메뉴 활성 → 시뮬레이션 완전 정지 (DebugOverlay에서 Δ/s = 0 확인)
- [ ] 일시정지 → 재개 → 즉시 폴링 1회 발생 후 정상 진행
- [ ] AUTO 토글 → 일시정지 상태 유지 (모달 미닫힘)
- [ ] 일시정지 중 visibilitychange → 복귀해도 일시정지 유지

### G. 누적 카드 사용
- [ ] 30분 내 카드 펼치기 60회 이상 — 매 회 슬롯 reel 생성/해제 정상 (slot.strips canvas leak 없음)
- [ ] reroll 사용 후 새 카드 — 이전 strip 회수 (메모리)
- [ ] 트리플 발현(jackpot) 4% 확률 — 발생 시 정상 종료 + 다음 펼치기 가능

### H. 모달 / overlay 충돌 (OverlayController 검증)
- [ ] 보스 처치 직후 분기 카드 + 웨이브 휴식 동시 트리거 → OverlayQueue로 직렬화
- [ ] 튜토리얼 중 유물 선택 발생 → 튜토리얼 우선, 닫은 후 유물 노출
- [ ] 부활 모달 + 튜토리얼 동시 발생 → 부활 우선
- [ ] 일시정지 중 결과 화면 진입 → 결과 화면이 일시정지 위로 덮임

### I. 빌드 체감 (4종)
- [ ] **언데드/좀비**: tomb 유물 + undead 시너지 활성 → 부활 시 초록 영혼 ring 노출
- [ ] **화염**: inferno 시너지 활성 → fire-tag 공격 시 25% 확률 빨간 splash ring
- [ ] **마법**: magic 시너지 활성 → 마법 처치 시 "🔮+2" 텍스트
- [ ] **탱크**: tank 시너지 활성 → 탱크 데미지 받을 때 짧은 푸른 deflection 광택

### J. 오디오 / 햅틱
- [ ] BGM 30분 연속 재생 — 끊김/메모리 누수 없음
- [ ] 카드 펼치기 효과음 (cardReveal_start/tick/stop) 정상
- [ ] 햅틱 옵션 OFF 시 진동 안 옴 (window.__hapticEnabled 동기화)

---

## 측정 기록 양식

```
디바이스: ___________
브라우저/WebView: ___________
시작 시각: ___________

[0분]   FPS:__ heap:__MB monsters:__ heroes:__ proj:__ part:__ rdr:__
[10분]  FPS:__ heap:__MB monsters:__ heroes:__ proj:__ part:__ rdr:__
[20분]  FPS:__ heap:__MB monsters:__ heroes:__ proj:__ part:__ rdr:__
[30분]  FPS:__ heap:__MB monsters:__ heroes:__ proj:__ part:__ rdr:__

발견 이슈:
1.
2.
```

---

## 출시 가능 기준

다음 모두 충족 시 출시 가능:
- A. 모든 항목 ✅
- B. heap 증가 < 50MB
- C. 누수 의심 항목 0건
- D. RDR 30분 누적 ≤ 8000
- E. visibilitychange 항목 모두 ✅
- F~J. 각 항목 ✅

미충족 항목 발견 시 → 회귀 PR로 수정 후 재테스트.
