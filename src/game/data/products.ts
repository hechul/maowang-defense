/**
 * IAP 상품 카탈로그 (앱인토스 정책 §사용자 노출 상품 명확화)
 * - 모든 상품: 확정형 (랜덤 박스 X)
 * - 가격: 한국 캐주얼 첫결제 심리적 장벽 ₩4,900 미만 우선
 */
export interface ProductDef {
  id: string;
  name: string;
  desc: string;
  price: number;        // 원 (KRW)
  priceLabel: string;   // 화면 표시
  badge?: string;       // "BEST VALUE" 등
  benefits: string[];   // 줄별 혜택
}

export const PRODUCTS: Record<string, ProductDef> = {
  starter_pack: {
    id: 'starter_pack',
    name: '시작의 약속',
    desc: '신규 마왕을 위한 첫 패키지',
    price: 3300,
    priceLabel: '₩3,300',
    badge: '첫 결제 한정',
    benefits: [
      '💎 영혼석 1,000개',
      '🚫 광고 영구 제거',
      '⚡ 시작 마력 +50 영구',
    ],
  },
  remove_ads: {
    id: 'remove_ads',
    name: '광고 영구 제거',
    desc: '모든 인터스티셜/배너 광고 제거 (보상 광고는 선택)',
    price: 4900,
    priceLabel: '₩4,900',
    benefits: [
      '🚫 강제 광고 0회',
      '🎬 보상 광고는 선택 가능 유지',
    ],
  },
  stones_small: {
    id: 'stones_small',
    name: '영혼석 묶음 (소)',
    desc: '영구 강화에 사용하는 영혼석',
    price: 1500,
    priceLabel: '₩1,500',
    benefits: ['💎 영혼석 500개'],
  },
  stones_medium: {
    id: 'stones_medium',
    name: '영혼석 묶음 (중)',
    desc: '영구 강화에 사용하는 영혼석',
    price: 4900,
    priceLabel: '₩4,900',
    badge: 'BEST VALUE',
    benefits: ['💎 영혼석 2,000개 (+200 보너스)'],
  },
  season_pass: {
    id: 'season_pass',
    name: '시즌 패스',
    desc: '이번 시즌 동안 추가 보상',
    price: 9900,
    priceLabel: '₩9,900',
    benefits: [
      '💎 영혼석 즉시 +500',
      '⚡ 시즌 동안 영혼석 획득 ×1.5',
      '🎁 매일 출석 보상 ×2',
    ],
  },
};
