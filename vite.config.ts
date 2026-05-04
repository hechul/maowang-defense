import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// 앱인토스 미니앱 빌드 설정
// - WebView 환경, 번들 사이즈 최소화 우선
// - 코드 스플리팅: 전투/스킬트리는 lazy import
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          // 게임 시스템은 자동 코드 스플리팅 (lazy import 활용)
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 5173,
    host: true,
  },
});
