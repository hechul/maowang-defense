// 앱인토스 마이너앱 설정 (AIT_SENIOR_DEV §개발 환경 셋업)
import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'maowang-defense',
  brand: {
    displayName: '마왕키우기',
    primaryColor: '#7B2D8E',  // 마왕 퍼플 (PIXEL §마스터 팔레트)
    icon: '/icon.png',         // 144x144 권장
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'npm run dev',
      build: 'npm run build',
    },
  },
  permissions: [],   // 추가 권한 불필요 (게임)
  outdir: 'dist',
});
