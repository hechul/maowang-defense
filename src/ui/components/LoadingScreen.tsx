/**
 * 코드 스플리팅용 로딩 화면 — Suspense fallback
 * 짧은 시간만 보이므로 가볍게
 */
export function LoadingScreen() {
  return (
    <div style={styles.root}>
      <div style={styles.text}>로딩 중...</div>
      <div style={styles.dots}>
        <span style={{ ...styles.dot, animationDelay: '0s' }} />
        <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
        <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
      </div>
      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'rgba(5,3,15,0.95)',
  },
  text: {
    color: '#FD79A8', fontWeight: 'bold', fontSize: 14,
    letterSpacing: 3, marginBottom: 14,
  },
  dots: { display: 'flex', gap: 6 },
  dot: {
    width: 10, height: 10, background: '#FDCB6E',
    borderRadius: '50%',
    animation: 'dotPulse 1.4s infinite ease-in-out',
  },
};
