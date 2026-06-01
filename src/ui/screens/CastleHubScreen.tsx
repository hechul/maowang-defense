import { useMemo } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { recommendedNextStage } from '../../game/data/stages';
import { SKILLS, skillCost } from '../../game/data/skilltree';
import { progressInLevel } from '../../game/data/demonLevel';
import type { ScreenId } from '../../App';

interface Props {
  onNavigate: (s: ScreenId) => void;
  onStartStage?: (stageId: string) => void;
}

/**
 * MVP 허브 — 정보량은 줄이되, 원본의 픽셀/마왕성 폼은 유지한다.
 */
export function CastleHubScreen({ onNavigate, onStartStage }: Props) {
  const stones = useSaveStore((s) => s.soulstones);
  const bestWave = useSaveStore((s) => s.bestWave);
  const runs = useSaveStore((s) => s.runs);
  const clearedStages = useSaveStore((s) => s.clearedStages);
  const recruitedIds = useSaveStore((s) => s.recruitedMonsterIds);
  const skills = useSaveStore((s) => s.skills);
  const discoveredMonsters = useSaveStore((s) => s.discoveredMonsters);
  const demonExp = useSaveStore((s) => s.demonExp);

  const nextStage = recommendedNextStage(clearedStages);
  const level = progressInLevel(demonExp).level;

  const upgradableSkills = useMemo(() => {
    let count = 0;
    for (const id of Object.keys(SKILLS) as Array<keyof typeof SKILLS>) {
      const def = SKILLS[id];
      const rank = (skills as any)[id] ?? 0;
      if (rank >= def.max) continue;
      if (stones >= skillCost(id, rank, runs)) count++;
    }
    return count;
  }, [skills, stones, runs]);

  const nextTitle = nextStage ? `${nextStage.icon ?? '⚔'} ${nextStage.name}` : '심연 방어전';
  const nextBody = nextStage
    ? `웨이브 ${nextStage.waveLimit}까지 버티고 보스를 처치하세요.`
    : '모든 스테이지를 넘겼습니다. 더 깊은 웨이브에 도전하세요.';
  const startPrimaryBattle = () => {
    if (nextStage && onStartStage) {
      onStartStage(nextStage.id);
      return;
    }
    onNavigate('game');
  };

  return (
    <div style={styles.root}>
      <div style={styles.scanline} />

      <header style={styles.header}>
        <div style={styles.title}>마왕성</div>
        <div style={styles.subtitle}>카드로 몬스터를 소환해 용사 침공을 막아라</div>
        <div style={styles.statRow} aria-label="현재 상태">
          <span style={styles.stat}>💎 {stones.toLocaleString()}</span>
          <span style={styles.stat}>📈 최고 W{bestWave}</span>
          <span style={styles.stat}>👹 부하 {recruitedIds.length}</span>
        </div>
      </header>

      <section style={styles.demonRoom} aria-label="마왕 상태">
        <div style={styles.demonAvatar} className="demon-idle">
          <div style={styles.demonOrb} />
          <div style={styles.demonFigure}>{getDemonIcon(bestWave)}</div>
        </div>
        <div style={styles.demonBubble}>
          <div style={styles.demonName}>— 마왕 <span style={styles.lvTag}>LV.{level}</span></div>
          <div style={styles.demonText}>전투에서 영혼석을 모아 성을 강화하라.</div>
          <div style={styles.coreLoop}>전투 → 영혼석 → 강화 → 더 높은 웨이브</div>
        </div>
      </section>

      <button
        style={styles.cta}
        className="hub-cta-pulse"
        onClick={startPrimaryBattle}
      >
        <div style={styles.ctaTop}>{nextStage ? '다음 침공 막기' : '심연 방어전'}</div>
        <div style={styles.ctaName}>
          {nextStage ? `${nextStage.icon ?? '⚔'} ${nextStage.name}` : '⚔ 전투 시작'}
        </div>
        <div style={styles.ctaSub}>
          {nextStage
            ? `WAVE ${nextStage.waveLimit} 보스 처치 · 카드 3장 중 하나를 선택`
            : '카드 3장 중 하나를 골라 마왕성을 지키세요'}
        </div>
      </button>

      <section style={styles.goalCard} aria-label="다음 목표">
        <div style={styles.goalCopy}>
          <div style={styles.goalLabel}>다음 목표</div>
          <div style={styles.goalTitle}>{nextTitle}</div>
          <div style={styles.goalText}>{nextBody}</div>
        </div>
        <button style={styles.mapBtn} onClick={() => onNavigate('stageSelect')}>다른 스테이지</button>
      </section>

      <section style={styles.roomSection} aria-label="핵심 메뉴">
        <div style={styles.sectionLabel}>마왕성 내부</div>
        <div style={styles.roomsGrid}>
          <RoomTile
            icon="🏛"
            label="영혼 강화"
            hint={upgradableSkills > 0 ? `${upgradableSkills}개 가능` : '영구 성장'}
            badge={upgradableSkills > 0 ? '!' : null}
            accent="#FDCB6E"
            onClick={() => onNavigate('skills')}
          />
          <RoomTile
            icon="👹"
            label="모집소"
            hint={`부하 ${recruitedIds.length}종`}
            badge={null}
            accent="#26de81"
            onClick={() => onNavigate('recruit')}
          />
          <RoomTile
            icon="📖"
            label="도감"
            hint={`발견 ${discoveredMonsters.length}`}
            badge={null}
            accent="#a55eea"
            onClick={() => onNavigate('bestiary')}
          />
        </div>
      </section>

      {runs === 0 && (
        <div style={styles.firstHint}>
          처음 목표는 단순합니다. <b>다음 침공 막기</b>를 눌러 바로 막아보세요.
        </div>
      )}

      <footer style={styles.footer}>
        <button style={styles.smallBtn} onClick={() => onNavigate('privacy')}>개인정보</button>
        <button style={styles.smallBtn} onClick={() => onNavigate('support')}>고객지원</button>
      </footer>

      <style>{`
        @keyframes hubCtaPulse {
          0%,100% { box-shadow: 0 4px 0 #4a0a0a, 0 0 14px rgba(253,121,168,0.55); transform: translateY(0); }
          50%     { box-shadow: 0 4px 0 #4a0a0a, 0 0 24px rgba(253,121,168,0.9); transform: translateY(-1px); }
        }
        .hub-cta-pulse { animation: hubCtaPulse 1.7s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function RoomTile({ icon, label, hint, badge, accent, onClick }: {
  icon: string;
  label: string;
  hint: string;
  badge: string | null;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      style={{
        ...styles.room,
        borderColor: accent,
        boxShadow: `0 3px 0 #15102a, 0 0 6px ${accent}55`,
      }}
      onClick={onClick}
    >
      <div style={styles.roomIcon}>{icon}</div>
      <div style={styles.roomLabel}>{label}</div>
      <div style={styles.roomHint}>{hint}</div>
      {badge && <div style={{ ...styles.roomBadge, background: accent }}>{badge}</div>}
    </button>
  );
}

