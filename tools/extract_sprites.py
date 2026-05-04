"""
extract_sprites.py — Pixel-art sprite-sheet extractor

Pipeline:
  1) Detect/use alpha channel.
  2) Sample edge pixels to learn background color cluster (handles checkerboard).
  3) Edge-seeded BFS flood fill in RGB-distance space → mark only outside-connected
     pixels as background. Inner whites/highlights stay.
  4) Slice the sheet into cells (auto grid OR explicit --rows/--cols, OR
     connected-component mode for irregular layouts).
  5) For each cell: per-cell flood-fill cleanup, bbox+padding, optional resize
     (NEAREST only) to a target size, bottom-center align across animation rows
     so feet don't slide.
  6) Write sprite_NNN.png OR named files (when --names given) + contact_sheet.png,
     debug_mask.png, debug_boxes.png, extraction_report.md.

Usage examples:
  python tools/extract_sprites.py \
    --input public/sprites/goblin_sheet.png \
    --output assets/extracted/goblin \
    --rows 3 --cols 4 \
    --names "goblin,gobw,ggen" \
    --resize 32 \
    --tolerance 24

  python tools/extract_sprites.py \
    --input public/sprites/apprentice.png \
    --output assets/extracted/apprentice \
    --rows 1 --cols 4 \
    --frame-prefix apprentice \
    --resize 32

  python tools/extract_sprites.py \
    --input public/sprites/menu_plate_dark.png \
    --output assets/extracted/menu_plate_dark \
    --mode single \
    --tolerance 24

Pixel-art is sacred: NEAREST only, no anti-alias, no palette quant, no smoothing.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image


# ---------------------------------------------------------------------------
# Background detection + flood fill
# ---------------------------------------------------------------------------

@dataclass
class BgInfo:
    used_alpha: bool
    bg_colors: list[tuple[int, int, int]]
    tolerance: int


def _sample_edge_pixels(rgb: np.ndarray, band: int = 5) -> np.ndarray:
    """모서리/테두리 픽셀들을 모아서 (N,3) 배열로 반환."""
    h, w, _ = rgb.shape
    band = max(1, min(band, h // 2, w // 2))
    strips = [
        rgb[0:band, :, :].reshape(-1, 3),
        rgb[h - band:h, :, :].reshape(-1, 3),
        rgb[:, 0:band, :].reshape(-1, 3),
        rgb[:, w - band:w, :].reshape(-1, 3),
    ]
    return np.concatenate(strips, axis=0)


def _cluster_bg_colors(samples: np.ndarray, k: int = 4) -> list[tuple[int, int, int]]:
    """
    상위 k개 색 클러스터를 추출. checkerboard는 보통 2~4색이라 k=4 기본.
    팔레트화해서(8단위로 양자화) 빈도 상위만 추린 뒤 평균.
    """
    if samples.size == 0:
        return [(255, 255, 255)]
    quant = (samples.astype(np.int32) // 8) * 8
    keys = quant[:, 0] * 65536 + quant[:, 1] * 256 + quant[:, 2]
    uniq, counts = np.unique(keys, return_counts=True)
    order = np.argsort(-counts)
    out: list[tuple[int, int, int]] = []
    total = counts.sum()
    for i in order[:k]:
        if counts[i] / total < 0.02:  # 2% 미만 클러스터는 무시
            break
        key = int(uniq[i])
        r = (key // 65536) & 0xFF
        g = (key // 256) & 0xFF
        b = key & 0xFF
        out.append((r, g, b))
    return out or [(255, 255, 255)]


def detect_background(img: Image.Image, tolerance: int) -> BgInfo:
    """
    1) 알파가 있고 0이 충분(>=2%)이면 alpha 그대로 사용.
    2) 아니면 모서리에서 색 클러스터링.
    """
    arr = np.array(img.convert("RGBA"))
    alpha = arr[:, :, 3]
    if alpha.min() == 0 and (alpha == 0).mean() > 0.02:
        return BgInfo(used_alpha=True, bg_colors=[], tolerance=tolerance)
    rgb = arr[:, :, :3]
    samples = _sample_edge_pixels(rgb, band=5)
    bg_colors = _cluster_bg_colors(samples, k=4)
    return BgInfo(used_alpha=False, bg_colors=bg_colors, tolerance=tolerance)


def _color_dist_to_bgs(rgb_pixel: np.ndarray, bgs: np.ndarray) -> float:
    """가장 가까운 배경 클러스터까지의 RGB 유클리드 거리."""
    diff = bgs.astype(np.int32) - rgb_pixel.astype(np.int32)
    return float(np.sqrt((diff * diff).sum(axis=1)).min())


def flood_fill_bg(arr: np.ndarray, bg: BgInfo) -> np.ndarray:
    """
    바깥에서 시작하는 BFS로 배경 픽셀만 alpha=0.
    arr: (H,W,4) uint8, in/out 둘 다 RGBA.
    캐릭터 내부 흰색은 외곽에서 닿지 않으므로 보존됨.
    """
    h, w, _ = arr.shape
    if bg.used_alpha:
        # 이미 alpha 신뢰. 살짝 깔끔하게: 거의-투명을 0, 거의-불투명을 255로 정규화하지 않음 — 보존.
        return arr

    bgs = np.array(bg.bg_colors, dtype=np.int32)
    tol = bg.tolerance
    rgb = arr[:, :, :3].astype(np.int32)

    # 배경 후보 마스크: 어떤 클러스터와의 거리도 tol 이하인 픽셀
    diffs = rgb[:, :, None, :] - bgs[None, None, :, :]
    dist2 = (diffs * diffs).sum(axis=3)  # (H,W,K)
    candidate = (dist2.min(axis=2) <= tol * tol)

    visited = np.zeros((h, w), dtype=bool)
    out_alpha = arr[:, :, 3].copy()

    # seed: 테두리 픽셀 중 candidate인 것
    border = np.zeros_like(candidate)
    border[0, :] = True
    border[-1, :] = True
    border[:, 0] = True
    border[:, -1] = True
    seeds = np.argwhere(border & candidate)

    q: deque[tuple[int, int]] = deque()
    for y, x in seeds:
        if not visited[y, x]:
            visited[y, x] = True
            q.append((int(y), int(x)))

    while q:
        y, x = q.popleft()
        out_alpha[y, x] = 0
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and candidate[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    out = arr.copy()
    out[:, :, 3] = out_alpha
    return out


# ---------------------------------------------------------------------------
# Cell slicing + bbox + resize
# ---------------------------------------------------------------------------

def slice_grid(arr: np.ndarray, rows: int, cols: int) -> list[np.ndarray]:
    """정확한 그리드로 분할. 나머지 픽셀은 마지막 셀에 흡수."""
    h, w = arr.shape[:2]
    cell_h = h // rows
    cell_w = w // cols
    cells: list[np.ndarray] = []
    for r in range(rows):
        y0 = r * cell_h
        y1 = h if r == rows - 1 else y0 + cell_h
        for c in range(cols):
            x0 = c * cell_w
            x1 = w if c == cols - 1 else x0 + cell_w
            cells.append(arr[y0:y1, x0:x1])
    return cells


def detect_components(arr: np.ndarray, min_area: int = 64) -> list[tuple[int, int, int, int]]:
    """
    알파>0 픽셀로 4-방향 connected component 탐지.
    return: [(x0,y0,x1,y1), ...] inclusive bbox.
    """
    h, w = arr.shape[:2]
    fg = arr[:, :, 3] > 16
    visited = np.zeros((h, w), dtype=bool)
    boxes: list[tuple[int, int, int, int]] = []
    for sy in range(h):
        for sx in range(w):
            if not fg[sy, sx] or visited[sy, sx]:
                continue
            q = deque([(sy, sx)])
            visited[sy, sx] = True
            x0, y0, x1, y1 = sx, sy, sx, sy
            count = 0
            while q:
                y, x = q.popleft()
                count += 1
                if x < x0:
                    x0 = x
                if x > x1:
                    x1 = x
                if y < y0:
                    y0 = y
                if y > y1:
                    y1 = y
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and fg[ny, nx]:
                        visited[ny, nx] = True
                        q.append((ny, nx))
            if count >= min_area:
                boxes.append((x0, y0, x1, y1))
    return boxes


def merge_close_boxes(
    boxes: list[tuple[int, int, int, int]],
    merge_gap: int,
) -> list[tuple[int, int, int, int]]:
    """가까운 bbox(<=merge_gap)는 한 캐릭터로 묶음."""
    if not boxes:
        return []
    changed = True
    cur = list(boxes)
    while changed:
        changed = False
        out: list[tuple[int, int, int, int]] = []
        used = [False] * len(cur)
        for i, a in enumerate(cur):
            if used[i]:
                continue
            ax0, ay0, ax1, ay1 = a
            for j in range(i + 1, len(cur)):
                if used[j]:
                    continue
                bx0, by0, bx1, by1 = cur[j]
                # 두 bbox 사이의 manhattan gap
                gx = max(0, max(ax0, bx0) - min(ax1, bx1))
                gy = max(0, max(ay0, by0) - min(ay1, by1))
                if gx <= merge_gap and gy <= merge_gap:
                    ax0, ay0 = min(ax0, bx0), min(ay0, by0)
                    ax1, ay1 = max(ax1, bx1), max(ay1, by1)
                    used[j] = True
                    changed = True
            out.append((ax0, ay0, ax1, ay1))
            used[i] = True
        cur = out
    return cur


def bbox_of_alpha(arr: np.ndarray) -> tuple[int, int, int, int] | None:
    """알파>16 픽셀의 inclusive bbox. None이면 빈 셀."""
    fg = arr[:, :, 3] > 16
    ys, xs = np.where(fg)
    if xs.size == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def crop_with_padding(
    arr: np.ndarray,
    bbox: tuple[int, int, int, int],
    padding: int,
) -> np.ndarray:
    h, w = arr.shape[:2]
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - padding)
    y0 = max(0, y0 - padding)
    x1 = min(w - 1, x1 + padding)
    y1 = min(h - 1, y1 + padding)
    return arr[y0:y1 + 1, x0:x1 + 1]


def resize_nearest(arr: np.ndarray, target: int, bottom_align: bool) -> np.ndarray:
    """
    target × target 캔버스에 NEAREST 리사이즈. 종횡비 유지, bottom-center 정렬.
    bottom_align=False면 정중앙 정렬.
    """
    h, w = arr.shape[:2]
    if h == 0 or w == 0:
        return np.zeros((target, target, 4), dtype=np.uint8)
    scale = min(target / w, target / h)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    img = Image.fromarray(arr, mode="RGBA").resize((new_w, new_h), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (target, target), (0, 0, 0, 0))
    dx = (target - new_w) // 2
    dy = (target - new_h) if bottom_align else (target - new_h) // 2
    canvas.paste(img, (dx, dy), img)
    return np.array(canvas)


# ---------------------------------------------------------------------------
# Outputs (contact sheet + debug + report)
# ---------------------------------------------------------------------------

def make_checkerboard(w: int, h: int, sq: int = 8) -> Image.Image:
    """투명 영역 시각화용 체크보드."""
    bg = Image.new("RGBA", (w, h), (210, 210, 210, 255))
    px = bg.load()
    for y in range(h):
        for x in range(w):
            if ((x // sq) + (y // sq)) % 2 == 0:
                px[x, y] = (240, 240, 240, 255)
    return bg


def make_contact_sheet(sprites: list[Image.Image], names: list[str], cell: int = 64) -> Image.Image:
    """투명 배경 체크보드 위에 모든 스프라이트를 그리드로 배치."""
    n = len(sprites)
    if n == 0:
        return Image.new("RGBA", (cell, cell), (200, 200, 200, 255))
    cols = min(8, n)
    rows = (n + cols - 1) // cols
    pad = 12
    label_h = 14
    tile = cell + pad * 2 + label_h
    sheet_w = cols * tile
    sheet_h = rows * tile
    bg = make_checkerboard(sheet_w, sheet_h, sq=8)
    from PIL import ImageDraw, ImageFont
    draw = ImageDraw.Draw(bg)
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None
    for i, (sp, nm) in enumerate(zip(sprites, names)):
        r, c = divmod(i, cols)
        x = c * tile + pad
        y = r * tile + pad
        # 셀 안에 sprite 중앙 정렬 (확대 없이 paste)
        sw, sh = sp.size
        if sw > cell or sh > cell:
            scale = min(cell / sw, cell / sh)
            sp = sp.resize((max(1, int(sw * scale)), max(1, int(sh * scale))), Image.Resampling.NEAREST)
            sw, sh = sp.size
        bg.paste(sp, (x + (cell - sw) // 2, y + (cell - sh) // 2), sp)
        if font is not None:
            draw.text((x, y + cell + 2), nm, fill=(40, 40, 40, 255), font=font)
    return bg


def make_debug_mask(arr_before: np.ndarray, arr_after: np.ndarray) -> Image.Image:
    """제거된 영역=마젠타, 남은 전경=원래 RGB. 알파 뺀 RGB 시각화."""
    removed = (arr_before[:, :, 3] > 0) & (arr_after[:, :, 3] == 0)
    canvas = arr_before[:, :, :3].copy()
    canvas[removed] = [255, 0, 255]
    return Image.fromarray(canvas, mode="RGB")


def make_debug_boxes(orig_rgb: np.ndarray, boxes_xyxy: list[tuple[int, int, int, int]]) -> Image.Image:
    """원본 위에 crop bbox를 빨간 외곽선으로."""
    img = Image.fromarray(orig_rgb, mode="RGB").copy()
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    for x0, y0, x1, y1 in boxes_xyxy:
        draw.rectangle([x0, y0, x1, y1], outline=(255, 0, 0), width=2)
    return img


# ---------------------------------------------------------------------------
# Extraction modes
# ---------------------------------------------------------------------------

@dataclass
class ExtractResult:
    sprites: list[Image.Image]
    names: list[str]
    boxes_in_source: list[tuple[int, int, int, int]]
    skipped_empty: int
    suspicious: list[str]


def _filename_for(idx: int, custom_names: list[str] | None, frame_prefix: str | None,
                  rows: int, cols: int) -> str:
    if custom_names and rows * cols == len(custom_names):
        return f"{custom_names[idx]}.png"
    if custom_names and rows > 1 and cols > 1 and len(custom_names) == rows:
        # 행=캐릭터, 열=프레임 → name_fN.png
        r, c = divmod(idx, cols)
        return f"{custom_names[r]}_f{c + 1}.png"
    if frame_prefix and rows == 1:
        return f"{frame_prefix}_f{idx + 1}.png"
    return f"sprite_{idx:03d}.png"


def extract_grid(
    img: Image.Image,
    rows: int,
    cols: int,
    bg: BgInfo,
    padding: int,
    resize: int | None,
    bottom_align: bool,
    align_per_row: bool,
    custom_names: list[str] | None,
    frame_prefix: str | None,
) -> ExtractResult:
    arr = np.array(img.convert("RGBA"))
    cleaned = flood_fill_bg(arr, bg)

    cells = slice_grid(cleaned, rows, cols)
    h, w = arr.shape[:2]
    cell_h = h // rows
    cell_w = w // cols

    sprites: list[Image.Image | None] = [None] * len(cells)
    src_boxes: list[tuple[int, int, int, int]] = []
    skipped = 0
    suspicious: list[str] = []

    # row별 bottom-align을 위해 행 단위 max h/w 측정
    per_cell_bbox: list[tuple[int, int, int, int] | None] = []
    per_cell_crop: list[np.ndarray | None] = []
    for cell in cells:
        bb = bbox_of_alpha(cell)
        per_cell_bbox.append(bb)
        if bb is None:
            per_cell_crop.append(None)
            continue
        per_cell_crop.append(crop_with_padding(cell, bb, padding))

    if align_per_row and rows > 1:
        # 각 행별로 max 폭/높이 계산해 정렬
        for r in range(rows):
            row_crops = [per_cell_crop[r * cols + c] for c in range(cols)]
            max_w = max((c.shape[1] for c in row_crops if c is not None), default=0)
            max_h = max((c.shape[0] for c in row_crops if c is not None), default=0)
            for c_i in range(cols):
                idx = r * cols + c_i
                cr = per_cell_crop[idx]
                if cr is None:
                    skipped += 1
                    continue
                # 행 max 캔버스에 bottom-center
                ch, cw = cr.shape[:2]
                canvas = np.zeros((max_h, max_w, 4), dtype=np.uint8)
                dx = (max_w - cw) // 2
                dy = (max_h - ch) if bottom_align else (max_h - ch) // 2
                canvas[dy:dy + ch, dx:dx + cw] = cr
                final_arr = (
                    resize_nearest(canvas, resize, bottom_align)
                    if resize else canvas
                )
                sprites[idx] = Image.fromarray(final_arr, mode="RGBA")
                bb = per_cell_bbox[idx]
                assert bb is not None
                # source bbox = 셀 좌상 + bbox
                row_y0 = r * cell_h
                col_x0 = c_i * cell_w
                src_boxes.append(
                    (col_x0 + bb[0], row_y0 + bb[1], col_x0 + bb[2], row_y0 + bb[3])
                )
    else:
        for idx, cr in enumerate(per_cell_crop):
            if cr is None:
                skipped += 1
                continue
            final_arr = resize_nearest(cr, resize, bottom_align) if resize else cr
            sprites[idx] = Image.fromarray(final_arr, mode="RGBA")
            bb = per_cell_bbox[idx]
            assert bb is not None
            r, c = divmod(idx, cols)
            row_y0 = r * cell_h
            col_x0 = c * cell_w
            src_boxes.append(
                (col_x0 + bb[0], row_y0 + bb[1], col_x0 + bb[2], row_y0 + bb[3])
            )

    names: list[str] = []
    final_sprites: list[Image.Image] = []
    for idx, sp in enumerate(sprites):
        if sp is None:
            continue
        nm = _filename_for(idx, custom_names, frame_prefix, rows, cols).removesuffix(".png")
        names.append(nm)
        final_sprites.append(sp)
        # 의심 스프라이트: 너무 작거나 거의 비어있음
        a = np.array(sp)[:, :, 3]
        if (a > 16).sum() < 16:
            suspicious.append(nm)

    return ExtractResult(
        sprites=final_sprites,
        names=names,
        boxes_in_source=src_boxes,
        skipped_empty=skipped,
        suspicious=suspicious,
    )


def extract_components(
    img: Image.Image,
    bg: BgInfo,
    padding: int,
    resize: int | None,
    bottom_align: bool,
    min_area: int,
    merge_gap: int,
    custom_names: list[str] | None,
    frame_prefix: str | None,
) -> ExtractResult:
    arr = np.array(img.convert("RGBA"))
    cleaned = flood_fill_bg(arr, bg)
    boxes = detect_components(cleaned, min_area=min_area)
    boxes = merge_close_boxes(boxes, merge_gap=merge_gap)
    # 좌→우, 위→아래 정렬
    boxes.sort(key=lambda b: (b[1] // 32, b[0]))

    sprites: list[Image.Image] = []
    names: list[str] = []
    suspicious: list[str] = []
    src_boxes: list[tuple[int, int, int, int]] = []

    for idx, (x0, y0, x1, y1) in enumerate(boxes):
        cr = cleaned[y0:y1 + 1, x0:x1 + 1]
        # padding은 source 안에서 확장
        cr = crop_with_padding(
            cleaned,
            (x0, y0, x1, y1),
            padding,
        )
        final_arr = resize_nearest(cr, resize, bottom_align) if resize else cr
        sp = Image.fromarray(final_arr, mode="RGBA")
        nm = _filename_for(idx, custom_names, frame_prefix, 1, len(boxes)).removesuffix(".png")
        sprites.append(sp)
        names.append(nm)
        src_boxes.append((x0, y0, x1, y1))
        a = np.array(sp)[:, :, 3]
        if (a > 16).sum() < 16:
            suspicious.append(nm)

    return ExtractResult(
        sprites=sprites,
        names=names,
        boxes_in_source=src_boxes,
        skipped_empty=0,
        suspicious=suspicious,
    )


def extract_single(
    img: Image.Image,
    bg: BgInfo,
    padding: int,
    resize: int | None,
    bottom_align: bool,
    custom_name: str | None,
) -> ExtractResult:
    arr = np.array(img.convert("RGBA"))
    cleaned = flood_fill_bg(arr, bg)
    bb = bbox_of_alpha(cleaned)
    if bb is None:
        return ExtractResult([], [], [], 1, [])
    cr = crop_with_padding(cleaned, bb, padding)
    final_arr = resize_nearest(cr, resize, bottom_align) if resize else cr
    sp = Image.fromarray(final_arr, mode="RGBA")
    nm = (custom_name or "sprite_000")
    return ExtractResult([sp], [nm], [bb], 0, [])


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Pixel-art sprite-sheet extractor.")
    ap.add_argument("--input", required=True, type=Path)
    ap.add_argument("--output", required=True, type=Path)
    ap.add_argument(
        "--mode",
        choices=("auto", "grid", "component", "single"),
        default="auto",
        help="auto: rows/cols 주면 grid, 아니면 component, single이면 한 장 누끼 정리.",
    )
    ap.add_argument("--rows", type=int, default=0)
    ap.add_argument("--cols", type=int, default=0)
    ap.add_argument("--padding", type=int, default=2)
    ap.add_argument("--tolerance", type=int, default=24,
                    help="배경 RGB 클러스터로부터의 허용 거리 (8~30).")
    ap.add_argument("--resize", type=int, default=0,
                    help="결과를 N×N 캔버스에 NEAREST 리사이즈. 0=리사이즈 안 함.")
    ap.add_argument("--no-bottom-align", action="store_true",
                    help="기본은 발 정렬(bottom-center). 끄면 정중앙.")
    ap.add_argument("--no-align-per-row", action="store_true",
                    help="grid 모드에서 행별 max 캔버스 정렬을 끔.")
    ap.add_argument("--names", default="",
                    help="콤마 구분 이름. rows*cols와 같으면 셀별, rows와 같으면 행별(_fN 접미사).")
    ap.add_argument("--frame-prefix", default="",
                    help="rows=1 시트에 사용할 prefix (예: 'apprentice' → apprentice_f1.png).")
    ap.add_argument("--min-area", type=int, default=64,
                    help="component 모드에서 무시할 최소 픽셀 수.")
    ap.add_argument("--merge-gap", type=int, default=2,
                    help="component 모드에서 인접 bbox 병합 거리.")
    return ap.parse_args()


def main() -> int:
    a = parse_args()
    src: Path = a.input
    out_dir: Path = a.output
    if not src.exists():
        print(f"[err] not found: {src}", file=sys.stderr)
        return 2
    out_dir.mkdir(parents=True, exist_ok=True)

    img = Image.open(src)
    img_rgba = img.convert("RGBA")
    bg = detect_background(img_rgba, a.tolerance)

    custom_names: list[str] | None = None
    if a.names.strip():
        custom_names = [s.strip() for s in a.names.split(",") if s.strip()]
    frame_prefix = a.frame_prefix.strip() or None

    mode = a.mode
    if mode == "auto":
        if a.rows > 0 and a.cols > 0:
            mode = "grid"
        else:
            mode = "component"

    if mode == "grid":
        if a.rows <= 0 or a.cols <= 0:
            print("[err] grid mode requires --rows and --cols > 0", file=sys.stderr)
            return 2
        result = extract_grid(
            img=img_rgba,
            rows=a.rows,
            cols=a.cols,
            bg=bg,
            padding=a.padding,
            resize=a.resize or None,
            bottom_align=not a.no_bottom_align,
            align_per_row=not a.no_align_per_row,
            custom_names=custom_names,
            frame_prefix=frame_prefix,
        )
    elif mode == "component":
        result = extract_components(
            img=img_rgba,
            bg=bg,
            padding=a.padding,
            resize=a.resize or None,
            bottom_align=not a.no_bottom_align,
            min_area=a.min_area,
            merge_gap=a.merge_gap,
            custom_names=custom_names,
            frame_prefix=frame_prefix,
        )
    elif mode == "single":
        result = extract_single(
            img=img_rgba,
            bg=bg,
            padding=a.padding,
            resize=a.resize or None,
            bottom_align=not a.no_bottom_align,
            custom_name=(custom_names[0] if custom_names else src.stem),
        )
    else:
        print(f"[err] unknown mode: {mode}", file=sys.stderr)
        return 2

    # 저장
    for sp, nm in zip(result.sprites, result.names):
        sp.save(out_dir / f"{nm}.png")

    # 디버그/검수 산출물
    arr_before = np.array(img_rgba)
    arr_after = flood_fill_bg(arr_before, bg)
    debug_mask = make_debug_mask(arr_before, arr_after)
    debug_mask.save(out_dir / "debug_mask.png")

    debug_boxes = make_debug_boxes(arr_before[:, :, :3], result.boxes_in_source)
    debug_boxes.save(out_dir / "debug_boxes.png")

    if result.sprites:
        contact = make_contact_sheet(result.sprites, result.names, cell=max(64, (a.resize or 64)))
        contact.save(out_dir / "contact_sheet.png")

    report = [
        f"# extraction_report — {src.name}",
        "",
        f"- input: `{src}`",
        f"- output dir: `{out_dir}`",
        f"- input size: {img_rgba.size[0]}×{img_rgba.size[1]}",
        f"- alpha used: {bg.used_alpha}",
        f"- bg colors: {bg.bg_colors if not bg.used_alpha else 'n/a'}",
        f"- tolerance: {bg.tolerance}",
        f"- mode: {mode}",
        f"- rows×cols: {a.rows}×{a.cols}" if mode == "grid" else "",
        f"- saved sprites: {len(result.sprites)}",
        f"- skipped empty cells: {result.skipped_empty}",
        f"- suspicious (low alpha): {result.suspicious or 'none'}",
        f"- resize: {a.resize or 'off'} (NEAREST only)",
        f"- bottom-align: {not a.no_bottom_align}",
        f"- align-per-row: {not a.no_align_per_row}",
    ]
    (out_dir / "extraction_report.md").write_text("\n".join(s for s in report if s) + "\n", encoding="utf-8")

    # 머신용 요약
    (out_dir / "extraction_report.json").write_text(
        json.dumps(
            {
                "input": str(src),
                "output": str(out_dir),
                "size": list(img_rgba.size),
                "alpha_used": bg.used_alpha,
                "bg_colors": bg.bg_colors,
                "tolerance": bg.tolerance,
                "mode": mode,
                "rows": a.rows,
                "cols": a.cols,
                "saved": len(result.sprites),
                "skipped_empty": result.skipped_empty,
                "suspicious": result.suspicious,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        f"[ok] {src.name}: saved={len(result.sprites)} skipped={result.skipped_empty} "
        f"suspicious={len(result.suspicious)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
