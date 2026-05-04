# PNG 스프라이트 폴더

이 폴더에 GPT/픽셀 아티스트가 만든 PNG 에셋을 저장합니다.

**파일 이름은 정확히 다음과 같이 저장**:

## 몬스터 (32×32 PNG)
- `slime.png`, `kslime.png`, `slord.png`
- `goblin.png`, `gobw.png`, `ggen.png`
- `witch.png`, `dwitch.png`, `awitch.png`
- `skel.png`, `sknt.png`
- `orc.png`, `orcb.png`, `owar.png`
- `imp.png`, `devil.png`
- `mino.png`, `minok.png`
- `zombie.png`, `zomk.png`
- `lich.png`, `dlich.png`
- `mimic.png`, `gmimic.png`

## 용사 (32×32 PNG)
- `apprentice.png`, `swordsman.png`, `archer.png`, `mage.png`
- `spear.png`, `shield.png`, `rogue.png`, `healer.png`

## 보스 (64×64 PNG)
- `captain_64.png`, `archmage_64.png`, `saint_64.png`, `king_64.png`, `priest_64.png`

## 마왕 (48×48 PNG)
- `demon_lord_48.png`

## 배경 타일 (16×16 PNG)
- `tile_stone.png`, `tile_dirt.png`, `tile_grass.png`
- `tile_lava_f1.png`, `tile_lava_f2.png` (2프레임 깜빡임)
- `tile_magic_f1.png` ~ `tile_magic_f4.png` (4프레임 회전)

## 이펙트
- `hit_physical_f1~f3.png`, `hit_fire_f1~f3.png`, etc.
- `summon_common_f1~f6.png`, `summon_rare_f1~f6.png`, etc.
- `evolve_f1~f8.png`
- `death_ally_f1~f3.png`, `death_enemy_f1~f3.png`

## 투사체 (8×8 ~ 16×16)
- `proj_magic.png`, `proj_arrow.png`, `proj_fire.png`, `proj_holy.png`

---

**규약**:
- 1배율 (32×32는 32×32 그대로, 확대 X)
- PNG 투명 배경
- 안티앨리어싱 금지 (Nearest Neighbor)
- 자세한 디자인 명세는 프로젝트 루트의 `asset_pixel.md` 참조

PNG가 없는 캐릭터는 코드의 함수형 builder로 자동 fallback 됩니다.
PNG를 추가하면 자동으로 우선 사용됩니다 (코드 수정 불필요).
