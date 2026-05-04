import { useState } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import * as Ait from '../../sdk/AitBridge';

interface Props { onBack: () => void }

const NICKNAMES = ['망령군', '심연자', '진홍왕', '암흑백작', '서리주', '그림자', '잿빛군주', '운명자'];

/**
 * P1-2 친구 시스템 — 친구 코드 기반 추가/방문/우정 포인트.
 * 실 SDK 연동 전 mock — 임의 닉네임 자동 생성.
 */
export function FriendsScreen({ onBack }: Props) {
  const friends = useSaveStore((s) => s.friends);
  const myCode = useSaveStore((s) => s.myFriendCode);
  const friendshipPoints = useSaveStore((s) => s.friendshipPoints);
  const addFriend = useSaveStore((s) => s.addFriend);
  const removeFriend = useSaveStore((s) => s.removeFriend);
  const claimFriendVisit = useSaveStore((s) => s.claimFriendVisit);
  const friendVisitRewards = useSaveStore((s) => s.friendVisitRewards);
  const today = new Date().toISOString().slice(0, 10);

  const [input, setInput] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const handleAdd = () => {
    const code = input.trim().toUpperCase();
    if (code.length < 4) {
      setMsg('친구 코드는 4자 이상');
      return;
    }
    const nickname = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)] + (Math.floor(Math.random() * 99) + 1);
    const ok = addFriend(code, nickname);
    if (ok) {
      setInput('');
      setMsg(`${nickname} 추가됨`);
    } else {
      setMsg('이미 친구이거나 잘못된 코드입니다.');
    }
  };

  const handleVisit = (code: string, nickname: string) => {
    const reward = claimFriendVisit(code);
    if (reward > 0) {
      setMsg(`${nickname}의 마왕성 방문 — 영혼석 +${reward}, 우정 +10`);
      Ait.haptic('light');
    } else {
      setMsg(`오늘은 ${nickname}을 이미 방문했습니다.`);
    }
  };

  const handleShareCode = async () => {
    try {
      await Ait.shareToFeed(`내 마왕성 코드: ${myCode} — 함께 어둠을 키우자!`);
      setMsg('내 코드를 공유했습니다.');
    } catch (e) {
      setMsg('공유 실패');
    }
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.back} onClick={onBack}>← 뒤로</button>
        <div style={s.title}>친구</div>
        <div style={s.points}>💜 {friendshipPoints}</div>
      </div>

      <div style={s.myCard}>
        <div style={s.myLabel}>내 친구 코드</div>
        <div style={s.myCode}>{myCode}</div>
        <button style={s.shareBtn} onClick={handleShareCode}>📤 코드 공유</button>
      </div>

      <div style={s.addBox}>
        <input
          style={s.input}
          placeholder="친구 코드 입력 (예: A4B5K2)"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          maxLength={8}
        />
        <button style={s.addBtn} onClick={handleAdd}>추가</button>
      </div>

      {msg && <div style={s.msg}>{msg}</div>}

      <div style={s.listLabel}>친구 ({friends.length}/30)</div>
      {friends.length === 0 ? (
        <div style={s.empty}>친구를 추가하면 매일 방문 보상을 받을 수 있습니다.</div>
      ) : (
        <div style={s.list}>
          {friends.map((f) => {
            const claimed = friendVisitRewards[f.code] === today;
            return (
              <div key={f.code} style={s.item}>
                <div style={s.itemMain}>
                  <div style={s.itemNick}>{f.nickname}</div>
                  <div style={s.itemMeta}>{f.code} · LV.{f.demonLevel} · W{f.bestWave}</div>
                </div>
                <button
                  style={{ ...s.visitBtn, ...(claimed ? s.visitBtnDone : {}) }}
                  onClick={() => handleVisit(f.code, f.nickname)}
                >
                  {claimed ? '✓ 방문 완료' : '방문'}
                </button>
                <button style={s.delBtn} onClick={() => removeFriend(f.code)}>×</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={s.notice}>
        💡 매일 친구 한 명당 1회 방문 보상 (영혼석 +30, 우정 +10).
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { position: 'absolute', inset: 0, background: '#0a0820', color: '#FFEAA7', padding: 12, overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  back: { background: 'transparent', border: '1px solid #4a3a6e', color: '#FFEAA7', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', letterSpacing: 4, color: '#FD79A8', textAlign: 'center' },
  points: { fontSize: 12, color: '#a55eea', minWidth: 60, textAlign: 'right' },
  myCard: { background: 'linear-gradient(180deg,rgba(123,45,142,0.4),rgba(20,12,42,0.5))', border: '2px solid #FD79A8', borderRadius: 6, padding: 12, marginBottom: 10, textAlign: 'center' },
  myLabel: { fontSize: 9, color: '#a55eea', letterSpacing: 2 },
  myCode: { fontSize: 24, fontWeight: 'bold', letterSpacing: 6, color: '#FDCB6E', marginTop: 6, fontFamily: 'monospace' },
  shareBtn: { marginTop: 8, padding: '6px 14px', background: '#7B2D8E', border: '1px solid #FD79A8', color: '#fff', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 },
  addBox: { display: 'flex', gap: 6, marginBottom: 10 },
  input: { flex: 1, padding: '8px 10px', background: 'rgba(20,12,42,0.7)', border: '1px solid #4a3a6e', color: '#FFEAA7', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, letterSpacing: 2 },
  addBtn: { padding: '8px 16px', background: '#7BC67E', border: '1px solid #FDCB6E', color: '#fff', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' },
  msg: { padding: 8, background: 'rgba(253,203,110,0.15)', border: '1px solid #FDCB6E', borderRadius: 4, fontSize: 10, color: '#FDCB6E', marginBottom: 10 },
  listLabel: { fontSize: 10, color: '#a55eea', letterSpacing: 2, fontWeight: 'bold', marginBottom: 6 },
  empty: { textAlign: 'center', padding: 24, color: '#888', fontSize: 11 },
  list: { display: 'flex', flexDirection: 'column', gap: 4 },
  item: { display: 'flex', alignItems: 'center', gap: 6, padding: 8, background: 'rgba(30,20,60,0.7)', border: '1px solid #4a3a6e', borderRadius: 4 },
  itemMain: { flex: 1, minWidth: 0 },
  itemNick: { fontSize: 12, fontWeight: 'bold', color: '#FFEAA7' },
  itemMeta: { fontSize: 9, color: '#bbb', marginTop: 2 },
  visitBtn: { background: '#7B2D8E', border: '1px solid #FD79A8', color: '#fff', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10 },
  visitBtnDone: { background: '#444', borderColor: '#666', opacity: 0.6 },
  delBtn: { background: 'transparent', border: '1px solid #4a3a6e', color: '#888', padding: '5px 8px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 },
  notice: { marginTop: 12, padding: 8, fontSize: 9, color: '#888', background: 'rgba(20,12,42,0.5)', borderRadius: 4 },
};
