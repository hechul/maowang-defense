import { useEffect, useMemo } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { rewardLabel } from '../../game/data/mailbox';

interface Props { onBack: () => void }

/**
 * P1-6 우편함 — 시즌/이벤트/시스템 보상 비동기 수령.
 */
export function InboxScreen({ onBack }: Props) {
  const mails = useSaveStore((s) => s.mailbox);
  const claimMail = useSaveStore((s) => s.claimMail);
  const cleanupExpiredMails = useSaveStore((s) => s.cleanupExpiredMails);

  useEffect(() => { cleanupExpiredMails(); }, [cleanupExpiredMails]);

  const sorted = useMemo(() => {
    return mails.slice().sort((a, b) => b.sentAt - a.sentAt);
  }, [mails]);

  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.back} onClick={onBack}>← 뒤로</button>
        <div style={s.title}>우편함</div>
        <div style={s.count}>{mails.length}</div>
      </div>

      {sorted.length === 0 ? (
        <div style={s.empty}>받은 우편이 없습니다.</div>
      ) : (
        <div style={s.list}>
          {sorted.map((m) => {
            const expired = m.expiresAt && m.expiresAt < Date.now();
            return (
              <div key={m.id} style={{ ...s.mail, ...(expired ? s.expired : {}) }}>
                <div style={s.row1}>
                  <div style={s.mailTitle}>{m.title}</div>
                  <div style={s.date}>{new Date(m.sentAt).toLocaleDateString()}</div>
                </div>
                <div style={s.body}>{m.body}</div>
                <div style={s.row2}>
                  <div style={s.reward}>🎁 {rewardLabel(m.reward)}</div>
                  <button
                    style={{ ...s.btn, ...(expired ? s.btnDisabled : {}) }}
                    disabled={!!expired}
                    onClick={() => claimMail(m.id)}
                  >
                    {expired ? '만료' : '수령'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { position: 'absolute', inset: 0, background: '#0a0820', color: '#FFEAA7', padding: 12, overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  back: { background: 'transparent', border: '1px solid #4a3a6e', color: '#FFEAA7', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', letterSpacing: 4, color: '#74B9FF', textAlign: 'center' },
  count: { fontSize: 12, color: '#FDCB6E', minWidth: 30, textAlign: 'right' },
  empty: { textAlign: 'center', padding: 40, color: '#888', fontSize: 11 },
  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  mail: { background: 'rgba(30,20,60,0.7)', border: '1px solid #4a3a6e', borderRadius: 6, padding: 10 },
  expired: { opacity: 0.5 },
  row1: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  mailTitle: { fontSize: 12, fontWeight: 'bold', color: '#74B9FF' },
  date: { fontSize: 9, color: '#888' },
  body: { fontSize: 10, color: '#bbb', marginTop: 4, lineHeight: 1.4 },
  row2: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  reward: { fontSize: 10, color: '#FDCB6E' },
  btn: { background: '#7B2D8E', border: '1px solid #FD79A8', color: '#fff', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 },
  btnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
};
