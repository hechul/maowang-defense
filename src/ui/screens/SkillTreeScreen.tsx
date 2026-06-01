import { useEffect, useState } from 'react';
import { useSaveStore, type SkillId } from '../../store/useSaveStore';
import { SKILLS, TREE_INFO, skillCost } from '../../game/data/skilltree';
import { Audio } from '../../audio/AudioEngine';

export function SkillTreeScreen({ onBack }: { onBack: () => void }) {
  const stones = useSaveStore((s) => s.soulstones);
  const skills = useSaveStore((s) => s.skills);
  const runs = useSaveStore((s) => s.runs);
  const upgradeSkill = useSaveStore((s) => s.upgradeSkill);
  const spendStones = useSaveStore((s) => s.spendStones);
  const resetSkills = useSaveStore((s) => s.resetSkills);
  const addStones = useSaveStore((s) => s.addStones);

  // QA-6: hash로 전달된 추천 스킬 강조
  const [highlightId, setHighlightId] = useState<string | null>(null);
  useEffect(() => {
    const m = window.location.hash.match(/skill=(\w+)/);
    if (m) {
      setHighlightId(m[1]);
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

  const trees: ('rule' | 'summon' | 'doom')[] = ['rule', 'summon', 'doom'];

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>영혼 강화</h2>
      <div style={styles.stonesBar}>
        <span style={styles.stonesLabel}>보유 영혼석</span>
        <span style={styles.stonesNum}>{stones}</span>
      </div>
      <div style={styles.trees}>
        {trees.map((treeId) => (
          <div key={treeId} style={styles.tree}>
            <div style={{ ...styles.treeHead, color: TREE_INFO[treeId].color }}>
              {TREE_INFO[treeId].name}
            </div>
            {Object.values(SKILLS).filter((s) => s.tree === treeId).map((sd) => {
              const rank = skills[sd.id];
              const cost = skillCost(sd.id, rank, runs);
              const maxed = rank >= sd.max;
              const canAfford = cost <= stones;
              const isHighlight = highlightId === sd.id;
              // LD-15: 트리별 카드 배경 tint
              const treeTint =
                treeId === 'rule' ? 'rgba(116,185,255,0.08)' :
                treeId === 'summon' ? 'rgba(123,237,159,0.08)' :
                'rgba(255,118,117,0.08)';
              return (
                <button
                  key={sd.id}
                  style={{
                    ...styles.node,
                    backgroundColor: maxed ? '#2a1745' : treeTint,
                    ...(maxed ? styles.nodeMaxed : {}),
                    ...(isHighlight ? styles.nodeHighlight : {}),
                  }}
                  className={isHighlight ? 'skill-highlight' : ''}
                  onClick={() => !maxed && handleBuy(sd.id)}
                  disabled={maxed}
                >
                  <div style={styles.icon}>{sd.icon}</div>
                  <div style={styles.nm}>{sd.name}</div>
                  <div style={styles.rank}>{rank}/{sd.max}</div>
                  <div style={styles.desc}>{sd.desc(maxed ? rank : rank + 1)}</div>
                  <div style={{ ...styles.cost, color: maxed ? '#FFEAA7' : (canAfford ? '#FDCB6E' : '#888') }}>
                    {maxed ? 'MAX' : `${cost} 영혼석`}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div style={styles.bottom}>
        <button style={styles.btn} onClick={handleReset}>초기화</button>
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
  trees: {
    display: 'flex', gap: 6, width: '100%', flex: 1, minHeight: 0,
  },
  tree: {
    flex: 1, background: 'rgba(20,12,42,0.6)',
    border: '1px solid #4a3a6e', borderRadius: 5,
    padding: 6, display: 'flex', flexDirection: 'column', gap: 5,
    overflowY: 'auto',
  },
  treeHead: {
    textAlign: 'center', fontSize: 11, fontWeight: 'bold',
    padding: '5px 0', letterSpacing: 2,
    borderBottom: '1px solid #4a3a6e', marginBottom: 2,
  },
  node: {
    background: '#15102a', border: '1px solid #4a3a6e',
    borderRadius: 4, padding: 5, cursor: 'pointer',
    display: 'flex', flexDirection: 'column',
    fontFamily: 'inherit', color: 'inherit', textAlign: 'center',
  },
  nodeMaxed: { borderColor: '#FDCB6E', background: '#2a1745' },
  nodeHighlight: {
    borderColor: '#FDCB6E', borderWidth: 2,
    background: 'linear-gradient(180deg,#3a1a1a,#1a0606)',
    boxShadow: '0 0 14px rgba(253,203,110,0.7), inset 0 0 8px rgba(253,203,110,0.3)',
  },
  icon: { textAlign: 'center', fontSize: 18, lineHeight: 1, marginBottom: 1 },
  nm: { fontSize: 10, fontWeight: 'bold', color: '#fff', textAlign: 'center', lineHeight: 1.1, minHeight: 22 },
  rank: { textAlign: 'center', fontSize: 10, color: '#FDCB6E', margin: '2px 0', fontWeight: 'bold' },
  desc: { fontSize: 9, color: '#bbb', lineHeight: 1.25, minHeight: 24 },
  cost: {
    textAlign: 'center', fontSize: 10, padding: '2px 0',
    background: '#2a1745', borderRadius: 3, marginTop: 3,
    fontWeight: 'bold',
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
