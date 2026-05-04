"""
apply_v2_assets.py — V2 의뢰 산출물(asset/ ChatGPT 이미지) → public/sprites/ 매핑/배치.

핵심 안전성 원칙:
  1. 파일별 개별 파라미터 — 절대 일괄 동일 처리 안 함
  2. 흰색 보존 — extract_sprites.flood_fill_bg(BFS edge-seeded)는 외곽에서
     닿지 않는 캐릭터 내부 흰색을 절대 제거하지 않음
  3. 도트 영역 겹침 방지:
     - 그리드 분할 시 각 셀별 bbox + 행별 max 캔버스 정렬 (align_per_row)
     - 매 셀마다 own crop_with_padding — 옆 셀 픽셀이 침범하지 않음
     - NEAREST resize 만 사용 (안티앨리어싱 0)
  4. 비정사각 비율 (마왕성 96×128) 별도 처리 — 강제 정사각 캔버스 금지
  5. 미분류 그룹E (10_42_00 4개)는 assets/extracted/unmapped/ 으로 분리
     사용자 시각 검수 후 매핑 결정

산출:
  - public/sprites/<id>.png — 게임용 최종 sprite
  - assets/extracted/v2/<group>/ — 그룹별 디버그 산출물 (mask/boxes/contact)
  - assets/extracted/v2/_apply_report.md — 적용 리포트
"""
from __future__ import annotations

import shutil
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image

