import { useEffect } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { PRODUCTS } from '../../game/data/products';
import * as Ait from '../../sdk/AitBridge';

/**
 * 스타터팩 모달 — runs >= 5 시 1회 노출 (첫 결제 유도)
 * 닫기 버튼 외에도 "다음 기회에" 버튼으로 명시적 거절 가능
 */
export function StarterPackModal({ onClose }: { onClose: () => void }) {
  const recordPurchase = useSaveStore((s) => s.recordPurchase);
  const markShown = useSaveStore((s) => s.markStarterPackShown);
  const product = PRODUCTS.starter_pack;

  useEffect(() => {
    markShown();  // 진입 시점에 노출 처리
  }, []);

  const handleBuy = async () => {
    const r = await Ait.purchaseItem(product.id);
    if (r.success) {
      recordPurchase(product.id);
      Ait.haptic('heavy');
    }
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.badge}>{product.badge}</div>
        <h2 style={styles.title}>{product.name}</h2>
        <div style={styles.subtitle}>{product.desc}</div>
        <div style={styles.benefits}>
          {product.benefits.map((b, i) => (
            <div key={i} style={styles.benefit}>{b}</div>
          ))}
        </div>
        <button style={styles.buyBtn} onClick={handleBuy}>
          {product.priceLabel} 결제하기
        </button>
        <button style={styles.skipBtn} onClick={onClose}>
          다음 기회에
        </button>
        <div style={styles.note}>
          확정 상품 — 랜덤 요소 없음. 1회 결제로 영구 적용.
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute', inset: 0, zIndex: 200,
    background: 'rgba(5,3,15,0.96)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 18,
    animation: 'fadeIn 0.3s ease-out',
  },
  card: {
    width: '100%', maxWidth: 300,
    background: 'linear-gradient(180deg,#3a1a4e 0%,#1a0830 100%)',
    border: '3px solid #FDCB6E', borderRadius: 14,
    padding: '24px 20px',
    boxShadow: '0 0 40px rgba(253,203,110,0.5)',
    textAlign: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '2px solid #FDCB6E',
    color: '#FFEAA7', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5,
    padding: '3px 14px', borderRadius: 10,
    boxShadow: '0 2px 6px rgba(214,48,49,0.6)',
  },
  title: {
    color: '#FFEAA7', fontSize: 22, fontWeight: 'bold',
    marginBottom: 4, marginTop: 8, letterSpacing: 2,
    textShadow: '2px 2px 0 #000',
  },
  subtitle: { color: '#bbb', fontSize: 11, marginBottom: 14, letterSpacing: 0.5 },
  benefits: {
    background: 'rgba(0,0,0,0.45)', borderRadius: 8,
    padding: '12px 14px', marginBottom: 16,
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  benefit: {
    color: '#FFEAA7', fontSize: 13, fontWeight: 'bold',
    textAlign: 'left', textShadow: '1px 1px 0 #000',
  },
  buyBtn: {
    width: '100%', padding: '14px 16px',
    background: 'linear-gradient(180deg,#FDCB6E,#D63031)',
    border: '2px solid #FFEAA7', borderRadius: 8,
    color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1.5,
    boxShadow: '0 4px 0 #4a0a0a, 0 0 18px rgba(253,203,110,0.5)',
    fontFamily: 'inherit', cursor: 'pointer',
    marginBottom: 8,
  },
  skipBtn: {
    width: '100%', padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #555', borderRadius: 5,
    color: '#888', fontWeight: 'bold', fontSize: 12,
    fontFamily: 'inherit', cursor: 'pointer',
    marginBottom: 8,
  },
  note: { color: '#666', fontSize: 9, lineHeight: 1.4 },
};
