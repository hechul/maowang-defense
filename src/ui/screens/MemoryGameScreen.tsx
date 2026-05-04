import { useEffect, useMemo, useState } from 'react';
import { useSaveStore } from '../../store/useSaveStore';

interface Props { onBack: () => void }

const ICONS = ['🦇', '👑', '🌑', '⚔', '🔮', '☄', '🌸', '❄'];
const PAIRS = 8;  // 8쌍 = 16 카드

interface Card {
  id: number;
  icon: string;
  flipped: boolean;
  matched: boolean;
}

/**
 * 카드 뒤집기 미니 게임 — 매일 1회 영혼석 보상.
 * 광고 시청 시 추가 1회. 무과금 친화.
 */
export function MemoryGameScreen({ onBack }: Props) {
  const addStones = useSaveStore((s) => s.addStones);
  const addTodaysAttempt = useSaveStore((s) => (s as any).bumpMiniGameAttempts || (() => {}));
  const todayAttempts = useSaveStore((s) => (s as any).miniGameAttempts || { date: '', count: 0 });
  const today = new Date().toISOString().slice(0, 10);
  const remaining = 1 - (todayAttempts.date === today ? todayAttempts.count : 0);

  const [cards, setCards] = useState<Card[]>(() => initBoard());
  const [flippedIdx, setFlippedIdx] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [reward, setReward] = useState(0);

  function initBoard(): Card[] {
    const items: Card[] = [];
    let id = 0;
    for (let i = 0; i < PAIRS; i++) {
      const icon = ICONS[i % ICONS.length];
      items.push({ id: id++, icon, flipped: false, matched: false });
      items.push({ id: id++, icon, flipped: false, matched: false });
    }
    // 셔플
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  const allMatched = useMemo(() => cards.every((c) => c.matched), [cards]);

  useEffect(() => {
    if (allMatched && !done) {
      setDone(true);
      const r = Math.max(50, 200 - moves * 5);  // moves가 적을수록 더 큰 보상
      setReward(r);
      addStones(r);
      addTodaysAttempt();
    }
  }, [allMatched]);

  const handleFlip = (idx: number) => {
    if (remaining <= 0 && !done) return;
    if (cards[idx].flipped || cards[idx].matched) return;
    if (flippedIdx.length >= 2) return;

    const nextCards = [...cards];
    nextCards[idx] = { ...nextCards[idx], flipped: true };
    setCards(nextCards);

    const nextFlipped = [...flippedIdx, idx];
    setFlippedIdx(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = nextFlipped;
      if (nextCards[a].icon === nextCards[b].icon) {
        // 매치
        setTimeout(() => {
          setCards((cs) => cs.map((c, i) => i === a || i === b ? { ...c, matched: true } : c));
          setFlippedIdx([]);
        }, 300);
      } else {
        // 뒤집기
        setTimeout(() => {
          setCards((cs) => cs.map((c, i) => i === a || i === b ? { ...c, flipped: false } : c));
          setFlippedIdx([]);
        }, 800);
      }
    }
  };

  const restart = () => {
    setCards(initBoard());
    setFlippedIdx([]);
    setMoves(0);
    setDone(false);
    setReward(0);
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.back} onClick={onBack}>← 뒤로</button>
        <div style={s.title}>카드 뒤집기</div>
        <div style={s.attempts}>오늘 {remaining}/1</div>
      </div>

      <div style={s.info}>
        같은 아이콘 페어를 — 모두 — 맞추면 — 영혼석 보상.
        시도가 적을수록 — 보상이 — 큽니다.
      </div>

      {remaining <= 0 && !done && (
        <div style={s.exhausted}>
          오늘 시도를 모두 사용했습니다. 내일 다시!
        </div>
      )}

      <div style={s.stats}>
        <span>시도: {moves}</span>
        <span>매치: {cards.filter((c) => c.matched).length / 2} / {PAIRS}</span>
      </div>

      <div style={s.board}>
        {cards.map((card, idx) => (
          <button
            key={card.id}
            style={{
              ...s.card,
              ...(card.matched ? s.cardMatched : {}),
              ...(card.flipped ? s.cardFlipped : {}),
            }}
            onClick={() => handleFlip(idx)}
            disabled={card.matched || card.flipped || flippedIdx.length >= 2}
          >
            {(card.flipped || card.matched) ? card.icon : '?'}
          </button>
        ))}
      </div>

      {done && (
        <div style={s.result}>
          <div style={s.resultTitle}>🎉 클리어!</div>
          <div style={s.resultStats}>{moves} 시도 / 영혼석 +{reward}</div>
          <button style={s.restartBtn} onClick={restart}>다시 시도 (시도 사용 X)</button>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { position: 'absolute', inset: 0, background: '#0a0820', color: '#FFEAA7', padding: 12, overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  back: { background: 'transparent', border: '1px solid #4a3a6e', color: '#FFEAA7', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', letterSpacing: 4, color: '#FD79A8', textAlign: 'center' },
  attempts: { fontSize: 10, color: '#FDCB6E', minWidth: 60, textAlign: 'right' },
  info: { padding: 8, fontSize: 10, background: 'rgba(20,12,42,0.6)', borderRadius: 4, marginBottom: 8, lineHeight: 1.5 },
  exhausted: { padding: 10, fontSize: 11, background: 'rgba(255,107,107,0.2)', border: '1px solid #FF6B6B', borderRadius: 4, marginBottom: 8, textAlign: 'center' },
  stats: { display: 'flex', justifyContent: 'space-around', padding: '6px 0', fontSize: 11, color: '#a55eea', marginBottom: 8 },
  board: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 },
  card: { aspectRatio: '1', background: 'linear-gradient(180deg,#7B2D8E,#3a2d5c)', border: '2px solid #4a3a6e', borderRadius: 6, color: '#FFEAA7', fontSize: 22, cursor: 'pointer', fontFamily: 'inherit' },
  cardFlipped: { background: 'rgba(20,12,42,0.7)', borderColor: '#FDCB6E' },
  cardMatched: { background: 'rgba(123,198,126,0.3)', borderColor: '#7BC67E', cursor: 'default', opacity: 0.85 },
  result: { marginTop: 14, padding: 14, background: 'rgba(123,198,126,0.15)', border: '2px solid #7BC67E', borderRadius: 6, textAlign: 'center' },
  resultTitle: { fontSize: 16, fontWeight: 'bold', color: '#FDCB6E' },
  resultStats: { fontSize: 11, color: '#FFEAA7', marginTop: 6 },
  restartBtn: { marginTop: 10, padding: '8px 16px', background: '#7B2D8E', border: '1px solid #FD79A8', color: '#fff', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
};
