/**
 * A4 마왕 회상 — 1런마다 1번 랜덤 발동.
 *
 * 30개 회상이 모두 보여지면 → 1대 마왕(므렐)의 진명 + 진모습 해금.
 *
 * 각 회상은 3초 짧은 환각 컷 (skippable, banner+sub).
 * 보여지면 store.recallSeen 에 ID 추가.
 */

export interface DemonRecall {
  id: string;
  /** 짧은 한 줄 — 환각 banner */
  flashLine: string;
  /** 풀 본문 (3~4줄) — 도감의 회상 콜렉션에서 보임 */
  body: string;
  /** 회상 분류 */
  category: 'face' | 'voice' | 'name' | 'place' | 'feeling' | 'memory';
}

export const DEMON_RECALLS: DemonRecall[] = [
  { id: 'r01', category: 'face',    flashLine: '낯선 얼굴이 — 떠오른다',
    body: '검은 머리. 회색 눈. 미소짓지 않는 입.\n그 얼굴이 — 어디서 왔는가?\n익숙하지만, 처음 보는 사람.' },
  { id: 'r02', category: 'voice',   flashLine: '귓가에 — 누군가의 목소리',
    body: '"잘 했다." — 두 마디.\n그 목소리는 — 늙은 자의 것이다.\n그 목소리가 — 칭찬을 하고 있다, 누구에게?' },
  { id: 'r03', category: 'name',    flashLine: '이름 — 한 음절이 떠오른다',
    body: '"므..." — 거기서 끊긴다.\n그 다음 음절이 — 떠오르지 않는다.\n언젠가 — 떠오를 것이다.' },
  { id: 'r04', category: 'place',   flashLine: '낯익은 — 풍경',
    body: '거대한 옥좌. 검은 휘장. 횃불 일곱 개.\n이 방을 — 본 적이 있다.\n어디서 — 어떻게?' },
  { id: 'r05', category: 'feeling', flashLine: '가슴이 — 무거워진다',
    body: '이유 없이 — 슬프다.\n무엇을 잃은 것처럼.\n무엇을 잃었는지 — 모른다.' },
  { id: 'r06', category: 'memory',  flashLine: '손이 — 기억한다',
    body: '오래된 검 손잡이의 감각.\n쥐어본 적 없는 검인데 — 익숙하다.\n손이 — 무엇을 기억하는가?' },
  { id: 'r07', category: 'voice',   flashLine: '먼 노래가 — 들린다',
    body: 'Krug의 노래와 — 같은 가락이다.\n그러나 — 누군가 다른 사람이 부르고 있다.\n그 사람이 — 누구인가?' },
  { id: 'r08', category: 'face',    flashLine: '여자의 미소 — 한 컷',
    body: '얼음처럼 차가운 미소.\nIset과 — 닮았다. 그러나 — 더 어렸을 때.\n그녀와 — 무슨 일이 있었던가?' },
  { id: 'r09', category: 'memory',  flashLine: '봉인 — 직전의 한 말',
    body: '"그러나 — 다시 깨어날 것이다."\n그 말을 — 누가 했는가?\n나였을지도 — 모른다.' },
  { id: 'r10', category: 'name',    flashLine: '이름 — 두 음절째',
    body: '"므... 렐..."\n두 번째 음절이 — 마침내 — 들린다.\n전체 이름은 — 아직.' },
  { id: 'r11', category: 'place',   flashLine: '꽃밭 — 보인다',
    body: '이상한 꽃밭. 검은 꽃들.\n마왕이 꽃을 — 좋아했었나?\n아니면 — 누가 그를 위해 — 심었던가?' },
  { id: 'r12', category: 'feeling', flashLine: '분노가 — 끓어오른다',
    body: '이유 없이 — 분노한다.\n누구를 향한 분노인가? — 알 수 없다.\n분노는 — 천 년이 지나도 식지 않는다.' },
  { id: 'r13', category: 'voice',   flashLine: '"내 동료여" — 누군가가 부른다',
    body: '천 년 전의 호칭.\n그 호칭에 — 가슴이 — 답한다.\n누가 — 그렇게 불렀는가?' },
  { id: 'r14', category: 'face',    flashLine: '일곱 — 그림자',
    body: '일곱 빛의 사도 — 그들의 윤곽이 — 보인다.\n각자 다른 무기. 각자 다른 마법.\n그러나 — 모두 — 두려워하는 표정.' },
  { id: 'r15', category: 'memory',  flashLine: '한 번의 — 자비',
    body: '나(므렐)는 — 한 번 자비를 베풀었다.\n그 자비가 — 봉인의 원인이 됐다.\n자비는 — 약함인가, 강함인가?' },
  { id: 'r16', category: 'place',   flashLine: '깊은 — 지하',
    body: '봉인된 곳 — 그곳을 본다.\n어둠 속에서 — 천 년을 — 보냈다.\n어둠은 — 기다림이다.' },
  { id: 'r17', category: 'voice',   flashLine: '아이의 — 웃음',
    body: '아이가 — 웃고 있다.\n누구의 아이인가? — 나의 — 아이?\n마왕에게 — 아이가 — 있을 수 있는가?' },
  { id: 'r18', category: 'feeling', flashLine: '어둠이 — 따뜻하다',
    body: '어둠은 — 차갑지 않다.\n어둠은 — 모든 것을 — 받아들인다.\n그것이 — 마왕의 — 강함이다.' },
  { id: 'r19', category: 'name',    flashLine: '이름 — 세 음절째',
    body: '"므... 렐..."\n그 다음에 — 또 한 음절이 — 있는가?\n아니면 — 그것이 전부인가?' },
  { id: 'r20', category: 'memory',  flashLine: '한 약속',
    body: '"다시 깨어나면 — 봄을 — 보겠다."\n그 약속을 — 누구와 했는가?\nVael... 인가?' },
  { id: 'r21', category: 'face',    flashLine: '왕의 — 얼굴',
    body: '천 년 전 인간 왕의 얼굴.\n오늘 본 인간 왕과 — 닮았다.\n혈통이 — 천 년을 이어졌다.' },
  { id: 'r22', category: 'voice',   flashLine: '"적이 아닌 자들이여"',
    body: '그렇게 — 부른 적이 — 있다.\n누구를 — 그렇게 불렀는가?\n인간을 — 적이 아닌 자라고 — 불렀던가?' },
  { id: 'r23', category: 'place',   flashLine: '신전의 — 첫 모습',
    body: '신전이 — 처음 세워졌을 때.\n나는 그 자리에 있었다.\n신전이 — 무엇을 위해 — 세워졌는지 — 알고 있었다.' },
  { id: 'r24', category: 'feeling', flashLine: '외로움 — 한 자락',
    body: '천 년 전, 마왕은 외로웠다.\n부하들이 있었지만 — 마왕은 외로웠다.\n그것이 — 모든 마왕의 운명인가?' },
  { id: 'r25', category: 'memory',  flashLine: '첫 부하의 — 죽음',
    body: '첫 부하가 — 인간 사도에게 죽었다.\n그르크 — 한쪽 눈 고블린.\nKrug의 동료. 천 년 전 일이다.' },
  { id: 'r26', category: 'face',    flashLine: '거울 속 — 내 얼굴',
    body: '거울을 — 천으로 가렸다.\n자신의 얼굴을 — 보고 싶지 않았다.\n무엇이 — 그렇게 무서웠는가?' },
  { id: 'r27', category: 'voice',   flashLine: '"잘 가" — 그녀의 말',
    body: '봉인 직전, 누군가 — "잘 가" 라고 했다.\n그 목소리는 — Iset과 닮았다.\n그녀가 — 그렇게 인사했는가?' },
  { id: 'r28', category: 'name',    flashLine: '내 이름 — 들린다',
    body: '"므렐(Mrel)" — 누군가 부른다.\n그 이름을 — 받아들이는가?\n받아들이면 — 더 이상 새 마왕이 아니다.' },
  { id: 'r29', category: 'memory',  flashLine: '마지막 — 결정',
    body: '봉인 직전, 마왕은 — 결정했다.\n저항하지 않을 것이다.\n천 년 후 — 다시 깨어날 것이다.\n그 결정을 — 했다.' },
  { id: 'r30', category: 'face',    flashLine: '— 진왕(眞王)의 얼굴 —',
    body: '거울 속 — 1대 마왕 므렐의 — 진짜 얼굴.\n그것은 — 당신의 — 얼굴이다.\n천 년의 — 끝에서 — 마침내 — 알았다.\n당신이 — 므렐이다. 다시 — 돌아왔다.' },
];

export function getRecall(id: string): DemonRecall | undefined {
  return DEMON_RECALLS.find((r) => r.id === id);
}

/** 아직 안 본 회상 중에서 무작위 1개 (없으면 null) */
export function pickUnseenRecall(seenIds: string[]): DemonRecall | null {
  const unseen = DEMON_RECALLS.filter((r) => !seenIds.includes(r.id));
  if (unseen.length === 0) return null;
  // r30(진왕 얼굴)는 마지막 — 다른 29개 모두 본 후에만
  if (unseen.length === 1 && unseen[0].id === 'r30') return unseen[0];
  const filtered = unseen.filter((r) => r.id !== 'r30');
  if (filtered.length === 0) return DEMON_RECALLS.find((r) => r.id === 'r30')!;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/** 마지막 진명 해금 여부 */
export function isTrueNameRevealed(seenIds: string[]): boolean {
  return seenIds.includes('r30');
}
