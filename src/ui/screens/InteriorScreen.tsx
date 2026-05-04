/**
 * 인테리어 화면 — 마왕성 꾸미기 (영혼석 sink)
 * GAME_DESIGN_OVERHAUL §4.5
 */
import { useState } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { INTERIORS, type InteriorCategory, type InteriorDef } from '../../game/data/interior';
import { Audio } from '../../audio/AudioEngine';

const CATEGORY_LABEL: Record<InteriorCategory, string> = {
  sign: '간판',
  flag: '깃발',
  aura: '오라',
  magic_circle: '마법진',
};

export function InteriorScreen({ onBack }: { onBack: () => void }) {
  const stones = useSaveStore((s) => s.soulstones);
  const owned = useSaveStore((s) => s.ownedInteriors);
  const equipped = useSaveStore((s) => s.equippedInteriors);
  const buyInterior = useSaveStore((s) => s.buyInterior);
  const equipInterior = useSaveStore((s) => s.equipInterior);
  const [activeCat, setActiveCat] = useState<InteriorCategory>('sign');

  const items = INTERIORS.filter((i) => i.category === activeCat);

  const handleClick = (def: InteriorDef) => {
    if (owned.includes(def.id)) {
      equipInterior(def.category, def.id);
      Audio.ui_confirm();
    } else {
      if (buyInterior(def.id, def.cost)) {
        equipInterior(def.category, def.id);
        Audio.relic_sfx();
      } else {
        Audio.ui_error();
      }
    }
  };

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>마왕성 꾸미기</h2>
      <div style={styles.stones}>
        💎 보유 영혼석 <span style={styles.stonesNum}>{stones.toLocaleString()}</span>
      </div>

      <div style={styles.tabs}>
        {(['sign', 'flag', 'aura', 'magic_circle'] as InteriorCategory[]).map((c) => (
          <button
            key={c}
            style={{ ...styles.tab, ...(activeCat === c ? styles.tabActive : {}) }}
            onClick={() => { setActiveCat(c); Audio.ui_navigate(); }}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <div style={styles.list}>
        {items.map((def) => {
          const isOwned = owned.includes(def.id);
          const isEquipped = equipped[def.category] === def.id;
          const canBuy = !isOwned && stones >= def.cost;
          return (
            <button
              key={def.id}
              style={{
                ...styles.row,
                borderColor: isEquipped ? '#FDCB6E' : '#4a3a6e',
                background: isEquipped ? 'rgba(245,166,35,0.15)' : 'rgba(20,12,42,0.7)',
              }}
              onClick={() => handleClick(def)}
            >
              <div style={{ ...styles.icon, color: def.visual.color }}>{def.icon}</div>
              <div style={styles.info}>
                <div style={styles.name}>{def.name}</div>
                <div style={styles.desc}>{def.desc}</div>
              </div>
              <div style={styles.action}>
                {isEquipped ? (
                  <span style={styles.equippedTag}>장착 중</span>
                ) : isOwned ? (
                  <span style={styles.ownedTag}>장착하기</span>
                ) : (
                  <span style={{ ...styles.cost, color: canBuy ? '#FDCB6E' : '#888' }}>
                    💎 {def.cost.toLocaleString()}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <button style={styles.backBtn} onClick={onBack}>닫기</button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    padding: '18px 14px', background: 'rgba(5,3,15,0.96)',
  },
  title: {
    color: '#FFEAA7', fontSize: 20, letterSpacing: 3,
    textAlign: 'center', textShadow: '2px 2px 0 #000',
    marginBottom: 10,
  },
  stones: {
    color: '#FDCB6E', fontSize: 13, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 12,
    background: 'rgba(20,12,42,0.85)',
    padding: '5px 12px', borderRadius: 12,
    border: '1px solid #FDCB6E', alignSelf: 'center',
  },
  stonesNum: { color: '#FFEAA7', fontSize: 15, marginLeft: 6 },
  tabs: { display: 'flex', gap: 4, marginBottom: 8 },
  tab: {
    flex: 1, padding: '6px 4px',
    background: 'rgba(20,12,42,0.6)',
    border: '1px solid #4a3a6e', borderRadius: 4,
    color: '#bbb', fontSize: 11, fontWeight: 'bold',
    fontFamily: 'inherit', cursor: 'pointer',
    letterSpacing: 1,
  },
  tabActive: {
    background: 'linear-gradient(180deg,#7B2D8E,#4A2068)',
    borderColor: '#FDCB6E', color: '#FFEAA7',
  },
  list: {
    flex: 1, minHeight: 0, overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: 6,
    border: '1.5px solid', cursor: 'pointer',
    fontFamily: 'inherit', textAlign: 'left',
    color: 'inherit',
  },
  icon: {
    fontSize: 26, lineHeight: 1, flex: '0 0 32px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1, minWidth: 0 },
  name: { color: '#FFEAA7', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  desc: { color: '#bbb', fontSize: 10, marginTop: 2 },
  action: { flex: '0 0 80px', textAlign: 'right' },
  equippedTag: {
    color: '#26de81', fontSize: 10, fontWeight: 'bold',
    background: 'rgba(38,222,129,0.15)',
    padding: '2px 6px', borderRadius: 3,
  },
  ownedTag: {
    color: '#74B9FF', fontSize: 10, fontWeight: 'bold',
    padding: '2px 6px',
  },
  cost: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  backBtn: {
    width: 200, alignSelf: 'center', padding: '10px 18px',
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '2px solid #FDCB6E', borderRadius: 5,
    color: '#fff', fontWeight: 'bold', fontSize: 13,
    boxShadow: '0 3px 0 #4a0a0a', cursor: 'pointer',
    fontFamily: 'inherit', marginTop: 10,
  },
};
