/**
 * 마왕성 NPC 4종 — 왕좌실에 거주하며 컨텍스트별로 다른 대사.
 *
 * 톤:
 * - Vael: 시종, 무겁고 침착한 경어. 마왕의 행동을 객관적으로 코멘트.
 * - Krug: 고블린 대장, 짧고 거칠다. 무뚝뚝 농담.
 * - Iset: 옛 동료, 회한이 묻은 시적인 말투.
 * - Lyra: 인간 사절(이중 첩자), 빠르고 정보 위주, 살짝 빈정.
 *
 * 대사는 컨텍스트(트리거)별로 풀에서 무작위 선택. 풀이 비면 fallback.
 */

export type NpcId = 'vael' | 'krug' | 'iset' | 'lyra';

export type NpcTrigger =
  | 'idle'                // 그냥 말 걸었을 때
  | 'after_run'           // 런 종료 직후
  | 'after_victory'       // 클리어 직후
  | 'after_defeat'        // 사망 직후
  | 'before_chapter'      // 새 챕터 입장 전
  | 'after_chapter'       // 챕터 마지막 클리어
  | 'level_up'            // 마왕 레벨업
  | 'low_resource'        // 영혼석 < 100
  | 'rich';               // 영혼석 ≥ 5000

export interface NpcDef {
  id: NpcId;
  name: string;
  title: string;
  icon: string;       // 이모지
  accent: string;     // CSS 색
  bio: string;        // 도감/소개
  /** 컨텍스트별 대사 풀 (각 4~10줄) */
  lines: Record<NpcTrigger, string[]>;
}

const fallback = (one: string) => [one];

