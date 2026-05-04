import { useEffect, useState } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { Audio } from '../../audio/AudioEngine';
import * as Ait from '../../sdk/AitBridge';

/**
 * 일일 출석 보상 — AIT_SENIOR_DEV §전략3 D1~D30 리텐션
 * 7일 cycle: 10/20/30/50/75/100/200(전설)
 * 매일 자정 갱신, 어제 받았으면 streak 유지, 더 오래되면 리셋.
 */
const REWARD_TABLE = [10, 20, 30, 50, 75, 100, 200];

export function AttendanceModal({ onClose }: { onClose: () => void }) {
  const attendance = useSaveStore((s) => s.attendance);
  const claimAttendance = useSaveStore((s) => s.claimAttendance);
  const [claimed, setClaimed] = useState<{ streak: number; reward: number } | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const alreadyClaimed = attendance.lastDate === today;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streakContinues = attendance.lastDate === yesterday || attendance.lastDate === today;
  const todayStreak = alreadyClaimed
    ? attendance.streak
    : streakContinues ? attendance.streak + 1 : 1;
  const todayReward = REWARD_TABLE[(todayStreak - 1) % 7];

  const handleClaim = () => {
    if (alreadyClaimed) return;
    const result = claimAttendance();
    if (result) {
      setClaimed(result);
      Audio.relic_sfx();
      Ait.haptic('medium');
    }
  };

  return (
    // BUG-016: 보상 받지 않은 상태에서 backdrop 클릭은 닫히지 않음 (alreadyClaimed면 닫기 허용)
    <div style={styles.backdrop} onClick={alreadyClaimed ? onClose : undefined}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>일일 출석</h2>
        <div style={styles.streakInfo}>
          연속 출석 <span style={styles.streakNum}>{todayStreak}</span>일째
        </div>
        <div style={styles.calendar}>
          {REWARD_TABLE.map((reward, i) => {
            const dayN = i + 1;
            const isToday = dayN === ((todayStreak - 1) % 7) + 1;
            const isPast = !alreadyClaimed && dayN < ((todayStreak - 1) % 7) + 1;
            const isClaimed = alreadyClaimed && dayN <= ((todayStreak - 1) % 7) + 1;
            return (
              <div
                key={i}
                style={{
                  ...styles.day,
                  ...(isToday ? styles.dayToday : {}),
                  ...(isPast || isClaimed ? styles.dayPast : {}),
                  ...(dayN === 7 ? styles.daySpecial : {}),
                }}
              >
                <div style={styles.dayLabel}>Day {dayN}</div>
                <div style={styles.dayReward}>
                  {dayN === 7 ? '🌟' : '💎'} {reward}
                </div>
                {isPast || isClaimed ? <div style={styles.dayCheck}>✓</div> : null}
              </div>
            );
          })}
        </div>
        {!claimed ? (
          <button
            style={{ ...styles.btn, ...(alreadyClaimed ? styles.btnDisabled : {}) }}
            onClick={alreadyClaimed ? onClose : handleClaim}
            disabled={false}
          >
            {alreadyClaimed ? '오늘 이미 받음' : `오늘 보상 받기 (+${todayReward} 영혼석)`}
          </button>
        ) : (
          <div style={styles.celebration}>
            <div style={styles.celebrationText}>+{claimed.reward} 영혼석!</div>
            <button style={styles.btn} onClick={onClose}>확인</button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(5,3,15,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 250,
  },
  card: {
    background: 'linear-gradient(180deg,#241a3e,#15102a)',
    border: '2px solid #FDCB6E', borderRadius: 8,
    padding: 18, maxWidth: 320, width: '92%',
    boxShadow: '0 0 30px rgba(253,203,110,0.4)',
  },
  title: {
    color: '#FFEAA7', fontSize: 20, letterSpacing: 3,
    textAlign: 'center', marginBottom: 8,
    textShadow: '2px 2px 0 #000',
  },
  streakInfo: { textAlign: 'center', color: '#FD79A8', fontSize: 12, marginBottom: 14 },
  streakNum: { color: '#FFEAA7', fontSize: 18, fontWeight: 'bold', marginRight: 4 },
  calendar: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
    marginBottom: 14,
  },
  day: {
    aspectRatio: '1', background: 'rgba(20,12,42,0.7)',
    border: '1px solid #4a3a6e', borderRadius: 4,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 9, position: 'relative',
  },
  dayToday: { borderColor: '#FDCB6E', background: '#2a1745', boxShadow: '0 0 8px rgba(253,203,110,0.5)' },
  dayPast: { background: 'rgba(45,27,78,0.4)', borderColor: '#7B2D8E' },
  daySpecial: { borderColor: '#FD79A8' },
  dayLabel: { color: '#bbb', fontSize: 8, fontWeight: 'bold' },
  dayReward: { color: '#FDCB6E', fontSize: 9, marginTop: 2 },
  dayCheck: { position: 'absolute', top: 1, right: 2, color: '#26de81', fontSize: 12, fontWeight: 'bold' },
  btn: {
    width: '100%', padding: 10,
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '2px solid #FDCB6E', borderRadius: 5,
    color: '#fff', fontWeight: 'bold', fontSize: 13,
    boxShadow: '0 3px 0 #4a0a0a', cursor: 'pointer',
    fontFamily: 'inherit', letterSpacing: 1,
  },
  btnDisabled: {
    background: '#3a3a4a', borderColor: '#555', color: '#aaa',
    boxShadow: '0 3px 0 #15102a', cursor: 'default',
  },
  celebration: { textAlign: 'center' },
  celebrationText: {
    color: '#FDCB6E', fontSize: 22, fontWeight: 'bold',
    marginBottom: 12, textShadow: '2px 2px 0 #000',
    animation: 'celebPulse 0.5s',
  },
};
