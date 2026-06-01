/**
 * MVP 안전 플래그.
 * 기본값은 과금/광고 OFF이며, 실제 SDK 검수 단계에서만 명시적으로 켠다.
 */
export const ENABLE_MONETIZATION = import.meta.env.VITE_ENABLE_MONETIZATION === 'true';
