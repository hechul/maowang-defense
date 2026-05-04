import { useMemo } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { todaysSideQuests } from '../../game/data/dailySideQuests';
import { getNpc } from '../../game/data/npcs';

interface Props { onClose: () => void }

/**
 * 일일 NPC 사이드 퀘 모달 — 매일 3종.
 */
export function DailyQuestModal({ onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const sideQuestProgress = useSaveStore((s) => s.sideQuestProgress);
  const claimSideQuest = useSaveStore((s) => s.claimSideQuest);
  const quests = useMemo(() => todaysSideQuests(), []);

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.card} onClick={(e) => e.stopPropagation()}>
        <div style={s.head}>
          <span style={s.title}>오늘의 — 사이드 퀘</span>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>
        <div style={s.list}>
          {quests.map((q) => {
            const npc = getNpc(q.npcId);
            const cur = sideQuestProgress[q.id];
            const isToday = cur && cur.date === today;
            const progress = isToday ? cur.progress : 0;
            const claimed = isToday && cur.claimed;
            const done = progress >= q.goalValue;
            return (
              <div key={q.id} style={{ ...s.quest, borderColor: npc.accent }}>
                <div style={s.questHead}>
                  <span style={s.questIcon}>{npc.icon}</span>
                  <span style={{ ...s.questNpc, color: npc.accent }}>{npc.name}</span>
                  <span style={s.questReward}>💎 +{q.rewardStones}  ❤ +{q.rewardAffinity}</span>
                </div>
                <div style={s.questLine}>{q.label}</div>
                <div style={s.questDesc}>{q.description}</div>
                <div style={s.bar}>
                  <div style={{ ...s.barFill, width: `${Math.min(100, (progress / q.goalValue) * 100)}%`, background: npc.accent }} />
                </div>
                <div style={s.barLabel}>{progress} / {q.goalValue}</div>
                <button
                  disabled={!done || claimed}
                  onClick={() => claimSideQuest(q.id, q.rewardStones, q.rewardAffinity, q.npcId)}
                  style={{
                    ...s.claimBtn,
                    background: claimed ? '#444' : done ? npc.accent : 'rgba(60,60,60,0.5)',
                    cursor: done && !claimed ? 'pointer' : 'not-allowed',
                  }}
                >
                  {claimed ? '✓ 수령 완료' : done ? '🎁 수령' : '진행 중'}
                </button>
              </div>
            );
          })}
        </div>
        <div style={s.footer}>매일 자정 — 새 사이드 퀘.</div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 },
  card: { background: 'linear-gradient(180deg,#1a0c30,#0a0820)', border: '2px solid #4a3a6e', borderRadius: 8, padding: 12, maxWidth: 360, maxHeight: '85vh', overflow: 'auto', color: '#FFEAA7' },
  head: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { flex: 1, fontSize: 14, fontWeight: 'bold', color: '#FD79A8', letterSpacing: 2 },
  close: { background: 'transparent', border: '1px solid #4a3a6e', color: '#888', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  quest: { padding: 10, background: 'rgba(20,12,42,0.7)', border: '1.5px solid', borderRadius: 6 },
  questHead: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  questIcon: { fontSize: 16 },
  questNpc: { flex: 1, fontSize: 11, fontWeight: 'bold' },
  questReward: { fontSize: 9, color: '#FDCB6E' },
  questLine: { fontSize: 11, fontStyle: 'italic', color: '#FFEAA7', marginTop: 4 },
  questDesc: { fontSize: 10, color: '#bbb', marginTop: 4 },
  bar: { height: 6, background: 'rgba(0,0,0,0.5)', border: '1px solid #4a3a6e', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', transition: 'width 0.3s' },
  barLabel: { fontSize: 9, color: '#a55eea', textAlign: 'right', marginTop: 2 },
  claimBtn: { width: '100%', marginTop: 6, padding: '6px', border: 'none', color: '#fff', borderRadius: 4, fontFamily: 'inherit', fontSize: 11, fontWeight: 'bold' },
  footer: { fontSize: 9, color: '#888', textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
};
