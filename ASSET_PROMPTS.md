# 마왕 디펜스 — GPT 이미지 생성 프롬프트 명세서

> 이 문서는 누락/품질 미달 에셋을 GPT(이미지 생성)로 만들기 위한 단계별 프롬프트 모음이다.
> 모든 결과물은 추출 후 `tools/extract_sprites.py` 로 누끼/리사이즈를 거친다.
> **GPT 이미지가 곧바로 게임에 들어가지 않는다 — 항상 추출 파이프라인을 통과시킨다.**

---

## 0. 모든 프롬프트에 공통으로 들어가야 하는 규칙

매 프롬프트의 마지막 단락에 **반드시** 아래 11줄을 포함시킬 것. 누락하면 누끼/리사이즈 단계에서 망가진다.

```
STYLE & TECHNICAL CONSTRAINTS (must follow exactly)
- Pixel-art / dot art only. NO anti-aliasing, NO blur, NO smoothing, NO motion blur.
- Hard pixel edges. Each pixel is either fully colored or fully background — never partial.
- Strictly limited palette: 8–16 colors per sprite.
- 1px hard outline (very dark, near-black) around the silhouette.
- Background: pure SOLID magenta (#FF00FF) — flat, single color, no checkerboard, no gradient, no shadow.
- All sprites in the sheet sit on the same baseline (feet aligned to the bottom of each cell).
- Cell padding: ~10% of cell width on every side, fully background color.
- Camera angle: classic JRPG 3/4 view (slightly top-down, facing camera).
- Lighting: top-left, soft single light source. NO rim light, NO gradient highlights.
- Output as a single PNG. No labels, no text, no UI, no watermark, no signature.
- Do not include borders, grid lines, or row separators inside the sheet.
```

> **주의**: GPT가 자주 어기는 항목 = 안티앨리어싱 / 그라데이션 / 그림자. 산출물 받으면 100% 확대해서 픽셀이 단단한지 먼저 검수.

---

## 1. 작업 순서 (단계별)

1. 아래 각 섹션의 프롬프트를 GPT/이미지 생성 모델에 던져서 **마젠타 배경** 단일 PNG를 받는다.
2. 받은 PNG는 `assets/source/<id>.png` 로 저장한다.
3. `tools/extract_sprites.py` 의 `--mode single` 또는 `grid` 로 누끼·리사이즈한다 (각 섹션 하단의 명령어 그대로).
4. 산출물 contact_sheet.png 를 눈으로 확인 → 통과하면 `tools/extract_all.py --apply` 로 `public/sprites/` 에 반영.
5. 게임 실행 후 해당 유닛이 의도한 모양으로 보이는지 확인.

---

## 2. 보스 5종 (64×64 PNG)

### 공통 톤
- 카이로소프트풍 픽셀 RPG 보스. 일반 몬스터보다 한 사이즈 크고 위압적.
- 한 시트에 4프레임 가로 walk cycle. 시트 크기: 가로 256px × 세로 64px (= 4 × 64).
- 단색 마젠타 배경.

### 2-1. captain_64 (인간군 대장)

```
A 64x64 pixel-art sprite sheet for a video game enemy boss called "human captain".
The sheet contains 4 horizontal walk-cycle frames, total image size 256x64.
Each frame is exactly 64x64 pixels.

CHARACTER DESIGN
- Veteran human knight, mid-30s, broad-shouldered, scarred.
- Heavy steel chest plate (cool gray with blue trim), red cape behind.
- Open helmet, short brown hair visible, fierce eyes.
- Sword in right hand resting on shoulder, round shield in left.
- Walks forward, facing 3/4 down toward camera.
- Slight bob between frames (foot lift, knee bend), shield/cape sway lightly.
- Color palette: cool steel gray, navy blue trim, deep red cape, skin tone, dark gray outline.

[+ COMMON STYLE & TECHNICAL CONSTRAINTS block from §0]
```

