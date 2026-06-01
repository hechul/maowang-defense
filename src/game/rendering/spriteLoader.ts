/**
 * PNG 스프라이트 로더 — GPT/외주로 받은 PNG 에셋 통합용
 *
 * 사용 흐름:
 * 1. public/sprites/ 폴더에 PNG 저장 (예: slime.png)
 * 2. 게임 데이터에서 buildSprite를 PNG 우선, fallback에 함수형 builder 사용
 * 3. 자동 캐싱 (Map)
 *
 * 명세 (asset_pixel.md):
 * - 32×32 1배율 PNG (확대 X)
 * - 투명 배경
 * - Nearest Neighbor (안티앨리어싱 금지)
 */

const cache = new Map<string, HTMLCanvasElement>();
const loading = new Map<string, Promise<HTMLCanvasElement>>();
const READBACK_CONTEXT: CanvasRenderingContext2DSettings = { willReadFrequently: true };

function ctx2d(canvas: HTMLCanvasElement, settings?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
  const cx = canvas.getContext('2d', settings);
  if (!cx) throw new Error('2D canvas context를 만들 수 없습니다.');
  return cx;
}

/** PNG 경로 (Vite의 public/ 기반) */
function spritePath(id: string): string {
  return `/sprites/${id}.png`;
}

/**
 * 비동기 PNG 로드 → 캔버스로 변환 (scale 배율 적용)
 * - 한 번 로드된 sprite는 캐시
 * - PNG가 없으면 reject (호출자가 fallback 처리)
 */