# extract_sprites 의 안전 함수들 직접 import
sys.path.insert(0, str(Path(__file__).parent))
from extract_sprites import (
    detect_background, flood_fill_bg, slice_grid, bbox_of_alpha,
    crop_with_padding, resize_nearest, make_contact_sheet,
    make_debug_mask, make_debug_boxes, detect_components,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ASSET_DIR = PROJECT_ROOT.parent / "asset"
SPRITES_DIR = PROJECT_ROOT / "public" / "sprites"
EXTRACT_DIR = PROJECT_ROOT / "assets" / "extracted" / "v2"


# ---------------------------------------------------------------------------
# Manifest — 파일별 정확한 매핑
# ---------------------------------------------------------------------------

@dataclass
class V2Item:
    """1개 입력 파일에 대한 처리 명세."""
    src_filename: str          # asset/ 안의 파일명
    group: str                 # 그룹 이름 (debug 폴더 분리용)
    mode: str                  # 'single' | 'grid' | 'castle' (special) | 'unmapped'
    target_ids: list[str]      # 출력 sprite id (확장자 없음). single이면 1개, grid면 N개
    rows: int = 1
    cols: int = 1
    resize: int = 0            # NEAREST 정사각 리사이즈. 0=리사이즈 안 함
    resize_w: int = 0          # 비정사각 — castle 전용
    resize_h: int = 0
    bottom_align: bool = True  # 캐릭터는 발 정렬, 떠다니는 마왕은 False
    padding: int = 2
    tolerance: int = 30        # 마젠타 #FF00FF 배경 → tolerance=30 충분
    notes: str = ""


MANIFEST: list[V2Item] = [
    # ── 그룹 A: 마왕 4 tier (의뢰 2) ──────────────────────────────
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_08_25 (1).png",
        group="A_demon_lord",
        mode="single",
        target_ids=["demon_lord_48"],
        resize=48,
        bottom_align=False,  # 떠다니는 마스코트 — 정중앙 정렬 (코드에서 y-sh+8로 그려짐)
        notes="마왕 base — 보라 후드 + 빨간 눈, 액센트 없음",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_08_25 (4).png",
        group="A_demon_lord",
        mode="single",
        target_ids=["demon_lord_48_crowned"],
        resize=48,
        bottom_align=False,
        notes="마왕 crowned — 작은 황금 왕관 (W25+)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_08_25 (3).png",
        group="A_demon_lord",
        mode="single",
        target_ids=["demon_lord_48_lord"],
        resize=48,
        bottom_align=False,
        notes="마왕 lord — 큰 왕관 + 황금 갑옷 + 어깨 가시 (W50+)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_08_25 (2).png",
        group="A_demon_lord",
        mode="single",
        target_ids=["demon_lord_48_mythic"],
        resize=48,
        bottom_align=False,
        notes="마왕 mythic — 청록 후광 + 별빛 망토 + 양손 빛 (W100+)",
    ),

    # ── 그룹 B: 마왕성 2종 — 비정사각 96×128 ────────────────────
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_08_26 (5).png",
        group="B_castle",
        mode="castle",
        target_ids=["castle_main"],
        resize_w=96,
        resize_h=128,
        bottom_align=True,  # 마왕성은 ground line 정렬 필요
        notes="마왕성 main — 첨탑 3 + 빨간 깃발 + 마법진",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_08_26 (6).png",
        group="B_castle",
        mode="castle",
        target_ids=["castle_destroyed"],
        resize_w=96,
        resize_h=128,
        bottom_align=True,
        notes="마왕성 destroyed — 좌측 첨탑 부서짐 + 균열 + 검은 연기",
    ),

    # ── 그룹 C: 보스 5종 64×64 (의뢰 1, 가로 5열 시트) ──────────
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_09_34.png",
        group="C_bosses",
        mode="grid",
        rows=1, cols=5,
        target_ids=["captain_64", "archmage_64", "saint_64", "king_64", "priest_64"],
        resize=64,
        bottom_align=True,
        padding=4,  # 보스끼리 가로 간격 충분 — 침범 방지
        notes="보스 5종 — captain/archmage/saint/king/priest",
    ),

    # ── 그룹 D: 시즌 보스 4종 (의뢰 4) ──────────────────────────
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_10_26 (1).png",
        group="D_seasonal_bosses",
        mode="single",
        target_ids=["sb_sakura_envoy"],
        resize=64,
        bottom_align=True,
        notes="시즌보스 봄 — 분홍 기모노 + 벚꽃 칼",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_10_26 (2).png",
        group="D_seasonal_bosses",
        mode="single",
        target_ids=["sb_flame_priest"],
        resize=64,
        bottom_align=True,
        notes="시즌보스 여름 — 빨간 로브 + 불타는 십자가",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_10_26 (3).png",
        group="D_seasonal_bosses",
        mode="single",
        target_ids=["sb_harvest_envoy"],
        resize=64,
        bottom_align=True,
        notes="시즌보스 가을 — 밀짚 모자 + 거대 낫",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_10_27 (4).png",
        group="D_seasonal_bosses",
        mode="single",
        target_ids=["sb_first_demon_shadow"],
        resize=64,
        bottom_align=True,
        notes="시즌보스 겨울 — 보라 후드 + 빨간 눈 + 그림자 검",
    ),

    # ── 그룹 E (BONUS): 6×4 walk cycle 시트 — 향후 walk 애니메이션 ──
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오전 10_40_04.png",
        group="E_walk_cycle_bonus",
        mode="grid",
        rows=6, cols=4,
        # 6행 × 4프레임 — 행마다 캐릭터, 열마다 프레임
        # 첫 4 = captain_walk, 다음 4 = archmage_walk, ...
        target_ids=[
            "captain_walk_f1", "captain_walk_f2", "captain_walk_f3", "captain_walk_f4",
            "archmage_walk_f1", "archmage_walk_f2", "archmage_walk_f3", "archmage_walk_f4",
            "saint_walk_f1", "saint_walk_f2", "saint_walk_f3", "saint_walk_f4",
            "king_walk_f1", "king_walk_f2", "king_walk_f3", "king_walk_f4",
            "priest_walk_f1", "priest_walk_f2", "priest_walk_f3", "priest_walk_f4",
            "demon_lord_48_walk_f1", "demon_lord_48_walk_f2",
            "demon_lord_48_walk_f3", "demon_lord_48_walk_f4",
        ],
        resize=64,
        bottom_align=True,
        padding=4,
        notes="보너스 — 보스5+마왕 walk 4프레임 (현재 미연결, 향후 애니메이션용 별도 보관)",
    ),

    # ── 그룹 F: 미분류 (10_42_00) — 사용자 의도 확인 후 매핑 ───────
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오전 10_42_00 (1).png",
        group="F_unmapped",
        mode="unmapped",
        target_ids=["unmapped_orb_purple"],
        resize=32,
        bottom_align=False,
        notes="추정: relic_oracle 강화 / fuse_prophecy — 사용자 확인 필요",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오전 10_42_00 (2).png",
        group="F_unmapped",
        mode="unmapped",
        target_ids=["unmapped_arrow"],
        resize=32,
        bottom_align=False,
        notes="추정: archer 무기 / projectile — 사용자 확인 필요",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오전 10_42_00 (3).png",
        group="F_unmapped",
        mode="unmapped",
        target_ids=["unmapped_fire_orb"],
        resize=32,
        bottom_align=False,
        notes="추정: relic_inferno / 화염 이펙트 — 사용자 확인 필요",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오전 10_42_00 (4).png",
        group="F_unmapped",
        mode="unmapped",
        target_ids=["unmapped_gold_star"],
        resize=32,
        bottom_align=False,
        notes="추정: secret_jackpot_legend / luckySummon — 사용자 확인 필요",
    ),

    # ── 그룹 G: 슬라임 라인 attack 3프레임 (의뢰 5) ───────────────
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_15_57 (1).png",
        group="G_slime_anim",
        mode="grid",
        rows=1, cols=3,
        target_ids=["slime_attack_f1", "slime_attack_f2", "slime_attack_f3"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="slime attack — anticipation/strike(white flash)/recovery",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_15_57 (2).png",
        group="G_slime_anim",
        mode="grid",
        rows=1, cols=3,
        target_ids=["kslime_attack_f1", "kslime_attack_f2", "kslime_attack_f3"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="kslime attack — 왕관 슬라임",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_15_57 (3).png",
        group="G_slime_anim",
        mode="grid",
        rows=1, cols=3,
        target_ids=["slord_attack_f1", "slord_attack_f2", "slord_attack_f3"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="slord attack — 망토 슬라임 군주",
    ),

    # ── 그룹 H: 슬라임 라인 hit/death (의뢰 5) ─────────────────
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_15_58 (4).png",
        group="H_slime_hit_death",
        mode="grid",
        rows=1, cols=2,
        target_ids=["kslime_hit_f1", "kslime_hit_f2"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="kslime hit — 흰 플래시 + 일반",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_15_58 (5).png",
        group="H_slime_hit_death",
        mode="grid",
        rows=1, cols=3,
        target_ids=["kslime_death_f1", "kslime_death_f2", "kslime_death_f3"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="kslime death — lean/누움/분해",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_15_58 (6).png",
        group="H_slime_hit_death",
        mode="grid",
        rows=1, cols=2,
        target_ids=["slime_hit_f1", "slime_hit_f2"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="slime hit — 흰 플래시 + 일반",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_15_58 (7).png",
        group="H_slime_hit_death",
        mode="grid",
        rows=1, cols=3,
        target_ids=["slime_death_f1", "slime_death_f2", "slime_death_f3"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="slime death — lean/누움/분해(왕관 빠짐)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_15_58 (8).png",
        group="H_slime_hit_death",
        mode="grid",
        rows=1, cols=2,
        target_ids=["slord_hit_f1", "slord_hit_f2"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="slord hit — 망토+더블왕관 흰 플래시",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_15_58 (9).png",
        group="H_slime_hit_death",
        mode="grid",
        rows=1, cols=3,
        target_ids=["slord_death_f1", "slord_death_f2", "slord_death_f3"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="slord death — 망토 슬라임 군주 lean/누움/분해",
    ),

    # ── 그룹 I: goblin / apprentice / lich 애니메이션 (의뢰 5) ───
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_21_06 (1).png",
        group="I_goblin_apprentice_lich",
        mode="grid",
        rows=1, cols=3,
        target_ids=["goblin_attack_f1", "goblin_attack_f2", "goblin_attack_f3"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="goblin attack — 단도 휘두름",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_21_06 (2).png",
        group="I_goblin_apprentice_lich",
        mode="grid",
        rows=1, cols=2,
        target_ids=["apprentice_alt_hit_f1", "apprentice_alt_hit_f2"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="apprentice hit (alt 시도) — 07_22_29 정식 옆 보너스",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_21_06 (3).png",
        group="I_goblin_apprentice_lich",
        mode="grid",
        rows=1, cols=3,
        target_ids=["apprentice_alt_death_f1", "apprentice_alt_death_f2", "apprentice_alt_death_f3"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="apprentice death (alt 시도)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_21_07 (4).png",
        group="I_goblin_apprentice_lich",
        mode="grid",
        rows=1, cols=3,
        target_ids=["lich_attack_f1", "lich_attack_f2", "lich_attack_f3"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="lich attack — 지팡이 마법진→발사",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_21_07 (5).png",
        group="I_goblin_apprentice_lich",
        mode="grid",
        rows=1, cols=2,
        target_ids=["goblin_hit_f1", "goblin_hit_f2"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="goblin hit — 흰 플래시 + 녹색 고블린",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_21_07 (6).png",
        group="I_goblin_apprentice_lich",
        mode="grid",
        rows=1, cols=3,
        target_ids=["goblin_death_f1", "goblin_death_f2", "goblin_death_f3"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="goblin death — lean/누움/분해(녹색 입자)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_21_07 (7).png",
        group="I_goblin_apprentice_lich",
        mode="grid",
        rows=1, cols=3,
        target_ids=["apprentice_alt_attack_f1", "apprentice_alt_attack_f2", "apprentice_alt_attack_f3"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="apprentice attack (alt 시도) — 검 위→앞 베기",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_21_07 (8).png",
        group="I_goblin_apprentice_lich",
        mode="grid",
        rows=1, cols=2,
        target_ids=["lich_hit_f1", "lich_hit_f2"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="lich hit — 흰 플래시 + 보라 후드 해골",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_21_07 (9).png",
        group="I_goblin_apprentice_lich",
        mode="grid",
        rows=1, cols=3,
        target_ids=["lich_death_f1", "lich_death_f2", "lich_death_f3"],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="lich death — 해골 lean/누움/보라 영혼 입자",
    ),

    # ── 그룹 J: apprentice/swordsman/mage 통합 시트 (의뢰 5 정식) ──
    # 1장에 3행 (캐릭터) × 컬럼 [라벨 1 + attack 3 + hit 2 + death 3] 배치.
    # special_combined 모드 — 행별로 영역 비례 분할.
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_22_29.png",
        group="J_combined_anim_sheet",
        mode="combined_anim",  # 커스텀 모드 (아래 핸들러)
        target_ids=[
            "apprentice_attack_f1", "apprentice_attack_f2", "apprentice_attack_f3",
            "apprentice_hit_f1", "apprentice_hit_f2",
            "apprentice_death_f1", "apprentice_death_f2", "apprentice_death_f3",
            "swordsman_attack_f1", "swordsman_attack_f2", "swordsman_attack_f3",
            "swordsman_hit_f1", "swordsman_hit_f2",
            "swordsman_death_f1", "swordsman_death_f2", "swordsman_death_f3",
            "mage_attack_f1", "mage_attack_f2", "mage_attack_f3",
            "mage_hit_f1", "mage_hit_f2",
            "mage_death_f1", "mage_death_f2", "mage_death_f3",
        ],
        resize=32,
        bottom_align=True,
        padding=4,
        notes="apprentice/swordsman/mage 통합 시트 — 3행 × (attack 3 + hit 2 + death 3) 8셀",
    ),

    # ── 그룹 K: 유물 진화 10종 (의뢰 6) ─────────────────────
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_25_09 (1).png",
        group="K_relic_fusions",
        mode="single",
        target_ids=["relic_fuse_necropolis"],
        resize=32,
        bottom_align=False,
        notes="망령의 묘원 — 무덤 + 영혼 + 황금 테두리",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_25_09 (2).png",
        group="K_relic_fusions",
        mode="single",
        target_ids=["relic_fuse_solar_crown"],
        resize=32,
        bottom_align=False,
        notes="불타는 왕관 — 황금 왕관 + 화염",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_25_09 (3).png",
        group="K_relic_fusions",
        mode="single",
        target_ids=["relic_fuse_fortress"],
        resize=32,
        bottom_align=False,
        notes="강철 요새 — 청회색 방패 + 청 십자",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_25_09 (4).png",
        group="K_relic_fusions",
        mode="single",
        target_ids=["relic_fuse_bloodmask"],
        resize=32,
        bottom_align=False,
        notes="피의 가면 — 빨간 악마 가면 + 송곳니",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_25_09 (5).png",
        group="K_relic_fusions",
        mode="single",
        target_ids=["relic_fuse_prophecy"],
        resize=32,
        bottom_align=False,
        notes="예언의 흐름 — 보라 수정구슬 + 별빛",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_25_09 (6).png",
        group="K_relic_fusions",
        mode="single",
        target_ids=["relic_fuse_midas"],
        resize=32,
        bottom_align=False,
        notes="미다스의 손 — 황금 손 + 코인",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_25_10 (7).png",
        group="K_relic_fusions",
        mode="single",
        target_ids=["relic_fuse_eternal_pact"],
        resize=32,
        bottom_align=False,
        notes="영원의 계약 — 양피지 + 모래시계 + 봉인",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_25_10 (8).png",
        group="K_relic_fusions",
        mode="single",
        target_ids=["relic_fuse_eternal_winter"],
        resize=32,
        bottom_align=False,
        notes="영원의 겨울 — 푸른 결정 + 눈송이",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_25_10 (9).png",
        group="K_relic_fusions",
        mode="single",
        target_ids=["relic_fuse_venomfang"],
        resize=32,
        bottom_align=False,
        notes="독사의 송곳니 — 녹색 송곳니 1쌍 + 독액",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_25_10 (10).png",
        group="K_relic_fusions",
        mode="single",
        target_ids=["relic_fuse_karma"],
        resize=32,
        bottom_align=False,
        notes="운명의 인과 — 음양 + 보라 소용돌이",
    ),

    # ── 그룹 L: 숨겨진 시너지 발견 6종 (의뢰 7) ─────────────────
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_28_30 (1).png",
        group="L_hidden_synergies",
        mode="single",
        target_ids=["hidden_synergy_arcane_circle"],
        resize=32,
        bottom_align=False,
        notes="비밀 마법진 — 자색 6각형 룬 (slime+witch+mimic)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_28_31 (2).png",
        group="L_hidden_synergies",
        mode="single",
        target_ids=["hidden_synergy_dark_pact"],
        resize=32,
        bottom_align=False,
        notes="어둠의 계약 — 검은 박쥐 + 빨간 룬 (lich+imp+zombie)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_28_31 (3).png",
        group="L_hidden_synergies",
        mode="single",
        target_ids=["hidden_synergy_kings_guard"],
        resize=32,
        bottom_align=False,
        notes="왕의 호위대 — 황금 별 3개 (slord+ggen+orcb)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_28_31 (4).png",
        group="L_hidden_synergies",
        mode="single",
        target_ids=["hidden_synergy_chaos_lab"],
        resize=32,
        bottom_align=False,
        notes="혼돈의 실험실 — 무지개 소용돌이 (awitch+imp+mimic)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_28_31 (5).png",
        group="L_hidden_synergies",
        mode="single",
        target_ids=["hidden_synergy_undying_legion"],
        resize=32,
        bottom_align=False,
        notes="불사의 군단 — 흰 해골 3개 + 녹색 영혼 (skel+zombie+lich)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_28_31 (6).png",
        group="L_hidden_synergies",
        mode="single",
        target_ids=["hidden_synergy_beast_horde"],
        resize=32,
        bottom_align=False,
        notes="야수의 무리 — 발자국 + 잎 (orc+mino+goblin)",
    ),

    # ── 그룹 M: 숨겨진 시너지 미발견 (회색) 6종 (의뢰 7 locked) ───
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_30_57 (1).png",
        group="M_hidden_synergies_locked",
        mode="single",
        target_ids=["hidden_synergy_dark_pact_locked"],
        resize=32,
        bottom_align=False,
        notes="dark_pact 회색 — 검은 박쥐 회색 silhouette",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_30_57 (2).png",
        group="M_hidden_synergies_locked",
        mode="single",
        target_ids=["hidden_synergy_arcane_circle_locked"],
        resize=32,
        bottom_align=False,
        notes="arcane_circle 회색 — 6각 룬 회색",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_30_57 (3).png",
        group="M_hidden_synergies_locked",
        mode="single",
        target_ids=["hidden_synergy_beast_horde_locked"],
        resize=32,
        bottom_align=False,
        notes="beast_horde 회색 — 발자국 회색",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_30_57 (4).png",
        group="M_hidden_synergies_locked",
        mode="single",
        target_ids=["hidden_synergy_undying_legion_locked"],
        resize=32,
        bottom_align=False,
        notes="undying_legion 회색 — 해골 3개 회색",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_30_58 (5).png",
        group="M_hidden_synergies_locked",
        mode="single",
        target_ids=["hidden_synergy_chaos_lab_locked"],
        resize=32,
        bottom_align=False,
        notes="chaos_lab 회색 — 소용돌이 회색",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_30_58 (6).png",
        group="M_hidden_synergies_locked",
        mode="single",
        target_ids=["hidden_synergy_kings_guard_locked"],
        resize=32,
        bottom_align=False,
        notes="kings_guard 회색 — 별 3개 회색",
    ),

    # ── 그룹 N: 마왕 비밀 능력 6종 (의뢰 8) ───────────────────────
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_33_18 (1).png",
        group="N_demon_secrets",
        mode="single",
        target_ids=["secret_combo_master"],
        resize=32,
        bottom_align=False,
        notes="연쇄의 군주 — 빨간 불꽃 사슬 (50콤보)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_33_19 (2).png",
        group="N_demon_secrets",
        mode="single",
        target_ids=["secret_full_magic"],
        resize=32,
        bottom_align=False,
        notes="마법 학파의 정점 — 보라 5각 별 (마법 빌드 100%)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_33_19 (3).png",
        group="N_demon_secrets",
        mode="single",
        target_ids=["secret_jackpot_legend"],
        resize=32,
        bottom_align=False,
        notes="운명의 손길 — 황금 카드 3장 (트리플 5회)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_33_19 (4).png",
        group="N_demon_secrets",
        mode="single",
        target_ids=["secret_undying"],
        resize=32,
        bottom_align=False,
        notes="죽음의 너머 — 검은 두개골 + 보라 영혼 (50체 부활)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_33_19 (5).png",
        group="N_demon_secrets",
        mode="single",
        target_ids=["secret_centurion"],
        resize=32,
        bottom_align=False,
        notes="백 명의 손 — 황금 검 + 100 손들 (100처치)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_33_19 (6).png",
        group="N_demon_secrets",
        mode="single",
        target_ids=["secret_genesis"],
        resize=32,
        bottom_align=False,
        notes="창세의 발견자 — 우주 + 별빛 (숨겨진 시너지 6종)",
    ),

    # ── 그룹 O: PVP 등급 메달 7종 (의뢰 9) ─────────────────────
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_36_43 (1).png",
        group="O_pvp_tiers",
        mode="single",
        target_ids=["pvp_tier_bronze"],
        resize=24,
        bottom_align=False,
        notes="청동 — 검 1개",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_36_43 (2).png",
        group="O_pvp_tiers",
        mode="single",
        target_ids=["pvp_tier_silver"],
        resize=24,
        bottom_align=False,
        notes="은 — 검 2개 교차",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_36_43 (3).png",
        group="O_pvp_tiers",
        mode="single",
        target_ids=["pvp_tier_gold"],
        resize=24,
        bottom_align=False,
        notes="금 — 황금 화환 + 검 + 별",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_36_43 (4).png",
        group="O_pvp_tiers",
        mode="single",
        target_ids=["pvp_tier_platinum"],
        resize=24,
        bottom_align=False,
        notes="백금 — 청 다이아몬드형",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_36_43 (5).png",
        group="O_pvp_tiers",
        mode="single",
        target_ids=["pvp_tier_diamond"],
        resize=24,
        bottom_align=False,
        notes="다이아 — 보라 6각 별",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_36_43 (6).png",
        group="O_pvp_tiers",
        mode="single",
        target_ids=["pvp_tier_master"],
        resize=24,
        bottom_align=False,
        notes="마스터 — 빨간 별형",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_36_44 (7).png",
        group="O_pvp_tiers",
        mode="single",
        target_ids=["pvp_tier_grandmaster"],
        resize=24,
        bottom_align=False,
        notes="진왕 — 황금 왕관 + 王",
    ),

    # ── 그룹 P: 상점 NPC 4프레임 (의뢰 10) ────────────────────
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_40_28 (1).png",
        group="P_npc_merchant",
        mode="single",
        target_ids=["npc_merchant_f1"],
        resize=32,
        bottom_align=True,
        notes="암시장 상인 idle f1 — 후드 + 코인 가방 + 갈고리",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_40_28 (2).png",
        group="P_npc_merchant",
        mode="single",
        target_ids=["npc_merchant_f2"],
        resize=32,
        bottom_align=True,
        notes="상인 idle f2 (squash)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_40_28 (3).png",
        group="P_npc_merchant",
        mode="single",
        target_ids=["npc_merchant_f3"],
        resize=32,
        bottom_align=True,
        notes="상인 idle f3 (base)",
    ),
    V2Item(
        src_filename="ChatGPT Image 2026년 5월 3일 오후 07_40_28 (4).png",
        group="P_npc_merchant",
        mode="single",
        target_ids=["npc_merchant_f4"],
        resize=32,
        bottom_align=True,
        notes="상인 idle f4 (stretch)",
    ),
]


# ---------------------------------------------------------------------------
# 비정사각 리사이즈 (마왕성 전용) — 종횡비 보존 + bottom-align
# ---------------------------------------------------------------------------

def resize_to_rect_nearest(arr: np.ndarray, w: int, h: int, bottom_align: bool) -> np.ndarray:
    """
    arr를 정확히 w×h 캔버스에 NEAREST 배치. 종횡비 fit (잘림 없음).
    bottom_align=True면 발 정렬, 아니면 중앙.
    """
    src_h, src_w = arr.shape[:2]
    if src_h == 0 or src_w == 0:
        return np.zeros((h, w, 4), dtype=np.uint8)
    # fit scale: 가로/세로 중 더 빡빡한 쪽 기준
    scale = min(w / src_w, h / src_h)
    new_w = max(1, int(round(src_w * scale)))
    new_h = max(1, int(round(src_h * scale)))
    img = Image.fromarray(arr, mode="RGBA").resize((new_w, new_h), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dx = (w - new_w) // 2
    dy = (h - new_h) if bottom_align else (h - new_h) // 2
    canvas.paste(img, (dx, dy), img)
    return np.array(canvas)


# ---------------------------------------------------------------------------
# 단일 처리 (single / castle)
# ---------------------------------------------------------------------------

def process_single(item: V2Item, src_path: Path, out_dir: Path) -> tuple[Image.Image, dict]:
    img = Image.open(src_path).convert("RGBA")
    arr_before = np.array(img)
    bg = detect_background(img, item.tolerance)
    cleaned = flood_fill_bg(arr_before, bg)

    # 디버그 mask (제거된 영역 시각화)
    debug_mask = make_debug_mask(arr_before, cleaned)
    debug_mask.save(out_dir / f"{item.target_ids[0]}_debug_mask.png")

    bb = bbox_of_alpha(cleaned)
    if bb is None:
        raise RuntimeError(f"빈 결과: {item.src_filename}")
    cropped = crop_with_padding(cleaned, bb, item.padding)

    # 리사이즈
    if item.mode == "castle":
        final = resize_to_rect_nearest(cropped, item.resize_w, item.resize_h, item.bottom_align)
    elif item.resize > 0:
        final = resize_nearest(cropped, item.resize, item.bottom_align)
    else:
        final = cropped

    sprite = Image.fromarray(final, mode="RGBA")
    info = {
        "src_size": list(img.size),
        "bg_used_alpha": bg.used_alpha,
        "bg_colors": bg.bg_colors,
        "tolerance": bg.tolerance,
        "cropped_bbox": bb,
        "final_size": list(sprite.size),
    }
    return sprite, info


# ---------------------------------------------------------------------------
# 그리드 처리 — 셀별 독립 bbox + 행별 max 캔버스 정렬 (도트 침범 방지)
# ---------------------------------------------------------------------------

def process_grid(item: V2Item, src_path: Path, out_dir: Path) -> tuple[list[Image.Image], dict]:
    img = Image.open(src_path).convert("RGBA")
    arr_before = np.array(img)
    bg = detect_background(img, item.tolerance)
    cleaned = flood_fill_bg(arr_before, bg)

    debug_mask = make_debug_mask(arr_before, cleaned)
    debug_mask.save(out_dir / f"{item.group}_{src_path.stem[:20]}_debug_mask.png")

    cells = slice_grid(cleaned, item.rows, item.cols)
    H, W = arr_before.shape[:2]
    cell_h = H // item.rows
    cell_w = W // item.cols

    # 각 셀별 독립 bbox + crop (옆 셀 픽셀 절대 침범 X)
    per_cell_bbox = []
    per_cell_crop = []
    for cell in cells:
        bb = bbox_of_alpha(cell)
        per_cell_bbox.append(bb)
        if bb is None:
            per_cell_crop.append(None)
        else:
            per_cell_crop.append(crop_with_padding(cell, bb, item.padding))

    # 행별 max 캔버스 정렬 (발 정렬 시 같은 행은 같은 baseline)
    sprites: list[Image.Image] = []
    src_boxes: list[tuple[int, int, int, int]] = []
    for r in range(item.rows):
        row_crops = [per_cell_crop[r * item.cols + c] for c in range(item.cols)]
        max_w = max((c.shape[1] for c in row_crops if c is not None), default=0)
        max_h = max((c.shape[0] for c in row_crops if c is not None), default=0)
        for c_i in range(item.cols):
            idx = r * item.cols + c_i
            cr = per_cell_crop[idx]
            if cr is None:
                # 빈 셀이지만 명세에는 이름이 있으므로 0×0 투명 캔버스 출력 X — 에러
                raise RuntimeError(f"{item.src_filename} 셀 ({r},{c_i})가 비었음")
            ch, cw = cr.shape[:2]
            canvas = np.zeros((max_h, max_w, 4), dtype=np.uint8)
            dx = (max_w - cw) // 2
            dy = (max_h - ch) if item.bottom_align else (max_h - ch) // 2
            canvas[dy:dy + ch, dx:dx + cw] = cr
            if item.resize > 0:
                final = resize_nearest(canvas, item.resize, item.bottom_align)
            else:
                final = canvas
            sprites.append(Image.fromarray(final, mode="RGBA"))
            bb = per_cell_bbox[idx]
            src_boxes.append(
                (c_i * cell_w + bb[0], r * cell_h + bb[1],
                 c_i * cell_w + bb[2], r * cell_h + bb[3])
            )

    # 디버그 boxes
    debug_boxes = make_debug_boxes(arr_before[:, :, :3], src_boxes)
    debug_boxes.save(out_dir / f"{item.group}_{src_path.stem[:20]}_debug_boxes.png")

    info = {
        "src_size": list(img.size),
        "rows": item.rows,
        "cols": item.cols,
        "boxes": src_boxes,
    }
    return sprites, info


# ---------------------------------------------------------------------------
# combined_anim 처리 — 1장에 [라벨/idle] + attack 3 + hit 2 + death 3 = 8셀 × 3행
# 07_22_29 전용 (apprentice/swordsman/mage 통합 시트)
# ---------------------------------------------------------------------------

def process_combined_anim(item: V2Item, src_path: Path, out_dir: Path) -> tuple[list[Image.Image], dict]:
    img = Image.open(src_path).convert("RGBA")
    arr_before = np.array(img)
    bg = detect_background(img, item.tolerance)
    cleaned = flood_fill_bg(arr_before, bg)

    debug_mask = make_debug_mask(arr_before, cleaned)
    debug_mask.save(out_dir / f"{item.group}_debug_mask.png")

    H, W = arr_before.shape[:2]
    rows = 3
    # 1행 가로 layout: [label/idle 1칸] + attack 3 + hit 2 + death 3 = 9칸
    total_cols = 9
    label_cols = 1
    anim_cols = 8  # attack(3) + hit(2) + death(3)
    cell_w = W // total_cols
    cell_h = H // rows
    # 행 위쪽 텍스트 라벨("attack (3 frames)" 등) 영역 잘라내기 — 비율로 16% 추정
    top_text_band = int(cell_h * 0.16)
    # 행 아래쪽 "f1", "f2" 등 작은 라벨 영역 — 약 10%
    bottom_text_band = int(cell_h * 0.08)

    sprites: list[Image.Image] = []
    src_boxes: list[tuple[int, int, int, int]] = []
    for r in range(rows):
        for c_within in range(anim_cols):
            c = label_cols + c_within
            x0 = c * cell_w
            y0 = r * cell_h + top_text_band
            x1 = W if c == total_cols - 1 else (c + 1) * cell_w
            y1 = (H if r == rows - 1 else (r + 1) * cell_h) - bottom_text_band
            cell = cleaned[y0:y1, x0:x1]
            # 셀 안에서 connected components 추출 — 텍스트 라벨(작은 area)은 무시
            comps = detect_components(cell, min_area=400)
            if not comps:
                # 빈 셀 — 32×32 투명
                empty = np.zeros((item.resize or 32, item.resize or 32, 4), dtype=np.uint8)
                sprites.append(Image.fromarray(empty, mode="RGBA"))
                continue
            # 가장 큰 컴포넌트 (캐릭터)
            comps.sort(key=lambda b: -((b[2] - b[0]) * (b[3] - b[1])))
            # 만약 비슷한 크기 여러 개 있으면 모두 합쳐 bbox (예: 분해 입자 + 캐릭터)
            cx0, cy0, cx1, cy1 = comps[0]
            largest_area = (cx1 - cx0) * (cy1 - cy0)
            for cb in comps[1:]:
                area = (cb[2] - cb[0]) * (cb[3] - cb[1])
                # 가장 큰 것의 30% 이상 크기인 컴포넌트만 합침 (입자/이펙트)
                if area > largest_area * 0.3:
                    cx0 = min(cx0, cb[0])
                    cy0 = min(cy0, cb[1])
                    cx1 = max(cx1, cb[2])
                    cy1 = max(cy1, cb[3])
            bb = (cx0, cy0, cx1, cy1)
            cr = crop_with_padding(cell, bb, item.padding)
            if item.resize > 0:
                final = resize_nearest(cr, item.resize, item.bottom_align)
            else:
                final = cr
            sprites.append(Image.fromarray(final, mode="RGBA"))
            src_boxes.append((x0 + bb[0], y0 + bb[1], x0 + bb[2], y0 + bb[3]))

    debug_boxes = make_debug_boxes(arr_before[:, :, :3], src_boxes)
    debug_boxes.save(out_dir / f"{item.group}_debug_boxes.png")

    return sprites, {
        "src_size": list(img.size),
        "rows": rows,
        "anim_cols": anim_cols,
        "label_cols": label_cols,
    }


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main() -> int:
    if not ASSET_DIR.exists():
        print(f"[err] asset 디렉토리 없음: {ASSET_DIR}", file=sys.stderr)
        return 2

    SPRITES_DIR.mkdir(parents=True, exist_ok=True)
    EXTRACT_DIR.mkdir(parents=True, exist_ok=True)
    unmapped_dir = EXTRACT_DIR / "F_unmapped"
    unmapped_dir.mkdir(parents=True, exist_ok=True)

    report_lines: list[str] = []
    report_lines.append("# V2 에셋 적용 리포트")
    report_lines.append("")
    report_lines.append("| group | src | mode | output(s) | size | notes |")
    report_lines.append("|---|---|---|---|---|---|")

    all_sprites: list[Image.Image] = []
    all_names: list[str] = []
    errors: list[str] = []

    for item in MANIFEST:
        src = ASSET_DIR / item.src_filename
        if not src.exists():
            errors.append(f"파일 없음: {item.src_filename}")
            print(f"[err] not found: {src}", file=sys.stderr)
            continue

        group_dir = EXTRACT_DIR / item.group
        group_dir.mkdir(parents=True, exist_ok=True)

        try:
            if item.mode in ("single", "castle"):
                sprite, info = process_single(item, src, group_dir)
                target_id = item.target_ids[0]
                # unmapped 그룹은 sprites/ 폴더 X — assets/extracted/v2/F_unmapped 로
                if item.mode == "unmapped":
                    out_path = unmapped_dir / f"{target_id}.png"
                else:
                    out_path = SPRITES_DIR / f"{target_id}.png"
                sprite.save(out_path)
                # 그룹 폴더에도 사본 (검수용)
                sprite.save(group_dir / f"{target_id}.png")
                all_sprites.append(sprite)
                all_names.append(target_id)
                report_lines.append(
                    f"| {item.group} | {item.src_filename[:40]}... | {item.mode} | "
                    f"`{target_id}.png` | {sprite.size[0]}×{sprite.size[1]} | {item.notes} |"
                )
                print(f"[ok] {item.src_filename[:40]} → {out_path.name} ({sprite.size})")

            elif item.mode == "combined_anim":
                sprites, info = process_combined_anim(item, src, group_dir)
                if len(sprites) != len(item.target_ids):
                    errors.append(
                        f"{item.src_filename}: combined 셀 수 불일치 "
                        f"({len(sprites)} vs {len(item.target_ids)})"
                    )
                    continue
                for sp, target_id in zip(sprites, item.target_ids):
                    out_path = SPRITES_DIR / f"{target_id}.png"
                    sp.save(out_path)
                    sp.save(group_dir / f"{target_id}.png")
                    all_sprites.append(sp)
                    all_names.append(target_id)
                report_lines.append(
                    f"| {item.group} | {item.src_filename[:40]}... | combined_anim | "
                    f"{len(sprites)} files | {sprites[0].size[0]}×{sprites[0].size[1]} | "
                    f"{item.notes} |"
                )
                print(f"[ok] {item.src_filename[:40]} → combined {len(sprites)} sprites")

            elif item.mode == "grid":
                sprites, info = process_grid(item, src, group_dir)
                if len(sprites) != len(item.target_ids):
                    errors.append(
                        f"{item.src_filename}: 셀 수 불일치 ({len(sprites)} vs "
                        f"target_ids {len(item.target_ids)})"
                    )
                    continue
                # 그룹 E (보너스 walk frames)는 sprites/ X — 별도 폴더만
                is_bonus = item.group.startswith("E_")
                for sp, target_id in zip(sprites, item.target_ids):
                    if is_bonus:
                        out_path = group_dir / f"{target_id}.png"
                    else:
                        out_path = SPRITES_DIR / f"{target_id}.png"
                    sp.save(out_path)
                    sp.save(group_dir / f"{target_id}.png")
                    all_sprites.append(sp)
                    all_names.append(target_id)
                report_lines.append(
                    f"| {item.group} | {item.src_filename[:40]}... | grid {item.rows}×{item.cols}"
                    f" | {len(sprites)} files | {sprites[0].size[0]}×{sprites[0].size[1]} |"
                    f" {item.notes} |"
                )
                print(f"[ok] {item.src_filename[:40]} → {len(sprites)} sprites "
                      f"(bonus={is_bonus})")

            elif item.mode == "unmapped":
                # single 처리하되 unmapped 폴더에만 저장
                item_copy = V2Item(**{**item.__dict__, "mode": "single"})
                sprite, info = process_single(item_copy, src, group_dir)
                target_id = item.target_ids[0]
                out_path = unmapped_dir / f"{target_id}.png"
                sprite.save(out_path)
                # 검수용: 원본 + 추출본 함께
                Image.open(src).convert("RGBA").save(group_dir / f"{target_id}_original.png")
                sprite.save(group_dir / f"{target_id}_extracted.png")
                all_sprites.append(sprite)
                all_names.append(f"[unmapped] {target_id}")
                report_lines.append(
                    f"| {item.group} | {item.src_filename[:40]}... | unmapped | "
                    f"⚠ `assets/extracted/v2/F_unmapped/{target_id}.png` | "
                    f"{sprite.size[0]}×{sprite.size[1]} | {item.notes} |"
                )
                print(f"[unmapped] {item.src_filename[:40]} → {out_path}")

        except Exception as e:
            errors.append(f"{item.src_filename}: {type(e).__name__}: {e}")
            print(f"[err] {item.src_filename}: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()

    # 통합 contact sheet (검수용)
    if all_sprites:
        contact = make_contact_sheet(all_sprites, all_names, cell=72)
        contact.save(EXTRACT_DIR / "contact_sheet_all.png")

    # 리포트 저장
    if errors:
        report_lines.append("")
        report_lines.append("## ⚠ 오류")
        for e in errors:
            report_lines.append(f"- {e}")
    report_lines.append("")
    report_lines.append("## 적용 후 확인 사항")
    report_lines.append("- `public/sprites/` 에 새 PNG 저장됨")
    report_lines.append("- `assets/extracted/v2/F_unmapped/` — 미분류 4개. 사용자 결정 필요")
    report_lines.append("- `assets/extracted/v2/E_walk_cycle_bonus/` — walk 4프레임 보너스 (현재 미연결)")
    report_lines.append("- `assets/extracted/v2/contact_sheet_all.png` — 전체 시각 검수")
    report_lines.append("- 각 group 폴더 안 `*_debug_mask.png` — 마젠타 제거 영역 확인 (흰색 보존 검증)")

    (EXTRACT_DIR / "_apply_report.md").write_text(
        "\n".join(report_lines), encoding="utf-8"
    )

    print()
    print(f"[done] saved: {len(all_sprites)} sprites")
    print(f"       errors: {len(errors)}")
    print(f"       report: {EXTRACT_DIR / '_apply_report.md'}")
    print(f"       contact: {EXTRACT_DIR / 'contact_sheet_all.png'}")
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