추출:
```bash
python tools/extract_sprites.py \
  --input assets/source/captain_64_sheet.png \
  --output assets/extracted/captain_64 \
  --rows 1 --cols 4 --frame-prefix captain_64 --resize 64 --tolerance 24
```

### 2-2. archmage_64 (대마법사)

```
A 64x64 pixel-art sprite sheet for a video game enemy boss called "archmage".
4 horizontal walk-cycle frames, total image size 256x64. Each frame 64x64.

CHARACTER DESIGN
- Old human wizard, long white beard, tall pointed wizard hat (deep purple with star pattern).
- Floor-length dark purple robe with gold trim, sleeves wide.
- Wooden staff in right hand, glowing blue-white orb at the top.
- Slightly hovering over the ground (1-2px gap between feet and baseline).
- Walk cycle = robe sway + staff orb pulse (frame 2 brighter, frame 4 dimmer).
- Color palette: deep violet, royal gold, white beard, glowing cyan, dark outline.

[+ COMMON STYLE & TECHNICAL CONSTRAINTS block from §0]
```

추출: 위 captain와 동일 패턴, `--input assets/source/archmage_64_sheet.png`, `--output assets/extracted/archmage_64`, `--frame-prefix archmage_64`.

### 2-3. saint_64 (성인/홀리)

```
A 64x64 pixel-art sprite sheet for "saint" — a holy human boss.
4 horizontal walk-cycle frames, total 256x64.

CHARACTER DESIGN
- Female cleric/saint, calm expression, halo (small golden ring) above head.
- White robe with gold cross emblem on chest, light blue inner layer at hem.
- Holding ornate golden mace/scepter in right hand.
- Soft golden glow around silhouette (rendered as a 1-2px thick yellow halo, NOT smooth gradient — keep hard pixels).
- Walk cycle = robe ripple + halo gentle bob, scepter glints on frame 3.
- Palette: white, soft gold, pale blue, skin tone, dark outline.

[+ COMMON STYLE & TECHNICAL CONSTRAINTS block from §0]
```

추출: 동일 패턴, `--frame-prefix saint_64`.

### 2-4. king_64 (왕)

```
A 64x64 pixel-art sprite sheet for "human king" — final-tier human boss.
4 horizontal walk-cycle frames, total 256x64.

CHARACTER DESIGN
- Elder king, full white beard, crowned (golden crown with red gemstones).
- Long royal robe: deep crimson outside, ermine (white with black spots) lining at the front and hem.
- Golden chain with large medallion across chest.
- Holding tall scepter (golden, topped with red gem).
- Stern expression, slow regal walk (small step, heavy drag of robe).
- Palette: deep crimson, ermine white, royal gold, ruby red, dark outline.

[+ COMMON STYLE & TECHNICAL CONSTRAINTS block from §0]
```

추출: 동일 패턴, `--frame-prefix king_64`.

### 2-5. priest_64 (사제)

```
A 64x64 pixel-art sprite sheet for "priest" — supportive holy human boss.
4 horizontal walk-cycle frames, total 256x64.

CHARACTER DESIGN
- Bald or tonsured monk in beige/cream hooded robe with rope belt.
- Holy book (closed, brown leather with golden cross) cradled in left arm.
- Small wooden cross pendant on neck.
- Right hand raised slightly in blessing gesture (palm forward).
- Walk cycle = robe sway, hood static, blessing hand opens slightly on frame 2/4.
- Palette: cream beige, warm brown, off-white, gold accents, dark outline.

[+ COMMON STYLE & TECHNICAL CONSTRAINTS block from §0]
```

추출: 동일 패턴, `--frame-prefix priest_64`.

---

## 3. 마왕 (48×48 PNG)

### 3-1. demon_lord_48 (게임 마스코트, 마왕)

