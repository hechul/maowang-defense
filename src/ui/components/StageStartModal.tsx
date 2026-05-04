/**
 * StageStartModal — 스테이지 도전 시작 확인 모달.
 *
 * 마왕성 톤 — 짧게, 결정 1개 (도전 시작 / 닫기).
 * 보상/모집 해금/추천 태그를 카드 형태로 보여준다.
 */
import { type StageDefinition } from '../../game/data/stages';
import { getRecruitById } from '../../game/data/recruits';
import { BOSSES } from '../../game/data/bosses';

interface Props {
  stage: StageDefinition;
  alreadyCleared: boolean;
  onStart: () => void;
  onClose: () => void;
}

export function StageStartModal({ stage, alreadyCleared, onStart, onClose }: Props) {
  const bossDef = stage.bossId ? BOSSES[stage.bossId] : undefined;
  const unlockIds = stage.firstClearReward.unlockRecruitIds ?? [];
  const featureIds = stage.firstClearReward.unlockFeatureIds ?? [];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.box} onClick={(e) => e.stopPropagation()}>
        <div style={styles.head}>
          <span style={styles.icon}>{stage.icon ?? '⚔'}</span>
          <span style={styles.indexLabel}>STAGE {stage.index}</span>
          {alreadyCleared && <span style={styles.clearedTag}>✓ 클리어</span>}
        </div>
        <div style={styles.title}>{stage.name}</div>
        <div style={styles.subtitle}>{stage.subtitle}</div>
        {stage.description && (
          <div style={styles.desc}>"{stage.description}"</div>
        )}

        <div style={styles.metaRow}>
          <span style={styles.meta}>웨이브 {stage.waveLimit}</span>
          {bossDef && <span style={styles.meta}>· 보스 {bossDef.name}</span>}
        </div>

        {stage.recommendedTags && stage.recommendedTags.length > 0 && (
          <div style={styles.recRow}>
            추천 {stage.recommendedTags.map((t) => `#${t}`).join(' ')}
          </div>
        )}

        {/* 첫 클리어 보상 */}
        {!alreadyCleared && (
          <div style={styles.rewardCardFirst}>
            <div style={styles.rewardTop}>🎉 첫 클리어 보상</div>
            <div style={styles.rewardLine}>💎 영혼석 +{stage.firstClearReward.soulstones ?? 0}</div>
            {unlockIds.length > 0 && (
              <div style={styles.rewardLine}>
                👹 모집 해금: {unlockIds.map((id) => getRecruitById(id)?.name ?? id).join(', ')}
              </div>
            )}
            {featureIds.includes('endless') && (
              <div style={styles.rewardLine}>🌌 심연 방어전 해금</div>
            )}
            {featureIds.includes('challenges') && (
              <div style={styles.rewardLine}>⚔ 도전 모드 해금</div>
            )}
          </div>
        )}
        {alreadyCleared && (
          <div style={styles.rewardCardRepeat}>
            <div style={styles.rewardTop}>🔁 반복 도전 보상</div>
            <div style={styles.rewardLine}>💎 영혼석 +{stage.repeatReward.soulstones ?? 0}</div>
            {stage.repeatReward.heroFragments && (
              <div style={styles.rewardLine}>
                📖 도감 조각: {Object.entries(stage.repeatReward.heroFragments)
                  .map(([id, n]) => `${id} ×${n}`).join(', ')}
              </div>
            )}
          </div>
        )}

        {/* stageModifier 경고 — 0 이상 차이 시만 */}
        {stage.stageModifier && (() => {
          const m = stage.stageModifier;
          const lines: string[] = [];
          if (m.heroHpMul && m.heroHpMul !== 1) lines.push(`적 HP +${Math.round((m.heroHpMul - 1) * 100)}%`);
          if (m.heroAtkMul && m.heroAtkMul !== 1) lines.push(`적 ATK +${Math.round((m.heroAtkMul - 1) * 100)}%`);
          if (m.mpRegenMul && m.mpRegenMul !== 1) lines.push(`마력 회복 ×${m.mpRegenMul.toFixed(2)}`);
          if (m.castleHpMul && m.castleHpMul !== 1) lines.push(`마왕성 +${Math.round((m.castleHpMul - 1) * 100)}%`);
          if (m.rewardMul && m.rewardMul !== 1) lines.push(`보상 ×${m.rewardMul.toFixed(2)}`);
          if (lines.length === 0) return null;
          return (
            <div style={styles.modCard}>
              <div style={styles.modTop}>⚠ 스테이지 보정</div>
              <div style={styles.modBody}>{lines.join(' · ')}</div>
            </div>
          );
        })()}

        <button style={styles.btnStart} onClick={onStart}>⚔ 도전 시작</button>
        <button style={styles.btnClose} onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'rgba(0,0,0,0.78)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  box: {
    width: '100%', maxWidth: 290,
    background: 'linear-gradient(180deg,#3a1a4e,#1a0828)',
    border: '2px solid #FDCB6E', borderRadius: 8,
    padding: '14px 14px',
    color: '#FFEAA7',
    boxShadow: '0 0 20px rgba(253,203,110,0.6)',
    maxHeight: '90vh', overflow: 'auto',
  },
  head: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  icon: { fontSize: 22, lineHeight: 1 },
  indexLabel: { fontSize: 9, color: '#a55eea', letterSpacing: 1.5, flex: 1 },
  clearedTag: { fontSize: 9, color: '#FDCB6E', fontWeight: 'bold' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#FFEAA7', marginBottom: 2 },
  subtitle: { fontSize: 10, color: '#FD79A8', marginBottom: 6, fontStyle: 'italic' },
  desc: { fontSize: 10, color: '#bbb', marginBottom: 8, lineHeight: 1.5 },
  metaRow: { fontSize: 10, color: '#888', marginBottom: 4 },
  meta: { marginRight: 4 },
  recRow: { fontSize: 9, color: '#a55eea', marginBottom: 8 },
  rewardCardFirst: {
    background: 'rgba(253,203,110,0.1)',
    border: '1.5px solid #FDCB6E', borderRadius: 6,
    padding: '8px 10px', marginBottom: 8,
  },
  rewardCardRepeat: {
    background: 'rgba(74,58,110,0.4)',
    border: '1px solid #4a3a6e', borderRadius: 6,
    padding: '8px 10px', marginBottom: 8,
  },
  rewardTop: { fontSize: 10, color: '#FDCB6E', fontWeight: 'bold', marginBottom: 4, letterSpacing: 1 },
  rewardLine: { fontSize: 11, color: '#FFEAA7', lineHeight: 1.6 },
  modCard: {
    background: 'rgba(255,107,107,0.1)',
    border: '1px solid rgba(255,107,107,0.4)', borderRadius: 4,
    padding: '5px 8px', marginBottom: 8,
  },
  modTop: { fontSize: 9, color: '#FF7675', fontWeight: 'bold', marginBottom: 2 },
  modBody: { fontSize: 9, color: '#FFEAA7' },
  btnStart: {
    width: '100%', padding: '11px',
    background: 'radial-gradient(ellipse at 50% 30%, #FF7675 0%, #D63031 50%, #7a1818 100%)',
    border: '2px solid #FDCB6E', borderRadius: 6,
    color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 2,
    boxShadow: '0 3px 0 #4a0a0a',
    cursor: 'pointer', fontFamily: 'inherit',
    marginBottom: 6,
  },
  btnClose: {
    width: '100%', padding: '7px',
    background: 'rgba(45,27,78,0.85)', border: '1px solid #4a3a6e',
    borderRadius: 4, color: '#bbb', fontWeight: 'bold', fontSize: 11,
    cursor: 'pointer', fontFamily: 'inherit',
  },
};
