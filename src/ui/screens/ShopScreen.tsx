import { useState } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { PRODUCTS } from '../../game/data/products';
import * as Ait from '../../sdk/AitBridge';
import { Audio } from '../../audio/AudioEngine';

/**
 * 상점 — 5종 IAP 정식 노출 + 영혼석 묶음 가시성
 * 기획: 첫 결제 진입은 스타터팩 우선. 재구매는 영혼석 묶음 / 시즌패스
 */
export function ShopScreen({ onBack }: { onBack: () => void }) {
  const stones = useSaveStore((s) => s.soulstones);
  const iap = useSaveStore((s) => s.iap);
  const recordPurchase = useSaveStore((s) => s.recordPurchase);
  const [pending, setPending] = useState<string | null>(null);

  const handleBuy = async (sku: string) => {
    if (pending) return;
    setPending(sku);
    Audio.ui_tap();
    try {
      const r = await Ait.purchaseItem(sku);
      if (r.success) {
        recordPurchase(sku);
        Audio.relic_sfx();
        Ait.haptic('heavy');
      }
    } finally {
      setPending(null);
    }
  };

  // 정렬: 미구매 + 추천 우선
  const items = Object.values(PRODUCTS).sort((a, b) => {
    const aOwned = iap.purchasedSkus.includes(a.id) ? 1 : 0;
    const bOwned = iap.purchasedSkus.includes(b.id) ? 1 : 0;
    if (aOwned !== bOwned) return aOwned - bOwned;
    if (a.id === 'starter_pack') return -1;
    if (b.id === 'starter_pack') return 1;
    return a.price - b.price;
  });

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>상 점</h2>
      <div style={styles.subtitle}>모든 상품 확정형 — 랜덤 요소 없음</div>

      <div style={styles.stonesBar}>
        💎 보유 영혼석 <span style={styles.stonesNum}>{stones.toLocaleString()}</span>
      </div>

      <div style={styles.list}>
        {items.map((p) => {
          const owned = iap.purchasedSkus.includes(p.id);
          const isOnetime = p.id === 'starter_pack' || p.id === 'remove_ads';
          const ownedBlock = owned && isOnetime;
          return (
            <div key={p.id} style={{ ...styles.card, ...(ownedBlock ? styles.cardOwned : {}) }}>
              {p.badge && <div style={styles.badge}>{p.badge}</div>}
              <div style={styles.cardName}>{p.name}</div>
              <div style={styles.cardDesc}>{p.desc}</div>
              <div style={styles.benefits}>
                {p.benefits.map((b, i) => (
                  <div key={i} style={styles.benefit}>• {b}</div>
                ))}
              </div>
              <button
                style={{
                  ...styles.buyBtn,
                  ...(ownedBlock ? styles.buyBtnOwned : {}),
                  ...(pending === p.id ? { opacity: 0.5 } : {}),
                }}
                onClick={() => !ownedBlock && handleBuy(p.id)}
                disabled={ownedBlock || pending !== null}
              >
                {ownedBlock ? '✅ 보유 중' : pending === p.id ? '결제 처리 중...' : `${p.priceLabel} 결제`}
              </button>
            </div>
          );
        })}
      </div>

      <div style={styles.legalNote}>
        결제는 토스 결제 시스템을 통해 안전하게 처리됩니다.<br />
        구매 후 환불은 토스앱 결제 내역에서 진행해 주세요.
      </div>

      <button style={styles.backBtn} onClick={onBack}>닫기</button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    padding: '20px 14px calc(20px + env(safe-area-inset-bottom, 0))',
    background: 'rgba(5,3,15,0.97)',
    overflowY: 'auto',
  },
  title: {
    color: '#FFEAA7', fontSize: 22, letterSpacing: 4,
    textAlign: 'center', textShadow: '2px 2px 0 #000',
    margin: '8px 0 4px',
  },
  subtitle: {
    color: '#888', fontSize: 10, letterSpacing: 1,
    textAlign: 'center', marginBottom: 12,
  },
  stonesBar: {
    background: 'rgba(20,12,42,0.85)',
    border: '1px solid #FDCB6E', borderRadius: 12,
    padding: '6px 14px', textAlign: 'center',
    color: '#FDCB6E', fontSize: 12, fontWeight: 'bold',
    marginBottom: 14,
    boxShadow: '0 0 8px rgba(253,203,110,0.3)',
  },
  stonesNum: { color: '#FFEAA7', fontSize: 14, marginLeft: 6 },
  list: {
    flex: 1,
    display: 'flex', flexDirection: 'column', gap: 10,
    minHeight: 0, overflowY: 'auto',
  },
  card: {
    position: 'relative',
    background: 'linear-gradient(180deg,#241a3e,#0d0620)',
    border: '2px solid #4a3a6e', borderRadius: 8,
    padding: '14px 14px 12px',
  },
  cardOwned: {
    opacity: 0.55,
    borderColor: '#26de81',
  },
  badge: {
    position: 'absolute', top: -10, left: 12,
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '1px solid #FDCB6E',
    color: '#FFEAA7', fontSize: 9, fontWeight: 'bold', letterSpacing: 1,
    padding: '2px 10px', borderRadius: 8,
  },
  cardName: {
    color: '#FFEAA7', fontSize: 16, fontWeight: 'bold',
    marginBottom: 2, letterSpacing: 1,
    textShadow: '1px 1px 0 #000',
  },
  cardDesc: {
    color: '#bbb', fontSize: 11, marginBottom: 8,
  },
  benefits: {
    background: 'rgba(0,0,0,0.4)', borderRadius: 6,
    padding: '8px 10px', marginBottom: 10,
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  benefit: {
    color: '#eaeaea', fontSize: 12,
  },
  buyBtn: {
    width: '100%', padding: '10px 14px',
    background: 'linear-gradient(180deg,#FDCB6E,#D63031)',
    border: '2px solid #fff', borderRadius: 6,
    color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 2,
    boxShadow: '0 3px 0 #4a0a0a',
    fontFamily: 'inherit', cursor: 'pointer',
  },
  buyBtnOwned: {
    background: 'rgba(38,222,129,0.2)',
    border: '1px solid #26de81',
    color: '#26de81',
    boxShadow: 'none',
  },
  legalNote: {
    fontSize: 9, color: '#666', textAlign: 'center',
    marginTop: 12, lineHeight: 1.6,
  },
  backBtn: {
    marginTop: 8, padding: '10px 18px',
    background: 'linear-gradient(180deg,#3a2d5c,#1a1230)',
    border: '2px solid #4a3a6e', borderRadius: 6,
    color: '#FFEAA7', fontWeight: 'bold', fontSize: 13,
    fontFamily: 'inherit', cursor: 'pointer',
    width: 200, alignSelf: 'center',
    letterSpacing: 1,
  },
};
