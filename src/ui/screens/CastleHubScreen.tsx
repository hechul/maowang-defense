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
 * MVP 허브 — 사용자가 해야 할 일을 한눈에 알 수 있게 정보 위계를 단순화한다.
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

  const nextTitle = nextStage ? `${nextStage.icon ?? '⚔'} ${nextStage.name}` : '심연 방어전';
  const nextBody = nextStage
    ? `웨이브 ${nextStage.waveLimit}까지 버티고 보스를 처치하세요.`
    : '모든 스테이지를 넘겼습니다. 더 깊은 웨이브에 도전하세요.';

  return (
    <div style={styles.root}>
      <div style={styles.bgGlow} />

      <header style={styles.header}>
        <div style={styles.eyebrow}>카드 디펜스 RPG</div>
        <h1 style={styles.title}>마왕성 방어전</h1>
        <p style={styles.subtitle}>카드를 골라 부하를 소환하고, 몰려오는 용사를 막으세요.</p>
      </header>

      <section style={styles.statusPanel} aria-label="현재 상태">
        <div style={styles.demonBadge}>
          <div style={styles.demonIcon}>{getDemonIcon(bestWave)}</div>
          <div>
            <div style={styles.demonLabel}>마왕</div>
            <div style={styles.demonLevel}>LV.{level}</div>
          </div>
        </div>
        <Stat label="영혼석" value={stones.toLocaleString()} />
        <Stat label="최고 기록" value={`W${bestWave}`} />
      </section>

      <main style={styles.mainCard}>
        <div style={styles.goalBlock}>
          <div style={styles.goalLabel}>지금 목표</div>
          <div style={styles.goalTitle}>{nextTitle}</div>
          <div style={styles.goalText}>{nextBody}</div>
        </div>

        <button
          style={styles.primaryCta}
          className="hub-cta-pulse"
          onClick={() => onNavigate('game')}
        >
          <span style={styles.ctaIcon}>⚔</span>
          <span style={styles.ctaText}>전투 시작</span>
          <span style={styles.ctaSub}>바로 플레이</span>
        </button>

        <button style={styles.secondaryCta} onClick={() => onNavigate('stageSelect')}>
          작전 지도에서 스테이지 보기
        </button>
      </main>

      <section style={styles.actionsSection}>
        <div style={styles.sectionHead}>성장 메뉴</div>
        <div style={styles.actionList}>
          <ActionCard
            icon="🏛"
            title="영혼 강화"
            body={upgradableSkills > 0 ? `${upgradableSkills}개 강화 가능` : '전투 후 영구 성장'}
            badge={upgradableSkills > 0 ? '추천' : null}
            onClick={() => onNavigate('skills')}
          />
          <ActionCard
            icon="👹"
            title="모집소"
            body={`현재 부하 ${recruitedIds.length}종`}
            badge={null}
            onClick={() => onNavigate('recruit')}
          />
          <ActionCard
            icon="📖"
            title="도감"
            body={`발견한 적/부하 ${discoveredMonsters.length}종`}
            badge={discoveredMonsters.length > 0 ? '새 기록' : null}
            onClick={() => onNavigate('bestiary')}
          />
        </div>
      </section>

      {runs === 0 && (
        <div style={styles.firstHint}>
          처음이라면 <b>전투 시작</b>만 누르면 됩니다. 나머지는 전투 후 천천히 보세요.
        </div>
      )}

      <footer style={styles.footer}>
        <button style={styles.smallBtn} onClick={() => onNavigate('privacy')}>개인정보</button>
        <button style={styles.smallBtn} onClick={() => onNavigate('support')}>고객지원</button>
      </footer>

      <style>{`
        @keyframes hubCtaPulse {
          0%,100% { box-shadow: 0 10px 22px rgba(214,48,49,0.32), inset 0 1px 0 rgba(255,255,255,0.22); }
          50%     { box-shadow: 0 12px 34px rgba(253,203,110,0.42), inset 0 1px 0 rgba(255,255,255,0.28); }
        }
        .hub-cta-pulse { animation: hubCtaPulse 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

function ActionCard({ icon, title, body, badge, onClick }: {
  icon: string;
  title: string;
  body: string;
  badge: string | null;
  onClick: () => void;
}) {
  return (
    <button style={styles.actionCard} onClick={onClick}>
      <span style={styles.actionIcon}>{icon}</span>
      <span style={styles.actionCopy}>
        <span style={styles.actionTitle}>{title}</span>
        <span style={styles.actionBody}>{body}</span>
      </span>
      {badge && <span style={styles.actionBadge}>{badge}</span>}
      <span style={styles.actionArrow}>›</span>
    </button>
  );
}

function getDemonIcon(bestWave: number): string {
  if (bestWave >= 100) return '🌑';
  if (bestWave >= 50) return '👑';
  if (bestWave >= 25) return '😈';
  return '🦇';
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'auto',
    color: '#FFF6D8',
    padding: '14px 16px calc(16px + env(safe-area-inset-bottom, 0))',
    background: 'linear-gradient(180deg,#12091f 0%,#21113a 46%,#07040d 100%)',
    fontFamily: '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif',
  },
  bgGlow: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    background:
      'radial-gradient(circle at 50% -8%, rgba(253,203,110,0.22), transparent 32%), radial-gradient(circle at 10% 58%, rgba(214,48,49,0.2), transparent 30%), radial-gradient(circle at 90% 72%, rgba(38,222,129,0.12), transparent 28%)',
  },
  header: {
    position: 'relative',
    textAlign: 'left',
    marginBottom: 12,
  },
  eyebrow: {
    color: '#FDCB6E',
    fontSize: 12,
    letterSpacing: 0.2,
    fontWeight: 800,
    marginBottom: 6,
  },
  title: {
    margin: 0,
    color: '#FFFFFF',
    fontSize: 29,
    lineHeight: 1.05,
    letterSpacing: -0.8,
    textShadow: '0 3px 14px rgba(0,0,0,0.65)',
    whiteSpace: 'nowrap',
  },
  subtitle: {
    margin: '7px 0 0',
    color: 'rgba(255,246,216,0.78)',
    fontSize: 13,
    lineHeight: 1.45,
    wordBreak: 'keep-all',
  },
  statusPanel: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: '1.15fr 1fr 1fr',
    gap: 8,
    marginBottom: 10,
  },
  demonBadge: {
    minHeight: 56,
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '8px 9px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(253,203,110,0.32)',
    backdropFilter: 'blur(8px)',
  },
  demonIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    display: 'grid',
    placeItems: 'center',
    fontSize: 22,
    background: 'linear-gradient(180deg,#41215e,#12091f)',
    border: '1px solid rgba(253,203,110,0.45)',
  },
  demonLabel: { color: 'rgba(255,246,216,0.66)', fontSize: 11, whiteSpace: 'nowrap' },
  demonLevel: { color: '#FFFFFF', fontSize: 16, fontWeight: 900, marginTop: 2 },
  statCard: {
    minHeight: 56,
    padding: '8px 9px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  statLabel: { color: 'rgba(255,246,216,0.58)', fontSize: 10, marginBottom: 4, whiteSpace: 'nowrap' },
  statValue: { color: '#FFFFFF', fontSize: 16, fontWeight: 900, lineHeight: 1.1 },
  mainCard: {
    position: 'relative',
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    background: 'linear-gradient(180deg,rgba(255,246,216,0.14),rgba(255,246,216,0.06))',
    border: '1px solid rgba(253,203,110,0.34)',
    boxShadow: '0 18px 40px rgba(0,0,0,0.32)',
  },
  goalBlock: {
    marginBottom: 12,
  },
  goalLabel: {
    color: '#FDCB6E',
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  goalTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: 900,
    lineHeight: 1.15,
    marginBottom: 6,
  },
  goalText: {
    color: 'rgba(255,246,216,0.8)',
    fontSize: 13,
    lineHeight: 1.45,
    wordBreak: 'keep-all',
  },
  primaryCta: {
    width: '100%',
    minHeight: 72,
    border: 0,
    borderRadius: 18,
    cursor: 'pointer',
    color: '#FFFFFF',
    fontFamily: 'inherit',
    background: 'linear-gradient(180deg,#FF6B6B 0%,#D63031 58%,#7a1818 100%)',
    display: 'grid',
    gridTemplateColumns: '44px 1fr',
    gridTemplateRows: '1fr 1fr',
    alignItems: 'center',
    columnGap: 10,
    padding: '12px 15px',
    textAlign: 'left',
  },
  ctaIcon: {
    gridRow: '1 / span 2',
    width: 44,
    height: 44,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 14,
    background: 'rgba(0,0,0,0.22)',
    fontSize: 24,
  },
  ctaText: { fontSize: 22, fontWeight: 950, lineHeight: 1, letterSpacing: -0.4 },
  ctaSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, alignSelf: 'start' },
  secondaryCta: {
    width: '100%',
    marginTop: 9,
    padding: '11px 14px',
    borderRadius: 14,
    border: '1px solid rgba(253,203,110,0.32)',
    background: 'rgba(0,0,0,0.22)',
    color: '#FDCB6E',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
  },
  actionsSection: {
    position: 'relative',
    marginBottom: 10,
  },
  sectionHead: {
    color: 'rgba(255,246,216,0.72)',
    fontSize: 13,
    fontWeight: 900,
    margin: '0 0 8px 2px',
  },
  actionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  actionCard: {
    width: '100%',
    minHeight: 58,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '9px 12px',
    borderRadius: 17,
    border: '1px solid rgba(255,255,255,0.13)',
    background: 'rgba(255,255,255,0.075)',
    color: '#FFF6D8',
    fontFamily: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
  },
  actionIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 14,
    background: 'rgba(0,0,0,0.22)',
    fontSize: 24,
  },
  actionCopy: { flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 },
  actionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: 900 },
  actionBody: { color: 'rgba(255,246,216,0.66)', fontSize: 12, lineHeight: 1.3 },
  actionBadge: {
    color: '#12091f',
    background: '#FDCB6E',
    borderRadius: 999,
    padding: '4px 7px',
    fontSize: 10,
    fontWeight: 900,
    flexShrink: 0,
  },
  actionArrow: { color: 'rgba(255,246,216,0.45)', fontSize: 25, lineHeight: 1 },
  firstHint: {
    position: 'relative',
    marginTop: 12,
    padding: '12px 14px',
    borderRadius: 16,
    background: 'rgba(38,222,129,0.1)',
    border: '1px solid rgba(38,222,129,0.34)',
    color: 'rgba(255,246,216,0.86)',
    fontSize: 13,
    lineHeight: 1.45,
    wordBreak: 'keep-all',
  },
  footer: { position: 'relative', display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 },
  smallBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,246,216,0.45)',
    padding: '7px 12px',
    borderRadius: 999,
    fontFamily: 'inherit',
    cursor: 'pointer',
    fontSize: 11,
  },
};
