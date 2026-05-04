import { useState, useMemo } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { MONSTERS } from '../../game/data/monsters';
import { HEROES } from '../../game/data/heroes';
import { BOSSES } from '../../game/data/bosses';
import { RELICS } from '../../game/data/relics';
import { BUILDS } from '../../game/data/builds';
import { Audio } from '../../audio/AudioEngine';
import { getHeroLore } from '../../game/data/heroLore';
import { getBossLore } from '../../game/data/bossLore';
import { getCardLore } from '../../game/data/cardLore';
import { LORE_SHORT, CHAPTER_THEMES, NPC_ROLES } from '../../game/data/lore';
import { DEMON_RECALLS, getRecall } from '../../game/data/demonRecalls';
import { SEALED_TABLETS, SEALED_TABLET_COUNT } from '../../game/data/sealedTablets';
import { TITLES, RARITY_COLOR, getTitle } from '../../game/data/titles';
import { NAMED_MINIONS, getNamedMinion } from '../../game/data/namedMinions';
import { CARD_LORE_3ACTS, unlockedActsForLevel } from '../../game/data/cardLore3Acts';
import { RELIC_FUSIONS } from '../../game/data/relicFusions';
import { HIDDEN_SYNERGIES } from '../../game/data/hiddenSynergies';
import { DEMON_SECRETS } from '../../game/data/demonSecrets';

type Tab = 'monsters' | 'heroes' | 'bosses' | 'relics' | 'fusions' | 'hidden' | 'secrets' | 'guide' | 'lore';

const BUILD_GUIDES = [
  {
    id: 'slime',
    name: '슬라임 무리 (탱커)',
    desc: '슬라임 라인 진화 → HP 시너지 + 탱커 시너지 활성',
    monsters: ['슬라임', '킹슬라임', '슬라임로드'],
    relics: ['거인의 갑주(titan)', '강철 비늘(iron)', '마왕의 심장(heart)'],
    tip: '🛡 안정형. 신규 유저 추천. 마왕성 HP 보존 우선',
  },
  {
    id: 'magic',
    name: '마법 폭발 (원거리)',
    desc: '위치/임프/리치 라인 → 마법진 시너지 ×1.4 ATK',
    monsters: ['꼬마위치', '다크위치', '아크위치'],
    relics: ['지옥불(inferno)', '광기의 가면(mask)', '마력 폭주(surge)'],
    tip: '🔮 고화력. 마력 회복이 핵심. surge 유물 우선',
  },
  {
    id: 'undead',
    name: '언데드 군세 (부활)',
    desc: '스켈레톤/좀비/리치 라인 → 언데드 시너지 + 부활',
    monsters: ['스켈레톤', '좀비', '리치'],
    relics: ['부활의 묘비(tomb)', '영혼 수확자(reaper)', '핏빛 달(bloodmoon)'],
    tip: '⚰ 지속력. 부활로 끊임없이 재공격',
  },
];

