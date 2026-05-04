import { useMemo, useState } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { NPCS, getNpc, inferContext, pickNpcLine, type NpcId } from '../../game/data/npcs';
import { unlockedSideStories, getNpcSideStories } from '../../game/data/npcSideStories';

interface Props { onBack: () => void }

/**
 * W3 왕좌실 — NPC 4종과 대화. 컨텍스트별로 매번 다른 대사.
 */
export function ThroneRoomScreen({ onBack }: Props) {
  const stones = useSaveStore((s) => s.soulstones);
  const runs = useSaveStore((s) => s.runs);
  const lastPlayedAt = useSaveStore((s) => s.lastPlayedAt);
  const clearedStages = useSaveStore((s) => s.clearedStages);
  const lastClearedStageId = useSaveStore((s) => s.lastClearedStageId);
  const pendingDemonRewards = useSaveStore((s) => s.pendingDemonRewards);
  const npcAffinity = useSaveStore((s) => s.npcAffinity);
  const npcStoriesSeen = useSaveStore((s) => s.npcStoriesSeen);
  const bumpNpcAffinity = useSaveStore((s) => s.bumpNpcAffinity);
  const markNpcStorySeen = useSaveStore((s) => s.markNpcStorySeen);
  const [active, setActive] = useState<NpcId | null>(null);
  const [seedNonce, setSeedNonce] = useState(0);
  const [openStoryId, setOpenStoryId] = useState<string | null>(null);

  const ctx = useMemo(() => {
    // 가장 마지막 클리어가 챕터 마지막 stage인지 추정
    const isChapterEnd = lastClearedStageId?.endsWith('_s5') ?? false;
    return {
      lastVictory: !!lastClearedStageId && clearedStages.includes(lastClearedStageId) && (Date.now() - lastPlayedAt < 24 * 60 * 60 * 1000),
      lastDefeat: runs > 0 && !lastClearedStageId,
      isChapterEnd,
      justLevelUp: pendingDemonRewards.length > 0,
      soulstones: stones,
    };
  }, [stones, runs, lastPlayedAt, clearedStages, lastClearedStageId, pendingDemonRewards.length]);

  const trigger = useMemo(() => inferContext(ctx), [ctx]);

  const handleTalk = (id: NpcId) => {
    setActive(id);
    setSeedNonce((n) => n + 1);
    bumpNpcAffinity(id, 1);  // 대화 1회 = 호감도 +1
    setOpenStoryId(null);
  };

  const activeNpc = active ? getNpc(active) : null;
  const activeLine = activeNpc ? pickNpcLine(activeNpc, trigger, Date.now() + seedNonce * 7919) : null;
  const activeAffinity = active ? (npcAffinity[active] || 0) : 0;
  const allStories = active ? getNpcSideStories(active) : [];
  const unlockedStories = active ? unlockedSideStories(active, activeAffinity) : [];
  const nextStory = active ? allStories.find((sd) => activeAffinity < sd.unlockAffinity) : null;
  const openStory = openStoryId ? unlockedStories.find((s) => `${active}-${s.index}` === openStoryId) : null;
  const handleOpenStory = (storyKey: string) => {
    setOpenStoryId(storyKey);
    markNpcStorySeen(storyKey);
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.back} onClick={onBack}>← 뒤로</button>
        <div style={s.title}>왕좌실</div>
        <div style={s.contextLbl}>{contextLabel(trigger)}</div>
      </div>

      <div style={s.scene}>
        <div style={s.thrones}>
          <div style={s.throne}>👑</div>
        </div>
        <div style={s.subtitle}>마왕성에서 가장 깊은 방 — 옛 이들이 모인다.</div>
      </div>

      <div style={s.npcGrid}>
        {NPCS.map((npc) => (
          <button
            key={npc.id}
            style={{
              ...s.npcCard,
              borderColor: npc.accent,
              boxShadow: active === npc.id ? `0 0 14px ${npc.accent}` : `0 2px 0 #15102a`,
              ...(active === npc.id ? { background: `${npc.accent}22` } : {}),
            }}
            onClick={() => handleTalk(npc.id)}
          >
            <div style={s.npcIcon}>{npc.icon}</div>
            <div style={{ ...s.npcName, color: npc.accent }}>{npc.name}</div>
            <div style={s.npcTitle}>{npc.title}</div>
          </button>
        ))}
      </div>

      {activeNpc && activeLine && (
        <div style={{ ...s.dialog, borderColor: activeNpc.accent }}>
          <div style={s.dialogHead}>
            <span style={s.dialogIcon}>{activeNpc.icon}</span>
            <span style={{ ...s.dialogName, color: activeNpc.accent }}>{activeNpc.name}</span>
            <span style={s.dialogCtx}>{contextLabel(trigger)}</span>
          </div>
          {/* N1 호감도 게이지 */}
          <div style={s.affinityRow}>
            <span style={s.affinityLbl}>호감도</span>
            <div style={s.affinityBar}>
              <div style={{ ...s.affinityFill, width: `${Math.min(100, (activeAffinity / 30) * 100)}%`, background: activeNpc.accent }} />
            </div>
            <span style={s.affinityVal}>{activeAffinity}/30</span>
          </div>
          <div style={s.dialogBody}>{activeLine}</div>
          <div style={s.dialogBio}>{activeNpc.bio}</div>
          <button style={s.againBtn} onClick={() => { setSeedNonce((n) => n + 1); bumpNpcAffinity(active!, 1); }}>
            다시 듣기 → (+1 호감)
          </button>
          {/* N1 사이드 스토리 리스트 */}
          <div style={s.storiesSection}>
            <div style={s.storiesLbl}>회상 ({unlockedStories.length}/{allStories.length})</div>
            {unlockedStories.length === 0 && (
              <div style={s.storyEmpty}>
                호감도 {nextStory?.unlockAffinity ?? 3}에서 첫 회상이 해금됩니다.
              </div>
            )}
            {unlockedStories.map((st) => {
              const key = `${active}-${st.index}`;
              const seen = npcStoriesSeen.includes(key);
              return (
                <button
                  key={key}
                  style={{ ...s.storyItem, opacity: seen ? 0.6 : 1, borderColor: activeNpc.accent }}
                  onClick={() => handleOpenStory(key)}
                >
                  <span style={s.storyIdx}>#{st.index}</span>
                  <span style={s.storyTitle}>{st.title}</span>
                  {!seen && <span style={s.newDot}>NEW</span>}
                </button>
              );
            })}
            {nextStory && (
              <div style={s.nextStoryHint}>
                다음 회상: 호감도 {nextStory.unlockAffinity} (현재 {activeAffinity}, 부족 {nextStory.unlockAffinity - activeAffinity})
              </div>
            )}
          </div>
        </div>
      )}

      {/* 사이드 스토리 풀스크린 모달 */}
      {openStory && activeNpc && (
        <div style={s.storyBackdrop} onClick={() => setOpenStoryId(null)}>
          <div style={{ ...s.storyCard, borderColor: activeNpc.accent }} onClick={(e) => e.stopPropagation()}>
            <div style={s.storyCardHead}>
              <span style={s.storyCardIcon}>{activeNpc.icon}</span>
              <span style={{ ...s.storyCardTitle, color: activeNpc.accent }}>{openStory.title}</span>
            </div>
            {openStory.paragraphs.map((p, i) => (
              <p key={i} style={s.storyPara}>{p}</p>
            ))}
            <div style={s.storyUnlockLine}>"{openStory.unlockLine}"</div>
            <button style={s.storyClose} onClick={() => setOpenStoryId(null)}>닫기</button>
          </div>
        </div>
      )}

      {!activeNpc && (
        <div style={s.empty}>
          NPC를 선택해 말을 걸어보세요. 매번 다른 반응이 돌아옵니다.
        </div>
      )}
    </div>
  );
}