function getDemonIcon(bestWave: number): string {
  if (bestWave >= 100) return '🌑';
  if (bestWave >= 50) return '👑';
  if (bestWave >= 25) return '😈';
  return '🦇';
}

const pixelFont = "'Press Start 2P', 'Gugi', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'auto',
    color: '#FFEAA7',
    padding: '12px 12px calc(12px + env(safe-area-inset-bottom, 0))',
    background: 'radial-gradient(ellipse at 50% 0%, #2D1B4E 0%, #1a0c30 35%, #0a0820 70%, #000 100%)',
    fontFamily: pixelFont,
    imageRendering: 'pixelated',
  },
  scanline: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    opacity: 0.09,
    background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 4px)',
  },
  header: { position: 'relative', textAlign: 'center', marginBottom: 10 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
    color: '#FD79A8',
    textShadow: '2px 2px 0 #000, 0 0 12px rgba(253,121,168,0.6)',
    marginBottom: 5,
  },
  subtitle: { fontSize: 10, color: '#FFEAA7', marginBottom: 7, opacity: 0.9, lineHeight: 1.5 },
  statRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    color: '#FFEAA7',
    flexWrap: 'wrap',
  },
  stat: {
    background: 'rgba(20,12,42,0.75)',
    border: '1px solid #4a3a6e',
    padding: '4px 7px',
    borderRadius: 4,
    fontSize: 10,
    boxShadow: '0 2px 0 rgba(0,0,0,0.45)',
    whiteSpace: 'nowrap',
  },
  demonRoom: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'linear-gradient(180deg,rgba(58,29,142,0.62),rgba(20,12,42,0.72))',
    border: '2px solid #7B2D8E',
    borderRadius: 8,
    padding: '8px 10px',
    marginBottom: 10,
    boxShadow: 'inset 0 0 12px rgba(123,45,142,0.42), 0 3px 0 #080412',
  },
  demonAvatar: { position: 'relative', width: 44, height: 44, flexShrink: 0 },
  demonOrb: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg,#7B2D8E,#1a0828)',
    border: '2px solid #FDCB6E',
    borderRadius: 6,
    boxShadow: '0 3px 0 #080412, inset 0 0 0 2px rgba(255,255,255,0.08)',
  },
  demonFigure: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
  },
  demonBubble: { flex: 1, minWidth: 0 },
  demonName: { fontSize: 9, color: '#FD79A8', letterSpacing: 1, marginBottom: 3 },
  demonText: { fontSize: 11, color: '#FFEAA7', lineHeight: 1.45, wordBreak: 'keep-all' },
  coreLoop: { fontSize: 9, color: '#FDCB6E', marginTop: 5, lineHeight: 1.35 },
  lvTag: { color: '#FDCB6E', fontSize: 9, marginLeft: 4, fontWeight: 'bold' },
  cta: {
    width: '100%',
    background: 'radial-gradient(ellipse at 50% 30%, #FF7675 0%, #D63031 50%, #7a1818 100%)',
    border: '3px solid #FDCB6E',
    borderRadius: 10,
    padding: '14px 16px',
    color: '#fff',
    fontFamily: 'inherit',
    cursor: 'pointer',
    marginBottom: 10,
    textAlign: 'center',
    boxShadow: '0 4px 0 #4a0a0a',
    textShadow: '1px 1px 0 #000',
  },
  ctaTop: { fontSize: 10, color: '#FDCB6E', letterSpacing: 2, marginBottom: 2 },
  ctaName: { fontSize: 18, fontWeight: 'bold', letterSpacing: 1, lineHeight: 1.35 },
  ctaSub: { fontSize: 9, color: '#FFEAA7', marginTop: 3, opacity: 0.9, lineHeight: 1.45 },
  goalCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    background: 'rgba(20,12,42,0.76)',
    border: '1px solid #4a3a6e',
    borderRadius: 8,
    padding: '9px 10px',
    marginBottom: 12,
    boxShadow: '0 3px 0 rgba(0,0,0,0.35)',
  },
  goalCopy: { minWidth: 0 },
  goalLabel: { fontSize: 8, color: '#a55eea', letterSpacing: 2, fontWeight: 'bold' },
  goalTitle: { fontSize: 13, color: '#FFEAA7', fontWeight: 'bold', marginTop: 3, lineHeight: 1.35 },
  goalText: { fontSize: 9, color: '#c7bdd6', marginTop: 3, lineHeight: 1.45, wordBreak: 'keep-all' },
  mapBtn: {
    flexShrink: 0,
    background: 'rgba(123,45,142,0.68)',
    border: '1px solid #FD79A8',
    color: '#FFEAA7',
    fontSize: 9,
    padding: '8px 8px',
    borderRadius: 5,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 2px 0 #15102a',
  },
  roomSection: { position: 'relative', marginBottom: 12 },
  sectionLabel: {
    fontSize: 9,
    color: '#a55eea',
    letterSpacing: 2,
    fontWeight: 'bold',
    marginBottom: 6,
    paddingLeft: 2,
  },
  roomsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 },
  room: {
    position: 'relative',
    background: 'linear-gradient(180deg,#3a2d5c,#1a1230)',
    border: '2px solid #4a3a6e',
    borderRadius: 8,
    padding: '10px 4px',
    color: '#FFEAA7',
    fontFamily: 'inherit',
    cursor: 'pointer',
    minHeight: 82,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  roomIcon: { fontSize: 24, lineHeight: 1, marginBottom: 4 },
  roomLabel: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1, lineHeight: 1.35 },
  roomHint: { fontSize: 8, color: '#bbb', marginTop: 3, lineHeight: 1.35 },
  roomBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    color: '#0a0820',
    fontSize: 8,
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 0 #000',
  },
  firstHint: {
    position: 'relative',
    background: 'rgba(38,222,129,0.12)',
    border: '1px solid #26de81',
    borderRadius: 6,
    color: '#FFEAA7',
    fontSize: 10,
    lineHeight: 1.55,
    padding: '9px 10px',
    marginBottom: 10,
    wordBreak: 'keep-all',
  },
  footer: { position: 'relative', display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 },
  smallBtn: {
    background: 'rgba(20,12,42,0.65)',
    border: '1px solid #4a3a6e',
    color: '#777',
    padding: '6px 10px',
    borderRadius: 4,
    fontFamily: 'inherit',
    cursor: 'pointer',
    fontSize: 9,
  },
};