export const NPCS: NpcDef[] = [
  {
    id: 'vael',
    name: 'Vael',
    title: '그림자 시종',
    icon: '🦇',
    accent: '#a55eea',
    bio: '마왕 본체의 옆에서 가장 오래 깨어 있던 자. 1대 마왕 시절부터 봉인을 지킨 그림자.',
    lines: {
      idle: [
        '"다음 명령을 기다리고 있습니다."',
        '"마왕성은 오늘도 견디고 있습니다."',
        '"천 년의 먼지가 가라앉지 않은 방이 있습니다."',
        '"창 밖에는 — 검은 새 한 마리, 떨어지지 않습니다."',
      ],
      after_run: [
        '"이번 침공도 잘 막아내셨습니다."',
        '"보고드릴 것이 있습니다 — 그 후에 쉬시지요."',
        '"용사의 발자국이 마왕성 앞에서 끝났습니다."',
      ],
      after_victory: [
        '"깔끔합니다. 1대 마왕께서도 이만큼은 못 하셨지요."',
        '"이런 승리는 — 인간이 두려워해야 합니다."',
      ],
      after_defeat: [
        '"잠시 봉인되셨을 뿐입니다. 다시 깨어나시지요."',
        '"이번 패배는 — 다음 승리를 위한 정보입니다."',
        '"슬퍼하지 마십시오. 어둠은 영원합니다."',
      ],
      before_chapter: [
        '"새로운 진군이 다가옵니다. 준비되셨습니까?"',
        '"이번엔 인간이 무엇을 보낼지 — 저도 궁금합니다."',
      ],
      after_chapter: [
        '"챕터가 닫혔습니다. 잠시 숨을 고르시지요."',
      ],
      level_up: [
        '"옛 기억이 한 조각 더 돌아오신 것 같습니다."',
        '"점점 — 1대 마왕에 가까워지고 계십니다."',
      ],
      low_resource: [
        '"보물고가 비어 있습니다. 침공이 곧 옵니다."',
      ],
      rich: [
        '"보물이 넘칩니다. 장식실에 새 가구를 들이시지요."',
      ],
    },
  },
  {
    id: 'krug',
    name: 'Krug',
    title: '고블린 대장',
    icon: '👹',
    accent: '#26de81',
    bio: '1대 마왕의 첫 부하. 천 년 동안 봉인된 부하들 곁에서 잠잠히 깨어남을 기다렸다.',
    lines: {
      idle: [
        '"부하들 — 모두 준비됐다."',
        '"슬라임 놈이 또 흘러내리고 있다. 신경 쓰지 마라."',
        '"고블린 노래나 불러줄까. — 안 들으면 그게 더 낫다."',
        '"칼이 녹슬고 있다. 다음 침공이 빨리 와야 한다."',
      ],
      after_run: [
        '"잘했다. 부하들도 만족한다."',
        '"오크 한 놈이 불평한다 — 더 나오게 해달라고."',
      ],
      after_victory: [
        '"이게 진짜 마왕의 일이다."',
      ],
      after_defeat: [
        '"다 죽었다. — 또 일으키면 된다."',
        '"부하 잃었다고 슬퍼하지 마라. 더 만들어주마."',
      ],
      before_chapter: [
        '"새 적이 온다고? 좋다. 칼 갈아두겠다."',
      ],
      after_chapter: [
        '"이번 챕터 — 마무리 깔끔했다."',
      ],
      level_up: [
        '"점점 진짜 마왕 같아진다. — 칭찬이다."',
      ],
      low_resource: [
        '"보물 없으면 부하들 굶는다. 알지?"',
      ],
      rich: [
        '"이만큼 모았으면 한턱 내라."',
      ],
    },
  },
  {
    id: 'iset',
    name: 'Iset',
    title: '얼음 마녀',
    icon: '❄',
    accent: '#74B9FF',
    bio: '1대 마왕을 봉인하는 데 협력한 일곱 사도 중 한 명. 천 년 후 후회로 마왕성에 돌아왔다.',
    lines: {
      idle: [
        '"천 년 전과 같은 별빛입니다."',
        '"내가 만든 봉인이 — 내 손으로 풀리는 것을 봅니다."',
        '"용서를 구하지 않습니다. 다만 옆에 있고 싶습니다."',
        '"눈은 차갑지 않습니다. 그저 — 모든 걸 덮을 뿐입니다."',
      ],
      after_run: [
        '"다시 살아 돌아오신 것을 봅니다. 다행입니다."',
      ],
      after_victory: [
        '"승리입니다. 그러나 — 침공은 또 옵니다. 알고 계시지요."',
      ],
      after_defeat: [
        '"천 년 전 그날 — 저도 잠시 봉인된 기분이었습니다."',
        '"패배는 — 기억으로 남습니다. 그게 강함이 됩니다."',
      ],
      before_chapter: [
        '"이 챕터의 적은 — 제가 알고 있는 자들입니다. 조심하십시오."',
      ],
      after_chapter: [
        '"한 챕터를 더 — 함께 했습니다. 감사합니다."',
      ],
      level_up: [
        '"당신의 어둠이 — 점점 1대 마왕의 색입니다."',
        '"두렵지 않습니다. 다만 — 그리워집니다."',
      ],
      low_resource: [
        '"보물고가 비어 있습니다. 그러나 어둠은 — 보물이 아닙니다."',
      ],
      rich: [
        '"풍요는 — 인간의 것이지요. 우리에게는 충분이면 됩니다."',
      ],
    },
  },
  {
    id: 'lyra',
    name: 'Lyra',
    title: '인간 사절',
    icon: '✉',
    accent: '#FDCB6E',
    bio: '신전 견습이었으나 봉인의 진실을 알고 마왕성에 합류한 자. 인간 측 정보를 흘리지만 그녀의 진짜 목적은 — 아무도 모른다.',
    lines: {
      idle: [
        '"신전이 또 새로운 부대를 편성 중이에요. — 곧 옵니다."',
        '"왕이 어제 잠을 못 잤대요. 좋은 신호죠."',
        '"제 정보가 정확한지 의심하시면 — 저도 의심하세요."',
        '"이게 게임이라면 — 저는 NPC지만, 저도 결정해요."',
      ],
      after_run: [
        '"이번 침공조 명단 봤어요. — 다음 조는 더 셉니다."',
        '"좋아요. 신전 사람들이 당신을 두려워하기 시작했어요."',
      ],
      after_victory: [
        '"예상대로네요. 이 정도는 막아야죠 — 우리 마왕인데."',
      ],
      after_defeat: [
        '"신전이 축하주를 마시고 있어요. 그건 좋은 정보예요."',
        '"이번에는 졌어요. 하지만 — 다음 패에 정보를 더 드릴게요."',
      ],
      before_chapter: [
        '"이번 챕터 적의 약점 — 알려드릴까요? 영혼석 받고요."',
      ],
      after_chapter: [
        '"챕터 클리어 축하해요. — 인간 측에서는 비밀이지만요."',
      ],
      level_up: [
        '"기억이 돌아오시는 거 같네요. 흠 — 그게 위험할 수도 있어요."',
      ],
      low_resource: [
        '"보물고가 비었네요. 정보값은 외상으로 — 안 됩니다."',
      ],
      rich: [
        '"보물 많네요. 정보 한 다발 사가실래요?"',
      ],
    },
  },
];

export function getNpc(id: NpcId): NpcDef {
  return NPCS.find((n) => n.id === id) ?? NPCS[0];
}

/** 결정론적 무작위 — 같은 컨텍스트에서 같은 대사 반환 (재방문 시) */
export function pickNpcLine(npc: NpcDef, trigger: NpcTrigger, seed = Date.now()): string {
  const pool = npc.lines[trigger];
  if (!pool || pool.length === 0) return fallback(npc.lines.idle[0])[0];
  return pool[Math.floor(Math.abs(seed) % pool.length)];
}

/** 가장 적합한 컨텍스트 추정 — 외부에서 store 상태를 보고 선택 */
export function inferContext(ctx: {
  lastVictory?: boolean;
  lastDefeat?: boolean;
  isChapterEnd?: boolean;
  justLevelUp?: boolean;
  soulstones?: number;
}): NpcTrigger {
  if (ctx.justLevelUp) return 'level_up';
  if (ctx.isChapterEnd) return 'after_chapter';
  if (ctx.lastVictory) return 'after_victory';
  if (ctx.lastDefeat) return 'after_defeat';
  if (typeof ctx.soulstones === 'number') {
    if (ctx.soulstones >= 5000) return 'rich';
    if (ctx.soulstones < 100) return 'low_resource';
  }
  return 'idle';
}
