import { useMemo } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { recommendedNextStage } from '../../game/data/stages';
import { SKILLS, skillCost } from '../../game/data/skilltree';
import { progressInLevel } from '../../game/data/demonLevel';
import type { ScreenId } from '../../App';

interface Props {
  onNavigate: (s: ScreenId) => void;
}

/**
 * MVP 허브 — 기존 게임 포맷은 유지하되 첫 화면 정보량을 강하게 줄인다.
 * 살리는 것: 마왕성/전투/강화/도감/기존 전투 엔진.
 * 숨기는 것: 시즌, PvP, 친구, 상점, 우편함, 이벤트, 인테리어 등 부가 메뉴.
 */
export function CastleHubScreen({ onNavigate }: Props) {
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

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.title}>마왕성 방어전</div>
        <div style={styles.subtitle}>카드로 몬스터를 소환해 용사 침공을 막아라</div>
        <div style={styles.statRow}>
          <span style={styles.stat}>💎 {stones}</span>
          <span style={styles.stat}>📈 최고 W{bestWave}</span>
          <span style={styles.stat}>👹 부하 {recruitedIds.length}</span>
        </div>
      </div>

      <div style={styles.demonRoom}>
        <div style={styles.demonAvatar} className="demon-idle">
          <div style={styles.demonOrb} />
          <div style={styles.demonFigure}>{getDemonIcon(bestWave)}</div>
        </div>
        <div style={styles.demonBubble}>
          <div style={styles.demonName}>마왕 <span style={styles.lvTag}>LV.{level}</span></div>
          <div style={styles.coreLoop}>전투 → 영혼석 획득 → 강화 → 더 높은 웨이브</div>
        </div>
      </div>

      <button
        style={styles.cta}
        className="hub-cta-pulse"
        onClick={() => onNavigate('game')}
      >
        <div style={styles.ctaTop}>바로 시작</div>
        <div style={styles.ctaName}>⚔ 전투 시작</div>
        <div style={styles.ctaSub}>카드 3장 중 하나를 골라 마왕성을 지키세요</div>
      </button>

      <div style={styles.goalCard}>
        <div>
          <div style={styles.goalLabel}>다음 목표</div>
          <div style={styles.goalTitle}>{nextStage ? `${nextStage.icon ?? '⚔'} ${nextStage.name}` : '심연 방어전'}</div>
          <div style={styles.goalText}>
            {nextStage
              ? `웨이브 ${nextStage.waveLimit}까지 버티고 보스를 처치하세요.`
              : '모든 스테이지를 넘겼습니다. 이제 더 깊은 웨이브에 도전하세요.'}
          </div>
        </div>
        <button style={styles.mapBtn} onClick={() => onNavigate('stageSelect')}>작전 지도</button>
      </div>

      <div style={styles.roomSection}>
        <div style={styles.sectionLabel}>핵심 메뉴</div>
        <div style={styles.roomsGrid}>
          <RoomTile
            icon="🏛"
            label="영혼 강화"
            hint={upgradableSkills > 0 ? `${upgradableSkills}개 강화 가능` : '죽어도 영구 성장'}
            badge={upgradableSkills > 0 ? String(upgradableSkills) : null}
            accent="#FDCB6E"
            onClick={() => onNavigate('skills')}
          />
          <RoomTile
            icon="📖"
            label="도감"
            hint={`발견 ${discoveredMonsters.length}`}
            badge={discoveredMonsters.length > 0 ? '!' : null}
            accent="#a55eea"
            onClick={() => onNavigate('bestiary')}
          />
          <RoomTile
            icon="👹"
            label="모집소"
            hint="카드 풀 관리"
            badge={null}
            accent="#26de81"
            onClick={() => onNavigate('recruit')}
          />
        </div>
      </div>

      <div style={styles.lockedSection}>
        <div style={styles.sectionLabel}>MVP에서 잠시 숨긴 기능</div>
        <div style={styles.lockedGrid}>
          {['시즌', 'PvP', '친구', '상점', '우편함', '이벤트', '인테리어', '미니게임'].map((label) => (
            <div key={label} style={styles.lockedChip}>🔒 {label}</div>
          ))}
        </div>
      </div>

      <div style={styles.footer}>
        <button style={styles.smallBtn} onClick={() => onNavigate('privacy')}>개인정보</button>
        <button style={styles.smallBtn} onClick={() => onNavigate('support')}>고객지원</button>
      </div>

      {runs === 0 && (
        <div style={styles.firstHint}>
          👋 처음 목표는 단순합니다. <b>전투 시작</b>을 눌러 5웨이브 보스를 막아보세요.
        </div>
      )}

      <style>{`
        @keyframes hubCtaPulse {
          0%,100% { box-shadow: 0 4px 0 #4a0a0a, 0 0 16px rgba(253,121,168,0.55); }
          50%     { box-shadow: 0 4px 0 #4a0a0a, 0 0 28px rgba(253,121,168,0.95); }
        }
        .hub-cta-pulse { animation: hubCtaPulse 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function getDemonIcon(bestWave: number): string {
  if (bestWave >= 100) return '🌑';
  if (bestWave >= 50) return '👑';
  if (bestWave >= 25) return '😈';
  return '🦇';
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

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse at 50% 0%, #2D1B4E 0%, #1a0c30 35%, #0a0820 70%, #000 100%)',
    color: '#FFEAA7',
    padding: '12px 12px calc(12px + env(safe-area-inset-bottom, 0))',
    overflow: 'auto',
  },
  header: { textAlign: 'center', marginBottom: 10 },
  title: {
    fontSize: 24, fontWeight: 'bold', letterSpacing: 4,
    color: '#FD79A8',
    textShadow: '2px 2px 0 #000, 0 0 12px rgba(253,121,168,0.6)',
    marginBottom: 5,
  },
  subtitle: { fontSize: 10, color: '#FFEAA7', marginBottom: 7, opacity: 0.86 },
  statRow: { display: 'flex', justifyContent: 'center', gap: 8, fontSize: 10, color: '#FFEAA7', flexWrap: 'wrap' },
  stat: { background: 'rgba(20,12,42,0.7)', border: '1px solid #4a3a6e', padding: '3px 7px', borderRadius: 4 },
  demonRoom: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'linear-gradient(180deg,rgba(58,29,142,0.6),rgba(20,12,42,0.6))',
    border: '1.5px solid #7B2D8E', borderRadius: 8,
    padding: '8px 10px', marginBottom: 10,
    boxShadow: 'inset 0 0 12px rgba(123,45,142,0.4)',
  },
  demonAvatar: { position: 'relative', width: 44, height: 44, flexShrink: 0 },
  demonOrb: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(circle,#7B2D8E,#1a0828)',
    border: '1.5px solid #FDCB6E', borderRadius: '50%',
    boxShadow: '0 0 8px rgba(253,121,168,0.5)',
  },
  demonFigure: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 },
  demonBubble: { flex: 1, minWidth: 0 },
  demonName: { fontSize: 9, color: '#FD79A8', letterSpacing: 1 },
  demonText: { fontSize: 11, color: '#FFEAA7', marginTop: 2, fontStyle: 'italic', lineHeight: 1.4 },
  coreLoop: { fontSize: 9, color: '#FDCB6E', marginTop: 5 },
  lvTag: { color: '#FDCB6E', fontSize: 9, marginLeft: 4, fontWeight: 'bold' },
  cta: {
    width: '100%',
    background: 'radial-gradient(ellipse at 50% 30%, #FF7675 0%, #D63031 50%, #7a1818 100%)',
    border: '3px solid #FDCB6E', borderRadius: 10,
    padding: '14px 16px',
    color: '#fff', fontFamily: 'inherit', cursor: 'pointer',
    marginBottom: 10, textAlign: 'center',
    boxShadow: '0 4px 0 #4a0a0a',
  },
  ctaTop: { fontSize: 10, color: '#FDCB6E', letterSpacing: 2, marginBottom: 2 },
  ctaName: { fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  ctaSub: { fontSize: 9, color: '#FFEAA7', marginTop: 3, opacity: 0.86 },
  goalCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    background: 'rgba(20,12,42,0.72)', border: '1px solid #4a3a6e', borderRadius: 8,
    padding: '9px 10px', marginBottom: 12,
  },
  goalLabel: { fontSize: 8, color: '#a55eea', letterSpacing: 2, fontWeight: 'bold' },
  goalTitle: { fontSize: 13, color: '#FFEAA7', fontWeight: 'bold', marginTop: 2 },
  goalText: { fontSize: 9, color: '#bbb', marginTop: 2, lineHeight: 1.35 },
  mapBtn: {
    flexShrink: 0,
    background: 'rgba(123,45,142,0.6)', border: '1px solid #FD79A8',
    color: '#FFEAA7', fontSize: 9, padding: '8px 8px',
    borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
  },
  roomSection: { marginBottom: 12 },
  sectionLabel: { fontSize: 9, color: '#a55eea', letterSpacing: 2, fontWeight: 'bold', marginBottom: 6, paddingLeft: 2 },
  roomsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 },
  room: {
    position: 'relative',
    background: 'linear-gradient(180deg,#3a2d5c,#1a1230)',
    border: '2px solid #4a3a6e', borderRadius: 8,
    padding: '10px 4px',
    color: '#FFEAA7', fontFamily: 'inherit', cursor: 'pointer',
    minHeight: 78,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },
  roomIcon: { fontSize: 24, lineHeight: 1, marginBottom: 4 },
  roomLabel: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  roomHint: { fontSize: 8, color: '#bbb', marginTop: 2 },
  roomBadge: {
    position: 'absolute', top: 4, right: 4,
    color: '#fff', fontSize: 9, fontWeight: 'bold',
    padding: '1px 5px', borderRadius: 8,
    minWidth: 12, textAlign: 'center',
  },
  lockedSection: { marginBottom: 10 },
  lockedGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 },
  lockedChip: {
    background: 'rgba(20,12,42,0.45)', border: '1px dashed #4a3a6e',
    color: '#888', borderRadius: 5, padding: '6px 2px',
    textAlign: 'center', fontSize: 8,
  },
  footer: { display: 'flex', justifyContent: 'center', gap: 8, marginTop: 6 },
  smallBtn: {
    background: 'transparent', border: '1px solid #4a3a6e',
    color: '#888', padding: '4px 10px', borderRadius: 4,
    fontFamily: 'inherit', cursor: 'pointer', fontSize: 10,
  },
  firstHint: {
    marginTop: 8, padding: '8px 10px',
    background: 'linear-gradient(180deg,rgba(123,45,142,0.4),rgba(20,12,42,0.4))',
    border: '1px solid #FD79A8', borderRadius: 6,
    fontSize: 10, color: '#FFEAA7', lineHeight: 1.4,
  },
};
