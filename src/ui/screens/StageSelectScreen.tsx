import { useEffect, useRef, useState, useMemo } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { STAGES, isStageUnlocked, recommendedNextStage, type StageDefinition } from '../../game/data/stages';
import { getRecruitById } from '../../game/data/recruits';
import { StageStartModal } from '../components/StageStartModal';

const CHAPTER_LABELS: Record<string, string> = {
  ch1: 'Ch1 — 봉인의 입구',
  ch2: 'Ch2 — 영원의 겨울',
  ch3: 'Ch3 — 폭동의 변경',
  ch4: 'Ch4 — 서리 왕국',
  ch5: 'Ch5 — 심연의 법정',
  ch6: 'Ch6 — 악몽의 회랑',
  ch7: 'Ch7 — 종말의 문',
};

interface Props {
  onBack: () => void;
  onStartStage: (stageId: string) => void;
  /** endlessUnlocked일 때 하단 카드 클릭으로 심연 방어전 직접 진입 */
  onStartEndless?: () => void;
}

export function StageSelectScreen({ onBack, onStartStage, onStartEndless }: Props) {
  const cleared = useSaveStore((s) => s.clearedStages);
  const stars = useSaveStore((s) => s.stageStars);
  const selectedStageId = useSaveStore((s) => s.selectedStageId);
  const setSelectedStageId = useSaveStore((s) => s.setSelectedStageId);
  const endlessUnlocked = useSaveStore((s) => s.endlessUnlocked);
  const recommended = recommendedNextStage(cleared);
  // 챕터 목록 자동 추출
  const chapterIds = useMemo(() => {
    const seen: string[] = [];
    for (const s of STAGES) if (!seen.includes(s.chapterId)) seen.push(s.chapterId);
    return seen;
  }, []);
  const visibleChapterIds = useMemo(() => {
    const visible = chapterIds.filter((cid) => {
      const chapterStages = STAGES.filter((s) => s.chapterId === cid);
      return chapterStages.some((s) => cleared.includes(s.id) || isStageUnlocked(s.id, cleared));
    });
    return visible.length > 0 ? visible : chapterIds.slice(0, 1);
  }, [chapterIds, cleared]);
  // 추천 스테이지가 속한 챕터를 기본 탭으로
  const [activeChapter, setActiveChapter] = useState<string>(
    recommended?.chapterId ?? chapterIds[0]
  );
  useEffect(() => {
    if (!visibleChapterIds.includes(activeChapter)) {
      setActiveChapter(recommended?.chapterId && visibleChapterIds.includes(recommended.chapterId)
        ? recommended.chapterId
        : visibleChapterIds[0]);
    }
  }, [activeChapter, recommended, visibleChapterIds]);
  const stagesInChapter = STAGES.filter((s) => s.chapterId === activeChapter);
  const ch1Stages = STAGES.filter((s) => s.chapterId === 'ch1');
  const ch1AllCleared = ch1Stages.every((s) => cleared.includes(s.id));
  const [previewStage, setPreviewStage] = useState<StageDefinition | null>(null);
  const tutSeen = useSaveStore((s) => s.stageSelectTutorialSeen);
  const markTutSeen = useSaveStore((s) => s.markStageSelectTutorialSeen);
  const [showTut, setShowTut] = useState(!tutSeen);
  const focusTargetId = selectedStageId || recommended?.id || null;
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // 진입 시 마지막 선택 또는 추천 카드로 자동 스크롤
  useEffect(() => {
    if (!focusTargetId) return;
    const el = cardRefs.current[focusTargetId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusTargetId]);

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← 마왕성</button>
        <div style={styles.title}>🗺 작전 지도</div>
        <div style={{ width: 60 }} />
      </div>

      {/* 챕터 탭 */}
      <div style={styles.chapterTabs}>
        {visibleChapterIds.map((cid) => {
          const ch1Done = cleared.filter((id) => STAGES.find((s) => s.id === id)?.chapterId === cid).length;
          const total = STAGES.filter((s) => s.chapterId === cid).length;
          return (
            <button
              key={cid}
              style={{
                ...styles.chapterTab,
                ...(activeChapter === cid ? styles.chapterTabActive : {}),
              }}
              onClick={() => setActiveChapter(cid)}
            >
              {CHAPTER_LABELS[cid] ?? cid}
              <span style={styles.chapterCount}> {ch1Done}/{total}</span>
            </button>
          );
        })}
      </div>

      <div style={styles.stageList}>
        {stagesInChapter.map((stage) => {
          const unlocked = isStageUnlocked(stage.id, cleared);
          const isCleared = cleared.includes(stage.id);
          const stageStars = stars[stage.id] || 0;
          return (
            <button
              key={stage.id}
              ref={(el) => { cardRefs.current[stage.id] = el; }}
              style={{
                ...styles.stageCard,
                ...(unlocked ? {} : styles.stageCardLocked),
                ...(isCleared ? styles.stageCardCleared : {}),
                ...(recommended?.id === stage.id ? styles.stageCardRecommended : {}),
                ...(selectedStageId === stage.id && recommended?.id !== stage.id ? styles.stageCardSelected : {}),
              }}
              className={recommended?.id === stage.id ? 'stage-rec-pulse' : ''}
              disabled={!unlocked}
              onClick={() => {
                if (!unlocked) return;
                setSelectedStageId(stage.id);
                setPreviewStage(stage);  // 모달 노출 (즉시 진입 X)
              }}
            >
              {recommended?.id === stage.id && (
                <div style={styles.recBadge}>▶ 다음 추천</div>
              )}
              <div style={styles.stageTop}>
                <span style={styles.stageIcon}>{unlocked ? stage.icon : '🔒'}</span>
                <span style={styles.stageIndex}>STAGE {stage.index}</span>
                {isCleared && (
                  <span style={styles.starsRow}>
                    {'★'.repeat(stageStars)}{'☆'.repeat(3 - stageStars)}
                  </span>
                )}
              </div>
              <div style={styles.stageName}>{stage.name}</div>
              <div style={styles.stageSub}>{stage.subtitle}</div>
              {unlocked && (
                <div style={styles.stageMeta}>
                  목표 {stage.waveLimit}웨이브 방어
                </div>
              )}
              {!unlocked && stage.unlockCondition?.clearedStageId && (
                <div style={styles.lockHint}>
                  {STAGES.find((s) => s.id === stage.unlockCondition?.clearedStageId)?.name} 클리어 시 해금
                </div>
              )}
              {unlocked && !isCleared && (() => {
                const unlockIds = stage.firstClearReward.unlockRecruitIds ?? [];
                const unlockNames = unlockIds
                  .map((id) => getRecruitById(id)?.name ?? id)
                  .join(', ');
                return (
                  <div style={styles.firstReward}>
                    첫 클리어 +💎{stage.firstClearReward.soulstones ?? 0}
                    {unlockIds.length > 0 && <span style={styles.unlockHint}> · 👹 {unlockNames}</span>}
                  </div>
                );
              })()}
            </button>
          );
        })}

        {/* 챕터 완료 카드 — ch1 탭에서 ch1 전부 클리어 시 안내 */}
        {activeChapter === 'ch1' && ch1AllCleared && (
          <div style={styles.chapterDoneCard}>
            <div style={styles.chapterDoneTop}>✨ Chapter 1 완료 ✨</div>
            <div style={styles.chapterDoneSub}>
              어둠의 군주여, 첫 봉인이 깨졌다.
            </div>
            <div style={styles.chapterDoneBody}>
              Chapter 2도 도전 가능.<br/>
              먼저 다음 침공을 막고, 심연은 이후에 열립니다.
            </div>
          </div>
        )}

        {/* 심연 방어전 진입 카드 — endlessUnlocked 시 모든 챕터에서 노출 */}
        {endlessUnlocked && (
          <button
            style={styles.endlessCard}
            onClick={() => {
              if (onStartEndless) onStartEndless();
              else onBack();
            }}
          >
            <div style={styles.endlessTop}>🌌 심연 방어전</div>
            <div style={styles.endlessSub}>
              끝없이 몰려오는 용사들을 막고 최고 기록을 세우세요.
            </div>
            <div style={styles.endlessMeta}>기록 도전 · 빌드 실험</div>
          </button>
        )}
      </div>
      {showTut && (
        <div style={styles.tutOverlay}>
          <div style={styles.tutBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.tutIcon}>🗺</div>
            <div style={styles.tutTitle}>작전 지도</div>
            <div style={styles.tutBody}>
              ▶ <b style={{ color: '#FD79A8' }}>다음 추천</b> 카드부터 도전하세요.<br/>
              클리어로 <b style={{ color: '#26de81' }}>새 부하</b>를 해금합니다.
            </div>
            <button
              style={styles.tutBtn}
              onClick={() => { setShowTut(false); markTutSeen(); }}
            >알겠다</button>
          </div>
        </div>
      )}

      {previewStage && (
        <StageStartModal
          stage={previewStage}
          alreadyCleared={cleared.includes(previewStage.id)}
          onStart={() => {
            const id = previewStage.id;
            setPreviewStage(null);
            onStartStage(id);
          }}
          onClose={() => setPreviewStage(null)}
        />
      )}
      <style>{`
        @keyframes stageRecPulse {
          0%,100% { box-shadow: 0 3px 0 #5c3a18, 0 0 8px rgba(253,121,168,0.5); }
          50%     { box-shadow: 0 3px 0 #5c3a18, 0 0 18px rgba(253,121,168,1); }
        }
        .stage-rec-pulse { animation: stageRecPulse 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  );
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
    marginBottom: 12,
  },
  backBtn: {
    background: 'rgba(45,27,78,0.85)', border: '1px solid #4a3a6e',
    color: '#FFEAA7', padding: '6px 10px', borderRadius: 4,
    fontFamily: 'inherit', cursor: 'pointer', fontSize: 11,
  },
  title: { fontSize: 16, fontWeight: 'bold', color: '#FD79A8', letterSpacing: 2 },
  chapterLabel: {
    fontSize: 11, color: '#a55eea', textAlign: 'center', marginBottom: 10,
    letterSpacing: 1,
  },
  chapterTabs: {
    display: 'flex', gap: 6, marginBottom: 10,
  },
  chapterTab: {
    flex: 1, padding: '6px 4px',
    background: 'rgba(45,27,78,0.6)', border: '1px solid #4a3a6e',
    borderRadius: 5, color: '#bbb', fontSize: 10, fontWeight: 'bold',
    cursor: 'pointer', fontFamily: 'inherit',
    letterSpacing: 0.5,
  },
  chapterTabActive: {
    background: 'linear-gradient(180deg,#7B2D8E,#3a0d4e)',
    border: '1px solid #FDCB6E',
    color: '#FFEAA7',
    boxShadow: '0 0 6px rgba(253,203,110,0.4)',
  },
  chapterCount: { color: '#FDCB6E', fontSize: 9, marginLeft: 4, fontWeight: 'normal' },
  stageList: { display: 'flex', flexDirection: 'column', gap: 10 },
  stageCard: {
    position: 'relative',
    background: 'linear-gradient(180deg,#3a2d5c,#1a1230)',
    border: '2px solid #4a3a6e', borderRadius: 8,
    padding: '12px 14px',
    color: '#FFEAA7', fontFamily: 'inherit',
    cursor: 'pointer', textAlign: 'left',
    boxShadow: '0 3px 0 #15102a',
  },
  stageCardLocked: {
    background: 'rgba(20,12,42,0.5)',
    border: '1px dashed #4a3a6e',
    color: '#666',
    boxShadow: 'none',
    cursor: 'not-allowed',
  },
  stageCardCleared: {
    border: '2px solid #FDCB6E',
    boxShadow: '0 3px 0 #5c3a18, 0 0 8px rgba(253,203,110,0.3)',
  },
  stageCardRecommended: {
    border: '2px solid #FD79A8',
  },
  stageCardSelected: {
    border: '2px solid #74B9FF',
    boxShadow: '0 3px 0 #15102a, 0 0 8px rgba(116,185,255,0.4)',
  },
  recBadge: {
    position: 'absolute', top: -8, right: 8,
    background: 'linear-gradient(180deg,#FD79A8,#D6306E)',
    color: '#fff', fontSize: 9, fontWeight: 'bold',
    padding: '2px 6px', borderRadius: 4,
    letterSpacing: 1,
    boxShadow: '0 2px 0 #4a0a0a',
  },
  chapterDoneCard: {
    background: 'linear-gradient(180deg,#3a1a4e,#1a0828)',
    border: '2px solid #FDCB6E', borderRadius: 8,
    padding: '14px 16px', marginTop: 8,
    textAlign: 'center',
    boxShadow: '0 0 14px rgba(253,203,110,0.4)',
  },
  chapterDoneTop: {
    color: '#FDCB6E', fontSize: 14, fontWeight: 'bold',
    letterSpacing: 2, marginBottom: 4,
  },
  chapterDoneSub: { color: '#FD79A8', fontSize: 10, marginBottom: 8, fontStyle: 'italic' },
  chapterDoneBody: { color: '#FFEAA7', fontSize: 11, lineHeight: 1.5, marginBottom: 10 },
  chapterDoneBtn: {
    width: '100%', padding: '8px',
    background: 'linear-gradient(180deg,#7B2D8E,#3a0d4e)',
    border: '1px solid #a55eea', borderRadius: 4,
    color: '#FFEAA7', fontWeight: 'bold', fontSize: 12,
    cursor: 'pointer', fontFamily: 'inherit',
    letterSpacing: 1,
  },
  endlessCard: {
    width: '100%', marginTop: 8,
    background: 'linear-gradient(180deg,#1a0c30,#0a0820)',
    border: '1.5px solid #a55eea', borderRadius: 8,
    padding: '12px 14px', textAlign: 'left',
    color: '#FFEAA7', fontFamily: 'inherit',
    cursor: 'pointer',
    boxShadow: '0 0 8px rgba(165,94,234,0.35)',
  },
  endlessTop: {
    fontSize: 14, fontWeight: 'bold', color: '#a55eea',
    letterSpacing: 1.5, marginBottom: 4,
  },
  endlessSub: { fontSize: 10, color: '#FFEAA7', marginBottom: 4, lineHeight: 1.4 },
  endlessMeta: { fontSize: 9, color: '#888' },
  stageTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  stageIcon: { fontSize: 22 },
  stageIndex: {
    fontSize: 9, letterSpacing: 2, color: '#a55eea', flex: 1,
  },
  starsRow: { color: '#FDCB6E', fontSize: 11, letterSpacing: 1 },
  stageName: { fontSize: 14, fontWeight: 'bold', color: '#FFEAA7', marginBottom: 2 },
  stageSub: { fontSize: 10, color: '#bbb', marginBottom: 4 },
  stageMeta: { fontSize: 10, color: '#FDCB6E', marginTop: 2 },
  lockHint: { fontSize: 9, color: '#666', marginTop: 4, fontStyle: 'italic' },
  firstReward: { fontSize: 10, color: '#FFEAA7', marginTop: 5 },
  unlockHint: { color: '#FD79A8' },
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
