import { useEffect } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { progressInLevel } from '../../game/data/demonLevel';
import { DEMON_CHARS, isDemonUnlocked } from '../../game/data/demonChars';

interface Props { onBack: () => void }

/**
 * P1-3 마왕 캐릭터 선택 — 4종.
 * 잠금 해제 조건 자동 평가, 선택 영구 저장.
 */
export function DemonSelectScreen({ onBack }: Props) {
  const demonExp = useSaveStore((s) => s.demonExp);
  const totalBossKills = useSaveStore((s) => s.totalBossKills);
  const purchasedSkus = useSaveStore((s) => s.iap.purchasedSkus);
  const selectedDemonId = useSaveStore((s) => s.selectedDemonId);
  const unlockedDemons = useSaveStore((s) => s.unlockedDemons);
  const selectDemon = useSaveStore((s) => s.selectDemon);
  const unlockDemon = useSaveStore((s) => s.unlockDemon);

  const lvProg = progressInLevel(demonExp);

  // 진입 시 자동 잠금 해제 평가 — 조건 충족 시 unlockedDemons에 자동 추가
  useEffect(() => {
    for (const d of DEMON_CHARS) {
      if (!unlockedDemons.includes(d.id) && isDemonUnlocked(d, {
        demonLevel: lvProg.level,
        totalBossKills,
        purchasedSkus,
      })) {
        unlockDemon(d.id);
      }
    }
  }, [lvProg.level, totalBossKills, purchasedSkus.length]);

  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.back} onClick={onBack}>← 뒤로</button>
        <div style={s.title}>마왕 선택</div>
        <div style={s.lvLabel}>LV.{lvProg.level}</div>
      </div>

      <div style={s.list}>
        {DEMON_CHARS.map((d) => {
          const unlocked = unlockedDemons.includes(d.id);
          const selected = selectedDemonId === d.id;
          return (
            <button
              key={d.id}
              style={{
                ...s.card,
                ...(selected ? s.selected : {}),
                ...(unlocked ? {} : s.locked),
              }}
              disabled={!unlocked}
              onClick={() => unlocked && selectDemon(d.id)}
            >
              <div style={s.row1}>
                <div style={s.name}>{d.name}</div>
                {selected && <div style={s.tag}>선택중</div>}
                {!unlocked && <div style={s.lockTag}>🔒 {d.unlockLabel}</div>}
              </div>
              <div style={s.subtitle}>"{d.title}"</div>
              <div style={s.desc}>{d.desc}</div>
              <div style={s.starters}>시작 카드: {d.starterCardIds.join(', ')}</div>
              <div style={s.line}>"{d.introLine}"</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { position: 'absolute', inset: 0, background: '#0a0820', color: '#FFEAA7', padding: 12, overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  back: { background: 'transparent', border: '1px solid #4a3a6e', color: '#FFEAA7', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', letterSpacing: 4, color: '#a55eea', textAlign: 'center' },
  lvLabel: { fontSize: 11, color: '#FDCB6E', minWidth: 50, textAlign: 'right' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  card: {
    background: 'rgba(30,20,60,0.7)', border: '2px solid #4a3a6e', borderRadius: 6,
    padding: 10, color: '#FFEAA7', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
  },
  selected: { borderColor: '#FDCB6E', boxShadow: '0 0 10px rgba(253,203,110,0.4)' },
  locked: { opacity: 0.5, cursor: 'not-allowed' },
  row1: { display: 'flex', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 14, fontWeight: 'bold', color: '#FD79A8' },
  tag: { fontSize: 9, color: '#FDCB6E', background: 'rgba(253,203,110,0.15)', padding: '2px 6px', borderRadius: 4 },
  lockTag: { fontSize: 9, color: '#FF6B6B' },
  subtitle: { fontSize: 10, color: '#a55eea', fontStyle: 'italic', marginTop: 2 },
  desc: { fontSize: 11, color: '#FFEAA7', marginTop: 6, lineHeight: 1.4 },
  starters: { fontSize: 9, color: '#bbb', marginTop: 4 },
  line: { fontSize: 10, color: '#7BC67E', marginTop: 6, fontStyle: 'italic' },
};
