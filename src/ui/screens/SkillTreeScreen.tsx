import { useEffect, useMemo, useState } from 'react';
import { useSaveStore, type SkillId } from '../../store/useSaveStore';
import { SKILLS, TREE_INFO, skillCost } from '../../game/data/skilltree';
import { Audio } from '../../audio/AudioEngine';

const CORE_SKILLS: SkillId[] = ['castleHp', 'startMp', 'cardCost', 'monAtk', 'monHp'];

export function SkillTreeScreen({ onBack }: { onBack: () => void }) {
  const stones = useSaveStore((s) => s.soulstones);
  const skills = useSaveStore((s) => s.skills);
  const runs = useSaveStore((s) => s.runs);
  const upgradeSkill = useSaveStore((s) => s.upgradeSkill);
  const spendStones = useSaveStore((s) => s.spendStones);
  const resetSkills = useSaveStore((s) => s.resetSkills);
  const addStones = useSaveStore((s) => s.addStones);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // QA-6: hash로 전달된 추천 스킬 강조
  const [highlightId, setHighlightId] = useState<string | null>(null);
  useEffect(() => {
    const m = window.location.hash.match(/skill=(\w+)/);
    if (m) {
      const nextId = m[1] as SkillId;
      setHighlightId(nextId);
      if (SKILLS[nextId] && !CORE_SKILLS.includes(nextId)) {
        setShowAdvanced(true);
      }
      window.location.hash = '';
      // 5초 후 강조 해제
      const t = setTimeout(() => setHighlightId(null), 5000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleBuy = (id: SkillId) => {
    const rank = skills[id];
    const cost = skillCost(id, rank, runs);
    if (cost > stones) { Audio.ui_error(); return; }
    if (spendStones(cost)) {
      upgradeSkill(id);
      Audio.ui_confirm();
    }
  };

  const handleReset = () => {
    if (!confirm('모든 스킬을 초기화하고 영혼석을 환불받습니다. 계속?')) return;
    let refund = 0;
    for (const [id, rank] of Object.entries(skills) as [SkillId, number][]) {
      for (let i = 0; i < rank; i++) refund += skillCost(id, i, runs);
    }
    addStones(refund);
    resetSkills();
    Audio.relic_sfx();
  };

  const advancedSkills = useMemo(
    () => (Object.keys(SKILLS) as SkillId[]).filter((id) => !CORE_SKILLS.includes(id)),
    [],
  );
  const guidedSkillId: SkillId | null = highlightId && SKILLS[highlightId as SkillId]
    ? highlightId as SkillId
    : runs < 3
      ? (skills.cardCost < SKILLS.cardCost.max ? 'cardCost' : 'castleHp')
      : null;

  const renderSkillNode = (id: SkillId, variant: 'core' | 'advanced') => {
    const sd = SKILLS[id];
    const rank = skills[sd.id];
    const cost = skillCost(sd.id, rank, runs);
    const maxed = rank >= sd.max;
    const canAfford = cost <= stones;
    const isHighlight = highlightId === sd.id;
    const isGuided = guidedSkillId === sd.id && !maxed;
    const treeColor = TREE_INFO[sd.tree].color;
    return (
      <button
        key={sd.id}
        style={{
          ...styles.node,
          ...(variant === 'core' ? styles.nodeCore : styles.nodeAdvanced),
          borderColor: maxed ? '#FDCB6E' : treeColor,
          backgroundColor: maxed ? '#2a1745' : 'rgba(20,12,42,0.78)',
          ...(maxed ? styles.nodeMaxed : {}),
          ...(isGuided ? styles.nodeGuided : {}),
          ...(canAfford && !maxed ? styles.nodeAffordable : {}),
          ...(isHighlight ? styles.nodeHighlight : {}),
        }}
        className={isHighlight ? 'skill-highlight' : ''}
        onClick={() => !maxed && handleBuy(sd.id)}
        disabled={maxed}
      >
        <div style={styles.nodeTop}>
          <div style={styles.icon}>{sd.icon}</div>
          <div style={styles.nodeTitle}>
            <div style={styles.nm}>{sd.name}</div>
            <div style={{ ...styles.treeLabel, color: treeColor }}>{TREE_INFO[sd.tree].name}</div>
          </div>
          <div style={styles.rank}>{rank}/{sd.max}</div>
        </div>
        {isGuided && (
          <div style={styles.recommendBadge}>
            {canAfford ? '지금 추천' : '다음 목표'}
          </div>
        )}
        <div style={styles.desc}>{sd.desc(maxed ? rank : rank + 1)}</div>
        <div style={{ ...styles.cost, color: maxed ? '#FFEAA7' : (canAfford ? '#FDCB6E' : '#888') }}>
          {maxed ? 'MAX' : `${cost} 영혼석`}
        </div>
      </button>
    );
  };

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>영혼 강화</h2>
      <div style={styles.stonesBar}>
        <span style={styles.stonesLabel}>보유 영혼석</span>
        <span style={styles.stonesNum}>{stones}</span>
      </div>
      <div style={styles.guideBox}>
        <div style={styles.guideTop}>먼저 이 5개만 보면 됩니다</div>
        <div style={styles.guideText}>초반 추천은 카드 비용입니다. 카드를 자주 펼칠수록 전투 흐름을 더 빨리 익힙니다.</div>
      </div>
      <div style={styles.coreList}>
        {CORE_SKILLS.map((id) => renderSkillNode(id, 'core'))}
      </div>
      <button
        style={styles.advancedToggle}
        onClick={() => setShowAdvanced((v) => !v)}
      >
        {showAdvanced ? '상세 강화 접기' : '상세 강화 보기'}
      </button>
      {showAdvanced && (
        <div style={styles.advancedList}>
          {advancedSkills.map((id) => renderSkillNode(id, 'advanced'))}
        </div>
      )}
      <div style={styles.bottom}>
        {showAdvanced && <button style={styles.btn} onClick={handleReset}>초기화</button>}
        <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={onBack}>돌아가기</button>
      </div>
      <style>{`
        @keyframes skillHighlightPulse {
          0%,100% { box-shadow: 0 0 14px rgba(253,203,110,0.7), inset 0 0 8px rgba(253,203,110,0.3); }
          50%     { box-shadow: 0 0 24px rgba(253,203,110,1.0), inset 0 0 14px rgba(253,203,110,0.5); }
        }
        .skill-highlight { animation: skillHighlightPulse 0.7s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    padding: '18px 12px', background: 'rgba(5,3,15,0.96)',
    overflow: 'auto',
  },
  title: {
    color: '#FFEAA7', fontSize: 20, letterSpacing: 3,
    textAlign: 'center', textShadow: '2px 2px 0 #000', margin: '8px 0 4px',
  },
  stonesBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', margin: '8px 0 14px', padding: '6px 12px',
    background: 'rgba(45,27,78,0.7)', border: '1px solid #4a3a6e', borderRadius: 4,
  },
  stonesLabel: { color: '#FDCB6E', fontSize: 12 },
  stonesNum: { color: '#FFEAA7', fontSize: 18, fontWeight: 'bold' },
  guideBox: {
    background: 'rgba(253,203,110,0.1)',
    border: '1px solid rgba(253,203,110,0.45)',
    borderRadius: 6,
    padding: '8px 10px',
    marginBottom: 8,
  },
  guideTop: {
    color: '#FDCB6E', fontSize: 11, fontWeight: 'bold',
    letterSpacing: 1.5, marginBottom: 3,
  },
  guideText: {
    color: '#c7bdd6', fontSize: 10, lineHeight: 1.45,
    wordBreak: 'keep-all',
  },
  coreList: {
    display: 'flex', flexDirection: 'column', gap: 7,
  },
  advancedList: {
    display: 'flex', flexDirection: 'column', gap: 6,
    marginTop: 8,
  },
  node: {
    background: '#15102a', border: '1px solid #4a3a6e',
    borderRadius: 6, cursor: 'pointer',
    display: 'flex', flexDirection: 'column',
    fontFamily: 'inherit', color: 'inherit', textAlign: 'left',
    boxShadow: '0 2px 0 #15102a',
  },
  nodeCore: {
    padding: '8px 10px',
  },
  nodeAdvanced: {
    padding: '7px 9px',
    opacity: 0.9,
  },
  nodeMaxed: { borderColor: '#FDCB6E', background: '#2a1745' },
  nodeAffordable: {
    boxShadow: '0 2px 0 #15102a, inset 0 0 10px rgba(253,203,110,0.12)',
  },
  nodeGuided: {
    borderColor: '#FDCB6E',
    backgroundColor: 'rgba(253,203,110,0.12)',
  },
  nodeHighlight: {
    borderColor: '#FDCB6E', borderWidth: 2,
    background: 'linear-gradient(180deg,#3a1a1a,#1a0606)',
    boxShadow: '0 0 14px rgba(253,203,110,0.7), inset 0 0 8px rgba(253,203,110,0.3)',
  },
  nodeTop: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5,
  },
  icon: { textAlign: 'center', fontSize: 20, lineHeight: 1, width: 26 },
  nodeTitle: { flex: 1, minWidth: 0 },
  nm: { fontSize: 12, fontWeight: 'bold', color: '#fff', lineHeight: 1.25 },
  treeLabel: { fontSize: 8, letterSpacing: 2, marginTop: 2 },
  rank: { fontSize: 10, color: '#FDCB6E', fontWeight: 'bold' },
  recommendBadge: {
    alignSelf: 'flex-start',
    color: '#1a0828',
    background: '#FDCB6E',
    borderRadius: 4,
    padding: '2px 6px',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 5,
  },
  desc: { fontSize: 10, color: '#bbb', lineHeight: 1.35, minHeight: 0 },
  cost: {
    textAlign: 'center', fontSize: 10, padding: '4px 0',
    background: '#2a1745', borderRadius: 4, marginTop: 6,
    fontWeight: 'bold',
  },
  advancedToggle: {
    width: '100%',
    marginTop: 8,
    padding: '9px 10px',
    background: 'rgba(45,27,78,0.85)',
    border: '1px solid #4a3a6e',
    borderRadius: 5,
    color: '#FFEAA7',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: 1,
  },
  bottom: { width: '100%', display: 'flex', gap: 6, marginTop: 10 },
  btn: {
    flex: 1, padding: 10, fontSize: 13, fontWeight: 'bold',
    background: '#3a2d5c', border: '2px solid #4a3a6e',
    color: '#FFEAA7', borderRadius: 5,
    boxShadow: '0 3px 0 #15102a', cursor: 'pointer', fontFamily: 'inherit',
  },
  btnPrimary: {
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    borderColor: '#FDCB6E', color: '#fff',
    boxShadow: '0 3px 0 #4a0a0a',
  },
};