function contextLabel(t: ReturnType<typeof inferContext>): string {
  switch (t) {
    case 'idle':           return '평소';
    case 'after_run':      return '런 직후';
    case 'after_victory':  return '승리 직후';
    case 'after_defeat':   return '패배 직후';
    case 'before_chapter': return '챕터 입장 전';
    case 'after_chapter':  return '챕터 클리어';
    case 'level_up':       return '레벨업';
    case 'low_resource':   return '보물 부족';
    case 'rich':           return '보물 풍부';
  }
}

const s: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse at 50% 0%, #2D1B4E 0%, #1a0c30 35%, #0a0820 70%, #000 100%)',
    color: '#FFEAA7',
    padding: 12, overflow: 'auto',
  },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  back: { background: 'transparent', border: '1px solid #4a3a6e', color: '#FFEAA7', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', letterSpacing: 4, color: '#FD79A8', textAlign: 'center', textShadow: '2px 2px 0 #000' },
  contextLbl: { fontSize: 9, color: '#a55eea', minWidth: 60, textAlign: 'right' },
  scene: {
    background: 'linear-gradient(180deg,rgba(123,45,142,0.4),rgba(20,12,42,0.5))',
    border: '1.5px solid #7B2D8E', borderRadius: 8,
    padding: '14px 10px', marginBottom: 10, textAlign: 'center',
  },
  thrones: { fontSize: 36, marginBottom: 4, filter: 'drop-shadow(0 0 12px rgba(253,203,110,0.5))' },
  subtitle: { fontSize: 10, color: '#FFEAA7', fontStyle: 'italic' },
  npcGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10,
  },
  npcCard: {
    background: 'rgba(20,12,42,0.7)',
    border: '2px solid #4a3a6e', borderRadius: 6,
    padding: '8px 6px', color: '#FFEAA7', cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  npcIcon: { fontSize: 28, marginBottom: 4 },
  npcName: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  npcTitle: { fontSize: 9, color: '#bbb', marginTop: 2 },
  dialog: {
    background: 'rgba(30,20,60,0.85)',
    border: '2px solid #4a3a6e', borderRadius: 6,
    padding: 12,
  },
  dialogHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  dialogIcon: { fontSize: 18 },
  dialogName: { flex: 1, fontSize: 13, fontWeight: 'bold' },
  dialogCtx: { fontSize: 9, color: '#888' },
  dialogBody: { fontSize: 13, lineHeight: 1.6, color: '#FFEAA7', fontStyle: 'italic' },
  dialogBio: { fontSize: 9, color: '#888', marginTop: 10, paddingTop: 8, borderTop: '1px solid #4a3a6e', lineHeight: 1.5 },
  againBtn: { marginTop: 10, padding: '6px 12px', background: 'transparent', border: '1px solid #4a3a6e', color: '#FDCB6E', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10 },
  empty: { padding: 20, textAlign: 'center', fontSize: 11, color: '#888', fontStyle: 'italic' },
  // N1 호감도
  affinityRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 8 },
  affinityLbl: { fontSize: 9, color: '#a55eea', minWidth: 36 },
  affinityBar: { flex: 1, height: 6, background: 'rgba(0,0,0,0.5)', border: '1px solid #4a3a6e', borderRadius: 3, overflow: 'hidden' },
  affinityFill: { height: '100%', transition: 'width 0.3s' },
  affinityVal: { fontSize: 9, color: '#FDCB6E', minWidth: 32, textAlign: 'right' },
  // N1 사이드 스토리 리스트
  storiesSection: { marginTop: 12, paddingTop: 10, borderTop: '1px dashed #4a3a6e' },
  storiesLbl: { fontSize: 9, color: '#a55eea', letterSpacing: 1, marginBottom: 6, fontWeight: 'bold' },
  storyEmpty: { fontSize: 9, color: '#888', fontStyle: 'italic', padding: 4 },
  storyItem: { display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', marginBottom: 3, background: 'rgba(20,12,42,0.5)', border: '1px solid #4a3a6e', borderRadius: 4, color: '#FFEAA7', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
  storyIdx: { fontSize: 9, color: '#FDCB6E', minWidth: 22, fontWeight: 'bold' },
  storyTitle: { flex: 1, fontSize: 11 },
  newDot: { fontSize: 8, color: '#fff', background: '#FF6B6B', padding: '1px 4px', borderRadius: 4 },
  nextStoryHint: { fontSize: 9, color: '#888', marginTop: 6, fontStyle: 'italic', padding: 4 },
  // N1 풀스크린 모달
  storyBackdrop: { position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  storyCard: { background: 'linear-gradient(180deg,#1a0c30,#0a0820)', border: '2px solid', borderRadius: 8, padding: 16, maxWidth: 360, maxHeight: '85vh', overflow: 'auto', color: '#FFEAA7' },
  storyCardHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  storyCardIcon: { fontSize: 22 },
  storyCardTitle: { fontSize: 14, fontWeight: 'bold', flex: 1 },
  storyPara: { fontSize: 12, lineHeight: 1.7, marginBottom: 10, fontStyle: 'italic' },
  storyUnlockLine: { fontSize: 11, color: '#FDCB6E', textAlign: 'center', padding: 8, background: 'rgba(253,203,110,0.1)', borderRadius: 4, marginTop: 8 },
  storyClose: { width: '100%', marginTop: 12, padding: '8px', background: '#7B2D8E', border: '1px solid #FD79A8', color: '#fff', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
};