```
A 48x48 pixel-art sprite sheet for "Demon Lord" — the player's avatar/mascot in a tower defense game.
4 horizontal idle/breathing frames, total image size 192x48.

CHARACTER DESIGN
- Cute-but-menacing chibi demon lord, big head + small body proportions (~1:1 head-to-body).
- Black/dark purple armor with glowing red gem on chest.
- Two small curved horns on head, small bat wings folded behind.
- Glowing red eyes (single visible pupil dot).
- Holds a tiny black skull-tipped staff in right hand.
- Idle = subtle breathing (head bobs 1px up/down across 4 frames), wings flutter slightly.
- Should look "evil but lovable" — readable as the player's character at a glance.
- Palette: deep purple-black, blood red, bone white, glowing magenta-red, dark outline.

[+ COMMON STYLE & TECHNICAL CONSTRAINTS block from §0]
```

추출:
```bash
python tools/extract_sprites.py \
  --input assets/source/demon_lord_48_sheet.png \
  --output assets/extracted/demon_lord_48 \
  --rows 1 --cols 4 --frame-prefix demon_lord_48 --resize 48 --tolerance 24
```

---

## 4. 투사체 4종 (16×16 PNG, 단일 프레임)

> 투사체는 단일 프레임이라 그리드 없이 한 장씩 의뢰. 각 PNG는 64×64 정도로 받아서 16×16 으로 리사이즈한다.

### 4-1. proj_magic (마법 구체)

```
A 64x64 pixel-art icon of a "magic projectile orb" for a video game.
- Glowing violet/blue magic sphere, ~80% of canvas diameter, centered.
- 1px dark purple outline.
- Inner highlight: 2-3 hard pixels of pale lavender at top-left (NO gradient).
- Tiny sparkle dots (1-2px) around the orb suggesting motion.
- Pure SOLID magenta (#FF00FF) background.

[+ COMMON STYLE & TECHNICAL CONSTRAINTS block from §0]
```

추출:
```bash
python tools/extract_sprites.py \
  --input assets/source/proj_magic.png \
  --output assets/extracted/proj_magic \
  --mode single --names proj_magic --resize 16 --tolerance 24 --padding 1
```

### 4-2. proj_arrow (화살)

```
A 64x64 pixel-art icon of a single "arrow projectile" for a video game.
- Wooden arrow oriented diagonally pointing top-right (45 degrees).
- Brown wooden shaft (~3px wide), gray triangular metal arrowhead at top-right tip.
- White/cream feather fletching at bottom-left end (3 small fletches).
- 1px dark outline.
- Pure SOLID magenta (#FF00FF) background.

[+ COMMON STYLE & TECHNICAL CONSTRAINTS block from §0]
```

추출: `--names proj_arrow`, 나머지 동일.

### 4-3. proj_fire (화염탄)

```
A 64x64 pixel-art icon of a "fireball projectile" for a video game.
- Round flame ball, ~80% of canvas, centered.
- Outer flame: bright orange-red.
- Inner core: bright yellow (3-4 hard-pixel ring inside).
- Small flame tongues (3-5 sharp triangular tips) flicking outward at top.
- 1px dark red outline.
- Pure SOLID magenta (#FF00FF) background.

[+ COMMON STYLE & TECHNICAL CONSTRAINTS block from §0]
```

추출: `--names proj_fire`.

### 4-4. proj_holy (신성탄)

```
A 64x64 pixel-art icon of a "holy projectile" for a video game.
- Bright cross/star shape, ~70% of canvas, centered.
- Pure white core with golden yellow halo around it (1-2px ring of hard yellow pixels).
- 4 small radiating spike pixels at top, bottom, left, right.
- 1px soft gold outline (NOT black — gold).
- Pure SOLID magenta (#FF00FF) background.

[+ COMMON STYLE & TECHNICAL CONSTRAINTS block from §0]
```

추출: `--names proj_holy`.

---

## 5. (옵션) 품질 미달 재의뢰 후보

현재 `public/sprites/` 안에서 **이미 있지만 다시 만드는 게 나은** 후보. 시각 검수 후 결정.

