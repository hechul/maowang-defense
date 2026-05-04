/**
 * DebugOverlay — 30분 soak test용 경량 계측 오버레이
 *
 * 활성 조건 (둘 다 만족):
 *   1) import.meta.env.DEV === true (production build에서는 마운트 자체 안 됨)
 *   2) URL `?debug=1` OR localStorage `mw_debug=1`
 *
 * 표시 항목:
 *   - FPS (1초 평균) + 평균 frame time
 *   - monsters / heroes / projectiles / particles / damageTexts / effects / banners 카운트
 *   - wave / runtime
 *   - snapshot version 증가율 (Δ/sec) — React rerender 빈도 가늠
 *   - React render count (이 컴포넌트는 자체 자식이므로 부모 리렌더 횟수 가늠)
 *
 * 디자인 원칙:
 *   - 게임 성능을 측정하려다 망치지 않게 — RAF 1개로 자체 측정 + 1초당 1번 setState.
 *   - 텍스트만 — 캔버스/이미지 없음.
 *   - 우상단 고정 — 모바일 360×640에서도 방해 안 되는 위치.
 */

import { useEffect, useRef, useState } from 'react';
import type { GameEngine } from '../../game/GameEngine';

interface DebugStats {
  fps: number;
  frameMs: number;
  monsters: number;
  monstersAlive: number;
  heroes: number;
  heroesAlive: number;
  projectiles: number;
  particles: number;
  damageTexts: number;
  effects: number;
  banners: number;
  wave: number;
  runtimeSec: number;
  snapDeltaPerSec: number;
  snapVersion: number;
  parentRenderCount: number;
  state: string;
  paused: boolean;
}

const INITIAL: DebugStats = {
  fps: 0, frameMs: 0,
  monsters: 0, monstersAlive: 0, heroes: 0, heroesAlive: 0,
  projectiles: 0, particles: 0, damageTexts: 0, effects: 0, banners: 0,
  wave: 0, runtimeSec: 0,
  snapDeltaPerSec: 0, snapVersion: 0, parentRenderCount: 0,
  state: 'idle', paused: false,
};

export function isDebugOverlayEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('debug') === '1') return true;
      if (window.localStorage.getItem('mw_debug') === '1') return true;
    }
  } catch (_e) { /* noop */ }
  return false;
}

interface Props {
  /** 게임 엔진 ref — 매 frame engine.getDebugStats() 호출 */
  engineRef: { current: GameEngine | null };
  /** 부모 (GameScreen)의 렌더 카운트 — useRef counter 전달 */
  parentRenderCountRef: { current: number };
}

export function DebugOverlay({ engineRef, parentRenderCountRef }: Props) {
  const [stats, setStats] = useState<DebugStats>(INITIAL);

  // RAF 기반 frame 측정 — 1초 누적 후 setState 1회
  const rafIdRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const frameTimeAccRef = useRef(0);
  const lastFrameRef = useRef(0);
  const lastReportRef = useRef(0);
  const lastSnapVersionRef = useRef(0);

  useEffect(() => {
    let alive = true;
    lastFrameRef.current = performance.now();
    lastReportRef.current = performance.now();

    const loop = () => {
      if (!alive) return;
      const now = performance.now();
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;
      frameCountRef.current++;
      frameTimeAccRef.current += delta;

      // 1초 단위 보고
      if (now - lastReportRef.current >= 1000) {
        const elapsed = now - lastReportRef.current;
        const eng = engineRef.current;
        const fps = (frameCountRef.current * 1000) / elapsed;
        const frameMs = frameTimeAccRef.current / Math.max(1, frameCountRef.current);
        let snapDeltaPerSec = 0;
        let snapVersion = 0;
        let s = eng?.getDebugStats?.();
        if (s) {
          snapDeltaPerSec = s.snapVersion - lastSnapVersionRef.current;
          lastSnapVersionRef.current = s.snapVersion;
          snapVersion = s.snapVersion;
        } else {
          s = {
            monsters: 0, monstersAlive: 0, heroes: 0, heroesAlive: 0,
            projectiles: 0, particles: 0, damageTexts: 0, effects: 0, banners: 0,
            wave: 0, runtimeSec: 0, snapVersion: 0, state: 'idle', paused: false,
          };
        }
        setStats({
          fps: Math.round(fps * 10) / 10,
          frameMs: Math.round(frameMs * 100) / 100,
          monsters: s.monsters, monstersAlive: s.monstersAlive,
          heroes: s.heroes, heroesAlive: s.heroesAlive,
          projectiles: s.projectiles, particles: s.particles,
          damageTexts: s.damageTexts, effects: s.effects, banners: s.banners,
          wave: s.wave, runtimeSec: s.runtimeSec,
          snapDeltaPerSec, snapVersion,
          parentRenderCount: parentRenderCountRef.current,
          state: s.state, paused: s.paused,
        });
        lastReportRef.current = now;
        frameCountRef.current = 0;
        frameTimeAccRef.current = 0;
      }
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [engineRef, parentRenderCountRef]);

  const m = Math.floor(stats.runtimeSec / 60);
  const sec = Math.floor(stats.runtimeSec % 60);
  const fpsColor = stats.fps >= 55 ? '#26de81' : stats.fps >= 45 ? '#FDCB6E' : '#FF6B6B';

  return (
    <div style={STYLES.root}>
      <div style={{ ...STYLES.row, color: fpsColor }}>
        <b>FPS</b> {stats.fps} <span style={STYLES.dim}>({stats.frameMs}ms)</span>
      </div>
      <div style={STYLES.row}>
        <b>RUN</b> {m}:{String(sec).padStart(2, '0')} W{stats.wave} {stats.state}{stats.paused ? '⏸' : ''}
      </div>
      <div style={STYLES.row}>
        <b>MON</b> {stats.monstersAlive}/{stats.monsters} <b>HERO</b> {stats.heroesAlive}/{stats.heroes}
      </div>
      <div style={STYLES.row}>
        <b>PROJ</b> {stats.projectiles} <b>PART</b> {stats.particles}
      </div>
      <div style={STYLES.row}>
        <b>DMG</b> {stats.damageTexts} <b>FX</b> {stats.effects} <b>BNR</b> {stats.banners}
      </div>
      <div style={STYLES.row}>
        <b>SNAP</b> Δ{stats.snapDeltaPerSec}/s ({stats.snapVersion}) <b>RDR</b> {stats.parentRenderCount}
      </div>
    </div>
  );
}

const STYLES: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    top: 4, right: 4,
    zIndex: 9999,
    pointerEvents: 'none',
    background: 'rgba(0,0,0,0.65)',
    border: '1px solid #4a3a6e',
    borderRadius: 4,
    padding: '4px 6px',
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#FFEAA7',
    lineHeight: 1.35,
    minWidth: 130,
    maxWidth: 160,
  },
  row: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  dim: { color: '#888' },
};
