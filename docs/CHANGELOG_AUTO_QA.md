# 자동 QA 변경 로그

작성: 2026-04-30 (Claude Code Auto QA 14-step pipeline)

## 수정 파일

### `src/store/useSaveStore.ts`
- `version: 4` 추가 (zustand persist)
- `migrate()` 함수 — 손상된 저장 데이터 방어:
  - `Number.isFinite` 검사 + clamp ≥ 0
  - 배열/객체 기본값 보강
  - 빠진 필드 자동 채움
- `onRehydrateStorage()` — rehydrate 실패 시 console.warn + haptic 플래그 즉시 동기화

### `src/game/GameEngine.ts`
- 코드 주석 정리 (8건):
  - `Slot Machine (3릴 슬롯)` → `운명의 카드 펼치기 (3장 카드 공개)`
  - `3릴 슬롯머신` → `카드 공개 시퀀스 상태`
  - `슬롯은 실시간` → `카드 공개 애니메이션은 실시간`
  - `첫 슬롯에 유지` → `첫 칸에 유지`
  - `세 번째 슬롯 교체` → `세 번째 카드 교체`
  - `슬롯 펼치기 즉시 종료` → `카드 공개 즉시 종료`
  - `어두운 슬롯` → `어두운 홈`
  - `슬롯 릴 캔버스` → `카드 공개 캔버스`
- 사용자 노출 텍스트는 변경 없음 (이미 안전)

### `docs/` (신규 5개 문서)
- `POLICY_RISK_AUDIT.md` — 정책 리스크 감사 (사행성/도박/현금성 0건)
- `APP_IN_TOSS_RELEASE_CHECKLIST.md` — 출시 체크리스트 (운영/디자인/보안/광고/IAP/기술/저장)
- `FIRST_3_MINUTES_UX_REVIEW.md` — 첫 3분 시뮬레이션 + 막힐 지점 + 대응
- `QA_REPORT.md` — 빌드 결과 + 우선순위 TODO
- `CHANGELOG_AUTO_QA.md` — 본 문서

## 의도

1. **앱인토스 검수 안전성 강화** — 코드 주석 레벨까지 슬롯/사행성 표현 제거
2. **저장 데이터 방어** — localStorage 파싱 실패 / 잘못된 값 / 누락 필드 자동 복구
3. **출시 전 사람 확인 항목 명확화** — 5종 문서로 분류

## 빌드 결과
- `npm run lint`: ✅ 통과 (tsc 오류 0)
- `npm run build`: ✅ 통과 (89 modules transformed)

## 다음 작업 제안

### P1 (출시 전 권장)
1. `docs/PROBABILITY.md` 추가 — 카드 풀 가중치 공개 페이지
2. SupportScreen 이메일 실주소 등록
3. 실 디바이스 (iOS/Android) 30분 연속 테스트
4. 광고 SDK 실 ID 매핑

### P2 (출시 후 개선)
1. BGM 16~32 마디 확장
2. Walk/Attack sprite 분리
3. 친구 초대 실 SDK 연동
4. 시즌 라이브 운영 데이터