export function BestiaryScreen({ onBack, onGoRecruit }: { onBack: () => void; onGoRecruit?: () => void }) {
  const [tab, setTab] = useState<Tab>('monsters');
  const [detail, setDetail] = useState<{ id: string; def: any; tab: Tab } | null>(null);
  const [buildDetail, setBuildDetail] = useState<typeof BUILDS[number] | null>(null);
  const discMonsters = useSaveStore((s) => s.discoveredMonsters);
  const discHeroes = useSaveStore((s) => s.discoveredHeroes);
  const discBosses = useSaveStore((s) => s.discoveredBosses);
  const discRelics = useSaveStore((s) => s.discoveredRelics);
  const recruitedMonsterIds = useSaveStore((s) => s.recruitedMonsterIds);
  const recruitedSet = useMemo(() => new Set(recruitedMonsterIds), [recruitedMonsterIds]);
  // OVERHAUL §3.3 + §3.5
  const buildTitles = useSaveStore((s) => s.buildTitles);
  const heroFragments = useSaveStore((s) => s.heroFragments);
  const heroBaneActive = useSaveStore((s) => s.heroBaneActive);
  // v10
  const recallSeen = useSaveStore((s) => s.recallSeen);
  const tabletsSeen = useSaveStore((s) => s.tabletsSeen);
  const earnedTitles = useSaveStore((s) => s.earnedTitles);
  const equippedTitle = useSaveStore((s) => s.equippedTitle);
  const equipTitleAct = useSaveStore((s) => s.equipTitle);
  const decisionLog = useSaveStore((s) => s.decisionLog);
  const moralityGauge = useSaveStore((s) => s.moralityGauge);
  const namedMinionsOwned = useSaveStore((s) => s.namedMinionsOwned);
  const cardLevels = useSaveStore((s) => s.cardLevels);
  const [loreSub, setLoreSub] = useState<'world' | 'recalls' | 'tablets' | 'titles' | 'decisions' | 'named' | 'acts'>('world');

  const data = useMemo(() => {
    if (tab === 'monsters') return { entries: MONSTERS, disc: new Set(discMonsters) };
    if (tab === 'heroes')   return { entries: HEROES,   disc: new Set(discHeroes) };
    if (tab === 'bosses')   return { entries: BOSSES,   disc: new Set(discBosses) };
    return { entries: RELICS, disc: new Set(discRelics) };
  }, [tab, discMonsters, discHeroes, discBosses, discRelics]);

  const total = Object.keys(data.entries).length;
  const found = Object.keys(data.entries).filter((id) => data.disc.has(id)).length;

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>도 감</h2>
      <div style={styles.tabs}>
        {(['monsters', 'heroes', 'bosses', 'relics', 'fusions', 'hidden', 'secrets', 'guide', 'lore'] as Tab[]).map((t) => (
          <button
            key={t}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
            onClick={() => { setTab(t); Audio.ui_navigate(); }}
          >
            {t === 'monsters' ? '몬스터' : t === 'heroes' ? '용사' : t === 'bosses' ? '보스' : t === 'relics' ? '유물' : t === 'fusions' ? '진화' : t === 'hidden' ? '비밀' : t === 'secrets' ? '능력' : t === 'guide' ? '가이드' : '세계관'}
          </button>
        ))}
      </div>
      {tab !== 'guide' && tab !== 'lore' && tab !== 'fusions' && tab !== 'hidden' && tab !== 'secrets' && (
        <div style={styles.progress}>
          발견 {found} / {total}
          {tab === 'monsters' && (
            <span style={{ marginLeft: 8, color: '#26de81' }}>
              · 모집 {recruitedMonsterIds.filter((id) => MONSTERS[id]).length} / {Object.keys(MONSTERS).length}
            </span>
          )}
        </div>
      )}
      {tab === 'guide' && (
        <div style={styles.guideArea}>
          {/* OVERHAUL §3.3: 빌드 칭호 진행도 (영구 적립) */}
          <div style={styles.guideIntro}>
            🏆 빌드 칭호 ({buildTitles.length} / {BUILDS.length})
          </div>
          <div style={styles.titleGrid}>
            {BUILDS.map((b) => {
              const owned = buildTitles.includes(b.id);
              return (
                <button key={b.id} style={{
                  ...styles.titleCard,
                  borderColor: owned ? '#FDCB6E' : '#4a3a6e',
                  opacity: owned ? 1 : 0.6,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
                  onClick={() => { setBuildDetail(b); Audio.ui_navigate(); }}
                >
                  <div style={styles.titleIcon}>{owned ? b.icon : '🔒'}</div>
                  <div style={styles.titleName}>{owned ? b.name : '???'}</div>
                  <div style={styles.titleDesc}>{owned ? b.desc : '한 런에서 100% 달성'}</div>
                </button>
              );
            })}
          </div>

          <div style={styles.guideIntro}>💡 추천 빌드 — 이 조합을 노려 카드를 픽하세요</div>
          {BUILD_GUIDES.map((g) => (
            <div key={g.id} style={styles.guideCard}>
              <div style={styles.guideName}>{g.name}</div>
              <div style={styles.guideDesc}>{g.desc}</div>
              <div style={styles.guideRow}>
                <span style={styles.guideLabel}>몬스터:</span>
                <span style={styles.guideValue}>{g.monsters.join(' → ')}</span>
              </div>
              <div style={styles.guideRow}>
                <span style={styles.guideLabel}>유물:</span>
                <span style={styles.guideValue}>{g.relics.join(', ')}</span>
              </div>
              <div style={styles.guideTip}>{g.tip}</div>
            </div>
          ))}
        </div>
      )}
      {tab === 'lore' && (
        <div style={styles.guideArea}>
          {/* sub-tab 행 */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, overflowX: 'auto' }}>
            {(['world','recalls','tablets','titles','decisions','named','acts'] as const).map((k) => (
              <button key={k}
                onClick={() => setLoreSub(k)}
                style={{
                  padding: '4px 8px', fontSize: 9, borderRadius: 4,
                  background: loreSub === k ? '#7B2D8E' : 'transparent',
                  color: loreSub === k ? '#fff' : '#bbb',
                  border: '1px solid #4a3a6e', cursor: 'pointer',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}>
                {k === 'world' ? '세계' : k === 'recalls' ? `회상 ${recallSeen.length}/30` :
                 k === 'tablets' ? `서판 ${tabletsSeen.length}/${SEALED_TABLET_COUNT}` :
                 k === 'titles' ? `칭호 ${earnedTitles.length}` :
                 k === 'decisions' ? '결정 연표' :
                 k === 'named' ? `이름 부하 ${namedMinionsOwned.length}/8` :
                 '카드 일대기'}
              </button>
            ))}
          </div>

          {loreSub === 'world' && (<>
            <div style={styles.guideIntro}>📜 세계관</div>
            <div style={styles.guideCard}>
              <div style={styles.guideName}>{LORE_SHORT.past}</div>
              <div style={styles.guideDesc}>{LORE_SHORT.now}</div>
              <div style={styles.guideTip}>{LORE_SHORT.enemy}</div>
              <div style={styles.guideTip}>{LORE_SHORT.player}</div>
              <div style={styles.guideTip}>{LORE_SHORT.arc}</div>
              <div style={styles.guideTip}>{LORE_SHORT.ending}</div>
            </div>
            <div style={styles.guideIntro}>🏰 챕터 테마</div>
            {Object.entries(CHAPTER_THEMES).map(([cid, t]) => (
              <div key={cid} style={styles.guideCard}>
                <div style={styles.guideName}>{cid.toUpperCase()} — {t.theme}</div>
                <div style={styles.guideDesc}>{t.line}</div>
              </div>
            ))}
            <div style={styles.guideIntro}>👥 NPC 4종</div>
            {Object.entries(NPC_ROLES).map(([nid, role]) => (
              <div key={nid} style={styles.guideCard}>
                <div style={styles.guideName}>{nid}</div>
                <div style={styles.guideDesc}>{role}</div>
              </div>
            ))}
            <div style={{ marginTop: 12, padding: 8, fontSize: 10, color: '#FDCB6E', background: 'rgba(20,12,42,0.5)', borderRadius: 4, textAlign: 'center' }}>
              도덕성 게이지: {moralityGauge > 0 ? `자비 +${moralityGauge}` : moralityGauge < 0 ? `잔혹 ${moralityGauge}` : '균형 0'}
            </div>
          </>)}

          {loreSub === 'recalls' && (<>
            <div style={styles.guideIntro}>👁 회상 ({recallSeen.length}/30)</div>
            {recallSeen.length === 0 && <div style={styles.guideCard}>아직 회상이 없습니다. 런을 진행하면 — 가끔 — 환각 컷이 옵니다.</div>}
            {DEMON_RECALLS.map((r) => {
              const seen = recallSeen.includes(r.id);
              return (
                <div key={r.id} style={{ ...styles.guideCard, opacity: seen ? 1 : 0.3 }}>
                  <div style={styles.guideName}>{seen ? r.flashLine : '— ?? —'}</div>
                  {seen && <div style={styles.guideDesc} dangerouslySetInnerHTML={{ __html: r.body.replace(/\n/g, '<br/>') }} />}
                </div>
              );
            })}
          </>)}

          {loreSub === 'tablets' && (<>
            <div style={styles.guideIntro}>📜 봉인의 서판 ({tabletsSeen.length}/{SEALED_TABLET_COUNT})</div>
            {tabletsSeen.length === 0 && <div style={styles.guideCard}>서판은 — 보스 처치 / 카드 강화 / NPC 호감 / 컨텐츠 진행 시 — 점진적으로 해금됩니다.</div>}
            {SEALED_TABLETS.map((t) => {
              const seen = tabletsSeen.includes(t.id);
              return (
                <div key={t.id} style={{ ...styles.guideCard, opacity: seen ? 1 : 0.25 }}>
                  <div style={styles.guideName}>{seen ? t.text : '— ?? —'}</div>
                  {seen && <div style={styles.guideDesc}>{t.attribution}</div>}
                </div>
              );
            })}
          </>)}

          {loreSub === 'titles' && (<>
            <div style={styles.guideIntro}>👑 칭호 ({earnedTitles.length}/{TITLES.length})</div>
            <div style={{ marginBottom: 6, fontSize: 10, color: '#FDCB6E' }}>장착 중: {equippedTitle ? (getTitle(equippedTitle)?.name ?? equippedTitle) : '(없음)'}</div>
            {TITLES.map((t) => {
              const owned = earnedTitles.includes(t.id);
              const isEq = equippedTitle === t.id;
              return (
                <button key={t.id}
                  disabled={!owned}
                  onClick={() => equipTitleAct(isEq ? null : t.id)}
                  style={{
                    ...styles.guideCard,
                    cursor: owned ? 'pointer' : 'not-allowed',
                    opacity: owned ? 1 : 0.4,
                    borderLeft: `3px solid ${RARITY_COLOR[t.rarity]}`,
                    width: '100%', textAlign: 'left',
                    fontFamily: 'inherit',
                    background: isEq ? 'rgba(253,203,110,0.2)' : 'rgba(20,12,42,0.6)',
                    color: 'inherit', border: 'none',
                  }}>
                  <div style={{ ...styles.guideName, color: RARITY_COLOR[t.rarity] }}>
                    {owned ? t.name : '— ?? —'} {isEq && <span style={{ color: '#FDCB6E', marginLeft: 4 }}>✓ 장착</span>}
                  </div>
                  <div style={styles.guideDesc}>{t.description}</div>
                </button>
              );
            })}
          </>)}

          {loreSub === 'decisions' && (<>
            <div style={styles.guideIntro}>📖 결정 연표 ({decisionLog.length})</div>
            {decisionLog.length === 0 && <div style={styles.guideCard}>아직 — 큰 결정이 없습니다. 챕터 / 분기 / NPC 선택 시 — 여기에 기록됩니다.</div>}
            {decisionLog.slice().reverse().slice(0, 50).map((d, i) => (
              <div key={i} style={styles.guideCard}>
                <div style={styles.guideName}>{d.choice}</div>
                <div style={styles.guideDesc}>{d.effect}</div>
                <div style={{ fontSize: 8, color: '#888', marginTop: 4 }}>{new Date(d.ts).toLocaleString()}</div>
              </div>
            ))}
          </>)}

          {loreSub === 'named' && (<>
            <div style={styles.guideIntro}>★ 이름 있는 부하 ({namedMinionsOwned.length}/8)</div>
            {NAMED_MINIONS.map((m) => {
              const owned = namedMinionsOwned.includes(m.id);
              return (
                <div key={m.id} style={{ ...styles.guideCard, opacity: owned ? 1 : 0.4, borderLeft: `3px solid ${m.accent}` }}>
                  <div style={{ ...styles.guideName, color: owned ? m.accent : '#888' }}>{owned ? m.name : '— ?? —'}</div>
                  <div style={styles.guideDesc}>{owned ? `「${m.epithet}」` : `해금: ${m.unlockLabel}`}</div>
                  {owned && m.pages.map((p, i) => (
                    <div key={i} style={{ ...styles.guideTip, marginTop: 4 }}>{p}</div>
                  ))}
                </div>
              );
            })}
          </>)}

          {loreSub === 'acts' && (<>
            <div style={styles.guideIntro}>📚 카드 일대기 (3막)</div>
            {CARD_LORE_3ACTS.map((c) => {
              const lv = cardLevels[c.monsterId] || 0;
              const acts = unlockedActsForLevel(lv);
              return (
                <div key={c.monsterId} style={styles.guideCard}>
                  <div style={styles.guideName}>{c.monsterId} (LV {lv} → {acts}막)</div>
                  {c.acts.slice(0, acts).map((a, i) => (
                    <div key={i} style={{ ...styles.guideTip, marginTop: 4 }}>{a}</div>
                  ))}
                  {acts < 3 && (
                    <div style={{ ...styles.guideTip, marginTop: 4, color: '#888' }}>
                      {acts === 1 ? `LV 3에서 — 봉사 막이 — 해금됩니다.` : `LV 5에서 — 각성 막이 — 해금됩니다.`}
                    </div>
                  )}
                </div>
              );
            })}
          </>)}
        </div>
      )}
      {tab === 'fusions' && <FusionsTab />}
      {tab === 'hidden' && <HiddenTab />}
      {tab === 'secrets' && <SecretsTab />}
      {tab !== 'guide' && tab !== 'lore' && tab !== 'fusions' && tab !== 'hidden' && tab !== 'secrets' && <div style={styles.grid}>
        {Object.entries(data.entries).map(([id, def]: [string, any]) => {
          const isDiscovered = data.disc.has(id);
          // OVERHAUL §3.5: heroes 탭에 조각 진행도 표시
          const fragments = tab === 'heroes' ? (heroFragments[id] || 0) : 0;
          const baneOn = tab === 'heroes' && heroBaneActive.includes(id);
          const isRecruited = tab === 'monsters' && recruitedSet.has(id);
          return (
            <button
              key={id}
              style={{
                ...styles.cell,
                ...(isDiscovered ? {} : styles.cellLocked),
                ...(baneOn ? { borderColor: '#F5A623', boxShadow: '0 0 6px rgba(245,166,35,0.5)' } : {}),
                ...(isRecruited ? { borderColor: '#26de81', boxShadow: '0 0 6px rgba(38,222,129,0.5)' } : {}),
              }}
              onClick={() => isDiscovered && setDetail({ id, def, tab })}
            >
              <SpriteOrIcon def={def} tab={tab} discovered={isDiscovered} />
              {isRecruited && (
                <span style={{
                  position: 'absolute', top: 2, right: 4,
                  fontSize: 9, color: '#26de81', fontWeight: 'bold',
                }}>✓</span>
              )}
              {tab === 'monsters' && isDiscovered && !isRecruited && (
                <span style={{
                  position: 'absolute', top: 2, left: 4,
                  fontSize: 8, color: '#FD79A8', fontWeight: 'bold',
                }}>👹</span>
              )}
              <div style={{ ...styles.nm, ...(isDiscovered ? {} : { color: '#555' }) }}>
                {isDiscovered ? def.name : '???'}
              </div>
              {isDiscovered && def.star && (
                <div style={styles.star}>{'★'.repeat(def.star)}</div>
              )}
              {tab === 'heroes' && isDiscovered && (
                <div style={styles.fragmentBar}>
                  <div style={{
                    ...styles.fragmentFill,
                    width: `${fragments}%`,
                    background: baneOn ? '#F5A623' : '#a55eea',
                  }} />
                </div>
              )}
              {tab === 'heroes' && isDiscovered && (
                <div style={styles.fragmentText}>
                  {baneOn ? '🩸 약화 적용' : `${fragments}/100`}
                </div>
              )}
            </button>
          );
        })}
      </div>}
      <button style={styles.backBtn} onClick={onBack}>닫기</button>

      {detail && (
        <DetailModal
          info={detail}
          onClose={() => setDetail(null)}
          onGoRecruit={onGoRecruit ? () => { setDetail(null); onGoRecruit(); } : undefined}
          recruitedSet={recruitedSet}
        />
      )}
      {buildDetail && (
        <BuildDetailModal build={buildDetail} onClose={() => setBuildDetail(null)} />
      )}
    </div>
  );
}

/** OVERHAUL §3.3: 빌드 상세 모달 — 추천 카드 / 추천 유물 / 진행 조건 */
function BuildDetailModal({ build, onClose }: { build: typeof BUILDS[number]; onClose: () => void }) {
  const goal = build.goal;
  const tagPicks = goal.tagPicks
    ? Object.entries(goal.tagPicks).map(([t, n]) => `${t} 태그 ${n}장 픽`).join(' / ')
    : null;
  return (
    <div style={detailStyles.backdrop} onClick={onClose}>
      <div style={detailStyles.card} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 50, marginBottom: 8 }}>{build.icon}</div>
        <div style={{ color: '#FFEAA7', fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>{build.name}</div>
        <div style={{ color: '#bbb', fontSize: 12, marginBottom: 14, textAlign: 'center' }}>{build.desc}</div>

        <div style={{ width: '100%', marginBottom: 8 }}>
          <div style={{ color: '#FD79A8', fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>달성 조건</div>
          {tagPicks && <div style={{ color: '#eaeaea', fontSize: 11, marginBottom: 2 }}>• {tagPicks}</div>}
          {goal.relicAny && (
            <div style={{ color: '#eaeaea', fontSize: 11, marginBottom: 2 }}>
              • 유물 (1+): {goal.relicAny.join(', ')}
            </div>
          )}
          {goal.synergyActiveProcs && (
            <div style={{ color: '#eaeaea', fontSize: 11, marginBottom: 2 }}>
              • {goal.synergyActiveProcs.id} 시너지 활성 처치 {goal.synergyActiveProcs.need}회
            </div>
          )}
          {goal.ultiUses !== undefined && (
            <div style={{ color: '#eaeaea', fontSize: 11, marginBottom: 2 }}>
              • 필살기 {goal.ultiUses}회 사용
            </div>
          )}
          {goal.bossKills !== undefined && (
            <div style={{ color: '#eaeaea', fontSize: 11, marginBottom: 2 }}>
              • 보스 {goal.bossKills}체 처치
            </div>
          )}
        </div>

        <div style={{ width: '100%', marginTop: 6, padding: '6px 8px', background: 'rgba(0,0,0,0.4)', borderRadius: 4 }}>
          <div style={{ color: '#FDCB6E', fontSize: 11, fontWeight: 'bold' }}>완성 보상</div>
          <div style={{ color: '#FFEAA7', fontSize: 11 }}>+{build.reward} 영혼석 (첫 달성 시 +100 추가)</div>
        </div>

        <button onClick={onClose} style={detailStyles.closeBtn}>닫기</button>
      </div>
    </div>
  );
}

/** V2 — 유물 진화 도감 탭 */
function FusionsTab() {
  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontSize: 11, color: '#a55eea', marginBottom: 8 }}>
        ⚗ 유물 진화 — 두 유물을 모두 보유하면 자동으로 진화 유물이 발동합니다.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {RELIC_FUSIONS.map((f) => (
          <div key={f.id} style={{
            background: 'rgba(30,20,60,0.6)',
            border: '1.5px solid #FDCB6E',
            borderRadius: 6,
            padding: 8,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}>
            {f.spriteId ? (
              <img
                src={`/sprites/${f.spriteId}.png`}
                alt={f.name}
                width={32}
                height={32}
                style={{ imageRendering: 'pixelated', flexShrink: 0 }}
              />
            ) : (
              <div style={{ fontSize: 22, minWidth: 32 }}>{f.icon}</div>
            )}
            <div style={{ flex: 1, fontSize: 9 }}>
              <div style={{ fontSize: 11, fontWeight: 'bold', color: '#FDCB6E' }}>{f.name}</div>
              <div style={{ color: '#bbb', marginTop: 2 }}>{f.parents[0]} + {f.parents[1]}</div>
              <div style={{ color: '#FFEAA7', marginTop: 4 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** V2 — 숨겨진 시너지 도감 탭 */
function HiddenTab() {
  const discovered = useSaveStore((s) => s.discoveredHiddenSynergies);
  const foundCount = HIDDEN_SYNERGIES.filter((h) => discovered.includes(h.id)).length;
  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontSize: 11, color: '#a55eea', marginBottom: 8 }}>
        ✨ 숨겨진 시너지 — 발견 {foundCount} / {HIDDEN_SYNERGIES.length}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {HIDDEN_SYNERGIES.map((h) => {
          const isFound = discovered.includes(h.id);
          const sprite = isFound ? h.spriteId : h.spriteIdLocked;
          return (
            <div key={h.id} style={{
              background: 'rgba(30,20,60,0.6)',
              border: `1.5px solid ${isFound ? '#FDCB6E' : '#4a3a6e'}`,
              borderRadius: 6,
              padding: 8,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              opacity: isFound ? 1 : 0.7,
            }}>
              {sprite ? (
                <img
                  src={`/sprites/${sprite}.png`}
                  alt={isFound ? h.name : '???'}
                  width={32}
                  height={32}
                  style={{ imageRendering: 'pixelated', flexShrink: 0 }}
                />
              ) : (
                <div style={{ fontSize: 22, minWidth: 32 }}>{isFound ? '✨' : '?'}</div>
              )}
              <div style={{ flex: 1, fontSize: 9 }}>
                <div style={{ fontSize: 11, fontWeight: 'bold', color: isFound ? '#FDCB6E' : '#888' }}>
                  {isFound ? h.name : '???'}
                </div>
                {isFound ? (
                  <>
                    <div style={{ color: '#bbb', marginTop: 2 }}>{h.requireIds.join(' + ')}</div>
                    <div style={{ color: '#FFEAA7', marginTop: 4 }}>{h.desc}</div>
                  </>
                ) : (
                  <div style={{ color: '#666', marginTop: 4 }}>특정 카드 조합으로 발견됩니다</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** V2 — 마왕 비밀 능력 도감 탭 */
function SecretsTab() {
  const unlocked = useSaveStore((s) => s.unlockedSecrets);
  const foundCount = DEMON_SECRETS.filter((s) => unlocked.includes(s.id)).length;
  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontSize: 11, color: '#F5A623', marginBottom: 8 }}>
        ✦ 마왕 비밀 능력 — 해금 {foundCount} / {DEMON_SECRETS.length} (영구)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {DEMON_SECRETS.map((sec) => {
          const isUnlocked = unlocked.includes(sec.id);
          return (
            <div key={sec.id} style={{
              background: 'rgba(40,25,15,0.6)',
              border: `1.5px solid ${isUnlocked ? '#F5A623' : '#4a3a6e'}`,
              borderRadius: 6,
              padding: 8,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              opacity: isUnlocked ? 1 : 0.6,
            }}>
              {sec.spriteId ? (
                <img
                  src={`/sprites/${sec.spriteId}.png`}
                  alt={sec.name}
                  width={32}
                  height={32}
                  style={{
                    imageRendering: 'pixelated',
                    flexShrink: 0,
                    filter: isUnlocked ? 'none' : 'grayscale(1)',
                  }}
                />
              ) : (
                <div style={{ fontSize: 22, minWidth: 32 }}>{sec.icon}</div>
              )}
              <div style={{ flex: 1, fontSize: 9 }}>
                <div style={{ fontSize: 11, fontWeight: 'bold', color: isUnlocked ? '#FDCB6E' : '#888' }}>
                  {sec.name}
                </div>
                <div style={{ color: '#bbb', marginTop: 2 }}>{sec.condition}</div>
                <div style={{ color: '#F5A623', marginTop: 4 }}>{sec.effectDesc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpriteOrIcon({ def, tab, discovered }: { def: any; tab: Tab; discovered: boolean }) {
  if (tab === 'relics') {
    return (
      <div style={{ fontSize: 24, lineHeight: 1, opacity: discovered ? 1 : 0.3 }}>
        {discovered ? def.icon : '?'}
      </div>
    );
  }
  // 캐릭터 sprite — 발견된 경우만 sprite 호출 (lazy)
  if (!discovered) {
    return <div style={{ width: 36, height: 36, background: '#15102a', borderRadius: 4 }} />;
  }
  return <SpriteThumbnail def={def} />;
}

function SpriteThumbnail({ def }: { def: any }) {
  const ref = (el: HTMLDivElement | null) => {
    if (!el || el.firstChild) return;
    try {
      const sprite = def.buildSprite();
      sprite.style.width = '36px';
      sprite.style.height = '36px';
      sprite.style.imageRendering = 'pixelated';
      el.appendChild(sprite);
    } catch (e) {
      // sprite 생성 실패 시 무시
    }
  };
  return <div ref={ref} style={{ width: 36, height: 36 }} />;
}

function DetailModal({ info, onClose, onGoRecruit, recruitedSet }: {
  info: { id: string; def: any; tab: Tab };
  onClose: () => void;
  onGoRecruit?: () => void;
  recruitedSet?: Set<string>;
}) {
  const { id, def, tab } = info;
  const isRelic = tab === 'relics';
  const isMonster = tab === 'monsters';
  const isHero = tab === 'heroes';
  const isBoss = tab === 'bosses';
  const isRecruited = isMonster && recruitedSet ? recruitedSet.has(id) : false;
  // W8: lore 통합
  const cardLore = isMonster ? getCardLore(id) : null;
  const heroLore = isHero ? getHeroLore(id) : null;
  const bossLore = isBoss ? getBossLore(id) : null;
  return (
    <div style={detailStyles.backdrop} onClick={onClose}>
      <div style={detailStyles.card} onClick={(e) => e.stopPropagation()}>
        {!isRelic ? <BigSprite def={def} /> : (
          <div style={{ fontSize: 50, marginBottom: 8 }}>{def.icon}</div>
        )}
        <div style={detailStyles.nm}>{def.name}</div>
        {(cardLore?.epithet || heroLore?.epithet || bossLore?.epithet) && (
          <div style={{ fontSize: 11, color: '#FDCB6E', fontStyle: 'italic', marginTop: -2, marginBottom: 4 }}>
            「{cardLore?.epithet || heroLore?.epithet || bossLore?.epithet}」
          </div>
        )}
        {def.star && <div style={detailStyles.star}>{'★'.repeat(def.star)}</div>}
        {!isRelic ? (
          <div style={detailStyles.stats}>
            {def.hp && <>HP {def.hp} · </>}
            {def.atk && <>ATK {def.atk} · </>}
            {def.range && <>사거리 {def.range}</>}
          </div>
        ) : (
          <div style={detailStyles.desc}>{def.desc}</div>
        )}
        {def.tags && <div style={detailStyles.tags}>[{def.tags.join(', ')}]</div>}
        {/* W8 백스토리 노출 */}
        {cardLore && (
          <div style={loreBoxStyle}>{cardLore.body}</div>
        )}
        {heroLore && (
          <div style={loreBoxStyle}>
            {heroLore.body.map((l, i) => <div key={i}>{l}</div>)}
            <div style={{ marginTop: 6, color: '#FF6B6B', fontStyle: 'italic' }}>"{heroLore.firstEncounterLine}"</div>
          </div>
        )}
        {bossLore && (
          <div style={loreBoxStyle}>
            {bossLore.body.map((l, i) => <div key={i}>{l}</div>)}
            <div style={{ marginTop: 6, color: '#FF6B6B', fontStyle: 'italic' }}>"{bossLore.entranceLine}"</div>
            {bossLore.phase2Line && <div style={{ marginTop: 2, color: '#FDCB6E', fontStyle: 'italic' }}>P2: "{bossLore.phase2Line}"</div>}
            <div style={{ marginTop: 4, color: '#a55eea', fontStyle: 'italic' }}>패배: "{bossLore.defeatLine}"</div>
          </div>
        )}
        {isMonster && (
          <div style={{
            marginTop: 8, fontSize: 10,
            color: isRecruited ? '#26de81' : '#FD79A8',
          }}>
            {isRecruited ? '✓ 카드풀 편입됨' : '👹 모집소에서 영입 가능 여부 확인'}
          </div>
        )}
        {isMonster && !isRecruited && onGoRecruit && (
          <button onClick={onGoRecruit} style={{
            marginTop: 8, width: '100%', padding: '8px',
            background: 'linear-gradient(180deg,#FD79A8,#7B2D8E)',
            border: '1px solid #FDCB6E', borderRadius: 4,
            color: '#fff', fontWeight: 'bold', fontSize: 11,
            cursor: 'pointer', fontFamily: 'inherit',
            letterSpacing: 1,
          }}>
            👹 모집소로 이동
          </button>
        )}
      </div>
    </div>
  );
}

const loreBoxStyle: React.CSSProperties = {
  marginTop: 10, padding: 10,
  background: 'rgba(0,0,0,0.5)',
  borderLeft: '2px solid #FD79A8',
  borderRadius: 4,
  fontSize: 11, color: '#ddd',
  lineHeight: 1.6, textAlign: 'left',
  width: '100%',
};

function BigSprite({ def }: { def: any }) {
  const ref = (el: HTMLDivElement | null) => {
    if (!el || el.firstChild) return;
    try {
      const sprite = def.buildSprite();
      sprite.style.width = '80px';
      sprite.style.height = '80px';
      sprite.style.imageRendering = 'pixelated';
      el.appendChild(sprite);
    } catch (e) {}
  };
  return <div ref={ref} style={{ width: 80, height: 80, marginBottom: 8 }} />;
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    padding: '18px 12px', background: 'rgba(5,3,15,0.96)',
  },
  title: { color: '#FFEAA7', fontSize: 22, letterSpacing: 3, textAlign: 'center', textShadow: '2px 2px 0 #000', margin: '8px 0 4px' },
  tabs: { display: 'flex', gap: 4, width: '100%', margin: '8px 0' },
  tab: {
    flex: 1, padding: 7, fontSize: 11, letterSpacing: 2,
    background: 'rgba(20,12,42,0.8)', border: '1px solid #4a3a6e',
    color: '#bbb', cursor: 'pointer', borderRadius: 4,
    fontWeight: 'bold', fontFamily: 'inherit',
  },
  tabActive: {
    background: 'linear-gradient(180deg,#7B2D8E,#3a0d4e)',
    borderColor: '#FDCB6E', color: '#fff',
  },
  progress: {
    width: '100%', padding: '5px 12px', fontSize: 11, color: '#FFEAA7',
    background: 'rgba(45,27,78,0.6)', border: '1px solid #4a3a6e',
    borderRadius: 4, marginBottom: 8, textAlign: 'center', letterSpacing: 1,
  },
  guideArea: {
    flex: 1, overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 8,
    paddingBottom: 4,
  },
  guideIntro: {
    color: '#FDCB6E', fontSize: 11, textAlign: 'center',
    padding: '6px 0', letterSpacing: 1,
  },
  guideCard: {
    background: 'linear-gradient(180deg,#241a3e,#0d0620)',
    border: '1px solid #4a3a6e', borderRadius: 6,
    padding: '10px 12px',
  },
  guideName: {
    color: '#FFEAA7', fontSize: 14, fontWeight: 'bold',
    marginBottom: 3, letterSpacing: 1,
  },
  guideDesc: {
    color: '#bbb', fontSize: 11, marginBottom: 8, lineHeight: 1.5,
  },
  guideRow: {
    display: 'flex', gap: 8, fontSize: 10, marginBottom: 3,
  },
  guideLabel: { color: '#FD79A8', minWidth: 50 },
  guideValue: { color: '#eaeaea', flex: 1 },
  guideTip: {
    fontSize: 10, color: '#FDCB6E', marginTop: 6,
    padding: '4px 8px', background: 'rgba(0,0,0,0.4)',
    borderRadius: 4, letterSpacing: 0.5,
  },
  // OVERHAUL §3.3: 빌드 칭호 그리드
  titleGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
    marginBottom: 12,
  },
  titleCard: {
    background: 'rgba(20,12,42,0.7)',
    border: '2px solid', borderRadius: 6,
    padding: '6px 4px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    minHeight: 64,
  },
  titleIcon: { fontSize: 22, lineHeight: 1, marginBottom: 2 },
  titleName: { fontSize: 9, fontWeight: 'bold', color: '#FFEAA7', textAlign: 'center', letterSpacing: 0.5 },
  titleDesc: { fontSize: 7, color: '#bbb', textAlign: 'center', marginTop: 2, lineHeight: 1.3 },
  // OVERHAUL §3.5: 적 도감 조각 진행도
  fragmentBar: {
    position: 'absolute', left: 2, right: 2, bottom: 12,
    height: 3, background: 'rgba(0,0,0,0.5)', borderRadius: 1.5,
    overflow: 'hidden',
  },
  fragmentFill: { height: '100%', transition: 'width 0.3s' },
  fragmentText: { position: 'absolute', bottom: 1, fontSize: 7, color: '#bbb', letterSpacing: 0.3 },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
    width: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: 4,
  },
  cell: {
    aspectRatio: '1', background: 'rgba(20,12,42,0.7)',
    border: '1px solid #4a3a6e', borderRadius: 4,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 3, cursor: 'pointer', position: 'relative',
    fontFamily: 'inherit', color: 'inherit',
  },
  cellLocked: { background: 'rgba(15,8,30,0.6)', borderColor: '#3a2d5c' },
  nm: { fontSize: 9, fontWeight: 'bold', textAlign: 'center', lineHeight: 1.1, marginTop: 2, color: '#fff' },
  star: { position: 'absolute', top: 1, right: 2, fontSize: 7, color: '#FDCB6E' },
  backBtn: {
    width: 200, alignSelf: 'center', padding: '10px 18px',
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '2px solid #FDCB6E', borderRadius: 5,
    color: '#fff', fontWeight: 'bold', fontSize: 13,
    boxShadow: '0 3px 0 #4a0a0a', cursor: 'pointer',
    fontFamily: 'inherit', marginTop: 8,
  },
};

const detailStyles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(5,3,15,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200,
  },
  card: {
    background: 'linear-gradient(180deg,#241a3e,#15102a)',
    border: '2px solid #FDCB6E', borderRadius: 8,
    padding: 18, maxWidth: 280, width: '90%',
    textAlign: 'center', boxShadow: '0 0 30px rgba(253,203,110,0.4)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  nm: { fontSize: 18, color: '#FDCB6E', fontWeight: 'bold', marginBottom: 4, letterSpacing: 2 },
  star: { color: '#FDCB6E', fontSize: 12, marginBottom: 6 },
  stats: { fontSize: 11, color: '#fff', lineHeight: 1.6 },
  desc: { fontSize: 11, color: '#FD79A8', marginTop: 6 },
  tags: { fontSize: 11, color: '#FD79A8', marginTop: 6 },
};
