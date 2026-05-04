import { useState } from 'react';
import type { CutsceneDef } from '../../game/data/cutscenes';

interface Props {
  cutscene: CutsceneDef;
  onDone: () => void;
}

/**
 * P2-1 텍스트 컷씬 오버레이 — 풀스크린, 패널 넘김.
 */
export function CutsceneOverlay({ cutscene, onDone }: Props) {
  const [idx, setIdx] = useState(0);
  const panel = cutscene.panels[idx];
  const isLast = idx >= cutscene.panels.length - 1;

  return (
    <div style={{ ...s.root, background: panel.bg }}>
      <button style={s.skip} onClick={onDone}>건너뛰기</button>

      <div style={s.icon}>{panel.icon}</div>

      {panel.title && (
        <div style={{ ...s.title, color: panel.color ?? '#FDCB6E' }}>{panel.title}</div>
      )}
      <div style={{ ...s.body, color: panel.color ?? '#FFEAA7' }}>
        {panel.body.split('\n').map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      <div style={s.dots}>
        {cutscene.panels.map((_, i) => (
          <div key={i} style={{ ...s.dot, ...(i === idx ? s.dotActive : {}) }} />
        ))}
      </div>

      <button
        style={s.next}
        onClick={() => isLast ? onDone() : setIdx(idx + 1)}
      >
        {isLast ? '닫기 ▶' : '다음 ▶'}
      </button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed', inset: 0, zIndex: 500,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '40px 20px',
    color: '#FFEAA7', fontFamily: 'inherit',
    transition: 'background 0.4s ease',
  },
  skip: { position: 'absolute', top: 'calc(20px + env(safe-area-inset-top, 0))', right: 16, background: 'transparent', border: '1px solid #4a3a6e', color: '#888', padding: '4px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' },
  icon: { fontSize: 80, marginBottom: 24, animation: 'cutsceneIconPulse 2s ease-in-out infinite' },
  title: { fontSize: 28, fontWeight: 'bold', letterSpacing: 4, textShadow: '2px 2px 0 #000', marginBottom: 16 },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 1.8, maxWidth: 320, fontStyle: 'italic', whiteSpace: 'pre-line' },
  dots: { display: 'flex', gap: 6, marginTop: 32 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' },
  dotActive: { background: '#FDCB6E', boxShadow: '0 0 8px rgba(253,203,110,0.6)' },
  next: { position: 'absolute', bottom: 'calc(40px + env(safe-area-inset-bottom, 0))', padding: '10px 24px', background: 'rgba(123,45,142,0.7)', border: '2px solid #FD79A8', color: '#fff', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, fontWeight: 'bold', cursor: 'pointer' },
};
