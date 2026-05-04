# 마왕키우기 (Raise the Demon Lord)

앱인토스 미니앱 — 스핀 기반 로그라이크 디펜스 게임.

## 기술 스택 (AIT_SENIOR_DEV §개발 환경)

- **Vite + React 18 + TypeScript 5**
- **`@apps-in-toss/web-framework`** (SDK 2.x)
- **Zustand** (게임 상태 + 영구 저장)
- **HTML5 Canvas** (게임 렌더링, 60fps 타겟)

## 디렉토리 구조

```
maowang-defense/
├── granite.config.ts          # 앱인토스 설정
├── vite.config.ts             # Vite + 코드 스플리팅
├── tsconfig.json
├── index.html                 # 앱 셸 + 로딩 splash
├── src/
│   ├── main.tsx               # 진입점, SDK 초기화
│   ├── App.tsx                # 라우팅 + Suspense
│   ├── sdk/
│   │   └── AitBridge.ts       # 앱인토스 SDK 추상화 (광고/IAP/리더보드/푸시)
│   ├── store/
│   │   └── useSaveStore.ts    # Zustand + persist (영혼석/스킬/도감/출석)
│   ├── audio/                 # 25 SFX + 4 BGM (다음 라운드)
│   ├── game/
│   │   ├── GameEngine.ts      # 메인 게임 루프 (다음 라운드)
│   │   ├── data/              # 몬스터/용사/보스/유물 데이터
│   │   ├── entities/          # Unit, Projectile, Effect 클래스
│   │   ├── systems/           # Wave, Spin, Combat, Synergy 시스템
│   │   └── rendering/
│   │       ├── palette.ts     # 마스터 32색
│   │       ├── pixelArt.ts    # 자동 아웃라인 빌더
│   │       └── sprites/       # 32×32 캐릭터 픽셀 데이터
│   ├── ui/
│   │   ├── screens/
│   │   │   ├── TitleScreen.tsx     # 인트로 (검수 §운영)
│   │   │   ├── PrivacyScreen.tsx   # 개인정보 (검수 §운영)
│   │   │   ├── SupportScreen.tsx   # 고객 문의 (검수 §운영)
│   │   │   ├── GameScreen.tsx      # 게임 캔버스 호스트
│   │   │   ├── ResultScreen.tsx
│   │   │   ├── SkillTreeScreen.tsx
│   │   │   └── BestiaryScreen.tsx
│   │   └── components/
│   │       └── LoadingScreen.tsx   # Suspense fallback
│   └── styles/
│       └── global.css         # 세이프 에어리어, 터치 최적화
└── public/
    └── icon.png               # 앱 아이콘 (144×144)
```

## 실행

```bash
# 의존성 설치
npm install

# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 앱인토스 빌드 & 배포 (콘솔 등록 후)
npx ait build
npx ait deploy
```

## 검수 통과 체크리스트 (AIT §검수 요건)

- ✅ **운영**: 인트로(타이틀)에 게임 설명 / 개인정보 처리방침 / 고객 문의 페이지
- ✅ **디자인**: 세이프 에어리어 대응 (env(safe-area-inset-*))
- ✅ **디자인**: 세로 고정, 폰트 12px+
- ⏳ **기능**: 광고 SDK 연동 (다음 라운드)
- ⏳ **기능**: IAP 연동 (다음 라운드)
- ⏳ **기능**: 백그라운드/포그라운드 전환 (AudioContext resume — 다음 라운드 AudioEngine.ts)
- ✅ **보안**: 민감 정보 하드코딩 없음

## 다음 작업 (Phase A 잔여)

1. `src/audio/AudioEngine.ts` — 25 SFX + 4 BGM 마이그레이션
2. `src/game/GameEngine.ts` — 게임 루프 + Unit/Projectile/Effect 클래스
3. `src/game/data/*` — 몬스터/용사/보스/유물/시너지/스킬트리 데이터
4. `src/game/rendering/sprites/*` — 32×32 픽셀 데이터 (Phase B에서 정성껏 재작업)

## Phase B: 캐릭터 도트 직접 그리기

- 가디언테일즈 / 스타듀밸리 / 셀레스트 레퍼런스 충실 모사
- 함수형 빌더 폐기, 픽셀 단위 직접 그리드 정의
- 검은 실루엣 테스트 통과
- Idle 2 / Walk 4 / Attack 3 / Hit 2 / Death 3 / Evolve 5 프레임 분리

---

*v0.1 / 2026-04-29 / Phase A 골격 구축*
