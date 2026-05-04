import { useEffect, useState } from 'react';
import type { ScreenId } from '../../App';
import { useSaveStore } from '../../store/useSaveStore';
import { AttendanceModal } from '../components/AttendanceModal';
import { StarterPackModal } from '../components/StarterPackModal';
import { currentSeason } from '../../game/data/seasons';
import { MISSION_POOL } from '../../game/data/missions';
import { todayEdict } from '../../game/data/edicts';
import { unlockedDemonPowers, nextDemonPower, DEMON_POWERS } from '../../game/data/demonPowers';

/**
 * 타이틀 화면 — AIT 검수 §운영
 * - 게임 설명 명시 / 개인정보 / 고객 문의 링크
 * - 모바일 최적화: 한 손 엄지 도달 영역에 메인 버튼
 */
export function TitleScreen({ onNavigate }: { onNavigate: (s: ScreenId) => void }) {
  const soulstones = useSaveStore((s) => s.soulstones);
  const bestWave = useSaveStore((s) => s.bestWave);
  const lastPlayed = useSaveStore((s) => s.lastPlayedAt);
  const attendance = useSaveStore((s) => s.attendance);
  const runs = useSaveStore((s) => s.runs);
  const iap = useSaveStore((s) => s.iap);
  const totalBossKills = useSaveStore((s) => s.totalBossKills);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showStarterPack, setShowStarterPack] = useState(false);
  // QO2-E: 미수령 일일 미션 카운트
  const daily = useSaveStore((s) => s.daily);
  const unclaimedMissions = (daily.missions || []).filter((m) => {
    const def = MISSION_POOL.find((x) => x.id === m.id);
    return def && !m.claimed && m.progress >= def.target;
  }).length;

  // ★ 점진 해금 기준 (신규 유저 첫 30분 정보 다이어트)
  // - 첫 접속 (runs=0): 전투 시작 + 영혼 강화 + 칙령 한 줄
  // - 첫 사망 (runs >= 1): 영혼 강화 강조 (이미 노출), 출석 시작
  // - runs >= 2: 도감 + 업적
  // - runs >= 3 OR 첫 보스 처치 (totalBossKills >= 1) OR W10: 미션 + 인테리어
  // - runs >= 5 OR W15: 챌린지 + 리더보드 + 상점
  const tier2Unlock = runs >= 2;
  const tier3Unlock = runs >= 3 || totalBossKills >= 1 || bestWave >= 10;
  const tier4Unlock = runs >= 5 || bestWave >= 15;

  // 단계별 해금 토스트 (1회씩)
  const [unlockToastTier, setUnlockToastTier] = useState<2 | 3 | 4 | null>(null);
  const tutorialSeen = useSaveStore((s) => s.tutorialSeen);
  const markSeen = useSaveStore((s) => s.markTutorialSeen);
  useEffect(() => {
    // 가장 최근 해금 단계만 1회 안내
    if (tier4Unlock && !tutorialSeen.includes('tut_unlock_tier4')) {
      const t = setTimeout(() => setUnlockToastTier(4), 1200);
      return () => clearTimeout(t);
    }
    if (tier3Unlock && !tutorialSeen.includes('tut_unlock_tier3')) {
      const t = setTimeout(() => setUnlockToastTier(3), 1200);
      return () => clearTimeout(t);
    }
    if (tier2Unlock && !tutorialSeen.includes('tut_unlock_tier2')) {
      const t = setTimeout(() => setUnlockToastTier(2), 1200);
      return () => clearTimeout(t);
    }
  }, [tier2Unlock, tier3Unlock, tier4Unlock, tutorialSeen]);

  const dismissUnlockToast = () => {
    if (unlockToastTier === 2) markSeen('tut_unlock_tier2');
    if (unlockToastTier === 3) markSeen('tut_unlock_tier3');
    if (unlockToastTier === 4) markSeen('tut_unlock_tier4');
    setUnlockToastTier(null);
  };

  const showYesterday = lastPlayed && (Date.now() - lastPlayed) > 12 * 60 * 60 * 1000 && bestWave > 0;

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    // QA H-2: 신규 유저(runs===0)는 첫 진입 시 출석 모달 노출하지 않음 — 학습 흐름 보존
    if (runs === 0) return;
    // 출석 → 스타터팩 순으로 노출 (출석이 닫힌 후 1.2초 뒤 스타터팩)
    if (attendance.lastDate !== today) {
      const t = setTimeout(() => setShowAttendance(true), 600);
      return () => clearTimeout(t);
    }
    // 출석 안 띄울 케이스: 5런 이상 + 미노출 + 미구매 → 스타터팩 즉시
    if (runs >= 5 && !iap.starterPackShown && !iap.starterPackPurchased) {
      const t = setTimeout(() => setShowStarterPack(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const handleAttendanceClose = () => {
    setShowAttendance(false);
    // 출석 닫으면 스타터팩 노출 검사
    if (runs >= 5 && !iap.starterPackShown && !iap.starterPackPurchased) {
      setTimeout(() => setShowStarterPack(true), 1200);
    }
  };

  const PlateButton = ({
    variant = 'dark',
    onClick,
    children,
    flex,
    disabled,
  }: {
    variant?: 'primary' | 'dark' | 'disabled';
    onClick?: () => void;
    children: React.ReactNode;
    flex?: number;
    disabled?: boolean;
  }) => {
    const src =
      variant === 'primary'
        ? '/sprites/menu_plate_primary.png'
        : variant === 'disabled'
          ? '/sprites/menu_plate_disabled.png'
          : '/sprites/menu_plate_dark.png';
    return (
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        style={{
          ...styles.plateBtn,
          ...(flex ? { flex } : {}),
          backgroundImage: `url("${src}")`,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={variant === 'primary' ? styles.plateBtnTextPrimary : styles.plateBtnText}>
          {children}
        </span>
      </button>
    );
  };

  return (
    <div style={styles.root}>
      {/* 배경 비네트 */}
      <div style={styles.bgVignette} />

      {/* 로고 */}
      <img src="/sprites/logo_main.png" alt="어둠의 군주: 카드 던전" style={styles.logo} />

      {/* 게임 설명 (검수 §운영) — N-1: 동기 강화 */}
      <div style={styles.desc}>
        그대는 봉인된 마왕.<br />
        용사들이 마왕성으로 쳐들어온다.<br />
        <span style={{ color: '#FDCB6E' }}>운명의 카드</span>로 어둠을 소환해 영토를 지켜라.
      </div>

      {showYesterday && (
        <div style={styles.yesterday}>
          <span style={styles.yLabel}>어제 기록</span>
          <span style={styles.yWave}>웨이브 {bestWave}</span>
          <span style={styles.yCheer}>오늘은 더 멀리!</span>
        </div>
      )}

      {/* P2-C: 챕터 진행도 표시 */}
      <div style={styles.chapterBox}>
        <div style={styles.chapterTop}>
          <span style={styles.chapterLabel}>
            {bestWave >= 100 ? '🌑 신화 등급' :
             bestWave >= 50 ? '👑 챕터 3 진행 중' :
             bestWave >= 25 ? '✨ 챕터 2 진행 중' :
             '🏰 챕터 1 진행 중'}
          </span>
          <span style={styles.chapterRecord}>최고 W {bestWave}</span>
        </div>
        <div style={styles.chapterBar}>
          <div style={{
            ...styles.chapterFill,
            width: `${Math.min(100, (bestWave % 25 + (bestWave >= 25 ? 0 : 0)) / 25 * 100)}%`,
          }} />
        </div>
        <div style={styles.chapterNext}>
          {/* QA L-2: 첫 보스(W5) / 챕터 1(W25) 단계별 안내 — 신규 좌절 방지 */}
          {bestWave < 5 ? `다음: 5웨이브 — 첫 보스 처치` :
           bestWave < 10 ? `다음: 10웨이브 — 새 보스(대마법사) 등장` :
           bestWave < 25 ? `다음: 25웨이브 — 챕터 1 클리어 +500 영혼석` :
           bestWave < 50 ? `다음: 50웨이브 — 챕터 2 클리어 +1500 영혼석` :
           bestWave < 100 ? `다음: 100웨이브 — 신화 등급 +5000 영혼석` :
           '🌟 모든 챕터 클리어!'}
        </div>
      </div>

      {/* 시즌 banner — 첫 접속에는 숨김 (정보 다이어트) */}
      {runs >= 1 && <div style={styles.seasonBanner}>{currentSeason().banner}</div>}
      {/* OVERHAUL §3.4: 마왕 강화 진행도 — 첫 접속(runs=0)에는 숨김 (정보 다이어트) */}
      {runs >= 1 && (() => {
        const tbk = totalBossKills;
        const unlocked = unlockedDemonPowers(tbk).length;
        const next = nextDemonPower(tbk);
        return (
          <div style={styles.demonPowerBox}>
            <div style={styles.demonPowerTop}>
              <span>👑 마왕 강화</span>
              <span style={styles.demonPowerCount}>{unlocked} / {DEMON_POWERS.length}</span>
            </div>
            {next ? (
              <div style={styles.demonPowerNext}>
                다음: {next.icon} {next.name} (보스 {tbk}/{next.unlockBossKills})
              </div>
            ) : (
              <div style={styles.demonPowerNext}>🌟 모든 마왕 강화 해금!</div>
            )}
          </div>
        );
      })()}

      {/* OVERHAUL §3.6: 오늘의 칙령 — 신규(runs=0)에는 한 줄 요약만 */}
      {(() => {
        const e = todayEdict();
        const isNew = runs === 0;
        return (
          <div style={styles.edictBanner}>
            {e.icon} 오늘의 칙령 — <b style={{ color: '#FFEAA7' }}>{e.name}</b>
            {!isNew && <div style={styles.edictDesc}>{e.desc}</div>}
          </div>
        );
      })()}

      {/* ★ 메인 메뉴 — 점진 해금
            - 항상: 전투 시작 + 영혼 강화 (핵심 동선)
            - tier2 (runs >= 2): 도감 + 업적
            - tier3 (runs >= 3 OR 첫 보스 OR W10): 미션 + 인테리어
            - tier4 (runs >= 5 OR W15): 도전 + 리더보드 + 상점
        */}
      <div style={styles.menu}>
        <PlateButton variant="primary" onClick={() => onNavigate('game')}>
          ⚔ 전투 시작
        </PlateButton>
        <PlateButton onClick={() => onNavigate('skills')}>영혼 강화</PlateButton>

        {/* tier2: 도감 + 업적 */}
        {tier2Unlock && (
          <div style={styles.row}>
            <PlateButton flex={1} onClick={() => onNavigate('bestiary')}>도 감</PlateButton>
            <PlateButton flex={1} onClick={() => onNavigate('achievements')}>업 적</PlateButton>
          </div>
        )}

        {/* tier3: 미션 + 인테리어 */}
        {tier3Unlock && (
          <div style={styles.row}>
            <div style={{ flex: 1, position: 'relative' }}>
              <PlateButton flex={1} onClick={() => onNavigate('missions')}>일일 미션</PlateButton>
              {unclaimedMissions > 0 && (
                <span style={styles.notifDot}>{unclaimedMissions}</span>
              )}
            </div>
            <PlateButton flex={1} onClick={() => onNavigate('interior')}>🏰 꾸미기</PlateButton>
          </div>
        )}

        {/* tier4: 도전 + 리더보드 + 상점 */}
        {tier4Unlock && (
          <>
            <div style={styles.row}>
              <PlateButton flex={1} onClick={() => onNavigate('challenges')}>도 전</PlateButton>
              <PlateButton flex={1} onClick={() => onNavigate('leaderboard')}>🏆 리더보드</PlateButton>
            </div>
            <div style={styles.row}>
              <PlateButton flex={1} onClick={() => onNavigate('shop')}>🛒 상 점</PlateButton>
            </div>
          </>
        )}

        {/* 다음 해금 안내 — 잠긴 메뉴는 삭제하지 않고 진행도로 표시 */}
        {!tier2Unlock && (
          <div style={styles.unlockHint}>
            🔒 도감 / 업적 — 2런 도달 시 ({runs}/2)
          </div>
        )}
        {tier2Unlock && !tier3Unlock && (
          <div style={styles.unlockHint}>
            🔒 미션 / 꾸미기 — 3런 또는 첫 보스 처치
          </div>
        )}
        {tier3Unlock && !tier4Unlock && (
          <div style={styles.unlockHint}>
            🔒 도전 / 리더보드 / 상점 — 5런 또는 W15 도달
          </div>
        )}
      </div>

      <div style={styles.stones}>
        💎 영혼석 <span style={styles.stonesNum}>{soulstones.toLocaleString()}</span>
        {/* ECON E-1: 파편 사용처 미구현 → 노출 숨김 (사용처 추가 시 복원) */}
      </div>

      <div style={styles.legal}>
        <button style={styles.legalLink} onClick={() => onNavigate('privacy')}>
          개인정보 처리방침
        </button>
        <span style={styles.divider}>·</span>
        <button style={styles.legalLink} onClick={() => onNavigate('support')}>
          고객 문의
        </button>
      </div>

      {showAttendance && <AttendanceModal onClose={handleAttendanceClose} />}
      {showStarterPack && <StarterPackModal onClose={() => setShowStarterPack(false)} />}
      {/* ★ 단계별 해금 토스트 — cliff 분산 (3종) */}
      {unlockToastTier !== null && (
        <div style={styles.unlockToast} onClick={dismissUnlockToast}>
          <div style={styles.unlockToastTitle}>
            {unlockToastTier === 2 && '📖 새 메뉴 해금!'}
            {unlockToastTier === 3 && '🎯 새 메뉴 해금!'}
            {unlockToastTier === 4 && '🏆 새 메뉴 해금!'}
          </div>
          <div style={styles.unlockToastBody}>
            {unlockToastTier === 2 && <>도감 / 업적<br />— 마왕의 길이 펼쳐진다</>}
            {unlockToastTier === 3 && <>일일 미션 / 마왕성 꾸미기<br />— 어둠을 더 깊이</>}
            {unlockToastTier === 4 && <>도전 / 리더보드 / 상점<br />— 진정한 마왕의 영역</>}
          </div>
          <div style={styles.unlockToastDismiss}>탭하여 닫기</div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 16px 20px',
    background:
      'radial-gradient(ellipse at top, #2a1040 0%, #0d0620 60%, #050310 100%)',
    overflow: 'hidden',
  },
  bgVignette: {
    position: 'absolute', inset: 0,
    background:
      'radial-gradient(ellipse at center, transparent 30%, rgba(5,3,15,0.7) 100%)',
    pointerEvents: 'none',
  },
  logo: {
    width: 'min(92%, 320px)',
    height: 'auto',
    imageRendering: 'pixelated',
    marginTop: 8,
    marginBottom: 6,
    filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.7))',
  },
  desc: {
    color: '#eaeaea', fontSize: 12, lineHeight: 1.55,
    textAlign: 'center', marginBottom: 12,
    textShadow: '1px 1px 0 #000',
  },
  yesterday: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(45,27,78,0.85)',
    border: '1px solid #FDCB6E',
    borderRadius: 14, padding: '4px 12px',
    fontSize: 11, marginBottom: 8,
    boxShadow: '0 0 10px rgba(253,203,110,0.3)',
  },
  yLabel: { color: '#888' },
  yWave: { color: '#FFEAA7', fontWeight: 'bold' },
  yCheer: { color: '#FD79A8', fontSize: 10 },
  chapterBox: {
    width: '100%', maxWidth: 280,
    background: 'rgba(20,12,42,0.7)',
    border: '1px solid #4a3a6e', borderRadius: 8,
    padding: '7px 12px', marginBottom: 8,
  },
  chapterTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4, fontSize: 11,
  },
  chapterLabel: { color: '#FFEAA7', fontWeight: 'bold', letterSpacing: 1 },
  chapterRecord: { color: '#FD79A8', fontSize: 10 },
  chapterBar: {
    height: 4, background: 'rgba(0,0,0,0.5)', borderRadius: 2,
    overflow: 'hidden', marginBottom: 3,
  },
  chapterFill: {
    height: '100%',
    background: 'linear-gradient(90deg,#FDCB6E,#D63031)',
    boxShadow: '0 0 4px #FDCB6E',
    transition: 'width 0.3s',
  },
  chapterNext: { color: '#888', fontSize: 9, letterSpacing: 0.5 },
  demonPowerBox: {
    width: '100%', maxWidth: 280,
    background: 'linear-gradient(180deg,#3a1a4e,#1a0828)',
    border: '1px solid #F5A623', borderRadius: 8,
    padding: '6px 10px', marginBottom: 6,
    boxShadow: '0 0 6px rgba(245,166,35,0.3)',
  },
  demonPowerTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    color: '#F5A623', fontSize: 11, fontWeight: 'bold', letterSpacing: 1,
  },
  demonPowerCount: { color: '#FFEAA7', fontSize: 12 },
  demonPowerNext: {
    color: '#bbb', fontSize: 9, marginTop: 2, letterSpacing: 0.5,
  },
  edictBanner: {
    background: 'linear-gradient(90deg,rgba(45,27,78,0.85),rgba(58,13,78,0.85))',
    border: '1px solid #a55eea', borderRadius: 12,
    color: '#a55eea', fontSize: 11, fontWeight: 'bold', letterSpacing: 1,
    padding: '5px 12px', marginBottom: 6,
    textShadow: '1px 1px 0 #000',
    textAlign: 'center',
    boxShadow: '0 0 8px rgba(165,94,234,0.3)',
  },
  edictDesc: {
    color: '#bbb', fontSize: 9, fontWeight: 'normal',
    marginTop: 2, letterSpacing: 0.5,
  },
  seasonBanner: {
    background: 'linear-gradient(90deg,rgba(123,45,142,0.5),rgba(214,48,49,0.5))',
    border: '1px solid #a55eea', borderRadius: 12,
    color: '#FFEAA7', fontSize: 10.5, fontWeight: 'bold', letterSpacing: 1,
    padding: '3px 10px', marginBottom: 14,
    textShadow: '1px 1px 0 #000',
  },
  menu: {
    display: 'flex', flexDirection: 'column', gap: 8, width: '100%',
    maxWidth: 280, marginTop: 'auto',
  },
  row: { display: 'flex', gap: 8 },
  plateBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: 48,
    border: 'none', background: 'transparent',
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    fontFamily: 'inherit',
    cursor: 'pointer',
    padding: 0,
    minWidth: 0,
    transition: 'transform 0.1s, filter 0.1s',
    filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.5))',
  },
  plateBtnText: {
    color: '#FFEAA7',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 2,
    textShadow: '2px 2px 0 #000, 0 0 6px rgba(253,203,110,0.4)',
  },
  plateBtnTextPrimary: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 3,
    textShadow: '2px 2px 0 #000, 0 0 10px #D63031',
  },
  stones: {
    marginTop: 14,
    color: '#FDCB6E', fontSize: 13, fontWeight: 'bold',
    background: 'rgba(20,12,42,0.85)',
    padding: '6px 16px',
    borderRadius: 14,
    border: '1px solid #FDCB6E',
    letterSpacing: 1,
    boxShadow: '0 0 8px rgba(253,203,110,0.3)',
  },
  stonesNum: {
    color: '#FFEAA7', fontSize: 16,
    marginLeft: 6,
  },
  shardsInline: {
    marginLeft: 12, paddingLeft: 12,
    borderLeft: '1px solid #4a3a6e',
    color: '#FD79A8', fontSize: 11, fontWeight: 'normal',
  },
  unlockHint: {
    color: '#888', fontSize: 10, textAlign: 'center',
    padding: '6px 0', letterSpacing: 1,
  },
  legal: {
    position: 'absolute', bottom: 12, left: 0, right: 0,
    textAlign: 'center', fontSize: 11, color: '#888',
  },
  legalLink: {
    color: '#888', textDecoration: 'underline', background: 'none',
    border: 'none', padding: 0, fontSize: 11, fontFamily: 'inherit',
  },
  divider: { margin: '0 8px', color: '#555' },
  notifDot: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, padding: '0 5px',
    background: '#D63031',
    border: '2px solid #FDCB6E',
    borderRadius: 9,
    color: '#fff', fontSize: 10, fontWeight: 'bold',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 6px rgba(214,48,49,0.7)',
    pointerEvents: 'none',
  },
  unlockToast: {
    position: 'absolute', left: 16, right: 16, top: '40%',
    transform: 'translateY(-50%)',
    background: 'linear-gradient(180deg,#3a2d5c,#1a1230)',
    border: '2px solid #FDCB6E', borderRadius: 8,
    padding: '14px 16px',
    color: '#FFEAA7', textAlign: 'center',
    boxShadow: '0 0 20px rgba(253,203,110,0.6)',
    cursor: 'pointer',
    zIndex: 200,
  },
  unlockToastTitle: {
    fontSize: 16, fontWeight: 'bold', letterSpacing: 2,
    marginBottom: 6, textShadow: '1px 1px 0 #000',
  },
  unlockToastBody: {
    fontSize: 12, color: '#eaeaea', lineHeight: 1.6,
    marginBottom: 8,
  },
  unlockToastDismiss: {
    fontSize: 10, color: '#888', letterSpacing: 1,
  },
};