| 파일                                 | 사유                                                 | 액션                                  |
|------------------------------------|------------------------------------------------------|---------------------------------------|
| `slime_sheet.png` 의 `slord` 행   | 진화 최종형인데 시각적으로 작아 보임                 | 행 단위 재의뢰 권장                   |
| `witch_sheet.png` 의 `dwitch` 행  | 다른 행보다 캐릭터 사이즈가 절반 이하                | 비율 일관성 위해 재의뢰               |
| `mimic_sheet.png` (전체)           | 보물상자 mimic 인지가 약함                           | 전체 재의뢰 검토                      |

재의뢰 시 시트 사양은 §6 의 적 시트 템플릿을 그대로 따른다.

---

## 6. (참고) 적 시트 신규 의뢰 템플릿

신규 적 시트가 필요할 때 사용. 행 = 진화 단계, 열 = 4프레임 walk.

```
A pixel-art sprite sheet of "[적 이름]" — a fantasy RPG monster line, three evolution stages.
Sheet layout: 3 rows × 4 columns, each cell 64x64, total image 256x192.
- Row 1: base form, weakest, smallest silhouette.
- Row 2: evolved, slightly bigger, gains [accessory: e.g. crown / armor / dark aura].
- Row 3: final form, biggest, most menacing, gains [final feature: e.g. spikes / wings / glowing eyes].
- Each row = 4 horizontal walk-cycle frames (left foot → contact → right foot → contact).
- All cells use the same baseline (feet at the bottom of each cell).
- Each row's silhouette is roughly the same height (so size growth is visible from row to row).
- Color palette stays consistent across the 3 rows (only adds, never replaces).
- Pure SOLID magenta (#FF00FF) background everywhere — no internal grid lines.

[+ COMMON STYLE & TECHNICAL CONSTRAINTS block from §0]
```

추출 (예: 새 적 `lizard_sheet`):
```bash
python tools/extract_sprites.py \
  --input assets/source/lizard_sheet.png \
  --output assets/extracted/lizard_sheet \
  --rows 3 --cols 4 \
  --names "lizard,lizardk,lizardlord" \
  --resize 32 --tolerance 24 --padding 1
```

---

## 7. 검수 체크리스트 (각 에셋 완료 직전)

- [ ] 100% 줌으로 봤을 때 모든 픽셀이 단단한가? (안티앨리어싱 0)
- [ ] 마젠타 (#FF00FF) 가 모서리 4곳 모두에 보이는가?
- [ ] 캐릭터 내부에 마젠타가 끼어 있지 않은가? (내부 흰색은 OK)
- [ ] walk 시트의 경우, 4프레임의 발 위치가 모두 같은 baseline 인가?
- [ ] `tools/extract_sprites.py` 실행 후 `extraction_report.md` 의 `suspicious` 가 비어있는가?
- [ ] `contact_sheet.png` 에서 모든 셀이 비어있지 않은가?
- [ ] `debug_mask.png` 에서 캐릭터 안쪽이 마젠타로 잘못 마킹되지 않았는가?

---

## 8. 빠른 참조: 현재 누락 에셋 목록 (2026-05-03 기준)

| ID                  | 사이즈   | 용도            | 프롬프트 |
|---------------------|--------|-----------------|---------|
| `captain_64`        | 64×64  | 인간군 보스      | §2-1    |
| `archmage_64`       | 64×64  | 대마법사 보스    | §2-2    |
| `saint_64`          | 64×64  | 성인 보스        | §2-3    |
| `king_64`           | 64×64  | 왕 보스          | §2-4    |
| `priest_64`         | 64×64  | 사제 보스        | §2-5    |
| `demon_lord_48`     | 48×48  | 마왕 (플레이어) | §3-1    |
| `proj_magic`        | 16×16  | 마법 투사체      | §4-1    |
| `proj_arrow`        | 16×16  | 화살             | §4-2    |
| `proj_fire`         | 16×16  | 화염탄           | §4-3    |
| `proj_holy`         | 16×16  | 신성탄           | §4-4    |

> 보스/마왕은 fallback 함수형 빌더가 그리지만, 시각적으로 다른 캐릭터들과 격이 안 맞음 → PNG 추가하면 자동 우선 사용된다.
