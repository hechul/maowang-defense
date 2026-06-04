import { useEffect, useState } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { RECRUITS, type RecruitDefinition } from '../../game/data/recruits';
import { getStageById } from '../../game/data/stages';

interface Props {
  onBack: () => void;
  /** 모집 후 작전 지도로 빠른 이동 (옵션) */
  onGoStageSelect?: () => void;
}

type RecruitTab = 'available' | 'owned' | 'locked';
const VISIBLE_TABS: RecruitTab[] = ['available', 'owned', 'locked'];

const TAB_LABELS: Record<RecruitTab, string> = {
  available: '모집 가능',
  owned: '이미 모집',
  locked: '단서 없음',
};

/** 모집 성공 시 마왕 톤 대사 풀 */
const RECRUIT_LINES: string[] = [
  '"좋아, 이제부터 네가 우리 성 야근조다."',
  '"계약 완료. 카드 의식에 합류한다."',
  '"환영한다. 마왕성의 그림자 속으로."',
  '"네 운명은 이제 어둠과 함께한다."',
  '"한 자리 비었다 — 그 자리, 너다."',
];

export function RecruitScreen({ onBack, onGoStageSelect }: Props) {
  const recruited = useSaveStore((s) => s.recruitedMonsterIds);
  const available = useSaveStore((s) => s.availableRecruitIds);
  const cleared = useSaveStore((s) => s.clearedStages);
  const seen = useSaveStore((s) => s.recruitSeenIds);
  const stones = useSaveStore((s) => s.soulstones);
  const recruitMonster = useSaveStore((s) => s.recruitMonster);
  const markRecruitSeen = useSaveStore((s) => s.markRecruitSeen);
  const tutorialSeen = useSaveStore((s) => s.recruitTutorialSeen);
  const markTutorialSeen = useSaveStore((s) => s.markRecruitTutorialSeen);
  const [showTutorial, setShowTutorial] = useState(!tutorialSeen);
  const [toast, setToast] = useState<{ name: string; line: string } | null>(null);
  const isRecruitUnlocked = (r: RecruitDefinition) =>
    available.includes(r.monsterId) || !r.unlockStageId || cleared.includes(r.unlockStageId);
  // 진입 시 모집 가능 탭이 비어있으면 owned, 그것도 0이면 locked로 자동 선택
  const initialTab: RecruitTab = (() => {
    const hasAvailable = RECRUITS.some((r) =>
      !recruited.includes(r.monsterId) && isRecruitUnlocked(r));
    if (hasAvailable) return 'available';
    const hasOwned = recruited.length > 0;
    if (hasOwned) return 'owned';
    return 'locked';
  })();
  const [tab, setTab] = useState<RecruitTab>(initialTab);

  // 화면 진입 시 NEW 뱃지 끄기
  useEffect(() => {
    const newIds = available.filter((id) => !seen.includes(id));
    if (newIds.length > 0) markRecruitSeen(newIds);
  }, [available, seen, markRecruitSeen]);

  const closeTutorial = () => {
    setShowTutorial(false);
    markTutorialSeen();
  };

  // 분류 — 매번 재계산 (적은 N)
  const sorted = RECRUITS.slice().sort((a, b) => a.order - b.order);
  const ownedList = sorted.filter((r) => recruited.includes(r.monsterId));
  const availableList = sorted.filter((r) =>
    !recruited.includes(r.monsterId) && isRecruitUnlocked(r));
  const lockedList = sorted.filter((r) =>
    !recruited.includes(r.monsterId) && !isRecruitUnlocked(r));

  // 카드풀 — 모집된 + MONSTERS에 알려진 (현재 deck 크기)
  const deckSize = recruited.length;

  const onRecruit = (rec: RecruitDefinition) => {
    if (!recruitMonster(rec.monsterId, rec.cost.soulstones)) return;
    const line = RECRUIT_LINES[Math.floor(Math.random() * RECRUIT_LINES.length)];
    setToast({ name: rec.name, line });
    setTimeout(() => setToast(null), 2400);
  };

  const renderCard = (rec: RecruitDefinition) => {
    const owned = recruited.includes(rec.monsterId);
    const isAvailable = isRecruitUnlocked(rec);
    const isLockedByStage = !isAvailable;
    const canRecruit = !owned && isAvailable && stones >= rec.cost.soulstones;
    const stonesShort = !owned && isAvailable && stones < rec.cost.soulstones
      ? rec.cost.soulstones - stones
      : 0;
    const isNew = !owned && isAvailable && !seen.includes(rec.monsterId);
    const stageDef = rec.unlockStageId ? getStageById(rec.unlockStageId) : undefined;

    return (
      <div
        key={rec.monsterId}
        style={{
          ...styles.card,
          ...(owned ? styles.cardOwned : {}),
          ...(isLockedByStage ? styles.cardLocked : {}),
        }}
      >
        <div style={styles.cardLeft}>
          <div style={styles.monIcon}>{getMonsterEmoji(rec.monsterId)}</div>
          {isNew && <div style={styles.newBadge}>NEW</div>}
          {owned && <div style={styles.ownedDot}>✓</div>}
        </div>
        <div style={styles.cardBody}>
          <div style={styles.monName}>
            {rec.name}
            <span style={{ ...styles.rarityTag, color: rarityColor(rec.rarity) }}>
              ·{rec.rarity}
            </span>
            <span style={styles.rarityTag}> · {rec.roleLabel}</span>
          </div>
          <div style={styles.story}>{rec.description}</div>
          {/* 상태별 안내 */}
          {owned && (
            <div style={styles.statusOwned}>✓ 카드풀 편입됨</div>
          )}
          {!owned && !isLockedByStage && (
            <div style={styles.statusHint}>모집하면 카드 의식에 합류합니다</div>
          )}
        </div>
        <div style={styles.cardRight}>
          {owned ? (
            <span style={styles.ownedTag}>편입</span>
          ) : isLockedByStage ? (
            <div style={styles.lockBox}>
              <div style={styles.lockIcon}>🔒</div>
              <div style={styles.lockHintText}>
                {stageDef
                  ? `${stageDef.name} 클리어 후 소문이 들립니다`
                  : rec.unlockHint}
              </div>
            </div>
          ) : (
            <button
              style={{
                ...styles.recruitBtn,
                ...(canRecruit ? {} : styles.recruitBtnDim),
              }}
              disabled={!canRecruit}
              onClick={() => onRecruit(rec)}
            >
              💎 {rec.cost.soulstones}
              {stonesShort > 0 && (
                <div style={styles.shortLabel}>−{stonesShort} 부족</div>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const activeList =
    tab === 'available' ? availableList :
    tab === 'owned' ? ownedList :
    lockedList;

  return (
    <div style={styles.root}>
      {showTutorial && (
        <div style={styles.tutOverlay}>
          <div style={styles.tutBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.tutIcon}>👹</div>
            <div style={styles.tutTitle}>모집소</div>
            <div style={styles.tutBody}>
              모집한 부하는 전투 중 카드로 등장합니다.<br/>
              <span style={{ color: '#a55eea' }}>스테이지 클리어로 새 부하 해금.</span>
            </div>
            <button style={styles.tutBtn} onClick={closeTutorial}>알겠다</button>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← 마왕성</button>
        <div style={styles.title}>👹 모집소</div>
        <div style={styles.stones}>💎 {stones}</div>
      </div>

      {onGoStageSelect && (
        <button style={styles.goStageBtn} onClick={onGoStageSelect}>
          🗺 작전 지도로 가기 ▶
        </button>
      )}

      {/* 카드풀 현황 — 모집 → 카드 의식 편입 안내 */}
      <div style={styles.deckBar}>
        <span style={styles.deckLabel}>카드풀</span>
        <span style={styles.deckSize}>{deckSize}종</span>
        <span style={styles.deckHint}>· 모집한 부하만 전투 카드로 등장</span>
      </div>

      {toast && (
        <div style={styles.toast}>
          <div style={styles.toastTop}>🎉 {toast.name} 합류</div>
          <div style={styles.toastLine}>— 마왕 {toast.line}</div>
          <div style={styles.toastFoot}>카드풀 {deckSize}종</div>
        </div>
      )}

      {/* 탭 */}
      <div style={styles.tabs}>
        {VISIBLE_TABS.map((t) => {
          const count =
            t === 'available' ? availableList.length :
            t === 'owned' ? ownedList.length :
            lockedList.length;
          return (
            <button
              key={t}
              style={{
                ...styles.tab,
                ...(tab === t ? styles.tabActive : {}),
              }}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]} ({count})
            </button>
          );
        })}
      </div>

      {/* 리스트 */}
      {activeList.length === 0 ? (
        <div style={styles.lockHint}>
          {tab === 'available' && (<>
            🔒 잠금 해제 가능한 모집이 없습니다.<br/>
            새 스테이지를 클리어하면 모집 후보가 추가됩니다.
          </>)}
          {tab === 'owned' && '아직 모집한 몬스터가 없습니다.'}
          {tab === 'locked' && '아직 소문조차 닿지 않은 부하가 없습니다.'}
        </div>
      ) : (
        <div style={styles.list}>{activeList.map(renderCard)}</div>
      )}
    </div>
  );
}

function rarityColor(r: string): string {
  switch (r) {
    case 'common': return '#9aa0a8';
    case 'uncommon': return '#26de81';
    case 'rare': return '#0984E3';
    case 'epic': return '#a55eea';
    case 'legendary': return '#FDCB6E';
    default: return '#a55eea';
  }
}

function getMonsterEmoji(id: string): string {
  const m: Record<string, string> = {
    slime: '🟣', goblin: '👺', skel: '💀', zombie: '🧟',
    imp: '👿', witch: '🧙', orc: '👹', mimic: '🪤',
    mino: '🐂', lich: '☠',
  };
  return m[id] ?? '👾';
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0,
    background: 'rgba(10,8,32,0.96)',
    color: '#FFEAA7',
    padding: '12px 12px calc(12px + env(safe-area-inset-bottom, 0))',
    overflow: 'auto',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    background: 'rgba(45,27,78,0.85)', border: '1px solid #4a3a6e',
    color: '#FFEAA7', padding: '6px 10px', borderRadius: 4,
    fontFamily: 'inherit', cursor: 'pointer', fontSize: 11,
  },
  title: { fontSize: 16, fontWeight: 'bold', color: '#FD79A8', letterSpacing: 2 },
  stones: { color: '#FDCB6E', fontSize: 12, fontWeight: 'bold' },
  goStageBtn: {
    width: '100%', marginBottom: 8, padding: '7px',
    background: 'linear-gradient(180deg,#3a1a4e,#1a0828)',
    border: '1.5px solid #FD79A8', borderRadius: 5,
    color: '#FFEAA7', fontSize: 11, fontWeight: 'bold',
    fontFamily: 'inherit', cursor: 'pointer',
    letterSpacing: 1,
  },
  deckBar: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(20,12,42,0.7)',
    border: '1px solid #4a3a6e', borderRadius: 4,
    padding: '5px 10px', marginBottom: 8,
  },
  deckLabel: { fontSize: 10, color: '#a55eea', letterSpacing: 1, fontWeight: 'bold' },
  deckSize: { fontSize: 13, color: '#FFEAA7', fontWeight: 'bold' },
  deckHint: { fontSize: 10, color: '#aaa', flex: 1, textAlign: 'right', lineHeight: 1.3 },
  lockHint: {
    background: 'rgba(20,12,42,0.6)',
    border: '1px dashed #4a3a6e',
    borderRadius: 6, padding: '14px 10px',
    fontSize: 11, color: '#888', textAlign: 'center',
    lineHeight: 1.6,
  },
  toast: {
    position: 'fixed', top: 56, left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(180deg,#3a1a4e,#1a0828)',
    border: '2px solid #FDCB6E', borderRadius: 6,
    color: '#FFEAA7', padding: '10px 14px',
    boxShadow: '0 0 18px rgba(253,203,110,0.7)',
    zIndex: 8000,
    minWidth: 220, textAlign: 'center',
  },
  toastTop: { fontSize: 12, fontWeight: 'bold', color: '#FDCB6E', letterSpacing: 1 },
  toastLine: { fontSize: 10, color: '#FFEAA7', marginTop: 4, fontStyle: 'italic' },
  toastFoot: { fontSize: 9, color: '#a55eea', marginTop: 4 },
  tabs: {
    display: 'flex', gap: 4, marginBottom: 8,
  },
  tab: {
    flex: 1, padding: '7px 4px',
    background: 'rgba(45,27,78,0.6)', border: '1px solid #4a3a6e',
    borderRadius: 4, color: '#bbb', fontSize: 10, fontWeight: 'bold',
    cursor: 'pointer', fontFamily: 'inherit',
    letterSpacing: 0.5,
  },
  tabActive: {
    background: 'linear-gradient(180deg,#7B2D8E,#3a0d4e)',
    border: '1px solid #FDCB6E',
    color: '#FFEAA7',
    boxShadow: '0 0 6px rgba(253,203,110,0.4)',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  card: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    background: 'linear-gradient(180deg,#3a2d5c,#1a1230)',
    border: '1.5px solid #4a3a6e', borderRadius: 6,
    padding: '8px 10px',
  },
  cardOwned: {
    border: '1.5px solid #26de81',
    background: 'rgba(38,222,129,0.10)',
  },
  cardLocked: {
    border: '1px dashed #4a3a6e',
    background: 'rgba(20,12,42,0.5)',
  },
  cardLeft: { position: 'relative', width: 36, flexShrink: 0 },
  monIcon: { fontSize: 26, lineHeight: 1, textAlign: 'center' },
  newBadge: {
    position: 'absolute', top: -6, left: -6,
    background: '#FF6B6B', color: '#fff',
    fontSize: 8, fontWeight: 'bold',
    padding: '1px 4px', borderRadius: 6,
  },
  ownedDot: {
    position: 'absolute', bottom: -4, right: -4,
    background: '#26de81', color: '#fff',
    fontSize: 9, fontWeight: 'bold',
    width: 14, height: 14, borderRadius: 7,
    textAlign: 'center', lineHeight: '14px',
  },
  cardBody: { flex: 1, minWidth: 0 },
  monName: { fontSize: 13, fontWeight: 'bold', color: '#FFEAA7' },
  rarityTag: { fontSize: 9, color: '#a55eea', marginLeft: 4 },
  story: { fontSize: 10, color: '#c7bdd6', marginTop: 2, lineHeight: 1.35 },
  statusOwned: {
    fontSize: 10, color: '#26de81', marginTop: 4, fontWeight: 'bold',
  },
  statusHint: {
    fontSize: 10, color: '#b77aff', marginTop: 4, fontStyle: 'italic',
  },
  cardRight: { flexShrink: 0, alignSelf: 'center' },
  recruitBtn: {
    background: 'linear-gradient(180deg,#FDCB6E,#D63031)',
    border: '1px solid #FDCB6E', borderRadius: 4,
    color: '#fff', fontWeight: 'bold', fontSize: 11,
    padding: '6px 10px', cursor: 'pointer',
    fontFamily: 'inherit', position: 'relative',
    minWidth: 64,
  },
  recruitBtnDim: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  shortLabel: {
    fontSize: 8, color: '#FF6B6B', marginTop: 2,
    fontWeight: 'bold',
  },
  ownedTag: { color: '#26de81', fontSize: 11, fontWeight: 'bold' },
  lockBox: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', maxWidth: 90, gap: 2,
  },
  lockIcon: { fontSize: 18 },
  lockHintText: {
    color: '#888', fontSize: 8, textAlign: 'center',
    fontStyle: 'italic', lineHeight: 1.3,
  },
  tutOverlay: {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'rgba(0,0,0,0.78)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  tutBox: {
    width: '100%', maxWidth: 280,
    background: 'linear-gradient(180deg,#3a2d5c,#1a1230)',
    border: '2px solid #FDCB6E', borderRadius: 8,
    padding: '16px 18px', textAlign: 'center',
    color: '#FFEAA7',
    boxShadow: '0 0 18px rgba(253,203,110,0.5)',
  },
  tutIcon: { fontSize: 36, lineHeight: 1, marginBottom: 6 },
  tutTitle: {
    fontSize: 16, fontWeight: 'bold',
    color: '#FD79A8', letterSpacing: 2, marginBottom: 8,
  },
  tutBody: {
    fontSize: 11, color: '#FFEAA7', lineHeight: 1.6, marginBottom: 12,
    textAlign: 'left',
  },
  tutBtn: {
    width: '100%', padding: '8px',
    background: 'linear-gradient(180deg,#FDCB6E,#D63031)',
    border: '1px solid #FDCB6E', borderRadius: 4,
    color: '#fff', fontWeight: 'bold', fontSize: 12,
    cursor: 'pointer', fontFamily: 'inherit',
    letterSpacing: 1,
  },
};
