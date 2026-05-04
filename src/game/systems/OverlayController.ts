/**
 * OverlayController — 게임 오버레이/모달 상태 중앙 판단기 + 큐 (1~2차 구조)
 *
 * 1차 (완료):
 *   read-side helper — topOverlay / activeOverlays / canResume / canOpen / shouldBlockSimulation
 *
 * 2차 (현재 단계):
 *   - 오버레이 open/close API (queueOverlayOpen / closeOverlay)
 *   - 우선순위가 더 높은 overlay 등장 시 현재 overlay를 deferred queue로 이동
 *   - close 시 deferred queue에서 자동으로 다음 overlay 활성
 *   - GameEngine은 raw flag set/clear는 그대로 하되, 새 overlay 발생 시
 *     `controller.requestOpen()`으로 통과 검사 → 통과 시 set, 실패 시 큐 적재
 *   - "사용자 pause" 명시 추적 (`userPauseActive`)
 *
 * 비목표:
 *   - GameEngine 전체 리팩터링
 *   - CombatSystem / CardSystem 분리
 *   - 모든 pending 상태 제거
 */

/** 오버레이 종류 — 우선순위가 높은 순으로 정렬 */
export type OverlayKind =
  | 'none'
  | 'tutorial'        // 학습 모달 (z 250)
  | 'revival'         // 부활 광고 (z 200)
  | 'pause'           // 일시정지 메뉴 (z 100)
  | 'waveBreak'       // 준비 단계 (z 95)
  | 'relicChoice'    // 유물 선택 (z 40)
  | 'eventChoice'    // 랜덤 이벤트 (z 40)
  | 'branchChoice'   // 분기 카드 (z 40)
  | 'cardChoice'     // 카드 펼치기 + slot reveal (z 10, bottom)
  | 'riskChoice'     // 리스크 카드 — 현재는 cardChoice 안에 인라인 표시 (예약)
  | 'result';        // 결과 화면 (게임 외부)

/** 우선순위 — 숫자가 클수록 우선 (위에 표시) */
const PRIORITY: Record<OverlayKind, number> = {
  none:         0,
  cardChoice:   10,
  riskChoice:   12,   // cardChoice와 같은 시점에 등장하지만 시각 강조
  branchChoice: 20,
  relicChoice:  30,
  eventChoice:  30,
  waveBreak:    50,
  pause:        60,
  revival:      70,
  tutorial:     90,
  result:       100,
};

/** simulation(전투/적 진군 등)을 block 해야 하는 overlay */
const BLOCKS_SIM: Record<OverlayKind, boolean> = {
  none:         false,
  cardChoice:   true,   // runs<=5 한정 — 실제 paused 처리는 GameEngine.finalizeSlot
  riskChoice:   true,   // cardChoice 내 인라인이라 동일
  branchChoice: true,
  relicChoice:  true,
  eventChoice:  true,
  waveBreak:    true,
  pause:        true,
  revival:      true,
  tutorial:     true,
  result:       true,
};

/** 새 overlay를 띄우려 할 때 현재 활성 overlay 위에 띄울 수 있는가? */
export function canOpen(current: OverlayKind, candidate: OverlayKind): boolean {
  // none → 항상 가능
  if (current === 'none') return true;
  // 같은 종류 중복 금지
  if (current === candidate) return false;
  // 우선순위가 더 높은 overlay만 위에 덮을 수 있음
  // (예: pause 중 tutorial 가능, tutorial 중 pause 불가)
  return PRIORITY[candidate] > PRIORITY[current];
}

/** GameEngine의 raw flag set — read-side 입력 */
export interface RawOverlayFlags {
  cardChoices: unknown | null;         // null이 아니면 카드 모달 활성
  slotActive: boolean;                 // slot reveal 중
  pendingRelicChoices: unknown | null;
  pendingEvent: string | null;
  pendingRevival: boolean;
  waveBreakActive: boolean;
  pendingBranchChoices: unknown | null;
  tutorialQueueLength: number;
  /** UI 측 pause 메뉴 표시 여부는 GameScreen에서 별도 관리 — engine 측은 paused 플래그만 본다 */
  pausedByUser: boolean;               // togglePause()로 사용자가 명시 일시정지한 경우
  /** 게임 종료 후 결과 화면으로 전환 */
  resultActive: boolean;
  /** 단계 5: 진화/보스 처치 컷씬 (slowMoT/hitStopT) 활성 — sim block 유지 */
  cutsceneActive?: boolean;
  /** 단계 5: 카드 슬롯에 리스크 카드가 들어 있는지 (시각 강조용 — sim block 영향 없음) */
  riskCardInSlot?: boolean;
}

