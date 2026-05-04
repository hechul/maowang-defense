"""
누끼 따기 — 24bit RGB 흰 배경 PNG → RGBA + 외곽 flood-fill + edge softening
사용: python scripts/strip_bg.py public/sprites/logo_main.png ...
대체: 원본을 _orig.png로 백업하고 새 PNG로 덮어쓰기.
"""
import sys
from collections import deque
from PIL import Image
from pathlib import Path


def strip_white_bg(path: Path):
    img = Image.open(path).convert('RGBA')
    w, h = img.size
    px = img.load()

    def bg_score(r, g, b):
        sat = max(r, g, b) - min(r, g, b)
        luma = (r + g + b) / 3
        if sat > 22:
            return 0.0
        if luma < 175:
            return 0.0
        return max(0.0, min(1.0, (luma - 175) / 75.0))

    # 1) 외곽 flood-fill — bg_score >= 0.7 만 시드
    visited = [[False] * h for _ in range(w)]
    q = deque()

    def is_seed(x, y):
        r, g, b, a = px[x, y]
        return a > 0 and bg_score(r, g, b) >= 0.7

    for x in range(w):
        for y in (0, h - 1):
            if not visited[x][y] and is_seed(x, y):
                visited[x][y] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not visited[x][y] and is_seed(x, y):
                visited[x][y] = True
                q.append((x, y))

    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                if is_seed(nx, ny):
                    visited[nx][ny] = True
                    q.append((nx, ny))

    # 2) Multi-pass edge softening (4 pass)
    for _ in range(4):
        snap = [[px[x, y][3] for y in range(h)] for x in range(w)]
        for y in range(h):
            for x in range(w):
                a0 = snap[x][y]
                if a0 < 8:
                    continue
                near_trans = False
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and snap[nx][ny] < 32:
                        near_trans = True
                        break
                if not near_trans:
                    continue
                r, g, b, _ = px[x, y]
                score = bg_score(r, g, b)
                if score <= 0:
                    continue
                new_a = int(a0 * (1 - score))
                if new_a < a0:
                    px[x, y] = (r, g, b, new_a)

    backup = path.with_name(path.stem + '_orig.png')
    if not backup.exists():
        Image.open(path).save(backup)
    img.save(path)
    print(f'[ok] {path.name}: stripped → RGBA')


if __name__ == '__main__':
    for arg in sys.argv[1:]:
        p = Path(arg)
        if not p.exists():
            print(f'[skip] not found: {p}')
            continue
        strip_white_bg(p)
