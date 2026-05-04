import { useMemo, useState } from 'react';

type Screen = 'home' | 'battle' | 'upgrade' | 'bestiary';

const mvpStats = {
  soulstones: 0,
  bestWave: 0,
  nextStage: '1-1 첫 침입',
  nextGoal: '5웨이브에서 기사단장을 막아내기',
};

const upgrades = [
  { name: '마왕성 HP', level: 0, effect: '성 체력 +10%' },
  { name: '시작 마력', level: 0, effect: '첫 카드 선택을 더 빠르게' },
  { name: '카드 비용 감소', level: 0, effect: '소환 템포 개선' },
  { name: '몬스터 공격력', level: 0, effect: '용사 처치 속도 증가' },
  { name: '몬스터 체력', level: 0, effect: '전선 유지력 증가' },
];

const monsters = [
  { icon: '🟣', name: '슬라임', role: '탱커', note: '앞에서 시간을 번다.' },
  { icon: '🟢', name: '고블린', role: '근접 딜러', note: '빠르게 달려들어 공격한다.' },
  { icon: '💀', name: '스켈레톤', role: '물량', note: '여럿이 모이면 강해진다.' },
  { icon: '🔥', name: '임프', role: '원거리', note: '불꽃으로 뒤에서 지원한다.' },
];

function screenTitle(screen: Screen) {
  if (screen === 'battle') return '전투 준비';
  if (screen === 'upgrade') return '영혼 강화';
  if (screen === 'bestiary') return '도감';
  return '마왕성';
}

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const statusText = useMemo(() => {
    if (screen === 'home') return '핵심 루프만 남긴 MVP 셸';
    if (screen === 'battle') return '다음 브랜치에서 Canvas 전장을 연결';
    if (screen === 'upgrade') return '죽고 얻은 영혼석으로 영구 성장';
    return '카드와 적 정보를 천천히 확장';
  }, [screen]);

  return (
    <main className="app-shell">
      <header className="top-bar">
        <button className="brand" type="button" onClick={() => setScreen('home')}>
          <span className="brand-mark">魔</span>
          <span>
            <strong>Maowang Defense</strong>
            <small>{statusText}</small>
          </span>
        </button>
        <div className="resource-row" aria-label="player resources">
          <span>영혼석 {mvpStats.soulstones}</span>
          <span>최고 W{mvpStats.bestWave}</span>
        </div>
      </header>

      <section className="phone-frame" aria-label={screenTitle(screen)}>
        <nav className="screen-tabs" aria-label="MVP screens">
          <button className={screen === 'home' ? 'active' : ''} onClick={() => setScreen('home')} type="button">
            마왕성
          </button>
          <button className={screen === 'battle' ? 'active' : ''} onClick={() => setScreen('battle')} type="button">
            전투
          </button>
          <button className={screen === 'upgrade' ? 'active' : ''} onClick={() => setScreen('upgrade')} type="button">
            강화
          </button>
          <button className={screen === 'bestiary' ? 'active' : ''} onClick={() => setScreen('bestiary')} type="button">
            도감
          </button>
        </nav>

        {screen === 'home' && <HomeScreen onNavigate={setScreen} />}
        {screen === 'battle' && <BattleScreen />}
        {screen === 'upgrade' && <UpgradeScreen />}
        {screen === 'bestiary' && <BestiaryScreen />}
      </section>
    </main>
  );
}

function HomeScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <div className="screen-content home-screen">
      <div className="demon-card">
        <div className="demon-orb" aria-hidden="true">👑</div>
        <div>
          <p className="eyebrow">봉인된 마왕</p>
          <h1>성을 지키고, 죽을수록 강해진다.</h1>
          <p className="lead">
            지금 MVP에서는 복잡한 시즌/PVP/상점은 숨기고 카드 소환 디펜스의 핵심만 검증합니다.
          </p>
        </div>
      </div>

      <div className="goal-card">
        <span>다음 스테이지</span>
        <strong>{mvpStats.nextStage}</strong>
        <p>{mvpStats.nextGoal}</p>
      </div>

      <div className="primary-actions">
        <button type="button" onClick={() => onNavigate('battle')}>전투 시작</button>
        <button type="button" onClick={() => onNavigate('upgrade')}>영혼 강화</button>
        <button type="button" onClick={() => onNavigate('bestiary')}>도감 보기</button>
      </div>
    </div>
  );
}

function BattleScreen() {
  return (
    <div className="screen-content battle-screen">
      <div className="battlefield-preview">
        <div className="castle">🏰</div>
        <div className="lane">
          <span className="summon-point">소환</span>
          <span className="enemy-point">용사</span>
        </div>
      </div>
      <div className="card-tray-preview">
        {['슬라임', '고블린', '스켈레톤'].map((card) => (
          <button type="button" key={card}>
            <span>카드</span>
            <strong>{card}</strong>
          </button>
        ))}
      </div>
      <p className="helper-text">
        다음 브랜치에서는 이 영역에 Canvas 전장과 실제 카드 선택 루프를 붙입니다.
      </p>
    </div>
  );
}

function UpgradeScreen() {
  return (
    <div className="screen-content">
      <div className="section-heading">
        <p className="eyebrow">Run reward loop</p>
        <h2>첫 MVP 강화 5종</h2>
      </div>
      <div className="upgrade-list">
        {upgrades.map((upgrade) => (
          <article key={upgrade.name} className="upgrade-card">
            <div>
              <strong>{upgrade.name}</strong>
              <p>{upgrade.effect}</p>
            </div>
            <span>Lv.{upgrade.level}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function BestiaryScreen() {
  return (
    <div className="screen-content">
      <div className="section-heading">
        <p className="eyebrow">Card pool</p>
        <h2>초기 몬스터 후보</h2>
      </div>
      <div className="monster-grid">
        {monsters.map((monster) => (
          <article key={monster.name} className="monster-card">
            <span>{monster.icon}</span>
            <strong>{monster.name}</strong>
            <small>{monster.role}</small>
            <p>{monster.note}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
