/**
 * 픽셀 아트 빌더 — PIXEL §파트2 규칙 준수
 * - 자동 1px 아웃라인 (#1A1A2E 통일)
 * - 마스터 팔레트만
 * - Nearest Neighbor (안티앨리어싱 금지)
 *
 * 사용 패턴:
 *   const grid = [
 *     row(''),                    // 빈 행 (32자 자동 패딩)
 *     row('111111111', 11),       // 좌측 패딩 11, 본체, 자동 우측 패딩
 *     row('  111111  '),          // 공백은 transparent로 자동 변환
 *   ];
 *   const sprite = makeSprite(grid, palette);
 */

const OUTLINE = '#1A1A2E';
const SIZE = 32;

export type Sprite = HTMLCanvasElement;

/**
 * 32자 행 빌더 — 본체 길이 부족 시 자동 정확히 32자로 패딩.
 * @param body 픽셀 인덱스 문자열 (공백 또는 '.'은 transparent)
 * @param leftPad 좌측 dot 패딩 개수 (기본: 자동 가운데 정렬)
 */
export function row(body: string, leftPad?: number): string {
  // 공백을 dot으로 변환
  const cleaned = body.replace(/ /g, '.');
  if (cleaned.length >= SIZE) return cleaned.slice(0, SIZE);
  const L = leftPad != null ? leftPad : Math.floor((SIZE - cleaned.length) / 2);
  const R = SIZE - cleaned.length - L;
  return '.'.repeat(Math.max(0, L)) + cleaned + '.'.repeat(Math.max(0, R));
}

/** 빈 행 32개 dot */
export const empty = (): string => '.'.repeat(SIZE);

/**
 * 32×32 (또는 임의 크기) 그리드를 캔버스로 렌더링
 * @param grid 행 문자열 배열, 각 문자는 팔레트 인덱스 (16진수). '.' = 투명
 * @param palette 인덱스→색상 매핑 (palette[0] = null/transparent)
 * @param scale 정수 배율
 * @param applyOutline 자동 외곽 1px 아웃라인 적용 여부
 */
export function makeSprite(
  grid: readonly string[],
  palette: readonly (string | null)[],
  scale = 2,
  applyOutline = true,
): Sprite {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const c = document.createElement('canvas');
  c.width = w * scale;
  c.height = h * scale;
  const cx = c.getContext('2d')!;
  cx.imageSmoothingEnabled = false;

  // 1단계: 자동 아웃라인 (4-이웃 검사)
  if (applyOutline) {
    cx.fillStyle = OUTLINE;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (grid[y][x] !== '.') continue;
        const ns: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dy, dx] of ns) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w && grid[ny][nx] !== '.') {
            cx.fillRect(x * scale, y * scale, scale, scale);
            break;
          }
        }
      }
    }
  }

  // 2단계: 본체 픽셀
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grid[y][x];
      if (ch === '.') continue;
      const idx = parseInt(ch, 16);
      const col = palette[idx];
      if (!col) continue;
      cx.fillStyle = col;
      cx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}
