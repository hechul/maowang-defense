import { useEffect, useRef, useState } from 'react';

/**
 * 인트로 컷씬 — MVP에서는 첫 플레이까지의 시간을 짧게 유지한다.
 * 세계관: 1대 마왕 봉인 → 인간 왕의 선제 공격 → 깨어남 → 카드 디펜스.
 *
 * 데이터: src/game/data/lore.ts (LORE_SHORT) 와 톤 정합.
 */
const FRAMES: { text: string; sub?: string; bg: string; icon: string; dur: number }[] = [
  {
    text: '— 천 년 전 —',
    sub: '1대 마왕 〈므렐〉이\n일곱 빛의 사도에게 봉인되었다.',
    bg: 'radial-gradient(circle, #1a0c30 0%, #000 80%)',
    icon: '🌑',
    dur: 1500,
  },
  {
    text: '인간 왕의 결정',
    sub: '"깨어나기 전에 죽인다."\n횃불 아래 인간 군대가 진군한다.',
    bg: 'radial-gradient(circle, #D63031 0%, #05030f 70%)',
    icon: '👑',
    dur: 1600,
  },
  {
    text: '그날 밤, 깨어났다',
    sub: '당신은 자신이 누구인지\n모르는 채 마왕성에서 깨어났다.',
    bg: 'radial-gradient(circle, #2D1B4E 0%, #05030f 70%)',
    icon: '🦇',
    dur: 1600,
  },
  {
    text: '운명의 카드를 펼쳐라',
    sub: '몬스터를 소환해\n마왕성을 지켜라.',
    bg: 'radial-gradient(circle, #FD79A8 0%, #1a0c30 70%)',
    icon: '🎴',
    dur: 1500,
  },
];

export function IntroCutscene({ onDone }: { onDone: () => void }) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [fading, setFading] = useState(false);
  // BUG-009: onDone 1회만 호출되도록 ref 가드
  const doneRef = useRef(false);
  const fireDone = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    if (frameIdx >= FRAMES.length) {
      fireDone();
      return;
    }
    const f = FRAMES[frameIdx];
    const t1 = setTimeout(() => setFading(true), f.dur - 400);
    const t2 = setTimeout(() => {
      setFading(false);
      setFrameIdx((i) => i + 1);
    }, f.dur);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [frameIdx]);

  if (frameIdx >= FRAMES.length) return null;
  const frame = FRAMES[frameIdx];

  return (
    <div
      style={{ ...styles.root, background: frame.bg }}
      onClick={fireDone}
    >
      <div style={{ ...styles.content, opacity: fading ? 0 : 1 }}>
        <div style={styles.icon}>{frame.icon}</div>
        <h1 style={styles.text}>{frame.text}</h1>
        {frame.sub && <div style={styles.sub}>{frame.sub}</div>}
      </div>
      <div style={styles.skipHint}>탭하면 바로 시작 →</div>
      <div style={styles.progress}>
        {FRAMES.map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.progressDot,
              ...(i === frameIdx ? styles.progressDotActive : {}),
              ...(i < frameIdx ? styles.progressDotDone : {}),
            }}
          />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0, zIndex: 9999,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.4s',
  },
  content: {
    textAlign: 'center',
    padding: '0 24px',
    transition: 'opacity 0.4s',
    animation: 'introFadeIn 0.6s ease-out',
  },
  icon: {
    fontSize: 72, marginBottom: 18,
    filter: 'drop-shadow(0 0 20px rgba(253,203,110,0.5))',
  },
  text: {
    color: '#FFEAA7', fontSize: 22, fontWeight: 'bold',
    letterSpacing: 3, marginBottom: 12,
    textShadow: '2px 2px 0 #000, 0 0 16px #FDCB6E',
  },
  sub: {
    color: '#bbb', fontSize: 13, lineHeight: 1.6,
    letterSpacing: 1,
    textShadow: '1px 1px 0 #000',
    whiteSpace: 'pre-line',
  },
  skipHint: {
    position: 'absolute', bottom: 20, right: 16,
    color: '#666', fontSize: 11, letterSpacing: 1,
  },
  progress: {
    position: 'absolute', bottom: 20, left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex', gap: 6,
  },
  progressDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    transition: 'all 0.3s',
  },
  progressDotActive: {
    background: '#FDCB6E',
    boxShadow: '0 0 6px #FDCB6E',
  },
  progressDotDone: {
    background: '#FDCB6E',
    opacity: 0.5,
  },
};
