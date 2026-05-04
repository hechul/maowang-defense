import { useEffect, useMemo, useState } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { STAGES, getStageById, recommendedNextStage } from '../../game/data/stages';
import { SKILLS, skillCost } from '../../game/data/skilltree';
import { DEMON_LINES_START, pickDemonLine } from '../../game/data/demonLines';
import { unlockedDemonPowers } from '../../game/data/demonPowers';
import { progressInLevel, DEMON_LEVEL_MAX } from '../../game/data/demonLevel';
import { tierFromXp, currentSeasonId, daysUntilSeasonEnd } from '../../game/data/seasonPass';
import { AttendanceModal } from '../components/AttendanceModal';
import { StarterPackModal } from '../components/StarterPackModal';
import { DailyQuestModal } from '../components/DailyQuestModal';
import type { ScreenId } from '../../App';

interface Props {
  onNavigate: (s: ScreenId) => void;
}

/**
 * 마왕성 내부 허브 — "방/공간" 컨셉 6실 + 보조 row.
 * - 큰 CTA: 다음 스테이지 도전
 * - 마왕 본체 + 대사 (시각 강조)
 * - 6 메인 공간: 작전 지도 / 모집소 / 제단 / 서재 / 왕좌 / 장식실
 * - 보조 row: 임무판 / 명예의 전당 / 보물고 / 심연 / 도전
 * - 첫 3분 유저 (runs < 3): 보물고/명예/심연/도전 약화 또는 잠금
 */
