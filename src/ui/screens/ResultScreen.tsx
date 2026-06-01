import { useEffect, useMemo, useRef } from 'react';
import type { ScreenId } from '../../App';
import type { GameOverStats } from '../../game/GameEngine';
import { useSaveStore } from '../../store/useSaveStore';
import * as Ait from '../../sdk/AitBridge';
import { SKILLS, skillCost } from '../../game/data/skilltree';
import { MISSION_POOL } from '../../game/data/missions';
import { BUILDS } from '../../game/data/builds';
import { MONSTERS } from '../../game/data/monsters';
import { BOSSES } from '../../game/data/bosses';
import { getStageById, nextStageId, isStageUnlocked } from '../../game/data/stages';
import { getRecruitById } from '../../game/data/recruits';
import { CHALLENGES } from '../../game/data/challenges';
import { progressInLevel, calcRunExp } from '../../game/data/demonLevel';
import { MICRO_LINES, pickMicroLine, pickDailyMicroLine } from '../../game/data/microLines';
import { NPCS, pickNpcLine } from '../../game/data/npcs';
import { AD_ENTRIES, getAdEntry } from '../../game/data/adRewards';
import { ENABLE_MONETIZATION } from '../../config/mvpFlags';

/**
 * ★ 작전 화면 — 사망 원인 추정 로직
 *
 * 우선순위 (위에서 아래로):
 *   1. 보스에게 사망 → 해당 보스 명시
 *   2. 페이즈 2 폭발 / 보스 castleStrike (10초 누적 dmg가 큼) → 마왕성 HP 강화 추천
 *   3. healer 미처치 (encountered > 0 + healerKills/encountered < 0.5) → 원거리/마법 빌드 추천
 *   4. 마력 부족 (lowMpStreaks > 30초) → 시작 마력 / 카드 비용 감소
 *   5. 몬스터 수 부족 (lateGameMonsterCount < 3 + wave >= 5) → 카드 비용 감소 / 시작 마력
 *   6. 마왕성 빠르게 깎임 (last10s > maxHp 30%) → 마왕성 HP
 *   7. 일반 사망 → bestWave별 다음 목표
 */
function inferDeathCause(stats: GameOverStats, castleMaxHpEstimate: number): {
  reason: string;
  detail: string;
  recommendedSkillId: string;
} {
  if (stats.diedDuringBoss && stats.diedToBossId) {
    const bossDef = BOSSES[stats.diedToBossId];
    return {
      reason: `${bossDef?.name ?? '보스'}에게 사망`,
      detail: '보스 페이즈 2 처리력이 부족했다',
      recommendedSkillId: stats.bossKills === 0 ? 'monAtk' : 'ultiDmg',
    };
  }
  if (stats.castleDamageLast10s > castleMaxHpEstimate * 0.3) {
    return {
      reason: '마왕성이 순식간에 무너졌다',
      detail: `마지막 10초 동안 ${Math.ceil(stats.castleDamageLast10s)} HP 손실`,
      recommendedSkillId: 'castleHp',
    };
  }
  if (stats.healerEncountered >= 2 && stats.healerKills / Math.max(1, stats.healerEncountered) < 0.5) {
    return {
      reason: '힐러를 처치하지 못했다',
      detail: `힐러 ${stats.healerEncountered}명 등장 / ${stats.healerKills}명 처치`,
      recommendedSkillId: 'monAtk',
    };
  }
  if (stats.lowMpStreaks > 30) {
    return {
      reason: '마력이 자주 부족했다',
      detail: `${Math.floor(stats.lowMpStreaks)}초 동안 카드를 못 펼침`,
      recommendedSkillId: 'cardCost',
    };
  }
  if (stats.lateGameMonsterCount < 3 && stats.wave >= 5) {
    return {
      reason: '몬스터 수가 부족했다',
      detail: `사망 직전 살아있던 몬스터 ${stats.lateGameMonsterCount}마리`,
      recommendedSkillId: 'startMp',
    };
  }
  // 일반 — wave 기반
  if (stats.wave < 5) {
    return {
      reason: '첫 보스까지 가지 못했다',
      detail: '마왕성 HP 또는 시작 마력을 강화해보자',
      recommendedSkillId: 'castleHp',
    };
  }
  return {
    reason: '용맹한 시도였다',
    detail: '다음 런은 더 멀리',
    recommendedSkillId: 'monAtk',
  };
}

/** 태그 → 한글 라벨 (dominant build가 없을 때 fallback 표시) */
const TAG_LABEL: Record<string, string> = {
  undead: '언데드', zombie: '좀비', skeleton: '해골',
  fire: '화염', magic: '마법', dark: '어둠',
  tank: '탱커', beast: '야수', orc: '오크',
  support: '지원', demon: '악마', goblin: '고블린',
};

/** 추천 강화 라벨 매핑 */
const SKILL_REASON: Record<string, string> = {
  castleHp: '마왕성을 더 단단하게',
  startMp: '첫 카드를 더 빨리',
  cardCost: '카드를 더 자주',
  monAtk: '용사를 더 빨리 처치',
  monHp: '몬스터가 오래 버틴다',
  ultiDmg: '필살기 한 방의 무게',
  ultiCharge: '필살기를 더 자주',
  aura: '주변 몬스터 강화',
  startMon: '시작부터 군세',
};