export function loadSprite(id: string, scale = 2): Promise<HTMLCanvasElement> {
  const key = `${id}@${scale}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key)!);
  if (loading.has(key)) return loading.get(key)!;

  const p = new Promise<HTMLCanvasElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width * scale;
      c.height = img.height * scale;
      const cx = ctx2d(c);
      cx.imageSmoothingEnabled = false;
      cx.drawImage(img, 0, 0, c.width, c.height);
      cache.set(key, c);
      loading.delete(key);
      resolve(c);
    };
    img.onerror = () => {
      loading.delete(key);
      reject(new Error(`PNG 로드 실패: ${id}`));
    };
    img.src = spritePath(id);
  });
  loading.set(key, p);
  return p;
}

/**
 * 동기 sprite 가져오기 — 캐시되어 있으면 즉시 반환, 없으면 null
 * (게임 루프에서 사용 — 비동기 load는 사전에 preload로)
 */
export function getCachedSprite(id: string, scale = 2): HTMLCanvasElement | null {
  const key = `${id}@${scale}`;
  return cache.get(key) || null;
}

/**
 * 게임 시작 전 일괄 preload (P0 우선순위만)
 * - 실패해도 무시 (코드 fallback이 그림)
 */
export async function preloadSprites(ids: string[], scale = 2): Promise<void> {
  await Promise.all(ids.map((id) => loadSprite(id, scale).catch(() => null)));
}

/**
 * 애니메이션 시퀀스 일괄 preload — 'prefix_f1.png' ~ 'prefix_f{count}.png'
 */
export async function preloadSequence(prefix: string, count: number, scale = 1): Promise<void> {
  const ids = Array.from({ length: count }, (_, i) => `${prefix}_f${i + 1}`);
  await preloadSprites(ids, scale);
}

/** 시퀀스 모든 프레임 동기 가져오기 — 캐시되어 있으면 반환, 아니면 null */
export function getCachedSequence(prefix: string, count: number, scale = 1): HTMLCanvasElement[] | null {
  const frames: HTMLCanvasElement[] = [];
  for (let i = 1; i <= count; i++) {
    const cv = getCachedSprite(`${prefix}_f${i}`, scale);
    if (!cv) return null;
    frames.push(cv);
  }
  return frames;
}

/**
 * Sprite 정의: PNG 우선, 없으면 fallback 함수형 builder
 * @param id PNG 파일 이름 (예: 'slime')
 * @param fallback 함수형 builder (PNG 없을 때 사용)
 * @param scale 화면 출력 배율
 */
export function pngOrBuild(
  id: string,
  fallback: () => HTMLCanvasElement,
  scale = 2,
): HTMLCanvasElement {
  const cached = getCachedSprite(id, scale);
  if (cached) return cached;
  // 백그라운드 로드 시작 (다음 호출 시 캐시됨)
  loadSprite(id, scale).catch(() => {});
  return fallback();
}

/* -----------------------------------------------------------
 * Walk sprite sheet 지원 (가로 N프레임 PNG)
 * - apprentice.png 등이 4프레임 가로 시트일 때 자동 분리
 * - frame 0은 기본 sprite로도 캐시 (pngOrBuild 호환)
 * ----------------------------------------------------------- */
const sheetCache = new Map<string, HTMLCanvasElement[]>();
const sheetLoading = new Map<string, Promise<HTMLCanvasElement[]>>();

/** 알파 16 이상 픽셀의 bbox로 잘라내기 (transparent padding 제거) */
function autoTrim(src: HTMLCanvasElement): HTMLCanvasElement {
  const cx = ctx2d(src, READBACK_CONTEXT);
  const w = src.width, h = src.height;
  const data = cx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return src;
  const tw = maxX - minX + 1, th = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = tw;
  out.height = th;
  const ocx = ctx2d(out);
  ocx.imageSmoothingEnabled = false;
  ocx.drawImage(src, minX, minY, tw, th, 0, 0, tw, th);
  return out;
}

/**
 * 누끼 따기 — 채도/명도 기반 BG 점수 + 외곽 flood-fill + 다중 패스 softening
 *
 * 핵심 아이디어:
 * - 흰 배경 = 명도 높음 + 채도 낮음(grayscale-ish)
 * - 캐릭터 내부 흰색(눈/이/갑옷 광택) = 외부에서 닿지 않으므로 flood-fill로 보존
 * - 안티앨리어싱 가장자리 = 단계적 명도 그라디언트 → 다중 패스로 cascade 페이드
 * - 다크 아웃라인(명도 낮음 또는 채도 있음)은 BG 점수 0 → 무조건 보존
 */
function removeBackgroundFlood(canvas: HTMLCanvasElement) {
  const cx = ctx2d(canvas, READBACK_CONTEXT);
  const W = canvas.width, H = canvas.height;
  const im = cx.getImageData(0, 0, W, H);
  const data = im.data;

  /** 0 = 캐릭터, 1 = 배경 (흰색 anti-alias) */
  const bgScore = (p: number): number => {
    const R = data[p], G = data[p + 1], B = data[p + 2];
    const minC = Math.min(R, G, B);
    const maxC = Math.max(R, G, B);
    const sat = maxC - minC;
    const luma = (R + G + B) / 3;
    // 채도 있는 색 = 캐릭터 (피부톤 cream RGB(243,225,201) 등 sat~42 → 보존)
    if (sat > 22) return 0;
    // 어두운 그레이 = 캐릭터 (다크 아웃라인 / 회색 갑옷)
    if (luma < 175) return 0;
    // 그레이 + 밝음 = 배경 anti-alias 가능성. luma 175→0, 250+→1
    return Math.max(0, Math.min(1, (luma - 175) / 75));
  };

  /** flood seed 기준 — bgScore ≥ 0.7 (명백한 흰색) 만 시드 */
  const isFloodSeed = (idx: number) => {
    const p = idx * 4;
    return data[p + 3] > 0 && bgScore(p) >= 0.7;
  };

  // ===== 1단계: 외곽 flood-fill =====
  const visited = new Uint8Array(W * H);
  const stack: number[] = [];
  for (let x = 0; x < W; x++) {
    let idx = x;
    if (!visited[idx] && isFloodSeed(idx)) { visited[idx] = 1; stack.push(idx); }
    idx = (H - 1) * W + x;
    if (!visited[idx] && isFloodSeed(idx)) { visited[idx] = 1; stack.push(idx); }
  }
  for (let y = 0; y < H; y++) {
    let idx = y * W;
    if (!visited[idx] && isFloodSeed(idx)) { visited[idx] = 1; stack.push(idx); }
    idx = y * W + W - 1;
    if (!visited[idx] && isFloodSeed(idx)) { visited[idx] = 1; stack.push(idx); }
  }
  while (stack.length) {
    const idx = stack.pop()!;
    data[idx * 4 + 3] = 0;
    const x = idx % W, y = (idx - x) / W;
    if (x > 0)     { const n = idx - 1; if (!visited[n] && isFloodSeed(n)) { visited[n] = 1; stack.push(n); } }
    if (x < W - 1) { const n = idx + 1; if (!visited[n] && isFloodSeed(n)) { visited[n] = 1; stack.push(n); } }
    if (y > 0)     { const n = idx - W; if (!visited[n] && isFloodSeed(n)) { visited[n] = 1; stack.push(n); } }
    if (y < H - 1) { const n = idx + W; if (!visited[n] && isFloodSeed(n)) { visited[n] = 1; stack.push(n); } }
  }

  // ===== 2단계: 다중 패스 edge softening =====
  // 각 패스마다 투명 픽셀과 인접한 BG-점수 높은 픽셀을 alpha 페이드.
  // 다음 패스에서는 새로 페이드된 픽셀이 "투명한 이웃"으로 작용 → cascade 효과.
  // (단계적 anti-alias 그라디언트 ring을 안에서 바깥으로 정리)
  for (let pass = 0; pass < 4; pass++) {
    const alphaSnap = new Uint8ClampedArray(W * H);
    for (let i = 0; i < W * H; i++) alphaSnap[i] = data[i * 4 + 3];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        const a0 = alphaSnap[idx];
        if (a0 < 8) continue;  // 이미 투명에 가까움
        // 거의-투명(alpha<32) 이웃이 하나라도 있는가?
        let nearTrans = false;
        if (x > 0 && alphaSnap[idx - 1] < 32) nearTrans = true;
        else if (x < W - 1 && alphaSnap[idx + 1] < 32) nearTrans = true;
        else if (y > 0 && alphaSnap[idx - W] < 32) nearTrans = true;
        else if (y < H - 1 && alphaSnap[idx + W] < 32) nearTrans = true;
        if (!nearTrans) continue;
        const score = bgScore(idx * 4);
        if (score <= 0) continue;
        // alpha *= (1 - score) — score=1(완전 흰)→투명, score=0.3→70% 유지
        const next = Math.floor(a0 * (1 - score));
        if (next < a0) data[idx * 4 + 3] = next;
      }
    }
  }

  cx.putImageData(im, 0, 0);
}

export function loadSpriteSheet(
  id: string,
  frames: number,
  scale = 1,
): Promise<HTMLCanvasElement[]> {
  const key = `${id}@${scale}@${frames}`;
  if (sheetCache.has(key)) return Promise.resolve(sheetCache.get(key)!);
  if (sheetLoading.has(key)) return sheetLoading.get(key)!;

  const p = new Promise<HTMLCanvasElement[]>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const frameW = Math.floor(img.width / frames);
      const frameH = img.height;

      // 1단계: 각 프레임 분리 + 누끼(외곽 flood-fill + 안티앨리어싱 softening)
      const raw: HTMLCanvasElement[] = [];
      for (let i = 0; i < frames; i++) {
        const c = document.createElement('canvas');
        c.width = frameW;
        c.height = frameH;
        const cx = ctx2d(c, READBACK_CONTEXT);
        cx.imageSmoothingEnabled = false;
        cx.drawImage(img, i * frameW, 0, frameW, frameH, 0, 0, frameW, frameH);
        removeBackgroundFlood(c);
        raw.push(c);
      }

      // 2단계: 각 프레임 개별 bbox 추출 (캐릭터의 진짜 영역)
      type Bbox = { minX: number; minY: number; maxX: number; maxY: number };
      const bboxes: Bbox[] = raw.map((r) => {
        const d = ctx2d(r, READBACK_CONTEXT).getImageData(0, 0, frameW, frameH).data;
        let minX = frameW, minY = frameH, maxX = -1, maxY = -1;
        for (let y = 0; y < frameH; y++) {
          for (let x = 0; x < frameW; x++) {
            if (d[(y * frameW + x) * 4 + 3] > 16) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        return { minX, minY, maxX, maxY };
      });

      // 3단계: 모든 프레임 중 최대 폭/높이 → 균일 캔버스 사이즈
      let maxW = 0, maxH = 0;
      for (const b of bboxes) {
        if (b.maxX < 0) continue;
        const w = b.maxX - b.minX + 1;
        const h = b.maxY - b.minY + 1;
        if (w > maxW) maxW = w;
        if (h > maxH) maxH = h;
      }
      if (maxW === 0) maxW = frameW;
      if (maxH === 0) maxH = frameH;

      // 4단계: 각 프레임을 trim → bottom-center 정렬로 균일 캔버스에 그리기
      // (발 위치 고정 = walk cycle 미끄러짐 방지)
      const aligned: HTMLCanvasElement[] = raw.map((r, i) => {
        const b = bboxes[i];
        const out = document.createElement('canvas');
        out.width = maxW;
        out.height = maxH;
        const ocx = ctx2d(out);
        ocx.imageSmoothingEnabled = false;
        if (b.maxX < 0) return out;
        const w = b.maxX - b.minX + 1;
        const h = b.maxY - b.minY + 1;
        const dx = Math.floor((maxW - w) / 2);
        const dy = maxH - h;  // bottom-aligned
        ocx.drawImage(r, b.minX, b.minY, w, h, dx, dy, w, h);
        return out;
      });

      // 5단계: scale 배율 (보통 1)
      const out = scale === 1 ? aligned : aligned.map((t) => {
        const c = document.createElement('canvas');
        c.width = t.width * scale;
        c.height = t.height * scale;
        const cx = ctx2d(c);
        cx.imageSmoothingEnabled = false;
        cx.drawImage(t, 0, 0, c.width, c.height);
        return c;
      });

      // suppress unused
      void autoTrim;

      sheetCache.set(key, out);
      cache.set(`${id}@${scale}`, out[0]);
      sheetLoading.delete(key);
      resolve(out);
    };
    img.onerror = () => {
      sheetLoading.delete(key);
      reject(new Error(`PNG sheet 로드 실패: ${id}`));
    };
    img.src = spritePath(id);
  });
  sheetLoading.set(key, p);
  return p;
}

export function getCachedSheet(
  id: string,
  frames: number,
  scale = 1,
): HTMLCanvasElement[] | null {
  return sheetCache.get(`${id}@${scale}@${frames}`) || null;
}

/** PNG sheet 우선, 없으면 fallback. 반환값은 frame[0] (정적 sprite). */
export function pngSheetOrBuild(
  id: string,
  frames: number,
  fallback: () => HTMLCanvasElement,
  scale = 1,
): HTMLCanvasElement {
  const sheet = getCachedSheet(id, frames, scale);
  if (sheet) return sheet[0];
  loadSpriteSheet(id, frames, scale).catch(() => {});
  return fallback();
}

/* -----------------------------------------------------------
 * Multi-row sprite grid
 * - 한 PNG에 여러 행(진화 단계 등)이 쌓여있는 경우
 * - 각 행을 idsByRow[r] 키로 sheetCache에 등록 → getCachedSheet(id, frames, 1)로 조회 가능
 * - 흰색 키컬러(R,G,B≥230) → alpha 0
 * - 행 단위로 모든 셀의 개별 bbox 추출 → 행 내 균일 캔버스에 bottom-center 정렬
 * ----------------------------------------------------------- */
export function loadSpriteGrid(
  pngId: string,
  idsByRow: string[],
  frames = 4,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const rows = idsByRow.length;
      const cellW = Math.floor(img.width / frames);
      const cellH = Math.floor(img.height / rows);
      for (let r = 0; r < rows; r++) {
        const id = idsByRow[r];
        if (!id) continue;
        // 1) 행에서 각 프레임 셀 추출 + 누끼 (flood-fill + softening)
        const raw: HTMLCanvasElement[] = [];
        for (let f = 0; f < frames; f++) {
          const c = document.createElement('canvas');
          c.width = cellW;
          c.height = cellH;
          const cx = ctx2d(c, READBACK_CONTEXT);
          cx.imageSmoothingEnabled = false;
          cx.drawImage(img, f * cellW, r * cellH, cellW, cellH, 0, 0, cellW, cellH);
          removeBackgroundFlood(c);
          raw.push(c);
        }
        // 2) 각 프레임 개별 bbox
        type Bbox = { minX: number; minY: number; maxX: number; maxY: number };
        const bboxes: Bbox[] = raw.map((rc) => {
          const d = ctx2d(rc, READBACK_CONTEXT).getImageData(0, 0, cellW, cellH).data;
          let minX = cellW, minY = cellH, maxX = -1, maxY = -1;
          for (let y = 0; y < cellH; y++) {
            for (let x = 0; x < cellW; x++) {
              if (d[(y * cellW + x) * 4 + 3] > 16) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          return { minX, minY, maxX, maxY };
        });
        // 3) 행 내 max 폭/높이
        let maxW = 0, maxH = 0;
        for (const b of bboxes) {
          if (b.maxX < 0) continue;
          const w = b.maxX - b.minX + 1;
          const h = b.maxY - b.minY + 1;
          if (w > maxW) maxW = w;
          if (h > maxH) maxH = h;
        }
        if (maxW === 0) maxW = cellW;
        if (maxH === 0) maxH = cellH;
        // 4) bottom-center 정렬
        const aligned = raw.map((rc, i) => {
          const b = bboxes[i];
          const out = document.createElement('canvas');
          out.width = maxW;
          out.height = maxH;
          const ocx = ctx2d(out);
          ocx.imageSmoothingEnabled = false;
          if (b.maxX < 0) return out;
          const w = b.maxX - b.minX + 1;
          const h = b.maxY - b.minY + 1;
          const dx = Math.floor((maxW - w) / 2);
          const dy = maxH - h;
          ocx.drawImage(rc, b.minX, b.minY, w, h, dx, dy, w, h);
          return out;
        });
        // 5) sheet/단일 캐시 등록 — getCachedSheet(id, frames, 1) / pngOrBuild과 동일 키
        sheetCache.set(`${id}@1@${frames}`, aligned);
        cache.set(`${id}@1`, aligned[0]);
      }
      resolve();
    };
    img.onerror = () => reject(new Error(`PNG grid 로드 실패: ${pngId}`));
    img.src = spritePath(pngId);
  });
}