export function CastleHubScreen({ onNavigate }: Props) {
  const stones = useSaveStore((s) => s.soulstones);
  const bestWave = useSaveStore((s) => s.bestWave);
  const runs = useSaveStore((s) => s.runs);
  const clearedList = useSaveStore((s) => s.clearedStages);
  const recruitedIds = useSaveStore((s) => s.recruitedMonsterIds);
  const availableRecruitIds = useSaveStore((s) => s.availableRecruitIds);
  const skills = useSaveStore((s) => s.skills);
  const totalBossKills = useSaveStore((s) => s.totalBossKills);
  const discoveredMonsters = useSaveStore((s) => s.discoveredMonsters);
  const heroFragments = useSaveStore((s) => s.heroFragments);
  const equippedInteriors = useSaveStore((s) => s.equippedInteriors);
  const ownedInteriors = useSaveStore((s) => s.ownedInteriors);
  const dailyMissions = useSaveStore((s) => s.daily.missions);
  const endlessUnlocked = useSaveStore((s) => s.endlessUnlocked);
  const challengeUnlocked = useSaveStore((s) => s.challengeUnlocked);
  const currentStageId = useSaveStore((s) => s.currentStageId);
  const setSelectedStageId = useSaveStore((s) => s.setSelectedStageId);
  const attendance = useSaveStore((s) => s.attendance);
  const iap = useSaveStore((s) => s.iap);
  // v7 신규
  const demonExp = useSaveStore((s) => s.demonExp);
  const pendingDemonRewards = useSaveStore((s) => s.pendingDemonRewards);
  const seasonPass = useSaveStore((s) => s.seasonPass);
  const dailySeed = useSaveStore((s) => s.dailySeed);
  const mailbox = useSaveStore((s) => s.mailbox);
  const ensureCurrentSeason = useSaveStore((s) => s.ensureCurrentSeason);
  const cleanupExpiredMails = useSaveStore((s) => s.cleanupExpiredMails);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showStarterPack, setShowStarterPack] = useState(false);
  const [showDailyQuest, setShowDailyQuest] = useState(false);

  // 시즌 변경/만료 메일 정리 — 진입 시 1회
  useEffect(() => {
    ensureCurrentSeason();
    cleanupExpiredMails();
  }, [ensureCurrentSeason, cleanupExpiredMails]);

  // QA H-2: 신규 유저(runs===0)는 첫 진입 시 출석 모달 노출하지 않음
  useEffect(() => {
    if (runs === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    if (attendance.lastDate !== today) {
      const t = setTimeout(() => setShowAttendance(true), 600);
      return () => clearTimeout(t);
    }
    if (runs >= 5 && !iap.starterPackShown && !iap.starterPackPurchased) {
      const t = setTimeout(() => setShowStarterPack(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const onAttendanceClose = () => {
    setShowAttendance(false);
    if (runs >= 5 && !iap.starterPackShown && !iap.starterPackPurchased) {
      setTimeout(() => setShowStarterPack(true), 1200);
    }
  };

  // 추천/이어서 도전 결정
  const resumeStage = (currentStageId && !clearedList.includes(currentStageId))
    ? getStageById(currentStageId)
    : null;
  const recommended = recommendedNextStage(clearedList);
  const ctaStage = resumeStage ?? recommended;

  // 마왕 대사 — runs 변동마다 같은 대사 (안정적)
  const demonLine = useMemo(() => pickDemonLine(DEMON_LINES_START).text, [runs]);

  // 강화 가능 여부 — 영혼석으로 살 수 있는 skill이 1+
  const upgradableSkills = useMemo(() => {
    let count = 0;
    for (const id of Object.keys(SKILLS) as Array<keyof typeof SKILLS>) {
      const def = SKILLS[id];
      const rank = (skills as any)[id] ?? 0;
      if (rank >= def.max) continue;
      const cost = skillCost(id, rank, runs);
      if (stones >= cost) count++;
    }
    return count;
  }, [skills, stones, runs]);

  // 도감 신선도 — 발견 미만 모스터 수
  const monsterTotal = 24;  // 대략 — useMemo 통계용
  const newDiscoverable = Math.max(0, monsterTotal - discoveredMonsters.length);

  // 도감 조각 — 100 미만이지만 진행 중 hero 수
  const inProgressFragments = Object.values(heroFragments).filter((n) => n > 0 && n < 100).length;

  // 일일 미션 — 완료 + 미수령
  const claimableMissions = dailyMissions.filter((m) => !m.claimed && m.progress > 0).length;

  // 마왕 강화 — 다음 해금 게이지
  const dpUnlocked = unlockedDemonPowers(totalBossKills).length;
  const dpTotal = 8;  // demonPowers.ts 길이

  // 신규 유저 (runs < 3) 약화 영역
  const isFreshUser = runs < 3;

  // 인테리어 보유 — 기본 4개 외
  const interiorOwnedExtra = ownedInteriors.length - 4;
  void equippedInteriors;

  // v7: 마왕 레벨 진행도
  const lvProg = useMemo(() => progressInLevel(demonExp), [demonExp]);
  const seasonTier = useMemo(() => tierFromXp(seasonPass.xp), [seasonPass.xp]);
  // v11 NG+ 진입 가능 여부 — ch6_s5 클리어 시
  const ngPlusCycle = useSaveStore((s) => s.ngPlusCycle);
  const advanceNgPlus = useSaveStore((s) => s.advanceNgPlus);
  const ngPlusReady = clearedList.includes('ch6_s5');
  const today = new Date().toISOString().slice(0, 10);
  const dailyDone = dailySeed.date === today && dailySeed.attempted;
  const inboxUnread = mailbox.length;
  const pendingRewardsCount = pendingDemonRewards.length;
  const seasonDays = daysUntilSeasonEnd();

  return (
    <div style={styles.root}>
      {/* === 헤더: 영혼석/도장/wave === */}
      <div style={styles.header}>
        <div style={styles.title}>마왕성</div>
        <div style={styles.statRow}>
          <span style={styles.stat}>💎 {stones}</span>
          <span style={styles.stat}>🏰 {clearedList.length}/{STAGES.length}</span>
          <span style={styles.stat}>👹 {recruitedIds.length}</span>
          {bestWave > 0 && <span style={styles.stat}>📈 W{bestWave}</span>}
        </div>
      </div>

      {/* === 마왕 본체 + 대사 + EXP 바 (P0-1) === */}
      <div style={styles.demonRoom}>
        <div style={styles.demonAvatar} className="demon-idle">
          <div style={styles.demonOrb} />
          <div style={styles.demonFigure}>{getDemonIcon(bestWave)}</div>
        </div>
        <div style={styles.demonBubble}>
          <div style={styles.demonName}>
            — 마왕 <span style={styles.lvTag}>LV.{lvProg.level}</span>
            {pendingRewardsCount > 0 && (
              <span style={styles.rewardDot}>!{pendingRewardsCount}</span>
            )}
          </div>
          <div style={styles.demonText}>{demonLine}</div>
          {/* EXP 바 */}
          <div style={styles.expBar}>
            <div style={{
              ...styles.expFill,
              width: lvProg.isMax ? '100%' : `${(lvProg.expInLevel / lvProg.expForNext) * 100}%`,
            }} />
          </div>
          <div style={styles.expLabel}>
            {lvProg.isMax ? `MAX LV.${DEMON_LEVEL_MAX}` : `${lvProg.expInLevel} / ${lvProg.expForNext} EXP`}
          </div>
        </div>
        <button style={styles.demonSelectBtn} onClick={() => onNavigate('demonSelect')}>선택</button>
      </div>

      {/* === 큰 CTA: 다음 스테이지 도전 === */}
      {ctaStage ? (
        <button
          style={styles.cta}
          className="hub-cta-pulse"
          onClick={() => {
            setSelectedStageId(ctaStage.id);
            onNavigate('stageSelect');
          }}
        >
          <div style={styles.ctaTop}>{resumeStage ? '⚔ 이어서 도전' : '▶ 다음 스테이지'}</div>
          <div style={styles.ctaName}>{ctaStage.icon ?? '⚔'} {ctaStage.name}</div>
          <div style={styles.ctaSub}>웨이브 {ctaStage.waveLimit}</div>
        </button>
      ) : (
        <button style={styles.cta} onClick={() => onNavigate('stageSelect')}>
          <div style={styles.ctaTop}>🗺 작전 지도</div>
          <div style={styles.ctaName}>모든 스테이지 클리어 ✨</div>
          <div style={styles.ctaSub}>심연 방어전이 기다린다</div>
        </button>
      )}

      {/* === 메인 공간 6실 === */}
      <div style={styles.roomSection}>
        <div style={styles.sectionLabel}>마왕성 내부</div>
        <div style={styles.roomsGrid}>
          {/* 작전 지도 */}
          <RoomTile
            icon="🗺" label="작전 지도" hint="챕터 진행"
            badge={recommended ? '▶' : null} accent="#FD79A8"
            onClick={() => onNavigate('stageSelect')}
          />
          {/* 모집소 */}
          <RoomTile
            icon="👹" label="모집소" hint={availableRecruitIds.length > 0 ? '새 부하 대기 중!' : '카드 풀 관리'}
            badge={availableRecruitIds.length > 0 ? String(availableRecruitIds.length) : null}
            accent="#26de81"
            onClick={() => onNavigate('recruit')}
          />
          {/* 제단 */}
          <RoomTile
            icon="🏛" label="제단" hint={upgradableSkills > 0 ? '강화 가능' : '영혼 강화'}
            badge={upgradableSkills > 0 ? String(upgradableSkills) : null}
            accent="#FDCB6E"
            onClick={() => onNavigate('skills')}
          />
          {/* 서재 */}
          <RoomTile
            icon="📖" label="서재" hint={inProgressFragments > 0 ? `조각 ${inProgressFragments}` : '도감/약점'}
            badge={newDiscoverable > 0 && newDiscoverable < monsterTotal ? '!' : null}
            accent="#a55eea"
            onClick={() => onNavigate('bestiary')}
          />
          {/* 왕좌실 — NPC 4명과 대화 + 마왕 강화 게이지 표시 */}
          <RoomTile
            icon="👑" label="왕좌실" hint={`NPC 4 · 강화 ${dpUnlocked}/${dpTotal}`}
            badge={'4'}
            accent="#7B2D8E"
            onClick={() => onNavigate('throneRoom')}
          />
          {/* 장식실 */}
          <RoomTile
            icon="🎨" label="장식실"
            hint={interiorOwnedExtra > 0 ? `보유 +${interiorOwnedExtra}` : '꾸미기'}
            badge={null}
            accent="#74B9FF"
            onClick={() => onNavigate('interior')}
          />
        </div>
      </div>

      {/* === 보조 row 1: 시즌/일일/우편/PvP === */}
      <div style={styles.subSection}>
        <div style={styles.sectionLabel}>오늘의 도전</div>
        <div style={styles.subRow4}>
          <SubTile
            icon="🎫" label="시즌"
            badge={`T${seasonTier}`}
            onClick={() => onNavigate('seasonPass')}
          />
          <SubTile
            icon="🌅" label="일일"
            badge={dailyDone ? '✓' : '!'}
            onClick={() => onNavigate('daily')}
          />
          <SubTile
            icon="📬" label="우편함"
            badge={inboxUnread > 0 ? String(inboxUnread) : null}
            onClick={() => onNavigate('inbox')}
          />
          <SubTile
            icon="⚔" label="PvP"
            badge="!"
            onClick={() => onNavigate('pvp')}
          />
        </div>
      </div>

      {/* === 보조 row 1.5: 이벤트/친구 === */}
      <div style={styles.subSection}>
        <div style={styles.sectionLabel}>커뮤니티 / 한정</div>
        <div style={styles.subRow4}>
          <SubTile
            icon="🎉" label="이벤트"
            badge="HOT"
            onClick={() => onNavigate('events')}
          />
          <SubTile
            icon="👥" label="친구"
            onClick={() => onNavigate('friends')}
          />
          <SubTile
            icon="🗓" label={`${seasonDays}일`}
            dim={true}
            onClick={() => onNavigate('seasonPass')}
          />
          <SubTile
            icon="🦇" label="마왕"
            onClick={() => onNavigate('demonSelect')}
          />
          <SubTile
            icon="🃏" label="미니"
            onClick={() => onNavigate('memoryGame')}
          />
          <SubTile
            icon="📋" label="퀘스트"
            badge="!"
            onClick={() => setShowDailyQuest(true)}
          />
        </div>
      </div>

      {/* === 보조 row 2: 덱/카드강화 === */}
      <div style={styles.subSection}>
        <div style={styles.sectionLabel}>나의 군세</div>
        <div style={styles.subRow4}>
          <SubTile
            icon="🃏" label="내 덱"
            onClick={() => onNavigate('deck')}
          />
          <SubTile
            icon="⚡" label="강화"
            onClick={() => onNavigate('cardEnhance')}
          />
          <SubTile
            icon="📜" label="임무"
            badge={claimableMissions > 0 ? String(claimableMissions) : null}
            onClick={() => onNavigate('missions')}
          />
          <SubTile
            icon="🏆" label="명예"
            dim={isFreshUser}
            onClick={() => onNavigate('achievements')}
          />
        </div>
      </div>

      {/* === 보조 row 3: 순위/보물고/심연/도전 === */}
      <div style={styles.subSection}>
        <div style={styles.sectionLabel}>그 외 영역</div>
        <div style={styles.subRow4}>
          <SubTile
            icon="📊" label="순위"
            dim={isFreshUser}
            onClick={() => onNavigate('leaderboard')}
          />
          <SubTile
            icon="💎" label="보물고"
            dim={isFreshUser}
            onClick={() => onNavigate('shop')}
          />
          <SubTile
            icon="🌌" label="심연" badge={endlessUnlocked && bestWave > 0 ? `W${bestWave}` : null}
            locked={!endlessUnlocked}
            lockHint="ch1 마지막 보스 처치"
            onClick={() => onNavigate('game')}
          />
          <SubTile
            icon="⚔" label="도전"
            locked={!challengeUnlocked}
            lockHint="보스 5마리 처치"
            dim={isFreshUser && challengeUnlocked}
            onClick={() => onNavigate('challenges')}
          />
        </div>
      </div>

      {/* 하단 부가 */}
      <div style={styles.footer}>
        <button style={styles.smallBtn} onClick={() => onNavigate('privacy')}>개인정보</button>
        <button style={styles.smallBtn} onClick={() => onNavigate('support')}>고객지원</button>
      </div>

      {/* v11 NG+ 진입 옵션 — ch6_s5 클리어 시 */}
      {ngPlusReady && (
        <div style={styles.ngPlusBox}>
          <div style={styles.ngPlusLabel}>【진왕 — NG+ {ngPlusCycle > 0 ? ngPlusCycle : ''}】</div>
          <div style={styles.ngPlusDesc}>
            {ngPlusCycle === 0
              ? '챕터 6 클리어. 진왕의 — 두 번째 — 천 년을 — 시작하시겠습니까? (적 +50%, 보상 ×2)'
              : `현재 NG+${ngPlusCycle} 진행 중. 더 — 깊이 — 도전하시겠습니까?`}
          </div>
          <button
            style={styles.ngPlusBtn}
            onClick={() => {
              if (window.confirm(`NG+${ngPlusCycle + 1} 차수에 진입합니다. 진행을 — 받아들이시겠습니까?`)) {
                const next = advanceNgPlus();
                alert(`NG+${next} 진입 완료. 다음 런부터 적이 강해집니다.`);
              }
            }}
          >
            🌑 NG+{ngPlusCycle + 1} 진입
          </button>
        </div>
      )}

      {/* P2-3 인터랙티브 튜토리얼 — 첫 3분 단계적 가이드 */}
      {runs === 0 && !pendingRewardsCount && (
        <div style={styles.firstHint}>
          <div>👋 처음 오셨군요. 큰 빨간 버튼으로 첫 침공을 시작하세요.</div>
        </div>
      )}
      {runs >= 1 && runs < 3 && pendingRewardsCount === 0 && (
        <div style={styles.firstHint}>
          <div>💡 영혼석으로 <b>제단</b>에서 영구 강화하면 다음 런이 더 멀리 갑니다.</div>
        </div>
      )}
      {runs >= 3 && pendingRewardsCount > 0 && (
        <div style={styles.firstHintWarn}>
          <div>🎁 마왕 레벨업 보상 <b>{pendingRewardsCount}개</b> 미수령 — 결과 화면에서 받으세요.</div>
        </div>
      )}

      {showAttendance && <AttendanceModal onClose={onAttendanceClose} />}
      {showStarterPack && <StarterPackModal onClose={() => setShowStarterPack(false)} />}
      {showDailyQuest && <DailyQuestModal onClose={() => setShowDailyQuest(false)} />}

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
  icon: string; label: string; hint: string;
  badge: string | null; accent: string;
  onClick: () => void;
}) {
  return (
    <button style={{
      ...styles.room,
      borderColor: accent,
      boxShadow: `0 3px 0 #15102a, 0 0 6px ${accent}55`,
    }} onClick={onClick}>
      <div style={styles.roomIcon}>{icon}</div>
      <div style={styles.roomLabel}>{label}</div>
      <div style={styles.roomHint}>{hint}</div>
      {badge && (
        <div style={{ ...styles.roomBadge, background: accent }}>{badge}</div>
      )}
    </button>
  );
}

function SubTile({ icon, label, badge, locked, dim, lockHint, onClick }: {
  icon: string; label: string;
  badge?: string | null;
  locked?: boolean; dim?: boolean;
  lockHint?: string;
  onClick: () => void;
}) {
  return (
    <button
      style={{
        ...styles.sub,
        ...(locked ? styles.subLocked : {}),
        ...(dim && !locked ? styles.subDim : {}),
      }}
      disabled={locked}
      onClick={onClick}
      title={lockHint}
    >
      <div style={styles.subIcon}>{locked ? '🔒' : icon}</div>
      <div style={styles.subLabel}>{label}</div>
      {badge && !locked && <div style={styles.subBadge}>{badge}</div>}
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
    fontSize: 24, fontWeight: 'bold', letterSpacing: 6,
    color: '#FD79A8',
    textShadow: '2px 2px 0 #000, 0 0 12px rgba(253,121,168,0.6)',
    marginBottom: 6,
  },
  statRow: {
    display: 'flex', justifyContent: 'center', gap: 8,
    fontSize: 10, color: '#FFEAA7',
  },
  stat: {
    background: 'rgba(20,12,42,0.7)',
    border: '1px solid #4a3a6e',
    padding: '3px 7px', borderRadius: 4,
  },
  // 마왕 본체 영역 — 옥좌실 느낌
  demonRoom: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'linear-gradient(180deg,rgba(58,29,142,0.6),rgba(20,12,42,0.6))',
    border: '1.5px solid #7B2D8E', borderRadius: 8,
    padding: '8px 10px', marginBottom: 10,
    boxShadow: 'inset 0 0 12px rgba(123,45,142,0.4)',
  },
  demonAvatar: {
    position: 'relative', width: 44, height: 44,
    flexShrink: 0,
  },
  demonOrb: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(circle,#7B2D8E,#1a0828)',
    border: '1.5px solid #FDCB6E', borderRadius: '50%',
    boxShadow: '0 0 8px rgba(253,121,168,0.5)',
  },
  demonFigure: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24,
  },
  demonBubble: { flex: 1, minWidth: 0 },
  demonName: { fontSize: 9, color: '#FD79A8', letterSpacing: 1 },
  demonText: { fontSize: 11, color: '#FFEAA7', marginTop: 2, fontStyle: 'italic', lineHeight: 1.4 },
  // CTA — 큰 버튼
  cta: {
    width: '100%',
    background: 'radial-gradient(ellipse at 50% 30%, #FF7675 0%, #D63031 50%, #7a1818 100%)',
    border: '3px solid #FDCB6E', borderRadius: 10,
    padding: '12px 16px',
    color: '#fff', fontFamily: 'inherit', cursor: 'pointer',
    marginBottom: 12, textAlign: 'center',
    boxShadow: '0 4px 0 #4a0a0a',
  },
  ctaTop: { fontSize: 10, color: '#FDCB6E', letterSpacing: 2, marginBottom: 2 },
  ctaName: { fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  ctaSub: { fontSize: 9, color: '#FFEAA7', marginTop: 2, opacity: 0.8 },
  // 메인 공간 섹션
  roomSection: { marginBottom: 12 },
  sectionLabel: {
    fontSize: 9, color: '#a55eea', letterSpacing: 2, fontWeight: 'bold',
    marginBottom: 6, paddingLeft: 2,
  },
  roomsGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6,
  },
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
  // 보조 row
  subSection: { marginBottom: 10 },
  subRow: {
    display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3,
  },
  subRow4: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
  },
  // P0-1 마왕 레벨 EXP 바
  lvTag: { color: '#FDCB6E', fontSize: 9, marginLeft: 4, fontWeight: 'bold' },
  rewardDot: {
    background: '#FF6B6B', color: '#fff',
    fontSize: 8, fontWeight: 'bold',
    padding: '1px 4px', borderRadius: 6, marginLeft: 4,
  },
  expBar: {
    height: 4, background: 'rgba(0,0,0,0.5)',
    borderRadius: 2, overflow: 'hidden',
    border: '1px solid #4a3a6e', marginTop: 4,
  },
  expFill: {
    height: '100%',
    background: 'linear-gradient(90deg,#FDCB6E,#FD79A8)',
    transition: 'width 0.3s',
  },
  expLabel: { fontSize: 8, color: '#a55eea', marginTop: 2, textAlign: 'right' },
  demonSelectBtn: {
    background: 'rgba(123,45,142,0.6)', border: '1px solid #FD79A8',
    color: '#FFEAA7', fontSize: 9, padding: '4px 6px',
    borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
    flexShrink: 0,
  },
  sub: {
    position: 'relative',
    background: 'rgba(20,12,42,0.7)', border: '1px solid #4a3a6e',
    borderRadius: 5, padding: '7px 2px',
    color: '#FFEAA7', fontFamily: 'inherit', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    fontSize: 9,
  },
  subLocked: { opacity: 0.45, cursor: 'not-allowed', borderStyle: 'dashed' },
  subDim: { opacity: 0.5 },
  subIcon: { fontSize: 16, lineHeight: 1, marginBottom: 2 },
  subLabel: { fontSize: 9, letterSpacing: 0.5 },
  subBadge: {
    position: 'absolute', top: -4, right: -4,
    background: '#FF6B6B', color: '#fff',
    fontSize: 8, fontWeight: 'bold',
    padding: '1px 4px', borderRadius: 6,
  },
  footer: {
    display: 'flex', justifyContent: 'center', gap: 8, marginTop: 6,
  },
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
  firstHintWarn: {
    marginTop: 8, padding: '8px 10px',
    background: 'rgba(253,203,110,0.15)',
    border: '1px solid #FDCB6E', borderRadius: 6,
    fontSize: 10, color: '#FDCB6E', lineHeight: 1.4,
  },
  // v11 NG+
  ngPlusBox: {
    marginTop: 8, padding: 10,
    background: 'linear-gradient(180deg,rgba(253,203,110,0.2),rgba(123,45,142,0.15))',
    border: '1.5px solid #FDCB6E', borderRadius: 6,
  },
  ngPlusLabel: { fontSize: 11, fontWeight: 'bold', color: '#FDCB6E', letterSpacing: 2 },
  ngPlusDesc: { fontSize: 10, color: '#FFEAA7', marginTop: 4, lineHeight: 1.5 },
  ngPlusBtn: {
    marginTop: 8, width: '100%', padding: '8px',
    background: 'linear-gradient(180deg,#7B2D8E,#1a0828)',
    border: '2px solid #FDCB6E', color: '#fff',
    borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold',
    fontSize: 12, letterSpacing: 2,
  },
};
