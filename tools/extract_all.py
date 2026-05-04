"""
extract_all.py — 모든 maowang-defense 에셋을 한 번에 재추출.

사용:
  python tools/extract_all.py                      # 전부
  python tools/extract_all.py --only enemies       # 적 시트만
  python tools/extract_all.py --only heroes        # 영웅 시트만
  python tools/extract_all.py --only standalone    # 단일 PNG만
  python tools/extract_all.py --apply              # 추출 결과를 public/sprites/ 로 복사

추출 흐름은 tools/extract_sprites.py 의 함수를 직접 호출.
재추출 결과는 assets/extracted/<group>/ 에 저장됨.
--apply 시 32x32 cleaned PNG를 public/sprites/ 로 덮어쓰기 전,
원본은 public/sprites/.backup_orig/ 로 복사.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image

from extract_sprites import (
    detect_background,
    extract_grid,
    extract_single,
    make_contact_sheet,
    make_debug_boxes,
    make_debug_mask,
    flood_fill_bg,
)
import numpy as np


ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "public" / "sprites"
OUT_BASE = ROOT / "assets" / "extracted"
BACKUP_DIR = SRC_DIR / ".backup_orig"


# === 적 시트: (sheet_file, rows, cols, names_per_row) ===
ENEMY_SHEETS: list[tuple[str, int, int, list[str]]] = [
    ("slime_sheet.png",  3, 4, ["slime",  "kslime", "slord"]),
    ("goblin_sheet.png", 3, 4, ["goblin", "gobw",   "ggen"]),
    ("witch_sheet.png",  3, 4, ["witch",  "dwitch", "awitch"]),
    ("orc_sheet.png",    3, 4, ["orc",    "orcb",   "owar"]),
    ("skel_sheet.png",   2, 4, ["skel",   "sknt"]),
    ("imp_sheet.png",    2, 4, ["imp",    "devil"]),
    ("lich_sheet.png",   2, 4, ["lich",   "dlich"]),
    ("mimic_sheet.png",  2, 4, ["mimic",  "gmimic"]),
    ("mino_sheet.png",   2, 4, ["mino",   "minok"]),
    ("zombie_sheet.png", 2, 4, ["zombie", "zomk"]),
]

# === 영웅 시트: 가로 4프레임 walk ===
HERO_SHEETS: list[str] = [
    "apprentice", "swordsman", "archer", "mage",
    "spear", "shield", "rogue", "healer",
]

# === 단일 PNG (이미 작거나 단일 캐릭터/UI) ===
# 누끼만 다시 정리, 사이즈는 보존.
STANDALONE_KEEP_SIZE: list[str] = [
    # 타일 16×16
    "tile_stone.png", "tile_dirt.png", "tile_grass.png",
    "tile_lava_f1.png", "tile_lava_f2.png",
    "tile_magic_f1.png", "tile_magic_f2.png", "tile_magic_f3.png", "tile_magic_f4.png",
    # 이펙트
    "hit_physical_f1.png", "hit_physical_f2.png", "hit_physical_f3.png",
    "hit_fire_f1.png", "hit_fire_f2.png", "hit_fire_f3.png",
    "hit_ice_f1.png", "hit_ice_f2.png", "hit_ice_f3.png",
    "hit_dark_f1.png", "hit_dark_f2.png", "hit_dark_f3.png",
    "summon_common_f1.png", "summon_common_f2.png", "summon_common_f3.png",
    "summon_common_f4.png", "summon_common_f5.png", "summon_common_f6.png",
    "summon_rare_f1.png", "summon_rare_f2.png", "summon_rare_f3.png",
    "summon_rare_f4.png", "summon_rare_f5.png", "summon_rare_f6.png",
    "summon_epic_f1.png", "summon_epic_f2.png", "summon_epic_f3.png",
    "summon_epic_f4.png", "summon_epic_f5.png", "summon_epic_f6.png",
    "summon_legend_f1.png", "summon_legend_f2.png", "summon_legend_f3.png",
    "summon_legend_f4.png", "summon_legend_f5.png", "summon_legend_f6.png",
    "evolve_f1.png", "evolve_f2.png", "evolve_f3.png", "evolve_f4.png",
    "evolve_f5.png", "evolve_f6.png", "evolve_f7.png", "evolve_f8.png",
    "death_ally_f1.png", "death_ally_f2.png", "death_ally_f3.png",
    "death_enemy_f1.png", "death_enemy_f2.png", "death_enemy_f3.png",
    # HUD
    "hud_bar_hp_frame.png", "hud_bar_mp_frame.png",
    "hud_kill_badge.png", "hud_wave_boss.png", "hud_wave_normal.png",
    # 카드/버튼 (이미 RGBA지만 일관성 차원에서 한 번 더)
    "card_back_f1.png", "card_back_f2.png", "card_back_f3.png", "card_back_f4.png",
    "card_flip_f1.png", "card_flip_f2.png", "card_flip_f3.png",
    "card_flip_f4.png", "card_flip_f5.png",
    "card_unseal_f1.png", "card_unseal_f2.png", "card_unseal_f3.png",
    "card_unseal_f4.png", "card_unseal_f5.png", "card_unseal_f6.png",
    "card_frame_common.png", "card_frame_uncommon.png", "card_frame_rare.png",
    "card_frame_epic.png", "card_frame_legendary.png",
    "btn_reveal_idle.png", "btn_reveal_pressed.png", "btn_reveal_disabled.png",
    "btn_ulti_charging_0.png", "btn_ulti_charging_50.png", "btn_ulti_pressed.png",
    "btn_ulti_ready.png",
    "btn_ulti_pulse_f1.png", "btn_ulti_pulse_f2.png", "btn_ulti_pulse_f3.png",
    "btn_ulti_pulse_f4.png", "btn_ulti_pulse_f5.png", "btn_ulti_pulse_f6.png",
    "btn_ulti_pulse_f7.png", "btn_ulti_pulse_f8.png",
    # 메뉴/로고 (RGBA, 큰 사이즈 보존)
    "logo_main.png",
    "menu_plate_dark.png", "menu_plate_disabled.png", "menu_plate_primary.png",
]


def _save_artifacts(out_dir: Path, sprites, names, src_arr_before, src_arr_after, src_boxes):
    out_dir.mkdir(parents=True, exist_ok=True)
    for sp, nm in zip(sprites, names):
        sp.save(out_dir / f"{nm}.png")
    if sprites:
        cell = max(64, max(s.width for s in sprites))
        contact = make_contact_sheet(sprites, names, cell=cell)
        contact.save(out_dir / "contact_sheet.png")
    Image.fromarray(src_arr_before[:, :, :3], mode="RGB").save(out_dir / "_orig.png")
    make_debug_mask(src_arr_before, src_arr_after).save(out_dir / "debug_mask.png")
    make_debug_boxes(src_arr_before[:, :, :3], src_boxes).save(out_dir / "debug_boxes.png")


def _process_grid(sheet_path: Path, rows: int, cols: int,
                  names_per_row: list[str], resize: int, tolerance: int,
                  out_dir: Path, frame_prefix: str | None = None):
    img = Image.open(sheet_path).convert("RGBA")
    bg = detect_background(img, tolerance)
    custom_names = names_per_row if names_per_row else None
    result = extract_grid(
        img=img,
        rows=rows,
        cols=cols,
        bg=bg,
        padding=1,
        resize=resize,
        bottom_align=True,
        align_per_row=True,
        custom_names=custom_names,
        frame_prefix=frame_prefix,
    )
    arr_before = np.array(img)
    arr_after = flood_fill_bg(arr_before, bg)
    _save_artifacts(out_dir, result.sprites, result.names, arr_before, arr_after,
                    result.boxes_in_source)
    return result


def process_enemies(resize: int, tolerance: int):
    print("\n=== enemies ===")
    for sheet, rows, cols, names in ENEMY_SHEETS:
        sp = SRC_DIR / sheet
        if not sp.exists():
            print(f"  [skip] {sheet} (missing)")
            continue
        out = OUT_BASE / sp.stem
        result = _process_grid(sp, rows, cols, names, resize, tolerance, out)
        print(f"  [ok] {sheet}: {len(result.sprites)} sprites → {out.relative_to(ROOT)}")


def process_heroes(resize: int, tolerance: int):
    print("\n=== heroes ===")
    for hero in HERO_SHEETS:
        sp = SRC_DIR / f"{hero}.png"
        if not sp.exists():
            print(f"  [skip] {hero}.png (missing)")
            continue
        out = OUT_BASE / hero
        result = _process_grid(sp, 1, 4, [], resize, tolerance, out, frame_prefix=hero)
        print(f"  [ok] {hero}.png: {len(result.sprites)} frames → {out.relative_to(ROOT)}")


def process_standalone(tolerance: int):
    """단일 PNG: 누끼만 다시. 사이즈/구도 보존 (resize=0)."""
    print("\n=== standalone (keep size) ===")
    out_dir = OUT_BASE / "_standalone"
    out_dir.mkdir(parents=True, exist_ok=True)
    cleaned_count = 0
    skipped_alpha = 0
    for fn in STANDALONE_KEEP_SIZE:
        sp = SRC_DIR / fn
        if not sp.exists():
            print(f"  [skip] {fn} (missing)")
            continue
        img = Image.open(sp).convert("RGBA")
        # 작은 이펙트 PNG는 이미 alpha면 그냥 복사
        bg = detect_background(img, tolerance)
        arr_before = np.array(img)
        if bg.used_alpha:
            # 이미 깨끗 → 원본 유지 (안전)
            (out_dir / fn).write_bytes(sp.read_bytes())
            skipped_alpha += 1
            continue
        # 누끼만, 크기 보존, bbox crop은 하지 않음 (구도 유지)
        arr_after = flood_fill_bg(arr_before, bg)
        Image.fromarray(arr_after, mode="RGBA").save(out_dir / fn)
        cleaned_count += 1
    print(f"  cleaned: {cleaned_count}, kept-as-is(alpha already clean): {skipped_alpha}")


def apply_to_public():
    """추출 결과를 public/sprites/ 로 복사. 원본은 .backup_orig/ 로 보존."""
    print("\n=== apply to public/sprites/ ===")
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    # 1) 적/영웅 — 32x32 cleaned PNG
    sprite_files: list[Path] = []
    for grp_dir in OUT_BASE.iterdir():
        if not grp_dir.is_dir():
            continue
        if grp_dir.name == "_standalone":
            for f in grp_dir.glob("*.png"):
                sprite_files.append(f)
            continue
        for f in grp_dir.glob("*.png"):
            if f.name.startswith("debug_") or f.name.startswith("contact_") or f.name == "_orig.png":
                continue
            if f.name.startswith("extraction_report"):
                continue
            sprite_files.append(f)

    copied = 0
    backed_up = 0
    for f in sprite_files:
        target = SRC_DIR / f.name
        if target.exists():
            backup = BACKUP_DIR / f.name
            if not backup.exists():
                shutil.copy2(target, backup)
                backed_up += 1
        shutil.copy2(f, target)
        copied += 1
    print(f"  copied: {copied}, backups: {backed_up} → {BACKUP_DIR.relative_to(ROOT)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=("enemies", "heroes", "standalone", "all"), default="all")
    ap.add_argument("--apply", action="store_true",
                    help="추출 결과를 public/sprites/ 로 덮어쓰기 (원본은 .backup_orig/ 로 보존).")
    ap.add_argument("--resize", type=int, default=32)
    ap.add_argument("--tolerance", type=int, default=24)
    args = ap.parse_args()

    if args.only in ("enemies", "all"):
        process_enemies(args.resize, args.tolerance)
    if args.only in ("heroes", "all"):
        process_heroes(args.resize, args.tolerance)
    if args.only in ("standalone", "all"):
        process_standalone(args.tolerance)
    if args.apply:
        apply_to_public()


if __name__ == "__main__":
    main()