/** 현재 가장 우선순위 높은 overlay 1개 반환 */
export function topOverlay(flags: RawOverlayFlags): OverlayKind {
  if (flags.resultActive) return 'result';
  if (flags.tutorialQueueLength > 0) return 'tutorial';
  if (flags.pendingRevival) return 'revival';
  if (flags.pausedByUser) return 'pause';
  if (flags.waveBreakActive) return 'waveBreak';
  if (flags.pendingRelicChoices) return 'relicChoice';
  if (flags.pendingEvent) return 'eventChoice';
  if (flags.pendingBranchChoices) return 'branchChoice';
  if (flags.riskCardInSlot && (flags.cardChoices || flags.slotActive)) return 'riskChoice';
  if (flags.cardChoices || flags.slotActive) return 'cardChoice';
  // cutscene은 cardChoice 다음 우선순위 (sim block 유지)
  if (flags.cutsceneActive) return 'cardChoice';  // 진화 컷씬은 cardChoice와 동등 취급
  return 'none';
}

/**
 * 현재 활성 overlay 목록 (한 번에 여러 개가 set되어 있을 수 있음 — 결합 상태 진단용).
 * 디버그/QA에서 race 후보 식별에 사용.
 */
export function activeOverlays(flags: RawOverlayFlags): OverlayKind[] {
  const out: OverlayKind[] = [];
  if (flags.tutorialQueueLength > 0) out.push('tutorial');
  if (flags.pendingRevival) out.push('revival');
  if (flags.pausedByUser) out.push('pause');
  if (flags.waveBreakActive) out.push('waveBreak');
  if (flags.pendingRelicChoices) out.push('relicChoice');
  if (flags.pendingEvent) out.push('eventChoice');
  if (flags.pendingBranchChoices) out.push('branchChoice');
  if (flags.riskCardInSlot && (flags.cardChoices || flags.slotActive)) out.push('riskChoice');
  if (flags.cardChoices || flags.slotActive) out.push('cardChoice');
  if (flags.cutsceneActive) out.push('cardChoice');  // 컷씬도 sim block
  if (flags.resultActive) out.push('result');
  return out;
}

/**
 * simulation을 block 해야 하는가?
 *
 * 단순화 규칙:
 *   - 활성 overlay 중 하나라도 BLOCKS_SIM 이면 block
 *   - cardChoice는 runs<=5 한정으로 GameEngine.finalizeSlot에서 paused 설정 — 이 함수는
 *     "block해야 한다"만 판단하고 실제 paused 적용은 GameEngine 측 결정.
 *
 * GameEngine.paused는 기존대로 유지 — 이 컨트롤러는 read-side advisor.
 */
export function shouldBlockSimulation(flags: RawOverlayFlags): boolean {
  const all = activeOverlays(flags);
  return all.some((o) => BLOCKS_SIM[o]);
}

/**
 * paused를 false로 풀어도 안전한가? (chooseCard 등에서 호출)
 *
 * "더 높은 우선순위 overlay가 살아있으면 풀면 안 됨"의 단순 판단.
 * 결과 / 사용자 pause / 튜토리얼 / 부활 / wave-break / 다른 모달이 살아있으면 false.
 *
 * cardChoice 자신이 닫힐 때 (예: chooseCard 직후 cardChoices=null) 호출 — cardChoice를
 * 제외한 나머지 overlay 중 BLOCKS_SIM이 있으면 false 반환.
 */
export function canResume(flags: RawOverlayFlags, exceptKind: OverlayKind): boolean {
  const all = activeOverlays(flags).filter((o) => o !== exceptKind);
  return !all.some((o) => BLOCKS_SIM[o]);
}

/**
 * 다음에 자동 노출되어야 하는 pending overlay 후보가 있는가?
 *
 * 1차에서는 GameEngine이 이미 _pendingPostBreakOffer 같은 자체 큐를 운영한다.
 * 이 컨트롤러는 후속 단계에서 통합할 자리만 확보. 현재는 raw flag 기반 진단만 제공.
 */