export function ResultScreen({ stats, onNavigate, onStartStage, onRetryStage }: {
  stats: GameOverStats | null;
  onNavigate: (s: ScreenId) => void;
  /** 클리어 후 다음 스테이지 즉시 진입 */
  onStartStage?: (stageId: string) => void;
  /** 같은 스테이지 재도전 (실패 시) */
  onRetryStage?: (stageId: string) => void;
}) {
  const bestWave = useSaveStore((s) => s.bestWave);
  const addStones = useSaveStore((s) => s.addStones);
  const soulstones = useSaveStore((s) => s.soulstones);
  const skillsState = useSaveStore((s) => s.skills);
  const runs = useSaveStore((s) => s.runs);
  // v7
  const demonExp = useSaveStore((s) => s.demonExp);
  const lastRunExp = useSaveStore((s) => s.lastRunExp);
  const pendingDemonRewards = useSaveStore((s) => s.pendingDemonRewards);
  const claimPendingDemonRewards = useSaveStore((s) => s.claimPendingDemonRewards);
  const recordChallengeStar = useSaveStore((s) => s.recordChallengeStar);
  const addSeasonXp = useSaveStore((s) => s.addSeasonXp);
  const addDemonExp = useSaveStore((s) => s.addDemonExp);
  const bumpDeathStreak = useSaveStore((s) => s.bumpDeathStreak);
  const resetDeathStreak = useSaveStore((s) => s.resetDeathStreak);
  const deathStreakByChapter = useSaveStore((s) => s.deathStreakByChapter);
  const lvProg = useMemo(() => progressInLevel(demonExp), [demonExp]);
  const oncePerStatsRef = useRef<GameOverStats | null>(null);
  const echoLineRef = useRef<string>('');
  const npcReactionRef = useRef<{ npc: typeof NPCS[number]; line: string } | null>(null);
  const deathStreakChapterRef = useRef<{ chapterId: string; streak: number } | null>(null);

  // P0-1/P0-2/P1-5: 결과 화면 진입 시 한 번 — buildBonus/discovery exp 추가 + 챌린지 별점 + 시즌 XP
  useEffect(() => {
    if (!stats || oncePerStatsRef.current === stats) return;
    oncePerStatsRef.current = stats;
    // P0-1: 추가 EXP (recordRun에서 wave 베이스만 적립됨 → 여기서 buildBonus/discovery/victory 더하기)
    const baseExp = Math.max(10, Math.floor((stats.wave ?? 0) * 8));
    const extra = calcRunExp({
      wave: stats.wave ?? 0,
      bossKills: stats.bossKills ?? 0,
      buildCompleted: !!stats.buildCompleted,
      newDiscovered: 0,
      isVictory: !!stats.isVictory,
    }) - baseExp;
    if (extra > 0) addDemonExp(extra);
    // P0-2: 시즌 XP 추가 (recordRun base는 wave*4+kills, 보너스로 +20)
    addSeasonXp(20);
    // P1-5: 챌린지 별점 — challengeId가 있고 wave 도달 시
    const gmode = stats.gameMode;
    const chId = (gmode && gmode.kind === 'challenge') ? gmode.challengeId : (stats.challengeIdAtClear || null);
    if (chId && stats.wave) {
      let star: 1 | 2 | 3 | null = null;
      if (stats.wave >= 25) star = 3;
      else if (stats.wave >= 20) star = 2;
      else if (stats.wave >= 15) star = 1;
      if (star) recordChallengeStar(chId, star);
    }
    // W4 마이크로 에코 — clearEcho / defeatEcho (스테이지 모드면 cleared 우선)
    const isVictory = !!stats.cleared;
    echoLineRef.current = pickMicroLine(
      isVictory ? MICRO_LINES.clearEcho : MICRO_LINES.defeatEcho,
      stats.wave * 31 + stats.killCount * 7,
    );
    // W5 사망 누적 트래킹 (스테이지 모드일 때만 챕터 식별)
    const stageId = stats.stageId || null;
    if (stageId) {
      const chapterId = stageId.split('_')[0];
      if (isVictory) {
        resetDeathStreak(chapterId);
      } else {
        const newStreak = bumpDeathStreak(chapterId);
        deathStreakChapterRef.current = { chapterId, streak: newStreak };
      }
    }
    // W3 NPC 사망 누적 반응 — 5/10회 누적 시 NPC 한 줄
    if (!isVictory && deathStreakChapterRef.current && deathStreakChapterRef.current.streak >= 3) {
      const streak = deathStreakChapterRef.current.streak;
      // 누적이 깊을수록 다른 NPC. Vael(3-4) → Iset(5-9) → Krug(10+)
      const npcId = streak >= 10 ? 'krug' : streak >= 5 ? 'iset' : 'vael';
      const npc = NPCS.find((n) => n.id === npcId)!;
      npcReactionRef.current = {
        npc,
        line: pickNpcLine(npc, 'after_defeat', stats.wave * 11 + streak * 41),
      };
    } else if (isVictory) {
      // 클리어 시 NPC 축하
      const npc = NPCS[0];  // Vael
      npcReactionRef.current = {
        npc,
        line: pickNpcLine(npc, 'after_victory', stats.wave * 13),
      };
    } else {
      // 일반 사망
      const npc = NPCS[0];
      npcReactionRef.current = {
        npc,
        line: pickNpcLine(npc, 'after_defeat', stats.wave * 17),
      };
    }
  }, [stats, addDemonExp, addSeasonXp, recordChallengeStar, bumpDeathStreak, resetDeathStreak]);
  // 일일 모드인지 확인 — store에 dailySeed.attempted = true 갱신된 후
  const isDailyMode = stats?.gameMode?.kind === 'endless' && useSaveStore.getState().dailySeed.date === new Date().toISOString().slice(0, 10);
  const dailyHint = isDailyMode
    ? pickDailyMicroLine(MICRO_LINES.dailySeedDaily, new Date().toISOString().slice(0, 10))
    : '';
  void deathStreakByChapter;  // 의존성 강제용 — 실제로는 effect 안에서 ref로 보존

  if (!stats) {
    return (
      <div style={styles.root}>
        <h1 style={styles.title}>패배</h1>
        <button style={styles.btn} onClick={() => onNavigate('title')}>타이틀로</button>
      </div>
    );
  }

  const isNewRecord = stats.wave > bestWave;

  // 첫 3세션 광고 없음 정책 (UXUI 명시) — runs는 gameOver에서 +1되므로
  // 현재 ResultScreen 도착 시점에는 이미 카운트됨. 따라서 "수정 후 runs" 기준 < 4 = 광고 없음
  const adFreeFirstSessions = runs <= 3;

  // 일일 미션 진행도 — 이번 런으로 진행된 미션 노출
  const daily = useSaveStore((s) => s.daily);
  const todayMissions = daily.missions.map((m) => {
    const def = MISSION_POOL.find((x) => x.id === m.id);
    if (!def) return null;
    return {
      id: m.id,
      icon: def.icon,
      name: def.name,
      progress: m.progress,
      target: def.target,
      claimed: m.claimed,
      complete: m.progress >= def.target,
    };
  }).filter(Boolean) as any[];
  const completedMissions = todayMissions.filter((m) => m.complete && !m.claimed);

  // ★ 작전 화면: 사망 원인 추정
  const skillsLevel = (skillsState as any).castleHp || 0;
  const castleMaxHpEstimate = 1000 * (1 + skillsLevel * 0.10);
  const death = inferDeathCause(stats, castleMaxHpEstimate);

  // ★ 컨텍스트 강화 — 사망 원인 → 추천 skillId 우선 (살 수 있으면), 그 외 fallback
  const recommendedUpgrade = (() => {
    const tryIds = [death.recommendedSkillId, 'monAtk', 'castleHp', 'startMp', 'cardCost', 'monHp', 'ultiDmg'];
    const SKILL_LABEL: Record<string, string> = {
      castleHp: '마왕성 HP +10%',
      startMp: '시작 마력 +50',
      cardCost: '카드 펼치기 비용 -5%',
      monAtk: '몬스터 공격력 +5%',
      monHp: '몬스터 HP +5%',
      ultiDmg: '필살기 데미지 +10%',
      ultiCharge: '필살기 충전 +5%',
      aura: '주변 몬스터 공격 +3%',
      startMon: '시작 슬라임 +1체',
    };
    const seen = new Set<string>();
    for (const id of tryIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const def = SKILLS[id as keyof typeof SKILLS];
      if (!def) continue;
      const rank = (skillsState as any)[id] || 0;
      if (rank >= def.max) continue;
      const cost = skillCost(id as any, rank, runs);
      if (soulstones >= cost) {
        return { id, label: SKILL_LABEL[id] || id, cost, rank, def };
      }
    }
    return null;
  })();

  // QA M-6: 영혼석 부족해도 가장 가까운 강화 목표 표시 (첫 사망 가이드)
  const upcomingUpgrade = recommendedUpgrade ? null : (() => {
    const candidates = [
      { id: 'castleHp' as const,  label: '마왕성 HP +10%' },
      { id: 'startMp' as const,   label: '시작 마력 +50' },
      { id: 'cardCost' as const,  label: '카드 펼치기 비용 -5%' },
      { id: 'monAtk' as const,    label: '몬스터 공격력 +10%' },
      { id: 'monHp' as const,     label: '몬스터 HP +10%' },
    ];
    let cheapest: { id: any; label: string; cost: number; def: any; short: number } | null = null;
    for (const c of candidates) {
      const def = SKILLS[c.id];
      const rank = (skillsState as any)[c.id] || 0;
      if (rank >= def.max) continue;
      const cost = skillCost(c.id, rank, runs);
      const short = cost - soulstones;
      if (!cheapest || short < cheapest.short) {
        cheapest = { id: c.id, label: c.label, cost, def, short };
      }
    }
    return cheapest;
  })();

  const handleAdDouble = async () => {
    const r = await Ait.showRewardedAd('result_double');
    if (r.success) {
      addStones(stats.soulstones);
      Ait.haptic('heavy');
    }
  };
  const rewardShare = useSaveStore((s) => s.rewardShare);
  const lastShareDate = useSaveStore((s) => s.social.lastShareReward);
  const todayStr = new Date().toISOString().slice(0, 10);
  const shareRewardAvailable = lastShareDate !== todayStr;

  const handleShare = async () => {
    const text = `🩸 어둠의 군주 — 웨이브 ${stats.wave} 도달! 용사 ${stats.killCount}명 처치. 너도 도전해볼래?`;
    try {
      await Ait.shareToFeed(text);
    } catch (e) {}
    Ait.haptic('medium');
    const reward = rewardShare();
    if (reward > 0) {
      // Toast — 영혼석 +N
      alert(`친구 초대 보상: 영혼석 +${reward}!`);
    }
  };

  // 모드 분기 — gameMode 우선, mode 폴백
  const gm = stats.gameMode;
  const isStageMode = gm ? gm.kind === 'stage' : stats.mode === 'stage';
  const isChallengeMode = gm?.kind === 'challenge';
  const stageCleared = isStageMode && stats.cleared === true;
  const showMetaFlavor = !isStageMode;
  const stageDef = stats.stageId ? getStageById(stats.stageId) : undefined;
  const isFirstClear = !!stats.firstClear;
  const showDemonComment = showMetaFlavor || (stageCleared && isFirstClear);
  const showRunPattern = showMetaFlavor
    || (!stageCleared && (
      stats.wave >= 5 ||
      (stats.dominantBuildProgress ?? 0) >= 0.75
    ));
  const titleText = isStageMode
    ? (stageCleared ? '🏰 침공 방어 성공!' : '⚔ 성문이 뚫렸다')
    : isChallengeMode
      ? (isNewRecord ? '✨ 도전 신기록 ✨' : '🏆 도전 종료')
      : (isNewRecord ? '✨ 심연 신기록 ✨' : '🌌 심연 방어전 기록');
  const subText = isStageMode
    ? (stageCleared
        ? (stageDef ? `${stageDef.name} · ${'★'.repeat(stats.stars ?? 1)}${'☆'.repeat(3 - (stats.stars ?? 1))}` : '클리어')
        : (stageDef ? `${stageDef.name} — 정비할 시간은 있다` : '재정비'))
    : isChallengeMode
      ? (() => {
          const challengeId = gm?.kind === 'challenge' ? gm.challengeId : null;
          const cdef = challengeId ? CHALLENGES[challengeId] : undefined;
          return cdef
            ? `🏆 ${cdef.icon} ${cdef.name} — 웨이브 ${stats.wave}`
            : `🏆 도전 모드 — 웨이브 ${stats.wave}`;
        })()
      : (isNewRecord ? `이전 ${bestWave} → ${stats.wave} 웨이브` : `${runs}회차 — 다음 침공 준비`);

  return (
    <div style={styles.root}>
      <h1 style={styles.title}>{titleText}</h1>
      <div style={styles.sub}>{subText}</div>

      {/* 마왕 코멘트 — 스테이지 실패는 핵심 정보만 보이도록 숨김 */}
      {showDemonComment && (
        <div style={styles.demonComment}>
          <div style={styles.demonCommentIcon}>
            {stageCleared ? '😈' :
              isNewRecord ? '😈' : stats.wave >= 25 ? '😈' : stats.wave >= 10 ? '🌑' : stats.wave >= 5 ? '😡' : '😨'}
          </div>
          <div style={styles.demonCommentBubble}>
            <div style={styles.demonCommentName}>— 마왕</div>
            <div style={styles.demonCommentText}>
              {stageCleared
                ? '"이번 침공도 막아냈다. 다음을 준비한다."'
                : isNewRecord
                  ? '"기록이 깨졌다. 더 멀리 가자."'
                  : `"${death.reason}. 준비하라."`}
            </div>
          </div>
        </div>
      )}

      {/* 작전 요약 — 정보 다이어트:
          - stage clear: 영혼석만 큰 글자, MVP/요약 접힘
          - stage fail: 도달 웨이브 + 처치 + 영혼석
          - endless: 기존 풀 정보 (NEW RECORD 강조 가능) */}
      <div style={styles.stats}>
        {isNewRecord && !isStageMode && (
          <div style={styles.recordBig}>
            <div style={styles.recordLabel}>NEW RECORD</div>
            <div style={styles.recordWave}>웨이브 {stats.wave}</div>
            <div style={styles.recordDiff}>이전 {bestWave} → +{stats.wave - bestWave}</div>
          </div>
        )}
        {!stageCleared && (
          <>
            <Row label="도달 웨이브" value={stats.wave.toString()} highlight />
            <Row label="처치 용사" value={stats.killCount.toString()} />
            {stats.bossKills > 0 && <Row label="보스 처치" value={`${stats.bossKills}`} />}
          </>
        )}
        {/* MVP 카드 — endless 또는 stage fail 에만 노출 (clear는 정보 다이어트) */}
        {!stageCleared && stats.topPickedMonsterId && stats.topPickedMonsterCount >= 2 && (() => {
          const def = MONSTERS[stats.topPickedMonsterId];
          if (!def) return null;
          return <Row label="🌟 MVP 카드" value={`${def.name} ×${stats.topPickedMonsterCount}`} highlight />;
        })()}
        {!stageCleared && <div style={styles.divider} />}
        <div style={styles.stones}>
          획득 영혼석 <span style={styles.stonesNum}>+{stats.soulstones}</span>
        </div>
        {/* P0-1 마왕 EXP — 적립량 + 진행도 + 보상 클레임 */}
        {(showMetaFlavor || pendingDemonRewards.length > 0) && (
          <div style={demonExpStyles.box}>
            <div style={demonExpStyles.head}>
              <span style={demonExpStyles.lvLabel}>마왕 LV.{lvProg.level}</span>
              <span style={demonExpStyles.expGain}>EXP +{lastRunExp}</span>
            </div>
            <div style={demonExpStyles.bar}>
              <div style={{
                ...demonExpStyles.fill,
                width: lvProg.isMax ? '100%' : `${(lvProg.expInLevel / lvProg.expForNext) * 100}%`,
              }} />
            </div>
            {pendingDemonRewards.length > 0 && (
              <button
                style={demonExpStyles.claimBtn}
                onClick={() => {
                  const r = claimPendingDemonRewards();
                  alert(`마왕 레벨 보상 수령\n${r.labels.join('\n')}${r.stones ? `\n총 영혼석 +${r.stones}` : ''}${r.recruitsAdded.length ? `\n해금: ${r.recruitsAdded.join(', ')}` : ''}`);
                }}
              >
                🎁 레벨업 보상 수령 ({pendingDemonRewards.length})
              </button>
            )}
          </div>
        )}
        {/* W4 마왕 echo + W3 NPC 사망 누적 반응 + W4 일일 라인 */}
        {showMetaFlavor && echoLineRef.current && (
          <div style={echoStyles.echoBox}>
            <div style={echoStyles.echoLabel}>— 마왕 —</div>
            <div style={echoStyles.echoBody}>{echoLineRef.current}</div>
          </div>
        )}
        {showMetaFlavor && dailyHint && (
          <div style={echoStyles.dailyBox}>
            <span style={echoStyles.dailyIcon}>🌅</span>
            <span style={echoStyles.dailyText}>{dailyHint}</span>
          </div>
        )}
        {showMetaFlavor && npcReactionRef.current && (
          <div style={{ ...echoStyles.npcBox, borderColor: npcReactionRef.current.npc.accent }}>
            <div style={echoStyles.npcHead}>
              <span style={echoStyles.npcIcon}>{npcReactionRef.current.npc.icon}</span>
              <span style={{ ...echoStyles.npcName, color: npcReactionRef.current.npc.accent }}>
                — {npcReactionRef.current.npc.name}
                {deathStreakChapterRef.current && deathStreakChapterRef.current.streak >= 3 && (
                  <span style={echoStyles.streakBadge}>
                    {' '}({deathStreakChapterRef.current.streak}연속 봉인)
                  </span>
                )}
              </span>
            </div>
            <div style={echoStyles.npcBody}>{npcReactionRef.current.line}</div>
          </div>
        )}
        {ENABLE_MONETIZATION && !adFreeFirstSessions && (
          <button style={styles.adBtn} onClick={handleAdDouble}>
            🎬 광고 보고 영혼석 ×2
          </button>
        )}
        {/* v11 추가 광고 옵션 — 일일 보너스 / 시즌 XP / 마왕 EXP / 우편 추가 */}
        {ENABLE_MONETIZATION && !adFreeFirstSessions && (
          <ResultAdOptions />
        )}
        {ENABLE_MONETIZATION && adFreeFirstSessions && (
          <div style={styles.adFreeNotice}>
            ✨ 신규 환영 — 첫 3런까지 광고 없음
          </div>
        )}
      </div>

      {/* 사망 원인 추정 — stage clear에서는 숨김 (정보 다이어트), fail/endless에선 유지 */}
      {!isNewRecord && !stageCleared && (
        <div style={styles.causeCard}>
          <div style={styles.causeTop}>📉 무너진 지점</div>
          <div style={styles.causeReason}>{death.reason}</div>
          <div style={styles.causeDetail}>{death.detail}</div>
        </div>
      )}

      {/* 챌린지 클리어 보상 카드 (W15 통과 시) */}
      {isChallengeMode && stats.challengeReward && stats.challengeIdAtClear && (() => {
        const cdef = CHALLENGES[stats.challengeIdAtClear];
        if (!cdef) return null;
        return (
          <div style={stats.challengeFirstClear ? styles.stageRewardFirst : styles.stageRewardRepeat}>
            <div style={styles.stageRewardTop}>
              {stats.challengeFirstClear ? '🏆 도전 첫 클리어' : '🔁 도전 재클리어'}
            </div>
            <div style={styles.stageRewardRow}>
              <span style={styles.stageRewardIcon}>{cdef.icon}</span>
              <span style={styles.stageRewardLabel}>{cdef.name}</span>
            </div>
            <div style={styles.stageRewardRow}>
              <span style={styles.stageRewardIcon}>💎</span>
              <span style={styles.stageRewardLabel}>영혼석 +{stats.challengeReward}</span>
            </div>
          </div>
        );
      })()}

      {/* 스테이지 클리어 보상 카드 — 첫 클리어 vs 반복 분기 */}
      {stageCleared && stageDef && (() => {
        const unlockIds = stageDef.firstClearReward.unlockRecruitIds ?? [];
        const featureIds = stageDef.firstClearReward.unlockFeatureIds ?? [];
        return (
          <div style={isFirstClear ? styles.stageRewardFirst : styles.stageRewardRepeat}>
            <div style={styles.stageRewardTop}>
              {isFirstClear ? '🎉 첫 침공 방어 보상' : '🔁 반복 클리어 보상'}
            </div>
            <div style={styles.stageRewardRow}>
              <span style={styles.stageRewardIcon}>💎</span>
              <span style={styles.stageRewardLabel}>
                영혼석 +{isFirstClear
                  ? (stageDef.firstClearReward.soulstones ?? 0)
                  : (stageDef.repeatReward.soulstones ?? 0)}
              </span>
            </div>
            {/* 모집 해금 강조 — 첫 클리어 + 해금 ID 있을 때만 */}
            {isFirstClear && unlockIds.length > 0 && (
              <div style={styles.recruitUnlockBox}>
                <div style={styles.recruitUnlockTop}>👹 새 부하가 성문 앞에서 대기 중!</div>
                <div style={styles.recruitUnlockNames}>
                  {unlockIds
                    .map((id) => getRecruitById(id)?.name ?? MONSTERS[id]?.name ?? id)
                    .join(' · ')}
                </div>
                <div style={styles.recruitUnlockHint}>모집하면 카드풀에 등장합니다</div>
              </div>
            )}
            {isFirstClear && featureIds.includes('endless') && (
              <div style={styles.stageRewardRow}>
                <span style={styles.stageRewardIcon}>🌌</span>
                <span style={styles.stageRewardLabel}>심연 방어전 잠금 해제!</span>
              </div>
            )}
            {isFirstClear && featureIds.includes('challenges') && (
              <div style={styles.stageRewardRow}>
                <span style={styles.stageRewardIcon}>⚔</span>
                <span style={styles.stageRewardLabel}>도전 모드 잠금 해제!</span>
              </div>
            )}
            {!isFirstClear && stageDef.repeatReward.heroFragments && (
              <div style={styles.stageRewardRow}>
                <span style={styles.stageRewardIcon}>📖</span>
                <span style={styles.stageRewardLabel}>
                  도감 조각: {Object.entries(stageDef.repeatReward.heroFragments)
                    .map(([id, n]) => `${id} ×${n}`).join(', ')}
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* dominant build가 없을 때만 — 가장 많이 픽한 태그 fallback (짧은 런에서도 픽 경향 노출) */}
      {showRunPattern && !stats.dominantBuildId && stats.topPickedTag && (
        <div style={styles.tagFallback}>
          <span style={styles.tagFallbackTop}>📊 이번 런 픽 경향</span>
          <span style={styles.tagFallbackName}>
            {TAG_LABEL[stats.topPickedTag] || stats.topPickedTag} 위주
          </span>
        </div>
      )}

      {/* OVERHAUL §3.3: 빌드 컨셉 진행도 */}
      {showRunPattern && stats.dominantBuildId && (() => {
        const build = BUILDS.find((b) => b.id === stats.dominantBuildId);
        if (!build) return null;
        const progress = stats.dominantBuildProgress ?? 0;
        const completed = progress >= 1;
        return (
          <div style={styles.buildBadge}>
            <div style={styles.buildIcon}>{build.icon}</div>
            <div style={styles.buildBody}>
              <div style={styles.buildTop}>
                {completed ? '🏆 빌드 칭호 획득!' : '📊 이번 런 빌드 컨셉'}
              </div>
              <div style={styles.buildName}>{build.name}</div>
              <div style={styles.buildDesc}>{build.desc}</div>
              <div style={styles.buildBar}>
                <div style={{
                  ...styles.buildBarFill,
                  width: `${Math.min(100, progress * 100)}%`,
                }} />
              </div>
              <div style={styles.buildProgressText}>
                진행 {Math.floor(progress * 100)}%
                {completed ? ` — +${build.reward} 영혼석!` : ''}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ★ 추천 강화 카드 — 사망 원인에 따라 컨텍스트 변경 (강조판) */}
      {recommendedUpgrade && !stageCleared && (
        <div style={styles.recCard}>
          <div style={styles.recTop}>
            💡 추천 강화 — {SKILL_REASON[recommendedUpgrade.id] || '다음 런 보강'}
          </div>
          <div style={styles.recMain}>
            <span style={styles.recIcon}>{recommendedUpgrade.def.icon}</span>
            <span style={styles.recLabel}>{recommendedUpgrade.label}</span>
            <span style={styles.recCost}>💎 {recommendedUpgrade.cost}</span>
          </div>
        </div>
      )}

      {/* 영혼석 부족 시 다음 목표 표시 */}
      {!recommendedUpgrade && upcomingUpgrade && !stageCleared && (
        <div style={styles.recCardLocked}>
          <div style={styles.recTop}>🎯 다음 목표</div>
          <div style={styles.recMain}>
            <span style={styles.recIcon}>{upcomingUpgrade.def.icon}</span>
            <span style={styles.recLabel}>{upcomingUpgrade.label}</span>
            <span style={styles.recCost}>💎 {upcomingUpgrade.short} 더</span>
          </div>
        </div>
      )}

      {/* 6런 진입 보호 종료 안내 */}
      {showMetaFlavor && runs === 5 && (
        <div style={styles.recCardLocked}>
          <div style={styles.recTop}>🎓 신규 보호 종료</div>
          <div style={styles.recMain}>
            <span style={styles.recIcon}>🏰</span>
            <span style={styles.recLabel}>다음 런부터 보스 자동 회복 종료</span>
          </div>
        </div>
      )}

      {/* 버튼 분기 — 스테이지 모드 우선 */}
      {isStageMode && stageCleared ? (() => {
        const cleared = useSaveStore.getState().clearedStages;
        const nextId = stats.stageId ? nextStageId(stats.stageId) : null;
        const nextDef = nextId ? getStageById(nextId) : null;
        const nextUnlocked = nextDef && isStageUnlocked(nextDef.id, [...cleared, stats.stageId!]);
        const hasRecruitUnlock = isFirstClear
          && (stageDef?.firstClearReward.unlockRecruitIds?.length ?? 0) > 0;
        // CTA 우선순위:
        //  1) 모집 해금 있으면 [새 부하 모집하기] 강조
        //  2) 모집 해금 없으면 [다음 침공 막기] 강조
        //  3) 보조: [다음 스테이지/모집소], [마왕성으로]
        return (
          <>
            {hasRecruitUnlock ? (
              <button
                style={styles.btnPrimary}
                className="retry-pulse"
                onClick={() => onNavigate('recruit')}
              >
                👹 새 부하 모집하기
              </button>
            ) : nextDef && nextUnlocked && onStartStage ? (
              <button
                style={styles.btnPrimary}
                className="retry-pulse"
                onClick={() => onStartStage(nextDef.id)}
              >
                ▶ 다음 침공 막기 — {nextDef.name}
              </button>
            ) : (
              <button
                style={styles.btnPrimary}
                className="retry-pulse"
                onClick={() => onNavigate('stageSelect')}
              >
                🗺 작전 지도
              </button>
            )}
            {hasRecruitUnlock && nextDef && nextUnlocked && onStartStage && (
              <button style={styles.btnRetrySecondary} onClick={() => onStartStage(nextDef.id)}>
                ▶ 다음 침공 막기 — {nextDef.name}
              </button>
            )}
            {!hasRecruitUnlock && (
              <button style={styles.btnRetrySecondary} onClick={() => onNavigate('recruit')}>
                👹 모집소 보기
              </button>
            )}
            <button style={styles.btnRetrySecondary} onClick={() => onNavigate('castleHub')}>
              🏰 마왕성으로
            </button>
          </>
        );
      })() : isStageMode && !stageCleared ? (
        <>
          {recommendedUpgrade ? (
            <button
              style={styles.btnPrimary}
              className="retry-pulse"
              onClick={() => {
                window.location.hash = `skill=${recommendedUpgrade.id}`;
                onNavigate('skills');
              }}
            >
              🛠 정비하러 가기
            </button>
          ) : (
            <button
              style={styles.btnPrimary}
              className="retry-pulse"
              onClick={() => {
                if (onRetryStage && stats.stageId) onRetryStage(stats.stageId);
                else onNavigate('game');
              }}
            >
              ⚔ 바로 재도전
            </button>
          )}
          {recommendedUpgrade && (
            <button style={styles.btnRetrySecondary} onClick={() => {
              if (onRetryStage && stats.stageId) onRetryStage(stats.stageId);
              else onNavigate('game');
            }}>
              ⚔ 바로 재도전
            </button>
          )}
        </>
      ) : recommendedUpgrade ? (
        <>
          <button
            style={styles.btnPrimary}
            className="retry-pulse"
            onClick={() => {
              window.location.hash = `skill=${recommendedUpgrade.id}`;
              onNavigate('skills');
            }}
          >
            🛠 강화하고 재도전
          </button>
          <button style={styles.btnRetrySecondary} onClick={() => onNavigate('game')}>
            ⚔ 바로 재도전
          </button>
        </>
      ) : (
        <button
          style={styles.btnPrimary}
          className="retry-pulse"
          onClick={() => onNavigate('game')}
        >
          ⚔ 다시 도전
        </button>
      )}
      <style>{`
        @keyframes retryPulseAnim {
          0%,100% { box-shadow: 0 4px 0 #4a0a0a, 0 0 24px rgba(253,121,168,0.6); transform: scale(1); }
          50%     { box-shadow: 0 4px 0 #4a0a0a, 0 0 36px rgba(253,121,168,1); transform: scale(1.03); }
        }
        .retry-pulse { animation: retryPulseAnim 1.4s ease-in-out infinite; }
      `}</style>

      {/* 완료된 미션 알림 (이번 런으로 달성) */}
      {showMetaFlavor && completedMissions.length > 0 && (
        <button
          style={styles.missionNotice}
          onClick={() => onNavigate('missions')}
        >
          🎯 미션 {completedMissions.length}개 완료 — 보상 받기
        </button>
      )}

      <div style={styles.menuRow}>
        <button style={styles.btnSecondary} onClick={() => onNavigate('castleHub')}>🏰 마왕성</button>
        {/* ★ 친구 초대 자랑 — 3런 이상만 (정보 다이어트) */}
        {showMetaFlavor && runs >= 3 && (
          <button
            style={{ ...styles.btnSecondary, ...(shareRewardAvailable ? styles.btnSecondaryHighlight : {}) }}
            onClick={handleShare}
          >
            📣 자랑{shareRewardAvailable ? ' +200' : ''}
          </button>
        )}
      </div>
    </div>
  );
}

/** v11 ResultScreen — Lyra 정보 거래소 광고 옵션 모음 */
function ResultAdOptions() {
  const tryConsumeAd = useSaveStore((s) => s.tryConsumeAd);
  const activateAdBoost = useSaveStore((s) => s.activateAdBoost);
  const addStones = useSaveStore((s) => s.addStones);
  const pushMail = useSaveStore((s) => s.pushMail);
  const adDailyCounts = useSaveStore((s) => s.adDailyCounts);
  const today = new Date().toISOString().slice(0, 10);

  const remaining = (id: string, max: number) => {
    const c = adDailyCounts[id];
    if (!c || c.date !== today) return max;
    return Math.max(0, max - c.count);
  };

  const handle = async (entryId: string) => {
    const entry = getAdEntry(entryId as any);
    if (!entry) return;
    if (!tryConsumeAd(entryId, entry.cap)) {
      alert('오늘 — 광고 한도를 — 사용했습니다.');
      return;
    }
    const r = await Ait.showRewardedAd(entryId);
    if (!r.success) return;
    // 보상 적용
    if (entry.reward.stones) addStones(entry.reward.stones);
    if (entry.reward.misc === 'season_xp_x2_next') activateAdBoost('seasonXpX2Next');
    if (entry.reward.misc === 'demon_exp_x2_next') activateAdBoost('demonExpX2Next');
    if (entryId === 'mail_extra') {
      pushMail({
        id: `mail-extra-${today}`,
        title: '🎬 추가 우편 — Lyra',
        body: entry.lyraPostLine,
        reward: { kind: 'stones', amount: 30 },
        sentAt: Date.now(), claimed: false,
      });
    }
    alert(`${entry.lyraPostLine}\n— ${entry.rewardLabel}`);
  };

  const opts: { id: string; max: number; label: string }[] = [
    { id: 'daily_bonus', max: 3, label: '🎬 영혼석 +50' },
    { id: 'season_xp_boost', max: 3, label: '🎬 시즌 XP ×2' },
    { id: 'demon_exp_boost', max: 1, label: '🎬 마왕 EXP ×2' },
    { id: 'mail_extra', max: 1, label: '🎬 우편 +1' },
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {opts.map((o) => {
        const left = remaining(o.id, o.max);
        return (
          <button
            key={o.id}
            disabled={left <= 0}
            onClick={() => handle(o.id)}
            style={{
              flex: '1 1 calc(50% - 4px)',
              padding: '6px 4px',
              background: left > 0 ? 'rgba(123,45,142,0.5)' : 'rgba(60,60,60,0.5)',
              border: '1px solid #4a3a6e',
              borderRadius: 4, color: '#FFEAA7',
              fontFamily: 'inherit', fontSize: 9,
              cursor: left > 0 ? 'pointer' : 'not-allowed',
              opacity: left > 0 ? 1 : 0.4,
            }}
          >
            {o.label} ({left}/{o.max})
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={styles.row}>
      <span style={{ color: '#bbb' }}>{label}</span>
      <span style={{
        color: highlight ? '#FFEAA7' : '#FFEAA7',
        fontWeight: 'bold',
        textShadow: highlight ? '0 0 8px #FDCB6E' : 'none',
      }}>{value}</span>
    </div>
  );
}

const echoStyles: Record<string, React.CSSProperties> = {
  echoBox: {
    marginTop: 8, padding: 8,
    background: 'rgba(20,12,42,0.7)',
    border: '1px solid #4a3a6e', borderRadius: 4,
  },
  echoLabel: { fontSize: 9, color: '#a55eea', letterSpacing: 1, marginBottom: 4 },
  echoBody: { fontSize: 11, color: '#FFEAA7', fontStyle: 'italic', lineHeight: 1.5 },
  dailyBox: {
    marginTop: 8, padding: '8px 10px',
    background: 'rgba(255,107,107,0.10)',
    border: '1px solid #FF6B6B', borderRadius: 4,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  dailyIcon: { fontSize: 14 },
  dailyText: { fontSize: 10, color: '#FFEAA7', fontStyle: 'italic', flex: 1 },
  npcBox: {
    marginTop: 8, padding: 8,
    background: 'rgba(20,12,42,0.6)',
    border: '1px solid #4a3a6e', borderRadius: 4,
  },
  npcHead: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  npcIcon: { fontSize: 16 },
  npcName: { fontSize: 10, fontWeight: 'bold' },
  streakBadge: { fontSize: 9, color: '#FF6B6B', fontWeight: 'normal' },
  npcBody: { fontSize: 11, color: '#FFEAA7', fontStyle: 'italic', lineHeight: 1.5 },
};

const demonExpStyles: Record<string, React.CSSProperties> = {
  box: {
    background: 'linear-gradient(180deg,rgba(123,45,142,0.3),rgba(20,12,42,0.5))',
    border: '1px solid #7B2D8E', borderRadius: 6,
    padding: '8px 10px', marginTop: 10,
  },
  head: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6,
  },
  lvLabel: { fontSize: 11, fontWeight: 'bold', color: '#FD79A8' },
  expGain: { fontSize: 11, color: '#FDCB6E' },
  bar: {
    height: 6, background: 'rgba(0,0,0,0.5)',
    border: '1px solid #4a3a6e', borderRadius: 3, overflow: 'hidden',
  },
  fill: {
    height: '100%',
    background: 'linear-gradient(90deg,#FDCB6E,#FD79A8)',
  },
  claimBtn: {
    width: '100%', marginTop: 8, padding: '8px',
    background: 'linear-gradient(180deg,#FDCB6E,#D63031)',
    border: '2px solid #FF6B6B', color: '#fff',
    borderRadius: 4, fontFamily: 'inherit', fontWeight: 'bold',
    cursor: 'pointer', fontSize: 11,
  },
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'rgba(5,3,15,0.96)',
    padding: '20px 16px calc(20px + env(safe-area-inset-bottom, 0))',
    overflow: 'auto',
  },
  title: { color: '#FD79A8', fontSize: 28, marginBottom: 4, letterSpacing: 3, textShadow: '2px 2px 0 #000' },
  sub: { color: '#FFEAA7', fontSize: 12, letterSpacing: 2, marginBottom: 12 },
  stats: {
    background: 'linear-gradient(180deg,#241a3e,#15102a)',
    border: '2px solid #4a3a6e', borderRadius: 8,
    padding: '12px 18px', width: '100%', maxWidth: 280,
    marginBottom: 14,
  },
  recordBig: {
    background: 'linear-gradient(180deg,#3a1a1a,#1a0606)',
    border: '2px solid #FDCB6E', borderRadius: 8,
    padding: '10px 14px', marginBottom: 10,
    textAlign: 'center',
    boxShadow: '0 0 18px rgba(253,203,110,0.8)',
  },
  recordLabel: {
    color: '#FDCB6E', fontSize: 10, fontWeight: 'bold', letterSpacing: 4,
    marginBottom: 2,
    textShadow: '0 0 6px #FDCB6E',
  },
  recordWave: {
    color: '#FFEAA7', fontSize: 26, fontWeight: 'bold', letterSpacing: 2,
    textShadow: '2px 2px 0 #000, 0 0 12px #FDCB6E',
  },
  recordDiff: {
    color: '#FD79A8', fontSize: 11, marginTop: 2,
  },
  row: { display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: 13, gap: 18 },
  divider: { borderTop: '1px solid #4a3a6e', margin: '8px 0' },
  stones: { color: '#FDCB6E', fontSize: 14, textAlign: 'center' },
  stonesNum: { color: '#FFEAA7', fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  nextGoals: {
    marginTop: 8, padding: '6px 8px',
    background: 'rgba(0,0,0,0.4)', borderRadius: 4,
    fontSize: 10, color: '#bbb', lineHeight: 1.5,
  },
  nextGoalLine: { marginTop: 2 },
  adBtn: {
    marginTop: 10, width: '100%', padding: '8px',
    background: 'linear-gradient(180deg,#FDCB6E,#D63031)',
    border: '1px solid #fff', borderRadius: 5,
    color: '#fff', fontWeight: 'bold', fontSize: 12,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  adFreeNotice: {
    marginTop: 10, width: '100%', padding: '6px',
    background: 'rgba(38,222,129,0.15)',
    border: '1px solid #26de81', borderRadius: 5,
    color: '#26de81', fontSize: 10, textAlign: 'center',
    fontWeight: 'bold', letterSpacing: 1,
  },
  btnRetry: {
    width: '100%', maxWidth: 280,
    padding: '16px 20px',
    background: 'radial-gradient(ellipse at 50% 30%, #FF7675 0%, #D63031 45%, #7a1818 100%)',
    border: '3px solid #FDCB6E', borderRadius: 10,
    color: '#fff', fontWeight: 'bold', fontSize: 18, letterSpacing: 4,
    boxShadow: '0 4px 0 #4a0a0a, 0 0 24px rgba(253,121,168,0.6)',
    fontFamily: 'inherit', cursor: 'pointer',
    marginBottom: 12,
  },
  // ★ 작전 화면 신규 스타일
  causeCard: {
    width: '100%', maxWidth: 280,
    background: 'rgba(214,48,49,0.15)',
    border: '1.5px solid #FF6B6B', borderRadius: 8,
    padding: '8px 12px', marginBottom: 10,
    color: '#FFEAA7',
    boxShadow: '0 0 8px rgba(255,107,107,0.25)',
  },
  causeTop: { color: '#FF7675', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  causeReason: { color: '#FFEAA7', fontSize: 13, fontWeight: 'bold' },
  causeDetail: { color: '#bbb', fontSize: 10, marginTop: 2 },
  recCard: {
    width: '100%', maxWidth: 280,
    background: 'linear-gradient(180deg,#3a2d5c,#1a1230)',
    border: '2px solid #F5A623', borderRadius: 8,
    padding: '10px 12px', marginBottom: 12,
    boxShadow: '0 0 12px rgba(245,166,35,0.5)',
  },
  recCardLocked: {
    width: '100%', maxWidth: 280,
    background: 'rgba(20,12,42,0.7)',
    border: '1px dashed #4a3a6e', borderRadius: 8,
    padding: '8px 12px', marginBottom: 10,
  },
  recTop: { color: '#F5A623', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 5 },
  recMain: {
    display: 'flex', alignItems: 'center', gap: 8,
    color: '#FFEAA7',
  },
  recIcon: { fontSize: 22, lineHeight: 1, flex: '0 0 auto' },
  recLabel: { flex: 1, fontSize: 12, fontWeight: 'bold' },
  recCost: { fontSize: 11, color: '#FDCB6E', fontWeight: 'bold' },
  btnPrimary: {
    width: '100%', maxWidth: 280,
    padding: '16px 20px',
    background: 'radial-gradient(ellipse at 50% 30%, #FF7675 0%, #D63031 45%, #7a1818 100%)',
    border: '3px solid #FDCB6E', borderRadius: 10,
    color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 3,
    boxShadow: '0 4px 0 #4a0a0a, 0 0 24px rgba(253,121,168,0.6)',
    fontFamily: 'inherit', cursor: 'pointer',
    marginBottom: 8,
  },
  btnRetrySecondary: {
    width: '100%', maxWidth: 280,
    padding: '8px 16px',
    background: 'rgba(45,27,78,0.85)',
    border: '1.5px solid #4a3a6e', borderRadius: 6,
    color: '#FFEAA7', fontSize: 12, fontWeight: 'bold',
    letterSpacing: 1, fontFamily: 'inherit', cursor: 'pointer',
    marginBottom: 12,
  },
  missionNotice: {
    width: '100%', maxWidth: 280, padding: '10px 14px',
    background: 'linear-gradient(180deg,#3a2d5c,#1a1230)',
    border: '2px solid #FDCB6E', borderRadius: 8,
    color: '#FFEAA7', fontWeight: 'bold', fontSize: 13,
    fontFamily: 'inherit', cursor: 'pointer',
    boxShadow: '0 0 14px rgba(253,203,110,0.5)',
    marginBottom: 10,
    letterSpacing: 1,
  },
  upgradeNudge: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', maxWidth: 280,
    padding: '10px 12px',
    background: 'linear-gradient(180deg,#3a2d5c,#1a1230)',
    border: '2px solid #a55eea', borderRadius: 8,
    color: '#FFEAA7', fontFamily: 'inherit', cursor: 'pointer',
    boxShadow: '0 0 12px rgba(165,94,234,0.5)',
    marginBottom: 12,
    textAlign: 'left',
  },
  upgradeNudgeFirst: {
    background: 'linear-gradient(180deg,#3a1a1a,#1a0606)',
    border: '2px solid #FDCB6E',
    boxShadow: '0 0 18px rgba(253,203,110,0.7)',
    color: '#FFEAA7',
    padding: '14px 14px',
  },
  demonComment: {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', maxWidth: 280,
    background: 'rgba(20,12,42,0.8)',
    border: '1.5px solid #a55eea', borderRadius: 8,
    padding: '8px 10px', marginBottom: 10,
    boxShadow: '0 0 8px rgba(165,94,234,0.3)',
  },
  demonCommentIcon: {
    width: 32, height: 32,
    background: 'linear-gradient(180deg,#2D1B4E,#0a0820)',
    border: '1.5px solid #FDCB6E', borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, flex: '0 0 32px',
    boxShadow: '0 2px 0 #080412',
  },
  demonCommentBubble: { flex: 1, minWidth: 0 },
  demonCommentName: { color: '#FD79A8', fontSize: 9, letterSpacing: 1, marginBottom: 2 },
  demonCommentText: { color: '#FFEAA7', fontSize: 11, lineHeight: 1.5, textShadow: '1px 1px 0 #000' },
  buildBadge: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    width: '100%', maxWidth: 280,
    padding: '10px 12px',
    background: 'linear-gradient(180deg,#3a1a4e,#1a0828)',
    border: '2px solid #FDCB6E', borderRadius: 8,
    color: '#FFEAA7', marginBottom: 12,
    boxShadow: '0 0 12px rgba(253,203,110,0.4)',
    textAlign: 'left',
  },
  stageRewardFirst: {
    width: '100%', maxWidth: 280,
    background: 'linear-gradient(180deg,#3a1a4e,#1a0828)',
    border: '2px solid #FDCB6E', borderRadius: 8,
    padding: '10px 12px', marginBottom: 12,
    boxShadow: '0 0 14px rgba(253,203,110,0.45)',
  },
  stageRewardRepeat: {
    width: '100%', maxWidth: 280,
    background: 'linear-gradient(180deg,#241a3e,#15102a)',
    border: '1.5px solid #4a3a6e', borderRadius: 8,
    padding: '8px 12px', marginBottom: 10,
  },
  stageRewardTop: {
    color: '#FDCB6E', fontSize: 11, fontWeight: 'bold',
    letterSpacing: 1, marginBottom: 6,
  },
  stageRewardRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, color: '#FFEAA7', marginTop: 2,
  },
  stageRewardIcon: { fontSize: 14, lineHeight: 1 },
  stageRewardLabel: { flex: 1 },
  recruitUnlockBox: {
    background: 'linear-gradient(180deg,rgba(38,222,129,0.15),rgba(20,12,42,0.4))',
    border: '1.5px solid #26de81', borderRadius: 6,
    padding: '8px 10px', marginTop: 6,
    boxShadow: '0 0 8px rgba(38,222,129,0.3)',
  },
  recruitUnlockTop: { fontSize: 11, color: '#26de81', fontWeight: 'bold', letterSpacing: 1 },
  recruitUnlockNames: { fontSize: 12, color: '#FFEAA7', marginTop: 3, fontWeight: 'bold' },
  recruitUnlockHint: { fontSize: 9, color: '#bbb', marginTop: 3, fontStyle: 'italic' },
  tagFallback: {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', maxWidth: 280,
    padding: '6px 12px', marginBottom: 10,
    background: 'rgba(20,12,42,0.6)',
    border: '1px dashed #4a3a6e', borderRadius: 6,
  },
  tagFallbackTop: { color: '#a55eea', fontSize: 10, letterSpacing: 1 },
  tagFallbackName: { color: '#FFEAA7', fontSize: 12, fontWeight: 'bold', marginLeft: 'auto' },
  buildIcon: { fontSize: 32, lineHeight: 1 },
  buildBody: { flex: 1, minWidth: 0 },
  buildTop: { fontSize: 10, color: '#FD79A8', letterSpacing: 1, marginBottom: 2 },
  buildName: { fontSize: 14, fontWeight: 'bold', color: '#FFEAA7' },
  buildDesc: { fontSize: 10, color: '#bbb', marginBottom: 4 },
  buildBar: {
    height: 4, background: 'rgba(0,0,0,0.5)', borderRadius: 2,
    overflow: 'hidden', marginBottom: 2,
  },
  buildBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg,#a55eea,#FDCB6E)',
    transition: 'width 0.4s',
  },
  buildProgressText: { fontSize: 9, color: '#FDCB6E' },
  upcomingNudge: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', maxWidth: 280,
    padding: '10px 12px',
    background: 'rgba(20,12,42,0.7)',
    border: '1px dashed #4a3a6e', borderRadius: 8,
    color: '#bbb', marginBottom: 12,
    textAlign: 'left',
  },
  nudgeIcon: { fontSize: 28 },
  nudgeBody: { flex: 1 },
  nudgeTop: { fontSize: 10, color: '#FD79A8', letterSpacing: 1, marginBottom: 2 },
  nudgeMain: { fontSize: 13, fontWeight: 'bold', color: '#FFEAA7' },
  nudgeCost: { fontSize: 10, color: '#bbb', marginTop: 2 },
  nudgeArrow: { fontSize: 20, color: '#a55eea' },
  menuRow: {
    display: 'flex', gap: 6,
    width: '100%', maxWidth: 280,
  },
  btnSecondary: {
    flex: 1, padding: '8px 6px',
    background: 'rgba(45,27,78,0.85)', border: '1px solid #4a3a6e',
    borderRadius: 5, color: '#bbb', fontWeight: 'bold', fontSize: 11,
    fontFamily: 'inherit', cursor: 'pointer',
    letterSpacing: 1,
  },
  btnSecondaryHighlight: {
    background: 'linear-gradient(180deg,#7B2D8E,#3a0d4e)',
    border: '1px solid #FDCB6E',
    color: '#FFEAA7',
    boxShadow: '0 0 8px rgba(253,203,110,0.5)',
  },
  btn: {
    padding: '10px 20px', background: '#3a2d5c',
    border: '2px solid #4a3a6e', borderRadius: 5,
    color: '#FFEAA7', fontWeight: 'bold', fontSize: 13,
    boxShadow: '0 3px 0 #15102a', fontFamily: 'inherit',
    cursor: 'pointer', letterSpacing: 1,
  },
};
