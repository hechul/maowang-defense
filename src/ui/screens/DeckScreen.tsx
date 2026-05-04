import { useMemo, useState } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { MONSTERS } from '../../game/data/monsters';

interface Props { onBack: () => void }

const DECK_MAX = 6;

/**
 * P0-6 내 덱 — 모집된 카드 중 시작 풀 6장 선택.
 * 빈 배열이면 '전체 모집된 카드' 사용 (기본 동작과 동일).
 */
export function DeckScreen({ onBack }: Props) {
  const recruited = useSaveStore((s) => s.recruitedMonsterIds);
  const selectedDeck = useSaveStore((s) => s.selectedDeck);
  const setSelectedDeck = useSaveStore((s) => s.setSelectedDeck);
  const cardLevels = useSaveStore((s) => s.cardLevels);
  const [draft, setDraft] = useState<string[]>(selectedDeck);

  const monsters = useMemo(() => {
    const list = recruited.map((id) => MONSTERS[id]).filter(Boolean);
    return list.sort((a, b) => (a.star ?? 1) - (b.star ?? 1));
  }, [recruited]);

  const toggle = (id: string) => {
    if (draft.includes(id)) {
      setDraft(draft.filter((x) => x !== id));
    } else if (draft.length < DECK_MAX) {
      setDraft([...draft, id]);
    }
  };

  const save = () => {
    setSelectedDeck(draft);
    onBack();
  };

  const useAll = () => {
    setSelectedDeck([]);
    onBack();
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.back} onClick={onBack}>← 뒤로</button>
        <div style={s.title}>내 덱</div>
        <div style={s.count}>{draft.length} / {DECK_MAX}</div>
      </div>

      <div style={s.hint}>
        시작 카드 풀을 직접 구성합니다. 비워두면 모집된 모든 카드가 등장합니다.
      </div>

      <div style={s.grid}>
        {monsters.map((m) => {
          const selected = draft.includes(m.id);
          const lv = cardLevels[m.id] || 0;
          const star = m.star ?? 1;
          return (
            <button
              key={m.id}
              style={{
                ...s.card,
                ...(selected ? s.cardSelected : {}),
              }}
              onClick={() => toggle(m.id)}
            >
              <div style={s.cardStar}>{'★'.repeat(star)}</div>
              <div style={s.cardName}>{m.name}</div>
              <div style={s.cardMeta}>
                HP {m.hp} / ATK {m.atk}
                {lv > 0 && <span style={s.lv}> +{lv}</span>}
              </div>
              {selected && <div style={s.checkmark}>✓</div>}
            </button>
          );
        })}
      </div>

      <div style={s.footer}>
        <button style={s.btnGhost} onClick={useAll}>전체 사용</button>
        <button style={s.btnPrimary} onClick={save}>저장</button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { position: 'absolute', inset: 0, background: '#0a0820', color: '#FFEAA7', padding: 12, overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  back: { background: 'transparent', border: '1px solid #4a3a6e', color: '#FFEAA7', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', letterSpacing: 4, color: '#FD79A8', textAlign: 'center' },
  count: { fontSize: 12, color: '#FDCB6E', minWidth: 50, textAlign: 'right' },
  hint: { fontSize: 10, color: '#bbb', marginBottom: 10, padding: '6px 8px', background: 'rgba(20,12,42,0.6)', borderRadius: 4 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  card: {
    position: 'relative', background: 'rgba(30,20,60,0.7)', border: '2px solid #4a3a6e', borderRadius: 6,
    padding: 8, color: '#FFEAA7', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
  },
  cardSelected: { borderColor: '#FDCB6E', boxShadow: '0 0 8px rgba(253,203,110,0.5)' },
  cardStar: { fontSize: 9, color: '#FDCB6E' },
  cardName: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  cardMeta: { fontSize: 9, color: '#bbb', marginTop: 4 },
  lv: { color: '#7BC67E', marginLeft: 4 },
  checkmark: { position: 'absolute', top: 4, right: 6, color: '#FDCB6E', fontSize: 14, fontWeight: 'bold' },
  footer: { display: 'flex', gap: 6, marginTop: 12 },
  btnGhost: { flex: 1, background: 'transparent', border: '1px solid #4a3a6e', color: '#bbb', padding: '8px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
  btnPrimary: { flex: 2, background: '#7B2D8E', border: '2px solid #FD79A8', color: '#fff', padding: '8px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' },
};