export function diagnoseStuckOverlay(flags: RawOverlayFlags): {
  multipleActive: boolean;
  list: OverlayKind[];
  conflict: string | null;
} {
  const list = activeOverlays(flags);
  // 두 개 이상 활성 + 그 중 두 개 모두 BLOCKS_SIM이면 잠재 race
  const blocking = list.filter((o) => BLOCKS_SIM[o]);
  if (blocking.length >= 2) {
    return {
      multipleActive: true,
      list,
      conflict: `다중 활성 (${blocking.join(' + ')}) — 우선순위 ${blocking[0]} 표시 / 나머지는 닫힐 때까지 대기`,
    };
  }
  return { multipleActive: list.length > 1, list, conflict: null };
}

// =============== 단계 2: 큐 + open/close API ===============

/**
 * 큐에 적재되는 deferred overlay 항목.
 * payload는 GameEngine 측에서 정의한 callback — 큐에서 꺼내 실행 시 raw flag set.
 */
export interface DeferredOverlay {
  kind: OverlayKind;
  /** 큐에서 꺼낼 때 실행 — engine raw state를 실제로 set하는 콜백 */
  apply: () => void;
  /** 같은 종류 큐 중복 방지용 키 (옵션) */
  key?: string;
}

export class OverlayQueue {
  private items: DeferredOverlay[] = [];
  /**
   * 사용자 pause 명시 추적 — togglePause()에서 set/clear.
   * GameEngine은 paused 플래그를 그대로 두지만, controller는 이 값을
   * 봐서 "사용자 pause 안의 paused"인지 "overlay-induced paused"인지 구분.
   */
  userPauseActive = false;

  push(item: DeferredOverlay) {
    if (item.key && this.items.some((i) => i.key === item.key)) return;
    this.items.push(item);
  }

  hasPending(): boolean {
    return this.items.length > 0;
  }

  /** 우선순위 가장 높은 deferred 1개 꺼내 실행 (없으면 false) */
  popAndApply(currentTop: OverlayKind): boolean {
    if (this.items.length === 0) return false;
    // 현재 top보다 우선순위가 낮거나 같은 항목 중 가장 우선순위 높은 것 선택
    // (top이 'none'이면 모든 deferred 후보)
    let bestIdx = -1;
    let bestPri = -1;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const pri = PRIORITY[it.kind];
      if (currentTop !== 'none' && pri > PRIORITY[currentTop]) continue;  // top 아래만
      if (pri > bestPri) { bestPri = pri; bestIdx = i; }
    }
    if (bestIdx < 0) return false;
    const [picked] = this.items.splice(bestIdx, 1);
    try {
      picked.apply();
    } catch (e) {
      // apply 실패는 런타임 깨지지 않게 swallow
      console.warn('[OverlayQueue] apply failed:', e);
    }
    return true;
  }

  clear() {
    this.items = [];
  }

  size(): number {
    return this.items.length;
  }

  /** 디버그용 — 큐 상태 스냅샷 */
  snapshot(): { kind: OverlayKind; key?: string }[] {
    return this.items.map((i) => ({ kind: i.kind, key: i.key }));
  }
}

/**
 * 새 overlay를 띄울 수 있으면 즉시 apply, 안 되면 큐에 넣는다.
 * - `apply`: 실제 raw flag set (engine 측 콜백)
 * - 반환: 'opened' | 'queued'
 */
export function requestOpen(
  flags: RawOverlayFlags,
  queue: OverlayQueue,
  candidate: OverlayKind,
  apply: () => void,
  key?: string,
): 'opened' | 'queued' {
  const top = topOverlay(flags);
  if (canOpen(top, candidate)) {
    apply();
    return 'opened';
  }
  queue.push({ kind: candidate, apply, key });
  return 'queued';
}

/**
 * 단계 4: paused 플래그를 raw flag로부터 derive.
 *
 * 규칙:
 *   - block sim overlay 중 하나라도 활성 → paused
 *   - 그 외 → not paused
 *
 * GameEngine.paused는 이 함수 결과로 매 frame 갱신.
 * 단계 4에서 engine raw flag set 흐름은 그대로 두되, paused는 derive.
 */
export function derivePaused(flags: RawOverlayFlags): boolean {
  return shouldBlockSimulation(flags);
}

// =============== 디버그 ===============
declare global {
  interface Window {
    __overlayDiagnose?: (flags: RawOverlayFlags) => unknown;
    __overlayQueueSnap?: () => unknown;
  }
}
if (typeof window !== 'undefined') {
  window.__overlayDiagnose = (flags: RawOverlayFlags) => ({
    top: topOverlay(flags),
    active: activeOverlays(flags),
    block: shouldBlockSimulation(flags),
    diag: diagnoseStuckOverlay(flags),
  });
}
