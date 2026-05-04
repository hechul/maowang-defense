/**
 * AudioEngine — SOUND_ENGINEER_PROMPT §아키텍처 정확 준수
 * - AudioContext 싱글톤
 * - 마스터 게인 체인: 개별 → 카테고리(sfx/bgm/ui) → 마스터 → destination
 * - ADSR 정밀 적용
 * - autoplay 정책 대응 (resume on first gesture)
 * - visibilitychange suspend/resume
 */

class AudioEngineImpl {
  private actx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private uiGain: GainNode | null = null;

  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmActiveTrack: string | null = null;

  // SFX 동시 재생 제한 (SOUND_ENGINEER §믹싱 — 최대 3개)
  private activeSfx = 0;
  private readonly MAX_CONCURRENT_SFX = 3;

  ensure(): AudioContext | null {
    if (!this.actx) {
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return null;
        const actx: AudioContext = new Ctx();
        const masterGain = actx.createGain(); masterGain.gain.value = 1.0;
        const sfxGain = actx.createGain(); sfxGain.gain.value = 0.8;
        const bgmGain = actx.createGain(); bgmGain.gain.value = 0.4;
        const uiGain = actx.createGain(); uiGain.gain.value = 0.6;
        sfxGain.connect(masterGain);
        bgmGain.connect(masterGain);
        uiGain.connect(masterGain);
        masterGain.connect(actx.destination);
        this.actx = actx;
        this.masterGain = masterGain;
        this.sfxGain = sfxGain;
        this.bgmGain = bgmGain;
        this.uiGain = uiGain;
      } catch (e) {
        return null;
      }
    }
    if (this.actx && this.actx.state === 'suspended') {
      this.actx.resume().catch(() => {});
    }
    return this.actx;
  }

  // ADSR (팝/클릭 방지: 최소 5ms attack)
  private adsr(g: GainNode, vol: number, t0: number, a: number, d: number, s: number, r: number) {
    const aT = Math.max(0.005, a);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + aT);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * s), t0 + aT + d);
    if (r > 0) g.gain.exponentialRampToValueAtTime(0.0001, t0 + aT + d + r);
  }

  private tone(opt: {
    freq: number; dur: number; type?: OscillatorType; vol?: number;
    slideTo?: number; slideDur?: number;
    a?: number; d?: number; s?: number; r?: number;
    vibrato?: number; vibratoDepth?: number;
    dest?: GainNode | null;
  }) {
    const c = this.ensure(); if (!c) return;
    const dest = opt.dest || this.sfxGain;
    if (!dest) return;
    // SFX 동시 재생 제한 (UI/BGM은 카테고리 게인이 다름 → 영향 X)
    const isSfx = dest === this.sfxGain;
    if (isSfx && this.activeSfx >= this.MAX_CONCURRENT_SFX) return;
    if (isSfx) this.activeSfx++;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = opt.type || 'square';
    const t0 = c.currentTime;
    o.frequency.setValueAtTime(opt.freq, t0);
    if (opt.slideTo != null) {
      const sd = opt.slideDur != null ? opt.slideDur : opt.dur;
      o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.slideTo), t0 + sd);
    }
    if (opt.vibrato) {
      const vibLfo = c.createOscillator();
      vibLfo.frequency.value = opt.vibrato;
      const vibG = c.createGain(); vibG.gain.value = opt.vibratoDepth || 0;
      vibLfo.connect(vibG); vibG.connect(o.frequency);
      vibLfo.start(t0); vibLfo.stop(t0 + opt.dur + (opt.r || 0.01) + 0.05);
    }
    this.adsr(g, opt.vol ?? 0.15, t0, opt.a ?? 0.005, opt.d ?? 0.05, opt.s ?? 0.001, opt.r ?? 0.01);
    o.connect(g); g.connect(dest);
    o.start(t0);
    const stopAt = t0 + opt.dur + (opt.r || 0.01) + 0.05;
    o.stop(stopAt);
    if (isSfx) {
      o.onended = () => { this.activeSfx = Math.max(0, this.activeSfx - 1); };
    }
  }

  private noise(opt: {
    dur: number; vol?: number; type?: BiquadFilterType; freq?: number; q?: number;
    filterFreqEnd?: number; filterDur?: number;
    a?: number; d?: number; s?: number; r?: number;
    dest?: GainNode | null;
  }) {
    const c = this.ensure(); if (!c) return;
    const dest = opt.dest || this.sfxGain;
    if (!dest) return;
    const isSfx = dest === this.sfxGain;
    if (isSfx && this.activeSfx >= this.MAX_CONCURRENT_SFX) return;
    if (isSfx) this.activeSfx++;
    const len = Math.max(1, Math.floor(c.sampleRate * (opt.dur + (opt.r || 0.01))));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const dat = buf.getChannelData(0);
    for (let i = 0; i < len; i++) dat[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = opt.type || 'bandpass';
    f.frequency.value = opt.freq || 1000;
    f.Q.value = opt.q || 1;
    const t0 = c.currentTime;
    if (opt.filterFreqEnd != null) {
      f.frequency.setValueAtTime(opt.freq || 1000, t0);
      f.frequency.exponentialRampToValueAtTime(Math.max(20, opt.filterFreqEnd), t0 + (opt.filterDur || opt.dur));
    }
    const g = c.createGain();
    this.adsr(g, opt.vol ?? 0.15, t0, opt.a ?? 0.001, opt.d ?? 0.04, opt.s ?? 0.001, opt.r ?? 0.01);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t0);
    src.stop(t0 + opt.dur + (opt.r || 0.01) + 0.05);
    if (isSfx) {
      src.onended = () => { this.activeSfx = Math.max(0, this.activeSfx - 1); };
    }
  }

  /* ============ 25 SFX (SOUND §명세 정확) ============ */
  ui_tap()      { this.tone({ freq: 800, dur: 0.05, vol: 0.15, dest: this.uiGain }); }
  ui_confirm()  { this.tone({ freq: 600, slideTo: 900, slideDur: 0.08, dur: 0.12, vol: 0.20, d: 0.08, s: 0.1, r: 0.04, dest: this.uiGain }); }
  ui_cancel()   { this.tone({ freq: 500, slideTo: 300, slideDur: 0.08, dur: 0.10, vol: 0.15, d: 0.08, r: 0.02, dest: this.uiGain }); }
  ui_error()    {
    this.tone({ freq: 200, slideTo: 150, dur: 0.20, vol: 0.20, d: 0.15, r: 0.05, dest: this.uiGain });
    setTimeout(() => this.tone({ freq: 200, slideTo: 150, dur: 0.20, vol: 0.20, d: 0.15, r: 0.05, dest: this.uiGain }), 100);
  }
  ui_navigate() { this.tone({ freq: 400, slideTo: 600, dur: 0.08, type: 'triangle', vol: 0.10, d: 0.06, r: 0.02, dest: this.uiGain }); }

  cardReveal_start()  {
    this.tone({ freq: 300, slideTo: 1200, slideDur: 0.18, dur: 0.20, vol: 0.20, d: 0.15, s: 0.05, r: 0.05 });
    this.noise({ dur: 0.08, vol: 0.10, freq: 2000, q: 2 });
  }
  cardReveal_tick()   { this.tone({ freq: 1000, dur: 0.03, vol: 0.12, a: 0.001, d: 0.03 }); }
  cardReveal_stop()   {
    this.tone({ freq: 800, dur: 0.15, vol: 0.20, d: 0.10, r: 0.05 });
    this.tone({ freq: 400, dur: 0.15, type: 'triangle', vol: 0.18, d: 0.10, r: 0.05 });
  }
  cardReroll_sfx() {
    this.tone({ freq: 400, slideTo: 200, slideDur: 0.10, dur: 0.10, type: 'sawtooth', vol: 0.18, d: 0.08, s: 0.05, r: 0.02 });
    setTimeout(() => this.tone({ freq: 200, slideTo: 600, slideDur: 0.20, dur: 0.20, type: 'sawtooth', vol: 0.20, d: 0.15, s: 0.05, r: 0.05 }), 100);
  }

  summon_common()    { this.tone({ freq: 300, slideTo: 500, dur: 0.20, type: 'triangle', vol: 0.20, d: 0.15, s: 0.05, r: 0.05 }); }
  summon_rare()      {
    const notes = [262, 330, 392];
    notes.forEach((n, i) => setTimeout(() => {
      this.tone({ freq: n, dur: 0.12, vol: 0.20, d: 0.10, s: 0.05, r: 0.03 });
      this.tone({ freq: n, dur: 0.12, type: 'triangle', vol: 0.10, d: 0.10, s: 0.05, r: 0.03 });
    }, i * 100));
  }
  summon_epic()      {
    const notes = [262, 330, 392, 523];
    notes.forEach((n, i) => {
      const last = i === notes.length - 1;
      setTimeout(() => {
        this.tone({
          freq: n, dur: last ? 0.30 : 0.12, vol: 0.25,
          d: last ? 0.05 : 0.10, s: last ? 0.4 : 0.05, r: last ? 0.20 : 0.03,
          vibrato: last ? 5 : 0, vibratoDepth: last ? 8 : 0,
        });
      }, i * 100);
    });
  }
  summon_legendary() {
    this.tone({ freq: 100, dur: 1.0, type: 'sawtooth', vol: 0.20, a: 0.05, d: 0.3, s: 0.5, r: 0.2 });
    [262, 330, 392, 523, 659].forEach((n, i) => setTimeout(() => {
      this.tone({
        freq: n, dur: i === 4 ? 0.30 : 0.10, vol: 0.25,
        d: 0.05, s: i === 4 ? 0.5 : 0.05, r: 0.10,
        vibrato: i === 4 ? 6 : 0, vibratoDepth: 10,
      });
    }, i * 80));
    setTimeout(() => this.noise({ dur: 0.4, vol: 0.15, type: 'highpass', freq: 5000, q: 1, d: 0.3, s: 0.1, r: 0.1 }), 800);
  }

  attack_melee()  {
    this.noise({ dur: 0.06, vol: 0.20, type: 'lowpass', freq: 1500, filterFreqEnd: 300, filterDur: 0.06, d: 0.05, r: 0.02 });
    this.tone({ freq: 300, dur: 0.06, vol: 0.10, d: 0.05, r: 0.02 });
  }
  attack_magic()  { this.tone({ freq: 800, slideTo: 400, slideDur: 0.12, dur: 0.15, vol: 0.20, d: 0.10, s: 0.05, r: 0.05, vibrato: 8, vibratoDepth: 30 }); }
  attack_ranged() { this.noise({ dur: 0.10, vol: 0.15, type: 'highpass', freq: 2000, filterFreqEnd: 800, filterDur: 0.10, d: 0.08, s: 0.05, r: 0.02 }); }
  hit_damage()    {
    this.noise({ dur: 0.08, vol: 0.18, type: 'lowpass', freq: 1200, q: 1.5, d: 0.06, s: 0.05, r: 0.02 });
    this.tone({ freq: 150, dur: 0.10, type: 'triangle', vol: 0.20, d: 0.08, s: 0.05, r: 0.02 });
  }
  death_enemy()   { this.noise({ dur: 0.20, vol: 0.18, type: 'lowpass', freq: 1500, filterFreqEnd: 200, filterDur: 0.20, d: 0.18, s: 0.05, r: 0.02 }); }
  death_ally()    { this.tone({ freq: 400, slideTo: 100, slideDur: 0.30, dur: 0.40, type: 'triangle', vol: 0.18, d: 0.30, s: 0.05, r: 0.10 }); }
  critical_hit()  {
    this.noise({ dur: 0.12, vol: 0.20, type: 'bandpass', freq: 1500, q: 3, d: 0.10, s: 0.05, r: 0.02 });
    this.tone({ freq: 1000, dur: 0.15, vol: 0.25, d: 0.10, s: 0.05, r: 0.05 });
    this.tone({ freq: 500, dur: 0.15, type: 'triangle', vol: 0.18, d: 0.10, s: 0.05, r: 0.05 });
  }

  evolve_sfx() {
    [262, 330, 392, 523, 659, 784].forEach((n, i) => setTimeout(() => {
      this.tone({ freq: n, dur: 0.10, vol: 0.25, d: 0.08, s: 0.1, r: 0.03 });
      this.tone({ freq: n / 2, dur: 0.10, type: 'triangle', vol: 0.10, d: 0.08, s: 0.1, r: 0.03 });
    }, i * 80));
    setTimeout(() => this.noise({ dur: 0.30, vol: 0.15, type: 'highpass', freq: 6000, d: 0.25, s: 0.1, r: 0.05 }), 6 * 80);
  }
  wave_start() {
    const beep = (offset: number) => setTimeout(() => {
      this.tone({ freq: 200, dur: 0.12, type: 'triangle', vol: 0.20, d: 0.10, s: 0.1, r: 0.03 });
      setTimeout(() => this.tone({ freq: 300, dur: 0.18, type: 'triangle', vol: 0.20, d: 0.15, s: 0.1, r: 0.05 }), 120);
      setTimeout(() => this.tone({ freq: 200, dur: 0.12, type: 'triangle', vol: 0.18, d: 0.10, s: 0.1, r: 0.03 }), 280);
    }, offset);
    beep(0); beep(500);
  }
  boss_alert() {
    this.tone({ freq: 100, dur: 1.5, type: 'sawtooth', vol: 0.30, a: 0.5, d: 0.5, s: 0.5, r: 0.3 });
    this.noise({ dur: 1.5, vol: 0.10, type: 'lowpass', freq: 500, a: 0.3, d: 0.5, s: 0.4, r: 0.3 });
    this.tone({ freq: 80, dur: 1.5, type: 'triangle', vol: 0.20, a: 0.3, d: 0.5, s: 0.5, r: 0.3 });
  }
  game_over_sfx() {
    [330, 294, 262, 247, 220].forEach((n, i) => setTimeout(() => {
      this.tone({ freq: n, dur: 0.20, type: 'triangle', vol: 0.25, d: 0.15, s: 0.1, r: 0.05 });
      this.tone({ freq: n * 0.5, dur: 0.20, vol: 0.10, d: 0.15, s: 0.1, r: 0.05 });
    }, i * 200));
  }
  ultimate_sfx() {
    this.tone({ freq: 80, dur: 1.2, type: 'sawtooth', vol: 0.30, a: 0.05, d: 0.3, s: 0.5, r: 0.3 });
    this.tone({ freq: 200, slideTo: 1500, slideDur: 0.5, dur: 0.5, vol: 0.25, d: 0.4, s: 0.1, r: 0.05 });
    setTimeout(() => this.noise({ dur: 0.20, vol: 0.30, type: 'lowpass', freq: 1000, q: 1, d: 0.18, s: 0.1, r: 0.05 }), 400);
    setTimeout(() => this.tone({ freq: 800, dur: 0.50, type: 'triangle', vol: 0.20, d: 0.40, s: 0.2, r: 0.10 }), 600);
  }

  luckySummon_sfx() {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        this.tone({ freq: 500 + i * 100, dur: 0.10, vol: 0.25, d: 0.08, s: 0.1, r: 0.03 });
        this.tone({ freq: 1000 + i * 150, dur: 0.10, type: 'triangle', vol: 0.10, d: 0.08, s: 0.1, r: 0.03 });
      }, i * 60);
    }
    setTimeout(() => this.noise({ dur: 0.3, vol: 0.15, type: 'highpass', freq: 6000, d: 0.25, s: 0.1, r: 0.05 }), 8 * 60);
  }
  relic_sfx() {
    [659, 784, 1047, 1319].forEach((n, i) => setTimeout(() => this.tone({ freq: n, dur: 0.15, type: 'sine', vol: 0.18, d: 0.10, s: 0.2, r: 0.05 }), i * 80));
  }

  /* ============ BGM 4곡 시퀀서 ============ */
  private noteFreq(name: string): number {
    const m: Record<string, number> = {};
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (let oct = 1; oct <= 6; oct++) {
      for (let i = 0; i < 12; i++) {
        const n = (oct - 4) * 12 + (i - 9);
        m[names[i] + oct] = 440 * Math.pow(2, n / 12);
      }
    }
    return m[name] || 0;
  }

  private getTrack(name: string) {
    const N = (n: string) => this.noteFreq(n);
    const tracks: Record<string, any> = {
      title: {
        bpm: 100,
        melody: [N('F5'), 0, N('A5'), 0, N('C5'), 0, N('A5'), 0, N('A5'), 0, N('C5'), 0, N('E5'), 0, N('C5'), 0, N('A#5'), 0, N('D5'), 0, N('F5'), 0, N('D5'), 0, N('C5'), 0, N('E5'), 0, N('G5'), 0, N('E5'), 0],
        bass:   [N('F2'), 0, N('F2'), 0, N('F2'), 0, N('C3'), 0, N('A2'), 0, N('A2'), 0, N('A2'), 0, N('E3'), 0, N('A#2'), 0, N('A#2'), 0, N('A#2'), 0, N('F3'), 0, N('C3'), 0, N('C3'), 0, N('C3'), 0, N('G3'), 0],
        drum:   ['K','H','_','H','S','H','_','H','K','H','_','H','S','H','_','H','K','H','_','H','S','H','_','H','K','H','K','H','S','H','S','H'],
      },
      battle: {
        bpm: 140,
        melody: [N('A4'), N('C5'), N('E5'), N('A5'), N('E5'), N('C5'), N('A4'), N('E5'), N('F4'), N('A4'), N('C5'), N('F5'), N('C5'), N('A4'), N('F4'), N('C5'), N('C5'), N('E5'), N('G5'), N('C6'), N('G5'), N('E5'), N('C5'), N('G5'), N('G4'), N('B4'), N('D5'), N('G5'), N('D5'), N('B4'), N('G4'), N('D5')],
        bass:   [N('A2'), 0, N('A2'), 0, N('E3'), 0, N('A2'), 0, N('F2'), 0, N('F2'), 0, N('C3'), 0, N('F2'), 0, N('C3'), 0, N('C3'), 0, N('G3'), 0, N('C3'), 0, N('G2'), 0, N('G2'), 0, N('D3'), 0, N('G2'), 0],
        drum:   ['K','H','S','H','K','H','S','H','K','H','S','H','K','H','S','H','K','H','S','H','K','H','S','H','K','H','S','H','K','K','S','S'],
      },
      boss: {
        bpm: 160,
        melody: [N('E4'), N('G4'), N('B4'), N('E5'), N('B4'), N('G4'), N('E4'), N('B4'), N('C4'), N('E4'), N('G4'), N('C5'), N('G4'), N('E4'), N('C4'), N('G4'), N('D4'), N('F#4'), N('A4'), N('D5'), N('A4'), N('F#4'), N('D4'), N('A4'), N('B3'), N('D#4'), N('F#4'), N('B4'), N('F#4'), N('D#4'), N('B3'), N('F#4')],
        bass:   [N('E2'), 0, N('E2'), 0, N('B2'), 0, N('E2'), 0, N('C2'), 0, N('C2'), 0, N('G2'), 0, N('C2'), 0, N('D2'), 0, N('D2'), 0, N('A2'), 0, N('D2'), 0, N('B2'), 0, N('B2'), 0, N('F#2'), 0, N('B2'), 0],
        drum:   ['K','H','S','H','K','K','S','H','K','H','S','H','K','K','S','H','K','H','S','H','K','K','S','H','K','K','S','S','K','K','S','S'],
      },
      result: {
        bpm: 95,
        melody: [N('C5'), 0, N('E5'), 0, N('G5'), 0, N('E5'), 0, N('A4'), 0, N('C5'), 0, N('E5'), 0, N('C5'), 0, N('F4'), 0, N('A4'), 0, N('C5'), 0, N('A4'), 0, N('G4'), 0, N('B4'), 0, N('D5'), 0, N('B4'), 0],
        bass:   [N('C3'), 0, 0, 0, 0, 0, 0, 0, N('A2'), 0, 0, 0, 0, 0, 0, 0, N('F2'), 0, 0, 0, 0, 0, 0, 0, N('G2'), 0, 0, 0, 0, 0, 0, 0],
        drum:   null,
      },
      // OVERHAUL §4.3: 던전 층별 BGM 5종 — 짧은 변주
      // 1층 봉인의 입구 — battle 변주, 차분
      stratum_sealed_gate: {
        bpm: 130,
        melody: [N('A4'), 0, N('C5'), 0, N('E5'), 0, N('A4'), 0, N('F4'), 0, N('A4'), 0, N('C5'), 0, N('F4'), 0, N('G4'), 0, N('B4'), 0, N('D5'), 0, N('G4'), 0, N('E4'), 0, N('G4'), 0, N('B4'), 0, N('E4'), 0],
        bass:   [N('A2'), 0, 0, 0, N('E3'), 0, 0, 0, N('F2'), 0, 0, 0, N('C3'), 0, 0, 0, N('G2'), 0, 0, 0, N('D3'), 0, 0, 0, N('E2'), 0, 0, 0, N('B2'), 0, 0, 0],
        drum:   ['K','H','_','H','K','H','S','H','K','H','_','H','K','H','S','H','K','H','_','H','K','H','S','H','K','H','_','H','K','H','S','H'],
      },
      // 2층 잊혀진 묘지 — 어둡고 긴장
      stratum_forgotten_grave: {
        bpm: 110,
        melody: [N('D4'), 0, 0, N('F4'), N('A4'), 0, 0, N('F4'), N('D4'), 0, 0, N('A4'), N('D5'), 0, 0, N('A4'), N('C4'), 0, 0, N('E4'), N('G4'), 0, 0, N('E4'), N('B3'), 0, 0, N('D4'), N('F4'), 0, 0, N('D4')],
        bass:   [N('D2'), 0, 0, 0, N('A2'), 0, 0, 0, N('D2'), 0, 0, 0, N('A2'), 0, 0, 0, N('C2'), 0, 0, 0, N('G2'), 0, 0, 0, N('B2'), 0, 0, 0, N('F#2'), 0, 0, 0],
        drum:   ['K','_','_','H','_','_','S','_','K','_','_','H','_','_','S','_','K','_','_','H','_','_','S','_','K','_','_','H','K','K','S','_'],
      },
      // 3층 화염 전당 — 빠르고 강렬
      stratum_flame_hall: {
        bpm: 165,
        melody: [N('E5'), N('G5'), N('A5'), N('B5'), N('A5'), N('G5'), N('E5'), N('B4'), N('C5'), N('E5'), N('G5'), N('A5'), N('G5'), N('E5'), N('C5'), N('G4'), N('D5'), N('F5'), N('A5'), N('B5'), N('A5'), N('F5'), N('D5'), N('A4'), N('B4'), N('D5'), N('F5'), N('A5'), N('F5'), N('D5'), N('B4'), N('F4')],
        bass:   [N('E2'), N('E2'), 0, N('B2'), N('E2'), N('E2'), 0, N('B2'), N('C2'), N('C2'), 0, N('G2'), N('C2'), N('C2'), 0, N('G2'), N('D2'), N('D2'), 0, N('A2'), N('D2'), N('D2'), 0, N('A2'), N('B2'), N('B2'), 0, N('F#2'), N('B2'), N('B2'), 0, N('F#2')],
        drum:   ['K','H','K','H','S','H','K','H','K','H','K','H','S','S','K','S','K','H','K','H','S','H','K','H','K','K','S','S','K','S','K','S'],
      },
      // 4층 광기의 미궁 — 불협화 / 보스 톤
      stratum_mad_labyrinth: {
        bpm: 145,
        melody: [N('E4'), N('G#4'), N('B4'), N('D#5'), N('B4'), N('G#4'), N('E4'), N('D#5'), N('A4'), N('C#5'), N('E5'), N('A5'), N('E5'), N('C#5'), N('A4'), N('E5'), N('F#4'), N('A#4'), N('C#5'), N('F#5'), N('C#5'), N('A#4'), N('F#4'), N('C#5'), N('D4'), N('F#4'), N('A4'), N('D5'), N('A4'), N('F#4'), N('D4'), N('A4')],
        bass:   [N('E2'), 0, 0, N('B2'), N('E2'), 0, 0, N('B2'), N('A2'), 0, 0, N('E3'), N('A2'), 0, 0, N('E3'), N('F#2'), 0, 0, N('C#3'), N('F#2'), 0, 0, N('C#3'), N('D2'), 0, 0, N('A2'), N('D2'), 0, 0, N('A2')],
        drum:   ['K','K','S','H','K','H','S','S','K','K','S','H','K','H','S','S','K','K','S','H','K','H','S','S','K','K','S','S','K','S','K','S'],
      },
      // 5층 신의 영역 — 황금 톤
      stratum_divine_realm: {
        bpm: 155,
        melody: [N('C5'), N('E5'), N('G5'), N('C6'), N('G5'), N('E5'), N('C5'), N('G5'), N('F4'), N('A4'), N('C5'), N('F5'), N('C5'), N('A4'), N('F4'), N('C5'), N('G4'), N('B4'), N('D5'), N('G5'), N('D5'), N('B4'), N('G4'), N('D5'), N('A4'), N('C5'), N('E5'), N('A5'), N('E5'), N('C5'), N('A4'), N('E5')],
        bass:   [N('C2'), 0, N('G2'), 0, N('C3'), 0, N('G2'), 0, N('F2'), 0, N('C3'), 0, N('F2'), 0, N('C3'), 0, N('G2'), 0, N('D3'), 0, N('G2'), 0, N('D3'), 0, N('A2'), 0, N('E3'), 0, N('A2'), 0, N('E3'), 0],
        drum:   ['K','H','S','H','K','K','S','H','K','H','S','H','K','K','S','H','K','H','S','H','K','K','S','H','K','K','S','S','K','K','S','S'],
      },
    };
    return tracks[name];
  }

  private drumHit(type: string) {
    if (type === 'K') this.tone({ freq: 120, slideTo: 50, slideDur: 0.08, dur: 0.10, type: 'sine', vol: 0.30, a: 0.001, d: 0.08, r: 0.02, dest: this.bgmGain });
    else if (type === 'S') {
      this.noise({ dur: 0.08, vol: 0.20, type: 'highpass', freq: 1500, q: 1, a: 0.001, d: 0.06, r: 0.02, dest: this.bgmGain });
      this.tone({ freq: 200, dur: 0.05, type: 'triangle', vol: 0.10, a: 0.001, d: 0.04, r: 0.01, dest: this.bgmGain });
    } else if (type === 'H') {
      this.noise({ dur: 0.04, vol: 0.10, type: 'highpass', freq: 6000, q: 0.5, a: 0.001, d: 0.03, r: 0.01, dest: this.bgmGain });
    }
  }

  bgmStart(trackName = 'battle') {
    this.bgmStop();
    const track = this.getTrack(trackName);
    if (!track) return;
    this.ensure();
    this.bgmActiveTrack = trackName;
    this.bgmStep = 0;
    const stepDur = 60 / track.bpm / 2;
    const stepLen = track.melody.length;
    this.bgmTimer = window.setInterval(() => {
      const i = this.bgmStep % stepLen;
      const m = track.melody[i];
      if (m) this.tone({ freq: m, dur: stepDur * 0.9, vol: 0.10, a: 0.005, d: 0.08, s: 0.3, r: 0.05, dest: this.bgmGain });
      const b = track.bass[i];
      if (b) this.tone({ freq: b, dur: stepDur * 0.95, type: 'triangle', vol: 0.18, a: 0.005, d: 0.08, s: 0.3, r: 0.05, dest: this.bgmGain });
      if (track.drum && track.drum[i]) this.drumHit(track.drum[i]);
      this.bgmStep++;
    }, stepDur * 1000);
  }

  bgmStop() {
    if (this.bgmTimer != null) { clearInterval(this.bgmTimer); this.bgmTimer = null; }
    this.bgmActiveTrack = null;
  }

  bgmCrossfade(toTrack: string, ms = 500) {
    const c = this.ensure(); if (!c || !this.bgmGain) { this.bgmStart(toTrack); return; }
    const startTime = c.currentTime;
    this.bgmGain.gain.cancelScheduledValues(startTime);
    this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, startTime);
    this.bgmGain.gain.linearRampToValueAtTime(0.0001, startTime + ms / 2000);
    setTimeout(() => {
      this.bgmStart(toTrack);
      if (this.bgmGain && this.actx) {
        this.bgmGain.gain.setValueAtTime(0.0001, this.actx.currentTime);
        this.bgmGain.gain.linearRampToValueAtTime(0.4, this.actx.currentTime + ms / 2000);
      }
    }, ms / 2);
  }

  setMasterVolume(v: number) { if (this.masterGain) this.masterGain.gain.value = v; }
  setBgmVolume(v: number)    { if (this.bgmGain)    this.bgmGain.gain.value = v; }
  setSfxVolume(v: number)    { if (this.sfxGain)    this.sfxGain.gain.value = v; }

  // 백그라운드/포그라운드 전환 (AIT §검수영역3)
  attachVisibilityHandler() {
    const onVisChange = () => {
      const c = this.ensure(); if (!c) return;
      if (document.hidden) {
        try { c.suspend(); } catch (e) {}
      } else {
        try { c.resume(); } catch (e) {}
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }
}

export const Audio = new AudioEngineImpl();
// 모듈 로드 시 visibilitychange 자동 등록
if (typeof document !== 'undefined') Audio.attachVisibilityHandler();
