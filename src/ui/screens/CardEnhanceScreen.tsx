import { useMemo, useState } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { MONSTERS } from '../../game/data/monsters';
import { CARD_LEVEL_MAX, costForLevelUp, statMulForLevel } from '../../game/data/cardEnhance';
import { getCardLore } from '../../game/data/cardLore';

interface Props { onBack: () => void }

/**
 * P1-4 카드 영구 강화 — 모집된 카드만 영혼석으로 +레벨.
 */
export function CardEnhanceScreen({ onBack }: Props) {
  const recruited = useSaveStore((s) => s.recruitedMonsterIds);
  const cardLevels = useSaveStore((s) => s.cardLevels);
  const stones = useSaveStore((s) => s.soulstones);
  const enhanceCard = useSaveStore((s) => s.enhanceCard);
  const [openLore, setOpenLore] = useState<string | null>(null);

  const monsters = useMemo(() => {
    return recruited.map((id) => MONSTERS[id]).filter(Boolean);
  }, [recruited]);

  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.back} onClick={onBack}>← 뒤로</button>
        <div style={s.title}>카드 강화</div>
        <div style={s.stones}>💎 {stones}</div>
      </div>

      <div style={s.hint}>
        영혼석으로 카드를 영구 강화 (HP/ATK 레벨당 +8%, 최대 +5).
      </div>

      <div style={s.list}>
        {monsters.map((m) => {
          const lv = cardLevels[m.id] || 0;
          const isMax = lv >= CARD_LEVEL_MAX;
          const cost = costForLevelUp(m.rarity, lv);
          const canAfford = stones >= cost;
          const mul = statMulForLevel(lv);
          const lore = getCardLore(m.id);
          const isOpen = openLore === m.id;
          return (
            <div key={m.id} style={s.row}>
              <button style={s.info} onClick={() => setOpenLore(isOpen ? null : m.id)}>
                <div style={s.name}>
                  {m.name}
                  <span style={s.lv}>+{lv}</span>
                  {lore && <span style={s.loreToggle}>{isOpen ? '▾' : '▸'}</span>}
                </div>
                <div style={s.stats}>
                  HP {Math.round(m.hp * mul.hp)} / ATK {Math.round(m.atk * mul.atk)}
                </div>
                {lore && <div style={s.epithet}>「{lore.epithet}」</div>}
                {isOpen && lore && (
                  <div style={s.loreBody}>{lore.body}</div>
                )}
              </button>
              {isMax ? (
                <div style={s.maxLabel}>MAX</div>
              ) : (
                <button
                  style={{
                    ...s.upBtn,
                    ...(canAfford ? {} : s.upBtnDisabled),
                  }}
                  disabled={!canAfford}
                  onClick={() => enhanceCard(m.id, m.rarity)}
                >
                  💎 {cost}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { position: 'absolute', inset: 0, background: '#0a0820', color: '#FFEAA7', padding: 12, overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  back: { background: 'transparent', border: '1px solid #4a3a6e', color: '#FFEAA7', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', letterSpacing: 4, color: '#7BC67E', textAlign: 'center' },
  stones: { fontSize: 12, color: '#FDCB6E', minWidth: 60, textAlign: 'right' },
  hint: { fontSize: 10, color: '#bbb', marginBottom: 10, padding: '6px 8px', background: 'rgba(20,12,42,0.6)', borderRadius: 4 },
  list: { display: 'flex', flexDirection: 'column', gap: 4 },
  row: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: 8, background: 'rgba(30,20,60,0.5)', border: '1px solid #4a3a6e', borderRadius: 4 },
  info: { flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: 'inherit', textAlign: 'left', padding: 0, cursor: 'pointer', fontFamily: 'inherit' },
  name: { fontSize: 12, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 },
  lv: { fontSize: 10, color: '#7BC67E', marginLeft: 6 },
  loreToggle: { fontSize: 10, color: '#a55eea', marginLeft: 'auto' },
  stats: { fontSize: 9, color: '#bbb', marginTop: 2 },
  epithet: { fontSize: 9, color: '#FDCB6E', marginTop: 2, fontStyle: 'italic' },
  loreBody: { fontSize: 9, color: '#ddd', marginTop: 6, lineHeight: 1.5, padding: 6, background: 'rgba(0,0,0,0.3)', borderLeft: '2px solid #FD79A8', borderRadius: 2 },
  upBtn: { background: '#7B2D8E', border: '1px solid #FD79A8', color: '#fff', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, minWidth: 80 },
  upBtnDisabled: { opacity: 0.4, cursor: 'not-allowed', background: '#333' },
  maxLabel: { fontSize: 11, color: '#FDCB6E', fontWeight: 'bold', minWidth: 80, textAlign: 'center' },
};
