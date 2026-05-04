import { useEffect, useRef, useState } from 'react';

/**
 * 인트로 컷씬 (W1 리워크 — 8패널, 약 14초, skip 가능)
 * 세계관: 1대 마왕 봉인 → 천 년 후 → 예언 → 인간 왕의 결정 → 깨어남 → 손을 들다.
 *
 * 데이터: src/game/data/lore.ts (LORE_SHORT) 와 톤 정합.
 */
const FRAMES: { text: string; sub?: string; bg: string; icon: string; dur: number }[] = [
  {
    text: '— 천 년 전 —',
    sub: '1대 마왕 〈므렐〉이\n일곱 빛의 사도에게 봉인되었다.',
    bg: 'radial-gradient(circle, #1a0c30 0%, #000 80%)',
    icon: '🌑',
    dur: 1800,
  },
  {
    text: '인간의 천 년',
    sub: '마왕성은 신전이 되었다.\n사제들은 무엇을 감시하는지 잊었다.',
    bg: 'radial-gradient(circle, #3a2d5c 0%, #05030f 70%)',
    icon: '⛪',
    dur: 1800,
  },
  {
    text: '— 예언 —',
    sub: '"세 번째 달이 차면\n어둠이 한 사람의 몸으로 돌아온다."',
    bg: 'radial-gradient(circle, #FDCB6E 0%, #05030f 80%)',
    icon: '🌙',
    dur: 1900,
  },
  {
    text: '인간 왕의 결정',
    sub: '"깨어나기 전에 죽인다."',
    bg: 'radial-gradient(circle, #D63031 0%, #05030f 70%)',
    icon: '👑',
    dur: 1700,
  },
  {
    text: '그날 밤',
    sub: '당신은 자신이 누구인지\n모르는 채 마왕성에서 깨어났다.',
    bg: 'radial-gradient(circle, #2D1B4E 0%, #05030f 70%)',
    icon: '🦇',
    dur: 1900,
  },
  {
    text: '강철 발소리',
    sub: '횃불 아래\n인간 군대가 진군해온다.',
    bg: 'radial-gradient(circle, #3a0d0d 0%, #05030f 70%)',
    icon: '⚔',
    dur: 1700,
  },
  {
    text: '당신은 손을 들었다',
    sub: '어둠이 모여들었다.\n그것이 시작이었다.',
    bg: 'radial-gradient(circle, #7B2D8E 0%, #05030f 70%)',
    icon: '🖤',
    dur: 1900,
  },
  {
    text: '운명의 카드를 펼쳐라',
    sub: '— 마왕 디펜스 —',
    bg: 'radial-gradient(circle, #FD79A8 0%, #1a0c30 70%)',
    icon: '🎴',
    dur: 1600,
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
      <div style={styles.skipHint}>탭하여 건너뛰기 →</div>
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
