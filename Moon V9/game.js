// =========================================================================
// OFICIAL DE ESCLUSA — REVISIÓN #5 (GUNMETAL, AVATARES VIVOS Y TYPEWRITER)
// NASA SPACE APPS // ENTRENADOR DE MISIÓN ARTEMIS (VANILLA JS ES6+)
// =========================================================================

(() => {
  'use strict';

  const STORAGE_KEY = 'airlock_quartermaster_save_v26';
  window.GAME_SCALE = 1;
  const BASE_WIDTH = 1440;
  const BASE_HEIGHT = 900;

  // =======================================================================
  // CONFIGURACIÓN GLOBAL Y PERSISTENCIA (0% a 100% minijuegos, Idioma ES/EN)
  // =======================================================================
  const savedMinigameChance = localStorage.getItem('lunar_minigame_chance');
  const savedLang = localStorage.getItem('lunar_lang') || 'es';
  window.GAME_SETTINGS = {
    minigameChance: savedMinigameChance !== null ? Math.max(0, Math.min(1, parseFloat(savedMinigameChance))) : 0.60,
    lang: (savedLang === 'en') ? 'en' : 'es'
  };

  function getMinigameProbability() {
    const slider = document.getElementById('settings-minigame-slider');
    if (slider && slider.value !== undefined && slider.value !== '') {
      const rawVal = parseFloat(slider.value);
      if (!isNaN(rawVal)) {
        const prob = rawVal > 1.0 ? rawVal / 100 : rawVal;
        const clamped = Math.max(0, Math.min(1, prob));
        if (window.GAME_SETTINGS) window.GAME_SETTINGS.minigameChance = clamped;
        return clamped;
      }
    }

    if (window.GAME_SETTINGS && typeof window.GAME_SETTINGS.minigameChance === 'number') {
      const c = window.GAME_SETTINGS.minigameChance;
      return Math.max(0, Math.min(1, c > 1.0 ? c / 100 : c));
    }

    try {
      const stored = localStorage.getItem('lunar_minigame_chance');
      if (stored !== null) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed)) {
          const prob = parsed > 1.0 ? parsed / 100 : parsed;
          const clamped = Math.max(0, Math.min(1, prob));
          if (window.GAME_SETTINGS) window.GAME_SETTINGS.minigameChance = clamped;
          return clamped;
        }
      }
    } catch (_) {}

    return 0.60;
  }
  window.getMinigameProbability = getMinigameProbability;

  let currentUiScale = 1;
  let prevDeskSize = { w: 0, h: 0 };

  // =======================================================================
  // 1. SINTETIZADOR DE AUDIO SCI-FI PROCEDURAL (Web Audio API - CERO MP3)
  // =======================================================================
  class SoundFX {
    constructor() {
      this.ctx = null;
      this.humOsc1 = null;
      this.humOsc2 = null;
      this.humGain = null;
      this.isHumming = false;
      this.geigerTimer = null;
      this.alarmTimer = null;
      this.alarmActive = false;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    }

    bindAutoDisconnect(source, ...nodes) {
      if (!source) return;
      source.onended = () => {
        try { source.disconnect(); } catch (_) {}
        nodes.forEach((n) => {
          try { if (n) n.disconnect(); } catch (_) {}
        });
      };
    }

    createNoiseBuffer(durationSec = 0.1) {
      const ctx = this.init();
      if (!ctx) return null;
      const sampleRate = ctx.sampleRate;
      const length = Math.max(1, Math.floor(sampleRate * durationSec));
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    }

    playBootSequence() {
      const ctx = this.init();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [330, 440, 554.37, 659.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.065);
        gain.gain.setValueAtTime(0.09, now + i * 0.065);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        this.bindAutoDisconnect(osc, gain);
        osc.start(now + i * 0.065);
        osc.stop(now + i * 0.065 + 0.15);
      });
    }

    // Chirp breve de transmisión de radio espacial (FM suave + filtro según personaje)
    playRadioChirp(voiceType = 'astronaut') {
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;
      const profiles = {
        botanist: { base: 560, dev: 90, type: 'triangle', filt: 1800, vol: 0.05 },
        astronaut: { base: 400, dev: 70, type: 'triangle', filt: 1400, vol: 0.05 },
        rover: { base: 230, dev: 40, type: 'square', filt: 900, vol: 0.035 },
        module: { base: 720, dev: 120, type: 'sine', filt: 2400, vol: 0.05 }
      };
      const prof = profiles[voiceType] || profiles.astronaut;
      const now = ctx.currentTime;
      const dur = 0.055 + Math.random() * 0.03;
      const f0 = prof.base + (Math.random() - 0.5) * prof.dev;

      const osc = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = prof.type;
      osc.frequency.setValueAtTime(f0, now);
      osc.frequency.linearRampToValueAtTime(f0 * (0.85 + Math.random() * 0.35), now + dur);

      mod.type = 'sine';
      mod.frequency.setValueAtTime(38, now);
      modGain.gain.setValueAtTime(prof.dev * 0.5, now);
      mod.connect(modGain);
      modGain.connect(osc.frequency);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(prof.filt, now);
      filter.Q.setValueAtTime(2.2, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(prof.vol, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      this.bindAutoDisconnect(osc, filter, gain);
      this.bindAutoDisconnect(mod, modGain);
      osc.start(now);
      mod.start(now);
      osc.stop(now + dur + 0.01);
      mod.stop(now + dur + 0.01);
    }

    playGrab() {
      const ctx = this.init();
      if (!ctx) return;
      const now = ctx.currentTime;

      const noiseBuf = this.createNoiseBuffer(0.045);
      if (noiseBuf) {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(1.8, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.042);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        this.bindAutoDisconnect(noise, filter, gain);
        noise.start(now);
        noise.stop(now + 0.045);
      }

      const osc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(720, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.025);

      clickGain.gain.setValueAtTime(0.07, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(clickGain);
      clickGain.connect(ctx.destination);
      this.bindAutoDisconnect(osc, clickGain);
      osc.start(now);
      osc.stop(now + 0.026);
    }

    updateScannerAudio(isScanning, isHazard = false, msv = 2.0) {
      const ctx = this.init();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (isScanning) {
        if (!this.isHumming) {
          this.isHumming = true;
          this.humOsc1 = ctx.createOscillator();
          this.humOsc2 = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          this.humGain = ctx.createGain();

          this.humOsc1.type = 'sawtooth';
          this.humOsc1.frequency.setValueAtTime(62, now);
          this.humOsc2.type = 'sine';
          this.humOsc2.frequency.setValueAtTime(124.5, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(240, now);

          this.humGain.gain.setValueAtTime(0.001, now);
          this.humGain.gain.linearRampToValueAtTime(0.045, now + 0.08);

          this.humOsc1.connect(filter);
          this.humOsc2.connect(filter);
          filter.connect(this.humGain);
          this.humGain.connect(ctx.destination);

          this.humOsc1.start(now);
          this.humOsc2.start(now);
        }

        const shouldGeiger = isHazard || msv >= 15;
        if (shouldGeiger && !this.geigerTimer) {
          const triggerGeigerLoop = () => {
            if (!this.isHumming) return;
            this.playGeigerTick(msv > 50 ? 0.14 : 0.08);
            const rateFactor = Math.min(1, Math.max(0.15, msv / 70));
            const nextDelay = Math.max(45, (1 - rateFactor) * 240 + Math.random() * 95);
            this.geigerTimer = setTimeout(triggerGeigerLoop, nextDelay);
          };
          triggerGeigerLoop();
        } else if (!shouldGeiger && this.geigerTimer) {
          clearTimeout(this.geigerTimer);
          this.geigerTimer = null;
        }
      } else {
        this.stopScannerAudio();
      }
    }

    playGeigerTick(volume = 0.09) {
      const ctx = this.init();
      if (!ctx) return;
      const now = ctx.currentTime;

      const noiseBuf = this.createNoiseBuffer(0.006);
      if (noiseBuf) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;

        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(2600, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.0055);

        src.connect(hp);
        hp.connect(gain);
        gain.connect(ctx.destination);
        this.bindAutoDisconnect(src, hp, gain);
        src.start(now);
        src.stop(now + 0.006);
      }
    }

    stopScannerAudio() {
      if (this.geigerTimer) {
        clearTimeout(this.geigerTimer);
        this.geigerTimer = null;
      }
      if (this.isHumming && this.ctx) {
        const now = this.ctx.currentTime;
        try {
          if (this.humGain) {
            this.humGain.gain.cancelScheduledValues(now);
            this.humGain.gain.setValueAtTime(this.humGain.gain.value || 0.03, now);
            this.humGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
          }
          if (this.humOsc1) {
            this.humOsc1.stop(now + 0.065);
            this.humOsc1.onended = () => {
              try { this.humOsc1?.disconnect(); } catch (_) {}
            };
          }
          if (this.humOsc2) {
            this.humOsc2.stop(now + 0.065);
            this.humOsc2.onended = () => {
              try { this.humOsc2?.disconnect(); } catch (_) {}
              try { this.humGain?.disconnect(); } catch (_) {}
            };
          }
        } catch (_) {
          // Ignorar
        }
      }
      this.isHumming = false;
      this.humOsc1 = null;
      this.humOsc2 = null;
      this.humGain = null;
    }

    playStamp(stampType) {
      const ctx = this.init();
      if (!ctx) return;
      const now = ctx.currentTime;

      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(115, now);
      thudOsc.frequency.exponentialRampToValueAtTime(28, now + 0.16);

      thudGain.gain.setValueAtTime(0.32, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);
      this.bindAutoDisconnect(thudOsc, thudGain);
      thudOsc.start(now);
      thudOsc.stop(now + 0.18);

      const noiseBuf = this.createNoiseBuffer(0.08);
      if (noiseBuf) {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(680, now);

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.22, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(ctx.destination);
        this.bindAutoDisconnect(noise, filter, nGain);
        noise.start(now);
        noise.stop(now + 0.08);
      }

      const beepStart = now + 0.11;
      const beepOsc = ctx.createOscillator();
      const beepGain = ctx.createGain();

      if (stampType === 'AUTHORIZE') {
        beepOsc.type = 'triangle';
        beepOsc.frequency.setValueAtTime(587.33, beepStart);
        beepOsc.frequency.setValueAtTime(880.0, beepStart + 0.07);
        beepGain.gain.setValueAtTime(0.11, beepStart);
        beepGain.gain.exponentialRampToValueAtTime(0.001, beepStart + 0.21);
        beepOsc.connect(beepGain);
        beepGain.connect(ctx.destination);
        this.bindAutoDisconnect(beepOsc, beepGain);
        beepOsc.start(beepStart);
        beepOsc.stop(beepStart + 0.22);
      } else {
        beepOsc.type = 'sawtooth';
        beepOsc.frequency.setValueAtTime(195, beepStart);
        beepOsc.frequency.linearRampToValueAtTime(125, beepStart + 0.22);
        beepGain.gain.setValueAtTime(0.11, beepStart);
        beepGain.gain.exponentialRampToValueAtTime(0.001, beepStart + 0.24);
        beepOsc.connect(beepGain);
        beepGain.connect(ctx.destination);
        this.bindAutoDisconnect(beepOsc, beepGain);
        beepOsc.start(beepStart);
        beepOsc.stop(beepStart + 0.25);
      }
    }

    updateLowResourceAlarm(hasDangerResource) {
      if (hasDangerResource && !this.alarmActive) {
        this.alarmActive = true;
        const pulse = () => {
          if (!this.alarmActive) return;
          this.playAlarmPulse();
          this.alarmTimer = setTimeout(pulse, 1500);
        };
        pulse();
      } else if (!hasDangerResource && this.alarmActive) {
        this.alarmActive = false;
        if (this.alarmTimer) {
          clearTimeout(this.alarmTimer);
          this.alarmTimer = null;
        }
      }
    }

    playAlarmPulse() {
      const ctx = this.init();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(118, now);
      osc.frequency.linearRampToValueAtTime(86, now + 0.34);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.065, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      this.bindAutoDisconnect(osc, filter, gain);
      osc.start(now);
      osc.stop(now + 0.37);
    }

    playCriticalCollapse() {
      const ctx = this.init();
      if (!ctx) return;
      const now = ctx.currentTime;

      const noiseBuf = this.createNoiseBuffer(0.55);
      if (noiseBuf) {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420, now);
        filter.frequency.exponentialRampToValueAtTime(65, now + 0.5);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.54);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        this.bindAutoDisconnect(noise, filter, gain);
        noise.start(now);
        noise.stop(now + 0.55);
      }

      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(92, now);
      sub.frequency.exponentialRampToValueAtTime(24, now + 0.5);
      subGain.gain.setValueAtTime(0.24, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);

      sub.connect(subGain);
      subGain.connect(ctx.destination);
      this.bindAutoDisconnect(sub, subGain);
      sub.start(now);
      sub.stop(now + 0.53);
    }

    playHover() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1250, now + 0.035);
        g.gain.setValueAtTime(0.035, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
        osc.connect(g);
        g.connect(ctx.destination);
        this.bindAutoDisconnect(osc, g);
        osc.start(now);
        osc.stop(now + 0.035);
      } catch (_) {}
    }

    playMenuSelect() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
        g.gain.setValueAtTime(0.12, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(g);
        g.connect(ctx.destination);
        this.bindAutoDisconnect(osc, g);
        osc.start(now);
        osc.stop(now + 0.09);
      } catch (_) {}
    }

    playCargoLock() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        // Clic metálico de pestillo neumático
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1600, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.05);
        oscGain.gain.setValueAtTime(0.18, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        this.bindAutoDisconnect(osc, oscGain);
        osc.start(now);
        osc.stop(now + 0.05);

        // Golpe seco de encaje metálico pesado
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(110, now + 0.02);
        sub.frequency.exponentialRampToValueAtTime(45, now + 0.12);
        subGain.gain.setValueAtTime(0.22, now + 0.02);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        sub.connect(subGain);
        subGain.connect(ctx.destination);
        this.bindAutoDisconnect(sub, subGain);
        sub.start(now + 0.02);
        sub.stop(now + 0.12);
      } catch (_) {}
    }

    playCargoUnlock() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.08);
        oscGain.gain.setValueAtTime(0.12, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        this.bindAutoDisconnect(osc, oscGain);
        osc.start(now);
        osc.stop(now + 0.08);
      } catch (_) {}
    }

    playRocketLaunch() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const duration = 2.6;
        // 1. Rugido turbulento de ruido blanco filtrado con barrido
        const noiseBuf = this.createNoiseBuffer(duration);
        if (noiseBuf) {
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(220, now);
          filter.frequency.exponentialRampToValueAtTime(1800, now + 0.8);
          filter.frequency.exponentialRampToValueAtTime(320, now + duration);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.linearRampToValueAtTime(0.38, now + 0.4);
          gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          this.bindAutoDisconnect(noise, filter, gain);
          noise.start(now);
          noise.stop(now + duration);
        }

        // 2. Ondas sub-graves de combustión y vibración de plataforma
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sawtooth';
        sub.frequency.setValueAtTime(55, now);
        sub.frequency.linearRampToValueAtTime(95, now + 1.2);
        sub.frequency.linearRampToValueAtTime(60, now + duration);

        subGain.gain.setValueAtTime(0.05, now);
        subGain.gain.linearRampToValueAtTime(0.32, now + 0.5);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        sub.connect(subGain);
        subGain.connect(ctx.destination);
        this.bindAutoDisconnect(sub, subGain);
        sub.start(now);
        sub.stop(now + duration);
      } catch (_) {}
    }

    playEmergencyAlarm() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        [0, 0.22, 0.44].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(650, now + offset);
          osc.frequency.linearRampToValueAtTime(980, now + offset + 0.16);
          gain.gain.setValueAtTime(0.14, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.19);
          osc.connect(gain);
          gain.connect(ctx.destination);
          this.bindAutoDisconnect(osc, gain);
          osc.start(now + offset);
          osc.stop(now + offset + 0.2);
        });
      } catch (_) {}
    }

    playTimerTick(isUrgent = false) {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isUrgent ? 1600 : 900, now);
        osc.frequency.exponentialRampToValueAtTime(isUrgent ? 800 : 400, now + 0.025);
        gain.gain.setValueAtTime(isUrgent ? 0.09 : 0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        osc.connect(gain);
        gain.connect(ctx.destination);
        this.bindAutoDisconnect(osc, gain);
        osc.start(now);
        osc.stop(now + 0.026);
      } catch (_) {}
    }

    playWireConnect() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
        osc.connect(gain);
        gain.connect(ctx.destination);
        this.bindAutoDisconnect(osc, gain);
        osc.start(now);
        osc.stop(now + 0.09);

        // Chime resonante agudo de fijación
        const chime = ctx.createOscillator();
        const cGain = ctx.createGain();
        chime.type = 'triangle';
        chime.frequency.setValueAtTime(1200, now + 0.03);
        cGain.gain.setValueAtTime(0.1, now + 0.03);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        chime.connect(cGain);
        cGain.connect(ctx.destination);
        this.bindAutoDisconnect(chime, cGain);
        chime.start(now + 0.03);
        chime.stop(now + 0.19);
      } catch (_) {}
    }

    playWireBuzz() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.setValueAtTime(115, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        this.bindAutoDisconnect(osc, gain);
        osc.start(now);
        osc.stop(now + 0.15);
      } catch (_) {}
    }

    playPatchClang() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.07);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        this.bindAutoDisconnect(osc, gain);
        osc.start(now);
        osc.stop(now + 0.075);

        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(140, now);
        sub.frequency.exponentialRampToValueAtTime(50, now + 0.14);
        subGain.gain.setValueAtTime(0.22, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        sub.connect(subGain);
        subGain.connect(ctx.destination);
        this.bindAutoDisconnect(sub, subGain);
        sub.start(now);
        sub.stop(now + 0.15);
      } catch (_) {}
    }

    playMinigameSuccess() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.07);
          gain.gain.setValueAtTime(0.15, now + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          this.bindAutoDisconnect(osc, gain);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.23);
        });
      } catch (_) {}
    }

    playMinigameFail() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const noiseBuf = this.createNoiseBuffer(0.35);
        if (noiseBuf) {
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(550, now);
          filter.frequency.exponentialRampToValueAtTime(80, now + 0.32);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          this.bindAutoDisconnect(noise, filter, gain);
          noise.start(now);
          noise.stop(now + 0.35);
        }
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.3);
        oscGain.gain.setValueAtTime(0.25, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        this.bindAutoDisconnect(osc, oscGain);
        osc.start(now);
        osc.stop(now + 0.31);
      } catch (_) {}
    }

    playLaserShot() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        this.bindAutoDisconnect(osc, gain);
        osc.start(now);
        osc.stop(now + 0.13);
      } catch (_) {}
    }

    playMeteorPop() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const noiseBuf = this.createNoiseBuffer(0.2);
        if (noiseBuf) {
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(450, now);
          filter.frequency.exponentialRampToValueAtTime(80, now + 0.18);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.28, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          this.bindAutoDisconnect(noise, filter, gain);
          noise.start(now);
          noise.stop(now + 0.2);
        }
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.16);
        oscGain.gain.setValueAtTime(0.22, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        this.bindAutoDisconnect(osc, oscGain);
        osc.start(now);
        osc.stop(now + 0.17);
      } catch (_) {}
    }

    playExtinguisherHiss() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const noiseBuf = this.createNoiseBuffer(0.12);
        if (noiseBuf) {
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(2200, now);
          filter.Q.setValueAtTime(1.5, now);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          this.bindAutoDisconnect(noise, filter, gain);
          noise.start(now);
          noise.stop(now + 0.12);
        }
      } catch (_) {}
    }

    playFireExtinguished() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const noiseBuf = this.createNoiseBuffer(0.25);
        if (noiseBuf) {
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1800, now);
          filter.frequency.exponentialRampToValueAtTime(200, now + 0.22);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          this.bindAutoDisconnect(noise, filter, gain);
          noise.start(now);
          noise.stop(now + 0.25);
        }
      } catch (_) {}
    }

    playThermalAlarm() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        [0, 0.18, 0.36].forEach((t) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, now + t);
          osc.frequency.setValueAtTime(660, now + t + 0.08);
          gain.gain.setValueAtTime(0.25, now + t);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          this.bindAutoDisconnect(osc, gain);
          osc.start(now + t);
          osc.stop(now + t + 0.17);
        });
      } catch (_) {}
    }

    playDiscoveryChime() {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        g.gain.setValueAtTime(0.09, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(g);
        g.connect(ctx.destination);
        this.bindAutoDisconnect(osc, g);
        osc.start(now);
        osc.stop(now + 0.36);
      } catch (_) {}
    }
  }

  const sfx = new SoundFX();

  // =======================================================================
  // SERVICIO DE CONEXIÓN EN VIVO A API.NASA.GOV (NASA DONKI & NASA NEOWS)
  // =======================================================================
  const NASA_API_KEY = 'h6QqjT8wfMPGqFJt6PBwhH7prNcJQjqzNJRDBLjJ';

  const NASA_FALLBACK_TELEMETRY = {
    flare: {
      classType: 'M3.5',
      beginTime: '2026-11-05T18:21Z',
      sourceLocation: 'S08E35',
      activeRegionNum: '14566'
    },
    neo: {
      name: '363790 (2005 JE46)',
      diameterM: 1599,
      velocityKms: 14.7,
      missDistanceLunar: 20.0,
      missDistanceKm: 7696629,
      isHazardous: true
    },
    isLive: false,
    fetchedAt: null
  };

  let nasaTelemetry = {
    flare: { ...NASA_FALLBACK_TELEMETRY.flare },
    neo: { ...NASA_FALLBACK_TELEMETRY.neo },
    isLive: false,
    fetchedAt: null
  };

  function getDonkiFlareClassLetter() {
    const flare = (nasaTelemetry && nasaTelemetry.flare) || NASA_FALLBACK_TELEMETRY.flare;
    const rawClass = (flare.classType || 'M').toUpperCase().trim();
    const letter = rawClass.charAt(0);
    if (['X', 'M', 'C', 'B', 'A'].includes(letter)) return letter;
    return 'M';
  }

  function getNasaDonkiClimateModifier() {
    const letter = getDonkiFlareClassLetter();
    const flare = (nasaTelemetry && nasaTelemetry.flare) || NASA_FALLBACK_TELEMETRY.flare;

    if (letter === 'X') {
      return {
        type: 'X',
        title: `ALERTA ROJA NASA DONKI (CLASE ${flare.classType})`,
        badgeClass: 'bg-rose-500/25 text-rose-200 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]',
        desc: `DONKI CLIMA: CLASE ${flare.classType} (-10% Escudo / +15 mSv en Cajas)`,
        solStartShieldDelta: -10,
        solStartPwrDelta: 0,
        crateMsvOffset: 15.0,
        stormShieldExtraCost: -5
      };
    } else if (letter === 'M') {
      return {
        type: 'M',
        title: `CLIMA MODERADO NASA DONKI (CLASE ${flare.classType})`,
        badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.35)]',
        desc: `DONKI CLIMA: CLASE ${flare.classType} (+8.5 mSv en Cajas / -5% en Tormentas)`,
        solStartShieldDelta: 0,
        solStartPwrDelta: 0,
        crateMsvOffset: 8.5,
        stormShieldExtraCost: -5
      };
    } else {
      return {
        type: 'C',
        title: `FLUJO LIMPIO NASA DONKI (CLASE ${flare.classType})`,
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]',
        desc: `DONKI CLIMA: CLASE ${flare.classType} (Bonificación +5% Energía)`,
        solStartShieldDelta: 0,
        solStartPwrDelta: +5,
        crateMsvOffset: 0,
        stormShieldExtraCost: 0
      };
    }
  }

  function applyNasaDonkiSolStartBonus() {
    updateResourceBars();
  }

  function updateNasaTelemetryUI() {
    const flare = (nasaTelemetry && nasaTelemetry.flare) || NASA_FALLBACK_TELEMETRY.flare;
    const neo = (nasaTelemetry && nasaTelemetry.neo) || NASA_FALLBACK_TELEMETRY.neo;
    const isLive = Boolean(nasaTelemetry && nasaTelemetry.isLive);
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');

    // 1. Monitor CRT - Tarjeta 1 (DONKI) y Tarjeta 2 (NeoWs)
    const tickerEl = document.getElementById('nasa-telemetry-ticker');
    if (tickerEl) {
      tickerEl.textContent = isEn
        ? `[ NASA SATELLITE ${isLive ? 'LIVE' : 'OFFICIAL'} // FLR: ${flare.classType} (AR-${flare.activeRegionNum}) • NEO: ${neo.name} (${neo.velocityKms} km/s) ]`
        : `[ SATÉLITE NASA ${isLive ? 'EN VIVO' : 'OFICIAL'} // FLR: ${flare.classType} (AR-${flare.activeRegionNum}) • NEO: ${neo.name} (${neo.velocityKms} km/s) ]`;
    }
    const ledEl = document.getElementById('nasa-telemetry-led');
    if (ledEl) {
      ledEl.className = isLive
        ? 'w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0'
        : 'w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0';
    }

    const donkiClassBadge = document.getElementById('nasa-donki-class-badge');
    if (donkiClassBadge) donkiClassBadge.textContent = isEn ? `CLASS ${flare.classType}` : `CLASE ${flare.classType}`;

    const donkiRegion = document.getElementById('nasa-donki-region');
    if (donkiRegion) donkiRegion.textContent = `AR-${flare.activeRegionNum || '14566'}`;

    const donkiEffectText = document.getElementById('nasa-donki-effect-text');
    const donkiMod = getNasaDonkiClimateModifier();
    if (donkiEffectText) {
      if (donkiMod.type === 'X') {
        donkiEffectText.textContent = isEn ? '-10% SHIELD • +15 mSv IN CRATES' : '-10% ESCUDO • +15 mSv EN CAJAS';
        donkiEffectText.className = 'text-xs font-black text-rose-300 leading-tight whitespace-nowrap';
      } else if (donkiMod.type === 'M') {
        donkiEffectText.textContent = isEn ? '+8.5 mSv IN CRATES' : '+8.5 mSv EN CAJAS';
        donkiEffectText.className = 'text-xs font-black text-amber-200 leading-tight whitespace-nowrap';
      } else {
        donkiEffectText.textContent = isEn ? '+5% PASSIVE ENERGY IN CALM' : '+5% ENERGÍA PASIVA EN CALMA';
        donkiEffectText.className = 'text-xs font-black text-emerald-300 leading-tight whitespace-nowrap';
      }
    }

    const sunSvg = document.getElementById('solar-magnetosphere-svg');
    if (sunSvg) {
      sunSvg.setAttribute('data-solar-class', donkiMod.type);
    }

    const fluxLevelEl = document.getElementById('donki-flux-level');
    const intensityBarEl = document.getElementById('donki-intensity-bar');
    const ledBars = document.querySelectorAll('#donki-led-meter .donki-led-bar');
    if (donkiMod.type === 'X') {
      if (fluxLevelEl) { fluxLevelEl.textContent = isEn ? 'EXTREME' : 'EXTREMO'; fluxLevelEl.className = 'text-[9px] font-mono font-bold text-rose-400'; }
      if (intensityBarEl) { intensityBarEl.style.width = '95%'; intensityBarEl.className = 'h-full bg-rose-500 rounded-full transition-all duration-300'; }
      ledBars.forEach((b) => { b.className = 'donki-led-bar bar-x active'; });
    } else if (donkiMod.type === 'M') {
      if (fluxLevelEl) { fluxLevelEl.textContent = isEn ? 'MODERATE' : 'MODERADO'; fluxLevelEl.className = 'text-[9px] font-mono font-bold text-amber-300'; }
      if (intensityBarEl) { intensityBarEl.style.width = '65%'; intensityBarEl.className = 'h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 rounded-full transition-all duration-300'; }
      ledBars.forEach((b, i) => { b.className = i < 4 ? 'donki-led-bar bar-m active' : 'donki-led-bar'; });
    } else {
      if (fluxLevelEl) { fluxLevelEl.textContent = isEn ? 'LOW' : 'BAJO'; fluxLevelEl.className = 'text-[9px] font-mono font-bold text-emerald-400'; }
      if (intensityBarEl) { intensityBarEl.style.width = '35%'; intensityBarEl.className = 'h-full bg-emerald-400 rounded-full transition-all duration-300'; }
      ledBars.forEach((b, i) => { b.className = i < 2 ? 'donki-led-bar bar-c active' : 'donki-led-bar'; });
    }

    const neoNameEl = document.getElementById('nasa-neows-asteroid-name');
    if (neoNameEl) {
      const aName = neo.name || '363790 (2005 JE46)';
      neoNameEl.innerHTML = `
        <div class="lcd-ticker-container">
          <div class="lcd-ticker-track text-[11px]">
            <span>${aName}</span><span class="mx-2 text-cyan-400 opacity-60">• [NEO] •</span><span>${aName}</span><span class="mx-2 text-cyan-400 opacity-60">• [NEO] •</span>
          </div>
        </div>
      `;
    }

    const neoSpeedEl = document.getElementById('nasa-neows-speed');
    if (neoSpeedEl) neoSpeedEl.textContent = `VEL: ${neo.velocityKms} km/s`;

    const neoSizeEl = document.getElementById('nasa-neows-size');
    if (neoSizeEl) neoSizeEl.textContent = isEn ? `DIAM: ~${Number(neo.diameterM).toLocaleString()} m` : `DIÁM: ~${Number(neo.diameterM).toLocaleString()} m`;

    const neoComboEl = document.getElementById('nasa-neows-speed-size-combo');
    if (neoComboEl) {
      neoComboEl.textContent = `${neo.velocityKms} km/s • ~${Number(neo.diameterM).toLocaleString()}m`;
    }

    // 2. Ficha Modal NASA
    const liveBadge = document.getElementById('nasa-modal-live-badge');
    if (liveBadge) {
      liveBadge.textContent = isLive
        ? (isEn ? '● LIVE (API.NASA.GOV)' : '● EN VIVO (API.NASA.GOV)')
        : (isEn ? '● SAFETY OFFLINE TELEMETRY' : '● TELEMETRÍA OFFLINE DE SEGURIDAD');
      liveBadge.className = isLive
        ? 'px-1.5 py-0.2 rounded text-[0.6rem] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/60'
        : 'px-1.5 py-0.2 rounded text-[0.6rem] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/60';
    }

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt('modal-flare-class-badge', isEn ? `CLASS ${flare.classType}` : `CLASE ${flare.classType}`);
    setTxt('modal-flare-class', flare.classType);
    setTxt('modal-flare-ar', `AR-${flare.activeRegionNum}`);
    setTxt('modal-flare-loc', flare.sourceLocation || 'S08E35');
    setTxt('modal-flare-time', flare.beginTime || (isEn ? 'RECENT RECORD' : 'REGISTRO RECIENTE'));

    setTxt('modal-neo-name', isEn ? `Asteroid ${neo.name}` : `Asteroide ${neo.name}`);
    setTxt('modal-neo-diam', isEn ? `~${Number(neo.diameterM).toLocaleString()} meters` : `~${Number(neo.diameterM).toLocaleString()} metros`);
    setTxt('modal-neo-vel', `${neo.velocityKms} km/s (~${Math.round(neo.velocityKms * 3600).toLocaleString()} km/h)`);
    setTxt('modal-neo-dist-lunar', isEn ? `${neo.missDistanceLunar} Lunar Distances` : `${neo.missDistanceLunar} Distancias Lunares`);
    setTxt('modal-neo-dist-km', `${Number(neo.missDistanceKm).toLocaleString()} km`);

    const hazardBadge = document.getElementById('modal-neo-hazard-badge');
    if (hazardBadge) {
      hazardBadge.textContent = neo.isHazardous
        ? (isEn ? 'PLANETARY DEFENSE ALERT' : 'ALERTA DEFENSA PLANETARIA')
        : (isEn ? 'NOMINAL MONITORED ORBIT' : 'ÓRBITA SEGURA MONITOREADA');
      hazardBadge.className = neo.isHazardous
        ? 'px-2 py-0.5 rounded text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-400'
        : 'px-2 py-0.5 rounded text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400';
    }

    // Actualizar Alerta de Microjuego si estuviera activo
    const neoAlertEl = document.getElementById('minigame-neo-alert');
    if (neoAlertEl) {
      neoAlertEl.textContent = isEn
        ? `NASA NEO ALERT: DEBRIS FROM ${neo.name} AT ${neo.velocityKms} KM/S`
        : `ALERTA NASA NEO: FRAGMENTOS DE ${neo.name} A ${neo.velocityKms} KM/S`;
    }
  }

  async function initNasaLiveTelemetry() {
    updateNasaTelemetryUI();

    const now = new Date();
    const formatYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const endDate = formatYMD(now);
    const past = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const startDate = formatYMD(past);

    const donkiUrl = `https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_API_KEY}`;
    const neowsUrl = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${endDate}&end_date=${endDate}&api_key=${NASA_API_KEY}`;

    const fetchWithTimeout = async (url, ms = 5000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ms);
      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      const results = await Promise.allSettled([
        fetchWithTimeout(donkiUrl, 5000),
        fetchWithTimeout(neowsUrl, 5000)
      ]);

      // 1. DONKI Solar Flare
      const donkiRes = results[0];
      if (donkiRes.status === 'fulfilled' && Array.isArray(donkiRes.value) && donkiRes.value.length > 0) {
        const lastFlare = donkiRes.value[donkiRes.value.length - 1];
        nasaTelemetry.flare = {
          classType: lastFlare.classType || 'M2.4',
          beginTime: lastFlare.beginTime || endDate,
          sourceLocation: lastFlare.sourceLocation || 'N18E42',
          activeRegionNum: String(lastFlare.activeRegionNum || '3889')
        };
        nasaTelemetry.isLive = true;
      } else {
        // Fallback a DONKI notifications para capturar la última alerta oficial si FLR tuviera endpoint 404
        try {
          const notifs = await fetchWithTimeout(`https://api.nasa.gov/DONKI/notifications?api_key=${NASA_API_KEY}`, 3500);
          if (Array.isArray(notifs) && notifs.length > 0) {
            for (const n of notifs) {
              const body = n.messageBody || '';
              const m = body.match(/([MXC]\d+\.?\d*)\s+flare/i) || body.match(/flare intensity:\s*([MXC]\d+\.?\d*)/i);
              const ar = body.match(/Active Region\s*(\d+)/i) || body.match(/AR\s*(\d+)/i);
              const loc = body.match(/Source region:\s*([A-Z0-9]+)/i) || body.match(/([NS]\d+[EW]\d+)/i);
              if (m) {
                nasaTelemetry.flare = {
                  classType: m[1].toUpperCase(),
                  beginTime: n.messageIssueTime || endDate,
                  sourceLocation: loc ? loc[1] : 'S08E35',
                  activeRegionNum: ar ? ar[1] : '14566'
                };
                nasaTelemetry.isLive = true;
                break;
              }
            }
          }
        } catch (_) {}
      }

      // 2. NeoWs Asteroids
      const neowsRes = results[1];
      if (neowsRes.status === 'fulfilled' && neowsRes.value && neowsRes.value.near_earth_objects) {
        const neos = neowsRes.value.near_earth_objects;
        let allNeos = [];
        Object.keys(neos).forEach((d) => {
          if (Array.isArray(neos[d])) allNeos.push(...neos[d]);
        });
        if (allNeos.length > 0) {
          allNeos.sort((a, b) => {
            const diamA = a?.estimated_diameter?.meters?.estimated_diameter_max || 0;
            const diamB = b?.estimated_diameter?.meters?.estimated_diameter_max || 0;
            return diamB - diamA;
          });
          const best = allNeos[0];
          const closeData = best.close_approach_data && best.close_approach_data[0];
          const vel = parseFloat(closeData?.relative_velocity?.kilometers_per_second || 0).toFixed(1);
          const diam = Math.round(best.estimated_diameter?.meters?.estimated_diameter_max || 120);
          const distLunar = parseFloat(closeData?.miss_distance?.lunar || 0).toFixed(1);
          const distKm = Math.round(parseFloat(closeData?.miss_distance?.kilometers || 0));

          nasaTelemetry.neo = {
            name: best.name || 'Asteroid NEO',
            diameterM: diam,
            velocityKms: parseFloat(vel),
            missDistanceLunar: parseFloat(distLunar),
            missDistanceKm: distKm,
            isHazardous: Boolean(best.is_potentially_hazardous_asteroid)
          };
          nasaTelemetry.isLive = true;
        }
      }
    } catch (e) {
      console.warn('NASA live telemetry error, using robust offline fallback:', e);
    }

    updateNasaTelemetryUI();
    if (typeof updateSolarMonitor === 'function') {
      updateSolarMonitor();
    }
  }

  // --- ESTADO GLOBAL DE LA SIMULACIÓN ---
  const state = {
    difficulty: 'engineer',
    budget: 900,
    cargoCapacity: 9,
    loadout: {
      o2: 0,
      rad: 0,
      pwr: 0,
      food: 0
    },
    rocketCargoSlots: [],
    sol: 1,
    maxSols: 4,
    caseInSol: 0,
    missionSchedule: null,
    stampedChoice: null,
    isTransitioning: false,
    topZIndex: 35,
    resources: {
      o2: 20,
      rad: 20,
      pwr: 20,
      food: 20
    },
    flags: {
      lunar_dust_contamination: false,
      engineer_saved: null,
      kilopower_unstable: false,
      uv_lamps_overclocked: false
    },
    solLogs: [],
    decisionHistory: [],
    lastIncident: null
  };

  // --- AUTOGUARDADO EN LOCALSTORAGE ---
  function saveGameToStorage() {
    try {
      const payload = {
        difficulty: state.difficulty,
        budget: state.budget,
        cargoCapacity: state.cargoCapacity,
        maxSols: state.maxSols,
        sol: state.sol,
        caseInSol: state.caseInSol,
        missionSchedule: state.missionSchedule || null,
        resources: { ...state.resources },
        flags: { ...state.flags },
        solLogs: [...state.solLogs],
        decisionHistory: [...state.decisionHistory],
        lastIncident: state.lastIncident ? { ...state.lastIncident } : null,
        savedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {
      // Ignorar
    }
  }

  function loadGameFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data.sol !== 'number' || !data.resources) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function clearSavedGame() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.minigameDeck = [];
      window.lastPlayedMinigame = null;
    } catch (_) {
      // Ignorar
    }
  }

  function applySavedState(data) {
    state.difficulty = data.difficulty || 'engineer';
    state.maxSols = Number(data.maxSols || (state.difficulty === 'cadet' ? 3 : state.difficulty === 'commander' ? 5 : 4));
    state.budget = Number(data.budget ?? 900);
    state.cargoCapacity = Number(data.cargoCapacity ?? 9);
    state.sol = Math.max(1, Math.min(state.maxSols, data.sol || 1));
    state.caseInSol = data.caseInSol === 1 ? 1 : 0;
    state.missionSchedule = data.missionSchedule || null;
    state.resources = {
      o2: Number(data.resources.o2 ?? 20),
      rad: Number(data.resources.rad ?? 20),
      pwr: Number(data.resources.pwr ?? 20),
      food: Number(data.resources.food ?? 20)
    };
    state.flags = {
      lunar_dust_contamination: Boolean(data.flags?.lunar_dust_contamination),
      engineer_saved: data.flags?.engineer_saved ?? null,
      kilopower_unstable: Boolean(data.flags?.kilopower_unstable),
      uv_lamps_overclocked: Boolean(data.flags?.uv_lamps_overclocked)
    };
    state.solLogs = Array.isArray(data.solLogs) ? data.solLogs : [];
    state.decisionHistory = Array.isArray(data.decisionHistory) ? data.decisionHistory : [];
    state.lastIncident = data.lastIncident || null;
    updateCctvIncidentBanner();
  }

  function resetStateToDefault(initialVal = 20) {
    const maxSolsByDiff = { cadet: 3, engineer: 4, commander: 5 };
    state.maxSols = maxSolsByDiff[state.difficulty] || 4;
    state.sol = 1;
    state.caseInSol = 0;
    state.stampedChoice = null;
    state.solLogs = [];
    state.decisionHistory = [];
    state.resources = { o2: initialVal, rad: initialVal, pwr: initialVal, food: initialVal };
    state.loadout = { o2: 0, rad: 0, pwr: 0, food: 0 };
    state.rocketCargoSlots = [];
    state.flags = {
      lunar_dust_contamination: false,
      engineer_saved: null,
      kilopower_unstable: false,
      uv_lamps_overclocked: false
    };
    state.lastIncident = null;
    window.minigameDeck = [];
    window.lastPlayedMinigame = null;
    updateCctvIncidentBanner();
    caseDecided = false;
    const resetNextBtn = document.getElementById('next-case-btn') || document.getElementById('next-shift-btn') || nextShiftBtn;
    if (resetNextBtn) {
      resetNextBtn.classList.add('hidden');
      resetNextBtn.style.display = 'none';
      resetNextBtn.style.pointerEvents = 'none';
    }
    const ovBlack = document.getElementById('disaster-blackout-overlay');
    const ovFrost = document.getElementById('disaster-frost-overlay');
    const ovCrack = document.getElementById('disaster-crack-overlay');
    const ovSmoke = document.getElementById('disaster-smoke-overlay');
    if (ovBlack) ovBlack.classList.add('hidden');
    if (ovFrost) ovFrost.classList.add('hidden');
    if (ovCrack) ovCrack.classList.add('hidden');
    if (ovSmoke) ovSmoke.classList.add('hidden');
  }

  // =======================================================================
  // 2. ARTE SVG DETALLADO DE AVATARES, CASCOS ESPACIALES, ROVERS Y DRONES
  // =======================================================================
  const VISITOR_SVGS = {
    // Especialista Biodomo (Insignias Verde Esmeralda, Casco con Visor Degradado, Luces Laterales y Mochila PLSS)
    botanist: `
      <svg viewBox="0 0 200 200" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bioSuit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="55%" stop-color="#e2e8f0"/>
            <stop offset="100%" stop-color="#94a3b8"/>
          </linearGradient>
          <linearGradient id="bioVisor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#a7f3d0"/>
            <stop offset="30%" stop-color="#10b981"/>
            <stop offset="65%" stop-color="#047857"/>
            <stop offset="90%" stop-color="#022c22"/>
            <stop offset="100%" stop-color="#011611"/>
          </linearGradient>
          <linearGradient id="bioShoulder" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="60%" stop-color="#059669"/>
            <stop offset="100%" stop-color="#064e3b"/>
          </linearGradient>
          <radialGradient id="halogenGlowBio" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95"/>
            <stop offset="50%" stop-color="#fef08a" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="transparent"/>
          </radialGradient>
        </defs>

        <!-- Fondo Cósmico Común: Cielo lunar profundo, estrellas y la Tierra -->
        <rect width="200" height="200" fill="#02040a"/>
        <circle cx="22" cy="24" r="1" fill="#fff" opacity="0.8"/>
        <circle cx="54" cy="18" r="1.4" fill="#e0f2fe" opacity="0.9"/>
        <circle cx="92" cy="32" r="0.8" fill="#fff" opacity="0.6"/>
        <circle cx="124" cy="16" r="1.2" fill="#bae6fd" opacity="0.85"/>
        <circle cx="180" cy="22" r="1.1" fill="#fff" opacity="0.7"/>
        <circle cx="34" cy="58" r="0.9" fill="#fff" opacity="0.55"/>
        <circle cx="172" cy="68" r="1.3" fill="#fed7aa" opacity="0.75"/>

        <!-- La Tierra en cuarto menguante con atmósfera y nubes arremolinadas -->
        <g transform="translate(162, 34)">
          <circle cx="0" cy="0" r="17" fill="#38bdf8" opacity="0.18"/>
          <circle cx="0" cy="0" r="14" fill="#0c2340"/>
          <path d="M-6 -9 Q-2 -7 -4 -2 Q-7 3 -3 7 Q1 10 -2 14 A 14 14 0 0 1 -14 0 A 14 14 0 0 1 -6 -9 Z" fill="#15803d" opacity="0.85"/>
          <path d="M5 -11 Q8 -6 5 -1 Q7 5 3 9 A 14 14 0 0 0 14 0 A 14 14 0 0 0 5 -11 Z" fill="#166534" opacity="0.75"/>
          <path d="M-11 -5 Q-4 -8 4 -4 Q10 -2 14 -3" stroke="#ffffff" stroke-width="1.8" fill="none" opacity="0.85" stroke-linecap="round"/>
          <path d="M-9 3 Q-1 1 6 5 Q11 7 13 3" stroke="#ffffff" stroke-width="1.6" fill="none" opacity="0.75" stroke-linecap="round"/>
          <path d="M-5 9 Q1 8 7 10" stroke="#ffffff" stroke-width="1.3" fill="none" opacity="0.6" stroke-linecap="round"/>
          <path d="M0 -14 A 14 14 0 0 0 0 14 A 9 14 0 0 1 0 -14 Z" fill="#02040a" opacity="0.75"/>
          <circle cx="0" cy="0" r="14" fill="none" stroke="#7dd3fc" stroke-width="0.9" opacity="0.9"/>
        </g>

        <!-- Horizonte en relieve del cráter Shackleton en dos tonos y balizas -->
        <path d="M0 144 Q45 132 95 140 T200 134 L200 200 L0 200 Z" fill="#1e293b"/>
        <path d="M0 160 Q60 150 120 156 T200 152 L200 200 L0 200 Z" fill="#0f172a"/>
        <ellipse cx="46" cy="168" rx="22" ry="6" fill="#080c14" stroke="#334155" stroke-width="1.2"/>
        <ellipse cx="168" cy="172" rx="16" ry="4.5" fill="#080c14" stroke="#334155" stroke-width="1"/>
        <line x1="24" y1="134" x2="24" y2="146" stroke="#64748b" stroke-width="1.6"/>
        <circle cx="24" cy="133" r="2.5" fill="#38bdf8"/>
        <circle cx="24" cy="133" r="5" fill="#38bdf8" opacity="0.35"/>
        <line x1="184" y1="128" x2="184" y2="138" stroke="#64748b" stroke-width="1.6"/>
        <circle cx="184" cy="126" r="2.5" fill="#fbbf24"/>
        <circle cx="184" cy="126" r="5" fill="#fbbf24" opacity="0.35"/>

        <!-- Mochila PLSS de Soporte Vital con Cilindros y Antena -->
        <rect x="36" y="52" width="128" height="95" rx="14" fill="#064e3b" stroke="#10b981" stroke-width="2.5"/>
        <rect x="42" y="60" width="14" height="54" rx="4" fill="#022c22" stroke="#34d399" stroke-width="1.8"/>
        <rect x="144" y="60" width="14" height="54" rx="4" fill="#022c22" stroke="#34d399" stroke-width="1.8"/>
        <line x1="148" y1="16" x2="148" y2="52" stroke="#6ee7b7" stroke-width="3"/>
        <circle cx="148" cy="14" r="5" fill="#10b981"/>

        <!-- Traje EVA Multicapa y Hombreras de Color Departamental (Verde Esmeralda) -->
        <path d="M30 200 C30 134 170 134 170 200 Z" fill="url(#bioSuit)" stroke="#475569" stroke-width="3.5"/>
        <path d="M32 170 Q46 138 72 142 L66 170 Z" fill="url(#bioShoulder)" stroke="#064e3b" stroke-width="2.2"/>
        <path d="M168 170 Q154 138 128 142 L134 170 Z" fill="url(#bioShoulder)" stroke="#064e3b" stroke-width="2.2"/>

        <!-- Arnés Gris Titanio -->
        <line x1="70" y1="144" x2="52" y2="200" stroke="#334155" stroke-width="3.5"/>
        <line x1="130" y1="144" x2="148" y2="200" stroke="#334155" stroke-width="3.5"/>

        <!-- Módulo Pectoral DCM con Manómetro Analógico Circular, Válvulas y Mangueras -->
        <rect x="68" y="142" width="64" height="44" rx="7" fill="#0f172a" stroke="#10b981" stroke-width="2.2"/>
        <!-- Manómetro circular analógico con aguja indicadora -->
        <circle cx="83" cy="158" r="9" fill="#022c22" stroke="#34d399" stroke-width="1.8"/>
        <path d="M77 159 A 6 6 0 0 1 89 159" stroke="#6ee7b7" stroke-width="1.2" fill="none"/>
        <line x1="83" y1="158" x2="86" y2="152" stroke="#fef08a" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="83" cy="158" r="1.8" fill="#f8fafc"/>
        <!-- Válvulas y LEDs de estado del DCM -->
        <circle cx="102" cy="153" r="3.2" fill="#10b981"/>
        <circle cx="114" cy="153" r="3.2" fill="#38bdf8"/>
        <circle cx="123" cy="153" r="2.2" fill="#fbbf24"/>
        <rect x="99" y="163" width="26" height="8" rx="2.5" fill="#064e3b" stroke="#34d399" stroke-width="1"/>
        <!-- Mangueras de biosoporte acopladas -->
        <path d="M72 174 C62 184 56 192 54 200" stroke="#047857" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <path d="M72 174 C62 184 56 192 54 200" stroke="#34d399" stroke-width="1.5" stroke-dasharray="2 3" fill="none"/>
        <path d="M128 174 C138 184 144 192 146 200" stroke="#047857" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <path d="M128 174 C138 184 144 192 146 200" stroke="#34d399" stroke-width="1.5" stroke-dasharray="2 3" fill="none"/>

        <!-- Anillo de Cuello Anodizado Metálico -->
        <ellipse cx="100" cy="130" rx="36" ry="9" fill="#334155" stroke="#94a3b8" stroke-width="2.5"/>
        <ellipse cx="100" cy="130" rx="32" ry="7" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>

        <!-- Focos Halógenos Laterales de Casco con Halo Luminoso -->
        <rect x="42" y="70" width="12" height="28" rx="3.5" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/>
        <circle cx="48" cy="78" r="9" fill="url(#halogenGlowBio)"/>
        <circle cx="48" cy="78" r="4.5" fill="#fef08a"/>
        <rect x="146" y="70" width="12" height="28" rx="3.5" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/>
        <circle cx="152" cy="78" r="9" fill="url(#halogenGlowBio)"/>
        <circle cx="152" cy="78" r="4.5" fill="#fef08a"/>

        <!-- Casco Espacial Presurizado Esférico -->
        <circle cx="100" cy="84" r="44" fill="url(#bioSuit)" stroke="#94a3b8" stroke-width="3.5"/>
        <!-- Visor Panorámico Curvado con Degradado Esmeralda Criogénico / Aurora -->
        <rect x="62" y="57" width="76" height="52" rx="25" fill="url(#bioVisor)" stroke="#f59e0b" stroke-width="3"/>
        <!-- Reflejo diagonal de cristal y micro-HUD de telemetría interior -->
        <path d="M72 70 Q100 58 128 70" stroke="#d1fae5" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.85"/>
        <path d="M76 96 Q100 103 124 96" stroke="#34d399" stroke-width="1.5" fill="none" opacity="0.6"/>
        <text x="75" y="86" fill="#a7f3d0" font-family="monospace" font-size="5" font-weight="bold" opacity="0.85" letter-spacing="0.5">[BIO // O2: 99%]</text>
        <line x1="118" y1="83" x2="126" y2="83" stroke="#6ee7b7" stroke-width="1" opacity="0.8"/>
        <circle cx="122" cy="83" r="2" fill="none" stroke="#6ee7b7" stroke-width="0.8" opacity="0.8"/>
      </svg>
    `,

    // Especialista Soporte Vital (Insignias Cian / Ámbar, Visor Oro Solar con HUD, Lámparas Halógenas y DCM)
    astronaut: `
      <svg viewBox="0 0 200 200" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="astroSuit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="55%" stop-color="#e2e8f0"/>
            <stop offset="100%" stop-color="#94a3b8"/>
          </linearGradient>
          <linearGradient id="astroVisor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="30%" stop-color="#f59e0b"/>
            <stop offset="65%" stop-color="#b45309"/>
            <stop offset="90%" stop-color="#451a03"/>
            <stop offset="100%" stop-color="#1f0a02"/>
          </linearGradient>
          <linearGradient id="astroShoulderCyan" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="60%" stop-color="#0284c7"/>
            <stop offset="100%" stop-color="#0369a1"/>
          </linearGradient>
          <linearGradient id="astroShoulderAmber" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="60%" stop-color="#d97706"/>
            <stop offset="100%" stop-color="#78350f"/>
          </linearGradient>
          <radialGradient id="halogenGlowAstro" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.95"/>
            <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="transparent"/>
          </radialGradient>
        </defs>

        <!-- Fondo Cósmico Común: Cielo lunar profundo, estrellas y la Tierra -->
        <rect width="200" height="200" fill="#02040a"/>
        <circle cx="22" cy="24" r="1" fill="#fff" opacity="0.8"/>
        <circle cx="54" cy="18" r="1.4" fill="#e0f2fe" opacity="0.9"/>
        <circle cx="92" cy="32" r="0.8" fill="#fff" opacity="0.6"/>
        <circle cx="124" cy="16" r="1.2" fill="#bae6fd" opacity="0.85"/>
        <circle cx="180" cy="22" r="1.1" fill="#fff" opacity="0.7"/>
        <circle cx="34" cy="58" r="0.9" fill="#fff" opacity="0.55"/>
        <circle cx="172" cy="68" r="1.3" fill="#fed7aa" opacity="0.75"/>

        <!-- La Tierra en cuarto menguante con atmósfera y nubes arremolinadas -->
        <g transform="translate(162, 34)">
          <circle cx="0" cy="0" r="17" fill="#38bdf8" opacity="0.18"/>
          <circle cx="0" cy="0" r="14" fill="#0c2340"/>
          <path d="M-6 -9 Q-2 -7 -4 -2 Q-7 3 -3 7 Q1 10 -2 14 A 14 14 0 0 1 -14 0 A 14 14 0 0 1 -6 -9 Z" fill="#15803d" opacity="0.85"/>
          <path d="M5 -11 Q8 -6 5 -1 Q7 5 3 9 A 14 14 0 0 0 14 0 A 14 14 0 0 0 5 -11 Z" fill="#166534" opacity="0.75"/>
          <path d="M-11 -5 Q-4 -8 4 -4 Q10 -2 14 -3" stroke="#ffffff" stroke-width="1.8" fill="none" opacity="0.85" stroke-linecap="round"/>
          <path d="M-9 3 Q-1 1 6 5 Q11 7 13 3" stroke="#ffffff" stroke-width="1.6" fill="none" opacity="0.75" stroke-linecap="round"/>
          <path d="M-5 9 Q1 8 7 10" stroke="#ffffff" stroke-width="1.3" fill="none" opacity="0.6" stroke-linecap="round"/>
          <path d="M0 -14 A 14 14 0 0 0 0 14 A 9 14 0 0 1 0 -14 Z" fill="#02040a" opacity="0.75"/>
          <circle cx="0" cy="0" r="14" fill="none" stroke="#7dd3fc" stroke-width="0.9" opacity="0.9"/>
        </g>

        <!-- Horizonte en relieve del cráter Shackleton en dos tonos y balizas -->
        <path d="M0 144 Q45 132 95 140 T200 134 L200 200 L0 200 Z" fill="#1e293b"/>
        <path d="M0 160 Q60 150 120 156 T200 152 L200 200 L0 200 Z" fill="#0f172a"/>
        <ellipse cx="46" cy="168" rx="22" ry="6" fill="#080c14" stroke="#334155" stroke-width="1.2"/>
        <ellipse cx="168" cy="172" rx="16" ry="4.5" fill="#080c14" stroke="#334155" stroke-width="1"/>
        <line x1="24" y1="134" x2="24" y2="146" stroke="#64748b" stroke-width="1.6"/>
        <circle cx="24" cy="133" r="2.5" fill="#38bdf8"/>
        <circle cx="24" cy="133" r="5" fill="#38bdf8" opacity="0.35"/>
        <line x1="184" y1="128" x2="184" y2="138" stroke="#64748b" stroke-width="1.6"/>
        <circle cx="184" cy="126" r="2.5" fill="#fbbf24"/>
        <circle cx="184" cy="126" r="5" fill="#fbbf24" opacity="0.35"/>

        <!-- Mochila PLSS Pesada de Soporte Vital e Ingeniería con Mástil de Telemetría -->
        <rect x="34" y="50" width="132" height="98" rx="14" fill="#1e293b" stroke="#64748b" stroke-width="2.5"/>
        <line x1="148" y1="14" x2="148" y2="50" stroke="#e2e8f0" stroke-width="3.5"/>
        <circle cx="148" cy="12" r="5" fill="#ef4444"/>

        <!-- Torso EVA con Hombreras de Colores Departamentales (Cian Izq / Ámbar Der) -->
        <path d="M28 200 C28 132 172 132 172 200 Z" fill="url(#astroSuit)" stroke="#475569" stroke-width="3.5"/>
        <path d="M30 170 Q44 136 72 140 L65 170 Z" fill="url(#astroShoulderCyan)" stroke="#0369a1" stroke-width="2.2"/>
        <path d="M170 170 Q156 136 128 140 L135 170 Z" fill="url(#astroShoulderAmber)" stroke="#78350f" stroke-width="2.2"/>

        <!-- Arnés Gris Titanio -->
        <line x1="68" y1="142" x2="48" y2="200" stroke="#334155" stroke-width="3.8"/>
        <line x1="132" y1="142" x2="152" y2="200" stroke="#334155" stroke-width="3.8"/>

        <!-- Consola Pectoral DCM con Manómetro Analógico de Aguja, Conmutadores y Mangueras -->
        <rect x="66" y="140" width="68" height="46" rx="7" fill="#0f172a" stroke="#38bdf8" stroke-width="2.2"/>
        <!-- Manómetro circular analógico con aguja -->
        <circle cx="82" cy="156" r="9" fill="#030712" stroke="#38bdf8" stroke-width="1.8"/>
        <path d="M76 157 A 6 6 0 0 1 88 157" stroke="#34d399" stroke-width="1.3" fill="none"/>
        <line x1="82" y1="156" x2="82" y2="150" stroke="#f43f5e" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="82" cy="156" r="1.8" fill="#f8fafc"/>
        <!-- Indicadores y conmutadores de control -->
        <circle cx="102" cy="151" r="3.2" fill="#22c55e"/>
        <circle cx="113" cy="151" r="3.2" fill="#fbbf24"/>
        <circle cx="123" cy="151" r="3.2" fill="#ef4444"/>
        <line x1="99" y1="162" x2="124" y2="162" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
        <line x1="99" y1="170" x2="118" y2="170" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Mangueras umbilicales acopladas -->
        <path d="M70 174 C60 184 54 192 52 200" stroke="#0284c7" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <path d="M70 174 C60 184 54 192 52 200" stroke="#7dd3fc" stroke-width="1.5" stroke-dasharray="2 3" fill="none"/>
        <path d="M130 174 C140 184 146 192 148 200" stroke="#b45309" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <path d="M130 174 C140 184 146 192 148 200" stroke="#fde047" stroke-width="1.5" stroke-dasharray="2 3" fill="none"/>

        <!-- Anillo de Cuello Metálico Anodizado -->
        <ellipse cx="100" cy="128" rx="36" ry="9" fill="#334155" stroke="#cbd5e1" stroke-width="2.5"/>
        <ellipse cx="100" cy="128" rx="32" ry="7" fill="#1e293b" stroke="#94a3b8" stroke-width="1.5"/>

        <!-- Lámparas Halógenas Laterales con Focos Cian Luminum -->
        <rect x="40" y="68" width="12" height="28" rx="3.5" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
        <circle cx="46" cy="76" r="9" fill="url(#halogenGlowAstro)"/>
        <circle cx="46" cy="76" r="4.5" fill="#bae6fd"/>
        <rect x="148" y="68" width="12" height="28" rx="3.5" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
        <circle cx="154" cy="76" r="9" fill="url(#halogenGlowAstro)"/>
        <circle cx="154" cy="76" r="4.5" fill="#bae6fd"/>

        <!-- Casco Espacial EVA Esférico -->
        <circle cx="100" cy="82" r="44" fill="url(#astroSuit)" stroke="#94a3b8" stroke-width="3.5"/>
        <!-- Visor Panorámico Curvado con Degradado Oro Solar / Ámbar -->
        <rect x="62" y="55" width="76" height="52" rx="25" fill="url(#astroVisor)" stroke="#f59e0b" stroke-width="3"/>
        <!-- Reflejo diagonal de cristal y micro-HUD de telemetría interior -->
        <path d="M72 68 Q100 56 128 68" stroke="#fef9c3" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.9"/>
        <path d="M76 94 Q100 101 124 94" stroke="#fbbf24" stroke-width="1.5" fill="none" opacity="0.6"/>
        <text x="73" y="84" fill="#38bdf8" font-family="monospace" font-size="4.8" font-weight="bold" opacity="0.9" letter-spacing="0.4">[EVA-04 // O2: 98%]</text>
        <line x1="116" y1="81" x2="126" y2="81" stroke="#38bdf8" stroke-width="1" opacity="0.85"/>
        <circle cx="121" cy="81" r="2.2" fill="none" stroke="#38bdf8" stroke-width="0.8" opacity="0.85"/>
        <line x1="121" y1="77" x2="121" y2="85" stroke="#38bdf8" stroke-width="0.8" opacity="0.85"/>
      </svg>
    `,

    // Rover Lunar Pesado (NASA Heavy Chassis Amarillo Industrial, Torreta Óptica con Iris Cian, Haz Láser, Antena y Brazo)
    rover: `
      <svg viewBox="0 0 200 200" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="roverGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fde047"/>
            <stop offset="40%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
          <linearGradient id="solarBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1d4ed8"/>
            <stop offset="100%" stop-color="#1e3a8a"/>
          </linearGradient>
          <radialGradient id="irisCyan" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#67e8f9"/>
            <stop offset="60%" stop-color="#0284c7"/>
            <stop offset="100%" stop-color="#082f49"/>
          </radialGradient>
        </defs>

        <!-- Fondo Cósmico Común: Cielo lunar profundo, estrellas y la Tierra -->
        <rect width="200" height="200" fill="#02040a"/>
        <circle cx="22" cy="24" r="1" fill="#fff" opacity="0.8"/>
        <circle cx="54" cy="18" r="1.4" fill="#e0f2fe" opacity="0.9"/>
        <circle cx="92" cy="32" r="0.8" fill="#fff" opacity="0.6"/>
        <circle cx="124" cy="16" r="1.2" fill="#bae6fd" opacity="0.85"/>
        <circle cx="180" cy="22" r="1.1" fill="#fff" opacity="0.7"/>
        <circle cx="34" cy="58" r="0.9" fill="#fff" opacity="0.55"/>
        <circle cx="172" cy="68" r="1.3" fill="#fed7aa" opacity="0.75"/>

        <!-- La Tierra en cuarto menguante con atmósfera y nubes arremolinadas -->
        <g transform="translate(162, 34)">
          <circle cx="0" cy="0" r="17" fill="#38bdf8" opacity="0.18"/>
          <circle cx="0" cy="0" r="14" fill="#0c2340"/>
          <path d="M-6 -9 Q-2 -7 -4 -2 Q-7 3 -3 7 Q1 10 -2 14 A 14 14 0 0 1 -14 0 A 14 14 0 0 1 -6 -9 Z" fill="#15803d" opacity="0.85"/>
          <path d="M5 -11 Q8 -6 5 -1 Q7 5 3 9 A 14 14 0 0 0 14 0 A 14 14 0 0 0 5 -11 Z" fill="#166534" opacity="0.75"/>
          <path d="M-11 -5 Q-4 -8 4 -4 Q10 -2 14 -3" stroke="#ffffff" stroke-width="1.8" fill="none" opacity="0.85" stroke-linecap="round"/>
          <path d="M-9 3 Q-1 1 6 5 Q11 7 13 3" stroke="#ffffff" stroke-width="1.6" fill="none" opacity="0.75" stroke-linecap="round"/>
          <path d="M-5 9 Q1 8 7 10" stroke="#ffffff" stroke-width="1.3" fill="none" opacity="0.6" stroke-linecap="round"/>
          <path d="M0 -14 A 14 14 0 0 0 0 14 A 9 14 0 0 1 0 -14 Z" fill="#02040a" opacity="0.75"/>
          <circle cx="0" cy="0" r="14" fill="none" stroke="#7dd3fc" stroke-width="0.9" opacity="0.9"/>
        </g>

        <!-- Horizonte en relieve del cráter Shackleton y balizas -->
        <path d="M0 140 Q45 128 95 136 T200 130 L200 200 L0 200 Z" fill="#1e293b"/>
        <path d="M0 156 Q60 146 120 152 T200 148 L200 200 L0 200 Z" fill="#0f172a"/>
        <ellipse cx="46" cy="168" rx="22" ry="6" fill="#080c14" stroke="#334155" stroke-width="1.2"/>
        <ellipse cx="168" cy="172" rx="16" ry="4.5" fill="#080c14" stroke="#334155" stroke-width="1"/>

        <!-- Antena Parabólica de Alta Ganancia Orientable (Izquierda) -->
        <line x1="55" y1="36" x2="55" y2="76" stroke="#94a3b8" stroke-width="4.5"/>
        <path d="M26 36 Q55 60 84 36" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
        <line x1="38" y1="40" x2="72" y2="40" stroke="#60a5fa" stroke-width="1.2" stroke-dasharray="2 2"/>
        <line x1="55" y1="46" x2="55" y2="24" stroke="#f43f5e" stroke-width="2.5"/>
        <circle cx="55" cy="22" r="4.5" fill="#ef4444"/>

        <!-- Panel Solar Lateral Texturizado con Celdas de Silicio -->
        <rect x="14" y="80" width="26" height="40" rx="3" fill="url(#solarBlue)" stroke="#60a5fa" stroke-width="2"/>
        <line x1="14" y1="92" x2="40" y2="92" stroke="#93c5fd" stroke-width="1"/>
        <line x1="14" y1="104" x2="40" y2="104" stroke="#93c5fd" stroke-width="1"/>
        <line x1="27" y1="80" x2="27" y2="120" stroke="#93c5fd" stroke-width="1"/>

        <!-- Brazo Robótico Articulado Derecho con Garra Muestreadora -->
        <polyline points="146,88 172,60 184,82" fill="none" stroke="#94a3b8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="148" y1="84" x2="168" y2="62" stroke="#f59e0b" stroke-width="2.5"/>
        <circle cx="172" cy="60" r="5" fill="#f59e0b" stroke="#1e293b" stroke-width="1.5"/>
        <path d="M184 82 L192 78 M184 82 L194 85 M184 82 L190 92" stroke="#38bdf8" stroke-width="2.8" stroke-linecap="round"/>
        <circle cx="184" cy="82" r="3" fill="#ef4444"/>

        <!-- Chasis Principal Blindado en Amarillo Industrial NASA -->
        <rect x="38" y="74" width="124" height="60" rx="10" fill="url(#roverGold)" stroke="#fef3c7" stroke-width="3.2"/>
        <!-- Franja de peligro chevron / advertencia industrial -->
        <path d="M42 124 L50 134 M54 124 L62 134 M66 124 L74 134 M78 124 L86 134 M90 124 L98 134 M102 124 L110 134 M114 124 L122 134 M126 124 L134 134 M138 124 L146 134 M150 124 L158 134" stroke="#1e293b" stroke-width="3.5" stroke-linecap="square"/>

        <!-- Pantalla de Diagnóstico y Ranuras de Ventilación -->
        <rect x="48" y="84" width="60" height="34" rx="5" fill="#090d16" stroke="#38bdf8" stroke-width="2"/>
        <text x="52" y="95" fill="#22d3ee" font-family="monospace" font-size="5" font-weight="bold">[ROV-HEAVY // AUTON]</text>
        <line x1="53" y1="102" x2="98" y2="102" stroke="#22d3ee" stroke-width="2.2"/>
        <line x1="53" y1="110" x2="84" y2="110" stroke="#34d399" stroke-width="2.2"/>

        <!-- Torreta Óptica Multicapa con Iris Luminoso Cian y Visor Láser Rojo -->
        <circle cx="132" cy="98" r="16" fill="#0f172a" stroke="#e2e8f0" stroke-width="2.8"/>
        <circle cx="132" cy="98" r="10" fill="url(#irisCyan)" stroke="#38bdf8" stroke-width="1.5"/>
        <circle cx="130" cy="95" r="3" fill="#ffffff" opacity="0.85"/>
        <!-- Visor Secundario de Haz Láser Rojo -->
        <rect x="114" y="117" width="36" height="7" rx="3" fill="#1e293b" stroke="#f43f5e" stroke-width="1.5"/>
        <line x1="116" y1="120.5" x2="148" y2="120.5" stroke="#ef4444" stroke-width="2.5"/>
        <circle cx="132" cy="120.5" r="2" fill="#fff"/>

        <!-- Tren de Rodaje Rocker-Bogie (3 Ruedas de Titanio Cleated con Bujes Ámbar) -->
        <line x1="50" y1="134" x2="150" y2="134" stroke="#94a3b8" stroke-width="4.5"/>
        <line x1="50" y1="134" x2="50" y2="158" stroke="#64748b" stroke-width="4"/>
        <line x1="100" y1="134" x2="100" y2="158" stroke="#64748b" stroke-width="4"/>
        <line x1="150" y1="134" x2="150" y2="158" stroke="#64748b" stroke-width="4"/>
        <!-- Rueda 1 -->
        <circle cx="50" cy="158" r="20" fill="#090d16" stroke="#94a3b8" stroke-width="4.5"/>
        <circle cx="50" cy="158" r="8" fill="#f59e0b" stroke="#1e293b" stroke-width="2"/>
        <!-- Rueda 2 -->
        <circle cx="100" cy="158" r="20" fill="#090d16" stroke="#94a3b8" stroke-width="4.5"/>
        <circle cx="100" cy="158" r="8" fill="#f59e0b" stroke="#1e293b" stroke-width="2"/>
        <!-- Rueda 3 -->
        <circle cx="150" cy="158" r="20" fill="#090d16" stroke="#94a3b8" stroke-width="4.5"/>
        <circle cx="150" cy="158" r="8" fill="#f59e0b" stroke="#1e293b" stroke-width="2"/>
      </svg>
    `,

    // Cápsula / Dron Orbital (Perspectiva Isométrica, Escudo Térmico Cerámico, Alas Solares Azul Zafiro y Ventana Iluminada)
    module: `
      <svg viewBox="0 0 200 200" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="moduleHull" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#94a3b8"/>
            <stop offset="30%" stop-color="#e2e8f0"/>
            <stop offset="70%" stop-color="#f8fafc"/>
            <stop offset="100%" stop-color="#64748b"/>
          </linearGradient>
          <linearGradient id="solarCell" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#2563eb"/>
            <stop offset="50%" stop-color="#1d4ed8"/>
            <stop offset="100%" stop-color="#1e3a8a"/>
          </linearGradient>
          <radialGradient id="cockpitGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#a5f3fc"/>
            <stop offset="45%" stop-color="#06b6d4"/>
            <stop offset="85%" stop-color="#0e7490"/>
            <stop offset="100%" stop-color="#083344"/>
          </radialGradient>
          <pattern id="heatShieldHex" width="10" height="8" patternUnits="userSpaceOnUse">
            <path d="M5 0 L10 2.5 L10 5.5 L5 8 L0 5.5 L0 2.5 Z" fill="#0f172a" stroke="#334155" stroke-width="0.8"/>
          </pattern>
        </defs>

        <!-- Fondo Cósmico Común: Cielo lunar profundo, estrellas y la Tierra -->
        <rect width="200" height="200" fill="#02040a"/>
        <circle cx="22" cy="24" r="1" fill="#fff" opacity="0.8"/>
        <circle cx="54" cy="18" r="1.4" fill="#e0f2fe" opacity="0.9"/>
        <circle cx="92" cy="32" r="0.8" fill="#fff" opacity="0.6"/>
        <circle cx="124" cy="16" r="1.2" fill="#bae6fd" opacity="0.85"/>
        <circle cx="180" cy="22" r="1.1" fill="#fff" opacity="0.7"/>
        <circle cx="34" cy="58" r="0.9" fill="#fff" opacity="0.55"/>
        <circle cx="172" cy="68" r="1.3" fill="#fed7aa" opacity="0.75"/>

        <!-- La Tierra en cuarto menguante con atmósfera y nubes arremolinadas -->
        <g transform="translate(162, 34)">
          <circle cx="0" cy="0" r="17" fill="#38bdf8" opacity="0.18"/>
          <circle cx="0" cy="0" r="14" fill="#0c2340"/>
          <path d="M-6 -9 Q-2 -7 -4 -2 Q-7 3 -3 7 Q1 10 -2 14 A 14 14 0 0 1 -14 0 A 14 14 0 0 1 -6 -9 Z" fill="#15803d" opacity="0.85"/>
          <path d="M5 -11 Q8 -6 5 -1 Q7 5 3 9 A 14 14 0 0 0 14 0 A 14 14 0 0 0 5 -11 Z" fill="#166534" opacity="0.75"/>
          <path d="M-11 -5 Q-4 -8 4 -4 Q10 -2 14 -3" stroke="#ffffff" stroke-width="1.8" fill="none" opacity="0.85" stroke-linecap="round"/>
          <path d="M-9 3 Q-1 1 6 5 Q11 7 13 3" stroke="#ffffff" stroke-width="1.6" fill="none" opacity="0.75" stroke-linecap="round"/>
          <path d="M-5 9 Q1 8 7 10" stroke="#ffffff" stroke-width="1.3" fill="none" opacity="0.6" stroke-linecap="round"/>
          <path d="M0 -14 A 14 14 0 0 0 0 14 A 9 14 0 0 1 0 -14 Z" fill="#02040a" opacity="0.75"/>
          <circle cx="0" cy="0" r="14" fill="none" stroke="#7dd3fc" stroke-width="0.9" opacity="0.9"/>
        </g>

        <!-- Horizonte en relieve del cráter Shackleton y balizas -->
        <path d="M0 144 Q45 132 95 140 T200 134 L200 200 L0 200 Z" fill="#1e293b"/>
        <path d="M0 160 Q60 150 120 156 T200 152 L200 200 L0 200 Z" fill="#0f172a"/>
        <ellipse cx="46" cy="168" rx="22" ry="6" fill="#080c14" stroke="#334155" stroke-width="1.2"/>
        <ellipse cx="168" cy="172" rx="16" ry="4.5" fill="#080c14" stroke="#334155" stroke-width="1"/>

        <!-- Paneles Solares Desplegables con Rejilla Fotovoltaica Azul Zafiro -->
        <!-- Ala Izquierda -->
        <rect x="8" y="66" width="46" height="58" rx="4" fill="url(#solarCell)" stroke="#38bdf8" stroke-width="2.5"/>
        <line x1="8" y1="80" x2="54" y2="80" stroke="#60a5fa" stroke-width="1.2"/>
        <line x1="8" y1="94" x2="54" y2="94" stroke="#60a5fa" stroke-width="1.2"/>
        <line x1="8" y1="108" x2="54" y2="108" stroke="#60a5fa" stroke-width="1.2"/>
        <line x1="31" y1="66" x2="31" y2="124" stroke="#60a5fa" stroke-width="1.2"/>
        <line x1="54" y1="95" x2="62" y2="95" stroke="#cbd5e1" stroke-width="4.5"/>

        <!-- Ala Derecha -->
        <rect x="146" y="66" width="46" height="58" rx="4" fill="url(#solarCell)" stroke="#38bdf8" stroke-width="2.5"/>
        <line x1="146" y1="80" x2="192" y2="80" stroke="#60a5fa" stroke-width="1.2"/>
        <line x1="146" y1="94" x2="192" y2="94" stroke="#60a5fa" stroke-width="1.2"/>
        <line x1="146" y1="108" x2="192" y2="108" stroke="#60a5fa" stroke-width="1.2"/>
        <line x1="169" y1="66" x2="169" y2="124" stroke="#60a5fa" stroke-width="1.2"/>
        <line x1="138" y1="95" x2="146" y2="95" stroke="#cbd5e1" stroke-width="4.5"/>

        <!-- Propulsores RCS Quad Laterales Superiores -->
        <polygon points="58,48 50,44 50,54" fill="#334155" stroke="#94a3b8" stroke-width="1.5"/>
        <polygon points="142,48 150,44 150,54" fill="#334155" stroke="#94a3b8" stroke-width="1.5"/>

        <!-- Mástil Superior de Acoplamiento y Sensores Láser -->
        <line x1="100" y1="12" x2="100" y2="34" stroke="#f59e0b" stroke-width="4"/>
        <circle cx="100" cy="12" r="5" fill="#22d3ee"/>
        <circle cx="86" cy="34" r="3.2" fill="#ef4444"/>
        <circle cx="114" cy="34" r="3.2" fill="#22c55e"/>

        <!-- Casco Presurizado Metálico Remachado con Franjas de Misión -->
        <rect x="58" y="34" width="84" height="114" rx="22" fill="url(#moduleHull)" stroke="#334155" stroke-width="3.5"/>
        <!-- Franjas de reconocimiento de misión (Cian y Ámbar) -->
        <rect x="58" y="58" width="84" height="6" fill="#0284c7"/>
        <rect x="58" y="65" width="84" height="4" fill="#f59e0b"/>
        <line x1="58" y1="122" x2="142" y2="122" stroke="#475569" stroke-width="2.5"/>

        <!-- Escudo Térmico Texturizado con Placas Cerámicas Hexagonales -->
        <path d="M64 136 Q100 148 136 136 L142 148 Q100 162 58 148 Z" fill="url(#heatShieldHex)" stroke="#475569" stroke-width="1.8"/>

        <!-- Ventanilla de Observación Iluminada con Estructura Interior y Retícula -->
        <circle cx="100" cy="92" r="26" fill="#0f172a" stroke="#38bdf8" stroke-width="3.2"/>
        <circle cx="100" cy="92" r="20" fill="url(#cockpitGlow)"/>
        <!-- Refuerzo estructural y retícula de atraque -->
        <line x1="82" y1="92" x2="118" y2="92" stroke="#083344" stroke-width="2" opacity="0.65"/>
        <line x1="100" y1="74" x2="100" y2="110" stroke="#083344" stroke-width="2" opacity="0.65"/>
        <path d="M88 80 Q100 74 112 80" stroke="#ffffff" stroke-width="2.5" fill="none" opacity="0.85" stroke-linecap="round"/>
        <circle cx="100" cy="92" r="6" fill="none" stroke="#22d3ee" stroke-width="1.2" opacity="0.8"/>

        <!-- Toberas RCS / Propulsores de Gas Frío Inferiores -->
        <polygon points="72,148 64,168 84,168" fill="#334155" stroke="#94a3b8" stroke-width="1.8"/>
        <polygon points="128,148 116,168 136,168" fill="#334155" stroke="#94a3b8" stroke-width="1.8"/>
      </svg>
    `
  };

  // =======================================================================
  // 4. DIAGRAMAS INTERNOS DE RAYOS-X MEJORADOS PARA EL CONTENEDOR (SVG)
  // =======================================================================
  const XRAY_CRATE_SVGS = {
    uv_coil_short: `
      <svg viewBox="0 0 64 64" class="w-20 h-20 shrink-0">
        <rect x="4" y="8" width="56" height="48" rx="5" fill="#041e30" stroke="#22d3ee" stroke-width="2"/>
        <!-- Pistas de circuito luminosas -->
        <line x1="8" y1="20" x2="56" y2="20" stroke="#0284c7" stroke-width="1" stroke-dasharray="3 2"/>
        <line x1="8" y1="44" x2="56" y2="44" stroke="#0284c7" stroke-width="1" stroke-dasharray="3 2"/>
        <!-- Bobina inductora y arco eléctrico animado -->
        <path d="M10 32 C14 14, 20 14, 24 32 C28 50, 34 50, 38 32 C42 14, 48 14, 54 32" fill="none" stroke="#38bdf8" stroke-width="2.5"/>
        <polygon points="35,10 26,28 35,28 28,48 45,25 35,25" fill="#fbbf24"/>
        <circle cx="34" cy="28" r="3" fill="#fff"/>
      </svg>
    `,
    cryo_tank_bypass: `
      <svg viewBox="0 0 64 64" class="w-20 h-20 shrink-0">
        <rect x="14" y="6" width="36" height="52" rx="14" fill="#042638" stroke="#22d3ee" stroke-width="2.2"/>
        <!-- Nivel de oxígeno líquido criogénico -->
        <path d="M16 34 Q24 30 32 34 T48 34 L48 48 A10 10 0 0 1 16 48 Z" fill="#0284c7" opacity="0.75"/>
        <circle cx="26" cy="42" r="2" fill="#bae6fd"/>
        <circle cx="38" cy="39" r="1.8" fill="#bae6fd"/>
        <line x1="32" y1="6" x2="32" y2="58" stroke="#67e8f9" stroke-width="1.8" stroke-dasharray="4 2"/>
        <circle cx="32" cy="22" r="6" fill="#0f172a" stroke="#fbbf24" stroke-width="2"/>
      </svg>
    `,
    cracked_ice_dust: `
      <svg viewBox="0 0 64 64" class="w-20 h-20 shrink-0">
        <polygon points="32,6 56,20 50,54 14,54 8,20" fill="#082f49" stroke="#38bdf8" stroke-width="2"/>
        <!-- Fractura interna y partículas de sílice radiactiva -->
        <polyline points="20,14 34,27 26,38 44,52" fill="none" stroke="#f43f5e" stroke-width="3"/>
        <circle cx="23" cy="29" r="3" fill="#fb7185"/>
        <circle cx="39" cy="23" r="3.2" fill="#f43f5e"/>
        <circle cx="37" cy="41" r="2.8" fill="#fbbf24"/>
      </svg>
    `,
    isotope_cells_leak: `
      <svg viewBox="0 0 64 64" class="w-20 h-20 shrink-0">
        <rect x="8" y="12" width="13" height="40" rx="3" fill="#4c0519" stroke="#f43f5e" stroke-width="2"/>
        <rect x="25.5" y="12" width="13" height="40" rx="3" fill="#4c0519" stroke="#f43f5e" stroke-width="2"/>
        <rect x="43" y="12" width="13" height="40" rx="3" fill="#4c0519" stroke="#f43f5e" stroke-width="2"/>
        <circle cx="32" cy="32" r="21" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="4 3"/>
        <circle cx="32" cy="32" r="5" fill="#ef4444"/>
      </svg>
    `,
    proton_suit_kit: `
      <svg viewBox="0 0 64 64" class="w-20 h-20 shrink-0">
        <rect x="10" y="10" width="44" height="44" rx="7" fill="#2e1065" stroke="#c084fc" stroke-width="2"/>
        <path d="M18 46 L46 18 M22 18 L46 42" stroke="#f43f5e" stroke-width="2.5"/>
        <circle cx="32" cy="32" r="11" fill="#581c87" stroke="#fbbf24" stroke-width="2.2"/>
        <circle cx="32" cy="32" r="4" fill="#38bdf8"/>
      </svg>
    `,
    clogged_hepa_turbine: `
      <svg viewBox="0 0 64 64" class="w-20 h-20 shrink-0">
        <circle cx="32" cy="32" r="24" fill="#0f172a" stroke="#f43f5e" stroke-width="2.5"/>
        <line x1="12" y1="32" x2="52" y2="32" stroke="#94a3b8" stroke-width="3"/>
        <line x1="32" y1="12" x2="32" y2="52" stroke="#94a3b8" stroke-width="3"/>
        <circle cx="24" cy="24" r="5.5" fill="#fb7185"/>
        <circle cx="41" cy="39" r="6.5" fill="#f43f5e"/>
        <circle cx="38" cy="22" r="3.5" fill="#fbbf24"/>
      </svg>
    `,
    mutant_algae_spores: `
      <svg viewBox="0 0 64 64" class="w-20 h-20 shrink-0">
        <rect x="12" y="8" width="40" height="48" rx="9" fill="#022c22" stroke="#f43f5e" stroke-width="2.2"/>
        <circle cx="25" cy="24" r="6" fill="#a855f7" stroke="#f0abfc" stroke-width="1.8"/>
        <circle cx="39" cy="34" r="7" fill="#ec4899" stroke="#fbcfe8" stroke-width="1.8"/>
        <circle cx="25" cy="43" r="4.5" fill="#f43f5e"/>
      </svg>
    `,
    fission_core_crack: `
      <svg viewBox="0 0 64 64" class="w-20 h-20 shrink-0">
        <polygon points="32,6 58,52 6,52" fill="#451a03" stroke="#fbbf24" stroke-width="2.2"/>
        <polyline points="32,15 27,32 37,38 30,50" fill="none" stroke="#f43f5e" stroke-width="3"/>
        <circle cx="32" cy="35" r="7" fill="#ef4444" opacity="0.85"/>
      </svg>
    `
  };

  // =======================================================================
  // 1.5 BASE DE DATOS DE CASOS, GENERADOR DE HISTORIA Y SHUFFLE FISHER-YATES
  // =======================================================================
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generateMissionSchedule() {
    const masterKeys = [
      'botanist_uv',
      'lox_tank',
      'ice_rover',
      'isotope_batteries',
      'rossi_rescue',
      'biodome_heaters',
      'reyes_ventilation',
      'algae_spores',
      'kilopower',
      'water_uv',
      'med_capsule',
      'sato_reactor_or_shield',
      'orion_relay',
      'nasa_audit'
    ];

    const maxSols = state.maxSols || 4;
    const totalCasesNeeded = Math.min(masterKeys.length, maxSols * 2);

    const shuffled = shuffleArray(masterKeys);
    const picked = shuffled.slice(0, totalCasesNeeded);

    // Preservar causalidad narrativa:
    // 1. Si están el rover de hielo y el jefe de ventilación Reyes, el rover va antes
    const idxRover = picked.indexOf('ice_rover');
    const idxReyes = picked.indexOf('reyes_ventilation');
    if (idxRover !== -1 && idxReyes !== -1 && idxReyes < idxRover) {
      [picked[idxReyes], picked[idxRover]] = [picked[idxRover], picked[idxReyes]];
    }

    // 2. Si están el reactor Kilopower y el Ing. Sato, Kilopower va antes
    const idxKilo = picked.indexOf('kilopower');
    const idxSato = picked.indexOf('sato_reactor_or_shield');
    if (idxKilo !== -1 && idxSato !== -1 && idxSato < idxKilo) {
      [picked[idxSato], picked[idxKilo]] = [picked[idxKilo], picked[idxSato]];
    }

    state.missionSchedule = {};
    for (let s = 1; s <= maxSols; s++) {
      const c1 = picked[(s - 1) * 2] || 'botanist_uv';
      const c2 = picked[(s - 1) * 2 + 1] || 'lox_tank';
      state.missionSchedule[s] = [c1, c2];
    }
    return state.missionSchedule;
  }

  // =======================================================================
  // DICCIONARIO BILINGÜE DE CASOS LUNARES (EN / ES)
  // =======================================================================
  const CASE_I18N_EN = {
    botanist_uv: {
      shortLabel: 'Greenhouse UV Lamps',
      name: 'DR. LINH TRAN (HYDROPONIC BIODOME)',
      origin: 'SECTOR: INTERNAL GREENHOUSE B',
      mass: 'EQUIPMENT: 95 KG',
      dialogue: '"The lunar wheat seedlings are freezing without light! I need authorization to turn on the emergency UV lamp bank immediately."',
      solarFluxBadge: 'FLUX: NOMINAL',
      solarSubtitle: 'STABLE MAGNETOSPHERE',
      dossier: {
        applicant: 'DR. L. TRAN',
        sector: 'HYDROPONIC GREENHOUSE',
        weight: '95 KG // INTERNAL',
        declaredImpact: '+25% FOOD',
        cargoDesc: 'Small lunar wheat sprouts are freezing due to lack of light; heat lamps must be ignited to save the harvest.',
        uvStamp: 'UV ENERGY AUDIT',
        secretText: 'SECRET NOTE: These old lamps draw immense power from the main generators upon ignition, risking blackouts in other sectors.',
        uvTradeoffPapers: 'PAPERS: +25% FOOD, -20% POWER',
        uvTradeoff: 'PAPERS: +25% FOOD, -20% POWER | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'UV LAMP BALLAST',
        hazard: 'HIGH VOLTAGE',
        radReading: '2.4 mSv (LOW)',
        secretTitle: 'X-RAY: SECONDARY ELECTRIC COIL',
        secretSub: 'Watch out! Internal wiring is stripped and will spark if energized at full power.',
        secretImpactText: 'CRATE EFFECT: -5% EXTRA POWER (SPARKS)',
        crateDiscoveredText: '-5% POWER (SPARKS)'
      },
      feedbackAuth: 'UV LAMPS ACTIVATED: Crops saved (+25% Food), heavy power drain (-25% Power).',
      feedbackDeny: 'LAMPS DENIED: Power preserved, but part of the crop was lost (-15% Food).'
    },
    lox_tank: {
      shortLabel: 'Oxygen Tank Refill',
      name: 'SPEC. MARCUS VANCE (OXYGEN)',
      origin: 'ORIGIN: EXT. CRYOGENIC DEPOT',
      mass: 'TOTAL MASS: 130 KG',
      dialogue: '"I have a liquid oxygen tank from the exterior depot, but to pressurize it quickly I must draw power from the base reserves."',
      solarFluxBadge: 'FLUX: MODERATE',
      solarSubtitle: 'SUNSPOT RISING',
      dossier: {
        applicant: 'SPEC. M. VANCE',
        sector: 'OXYGEN PLANT',
        weight: '130 KG // EXTERIOR',
        declaredImpact: '+20% OXYGEN',
        cargoDesc: 'Delivering pure oxygen tanks from the outside depot so crew can breathe fresh air inside the base.',
        uvStamp: 'MANIFEST OMISSION',
        secretText: 'SECRET NOTE: To heat liquid oxygen this rapidly, paperwork authorizes routing power directly from base reserves.',
        uvTradeoffPapers: 'PAPERS: +20% OXYGEN, -10% POWER',
        uvTradeoff: 'PAPERS: +20% OXYGEN, -10% POWER | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'LOX CRYOSTAT',
        hazard: 'CRYOGENIC',
        radReading: '4.1 mSv (NORMAL)',
        secretTitle: 'X-RAY: MODIFIED CRYOGENIC BYPASS',
        secretSub: 'The valve has a minor cold gas leak that will draw extra power to prevent freezing!',
        secretImpactText: 'CRATE EFFECT: -5% EXTRA POWER (CRYO LEAK)',
        crateDiscoveredText: '-5% POWER (COLD LEAK)'
      },
      feedbackAuth: 'LIQUID OXYGEN TRANSFERRED: +20% Oxygen with power drain (-15% Power).',
      feedbackDeny: 'REFILL CANCELLED: Saved power (+10% Power), but reserves decline (-15% Oxygen).'
    },
    ice_rover: {
      shortLabel: 'Shackleton Ice Rover',
      name: 'ICE ROVER "SHACKLETON-IV"',
      origin: 'ORIGIN: SOUTH SHACKLETON CRATER',
      mass: 'TOTAL MASS: 380 KG',
      dialogue: '"[TX-ROVER] Returning from polar mission with glacial ice blocks for Oxygen hydrolysis and crop irrigation. Requesting airlock cycle."',
      solarFluxBadge: 'FLUX: ELEVATED',
      solarSubtitle: 'IONIZED POLAR REGOLITH',
      dossier: {
        applicant: 'ROVER SHACKLETON-IV',
        sector: 'WATER / OXYGEN PROCESSOR',
        weight: '380 KG // EXTERIOR',
        declaredImpact: '+25% OXYGEN / +15% FOOD',
        cargoDesc: 'The robotic rover brings ice blocks from the lunar crater to melt into drinking water and greenhouse air.',
        uvStamp: 'CHAINED CONTAMINATION RISK',
        secretText: 'SECRET NOTE: Document seals hide that thawing tanks siphon energy from the defensive base shield.',
        uvTradeoffPapers: 'PAPERS: +25% OXYGEN, +15% FOOD, -10% SHIELD',
        uvTradeoff: 'PAPERS: +25% OXYGEN, +15% FOOD, -10% SHIELD | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'GLACIAL CONTAINER',
        hazard: 'LUNAR DUST',
        radReading: '34.0 mSv (ALERT)',
        secretTitle: 'MICRO-FRACTURE WITH RADIOACTIVE LUNAR DUST',
        secretSub: 'The container has a fracture and is packed with abrasive lunar regolith that will clog shield ducts!',
        secretImpactText: 'CRATE EFFECT: -10% EXTRA SHIELD (ABRASIVE DUST)',
        crateDiscoveredText: '-10% SHIELD (SHARP DUST)'
      },
      feedbackAuth: 'ICE ADMITTED: +25% Oxygen and +15% Food, but abrasive Lunar Dust entered (-20% Shield and risk in upcoming Sols).',
      feedbackDeny: 'ROVER DENIED: Base kept clean of lunar dust (+5% Shield), but water is scarce (-15% Oxygen, -10% Food).'
    },
    isotope_batteries: {
      shortLabel: 'Battery Drone 64.5 mSv',
      name: 'LOGISTICS DRONE "VOLT-7"',
      origin: 'ORIGIN: ANCIENT SOLAR ARRAY',
      mass: 'TOTAL MASS: 260 KG',
      dialogue: '"Urgent delivery of high-density accumulators to reinforce the station against external radiation."',
      solarFluxBadge: 'FLUX: ELEVATED',
      solarSubtitle: 'SOLAR FLARE DETECTED',
      dossier: {
        applicant: 'DRONE VOLT-7',
        sector: 'POWER SUBSTATION',
        weight: '260 KG // EXTERIOR',
        declaredImpact: '+30% POWER',
        cargoDesc: 'A cargo drone transporting recharged heavy batteries to keep station lights and computers powered through the night.',
        uvStamp: 'FORGED CERTIFICATE!',
        secretText: 'SECRET NOTE: Techs wiped security signatures. If these heavy cells are accepted, they will degrade shield conduits.',
        uvTradeoffPapers: 'PAPERS: +30% POWER, -5% SHIELD',
        uvTradeoff: 'PAPERS: +30% POWER, -5% SHIELD | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'ISOTOPE ACCUMULATOR',
        hazard: 'RAD > 50 mSv',
        radReading: '64.5 mSv (DANGER!)',
        secretTitle: 'X-RAY: UNLEADED COBALT RODS',
        secretSub: 'Critical hazard! Batteries are leaking invisible ionizing radiation far exceeding NASA safety limits.',
        secretImpactText: 'CRATE EFFECT: -25% OXYGEN (RADIATION LEAK)',
        crateDiscoveredText: '-25% OXYGEN (RADIATION LEAK)'
      },
      feedbackAuth: 'CELLS CONNECTED: +30% Power, but the radiation leak degraded life support (-25% Oxygen, -5% Shield).',
      feedbackDeny: 'CARGO DENIED: Protected Oxygen and reinforced shield (+10% Shield), but lost power (-15% Power).'
    },
    rossi_rescue: {
      shortLabel: 'Rescue Eng. Rossi (Storm)',
      name: 'ENG. MATEO ROSSI (OUTER ANTENNA)',
      origin: 'ORIGIN: SOUTH COMM TOWER',
      mass: 'TOTAL MASS: 118 KG',
      dialogue: '"Rossi here! The solar storm caught me repairing external relays! Open the airlock right now or my suit will breach!"',
      solarFluxBadge: 'CLASS X STORM',
      solarSubtitle: 'HIGH ENERGY PROTONS',
      dossier: {
        applicant: 'ENG. M. ROSSI',
        sector: 'COMM / POWER',
        weight: '118 KG // URGENT EVA',
        declaredImpact: 'CREW RESCUE / RESTORE POWER',
        cargoDesc: 'The engineer was caught outside repairing comms and begs for emergency entry before solar radiation overwhelms suit.',
        uvStamp: 'DIRECT POWER & SHIELD IMPACT',
        secretText: 'SECRET NOTE: Opening the outer hatch during a storm lets solar wind penetrate, weakening the base force field.',
        uvTradeoffPapers: 'PAPERS: +15% POWER, -15% SHIELD',
        uvTradeoff: 'PAPERS: +15% POWER, -15% SHIELD | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'SOLAR CALIBRATOR KIT',
        hazard: 'SOLAR PROTONS',
        radReading: '42.0 mSv (HIGH)',
        secretTitle: 'X-RAY: PROTON IONIZATION ON SUIT',
        secretSub: 'His metallic backpack carries ionized static that will discharge into the base shield upon entry!',
        secretImpactText: 'CRATE EFFECT: -15% EXTRA SHIELD (STATIC)',
        crateDiscoveredText: '-15% SHIELD (STATIC)'
      },
      feedbackAuth: 'ENGINEER RESCUED: Rossi calibrated the solar arrays (+15% Power), but storm radiation entered (-30% Shield).',
      feedbackDeny: 'AIRLOCK CLOSED: Rossi retreated to auxiliary bunker (-10% Oxygen, +10% Shield, -15% Power from uncalibrated dish).'
    },
    biodome_heaters: {
      shortLabel: 'Biodome Heaters',
      name: 'BIODOME THERMAL SYSTEM',
      origin: 'SECTOR: CENTRAL HYDROPONIC FARM',
      mass: 'INTERNAL SYSTEM',
      dialogue: '"The solar storm is causing thermal fluctuations. Requesting activation of high-power thermal heaters to protect crops and charge the shield."',
      solarFluxBadge: 'GEOMAGNETIC PEAK',
      solarSubtitle: 'SOLAR STORM IN PROGRESS',
      dossier: {
        applicant: 'BIODOME CONTROL',
        sector: 'FARM & INNER SHIELD',
        weight: 'INTERNAL // 0 KG',
        declaredImpact: '+15% FOOD',
        cargoDesc: 'Requesting activation of greenhouse heaters to protect vegetables and seedlings from lunar night polar freeze.',
        uvStamp: 'HIGH POWER CONSUMPTION',
        secretText: 'SECRET NOTE: Heaters consume so much electricity they could deplete station defenses.',
        uvTradeoffPapers: 'PAPERS: +15% FOOD, -15% POWER',
        uvTradeoff: 'PAPERS: +15% FOOD, -15% POWER | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'HEATING COIL',
        hazard: 'HIGH POWER',
        radReading: '5.0 mSv (SAFE)',
        secretTitle: 'X-RAY: HIGH-LOAD THERMAL RESISTORS',
        secretSub: 'Thermal element is overheated and will absorb extra power, though it reinforces the interior heat shield!',
        secretImpactText: 'CRATE EFFECT: +15% SHIELD, -5% EXTRA POWER',
        crateDiscoveredText: '+15% SHIELD, -5% POWER'
      },
      feedbackAuth: 'HEATERS ACTIVE: Crops and dome protected (+15% Food, +15% Shield) at cost of -20% Power.',
      feedbackDeny: 'SAVING MODE: Saved +10% Power, but frost damaged crops (-20% Food, -5% Shield).'
    },
    reyes_dust: {
      shortLabel: 'Lunar Dust Clog',
      name: 'CHIEF OF MAINTENANCE K. REYES',
      origin: 'ORIGIN: OXYGEN VENTILATION DUCTS',
      mass: 'INTERNAL EMERGENCY',
      dialogue: '"Red alert! Radioactive lunar dust from the Rover clogged oxygen ducts! We must trigger an electromagnetic purge immediately!"',
      solarFluxBadge: 'CHAINED FAILURE',
      solarSubtitle: 'FILTER CORROSION BY DUST',
      dossier: {
        applicant: 'ENG. K. REYES',
        sector: 'CENTRAL VENTILATION',
        weight: 'CORRODED FILTERS',
        declaredImpact: '+15% CLEAN OXYGEN',
        cargoDesc: 'Lunar dust that entered clogged air conduits; an electromagnetic pulse is required to clean them.',
        uvStamp: 'CHAINED OUTCOME (LUNAR DUST)',
        secretText: 'SECRET NOTE: The purge machinery consumes massive reserve power to blow abrasive dust out of vents.',
        uvTradeoffPapers: 'PAPERS: +15% OXYGEN, -15% POWER',
        uvTradeoff: 'PAPERS: +15% OXYGEN, -15% POWER | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'DUST-CORRODED FILTER',
        hazard: 'LUNAR SILICA',
        radReading: '18.5 mSv (INTERNAL)',
        secretTitle: 'X-RAY: CLOGGED TURBINE BLADES',
        secretSub: 'Ventilator blades are jammed by razor-sharp lunar regolith crystals, overloading the motor!',
        secretImpactText: 'CRATE EFFECT: -5% EXTRA POWER (JAMMED MOTOR)',
        crateDiscoveredText: '-5% POWER (JAMMED MOTOR)'
      },
      feedbackAuth: 'PURGE COMPLETED: Filters cleared (+15% Oxygen) at the expense of an emergency drain (-20% Power).',
      feedbackDeny: 'VENTILATION CLOGGED: Lunar dust drastically collapsed oxygen flow (-30% Oxygen).'
    },
    reyes_clean: {
      shortLabel: 'Oxygen Electrolysis',
      name: 'CHIEF OF MAINTENANCE K. REYES',
      origin: 'ORIGIN: OXYGEN VENTILATION DUCTS',
      mass: 'ROUTINE MAINTENANCE',
      dialogue: '"Since you kept vents free of abrasive dust, ventilation is pristine. Do you authorize an intensive electrolysis cycle to boost Oxygen?"',
      solarFluxBadge: 'CLEAN FILTERS',
      solarSubtitle: '100% LAMINAR FLOW',
      dossier: {
        applicant: 'ENG. K. REYES',
        sector: 'CENTRAL VENTILATION',
        weight: 'PRISTINE SYSTEM',
        declaredImpact: '+25% OXYGEN',
        cargoDesc: 'Permission requested to split clean water into fresh oxygen bubbles to replenish crew tanks.',
        uvStamp: 'MAINTENANCE BONUS',
        secretText: 'SECRET NOTE: Electrolysis requires substantial continuous power from solar arrays to split water molecules.',
        uvTradeoffPapers: 'PAPERS: +25% OXYGEN, -10% POWER',
        uvTradeoff: 'PAPERS: +25% OXYGEN, -10% POWER | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'OXYGEN ELECTROLYZER',
        hazard: 'HIGH POWER',
        radReading: '1.2 mSv (SAFE)',
        secretTitle: 'X-RAY: RESIDUE-FREE HEPA MEMBRANES',
        secretSub: 'Water loop is clean and scaling-free, but pressure pumps draw slightly more power!',
        secretImpactText: 'CRATE EFFECT: -5% EXTRA POWER (PRESSURE PUMP)',
        crateDiscoveredText: '-5% POWER (PUMP)'
      },
      feedbackAuth: 'ELECTROLYSIS SUCCESSFUL: +25% Oxygen consuming -15% Power.',
      feedbackDeny: 'CYCLE SKIPPED: +10% Power saved, but Oxygen pressure drops (-10%).'
    },
    algae_spores: {
      shortLabel: 'Spirulina Algae 58 mSv',
      name: 'ORBITAL CAPSULE "AGRO-X"',
      origin: 'ORIGIN: GATEWAY ORBITAL LAB',
      mass: 'TOTAL MASS: 190 KG',
      dialogue: '"Sending hyper-nutritive algae strains grown in deep space. They can double food rations immediately!"',
      solarFluxBadge: 'RADIATION > 50 mSv',
      solarSubtitle: 'DEEP SPACE CARGO',
      dossier: {
        applicant: 'AGRO-X CAPSULE',
        sector: 'ALGAE BIODOME',
        weight: '190 KG // EXTERIOR',
        declaredImpact: '+30% FOOD',
        cargoDesc: 'Carrying rapid-growth green microalgae culture to feed all outpost astronauts.',
        uvStamp: 'BIO-RADIATION ALERT',
        secretText: 'SECRET NOTE: Fast-growth lunar nutrients release high heat that erodes base shield integrity.',
        uvTradeoffPapers: 'PAPERS: +30% FOOD, -5% SHIELD',
        uvTradeoff: 'PAPERS: +30% FOOD, -5% SHIELD | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'ORBITAL BIOREACTOR',
        hazard: 'RAD > 50 mSv',
        radReading: '58.0 mSv (DANGER!)',
        secretTitle: 'X-RAY: IRRADIATED BIOMASS AT 58.0 mSv',
        secretSub: 'Danger! Algae mutated under cosmic rays and emits invisible radiation far above safe limits.',
        secretImpactText: 'CRATE EFFECT: -25% OXYGEN (RADIATION LEAK)',
        crateDiscoveredText: '-25% OXYGEN (RADIATION LEAK)'
      },
      feedbackAuth: 'ALGAE INTEGRATED: +30% Food, but the radiation leak compromised oxygen (-25% Oxygen, -5% Shield).',
      feedbackDeny: 'CAPSULE REJECTED: Avoided radioactive contamination (+10% Shield), but food rations drop (-15% Food).'
    },
    kilopower: {
      shortLabel: 'Kilopower Reactor',
      name: 'HEAVY TRANSPORT "KILOPOWER-1"',
      origin: 'ORIGIN: NORTH CRATER SECTOR',
      mass: 'TOTAL MASS: 520 KG',
      dialogue: '"Delivering the portable nuclear micro-reactor to recharge the entire base and multiply our power reserves."',
      solarFluxBadge: 'FLUX: ENERGIZED',
      solarSubtitle: 'SHIELDING CALIBRATION',
      dossier: {
        applicant: 'CONVOY KILOPOWER-1',
        sector: 'POWER CORE',
        weight: '520 KG // EXTERIOR',
        declaredImpact: '+35% POWER',
        cargoDesc: 'Compact nuclear engine to connect to the station grid, multiplying available power for all systems.',
        uvStamp: 'CHAINED OVERHEAT RISK',
        secretText: 'SECRET NOTE: Connecting this nuclear engine diverts power from magnetic shields, risking difficult thermal overloads later.',
        uvTradeoffPapers: 'PAPERS: +35% POWER, -10% SHIELD',
        uvTradeoff: 'PAPERS: +35% POWER, -10% SHIELD | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'KILOPOWER CORE',
        hazard: 'FISSION CORE',
        radReading: '44.0 mSv (ELEVATED)',
        secretTitle: 'X-RAY: CRACK IN LIQUID SODIUM PIPE',
        secretSub: 'Caution! A micro-crack in the cooling loop compromises external magnetic insulation.',
        secretImpactText: 'CRATE EFFECT: -5% EXTRA SHIELD (PIPE CRACK)',
        crateDiscoveredText: '-5% SHIELD (PIPE CRACK)'
      },
      feedbackAuth: 'REACTOR CONNECTED: +35% Power (-15% Shield). Warning: Risk of thermal overheating!',
      feedbackDeny: 'REACTOR DENIED: Shield reinforced (+15% Shield), but power reserves drop (-20% Power).'
    },
    water_uv: {
      shortLabel: 'UV Water Purification',
      name: 'DR. LINH TRAN (DECONTAMINATION)',
      origin: 'SECTOR: BIO-HYDRAULIC RECYCLER',
      mass: 'INTERNAL SYSTEM',
      dialogue: '"We need to run high-power UV decontamination on recycled greywater to secure oxygen and food for the outpost."',
      solarFluxBadge: 'FLUX: STABLE',
      solarSubtitle: 'BIO-HYDRAULIC FILTRATION',
      dossier: {
        applicant: 'DR. L. TRAN',
        sector: 'HYDRO-LIFE PLANT',
        weight: 'INTERNAL // UV',
        declaredImpact: '+20% OXYGEN / +20% FOOD',
        cargoDesc: 'Smart system activates UV sterilization to disinfect greywater and replenish drinking supplies.',
        uvStamp: 'HIGH POWER AUDIT',
        secretText: 'SECRET NOTE: Water filters require continuous high generator power to sterilize every drop.',
        uvTradeoffPapers: 'PAPERS: +20% OXYGEN, +20% FOOD, -20% POWER',
        uvTradeoff: 'PAPERS: +20% OXYGEN, +20% FOOD, -20% POWER | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'UV-C PURIFIER',
        hazard: 'HIGH POWER',
        radReading: '1.8 mSv (SAFE)',
        secretTitle: 'X-RAY: PRISTINE QUARTZ CHAMBER',
        secretSub: 'Tubes are spotless and bacteria-free! Clean water also cools the magnetic shield coils.',
        secretImpactText: 'CRATE EFFECT: +5% SHIELD (COOLED PUMP)',
        crateDiscoveredText: '+5% SHIELD (COOLING)'
      },
      feedbackAuth: 'PURIFICATION SUCCESSFUL: +20% Oxygen, +20% Food and +5% Shield consuming -20% Power.',
      feedbackDeny: 'PURIFICATION CANCELLED: +10% Power saved, but Oxygen (-15%) and Food (-15%) decline.'
    },
    med_capsule: {
      shortLabel: 'Medical Capsule (Storm)',
      name: 'SUPPLY CAPSULE "ARTEMIS-MED"',
      origin: 'ORIGIN: LUNAR POLAR ORBIT',
      mass: 'TOTAL MASS: 240 KG',
      dialogue: '"Emergency landing amidst the Solar Storm! We bring pressurized Oxygen cylinders and freeze-dried rations. Requesting outer airlock access!"',
      solarFluxBadge: 'CLASS X STORM',
      solarSubtitle: 'SEVERE CORONAL BOMBARDMENT',
      dossier: {
        applicant: 'ARTEMIS-MED CAPSULE',
        sector: 'OUTER AIRLOCK A-04',
        weight: '240 KG // EXTERIOR',
        declaredImpact: '+25% OXYGEN / +25% FOOD',
        cargoDesc: 'Medical capsule with pharmaceuticals and emergency nutrition during peak solar storm intensity.',
        uvStamp: 'SOLAR STORM ALERT',
        secretText: 'SECRET NOTE: Opening outer hatch during storm vents magnetic containment. If shield is weak, radiation damages life support.',
        uvTradeoffPapers: 'PAPERS: +25% OXYGEN, +25% FOOD, -10% SHIELD',
        uvTradeoff: 'PAPERS: +25% OXYGEN, +25% FOOD, -10% SHIELD | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'NASA VITAL SUPPLY',
        hazard: 'SOLAR STORM',
        radReading: '29.0 mSv (EXTERIOR)',
        secretTitle: 'X-RAY: OXYGEN CYLINDERS & RATIONS',
        secretSub: 'The medical container is intact, but its hull absorbed radiation that will discharge into the shield!',
        secretImpactText: 'CRATE EFFECT: -10% EXTRA SHIELD (SOLAR FRICTION)',
        crateDiscoveredText: '-10% SHIELD (SOLAR FRICTION)'
      },
      feedbackAuth: 'MEDICAL SUPPLY RECEIVED: +25% Oxygen and +25% Food to withstand the peak storm (-20% Shield).',
      feedbackDeny: 'CAPSULE KEPT OUTSIDE: Shield protected (+15%), but crew must ration supplies (-15% Oxygen, -15% Food).'
    },
    sato_chain: {
      shortLabel: 'Reactor Leak',
      name: 'NUCLEAR ENG. H. SATO (KILOPOWER ALERT)',
      origin: 'ORIGIN: REACTOR ROOM',
      mass: 'CHAINED CRISIS',
      dialogue: '"The connected power reactor entered thermal resonance! We must inject liquid oxygen to quench it or the shield will burst!"',
      solarFluxBadge: 'NUCLEAR CRISIS',
      solarSubtitle: 'THERMAL RESONANCE IN CORE',
      dossier: {
        applicant: 'ENG. H. SATO',
        sector: 'POWER CORE',
        weight: 'INTERNAL EMERGENCY',
        declaredImpact: '+20% SHIELD / +15% POWER PROTECTED',
        cargoDesc: 'The connected reactor overheated; emergency cryo gas injection needed to prevent containment loss.',
        uvStamp: 'CHAINED OUTCOME (REACTOR)',
        secretText: 'SECRET NOTE: Cryogenic cooling gas is siphoned from astronaut breathing reserves to save the reactor.',
        uvTradeoffPapers: 'PAPERS: +20% SHIELD, +15% POWER',
        uvTradeoff: 'PAPERS: +20% SHIELD, +15% POWER | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'COOLANT VALVE',
        hazard: 'THERMAL LEAK',
        radReading: '46.0 mSv (CRITICAL)',
        secretTitle: 'X-RAY: BOILING IN FISSION CORE',
        secretSub: 'The high-pressure line will rapidly consume massive life-support oxygen if actuated!',
        secretImpactText: 'CRATE EFFECT: -20% OXYGEN (CRYOGENIC DRAW)',
        crateDiscoveredText: '-20% OXYGEN (CRYO GAS)'
      },
      feedbackAuth: 'CORE COOLED: Spent -20% Oxygen, but stabilized shield (+20% Shield) and power (+15% Power).',
      feedbackDeny: 'REACTOR MELTDOWN DRAIN: Conserved Oxygen, but radiation leak devastated shield (-30% Shield, -15% Power).'
    },
    sato_normal: {
      shortLabel: 'Shield Coil Reinforcement',
      name: 'NUCLEAR ENG. H. SATO (MAGNETIC COILS)',
      origin: 'ORIGIN: SHIELD DOCK',
      mass: 'INTERNAL CONTROL',
      dialogue: '"With no unstable reactors, our conduits are secure. Shall we divert -20% Power to maximize the radiation shield?"',
      solarFluxBadge: 'STABLE SYSTEM',
      solarSubtitle: 'ACTIVE MAGNETIC DEFENSE',
      dossier: {
        applicant: 'ENG. H. SATO',
        sector: 'SHIELD COILS',
        weight: 'INTERNAL',
        declaredImpact: '+25% SHIELD',
        cargoDesc: 'Connecting booster coils creates an energetic canopy to deflect solar storm ions.',
        uvStamp: 'SHIELD SYNCHRONIZATION',
        secretText: 'SECRET NOTE: Energizing such a potent magnetic canopy draws almost all available station electricity.',
        uvTradeoffPapers: 'PAPERS: +25% SHIELD, -15% POWER',
        uvTradeoff: 'PAPERS: +25% SHIELD, -15% POWER | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'SHIELD CAPACITOR',
        hazard: 'HIGH POWER',
        radReading: '3.5 mSv (SAFE)',
        secretTitle: 'X-RAY: STABLE MAGNETIC SUPERCONDUCTOR',
        secretSub: 'Superconducting coils are pristine, but need a brief current spike to calibrate electromagnets!',
        secretImpactText: 'CRATE EFFECT: -5% EXTRA POWER (CURRENT SPIKE)',
        crateDiscoveredText: '-5% POWER (CURRENT SPIKE)'
      },
      feedbackAuth: 'SHIELD REINFORCED: +25% Shield consuming -20% Power.',
      feedbackDeny: 'DIVERSION DENIED: +15% Power conserved, but storm eroded -15% Shield.'
    },
    orion_relay: {
      shortLabel: 'Relay Craft Orion-IX',
      name: 'RELAY SHUTTLE "ORION-IX"',
      origin: 'ORIGIN: EARTH-MOON TRANSFER ORBIT',
      mass: 'TOTAL MASS: 680 KG',
      dialogue: '"Relay craft on final approach! Carrying energy cells and provisions for final docking, but traversed the Van Allen belt without a full purge."',
      solarFluxBadge: (sol, max) => sol === max ? `FINAL DAY (${sol}/${max})` : 'FLUX: IONIZED',
      solarSubtitle: 'VAN ALLEN RADIATION ON CARGO',
      dossier: {
        applicant: 'SHUTTLE ORION-IX',
        sector: 'DOCKING BERTH A-01',
        weight: '680 KG // EXTERIOR',
        declaredImpact: '+25% POWER / +20% FOOD',
        cargoDesc: 'Relay spacecraft returning to Earth brings food crates and fresh battery arrays for mission completion.',
        uvStamp: 'RADIATION ALERT (>50 mSv)!',
        secretText: 'SECRET NOTE: Customs stamps reveal crates brushed planetary radiation belts and will erode shield upon entry.',
        uvTradeoffPapers: 'PAPERS: +25% POWER, +20% FOOD, -5% SHIELD',
        uvTradeoff: 'PAPERS: +25% POWER, +20% FOOD, -5% SHIELD | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'VAN ALLEN CARGO',
        hazard: 'RAD > 50 mSv',
        radReading: '54.0 mSv (DANGER!)',
        secretTitle: 'X-RAY: IONIZED CELLS AT 54.0 mSv',
        secretSub: 'Maximum alert! Outer metal was exposed to dangerous cosmic radiation and exceeds fifty millisieverts.',
        secretImpactText: 'CRATE EFFECT: -25% OXYGEN (RADIATION LEAK)',
        crateDiscoveredText: '-25% OXYGEN (RADIATION LEAK)'
      },
      feedbackAuth: 'ORION CARGO RECEIVED: +25% Power and +20% Food, but radiation reduced -25% Oxygen and -5% Shield.',
      feedbackDeny: 'EXTERNAL DECONTAMINATION: Protected Oxygen (+10%) and Shield (+10%), costing -15% Power and -10% Food.'
    },
    nasa_audit: {
      shortLabel: 'NASA Final Audit',
      name: 'CMDR. VANCE // NASA FINAL AUDIT',
      origin: 'SECTOR: LUNAR COMMAND CENTER',
      mass: 'CLOSING PROTOCOL',
      dialogue: '"Airlock Officer, we are approaching the conclusion of the lunar rotation. Do we initiate high-power pressurization and complete purge protocol to certify operations?"',
      solarFluxBadge: 'NASA CERTIFICATION',
      solarSubtitle: (sol) => `SOL ${sol} CLOSING EVALUATION`,
      dossier: {
        applicant: 'CMDR. E. VANCE',
        sector: 'CENTRAL CORE',
        weight: (sol) => `SOL ${sol} CLOSING`,
        declaredImpact: '+20% OXYGEN / +20% FOOD',
        cargoDesc: 'NASA Inspector General asks to cycle primary computers to certify lunar base operational readiness.',
        uvStamp: 'CERTIFICATION BALANCE',
        secretText: 'SECRET NOTE: The certification drill energizes all primary thrusters simultaneously, pulling massive electrical current.',
        uvTradeoffPapers: 'PAPERS: +20% OXYGEN, +20% FOOD, -20% POWER',
        uvTradeoff: 'PAPERS: +20% OXYGEN, +20% FOOD, -20% POWER | CRATE: [ ? SCAN CRATE ]'
      },
      crate: {
        label: 'CERTIFICATE CORE',
        hazard: 'HIGH POWER',
        radReading: '2.0 mSv (OPTIMAL)',
        secretTitle: 'X-RAY: ENVIRONMENTAL CONTROL MODULE',
        secretSub: 'Gold and titanium sealed avionics! Connecting it optimizes sensors and reinforces shield defenses.',
        secretImpactText: 'CRATE EFFECT: +15% SHIELD (NASA OPTIMIZATION)',
        crateDiscoveredText: '+15% SHIELD (OPTIMIZATION)'
      },
      feedbackAuth: (sol) => `FINAL PURGE ACTIVATED: Oxygen and Food maximized for Sol ${sol} certification.`,
      feedbackDeny: (sol) => `POWER RESERVED: Power secured (+20% Power, +10% Shield) for Sol ${sol} certification.`
    }
  };

  function applyEnglishCaseTranslation(caseObj, key, sol, caseDocNum) {
    let tKey = key;
    if (key === 'reyes_ventilation') {
      tKey = state.flags.lunar_dust_contamination ? 'reyes_dust' : 'reyes_clean';
    } else if (key === 'sato_reactor_or_shield') {
      tKey = state.flags.kilopower_unstable ? 'sato_chain' : 'sato_normal';
    }
    const t = CASE_I18N_EN[tKey] || CASE_I18N_EN[key];
    if (!t) return;

    if (t.shortLabel) caseObj.shortLabel = t.shortLabel;
    if (t.name) caseObj.name = t.name;
    if (t.origin) caseObj.origin = t.origin;
    if (t.mass) caseObj.mass = t.mass;
    if (t.dialogue) caseObj.dialogue = t.dialogue;
    if (t.solarFluxBadge) {
      caseObj.solarFluxBadge = typeof t.solarFluxBadge === 'function' ? t.solarFluxBadge(sol, state.maxSols) : t.solarFluxBadge;
    }
    if (t.solarSubtitle) {
      caseObj.solarSubtitle = typeof t.solarSubtitle === 'function' ? t.solarSubtitle(sol) : t.solarSubtitle;
    }

    if (t.dossier && caseObj.dossier) {
      if (t.dossier.applicant) caseObj.dossier.applicant = t.dossier.applicant;
      if (t.dossier.sector) caseObj.dossier.sector = t.dossier.sector;
      if (t.dossier.weight) {
        caseObj.dossier.weight = typeof t.dossier.weight === 'function' ? t.dossier.weight(sol) : t.dossier.weight;
      }
      if (t.dossier.declaredImpact) caseObj.dossier.declaredImpact = t.dossier.declaredImpact;
      if (t.dossier.cargoDesc) caseObj.dossier.cargoDesc = t.dossier.cargoDesc;
      if (t.dossier.uvStamp) caseObj.dossier.uvStamp = t.dossier.uvStamp;
      if (t.dossier.secretText) caseObj.dossier.secretText = t.dossier.secretText;
      if (t.dossier.uvTradeoffPapers) caseObj.dossier.uvTradeoffPapers = t.dossier.uvTradeoffPapers;
      if (t.dossier.uvTradeoff) caseObj.dossier.uvTradeoff = t.dossier.uvTradeoff;
    }

    if (t.crate && caseObj.crate) {
      if (t.crate.label) caseObj.crate.label = t.crate.label;
      if (t.crate.hazard) caseObj.crate.hazard = t.crate.hazard;
      if (t.crate.radReading) caseObj.crate.radReading = t.crate.radReading;
      if (t.crate.secretTitle) caseObj.crate.secretTitle = t.crate.secretTitle;
      if (t.crate.secretSub) caseObj.crate.secretSub = t.crate.secretSub;
      if (t.crate.secretImpactText) caseObj.crate.secretImpactText = t.crate.secretImpactText;
      if (t.crate.crateDiscoveredText) caseObj.crate.crateDiscoveredText = t.crate.crateDiscoveredText;
    }

    if (t.feedbackAuth && caseObj.effects?.AUTHORIZE) {
      caseObj.effects.AUTHORIZE.feedback = typeof t.feedbackAuth === 'function' ? t.feedbackAuth(sol) : t.feedbackAuth;
    }
    if (t.feedbackDeny && caseObj.effects?.DENY) {
      caseObj.effects.DENY.feedback = typeof t.feedbackDeny === 'function' ? t.feedbackDeny(sol) : t.feedbackDeny;
    }
  }

  function buildRawCaseByKey(key, sol, caseInSol) {
    const caseDocNum = (sol - 1) * 2 + caseInSol + 1;
    switch (key) {
      case 'botanist_uv':
        return {
          id: 'SOL1-C1',
          shortLabel: 'Lámparas UV Invernadero',
          visitorType: 'botanist',
          isChainedEvent: false,
          outerAirlock: false,
          highPower: true,
          msv: 2.4,
          weatherLevel: 'CALM',
          name: 'DRA. LINH TRAN (BIODOMO HIDROPÓNICO)',
          origin: 'SECTOR: INVERNADERO INTERNO B',
          mass: 'EQUIPO: 95 KG',
          dialogue: '"¡Las plántulas de trigo lunar están muriendo por falta de luz! Necesito autorización para encender el banco de lámparas UV de emergencia ahora mismo."',
          solarFluxBadge: 'FLUJO: NOMINAL',
          solarSubtitle: 'MAGNETÓSFERA ESTABLE',
          dossier: {
            id: `DOC #M-${caseDocNum}`,
            applicant: 'DRA. L. TRAN',
            sector: 'INVERNADERO HIDROPÓNICO',
            weight: '95 KG // INTERNO',
            declaredImpact: '+25% COMIDA',
            cargoDesc: 'Las pequeñas plantitas de trigo lunar se están congelando por falta de luz y necesitan encender las lámparas de calor para salvar la cosecha.',
            authCode: 'AUT-ARTEMIS-BIO-104',
            uvStamp: 'AUDITORÍA ENERGÉTICA UV',
            secretText: 'NOTA SECRETA: Estas lámparas viejas consumen muchísima energía de los generadores principales al encenderse y pueden dejar a oscuras otros sectores.',
            uvTradeoffPapers: 'PAPELES: +25% COMIDA, -20% ENERGÍA',
            uvTradeoff: 'PAPELES: +25% COMIDA, -20% ENERGÍA | CAJA: [ ? ESCANEAR CAJA ]'
          },
          crate: {
            code: 'UV-MATRIZ-01',
            label: 'BALASTO LÁMPARAS UV',
            hazard: 'ALTO VOLTAJE',
            radReading: '2.4 mSv (BAJA)',
            radSafe: true,
            xraySvgKey: 'uv_coil_short',
            secretTitle: 'RADIOGRAFÍA: BOBINA ELÉCTRICA SECUNDARIA',
            secretSub: '¡Cuidado! Los cables internos están pelados y soltarán chispas si se conectan a máxima potencia.',
            secretImpactText: 'EFECTO DE LA CAJA: -5% ENERGÍA EXTRA (CHISPAS)',
            crateDiscoveredText: '-5% ENERGÍA (CHISPAS)'
          },
          effects: {
            AUTHORIZE: {
              o2: 0, rad: 0, pwr: -25, food: +25,
              setFlags: { uv_lamps_overclocked: true },
              feedback: 'LÁMPARAS UV ACTIVADAS: Cosecha salvada (+25% Comida), alto consumo eléctrico (-25% Energía).'
            },
            DENY: {
              o2: 0, rad: 0, pwr: 0, food: -15,
              feedback: 'LÁMPARAS DENEGADAS: Energía intacta, pero se perdió parte del cultivo (-15% Comida).'
            }
          }
        };

      case 'lox_tank':
        return {
          id: 'SOL1-C2',
          shortLabel: 'Tanque de Oxígeno',
          visitorType: 'astronaut',
          isChainedEvent: false,
          outerAirlock: true,
          highPower: false,
          msv: 4.1,
          weatherLevel: 'IONIZED',
          name: 'ESP. MARCUS VANCE (OXÍGENO)',
          origin: 'ORIGEN: DEPÓSITO CRIOGÉNICO EXT.',
          mass: 'MASA TOTAL: 130 KG',
          dialogue: '"Traigo un tanque de oxígeno líquido del depósito exterior, pero para presurizarlo rápido debo tomar energía del escudo."',
          solarFluxBadge: 'FLUJO: MODERADO',
          solarSubtitle: 'MANCHA SOLAR EN ASCENSO',
          dossier: {
            id: `DOC #M-${caseDocNum}`,
            applicant: 'ESP. M. VANCE',
            sector: 'PLANTA DE OXÍGENO',
            weight: '130 KG // EXTERIOR',
            declaredImpact: '+20% OXÍGENO',
            cargoDesc: 'Trae un tanque de oxígeno puro desde el almacén exterior para que la tripulación respire aire fresco en la base.',
            authCode: 'AUT-NASA-LOX-992',
            uvStamp: 'OMISIÓN EN MANIFIESTO',
            secretText: 'NOTA SECRETA: Para calentar el oxígeno líquido tan rápido, los papeles autorizan desviar energía directamente de las reservas de la base.',
            uvTradeoffPapers: 'PAPELES: +20% OXÍGENO, -10% ENERGÍA',
            uvTradeoff: 'PAPELES: +20% OXÍGENO, -10% ENERGÍA | CAJA: [ ? ESCANEAR CAJA ]'
          },
          crate: {
            code: 'LOX-TANQUE-04',
            label: 'TANQUE DE OXÍGENO',
            hazard: 'PRESIÓN CRIO',
            radReading: '4.1 mSv (SEGURO)',
            radSafe: true,
            xraySvgKey: 'cryo_tank_bypass',
            secretTitle: 'RADIOGRAFÍA: VÁLVULA ACOPLADA AL ESCUDO',
            secretSub: '¡Alerta! La válvula del tanque está doblada y roza con el generador magnético que nos protege de la radiación.',
            secretImpactText: 'EFECTO DE LA CAJA: -10% ESCUDO (VÁLVULA DOBLADA)',
            crateDiscoveredText: '-10% ESCUDO (VÁLVULA)'
          },
          effects: {
            AUTHORIZE: {
              o2: +20, rad: -10, pwr: -10, food: 0,
              feedback: 'TANQUE CONECTADO: Reservas vitales al alza (+20% Oxígeno), caída en escudo (-10% Escudo, -10% Energía).'
            },
            DENY: {
              o2: -15, rad: 0, pwr: +10, food: 0,
              feedback: 'RECARGA CANCELADA: Ahorraste energía (+10% Energía), pero caen las reservas (-15% Oxígeno).'
            }
          }
        };

      case 'ice_rover':
        return {
          id: 'SOL2-C1',
          shortLabel: 'Rover Hielo Shackleton',
          visitorType: 'rover',
          isChainedEvent: false,
          outerAirlock: true,
          highPower: false,
          msv: 34.0,
          weatherLevel: 'IONIZED',
          name: 'ROVER DE HIELO "SHACKLETON-IV"',
          origin: 'ORIGEN: CRÁTER SHACKLETON SUR',
          mass: 'MASA TOTAL: 380 KG',
          dialogue: '"[TX-ROVER] Retorno de misión polar con bloques de agua glaciar para hidrólisis de Oxígeno y riego de cultivos. Solicito apertura de esclusa."',
          solarFluxBadge: 'FLUJO: ELEVADO',
          solarSubtitle: 'REGOLITO POLAR IONIZADO',
          dossier: {
            id: `DOC #M-${caseDocNum}`,
            applicant: 'ROVER SHACKLETON-IV',
            sector: 'PROCESADOR DE AGUA / OXÍGENO',
            weight: '380 KG // EXTERIOR',
            declaredImpact: '+25% OXÍGENO / +15% COMIDA',
            cargoDesc: 'El carrito explorador trae bloques de hielo del cráter lunar para derretirlos en agua potable y aire para el invernadero.',
            authCode: 'AUT-HIELO-POLAR-02',
            uvStamp: 'RIESGO DE CONTAMINACIÓN ENCADENADA',
            secretText: 'NOTA SECRETA: Los sellos del documento ocultan que los tanques de descongelación le quitan energía al escudo protector de la base.',
            uvTradeoffPapers: 'PAPELES: +25% OXÍGENO, +15% COMIDA, -10% ESCUDO',
            uvTradeoff: 'PAPELES: +25% OXÍGENO, +15% COMIDA, -10% ESCUDO | CAJA: [ ? ESCANEAR CAJA ]'
          },
          crate: {
            code: 'HIELO-NÚCLEO-09',
            label: 'CONTENEDOR GLACIAR',
            hazard: 'POLVO LUNAR',
            radReading: '34.0 mSv (ALERTA)',
            radSafe: false,
            xraySvgKey: 'cracked_ice_dust',
            secretTitle: 'MICRO-FRACTURA CON POLVO LUNAR RADIOACTIVO',
            secretSub: '¡El contenedor tiene una rotura y viene lleno de polvo lunar filoso y sucio que atascará los conductos del escudo!',
            secretImpactText: 'EFECTO DE LA CAJA: -10% ESCUDO EXTRA (POLVO ABRASIVO)',
            crateDiscoveredText: '-10% ESCUDO (POLVO FILOSO)'
          },
          effects: {
            AUTHORIZE: {
              o2: +25, rad: -20, pwr: 0, food: +15,
              setFlags: { lunar_dust_contamination: true },
              feedback: 'HIELO ADMITIDO: +25% Oxígeno y +15% Comida, pero entró Polvo Lunar Radioactivo (-20% Escudo y riesgo en próximos Soles).'
            },
            DENY: {
              o2: -15, rad: +5, pwr: 0, food: -10,
              setFlags: { lunar_dust_contamination: false },
              feedback: 'ROVER RECHAZADO: Base libre de polvo lunar (+5% Escudo), pero escasea el agua (-15% Oxígeno, -10% Comida).'
            }
          }
        };

      case 'isotope_batteries':
        return {
          id: 'SOL2-C2',
          shortLabel: 'Dron Baterías 64.5 mSv',
          visitorType: 'module',
          isChainedEvent: false,
          outerAirlock: true,
          highPower: false,
          msv: 64.5,
          weatherLevel: 'IONIZED',
          name: 'DRON LOGÍSTICO "VOLTIO-7"',
          origin: 'ORIGEN: PLATAFORMA SOLAR ANTIGUA',
          mass: 'MASA TOTAL: 260 KG',
          dialogue: '"Entrega urgente de acumuladores de alta densidad para reforzar la estación contra la radiación exterior."',
          solarFluxBadge: 'FLUJO: ELEVADO',
          solarSubtitle: 'LLAMARADA SOLAR DETECTADA',
          dossier: {
            id: `DOC #M-${caseDocNum}`,
            applicant: 'DRON VOLTIO-7',
            sector: 'SUBESTACIÓN DE POTENCIA',
            weight: '260 KG // EXTERIOR',
            declaredImpact: '+30% ENERGÍA',
            cargoDesc: 'Un simpático robot transporta baterías gigantes recargadas para que la base tenga luces y computadoras encendidas durante la noche.',
            authCode: 'AUT-CARGO-V7-902',
            uvStamp: '¡CERTIFICADO FALSIFICADO!',
            secretText: 'NOTA SECRETA: Los técnicos borraron la firma de seguridad. Si se autorizan estas baterías tan pesadas, desgastarán los cables del escudo.',
            uvTradeoffPapers: 'PAPELES: +30% ENERGÍA, -5% ESCUDO',
            uvTradeoff: 'PAPELES: +30% ENERGÍA, -5% ESCUDO | CAJA: [ ? ESCANEAR CAJA ]'
          },
          crate: {
            code: 'CELDA-RED-64',
            label: 'ACUMULADOR ISOTÓPICO',
            hazard: 'RAD > 50 mSv',
            radReading: '64.5 mSv (¡PELIGRO!)',
            radSafe: false,
            xraySvgKey: 'isotope_cells_leak',
            secretTitle: 'RADIOGRAFÍA: BARRAS DE COBALTO SIN PLOMO',
            secretSub: '¡Peligro crítico! Las baterías están goteando radiación invisible muy fuerte que supera el límite seguro de la NASA.',
            secretImpactText: 'EFECTO DE LA CAJA: -25% OXÍGENO (FUGA RADIACTIVA)',
            crateDiscoveredText: '-25% OXÍGENO (FUGA RADIACTIVA)'
          },
          effects: {
            AUTHORIZE: {
              o2: -25, rad: -5, pwr: +30, food: 0,
              feedback: 'CELDAS CONECTADAS: +30% Energía, pero la fuga radiactiva dañó soporte vital (-25% Oxígeno, -5% Escudo).'
            },
            DENY: {
              o2: 0, rad: +10, pwr: -15, food: 0,
              feedback: 'CARGA RECHAZADA: Protegiste el Oxígeno y reforzaste el escudo (+10% Escudo), pero perdiste energía (-15% Energía).'
            }
          }
        };

      case 'rossi_rescue':
        return {
          id: 'SOL3-C1',
          shortLabel: 'Rescate Ing. Rossi (Tormenta)',
          visitorType: 'astronaut',
          isChainedEvent: false,
          outerAirlock: true,
          highPower: false,
          msv: 42.0,
          weatherLevel: 'STORM',
          name: 'ING. MATEO ROSSI (ANTENA EXTERIOR)',
          origin: 'ORIGEN: TORRE DE COMUNICACIONES SUR',
          mass: 'MASA TOTAL: 118 KG',
          dialogue: '"¡Aquí Rossi! ¡La tormenta solar me alcanzó reparando los cables exteriores! ¡Abran la esclusa de urgencia o mi traje colapsará!"',
          solarFluxBadge: 'TORMENTA CLASE X',
          solarSubtitle: 'PROTONES DE ALTA ENERGÍA',
          dossier: {
            id: `DOC #M-${caseDocNum}`,
            applicant: 'ING. M. ROSSI',
            sector: 'ANTENA / ENERGÍA',
            weight: '118 KG // EVA URGENTE',
            declaredImpact: 'RESCATE DE TRIPULANTE / REPARAR ENERGÍA',
            cargoDesc: 'La ingeniera quedó atrapada afuera reparando antenas y pide abrir la puerta rápido porque el viento solar la persigue.',
            authCode: 'AUT-EVA-AUXILIO-03',
            uvStamp: 'IMPACTO DIRECTO EN ENERGÍA Y ESCUDO',
            secretText: 'NOTA SECRETA: Al abrir la compuerta exterior durante la tormenta entra viento solar que debilita el campo de fuerza de la base.',
            uvTradeoffPapers: 'PAPELES: +15% ENERGÍA, -15% ESCUDO',
            uvTradeoff: 'PAPELES: +15% ENERGÍA, -15% ESCUDO | CAJA: [ ? ESCANEAR CAJA ]'
          },
          crate: {
            code: 'EVA-HERR-03',
            label: 'KIT CALIBRADOR SOLAR',
            hazard: 'PROTONES SOLARES',
            radReading: '42.0 mSv (ALTA)',
            radSafe: false,
            xraySvgKey: 'proton_suit_kit',
            secretTitle: 'RADIOGRAFÍA: IONIZACIÓN DE PROTONES EN TRAJE',
            secretSub: '¡Su mochila metálica viene cargada de estática y chispas espaciales que golpearán el escudo al entrar!',
            secretImpactText: 'EFECTO DE LA CAJA: -15% ESCUDO EXTRA (ESTÁTICA)',
            crateDiscoveredText: '-15% ESCUDO (ESTÁTICA)'
          },
          effects: {
            AUTHORIZE: {
              o2: 0, rad: -30, pwr: +15, food: 0,
              setFlags: { engineer_saved: true },
              feedback: 'INGENIERO RESCATADO: Rossi calibró la antena solar (+15% Energía), pero entró radiación (-30% Escudo).'
            },
            DENY: {
              o2: -10, rad: +10, pwr: -15, food: 0,
              setFlags: { engineer_saved: false },
              feedback: 'ESCLUSA CERRADA: Rossi evacuó al búnker auxiliar (-10% Oxígeno, +10% Escudo, -15% Energía por antena sin calibrar).'
            }
          }
        };

      case 'biodome_heaters':
        return {
          id: 'SOL3-C2',
          shortLabel: 'Calefactores Biodomo',
          visitorType: 'botanist',
          isChainedEvent: false,
          outerAirlock: false,
          highPower: true,
          msv: 5.0,
          weatherLevel: 'STORM',
          name: 'SISTEMA TÉRMICO DEL BIODOMO',
          origin: 'SECTOR: GRANJA HIDROPÓNICA CENTRAL',
          mass: 'SISTEMA INTERNO',
          dialogue: '"La tormenta solar está provocando fluctuaciones térmicas. Solicito activar los calefactores de alta potencia para proteger los cultivos y recargar el escudo."',
          solarFluxBadge: 'PICO GEOMAGNÉTICO',
          solarSubtitle: 'TORMENTA SOLAR EN CURSO',
          dossier: {
            id: `DOC #M-${caseDocNum}`,
            applicant: 'CONTROL BIODOMO',
            sector: 'GRANJA Y ESCUDO INTERNO',
            weight: 'INTERNO // 0 KG',
            declaredImpact: '+15% COMIDA',
            cargoDesc: 'Pide encender los calefactores del invernadero para proteger las verduras y plantas del frío polar de la noche lunar.',
            authCode: 'AUT-TERM-DOMO-03',
            uvStamp: 'CONSUMO DE ALTA POTENCIA',
            secretText: 'NOTA SECRETA: Los calefactores gastan tanta electricidad que pueden dejar sin suficiente energía a las defensas de la base.',
            uvTradeoffPapers: 'PAPELES: +15% COMIDA, -15% ENERGÍA',
            uvTradeoff: 'PAPELES: +15% COMIDA, -15% ENERGÍA | CAJA: [ ? ESCANEAR CAJA ]'
          },
          crate: {
            code: 'TERM-NÚCLEO-2',
            label: 'BOBINA CALEFACTORA',
            hazard: 'ALTA POTENCIA',
            radReading: '5.0 mSv (SEGURO)',
            radSafe: true,
            xraySvgKey: 'uv_coil_short',
            secretTitle: 'RADIOGRAFÍA: RESISTENCIAS TÉRMICAS DE ALTA CARGA',
            secretSub: '¡La resistencia térmica está recalentada y absorberá energía extra, aunque refuerza el calor del escudo interior!',
            secretImpactText: 'EFECTO DE LA CAJA: +15% ESCUDO, -5% ENERGÍA EXTRA',
            crateDiscoveredText: '+15% ESCUDO, -5% ENERGÍA'
          },
          effects: {
            AUTHORIZE: {
              o2: 0, rad: +15, pwr: -20, food: +15,
              feedback: 'CALEFACTORES ACTIVOS: Cultivos y domo protegidos (+15% Comida, +15% Escudo) con gasto de -20% Energía.'
            },
            DENY: {
              o2: 0, rad: -5, pwr: +10, food: -20,
              feedback: 'MODO AHORRO: Ahorraste +10% Energía, pero la helada dañó las cosechas (-20% Comida, -5% Escudo).'
            }
          }
        };

      case 'reyes_ventilation': {
        const dustActive = state.flags.lunar_dust_contamination;
        if (dustActive) {
          return {
            id: 'SOL4-C1-CHAIN',
            shortLabel: 'Atasco Polvo Lunar',
            visitorType: 'astronaut',
            isChainedEvent: true,
            outerAirlock: false,
            highPower: true,
            msv: 18.5,
            weatherLevel: 'IONIZED',
            name: 'JEFE DE MANTENIMIENTO K. REYES',
            origin: 'ORIGEN: DUCTOS DE VENTILACIÓN DE OXÍGENO',
            mass: 'EMERGENCIA INTERNA',
            dialogue: '"¡Alerta roja! ¡El polvo lunar radioactivo que entró con el Rover ha atascado los ductos de oxígeno! ¡Hay que activar la purga electromagnética ya!"',
            solarFluxBadge: 'FALLA ENCADENADA',
            solarSubtitle: 'CORROSIÓN DE FILTROS POR POLVO',
            dossier: {
              id: `DOC #M-${caseDocNum}-CADENA`,
              applicant: 'ING. K. REYES',
              sector: 'VENTILACIÓN CENTRAL',
              weight: 'FILTROS CORROÍDOS',
              declaredImpact: '+15% OXÍGENO LIMPIO',
              cargoDesc: 'El polvo lunar que entró tapó las tuberías de aire y se necesita un pulso electromagnético para limpiarlas.',
              authCode: 'AUT-EMERG-POLVO-04',
              uvStamp: 'CONSECUENCIA ENCADENADA (POLVO LUNAR)',
              secretText: 'NOTA SECRETA: La máquina de limpieza consume muchísima energía de las baterías de reserva para poder soplar el polvo hacia afuera.',
              uvTradeoffPapers: 'PAPELES: +15% OXÍGENO, -15% ENERGÍA',
              uvTradeoff: 'PAPELES: +15% OXÍGENO, -15% ENERGÍA | CAJA: [ ? ESCANEAR CAJA ]'
            },
            crate: {
              code: 'HEPA-ATASCO-04',
              label: 'FILTRO CORROÍDO POR POLVO',
              hazard: 'SÍLICE LUNAR',
              radReading: '18.5 mSv (INTERNO)',
              radSafe: false,
              xraySvgKey: 'clogged_hepa_turbine',
              secretTitle: 'RADIOGRAFÍA: ASPAS DE TURBINA BLOQUEADAS',
              secretSub: '¡Las aspas del ventilador están frenadas por cristales de arena lunar afilada que sobrecargan el motor!',
              secretImpactText: 'EFECTO DE LA CAJA: -5% ENERGÍA EXTRA (MOTOR FRENADO)',
              crateDiscoveredText: '-5% ENERGÍA (MOTOR FRENADO)'
            },
            effects: {
              AUTHORIZE: {
                o2: +15, rad: 0, pwr: -20, food: 0,
                setFlags: { lunar_dust_contamination: false },
                feedback: 'PURGA COMPLETADA: Filtros limpios (+15% Oxígeno) a costa de una descarga de emergencia (-20% Energía).'
              },
              DENY: {
                o2: -30, rad: -5, pwr: +5, food: 0,
                feedback: 'VENTILACIÓN ATASCADA: El polvo lunar redujo drásticamente el oxígeno (-30% Oxígeno).'
              }
            }
          };
        }
        return {
          id: 'SOL4-C1-CLEAN',
          shortLabel: 'Electrólisis de Oxígeno',
          visitorType: 'astronaut',
          isChainedEvent: false,
          outerAirlock: false,
          highPower: true,
          msv: 1.2,
          weatherLevel: 'CALM',
          name: 'JEFE DE MANTENIMIENTO K. REYES',
          origin: 'ORIGEN: DUCTOS DE VENTILACIÓN DE OXÍGENO',
          mass: 'MANTENIMIENTO RUTINARIO',
          dialogue: '"Como mantuviste los ductos libres de contaminación abrasiva, la ventilación está impecable. ¿Autorizas un ciclo de electrólisis intensiva para aumentar el Oxígeno?"',
          solarFluxBadge: 'FILTROS LIMPIOS',
          solarSubtitle: 'FLUJO LAMINAR AL 100%',
          dossier: {
            id: `DOC #M-${caseDocNum}`,
            applicant: 'ING. K. REYES',
            sector: 'VENTILACIÓN CENTRAL',
            weight: 'SISTEMA LIMPIO',
            declaredImpact: '+25% OXÍGENO',
            cargoDesc: 'Pide permiso para descomponer agua limpia en burbujas de oxígeno fresco para llenar los tanques de la tripulación.',
            authCode: 'AUT-HEPA-OK-401',
            uvStamp: 'BONIFICACIÓN DE MANTENIMIENTO',
            secretText: 'NOTA SECRETA: La electrólisis necesita bastante electricidad constante de los paneles solares para separar las moléculas de agua.',
            uvTradeoffPapers: 'PAPELES: +25% OXÍGENO, -10% ENERGÍA',
            uvTradeoff: 'PAPELES: +25% OXÍGENO, -10% ENERGÍA | CAJA: [ ? ESCANEAR CAJA ]'
          },
          crate: {
            code: 'HEPA-LIMPIO-4',
            label: 'ELECTROLIZADOR DE OXÍGENO',
            hazard: 'ALTA POTENCIA',
            radReading: '1.2 mSv (SEGURO)',
            radSafe: true,
            xraySvgKey: 'cryo_tank_bypass',
            secretTitle: 'RADIOGRAFÍA: MEMBRANAS HEPA SIN RESIDUOS',
            secretSub: '¡El circuito de agua está limpiecito y sin sarro, pero la bomba de presión gasta un poquito más de luz!',
            secretImpactText: 'EFECTO DE LA CAJA: -5% ENERGÍA EXTRA (BOMBA PRESIÓN)',
            crateDiscoveredText: '-5% ENERGÍA (BOMBA)'
          },
          effects: {
            AUTHORIZE: {
              o2: +25, rad: 0, pwr: -15, food: 0,
              feedback: 'ELECTRÓLISIS EXITOSA: +25% Oxígeno consumiendo -15% Energía.'
            },
            DENY: {
              o2: -10, rad: 0, pwr: +10, food: 0,
              feedback: 'CICLO OMITIDO: +10% Energía ahorrada, pero baja la presión de Oxígeno (-10%).'
            }
          }
        };
      }

      case 'algae_spores':
        return {
          id: 'SOL4-C2',
          shortLabel: 'Algas Espirulina 58 mSv',
          visitorType: 'module',
          isChainedEvent: false,
          outerAirlock: true,
          highPower: false,
          msv: 58.0,
          weatherLevel: 'IONIZED',
          name: 'CÁPSULA ORBITAL "AGRO-X"',
          origin: 'ORIGEN: LABORATORIO ORBITAL GATEWAY',
          mass: 'MASA TOTAL: 190 KG',
          dialogue: '"Enviamos cepas de algas hiper-nutritivas cultivadas en espacio profundo. ¡Pueden duplicar las raciones de comida de inmediato!"',
          solarFluxBadge: 'RADIACIÓN > 50 mSv',
          solarSubtitle: 'CARGA DE ESPACIO PROFUNDO',
          dossier: {
            id: `DOC #M-${caseDocNum}`,
            applicant: 'CÁPSULA AGRO-X',
            sector: 'BIODOMO DE ALGAS',
            weight: '190 KG // EXTERIOR',
            declaredImpact: '+30% COMIDA',
            cargoDesc: 'Trae un cultivo de microalgas verdes mágicas que crecen súper rápido para alimentar a todos los astronautas de la base.',
            authCode: 'AUT-AGRO-ÓRBITA-58',
            uvStamp: 'ALERTA BIO-RADIACTIVA',
            secretText: 'NOTA SECRETA: Para que las algas crezcan tan rápido en la Luna, usaron nutrientes extraños que aumentan el calor y desgastan el escudo.',
            uvTradeoffPapers: 'PAPELES: +30% COMIDA, -5% ESCUDO',
            uvTradeoff: 'PAPELES: +30% COMIDA, -5% ESCUDO | CAJA: [ ? ESCANEAR CAJA ]'
          },
          crate: {
            code: 'ALGAS-58R',
            label: 'BIORREACTOR ORBITAL',
            hazard: 'RAD > 50 mSv',
            radReading: '58.0 mSv (¡PELIGRO!)',
            radSafe: false,
            xraySvgKey: 'mutant_algae_spores',
            secretTitle: 'RADIOGRAFÍA: BIOMASA IRRADIADA A 58.0 mSv',
            secretSub: '¡Peligro! Las algas mutaron bajo rayos cósmicos y despiden radiación invisible que sobrepasa el límite seguro.',
            secretImpactText: 'EFECTO DE LA CAJA: -25% OXÍGENO (FUGA RADIACTIVA)',
            crateDiscoveredText: '-25% OXÍGENO (FUGA RADIACTIVA)'
          },
          effects: {
            AUTHORIZE: {
              o2: -25, rad: -5, pwr: 0, food: +30,
              feedback: 'ALGAS INTEGRADAS: +30% Comida, pero la fuga radiactiva dañó soporte vital (-25% Oxígeno, -5% Escudo).'
            },
            DENY: {
              o2: 0, rad: +10, pwr: 0, food: -15,
              feedback: 'CÁPSULA RECHAZADA: Evitaste la contaminación radiactiva (+10% Escudo), pero caen las raciones (-15% Comida).'
            }
          }
        };

      case 'kilopower':
        return {
          id: 'SOL5-C1',
          shortLabel: 'Reactor Kilopower',
          visitorType: 'rover',
          isChainedEvent: false,
          outerAirlock: true,
          highPower: false,
          msv: 44.0,
          weatherLevel: 'IONIZED',
          name: 'TRANSPORTE PESADO "KILOPOWER-1"',
          origin: 'ORIGEN: SECTOR CRÁTER NORTE',
          mass: 'MASA TOTAL: 520 KG',
          dialogue: '"Traemos el micro-reactor nuclear portátil para recargar toda la estación y multiplicar nuestras reservas de energía."',
          solarFluxBadge: 'FLUJO: ENERGIZADO',
          solarSubtitle: 'PREPARACIÓN DE BLINDAJE',
          dossier: {
            id: `DOC #M-${caseDocNum}`,
            applicant: 'CONVOY KILOPOWER-1',
            sector: 'NÚCLEO DE POTENCIA',
            weight: '520 KG // EXTERIOR',
            declaredImpact: '+35% ENERGÍA',
            cargoDesc: 'Trae un motor nuclear compacto para conectar a la base y multiplicar la electricidad de todas las computadoras y luces.',
            authCode: 'AUT-FISIÓN-NUC-05',
            uvStamp: 'RIESGO DE SOBRECARGA ENCADENADA',
            secretText: 'NOTA SECRETA: Conectar este motor nuclear desvía energía del escudo magnético y creará una sobrecarga difícil de enfriar más adelante.',
            uvTradeoffPapers: 'PAPELES: +35% ENERGÍA, -10% ESCUDO',
            uvTradeoff: 'PAPELES: +35% ENERGÍA, -10% ESCUDO | CAJA: [ ? ESCANEAR CAJA ]'
          },
          crate: {
            code: 'REACTOR-RX5',
            label: 'NÚCLEO KILOPOWER',
            hazard: 'NÚCLEO FISIÓN',
            radReading: '44.0 mSv (ELEVADO)',
            radSafe: false,
            xraySvgKey: 'fission_core_crack',
            secretTitle: 'RADIOGRAFÍA: FISURA EN TUBO DE SODIO LÍQUIDO',
            secretSub: '¡Atención! Hay una fisura pequeña en el tubo de enfriamiento que debilita el aislamiento magnético exterior.',
            secretImpactText: 'EFECTO DE LA CAJA: -5% ESCUDO EXTRA (FISURA EN TUBO)',
            crateDiscoveredText: '-5% ESCUDO (FISURA TUBO)'
          },
          effects: {
            AUTHORIZE: {
              o2: 0, rad: -15, pwr: +35, food: 0,
              setFlags: { kilopower_unstable: true },
              feedback: 'REACTOR CONECTADO: +35% Energía (-15% Escudo). ¡Advertencia: Riesgo de sobrecalentamiento térmico!'
            },
            DENY: {
              o2: 0, rad: +15, pwr: -20, food: 0,
              setFlags: { kilopower_unstable: false },
              feedback: 'REACTOR DENEGADO: Escudo reforzado (+15% Escudo), pero las reservas de energía caen (-20% Energía).'
            }
          }
        };

      case 'water_uv':
        return {
          id: 'SOL5-C2',
          shortLabel: 'Purificación Agua UV',
          visitorType: 'botanist',
          isChainedEvent: false,
          outerAirlock: false,
          highPower: true,
          msv: 1.8,
          weatherLevel: 'CALM',
          name: 'DRA. LINH TRAN (DESCONTAMINACIÓN)',
          origin: 'SECTOR: RECICLADOR BIO-HIDRÁULICO',
          mass: 'SISTEMA INTERNO',
          dialogue: '"Necesitamos ejecutar una descontaminación UV de alta potencia en el agua reciclada para asegurar oxígeno y comida para la base."',
          solarFluxBadge: 'FLUJO: ESTABLE',
          solarSubtitle: 'FILTRADO BIO-HIDRÁULICO',
          dossier: {
            id: `DOC #M-${caseDocNum}`,
            applicant: 'DRA. L. TRAN',
            sector: 'PLANTA HIDRO-VITAL',
            weight: 'INTERNO // UV',
            declaredImpact: '+20% OXÍGENO / +20% COMIDA',
            cargoDesc: 'Un robot inteligente pide encender el sistema de limpieza con luz para desinfectar toda el agua y rellenar los bebederos.',
            authCode: 'AUT-HIDRO-LIMPIO-05',
            uvStamp: 'AUDITORÍA DE ALTA POTENCIA',
            secretText: 'NOTA SECRETA: Los filtros de agua necesitan mucha electricidad de los generadores para esterilizar cada gota sin descanso.',
            uvTradeoffPapers: 'PAPELES: +20% OXÍGENO, +20% COMIDA, -20% ENERGÍA',
            uvTradeoff: 'PAPELES: +20% OXÍGENO, +20% COMIDA, -20% ENERGÍA | CAJA: [ ? ESCANEAR CAJA ]'
          },
          crate: {
            code: 'BIO-UV-05',
            label: 'PURIFICADOR UV-C',
            hazard: 'ALTA POTENCIA',
            radReading: '1.8 mSv (SEGURO)',
            radSafe: true,
            xraySvgKey: 'cryo_tank_bypass',
            secretTitle: 'RADIOGRAFÍA: CÁMARA DE CUARZO INTACTA',
            secretSub: '¡Los tubos están impecables y sin bacterias! El agua limpia además refresca las bobinas magnéticas del escudo.',
            secretImpactText: 'EFECTO DE LA CAJA: +5% ESCUDO (BOMBA REFRIGERADA)',
            crateDiscoveredText: '+5% ESCUDO (REFRIGERACIÓN)'
          },
          effects: {
            AUTHORIZE: {
              o2: +20, rad: +5, pwr: -20, food: +20,
              feedback: 'PURIFICACIÓN EXITOSA: +20% Oxígeno, +20% Comida y +5% Escudo consumiendo -20% Energía.'
            },
            DENY: {
              o2: -15, rad: 0, pwr: +10, food: -15,
              feedback: 'PURIFICACIÓN CANCELADA: +10% Energía ahorrada, pero caen Oxígeno (-15%) y Comida (-15%).'
            }
          }
        };

      case 'med_capsule':
        return {
          id: 'SOL6-C1',
          shortLabel: 'Cápsula Médica (Tormenta)',
          visitorType: 'module',
          isChainedEvent: false,
          outerAirlock: true,
          highPower: false,
          msv: 29.0,
          weatherLevel: 'STORM',
          name: 'CÁPSULA DE SUMINISTRO "ARTEMIS-MED"',
          origin: 'ORIGEN: ÓRBITA POLAR LUNAR',
          mass: 'MASA TOTAL: 240 KG',
          dialogue: '"¡Aterrizaje de emergencia en plena Tormenta Solar! Traemos tanques presurizados de Oxígeno y raciones liofilizadas. ¡Solicitamos abrir esclusa exterior!"',
          solarFluxBadge: 'TORMENTA CLASE X',
          solarSubtitle: 'BOMBARDEO CORONAL SEVERO',
          dossier: {
            id: `DOC #M-${caseDocNum}`,
            applicant: 'CÁPSULA ARTEMIS-MED',
            sector: 'ESCLUSA EXTERIOR A-04',
            weight: '240 KG // EXTERIOR',
            declaredImpact: '+25% OXÍGENO / +25% COMIDA',
            cargoDesc: 'La médica trae una cápsula con medicinas y alimentos especiales para la tripulación durante el peor momento de la tormenta.',
            authCode: 'AUT-MED-TORMENTA-06',
            uvStamp: 'ALERTA DE TORMENTA SOLAR',
            secretText: 'NOTA SECRETA: Abrir la compuerta exterior con tormenta deja escapar parte del escudo. Si el escudo está débil, la radiación dañará el aire.',
            uvTradeoffPapers: 'PAPELES: +25% OXÍGENO, +25% COMIDA, -10% ESCUDO',
            uvTradeoff: 'PAPELES: +25% OXÍGENO, +25% COMIDA, -10% ESCUDO | CAJA: [ ? ESCANEAR CAJA ]'
          },
          crate: {
            code: 'MED-ENVÍO-06',
            label: 'SUMINISTRO VITAL NASA',
            hazard: 'TORMENTA SOLAR',
            radReading: '29.0 mSv (EXTERIOR)',
            radSafe: true,
            xraySvgKey: 'cryo_tank_bypass',
            secretTitle: 'RADIOGRAFÍA: CILINDROS DE OXÍGENO Y RACIONES',
            secretSub: '¡El contenedor médico está en perfecto estado, pero su chasis exterior absorbió radiación que golpeará el escudo!',
            secretImpactText: 'EFECTO DE LA CAJA: -10% ESCUDO EXTRA (FRICCIÓN SOLAR)',
            crateDiscoveredText: '-10% ESCUDO (FRICCIÓN SOLAR)'
          },
          effects: {
            AUTHORIZE: {
              o2: +25, rad: -20, pwr: 0, food: +25,
              feedback: 'SUMINISTRO MÉDICO RECIBIDO: +25% Oxígeno y +25% Comida para resistir el pico de la tormenta (-20% Escudo).'
            },
            DENY: {
              o2: -15, rad: +15, pwr: 0, food: -15,
              feedback: 'CÁPSULA EN ESPERA EXTERNA: Escudo protegido (+15%), pero la tripulación raciona suministros (-15% Oxígeno, -15% Comida).'
            }
          }
        };

      case 'sato_reactor_or_shield': {
        const reactorUnstable = state.flags.kilopower_unstable;
        if (reactorUnstable) {
          return {
            id: 'SOL6-C2-CHAIN',
            shortLabel: 'Fuga Reactor',
            visitorType: 'astronaut',
            isChainedEvent: true,
            outerAirlock: false,
            highPower: false,
            msv: 46.0,
            weatherLevel: 'STORM',
            name: 'ING. NUCLEAR H. SATO (ALERTA KILOPOWER)',
            origin: 'ORIGEN: SALA DEL REACTOR',
            mass: 'CRISIS ENCADENADA',
            dialogue: '"¡El reactor de energía que conectamos entró en resonancia térmica! ¡Debemos inyectar oxígeno líquido para enfriarlo o reventará el escudo!"',
            solarFluxBadge: 'CRISIS NUCLEAR',
            solarSubtitle: 'RESONANCIA TÉRMICA EN NÚCLEO',
            dossier: {
              id: `DOC #M-${caseDocNum}-CADENA`,
              applicant: 'ING. H. SATO',
              sector: 'NÚCLEO DE ENERGÍA',
              weight: 'EMERGENCIA INTERNA',
              declaredImpact: '+20% ESCUDO / +15% ENERGÍA PROTEGIDA',
              cargoDesc: 'El reactor que conectamos se recalentó y necesita inyectar gas frío de emergencia para evitar que explote.',
              authCode: 'AUT-SCRAM-NÚCLEO-06',
              uvStamp: 'CONSECUENCIA ENCADENADA (REACTOR)',
              secretText: 'NOTA SECRETA: El gas de enfriamiento criogénico se saca de las reservas de respiración de los astronautas para salvar el reactor.',
              uvTradeoffPapers: 'PAPELES: +20% ESCUDO, +15% ENERGÍA',
              uvTradeoff: 'PAPELES: +20% ESCUDO, +15% ENERGÍA | CAJA: [ ? ESCANEAR CAJA ]'
            },
            crate: {
              code: 'FUSIÓN-NÚCLEO-6',
              label: 'VÁLVULA DE ENFRIAMIENTO',
              hazard: 'FUGA TÉRMICA',
              radReading: '46.0 mSv (CRÍTICO)',
              radSafe: false,
              xraySvgKey: 'fission_core_crack',
              secretTitle: 'RADIOGRAFÍA: EBULLICIÓN EN NÚCLEO DE FISIÓN',
              secretSub: '¡La manguera de alta presión absorberá muchísimo oxígeno de soporte vital de golpe si se activa!',
              secretImpactText: 'EFECTO DE LA CAJA: -20% OXÍGENO (CONSUMO CRIOGÉNICO)',
              crateDiscoveredText: '-20% OXÍGENO (GAS CRIOGÉNICO)'
            },
            effects: {
              AUTHORIZE: {
                o2: -20, rad: +20, pwr: +15, food: 0,
                setFlags: { kilopower_unstable: false },
                feedback: 'NÚCLEO ENFRIADO: Gastaste -20% Oxígeno, pero estabilizaste el escudo (+20% Escudo) y la energía (+15% Energía).'
              },
              DENY: {
                o2: 0, rad: -30, pwr: -15, food: 0,
                feedback: 'DESCARGA DEL REACTOR: Conservaste el Oxígeno, pero la fuga dañó el escudo (-30% Escudo, -15% Energía).'
              }
            }
          };
        }
        return {
          id: 'SOL6-C2-NORMAL',
          shortLabel: 'Refuerzo Bobinas Escudo',
          visitorType: 'astronaut',
          isChainedEvent: false,
          outerAirlock: false,
          highPower: true,
          msv: 3.5,
          weatherLevel: 'STORM',
          name: 'ING. NUCLEAR H. SATO (BOBINAS MAGNÉTICAS)',
          origin: 'ORIGEN: SALA DE ESCUDOS',
          mass: 'CONTROL INTERNO',
          dialogue: '"Sin reactores inestables, nuestras líneas están seguras. ¿Desviamos -20% de Energía para reforzar al máximo el escudo contra la radiación?"',
          solarFluxBadge: 'SISTEMA ESTABLE',
          solarSubtitle: 'DEFENSA MAGNÉTICA ACTIVA',
          dossier: {
            id: `DOC #M-${caseDocNum}`,
            applicant: 'ING. H. SATO',
            sector: 'BOBINAS DE ESCUDO',
            weight: 'INTERNO',
            declaredImpact: '+25% ESCUDO',
            cargoDesc: 'Pide conectar bobinas magnéticas de refuerzo para crear una cúpula de energía que desvíe la tormenta solar.',
            authCode: 'AUT-ESCUDO-MAG-06',
            uvStamp: 'SINCRONIZACIÓN DE ESCUDO',
            secretText: 'NOTA SECRETA: Levantar una cúpula magnética tan potente absorbe casi toda la electricidad disponible de la base.',
            uvTradeoffPapers: 'PAPELES: +25% ESCUDO, -15% ENERGÍA',
            uvTradeoff: 'PAPELES: +25% ESCUDO, -15% ENERGÍA | CAJA: [ ? ESCANEAR CAJA ]'
          },
          crate: {
            code: 'BOBINA-MAG-06',
            label: 'CONDENSADOR DE ESCUDO',
            hazard: 'ALTA POTENCIA',
            radReading: '3.5 mSv (SEGURO)',
            radSafe: true,
            xraySvgKey: 'uv_coil_short',
            secretTitle: 'RADIOGRAFÍA: SUPERCONDUCTOR MAGNÉTICO ESTABLE',
            secretSub: '¡Las bobinas doradas están impecables, pero necesitan un pico de corriente extra para calibrar los imanes!',
            secretImpactText: 'EFECTO DE LA CAJA: -5% ENERGÍA EXTRA (PICOS DE CORRIENTE)',
            crateDiscoveredText: '-5% ENERGÍA (PICO CORRIENTE)'
          },
          effects: {
            AUTHORIZE: {
              o2: 0, rad: +25, pwr: -20, food: 0,
              feedback: 'ESCUDO REFORZADO: +25% Escudo consumiendo -20% Energía.'
            },
            DENY: {
              o2: 0, rad: -15, pwr: +15, food: 0,
              feedback: 'DESVÍO DENEGADO: +15% Energía recuperada, pero la tormenta redujo -15% Escudo.'
            }
          }
        };
      }

      case 'orion_relay':
        return {
          id: 'SOL7-C1',
          shortLabel: 'Nave Relevo Orión-IX',
          visitorType: 'module',
          isChainedEvent: false,
          outerAirlock: true,
          highPower: false,
          msv: 54.0,
          weatherLevel: 'IONIZED',
          name: 'TRANSBORDADOR DE RELEVO "ORIÓN-IX"',
          origin: 'ORIGEN: ÓRBITA DE TRANSFERENCIA TIERRA-LUNA',
          mass: 'MASA TOTAL: 680 KG',
          dialogue: '"¡Nave de relevo en aproximación! Traemos celdas de energía y raciones para el acoplamiento final, pero atravesamos el cinturón de Van Allen sin purga completa."',
          solarFluxBadge: sol === state.maxSols ? `DÍA FINAL (${sol}/${state.maxSols})` : 'FLUJO: IONIZADO',
          solarSubtitle: 'RADIACIÓN VAN ALLEN EN CARGA',
          dossier: {
            id: `DOC #M-${caseDocNum}`,
            applicant: 'NAVE ORIÓN-IX',
            sector: 'MUELLE DE ATRAQUE A-01',
            weight: '680 KG // EXTERIOR',
            declaredImpact: '+25% ENERGÍA / +20% COMIDA',
            cargoDesc: 'La nave de relevo que nos llevará de regreso a la Tierra trae cajas de comida deliciosa y baterías nuevas para celebrar.',
            authCode: 'AUT-ORIÓN-VAN-ALLEN',
            uvStamp: '¡ALERTA DE RADIACIÓN (>50 mSv)!',
            secretText: 'NOTA SECRETA: Los sellos de aduana indican que las cajas rozaron el campo magnético y restarán un poquito de escudo al entrar.',
            uvTradeoffPapers: 'PAPELES: +25% ENERGÍA, +20% COMIDA, -5% ESCUDO',
            uvTradeoff: 'PAPELES: +25% ENERGÍA, +20% COMIDA, -5% ESCUDO | CAJA: [ ? ESCANEAR CAJA ]'
          },
          crate: {
            code: 'ORIÓN-CAJA-7',
            label: 'CARGA VAN ALLEN',
            hazard: 'RAD > 50 mSv',
            radReading: '54.0 mSv (¡PELIGRO!)',
            radSafe: false,
            xraySvgKey: 'isotope_cells_leak',
            secretTitle: 'RADIOGRAFÍA: CELDAS IONIZADAS A 54.0 mSv',
            secretSub: '¡Alerta máxima! El metal exterior estuvo expuesto a radiación espacial peligrosa y superó los cincuenta milisieverts.',
            secretImpactText: 'EFECTO DE LA CAJA: -25% OXÍGENO (FUGA RADIACTIVA)',
            crateDiscoveredText: '-25% OXÍGENO (FUGA RADIACTIVA)'
          },
          effects: {
            AUTHORIZE: {
              o2: -25, rad: -5, pwr: +25, food: +20,
              feedback: 'CARGA ORIÓN RECIBIDA: +25% Energía y +20% Comida, pero la radiación redujo -25% Oxígeno y -5% Escudo.'
            },
            DENY: {
              o2: +10, rad: +10, pwr: -15, food: -10,
              feedback: 'DESCONTAMINACIÓN EXTERNA: Protegiste Oxígeno (+10%) y Escudo (+10%), costando -15% Energía y -10% Comida.'
            }
          }
        };

      case 'nasa_audit':
      default:
        return {
          id: 'SOL7-C2',
          shortLabel: 'Auditoría Final NASA',
          visitorType: 'astronaut',
          isChainedEvent: false,
          outerAirlock: false,
          highPower: true,
          msv: 2.0,
          weatherLevel: 'CALM',
          name: 'CMDR. VANCE // AUDITORÍA FINAL NASA',
          origin: 'SECTOR: CENTRO DE MANDO LUNAR',
          mass: 'PROTOCOLO DE CIERRE',
          dialogue: '"Oficial de Esclusa, nos acercamos al final de la rotación lunar. ¿Activamos el protocolo de presurización y purga total de alta potencia para certificar las operaciones?"',
          solarFluxBadge: 'CERTIFICACIÓN NASA',
          solarSubtitle: `EVALUACIÓN DE CIERRE SOL ${sol}`,
          dossier: {
            id: `DOC #M-${caseDocNum}`,
            applicant: 'CMDR. E. VANCE',
            sector: 'NÚCLEO CENTRAL',
            weight: `CIERRE SOL ${sol}`,
            declaredImpact: '+20% OXÍGENO / +20% COMIDA',
            cargoDesc: 'La inspectora general de la NASA pide encender la computadora central para certificar que la base lunar funciona de maravilla.',
            authCode: 'AUT-ARTEMIS-FINAL-7',
            uvStamp: 'BALANCE DE CERTIFICACIÓN',
            secretText: 'NOTA SECRETA: El test de certificación exige encender todos los motores al mismo tiempo, lo que consume mucha electricidad.',
            uvTradeoffPapers: 'PAPELES: +20% OXÍGENO, +20% COMIDA, -20% ENERGÍA',
            uvTradeoff: 'PAPELES: +20% OXÍGENO, +20% COMIDA, -20% ENERGÍA | CAJA: [ ? ESCANEAR CAJA ]'
          },
          crate: {
            code: `SELLO-FINAL-${sol}`,
            label: 'NÚCLEO DE CERTIFICADO',
            hazard: 'ALTA POTENCIA',
            radReading: '2.0 mSv (ÓPTIMO)',
            radSafe: true,
            xraySvgKey: 'cryo_tank_bypass',
            secretTitle: 'RADIOGRAFÍA: MÓDULO DE CONTROL AMBIENTAL',
            secretSub: '¡Computadora sellada con oro y titanio! Al conectarla optimiza los sensores y aumenta las defensas del escudo.',
            secretImpactText: 'EFECTO DE LA CAJA: +15% ESCUDO (OPTIMIZACIÓN NASA)',
            crateDiscoveredText: '+15% ESCUDO (OPTIMIZACIÓN)'
          },
          effects: {
            AUTHORIZE: {
              o2: +20, rad: +15, pwr: -20, food: +20,
              feedback: `PURGA FINAL ACTIVADA: Oxígeno y comida al máximo para el cierre del Sol ${sol}.`
            },
            DENY: {
              o2: -15, rad: +10, pwr: +20, food: -15,
              feedback: `ENERGÍA RESERVADA: Energía asegurada (+20% Energía, +10% Escudo) para el cierre del Sol ${sol}.`
            }
          }
        };
    }
  }

  function buildCaseByKey(key, sol, caseInSol) {
    const caseDocNum = (sol - 1) * 2 + caseInSol + 1;
    const caseObj = buildRawCaseByKey(key, sol, caseInSol);
    const lang = window.GAME_SETTINGS?.lang || 'es';
    if (lang === 'en' && caseObj) {
      applyEnglishCaseTranslation(caseObj, key, sol, caseDocNum);
    }
    return caseObj;
  }

  function getCasesForSol(sol) {
    if (!state.missionSchedule || !state.missionSchedule[sol]) {
      generateMissionSchedule();
    }
    const keys = state.missionSchedule[sol] || ['botanist_uv', 'lox_tank'];
    return keys.map((key, caseIndex) => buildCaseByKey(key, sol, caseIndex));
  }

  function getCurrentCase() {
    const cases = getCasesForSol(state.sol);
    return cases[state.caseInSol] || cases[0];
  }

  // --- REFERENCIAS DOM ---
  const desk = document.getElementById('inspection-desk');
  const manualBookTrigger = document.getElementById('manual-book-trigger') || document.getElementById('manual-closed-cover');
  const manualDrawerPanel = document.getElementById('manual-drawer-panel');
  const manualCloseBtn = document.getElementById('protocol-manual-close');

  const dossierEl = document.getElementById('draggable-dossier');
  const crateEl = document.getElementById('draggable-crate');
  const scannerEl = document.getElementById('draggable-scanner');
  const stampAuthEl = document.getElementById('stamp-approve') || document.getElementById('stamp-authorize');
  const stampDenyEl = document.getElementById('stamp-deny');
  const nextShiftBtn = document.getElementById('next-case-btn') || document.getElementById('next-shift-btn');
  let caseDecided = false;

  const dossierXrayZone = document.getElementById('dossier-xray-zone');
  const dossierXrayReveal = document.getElementById('dossier-xray-reveal');
  const crateXrayZone = document.getElementById('crate-xray-zone');
  const crateXrayReveal = document.getElementById('crate-xray-reveal');

  const scannerRadCounter = document.getElementById('scanner-rad-counter');
  const scannerModeIndicator = document.getElementById('scanner-mode-indicator');

  let caseScannedCrate = false;
  let crateScanTimer = null;

  function revealCrateDataOnDossier() {
    if (caseScannedCrate) return;
    caseScannedCrate = true;
    const currentCase = getCurrentCase();
    if (!currentCase) return;

    if (sfx && typeof sfx.playDiscoveryChime === 'function') {
      sfx.playDiscoveryChime();
    }

    const crateImpactEl = document.getElementById('crate-secret-impact');
    if (crateImpactEl) {
      crateImpactEl.classList.add('border-amber-400', 'text-amber-300', 'shadow-[0_0_12px_rgba(251,191,36,0.6)]');
    }
  }

  const nasaTelemetryModal = document.getElementById('nasa-telemetry-modal');
  const nasaTelemetryBtn = document.getElementById('nasa-telemetry-btn');
  const nasaTelemetryCloseBtn = document.getElementById('nasa-telemetry-close-btn');

  function openNasaTelemetryModal() {
    if (!nasaTelemetryModal) return;
    updateNasaTelemetryUI();
    nasaTelemetryModal.classList.remove('hidden');
    sfx.playMenuSelect();
  }

  function closeNasaTelemetryModal() {
    if (!nasaTelemetryModal) return;
    nasaTelemetryModal.classList.add('hidden');
    sfx.playGrab();
  }

  const nightReportModal = document.getElementById('night-report-modal');
  const nextSolBtn = document.getElementById('next-sol-btn');

  const titleScreenModal = document.getElementById('title-screen') || document.getElementById('title-screen-modal');
  const startExpeditionBtn = document.getElementById('start-expedition-btn') || document.getElementById('init-shift-btn');
  const initShiftBtn = startExpeditionBtn;
  const continueMissionBtn = document.getElementById('continue-mission-btn');
  const savedGameBanner = document.getElementById('saved-game-banner');
  const savedGameSummary = document.getElementById('saved-game-summary');
  const abortResetBtn = document.getElementById('abort-reset-btn');

  const difficultyScreen = document.getElementById('difficulty-screen');
  const difficultyBackBtn = document.getElementById('difficulty-back-btn');
  const contractCards = document.querySelectorAll('.contract-card');

  const hangarLoadoutScreen = document.getElementById('hangar-loadout-screen');

  // =======================================================================
  // CONTROL CENTRALIZADO DE PANTALLAS PRE-MISIÓN
  // =======================================================================
  function hidePremissionScreen(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.style.display = 'none';
    el.style.pointerEvents = 'none';
  }

  function showPremissionScreen(el, displayType = 'flex') {
    if (!el) return;
    el.classList.remove('hidden');
    el.style.display = displayType;
    el.style.pointerEvents = 'auto';
  }

  function closeAllPremissionScreens() {
    [titleScreenModal, difficultyScreen, hangarLoadoutScreen].forEach(hidePremissionScreen);
    const extraOverlay = document.getElementById('launch-cinematic-overlay');
    if (extraOverlay) hidePremissionScreen(extraOverlay);
    const premissionStarfield = document.getElementById('premission-starfield');
    if (premissionStarfield) hidePremissionScreen(premissionStarfield);
  }

  const hangarBackToDiffBtn = document.getElementById('hangar-back-to-diff-btn');
  const hangarContractBadge = document.getElementById('hangar-contract-badge');
  const hangarBudgetDisplay = document.getElementById('hangar-budget-display');
  const hangarCapacityDisplay = document.getElementById('hangar-capacity-display');
  const rocketSlotsBadge = document.getElementById('rocket-slots-badge');
  const rocketCargoBay = document.getElementById('rocket-cargo-bay');
  const rocketDropZone = document.getElementById('rocket-drop-zone');
  const premissionStarfield = document.getElementById('premission-starfield') || document.getElementById('starfield-backdrop');
  const hangarStatusMsg = document.getElementById('hangar-status-msg');
  const hangarLaunchExpeditionBtn = document.getElementById('hangar-launch-expedition-btn');

  const stampHomePositions = new Map();

  // =======================================================================
  // MOTOR DE ESCALADO DE RESOLUCIÓN FIJA 1600x900 (SIN REFLOW)
  // =======================================================================
  function fitGameToScreen() {
    const scaler = document.getElementById('game-viewport-scaler');
    if (!scaler) return;
    const scale = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    scaler.style.transform = `scale(${scale})`;
    window.GAME_SCALE = scale;
  }

  function clampElementToDesk(el) {
    const curLeft = parseFloat(el.style.left) || 0;
    const curTop = parseFloat(el.style.top) || 0;
    const maxLeft = Math.max(0, 1600 - el.offsetWidth);
    const maxTop = Math.max(0, 450 - el.offsetHeight);
    el.style.left = `${Math.max(0, Math.min(maxLeft, curLeft))}px`;
    el.style.top = `${Math.max(0, Math.min(maxTop, curTop))}px`;
  }

  function updateStampsDockPositions() {
    const stampsLeft = 1280;
    const topAuth = 35;
    const topDeny = 140;

    if (stampAuthEl) {
      stampAuthEl._baseLeft = stampsLeft;
      stampAuthEl._baseTop = topAuth;
      stampAuthEl._width = 270;
      stampAuthEl._height = 86;
      stampAuthEl._tx = 0;
      stampAuthEl._ty = 0;
      stampAuthEl.style.left = `${stampsLeft}px`;
      stampAuthEl.style.top = `${topAuth}px`;
      stampAuthEl.style.width = '270px';
      stampAuthEl.style.height = '86px';
      stampAuthEl.style.opacity = '1';
      stampAuthEl.style.transform = 'translate3d(0px, 0px, 0px)';
      stampAuthEl.style.pointerEvents = 'auto';
      stampAuthEl.style.zIndex = '60';
      stampHomePositions.set(stampAuthEl, { left: stampsLeft, top: topAuth });
    }

    if (stampDenyEl) {
      stampDenyEl._baseLeft = stampsLeft;
      stampDenyEl._baseTop = topDeny;
      stampDenyEl._width = 270;
      stampDenyEl._height = 86;
      stampDenyEl._tx = 0;
      stampDenyEl._ty = 0;
      stampDenyEl.style.left = `${stampsLeft}px`;
      stampDenyEl.style.top = `${topDeny}px`;
      stampDenyEl.style.width = '270px';
      stampDenyEl.style.height = '86px';
      stampDenyEl.style.opacity = '1';
      stampDenyEl.style.transform = 'translate3d(0px, 0px, 0px)';
      stampDenyEl.style.pointerEvents = 'auto';
      stampDenyEl.style.zIndex = '60';
      stampHomePositions.set(stampDenyEl, { left: stampsLeft, top: topDeny });
    }
  }

  function layoutCaseItemsNearCenter() {
    dossierEl._baseLeft = 225;
    dossierEl._baseTop = 20;
    dossierEl._width = 320;
    dossierEl._height = 340;
    dossierEl._tx = 0;
    dossierEl._ty = 0;
    dossierEl.style.left = '225px';
    dossierEl.style.top = '20px';
    dossierEl.style.width = '320px';
    dossierEl.style.height = '340px';
    dossierEl.style.opacity = '1';
    dossierEl.style.transform = 'translate3d(0px, 0px, 0px)';
    dossierEl.style.pointerEvents = 'auto';

    crateEl._baseLeft = 585;
    crateEl._baseTop = 30;
    crateEl._width = 310;
    crateEl._height = 310;
    crateEl._tx = 0;
    crateEl._ty = 0;
    crateEl.style.left = '585px';
    crateEl.style.top = '30px';
    crateEl.style.width = '310px';
    crateEl.style.height = '310px';
    crateEl.style.opacity = '1';
    crateEl.style.transform = 'translate3d(0px, 0px, 0px)';
    crateEl.style.pointerEvents = 'auto';
  }

  function layoutAllDeskToolsInitial() {
    fitGameToScreen();

    const manualEl = document.getElementById('manual-book-trigger') || document.getElementById('draggable-manual');
    if (manualEl) {
      manualEl._baseLeft = 25;
      manualEl._baseTop = 35;
      manualEl._width = 165;
      manualEl._height = 290;
      manualEl._tx = 0;
      manualEl._ty = 0;
      manualEl.style.left = '25px';
      manualEl.style.top = '35px';
      manualEl.style.width = '165px';
      manualEl.style.height = '290px';
      manualEl.style.opacity = '1';
      manualEl.style.transform = 'translate3d(0px, 0px, 0px)';
    }

    layoutCaseItemsNearCenter();
    updateStampsDockPositions();

    scannerEl._baseLeft = 930;
    scannerEl._baseTop = 38;
    scannerEl._width = 320;
    scannerEl._height = 295;
    scannerEl._tx = 0;
    scannerEl._ty = 0;
    scannerEl.style.left = '930px';
    scannerEl.style.top = '38px';
    scannerEl.style.width = '320px';
    scannerEl.style.height = '295px';
    scannerEl.style.opacity = '1';
    scannerEl.style.transform = 'translate3d(0px, 0px, 0px)';
    scannerEl.style.pointerEvents = 'auto';

    updateScannerCollisions(false);
  }

  function updateWorkspaceScale(repositionExisting = true) {
    fitGameToScreen();
    updateScannerCollisions(false);
  }

  // --- INYECTAR PUNTOS PARPADEANTES DE RECURSOS EN JUEGO EN LAS 4 BARRAS ---
  function injectResourceImpactDots() {
    const keys = ['o2', 'rad', 'pwr', 'food'];
    keys.forEach((key) => {
      const valEl = document.getElementById(`res-val-${key}`);
      if (valEl && !document.getElementById(`impact-dot-${key}`)) {
        const dot = document.createElement('span');
        dot.id = `impact-dot-${key}`;
        dot.className = 'impact-dot';
        dot.title = 'Recurso en juego en esta decisión';
        valEl.parentNode.insertBefore(dot, valEl);
      }
    });
  }

  function setAffectedResourceDots(affectedMap = null) {
    const keys = ['o2', 'rad', 'pwr', 'food'];
    keys.forEach((key) => {
      const dot = document.getElementById(`impact-dot-${key}`);
      if (!dot) return;
      const isAffected = Boolean(affectedMap && affectedMap[key]);
      dot.classList.toggle('active', isAffected);
    });
  }

  // --- IMPACTO PERMANENTE EN BARRAS AL SELLAR (CERO SPOILERS ANTES DE SELLAR) ---
  function previewStampImpactOnBars(stampType = null) {
    // Desactivado intencionalmente: las barras superiores no muestran pistas antes de sellar
  }

  function showPermanentStampImpactOnBars(delta = null) {
    const keys = ['o2', 'rad', 'pwr', 'food'];
    keys.forEach((key) => {
      const card = document.getElementById(`res-card-${key}`);
      const arrow = document.getElementById(`res-arrow-${key}`);
      if (!card || !arrow) return;
      card.classList.remove('bar-preview-up', 'bar-preview-down');

      if (delta && delta[key] > 0) {
        card.classList.add('bar-preview-up');
        arrow.textContent = `▲+${delta[key]}%`;
        arrow.className = 'res-delta-arrow arrow-up text-xs font-black';
      } else if (delta && delta[key] < 0) {
        card.classList.add('bar-preview-down');
        arrow.textContent = `▼${delta[key]}%`;
        arrow.className = 'res-delta-arrow arrow-down text-xs font-black';
      } else {
        arrow.textContent = '';
        arrow.className = 'res-delta-arrow hidden text-xs font-black';
      }
    });
  }

  function getStakesForCurrentCase(specificStamp = null) {
    const currentCase = getCurrentCase();
    const auth = calculateTotalImpact(currentCase, 'AUTHORIZE').delta;
    const deny = calculateTotalImpact(currentCase, 'DENY').delta;

    if (specificStamp === 'AUTHORIZE') {
      return {
        o2: auth.o2 !== 0,
        rad: auth.rad !== 0,
        pwr: auth.pwr !== 0,
        food: auth.food !== 0
      };
    }
    if (specificStamp === 'DENY') {
      return {
        o2: deny.o2 !== 0,
        rad: deny.rad !== 0,
        pwr: deny.pwr !== 0,
        food: deny.food !== 0
      };
    }
    return {
      o2: auth.o2 !== 0 || deny.o2 !== 0,
      rad: auth.rad !== 0 || deny.rad !== 0,
      pwr: auth.pwr !== 0 || deny.pwr !== 0,
      food: auth.food !== 0 || deny.food !== 0
    };
  }

  function triggerScreenShake() {
    document.body.classList.remove('screen-shake');
    void document.body.offsetWidth;
    document.body.classList.add('screen-shake');
    setTimeout(() => {
      document.body.classList.remove('screen-shake');
    }, 320);
  }

  function calculateTotalImpact(currentCase, stampType) {
    const base = (currentCase && currentCase.effects && currentCase.effects[stampType]) || { o2: 0, rad: 0, pwr: 0, food: 0 };
    const delta = {
      o2: base.o2 || 0,
      rad: base.rad || 0,
      pwr: base.pwr || 0,
      food: base.food || 0
    };
    const triggeredRules = [];

    return { delta, triggeredRules, base };
  }

  function updateResourceBars(previewDelta = null) {
    const keys = ['o2', 'rad', 'pwr', 'food'];
    let anyInDanger = false;

    keys.forEach((key) => {
      const val = Math.max(0, Math.min(100, state.resources[key]));
      const card = document.getElementById(`res-card-${key}`);
      const valText = document.getElementById(`res-val-${key}`);
      const bar = document.getElementById(`res-bar-${key}`);
      const engSub = document.getElementById(`res-eng-${key}`);

      if (valText) valText.textContent = `${val}%`;
      if (bar) bar.style.width = `${val}%`;

      // Equivalencias Físicas Reales de la NASA (BVAD & STD-3001) en tiempo real
      if (engSub) {
        const isEn = window.GAME_SETTINGS?.lang === 'en';
        if (key === 'o2') {
          const kgO2 = ((val / 100) * 8.4).toFixed(1);
          const kPa = ((val / 100) * 101.3).toFixed(1);
          engSub.textContent = isEn ? `${kgO2} kg O₂ (Pressure: ${kPa} kPa)` : `${kgO2} kg O₂ (Presión: ${kPa} kPa)`;
        } else if (key === 'rad') {
          const filteredMsv = Math.round((val / 100) * 100);
          engSub.textContent = isEn ? `Filtered: ${filteredMsv} mSv (STD-3001: 50 mSv)` : `Filtrado: ${filteredMsv} mSv (STD-3001: 50 mSv)`;
        } else if (key === 'pwr') {
          const kW = ((val / 100) * 10.0).toFixed(1);
          engSub.textContent = `${kW} kW / 10 kW (Kilopower)`;
        } else if (key === 'food') {
          const kgFood = ((val / 100) * 6.2).toFixed(1);
          engSub.textContent = isEn ? `${kgFood} kg / day (3,000 kcal)` : `${kgFood} kg / día (3,000 kcal)`;
        }
      }

      const willChange = previewDelta && previewDelta[key] !== 0;
      const inDanger = val < 25;
      if (inDanger && val > 0 && titleScreenModal?.classList.contains('hidden')) {
        anyInDanger = true;
      }

      if (card) {
        if (inDanger || willChange) {
          card.classList.add('resource-danger');
        } else {
          card.classList.remove('resource-danger');
        }
      }
    });

    try { sfx.updateLowResourceAlarm(anyInDanger); } catch (e) {}
    try { refreshCctvIfOpen(); } catch (e) {}
    try { updateSolarConditionCardsRealtime(); } catch (e) {}
  }

  // =======================================================================
  // 1. RADAR SOLAR Y TARJETAS DE REGLAS ULTRA-CONCISAS (CERO TRUNCATE)
  // =======================================================================
  function updateSolarMonitor() {
    const current = getCurrentCase();
    const weatherLevel = current.weatherLevel || (state.sol === 3 || state.sol === 6 ? 'STORM' : 'CALM');
    const particleLayer = document.getElementById('exterior-particles');
    if (particleLayer) particleLayer.dataset.weather = weatherLevel;

    const radarHeaderLed = document.getElementById('radar-header-led');
    const donkiMod = getNasaDonkiClimateModifier();

    if (weatherLevel === 'STORM' || donkiMod.type === 'X') {
      if (radarHeaderLed) radarHeaderLed.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shadow-[0_0_8px_#f43f5e]';
    } else if (weatherLevel === 'IONIZED' || donkiMod.type === 'M') {
      if (radarHeaderLed) radarHeaderLed.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]';
    } else {
      if (radarHeaderLed) radarHeaderLed.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]';
    }

    const sunSvg = document.getElementById('solar-magnetosphere-svg');
    if (sunSvg) {
      sunSvg.setAttribute('data-solar-class', donkiMod.type);
    }

    updateSolarConditionCardsRealtime();
  }

  function updateSolarConditionCardsRealtime() {
    const flare = (nasaTelemetry && nasaTelemetry.flare) || NASA_FALLBACK_TELEMETRY.flare;
    const donkiMod = getNasaDonkiClimateModifier();
    const isEn = window.GAME_SETTINGS?.lang === 'en';

    const donkiClassBadge = document.getElementById('nasa-donki-class-badge');
    if (donkiClassBadge) donkiClassBadge.textContent = isEn ? `CLASS ${flare.classType}` : `CLASE ${flare.classType}`;

    const donkiRegion = document.getElementById('nasa-donki-region');
    if (donkiRegion) donkiRegion.textContent = `AR-${flare.activeRegionNum || '14566'}`;

    const donkiEffectText = document.getElementById('nasa-donki-effect-text');
    if (donkiEffectText) {
      if (donkiMod.type === 'X') {
        donkiEffectText.textContent = isEn ? '-10% SHIELD • +15 mSv IN CRATES' : '-10% ESCUDO • +15 mSv EN CAJAS';
        donkiEffectText.className = 'text-xs font-black text-rose-300 leading-tight whitespace-nowrap';
      } else if (donkiMod.type === 'M') {
        donkiEffectText.textContent = isEn ? '+8.5 mSv IN CRATES' : '+8.5 mSv EN CAJAS';
        donkiEffectText.className = 'text-xs font-black text-amber-200 leading-tight whitespace-nowrap';
      } else {
        donkiEffectText.textContent = isEn ? '+5% PASSIVE ENERGY IN CALM' : '+5% ENERGÍA PASIVA EN CALMA';
        donkiEffectText.className = 'text-xs font-black text-emerald-300 leading-tight whitespace-nowrap';
      }
    }

    const sunSvg = document.getElementById('solar-magnetosphere-svg');
    if (sunSvg) {
      sunSvg.setAttribute('data-solar-class', donkiMod.type);
    }

    const fluxLevelEl = document.getElementById('donki-flux-level');
    const intensityBarEl = document.getElementById('donki-intensity-bar');
    const ledBars = document.querySelectorAll('#donki-led-meter .donki-led-bar');
    if (donkiMod.type === 'X') {
      if (fluxLevelEl) { fluxLevelEl.textContent = isEn ? 'EXTREME' : 'EXTREMO'; fluxLevelEl.className = 'text-[9px] font-mono font-bold text-rose-400'; }
      if (intensityBarEl) { intensityBarEl.style.width = '95%'; intensityBarEl.className = 'h-full bg-rose-500 rounded-full transition-all duration-300'; }
      ledBars.forEach((b) => { b.className = 'donki-led-bar bar-x active'; });
    } else if (donkiMod.type === 'M') {
      if (fluxLevelEl) { fluxLevelEl.textContent = isEn ? 'MODERATE' : 'MODERADO'; fluxLevelEl.className = 'text-[9px] font-mono font-bold text-amber-300'; }
      if (intensityBarEl) { intensityBarEl.style.width = '65%'; intensityBarEl.className = 'h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 rounded-full transition-all duration-300'; }
      ledBars.forEach((b, i) => { b.className = i < 4 ? 'donki-led-bar bar-m active' : 'donki-led-bar'; });
    } else {
      if (fluxLevelEl) { fluxLevelEl.textContent = isEn ? 'LOW' : 'BAJO'; fluxLevelEl.className = 'text-[9px] font-mono font-bold text-emerald-400'; }
      if (intensityBarEl) { intensityBarEl.style.width = '35%'; intensityBarEl.className = 'h-full bg-emerald-400 rounded-full transition-all duration-300'; }
      ledBars.forEach((b, i) => { b.className = i < 2 ? 'donki-led-bar bar-c active' : 'donki-led-bar'; });
    }
  }

  function updateFlagsTicker() {
    const isEn = window.GAME_SETTINGS?.lang === 'en';
    const activeFlags = [];
    if (state.flags.lunar_dust_contamination) activeFlags.push(isEn ? 'LUNAR DUST ACTIVE (SOL 2)' : 'POLVO LUNAR ACTIVO (SOL 2)');
    if (state.flags.engineer_saved === true) activeFlags.push(isEn ? 'ENG. ROSSI SAVED (+POWER)' : 'ING. ROSSI A SALVO (+ENERGÍA)');
    if (state.flags.engineer_saved === false) activeFlags.push(isEn ? 'UNCALIBRATED ANTENNA (-POWER)' : 'ANTENA SIN CALIBRAR (-ENERGÍA)');
    if (state.flags.kilopower_unstable) activeFlags.push(isEn ? 'REACTOR UNSTABLE (SOL 5)' : 'REACTOR INESTABLE (SOL 5)');

    const ticker = document.getElementById('active-flags-ticker');
    if (!ticker) return;
    if (activeFlags.length > 0) {
      ticker.textContent = isEn ? `ACTIVE ALERTS: ${activeFlags.join(' • ')}` : `ALERTAS ACTIVAS: ${activeFlags.join(' • ')}`;
      ticker.className = 'text-amber-300 font-bold';
    } else {
      ticker.textContent = isEn ? 'SYSTEMS NOMINAL // STD-3001 STANDARD' : 'SISTEMAS NOMINALES // NORMA STD-3001';
      ticker.className = 'text-emerald-400/80';
    }
  }

  // =======================================================================
  // 2. AVATARES VIVOS (ENTRADA, IDLE, OVERLAYS) Y PARTÍCULAS EXTERIORES
  // =======================================================================
  function buildAvatarOverlays(type) {
    if (type === 'rover') {
      return `
        <div class="av-strobe" style="left:27.5%;top:11%"></div>
        <div class="av-radar-ring" style="left:27.5%;top:18%"></div>
        <span class="av-led av-led-red" style="left:27.5%;top:11%"></span>`;
    }
    if (type === 'module') {
      return `
        <span class="av-led av-led-cyan" style="left:50%;top:6%"></span>
        <span class="av-led av-led-green" style="left:50%;top:46%;width:4%;height:4%;animation-delay:.4s"></span>`;
    }
    // Humanoides (botanist / astronaut): antena con LED + reflejo de visor
    const ledClass = type === 'botanist' ? 'av-led-green' : 'av-led-red';
    return `
      <div class="av-antenna-sway" style="position:absolute;left:74%;top:7%;width:6%;height:6%;">
        <span class="av-led ${ledClass}" style="left:50%;top:50%"></span>
      </div>
      <div class="av-visor-glint"></div>`;
  }

  function mountAnimatedAvatar(type) {
    const avatarEl = document.getElementById('visitor-avatar');
    if (!avatarEl) return;
    const svg = VISITOR_SVGS[type] || VISITOR_SVGS.astronaut;
    const idleClass = type === 'rover' ? 'avatar-idle-rover' : type === 'module' ? 'avatar-idle-module' : 'avatar-idle-human';
    avatarEl.innerHTML = `<div class="avatar-idle ${idleClass}">${svg}${buildAvatarOverlays(type)}</div>`;

    // Reiniciar animación de entrada (camina/desliza desde la izquierda con rebote)
    avatarEl.classList.remove('avatar-enter');
    void avatarEl.offsetWidth;
    avatarEl.classList.add('avatar-enter');
  }

  function initExteriorParticles() {
    const layer = document.getElementById('exterior-particles');
    if (!layer || layer.childElementCount > 0) return;
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('span');
      p.className = 'ext-particle';
      p.style.top = `${4 + Math.random() * 84}%`;
      p.style.setProperty('--sz', `${1.5 + Math.random() * 2.5}px`);
      p.style.setProperty('--dur', `${7 + Math.random() * 9}s`);
      p.style.setProperty('--delay', `${-Math.random() * 14}s`);
      p.style.setProperty('--wob', `${(Math.random() - 0.5) * 14}px`);
      layer.appendChild(p);
    }
    layer.dataset.weather = 'CALM';
  }

  // =======================================================================
  // 3. DIÁLOGO TYPEWRITER (~22ms/carácter) + ONDA DE VOZ + CHIRPS DE RADIO
  // =======================================================================
  const TYPEWRITER_MS = 22;
  const typewriter = { timer: null, full: '', index: 0, voice: 'astronaut', active: false };

  // Resaltador automático de palabras clave (Peligro/Urgencia vs Sistemas/Recursos)
  function formatDialogueKeywords(text) {
    if (!text) return '';
    const safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const hazardTest = /\b(urgente[s]?|emergencia[s]?|muriendo|peligro[s]?|peligros[oa]s?|radiaci[oó]n|fr[ií]o[s]?|fuga[s]?|cr[ií]tic[oa]s?|apagar|urgent|emergency|emergencies|dying|danger|dangerous|radiation|cold|freezing|leak[s]?|critical|shut\s*down)\b/i;
    const combinedRegex = /\b(l[aá]mparas?\s+uv|uv\s+lamps?|ox[ií]geno|escudo[s]?|energ[ií]a[s]?|comida[s]?|agua[s]?|acumulador(es)?|bater[ií]a[s]?|hielo[s]?|alga[s]?|trigo|calefactor(es)?|oxygen|shield[s]?|energy|food|water|batter(y|ies)|uv|ice|algae|wheat|heater[s]?|urgente[s]?|emergencia[s]?|muriendo|peligro[s]?|peligros[oa]s?|radiaci[oó]n|fr[ií]o[s]?|fuga[s]?|cr[ií]tic[oa]s?|apagar|urgent|emergency|emergencies|dying|danger|dangerous|radiation|cold|freezing|leak[s]?|critical|shut\s*down)\b/gi;

    return safe.replace(combinedRegex, (match) => {
      if (hazardTest.test(match)) {
        return `<span class="dialogue-keyword-hazard">${match}</span>`;
      }
      return `<span class="dialogue-keyword-system">${match}</span>`;
    });
  }

  function setSpeakingVisuals(isSpeaking) {
    const wave = document.getElementById('voice-wave-indicator');
    const stage = document.getElementById('visitor-avatar-stage');
    const status = document.getElementById('hud-tx-status');
    const audioBars = document.getElementById('dialogue-audio-bars');
    const isEn = window.GAME_SETTINGS?.lang === 'en';
    if (wave) wave.classList.toggle('speaking', isSpeaking);
    if (stage) stage.classList.toggle('avatar-speaking', isSpeaking);
    if (audioBars) audioBars.classList.toggle('speaking', isSpeaking);
    if (status) {
      status.textContent = isSpeaking
        ? (isEn ? 'VOICE TRANSMISSION IN PROGRESS // EVA' : 'TRANSMISIÓN DE VOZ EN CURSO // EVA')
        : (isEn ? 'TRANSMISSION COMPLETE // AWAITING STAMP' : 'TRANSMISIÓN COMPLETA // EN ESPERA DE SELLO');
    }
  }

  function stopTypewriter() {
    if (typewriter.timer) {
      clearInterval(typewriter.timer);
      typewriter.timer = null;
    }
    typewriter.active = false;
    setSpeakingVisuals(false);
  }

  function finishTypewriter() {
    const dlg = document.getElementById('visitor-dialogue');
    if (dlg) dlg.innerHTML = formatDialogueKeywords(typewriter.full);
    stopTypewriter();
  }

  function startTypewriter(text, voiceType = 'astronaut') {
    stopTypewriter();
    const dlg = document.getElementById('visitor-dialogue');
    if (!dlg) return;
    typewriter.full = text;
    typewriter.index = 0;
    typewriter.voice = voiceType;
    typewriter.active = true;
    dlg.innerHTML = '';
    setSpeakingVisuals(true);

    let nextChirpAt = 0;
    typewriter.timer = setInterval(() => {
      typewriter.index += 1;
      dlg.innerHTML = formatDialogueKeywords(typewriter.full.slice(0, typewriter.index));

      if (typewriter.index >= nextChirpAt) {
        sfx.playRadioChirp(typewriter.voice);
        nextChirpAt = typewriter.index + 3 + Math.floor(Math.random() * 2); // cada 3 o 4 letras
      }

      if (typewriter.index >= typewriter.full.length) {
        finishTypewriter();
      }
    }, TYPEWRITER_MS);
  }

  // --- CARGAR EL CASO ACTUAL EN PANTALLA ---
  function renderCurrentCase(withSlideIn = false) {
    caseDecided = false;
    const nextBtn = document.getElementById('next-case-btn') || document.getElementById('next-shift-btn') || nextShiftBtn;
    if (nextBtn) {
      nextBtn.classList.add('hidden');
      nextBtn.style.display = 'none';
      nextBtn.style.pointerEvents = 'none';
    }

    const current = getCurrentCase();
    state.stampedChoice = null;
    state.isTransitioning = false;
    sfx.stopScannerAudio();
    setAffectedResourceDots(null);
    showPermanentStampImpactOnBars(null);

    caseScannedCrate = false;
    if (crateScanTimer) {
      clearTimeout(crateScanTimer);
      crateScanTimer = null;
    }

    const isStormSol = state.sol === 3 || state.sol === 6;
    const isEn = (window.GAME_SETTINGS?.lang === 'en');
    const setElText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = (text !== undefined && text !== null) ? text : '';
    };

    setElText('sol-counter', `SOL ${state.sol} / ${state.maxSols}`);
    setElText('case-counter', isEn ? `SHIFT ${state.caseInSol + 1} / 2 (SOL ${state.sol})` : `CASO ${state.caseInSol + 1} / 2 (SOL ${state.sol})`);
    setElText('crt-sol-tag', isStormSol 
      ? (isEn ? `SOL ${state.sol} // SOLAR STORM` : `SOL ${state.sol} // TORMENTA SOLAR`) 
      : (isEn ? `SOL ${state.sol} // TELEMETRY` : `SOL ${state.sol} // TELEMETRÍA`));

    const backdrop = document.getElementById('lunar-backdrop');
    if (backdrop) backdrop.classList.toggle('solar-storm-sky', isStormSol);
    setElText('ext-env-readout', isStormSol 
      ? (isEn ? 'EXT ALERT: PROTON STORM // EXTREME FLUX' : 'ALERTA EXT: TORMENTA DE PROTONES // FLUJO EXTREMO') 
      : (isEn ? 'EXT TEMP: -178°C // LUNAR VACUUM' : 'TEMP. EXT: -178°C // VACÍO LUNAR'));

    const chainBadge = document.getElementById('chain-badge');
    if (chainBadge) chainBadge.classList.toggle('hidden', !current.isChainedEvent);

    mountAnimatedAvatar(current.visitorType);
    setElText('visitor-name', current.name);
    startTypewriter(current.dialogue, current.visitorType);
    setElText('visitor-origin', current.origin);
    setElText('visitor-mass', current.mass);

    const statusBadge = document.getElementById('airlock-status-badge');
    if (statusBadge) {
      statusBadge.textContent = current.outerAirlock 
        ? (isEn ? 'OUTER AIRLOCK • CLOSED' : 'ESCLUSA EXTERIOR • CERRADA') 
        : (isEn ? 'AIRLOCK CLOSED • INTERNAL SECTOR' : 'ESCLUSA CERRADA • SECTOR INTERNO');
      statusBadge.className = 'text-[0.7rem] px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold uppercase';
    }

    const feedbackEl = document.getElementById('decision-feedback');
    if (feedbackEl) {
      feedbackEl.textContent = isEn ? 'AWAITING OFFICIAL STAMP ON MANIFEST...' : 'ESPERANDO SELLO OFICIAL EN MANIFIESTO...';
      feedbackEl.className = 'font-bold text-amber-400';
    }

    updateSolarMonitor();
    updateFlagsTicker();

    // Poblar Manifiesto Datapad (Vista Normal Simplificada a 3 Bloques)
    setElText('dossier-id', current.dossier.id);
    setElText('dossier-applicant', current.dossier.applicant);
    setElText('dossier-sector', current.dossier.sector);
    setElText('dossier-weight', current.dossier.weight);
    setElText('dossier-declared-impact', current.dossier.declaredImpact);
    setElText('dossier-cargo-desc', current.dossier.cargoDesc);
    setElText('dossier-auth-code', current.dossier.authCode || (isEn ? 'AUTH CODE: ARTEMIS-901' : 'CÓDIGO AUT: ARTEMIS-901'));

    const promiseLabel = document.getElementById('dossier-promise-label');
    if (promiseLabel) {
      promiseLabel.textContent = isEn ? 'PAPER PROMISE' : 'PROMESA EN PAPEL';
    }
    const holoText = document.getElementById('dossier-holo-text');
    if (holoText) {
      holoText.textContent = isEn ? 'HOLO-ARTEMIS SEAL VERIFIED' : 'SELLO HOLO-ARTEMIS VERIFICADO';
    }

    // =======================================================================
    // 2. CAPA UV DEL IPAD (#dossier-xray-zone) - AUDITORÍA FORENSE DEBLOATED
    // =======================================================================
    const authEffects = current.effects.AUTHORIZE || { o2: 0, rad: 0, pwr: 0, food: 0 };
    const denyEffects = current.effects.DENY || { o2: 0, rad: 0, pwr: 0, food: 0 };
    const formatDelta = (v) => (v > 0 ? `+${v}%` : v < 0 ? `${v}%` : '0%');
    const deltaColor = (v) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-zinc-400');

    const rawSecret = current.dossier.secretText || '';
    const cleanSecret = rawSecret.replace(/^(NOTA SECRETA:\s*|SECRET NOTE:\s*|¡OJO!\s*|NOTE:\s*|\[!\]\s*)/i, '').trim();

    const denyParts = [];
    if (denyEffects.o2 && denyEffects.o2 !== 0) denyParts.push(`${formatDelta(denyEffects.o2)} ${isEn ? 'OXYGEN' : 'OXÍGENO'}`);
    if (denyEffects.rad && denyEffects.rad !== 0) denyParts.push(`${formatDelta(denyEffects.rad)} ${isEn ? 'SHIELD' : 'ESCUDO'}`);
    if (denyEffects.pwr && denyEffects.pwr !== 0) denyParts.push(`${formatDelta(denyEffects.pwr)} ${isEn ? 'POWER' : 'ENERGÍA'}`);
    if (denyEffects.food && denyEffects.food !== 0) denyParts.push(`${formatDelta(denyEffects.food)} ${isEn ? 'FOOD' : 'COMIDA'}`);

    const denySummaryText = denyParts.length > 0
      ? (isEn ? `IF DENIED: ${denyParts.join(', ')}` : `SI DENIEGAS: ${denyParts.join(', ')}`)
      : (isEn ? 'IF DENIED: NO IMPACT ON RESOURCES' : 'SI DENIEGAS: SIN IMPACTO EN RECURSOS');

    const dossierXrayEl = document.getElementById('dossier-xray-zone');
    if (dossierXrayEl) {
      dossierXrayEl.innerHTML = `
        <div id="dossier-xray-reveal" class="w-full h-full flex flex-col justify-start select-none gap-2.5">
          <!-- BLOQUE 1 (ARRIBA): Pantalla LCD púrpura de 1 línea (34px) con ticker continuo -->
          <div class="shrink-0 h-[34px] flex items-center px-2.5 bg-fuchsia-950/85 border border-fuchsia-500/60 rounded-xl shadow-[0_0_15px_rgba(217,70,239,0.25)] overflow-hidden" style="height: 34px; min-height: 34px;">
            <div class="lcd-ticker-container flex items-center">
              <div id="dossier-secret-text" class="lcd-ticker-track font-bold text-[13.5px] text-[#f5d0fe]">
                <span>${cleanSecret}</span>
                <span class="mx-3 text-fuchsia-400 opacity-60">/// [UV-DATA] ///</span>
                <span>${cleanSecret}</span>
                <span class="mx-3 text-fuchsia-400 opacity-60">/// [UV-DATA] ///</span>
              </div>
            </div>
          </div>

          <!-- BLOQUE 2 (CENTRO): Grid 2x2 expandido que ocupa todo el espacio vertical -->
          <div id="dossier-xray-grid" class="xray-resource-grid" style="flex: 1 !important; display: grid !important; grid-template-columns: repeat(2, 1fr) !important; grid-template-rows: repeat(2, 1fr) !important; gap: 10px !important; width: 100% !important; min-height: 0 !important;">
            <!-- OXÍGENO -->
            <div class="xray-impact-card bg-zinc-950/95 border border-cyan-500/50 rounded-xl text-center shadow-md" style="height: 100% !important; display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important;">
              <span class="xray-resource-label text-cyan-400 block" style="font-size: 12px; font-weight: 700;">${isEn ? 'OXYGEN' : 'OXÍGENO'}</span>
              <span class="xray-impact-val font-mono leading-none ${deltaColor(authEffects.o2)}" style="font-size: 22px; font-weight: 800;">${formatDelta(authEffects.o2)}</span>
            </div>
            <!-- ESCUDO -->
            <div class="xray-impact-card bg-zinc-950/95 border border-purple-500/50 rounded-xl text-center shadow-md" style="height: 100% !important; display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important;">
              <span class="xray-resource-label text-purple-400 block" style="font-size: 12px; font-weight: 700;">${isEn ? 'SHIELD' : 'ESCUDO'}</span>
              <span class="xray-impact-val font-mono leading-none ${deltaColor(authEffects.rad)}" style="font-size: 22px; font-weight: 800;">${formatDelta(authEffects.rad)}</span>
            </div>
            <!-- ENERGÍA -->
            <div class="xray-impact-card bg-zinc-950/95 border border-amber-500/50 rounded-xl text-center shadow-md" style="height: 100% !important; display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important;">
              <span class="xray-resource-label text-amber-400 block" style="font-size: 12px; font-weight: 700;">${isEn ? 'POWER' : 'ENERGÍA'}</span>
              <span class="xray-impact-val font-mono leading-none ${deltaColor(authEffects.pwr)}" style="font-size: 22px; font-weight: 800;">${formatDelta(authEffects.pwr)}</span>
            </div>
            <!-- COMIDA -->
            <div class="xray-impact-card bg-zinc-950/95 border border-emerald-500/50 rounded-xl text-center shadow-md" style="height: 100% !important; display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important;">
              <span class="xray-resource-label text-emerald-400 block" style="font-size: 12px; font-weight: 700;">${isEn ? 'FOOD' : 'COMIDA'}</span>
              <span class="xray-impact-val font-mono leading-none ${deltaColor(authEffects.food)}" style="font-size: 22px; font-weight: 800;">${formatDelta(authEffects.food)}</span>
            </div>
          </div>

          <!-- BLOQUE 3 (ABAJO): Barra LCD compacta de 28px con ticker para SI DENIEGAS -->
          <div class="shrink-0 h-[28px] flex items-center px-2 bg-fuchsia-950/95 border border-fuchsia-400/80 rounded-lg shadow-md overflow-hidden" style="height: 28px; min-height: 28px;">
            <div class="lcd-ticker-container flex items-center w-full">
              <div id="dossier-uv-tradeoff" class="lcd-ticker-track font-mono font-black text-[11px] text-fuchsia-200">
                <span>${denySummaryText}</span>
                <span class="mx-3 text-fuchsia-400 opacity-60">/// [UV-DATA] ///</span>
                <span>${denySummaryText}</span>
                <span class="mx-3 text-fuchsia-400 opacity-60">/// [UV-DATA] ///</span>
              </div>
            </div>
          </div>
        </div>
      `;
      dossierXrayEl.style.clipPath = 'inset(0px 100% 100% 0px)';
      dossierXrayEl.style.webkitClipPath = 'inset(0px 100% 100% 0px)';
      dossierXrayEl.classList.remove('is-scanned');
    }

    const stampMark = document.getElementById('stamp-ink-mark');
    if (stampMark) stampMark.classList.add('hidden');
    const caseNextBtn = document.getElementById('next-case-btn') || document.getElementById('next-shift-btn') || nextShiftBtn;
    if (caseNextBtn) {
      caseNextBtn.classList.add('hidden');
      caseNextBtn.style.display = 'none';
      caseNextBtn.style.pointerEvents = 'none';
    }

    // =======================================================================
    // 3. CAPA RAYOS-X DE LA CAJA SECRETA (#crate-xray-zone) - CONTENIDO COMPLETO
    // =======================================================================
    const donkiMod = getNasaDonkiClimateModifier();
    const effectiveMsv = current.msv + donkiMod.crateMsvOffset;
    const isHazard = effectiveMsv > 50 || !current.crate.radSafe;
    const cleanCrateTitle = (current.crate.secretTitle || current.crate.label || '').replace(/^(RADIOGRAF[ÍI]A:\s*|X-RAY:\s*)/i, '').trim();
    const statusBadgeText = isHazard
      ? (isEn ? '[ ! ] RADIATION LEAK' : '[ ! ] FUGA RADIACTIVA')
      : (isEn ? '[ OK ] INTACT' : '[ OK ] INTACTO');
    const cleanCrateSub = current.crate.secretSub || (isEn ? 'Internal sealed radiographic inspection.' : 'Inspección radiográfica de contenido interno sellado.');

    let consequenceText = '';
    let consequenceBadgeClass = '';

    if (current.crate.secretImpactText && !current.crate.secretImpactText.includes('NONE') && !current.crate.secretImpactText.includes('NINGUNO')) {
      const cleanImpact = current.crate.secretImpactText
        .replace(/^(EFECTO DE LA CAJA:\s*|EFECTO CAJA:\s*|CRATE EFFECT:\s*|PELIGRO >50 mSv:\s*|HAZARD >50 mSv:\s*)/i, '')
        .replace(/\s*\(REGLA\s*2[^)]*\)|\s*\(RULE\s*2[^)]*\)/gi, '')
        .replace(/\s*SI AUTORIZAS|\s*IF APPROVED/gi, '')
        .trim();
      consequenceText = isEn ? `IF AUTHORIZED: ${cleanImpact}` : `SI AUTORIZAS: ${cleanImpact}`;
      if (effectiveMsv > 50 || !current.crate.radSafe) {
        consequenceBadgeClass = 'bg-rose-950/95 text-rose-200 border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.35)]';
      } else if (cleanImpact.includes('-')) {
        consequenceBadgeClass = 'bg-amber-950/95 text-amber-200 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]';
      } else {
        consequenceBadgeClass = 'bg-emerald-950/95 text-emerald-200 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]';
      }
    } else {
      consequenceText = isEn ? 'SAFE CARGO // NO PENALTY' : 'CONTENIDO SEGURO // SIN PENALIZACIÓN';
      consequenceBadgeClass = 'bg-cyan-950/95 text-cyan-200 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]';
    }

    const xraySvgMarkup = XRAY_CRATE_SVGS[current.crate.xraySvgKey] || XRAY_CRATE_SVGS.cryo_tank_bypass;
    const crateXrayEl = document.getElementById('crate-xray-zone');
    if (crateXrayEl) {
      crateXrayEl.innerHTML = `
        <div id="crate-xray-reveal" class="w-full h-full flex flex-col justify-between items-center select-none" style="gap: 8px;">
          <!-- BLOQUE 1 (ARRIBA): Nombre del Objeto + Estado -->
          <div class="w-full shrink-0 flex items-center justify-between px-2.5 py-1 rounded-md bg-zinc-950/85 border border-cyan-500/40 shadow-xs" style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 4px 10px; border-radius: 6px;">
            <div class="flex items-center gap-1.5 min-w-0 pr-2">
              <span class="w-2 h-2 rounded-full ${isHazard ? 'bg-rose-400 shadow-[0_0_6px_#f43f5e]' : 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'} shrink-0"></span>
              <span class="text-[12px] font-mono font-bold text-slate-100 uppercase truncate tracking-wide leading-tight">${cleanCrateTitle}</span>
            </div>
            <span class="shrink-0 text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded leading-none ${isHazard ? 'bg-rose-950/90 text-rose-300 border border-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 shadow-[0_0_8px_rgba(52,211,153,0.3)]'}">${statusBadgeText}</span>
          </div>

          <!-- BLOQUE 2 (CENTRO, flex: 1): Visor Gráfico de Rayos-X Grande -->
          <div class="crate-xray-viewport w-full flex-1 flex items-center justify-center relative overflow-hidden rounded-xl border border-cyan-500/35" style="width: 100%; flex: 1; display: flex; align-items: center; justify-content: center; position: relative; background: radial-gradient(circle, rgba(8, 145, 178, 0.18) 0%, rgba(2, 6, 23, 0.95) 80%); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: 10px; overflow: hidden;">
            <!-- Costillas estructurales internas sutiles -->
            <div class="absolute inset-0 pointer-events-none flex justify-between px-6 opacity-20">
              <div class="w-0.5 h-full bg-cyan-400"></div>
              <div class="w-0.5 h-full bg-cyan-400"></div>
              <div class="w-0.5 h-full bg-cyan-400"></div>
            </div>

            <!-- Marcas técnicas en las esquinas -->
            <span class="absolute top-2 left-2 text-[8px] font-mono font-bold tracking-widest text-cyan-400/70 select-none uppercase pointer-events-none">X-RAY // SCANNING</span>
            <span class="absolute top-2 right-2 text-[8px] font-mono font-bold tracking-widest text-cyan-400/70 select-none uppercase pointer-events-none">DENSITY: HIGH</span>
            <span class="absolute bottom-2 left-2 text-[8px] font-mono text-cyan-500/40 select-none pointer-events-none">[+] SENSOR-04</span>
            <span class="absolute bottom-2 right-2 text-[8px] font-mono text-cyan-500/40 select-none pointer-events-none">SPEC 99.4%</span>

            <!-- Anillo concéntrico de alerta -->
            <div class="crate-xray-alert-ring ${isHazard ? 'hazard' : 'safe'}"></div>

            <!-- Icono SVG del contenido secreto a 96x96px -->
            <div id="crate-secret-svg" class="crate-xray-main-graphic ${isHazard ? 'hazard' : 'safe'}">
              ${xraySvgMarkup}
            </div>
          </div>

          <!-- BLOQUE 3 (ABAJO): Ticker LCD Deslizante + Píldora de Impacto -->
          <div class="w-full shrink-0 flex flex-col gap-1.5" style="width: 100%;">
            <!-- Línea A: Explicación en Ticker LCD estilo estéreo (26px) -->
            <div class="w-full shrink-0 h-[26px] flex items-center px-2 bg-zinc-950/90 border border-cyan-500/40 rounded-md overflow-hidden" style="height: 26px; min-height: 26px;">
              <div class="lcd-ticker-container flex items-center">
                <div class="lcd-ticker-track font-medium text-[12.5px] text-cyan-100">
                  <span>${cleanCrateSub}</span>
                  <span class="mx-3 text-cyan-400 opacity-60">/// [X-RAY SCAN] ///</span>
                  <span>${cleanCrateSub}</span>
                  <span class="mx-3 text-cyan-400 opacity-60">/// [X-RAY SCAN] ///</span>
                </div>
              </div>
            </div>

            <!-- Línea B: Consecuencia Directa (28px) -->
            <div id="crate-secret-impact" class="w-full shrink-0 h-[28px] flex items-center justify-center px-2 rounded-lg font-mono font-bold text-[11.5px] uppercase tracking-wider text-center border shadow-md ${consequenceBadgeClass}" style="height: 28px; min-height: 28px; font-size: 11.5px; font-weight: bold; text-align: center;">
              ${consequenceText}
            </div>
          </div>
        </div>
      `;
      crateXrayEl.style.clipPath = 'inset(0px 100% 100% 0px)';
      crateXrayEl.style.webkitClipPath = 'inset(0px 100% 100% 0px)';
      crateXrayEl.classList.remove('is-scanned');
    }

    // ELIMINAR TODAS LAS CLASES DE TRANSICIÓN O SALIDA Y RESTAURAR COORDENADAS BASE EXACTAS
    const exitClasses = ['desk-slide-transition', 'slide-out-dossier', 'slide-out-crate', 'slide-out', 'opacity-0', 'hidden', 'pointer-events-none', 'slide-in-enter'];
    dossierEl.classList.remove(...exitClasses);
    crateEl.classList.remove(...exitClasses);
    stampAuthEl.classList.remove(...exitClasses);
    stampDenyEl.classList.remove(...exitClasses);

    dossierEl._tx = 0;
    dossierEl._ty = 0;
    dossierEl.style.left = '225px';
    dossierEl.style.top = '20px';
    dossierEl.style.width = '320px';
    dossierEl.style.height = '340px';
    dossierEl.style.opacity = '1';
    dossierEl.style.transform = 'translate3d(0px, 0px, 0px)';
    dossierEl.style.pointerEvents = 'auto';

    crateEl._tx = 0;
    crateEl._ty = 0;
    crateEl.style.left = '585px';
    crateEl.style.top = '30px';
    crateEl.style.width = '310px';
    crateEl.style.height = '310px';
    crateEl.style.opacity = '1';
    crateEl.style.transform = 'translate3d(0px, 0px, 0px)';
    crateEl.style.pointerEvents = 'auto';

    updateStampsDockPositions();

    if (withSlideIn) {
      void dossierEl.offsetWidth;
      dossierEl.classList.add('slide-in-enter');
      crateEl.classList.add('slide-in-enter');
      sfx.playGrab();
      setTimeout(() => {
        dossierEl.classList.remove('slide-in-enter');
        crateEl.classList.remove('slide-in-enter');
        dossierEl.style.transform = 'translate3d(0, 0, 0)';
        crateEl.style.transform = 'translate3d(0, 0, 0)';
        dossierEl.style.opacity = '1';
        crateEl.style.opacity = '1';
        dossierEl.style.pointerEvents = 'auto';
        crateEl.style.pointerEvents = 'auto';
        updateScannerCollisions();
      }, 350);
    }

    updateResourceBars();
    updateScannerCollisions();
    if (typeof prepareSolEmergencyPlan === 'function') {
      prepareSolEmergencyPlan(state.sol);
    }
  }

  function transitionToNextCase(callback) {
    if (crateScanTimer) {
      clearTimeout(crateScanTimer);
      crateScanTimer = null;
    }
    clearTimeout(emergencyScheduledTimer);
    emergencyScheduledTimer = null;
    closeEmergencyModal();
    if (state.isTransitioning) return;
    state.isTransitioning = true;
    nextShiftBtn.classList.add('hidden');
    sfx.stopScannerAudio();
    sfx.playGrab();

    dossierEl.classList.add('desk-slide-transition', 'slide-out-dossier');
    crateEl.classList.add('desk-slide-transition', 'slide-out-crate');

    setTimeout(() => {
      state.isTransitioning = false;
      callback();
    }, 330);
  }

  function applyZoneScan(targetEl, xrayZone, lensRect, scale) {
    if (!targetEl || !xrayZone || !lensRect) return false;
    const targetRect = targetEl.getBoundingClientRect();

    const overlapLeft = Math.max(lensRect.left, targetRect.left);
    const overlapTop = Math.max(lensRect.top, targetRect.top);
    const overlapRight = Math.min(lensRect.right, targetRect.right);
    const overlapBottom = Math.min(lensRect.bottom, targetRect.bottom);

    if (overlapRight > overlapLeft && overlapBottom > overlapTop) {
      const top = Math.max(0, (overlapTop - targetRect.top) / scale);
      const left = Math.max(0, (overlapLeft - targetRect.left) / scale);
      const right = Math.max(0, (targetRect.right - overlapRight) / scale);
      const bottom = Math.max(0, (targetRect.bottom - overlapBottom) / scale);
      xrayZone.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
      xrayZone.style.webkitClipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
      if (!xrayZone.classList.contains('is-scanned')) {
        xrayZone.classList.add('is-scanned');
      }
      return true;
    } else {
      xrayZone.style.clipPath = 'inset(0px 100% 100% 0px)';
      xrayZone.style.webkitClipPath = 'inset(0px 100% 100% 0px)';
      xrayZone.classList.remove('is-scanned');
      return false;
    }
  }

  function updateScannerCollisions(playAudio = false) {
    if (!scannerEl || !dossierXrayZone || !crateXrayZone) return;

    const lensEl = scannerEl ? (scannerEl.querySelector('#scanner-lens') || document.getElementById('scanner-lens') || scannerEl) : document.getElementById('scanner-lens');
    const lensRect = lensEl.getBoundingClientRect();
    const scale = window.GAME_SCALE || 1;

    const dossierHit = applyZoneScan(dossierEl, dossierXrayZone, lensRect, scale);
    const crateHit = applyZoneScan(crateEl, crateXrayZone, lensRect, scale);

    const currentCase = getCurrentCase();
    const isAnyOverlapping = dossierHit || crateHit;

    // Escaneo de la Caja Secreta por al menos 0.5s para revelar en iPad
    if (crateHit && !caseScannedCrate) {
      if (!crateScanTimer) {
        crateScanTimer = setTimeout(() => {
          if (!caseScannedCrate) {
            revealCrateDataOnDossier();
          }
          crateScanTimer = null;
        }, 500);
      }
    } else if (!crateHit && !caseScannedCrate) {
      if (crateScanTimer) {
        clearTimeout(crateScanTimer);
        crateScanTimer = null;
      }
    }

    if (playAudio || sfx.isHumming) {
      const isCrateHazard = crateHit && (!currentCase.crate.radSafe || currentCase.msv >= 15);
      const effectiveMsv = crateHit ? currentCase.msv : 2.0;
      sfx.updateScannerAudio(isAnyOverlapping, isCrateHazard, effectiveMsv);
    }

    const donkiMod = getNasaDonkiClimateModifier();
    const effectiveMsv = currentCase.msv + donkiMod.crateMsvOffset;

    const isEn = window.GAME_SETTINGS?.lang === 'en';
    let radText = 'RAD: 0.0 mSv';
    let radClass = 'text-cyan-300 font-mono text-[12px] font-bold tracking-wide';
    let modeText = isEn ? 'MODE: X-RAY / UV' : 'MODO: RAYOS-X / UV';
    let modeClass = 'text-amber-300 font-mono text-[11px] font-bold uppercase tracking-wider';

    if (crateHit && dossierHit) {
      radText = `RAD: ${effectiveMsv.toFixed(1)} mSv`;
      radClass = (effectiveMsv > 50 ? 'text-rose-400 font-black' : 'text-cyan-300') + ' font-mono text-[12px] font-bold tracking-wide';
      modeText = isEn ? 'MODE: X-RAY / UV' : 'MODO: RAYOS-X / UV';
      modeClass = 'text-amber-300 font-mono text-[11px] font-bold uppercase tracking-wider';
    } else if (crateHit) {
      radText = `RAD: ${effectiveMsv.toFixed(1)} mSv`;
      radClass = (effectiveMsv > 50 ? 'text-rose-400 font-black' : 'text-cyan-300') + ' font-mono text-[12px] font-bold tracking-wide';
      modeText = isEn ? 'MODE: X-RAY' : 'MODO: RAYOS-X';
      modeClass = 'text-cyan-300 font-mono text-[11px] font-bold uppercase tracking-wider';
    } else if (dossierHit) {
      radText = 'RAD: 0.4 mSv';
      radClass = 'text-fuchsia-300 font-mono text-[12px] font-bold tracking-wide';
      modeText = isEn ? 'MODE: UV LIGHT' : 'MODO: LUZ UV';
      modeClass = 'text-fuchsia-300 font-mono text-[11px] font-bold uppercase tracking-wider';
    }

    if (scannerRadCounter) {
      if (scannerRadCounter.textContent !== radText) scannerRadCounter.textContent = radText;
      if (scannerRadCounter.className !== radClass) scannerRadCounter.className = radClass;
    }
    if (scannerModeIndicator) {
      if (scannerModeIndicator.textContent !== modeText) scannerModeIndicator.textContent = modeText;
      if (scannerModeIndicator.className !== modeClass) scannerModeIndicator.className = modeClass;
    }
  }

  function rectsOverlap(r1, r2) {
    return !(
      r1.right < r2.left + 20 ||
      r1.left > r2.right - 20 ||
      r1.bottom < r2.top + 20 ||
      r1.top > r2.bottom - 20
    );
  }

  function rectsNear(r1, r2, marginPx = 90) {
    return !(
      r1.right < r2.left - marginPx ||
      r1.left > r2.right + marginPx ||
      r1.bottom < r2.top - marginPx ||
      r1.top > r2.bottom + marginPx
    );
  }

  function applyStampToDossier(stampType) {
    if (isEmergencyActive) return;
    if (state.stampedChoice) return;
    state.stampedChoice = stampType;

    const currentCase = getCurrentCase();
    const { delta, triggeredRules, base } = calculateTotalImpact(currentCase, stampType);

    try { sfx.playStamp(stampType); } catch (e) {}
    try { triggerScreenShake(); } catch (e) {}
    try { setAffectedResourceDots(null); } catch (e) {}
    try { showPermanentStampImpactOnBars(delta); } catch (e) {}

    const stampMark = document.getElementById('stamp-ink-mark');
    const stampBox = document.getElementById('stamp-ink-box');
    if (stampMark) stampMark.classList.remove('hidden');

    const statusBadge = document.getElementById('airlock-status-badge');

    const isEn = (window.GAME_SETTINGS?.lang === 'en');
    if (stampType === 'AUTHORIZE') {
      if (stampBox) {
        stampBox.textContent = isEn ? 'APPROVED' : 'AUTORIZADO';
        stampBox.className = 'stamp-mark-animate px-6 py-2 border-4 border-emerald-500 text-emerald-950 bg-emerald-300/95 font-black text-2xl tracking-widest uppercase rounded shadow-[0_0_25px_rgba(16,185,129,0.8)]';
      }
      if (statusBadge) {
        statusBadge.textContent = isEn ? 'APPROVED • EXECUTED' : 'AUTORIZADO • EJECUTADO';
        statusBadge.className = 'text-[0.7rem] px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-bold uppercase';
      }
    } else {
      if (stampBox) {
        stampBox.textContent = isEn ? 'DENIED' : 'DENEGADO';
        stampBox.className = 'stamp-mark-animate px-6 py-2 border-4 border-rose-500 text-rose-950 bg-rose-300/95 font-black text-2xl tracking-widest uppercase rounded shadow-[0_0_25px_rgba(244,63,94,0.8)]';
      }
      if (statusBadge) {
        statusBadge.textContent = isEn ? 'DENIED • AIRLOCK SEALED' : 'DENEGADO • ESCLUSA CERRADA';
        statusBadge.className = 'text-[0.7rem] px-2.5 py-0.5 rounded bg-rose-500/20 border border-rose-400 text-rose-300 font-bold uppercase';
      }
    }

    if (base && base.setFlags) {
      Object.assign(state.flags, base.setFlags);
    }

    state.resources.o2 = Math.max(0, Math.min(100, state.resources.o2 + (delta.o2 || 0)));
    state.resources.rad = Math.max(0, Math.min(100, state.resources.rad + (delta.rad || 0)));
    state.resources.pwr = Math.max(0, Math.min(100, state.resources.pwr + (delta.pwr || 0)));
    state.resources.food = Math.max(0, Math.min(100, state.resources.food + (delta.food || 0)));

    state.decisionHistory.push({
      sol: state.sol,
      caseNum: state.caseInSol + 1,
      caseId: currentCase.id,
      shortLabel: currentCase.shortLabel || currentCase.dossier?.applicant || currentCase.name,
      choice: stampType,
      rulesTriggered: [...(triggeredRules || [])],
      delta: { ...delta }
    });

    try { updateResourceBars(delta); } catch (e) { console.warn(e); }
    try { updateFlagsTicker(); } catch (e) { console.warn(e); }
    setTimeout(() => {
      try { updateResourceBars(null); } catch (e) { console.warn(e); }
    }, 1600);

    const ruleNote = triggeredRules && triggeredRules.length > 0 ? ` [REGLA: ${triggeredRules.join(' | ')}]` : '';
    state.solLogs.push(`• ${currentCase.name}: ${(base && base.feedback) || ''}${ruleNote}`);

    const feedbackEl = document.getElementById('decision-feedback');
    if (feedbackEl) {
      feedbackEl.textContent = `${(base && base.feedback) || ''}${ruleNote}`;
      feedbackEl.className = stampType === 'AUTHORIZE'
        ? 'font-bold text-emerald-400'
        : 'font-bold text-rose-400';
    }

    const failedResource = Object.entries(state.resources).find(([, v]) => v <= 0);
    if (failedResource) {
      clearSavedGame();
      setTimeout(() => triggerCriticalFailure(failedResource[0], triggeredRules), 650);
      return;
    }

    caseDecided = true;
    const nextBtn = document.getElementById('next-case-btn') || document.getElementById('next-shift-btn') || nextShiftBtn;
    if (nextBtn) {
      if (state.caseInSol === 0) {
        nextBtn.textContent = isEn ? 'NEXT SHIFT (CASE 2/2) >>' : 'SIGUIENTE TURNO (CASO 2/2) >>';
      } else {
        nextBtn.textContent = isEn ? `CLOSE SOL ${state.sol} (NIGHT REPORT) >>` : `CERRAR SOL ${state.sol} (REPORTE NOCTURNO) >>`;
      }
      nextBtn.classList.remove('hidden');
      nextBtn.style.display = 'flex';
      nextBtn.style.pointerEvents = 'auto';
    }

    if (typeof checkAndTriggerEmergencyAfterDecision === 'function') {
      checkAndTriggerEmergencyAfterDecision();
    }
  }

  function applyDecision(stampType) {
    const res = applyStampToDossier(stampType);
    caseDecided = true;
    const nextBtn = document.getElementById('next-case-btn') || document.getElementById('next-shift-btn') || nextShiftBtn;
    if (nextBtn) {
      const isEn = (window.GAME_SETTINGS?.lang === 'en');
      if (state.caseInSol === 0) {
        nextBtn.textContent = isEn ? 'NEXT SHIFT (CASE 2/2) >>' : 'SIGUIENTE TURNO (CASO 2/2) >>';
      } else {
        nextBtn.textContent = isEn ? `CLOSE SOL ${state.sol} (NIGHT REPORT) >>` : `CERRAR SOL ${state.sol} (REPORTE NOCTURNO) >>`;
      }
      nextBtn.classList.remove('hidden');
      nextBtn.style.display = 'flex';
      nextBtn.style.pointerEvents = 'auto';
    }

    if (typeof checkAndTriggerEmergencyAfterDecision === 'function') {
      checkAndTriggerEmergencyAfterDecision();
    }

    return res;
  }
  window.applyDecision = applyDecision;
  window.applyStampToDossier = applyStampToDossier;
  function loadCase(withSlideIn = false) {
    return renderCurrentCase(withSlideIn);
  }
  window.loadCase = loadCase;

  function openNightReport() {
    sfx.stopScannerAudio();
    sfx.playGrab();

    const isEn = (window.GAME_SETTINGS?.lang === 'en');
    const nightNotes = [];
    nightNotes.push(
      `<div class="text-cyan-300 font-bold">${isEn ? 'END OF SOL AUDIT: Resource bars reflect the exact percentages from your sealed decisions today.' : 'AUDITORÍA DE CIERRE DE SOL: Las barras reflejan exactamente los porcentajes de tus decisiones selladas hoy.'}</div>`
    );

    // Consecuencias encadenadas según decisiones tomadas en este Sol
    const authorizedDustThisSol = state.decisionHistory.some((d) => d.sol === state.sol && d.caseId === 'SOL2-C1' && d.choice === 'AUTHORIZE');
    if (authorizedDustThisSol) {
      nightNotes.push(
        `<div class="text-rose-300 font-bold bg-rose-950/60 border border-rose-500/50 p-1.5 rounded">${isEn ? '[CHAINED ALERT] The lunar dust you let in today has corroded the habitat filters. Critical clogging expected in upcoming Sols.' : '[ALERTA ENCADENADA] El polvo lunar que dejaste entrar hoy ha corroído los filtros de la base. Se prevé una obstrucción crítica en los próximos Soles.'}</div>`
      );
    } else if (state.flags.lunar_dust_contamination && state.sol < state.maxSols) {
      nightNotes.push(
        `<div class="text-amber-300 font-bold">${isEn ? '[ENGINEERING NOTICE] Filters continue accumulating lunar dust crystals threatening ventilation.' : '[AVISO DE INGENIERÍA] Los filtros continúan acumulando cristales de polvo lunar que amenazan la ventilación.'}</div>`
      );
    }

    const rossiDecision = state.decisionHistory.find((d) => d.sol === state.sol && d.caseId === 'SOL3-C1');
    if (rossiDecision) {
      if (rossiDecision.choice === 'AUTHORIZE') {
        nightNotes.push(
          `<div class="text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/50 p-1.5 rounded">${isEn ? '[CHAINED OUTCOME] Eng. Rossi whom you rescued during the storm repaired the solar relay (+15% Power already applied).' : '[CONSECUENCIA ENCADENADA] El Ing. Rossi que salvaste durante la tormenta reparó el relé solar (+15% Energía ya aplicado al sellar).'}</div>`
        );
      } else {
        nightNotes.push(
          `<div class="text-rose-300 font-bold bg-rose-950/60 border border-rose-500/50 p-1.5 rounded">${isEn ? '[CHAINED OUTCOME] Without the rescued engineer, the exterior dish remained misaligned (-15% Power already applied).' : '[CONSECUENCIA ENCADENADA] Sin el ingeniero rescatado, la antena exterior quedó descalibrada (-15% Energía ya aplicado al sellar).'}</div>`
        );
      }
    }

    const authorizedKiloThisSol = state.decisionHistory.some((d) => d.sol === state.sol && d.caseId === 'SOL5-C1' && d.choice === 'AUTHORIZE');
    if (authorizedKiloThisSol) {
      nightNotes.push(
        `<div class="text-rose-300 font-bold bg-rose-950/60 border border-rose-500/50 p-1.5 rounded">${isEn ? '[CHAINED ALERT] The Kilopower reactor admitted today has thermal sodium leaks that may trigger a critical overload in upcoming Sols.' : '[ALERTA ENCADENADA] El reactor Kilopower admitido hoy presenta fugas de sodio térmico que podrían generar una sobrecarga crítica en los próximos Soles.'}</div>`
      );
    }

    if (state.lastIncident && state.lastIncident.sol === state.sol) {
      nightNotes.push(
        `<div class="text-rose-300 font-bold bg-rose-950/70 border-2 border-rose-500/60 p-2.5 rounded-lg flex items-center gap-2.5 shadow-[0_0_15px_rgba(244,63,94,0.4)]">
          <svg class="w-5 h-5 text-rose-500 shrink-0 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <div>
            <div class="uppercase tracking-wider font-scifi font-black text-[0.75rem] text-rose-400">${isEn ? `DAMAGE SUSTAINED FROM EMERGENCY FAILURE (SOL ${state.sol})` : `DAÑOS SUFRIDOS POR FALLA DE EMERGENCIA (SOL ${state.sol})`}</div>
            <div class="text-[0.7rem] text-rose-200">${state.lastIncident.title}: ${isEn ? `Loss of -${state.lastIncident.penalty}% in ${state.lastIncident.resourceName}.` : `Pérdida de -${state.lastIncident.penalty}% en ${state.lastIncident.resourceName}.`}</div>
          </div>
        </div>`
      );
    }

    state.solLogs.forEach((log) => {
      nightNotes.push(`<div class="text-zinc-300 text-[0.7rem]">${log}</div>`);
    });

    updateResourceBars();
    renderNightCctvGrid();

    document.getElementById('night-report-title').textContent = isEn
      ? `NIGHT REPORT — CLOSING SOL ${state.sol} / ${state.maxSols}`
      : `REPORTE NOCTURNO — CIERRE DEL SOL ${state.sol} / ${state.maxSols}`;
    document.getElementById('night-report-logs').innerHTML = nightNotes.join('');

    document.getElementById('night-val-o2').textContent = `${state.resources.o2}%`;
    document.getElementById('night-val-rad').textContent = `${state.resources.rad}%`;
    document.getElementById('night-val-pwr').textContent = `${state.resources.pwr}%`;
    document.getElementById('night-val-food').textContent = `${state.resources.food}%`;

    const failedResource = Object.entries(state.resources).find(([, v]) => v <= 0);
    if (failedResource) {
      clearSavedGame();
      nightReportModal.classList.add('hidden');
      triggerCriticalFailure(failedResource[0], []);
      return;
    }

    if (state.sol >= state.maxSols) {
      nextSolBtn.textContent = isEn
        ? `VIEW FINAL NASA EVALUATION (SOL ${state.maxSols} COMPLETED) >>`
        : `VER EVALUACIÓN FINAL DE LA NASA (SOL ${state.maxSols} COMPLETADO) >>`;
    } else {
      nextSolBtn.textContent = isEn
        ? `START SOL ${state.sol + 1} (AUTOSAVE) >>`
        : `INICIAR SOL ${state.sol + 1} (AUTOGUARDAR) >>`;
    }

    nightReportModal.classList.remove('hidden');
  }

  const CASE_SHORT_LABEL_MAP_EN = {
    'Lámparas UV Invernadero': 'Greenhouse UV Lamps',
    'Tanque de Oxígeno': 'Oxygen Tank Refill',
    'Rover Hielo Shackleton': 'Shackleton Ice Rover',
    'Dron Baterías 64.5 mSv': 'Battery Drone 64.5 mSv',
    'Rescate Ing. Rossi (Tormenta)': 'Rescue Eng. Rossi (Storm)',
    'Calefactores Biodomo': 'Biodome Heaters',
    'Atasco Polvo Lunar': 'Lunar Dust Clog',
    'Electrólisis de Oxígeno': 'Oxygen Electrolysis',
    'Algas Espirulina 58 mSv': 'Spirulina Algae 58 mSv',
    'Reactor Kilopower': 'Kilopower Reactor',
    'Purificación Agua UV': 'UV Water Purification',
    'Cápsula Médica (Tormenta)': 'Medical Capsule (Storm)',
    'Fuga Reactor': 'Reactor Leak',
    'Refuerzo Bobinas Escudo': 'Shield Coil Reinforcement',
    'Nave Relevo Orión-IX': 'Relay Craft Orion-IX',
    'Auditoría Final NASA': 'NASA Final Audit'
  };

  const CASE_SHORT_LABEL_MAP_ES = {
    'Greenhouse UV Lamps': 'Lámparas UV Invernadero',
    'Oxygen Tank Refill': 'Tanque de Oxígeno',
    'Shackleton Ice Rover': 'Rover Hielo Shackleton',
    'Battery Drone 64.5 mSv': 'Dron Baterías 64.5 mSv',
    'Rescue Eng. Rossi (Storm)': 'Rescate Ing. Rossi (Tormenta)',
    'Biodome Heaters': 'Calefactores Biodomo',
    'Lunar Dust Clog': 'Atasco Polvo Lunar',
    'Oxygen Electrolysis': 'Electrólisis de Oxígeno',
    'Spirulina Algae 58 mSv': 'Algas Espirulina 58 mSv',
    'Kilopower Reactor': 'Reactor Kilopower',
    'UV Water Purification': 'Purificación Agua UV',
    'Medical Capsule (Storm)': 'Cápsula Médica (Tormenta)',
    'Reactor Leak': 'Fuga Reactor',
    'Shield Coil Reinforcement': 'Refuerzo Bobinas Escudo',
    'Relay Craft Orion-IX': 'Nave Relevo Orión-IX',
    'NASA Final Audit': 'Auditoría Final NASA'
  };

  let currentDebriefState = null;

  function renderDebriefTimeline() {
    const container = document.getElementById('debrief-timeline');
    if (!container) return;
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');

    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${state.maxSols}, minmax(0, 1fr))`;
    container.className = 'grid gap-1.5';

    const titleEl = document.getElementById('debrief-timeline-title');
    if (titleEl) {
      titleEl.textContent = isEn
        ? `CAUSE-EFFECT TIMELINE (SEALED DECISIONS FROM SOL 1 TO SOL ${state.maxSols}):`
        : `LÍNEA DE TIEMPO CAUSA-EFECTO (DECISIONES SELLADAS DEL SOL 1 AL SOL ${state.maxSols}):`;
    }

    const columnsHtml = [];
    for (let s = 1; s <= state.maxSols; s++) {
      const entries = state.decisionHistory.filter((d) => d.sol === s);
      const itemsHtml = entries.length > 0
        ? entries
            .map((e) => {
              const isAuth = e.choice === 'AUTHORIZE';
              const badgeCls = isAuth
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                : 'bg-rose-950 border-rose-500 text-rose-300';
              const ruleWarn = e.rulesTriggered && e.rulesTriggered.length > 0 ? (isEn ? '[RULE]' : '[REGLA]') : '';
              const authText = isAuth ? (isEn ? 'APPROVED' : 'AUTORIZADO') : (isEn ? 'DENIED' : 'DENEGADO');
              const displayLabel = isEn
                ? (CASE_SHORT_LABEL_MAP_EN[e.shortLabel] || e.shortLabel)
                : (CASE_SHORT_LABEL_MAP_ES[e.shortLabel] || e.shortLabel);
              return `
                <div class="border rounded px-1.5 py-1 ${badgeCls} text-[0.6rem] leading-tight">
                  <div class="font-black flex items-center justify-between">
                    <span>C${e.caseNum}: ${authText}</span>
                    <span>${ruleWarn}</span>
                  </div>
                  <div class="text-zinc-200 mt-0.5" title="${displayLabel}">${displayLabel}</div>
                </div>
              `;
            })
            .join('')
        : `<div class="text-[0.6rem] text-zinc-600 italic py-2 text-center">${isEn ? 'Not reached' : 'No alcanzado'}</div>`;

      columnsHtml.push(`
        <div class="bg-zinc-950/90 border border-zinc-700 rounded p-1.5 flex flex-col gap-1">
          <div class="text-[0.65rem] font-black text-amber-400 border-b border-zinc-800 pb-0.5 text-center">
            SOL ${s}
          </div>
          ${itemsHtml}
        </div>
      `);
    }

    container.innerHTML = columnsHtml.join('');
  }

  function findEducationalCause(resourceKey, extraRules = []) {
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const history = state.decisionHistory;
    const resNamesEs = { o2: 'Oxígeno (Soporte Vital)', rad: 'Escudo de Radiación', pwr: 'Energía', food: 'Producción de Comida' };
    const resNamesEn = { o2: 'Oxygen (Life Support)', rad: 'Radiation Shielding', pwr: 'Power', food: 'Food Production' };
    const resLabel = isEn ? (resNamesEn[resourceKey] || resourceKey) : (resNamesEs[resourceKey] || resourceKey);

    const lastDecision = history.length > 0 ? history[history.length - 1] : null;
    if (lastDecision) {
      const dLabel = isEn
        ? (CASE_SHORT_LABEL_MAP_EN[lastDecision.shortLabel] || lastDecision.shortLabel)
        : (CASE_SHORT_LABEL_MAP_ES[lastDecision.shortLabel] || lastDecision.shortLabel);
      const actionWord = lastDecision.choice === 'AUTHORIZE'
        ? (isEn ? 'approving' : 'autorizar')
        : (isEn ? 'denying' : 'denegar');
      return isEn
        ? `ROOT CAUSE: ${resLabel} reached 0% due to the cumulative resource impacts of your decisions (final trigger: ${actionWord} "${dLabel}" on Sol ${lastDecision.sol}).`
        : `CAUSA RAÍZ: ${resLabel} llegó a 0% por el impacto acumulado de las decisiones tomadas (detonante final: ${actionWord} "${dLabel}" en el Sol ${lastDecision.sol}).`;
    }

    return isEn
      ? `ROOT CAUSE: ${resLabel} dropped to 0% due to the decisions made during the mission.`
      : `CAUSA RAÍZ: ${resLabel} cayó a 0% debido a las decisiones tomadas durante la misión.`;
  }

  function showNasaDebriefing(outcomeType, failedResourceKey = null, extraRules = []) {
    currentDebriefState = { outcomeType, failedResourceKey, extraRules };
    sfx.stopScannerAudio();
    sfx.updateLowResourceAlarm(false);
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');

    const modal = document.getElementById('mission-modal');
    const box = document.getElementById('mission-modal-box');
    const badge = document.getElementById('mission-modal-badge');
    const titleEl = document.getElementById('mission-modal-title');
    const descEl = document.getElementById('mission-modal-desc');
    const causeEl = document.getElementById('mission-modal-cause');

    document.getElementById('debrief-val-o2').textContent = `${state.resources.o2}%`;
    document.getElementById('debrief-val-rad').textContent = `${state.resources.rad}%`;
    document.getElementById('debrief-val-pwr').textContent = `${state.resources.pwr}%`;
    document.getElementById('debrief-val-food').textContent = `${state.resources.food}%`;

    renderDebriefTimeline();

    if (outcomeType === 'MASTER_ENGINEER') {
      box.className = 'max-w-4xl w-full bg-zinc-900 border-4 border-emerald-400 rounded-xl p-5 shadow-[0_0_50px_rgba(16,185,129,0.35)] space-y-3.5 relative overflow-hidden';
      badge.className = 'px-3 py-1 text-xs font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-400 rounded';
      badge.textContent = isEn ? 'ENDING A // ARTEMIS MASTER ENGINEER' : 'FINAL A // INGENIERO MAESTRO ARTEMIS';
      titleEl.textContent = isEn ? 'ARTEMIS MASTER ENGINEER' : 'INGENIERO MAESTRO ARTEMIS';
      descEl.textContent = isEn
        ? `Space Engineering Excellence! You completed all ${state.maxSols} lunar Sols keeping all 4 vital systems above 50%. You mastered the balance between Oxygen, Shield, Power, and Food.`
        : `¡Excelencia en Ingeniería Espacial! Completaste los ${state.maxSols} Soles lunares manteniendo los 4 pilares vitales por encima del 50%. Dominaste el equilibrio entre Oxígeno, Escudo, Energía y Comida.`;
      causeEl.textContent = isEn
        ? 'NASA EVALUATION: You inspected the tablet and briefcase with the UV/X-Ray scanner and kept all 4 vital bars balanced above 50%.'
        : 'EVALUACIÓN NASA: Inspeccionaste la tablet y el maletín con el escáner UV/Rayos-X y mantuviste las 4 barras vitales por encima del 50%.';
      document.getElementById('debrief-sol-reached').textContent = isEn
        ? `RECORD: ${state.maxSols} / ${state.maxSols} SOLS COMPLETED (OPTIMAL)`
        : `REGISTRO: ${state.maxSols} / ${state.maxSols} SOLES COMPLETADOS (ÓPTIMO)`;
    } else if (outcomeType === 'SURVIVAL_BY_SACRIFICE') {
      box.className = 'max-w-4xl w-full bg-zinc-900 border-4 border-amber-400 rounded-xl p-5 shadow-[0_0_50px_rgba(251,191,36,0.3)] space-y-3.5 relative overflow-hidden';
      badge.className = 'px-3 py-1 text-xs font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-400 rounded';
      badge.textContent = isEn ? 'ENDING B // SURVIVAL BY SACRIFICE' : 'FINAL B // SUPERVIVENCIA POR SACRIFICIO';
      titleEl.textContent = isEn ? 'SURVIVAL BY SACRIFICE' : 'SUPERVIVENCIA POR SACRIFICIO';
      descEl.textContent = isEn
        ? `The lunar outpost survived until the Sol ${state.maxSols} relief crew arrived on the edge, but with critical systems (1%–50%) or after sacrificing key scientific objectives.`
        : `La base lunar sobrevivió hasta el relevo del Sol ${state.maxSols} al límite, pero con sistemas en estado crítico (1%–50%) o habiendo sacrificado objetivos científicos y misiones clave.`;
      causeEl.textContent = isEn
        ? `NASA EVALUATION: Deep space survival requires difficult sacrifices. To earn the Artemis Master Engineer rank, aim to finish with all 4 resources > 50% at Sol ${state.maxSols}.`
        : `EVALUACIÓN NASA: En el espacio profundo sobrevivir exige sacrificios duros. Para alcanzar el grado de Ingeniero Maestro Artemis, intenta mantener los 4 recursos > 50% al final del Sol ${state.maxSols}.`;
      document.getElementById('debrief-sol-reached').textContent = isEn
        ? `RECORD: ${state.maxSols} / ${state.maxSols} SOLS (BORDERLINE SURVIVAL)`
        : `REGISTRO: ${state.maxSols} / ${state.maxSols} SOLES (SUPERVIVENCIA LÍMITE)`;
    } else if (outcomeType === 'RADIATION_CONTAINMENT_BREACH') {
      box.className = 'max-w-4xl w-full bg-zinc-900 border-4 border-purple-500 rounded-xl p-5 shadow-[0_0_50px_rgba(168,85,247,0.35)] space-y-3.5 relative overflow-hidden';
      badge.className = 'px-3 py-1 text-xs font-black uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-400 rounded';
      badge.textContent = isEn ? 'ENDING C // RADIATION & CONTAINMENT BREACH' : 'FINAL C // BRECHA DE RADIACIÓN Y CONTENCIÓN';
      titleEl.textContent = isEn ? 'RADIATION & CONTAINMENT BREACH' : 'BRECHA DE RADIACIÓN Y CONTENCIÓN';
      descEl.textContent = isEn
        ? `Collapse on Sol ${state.sol}: ${failedResourceKey === 'o2' ? 'Oxygen' : 'Shield'} dropped to 0%. The crew had to be evacuated urgently to the orbital module.`
        : `Colapso en el Sol ${state.sol}: ${failedResourceKey === 'o2' ? 'Oxígeno' : 'Escudo'} cayó al 0%. La tripulación tuvo que ser evacuada de urgencia al módulo orbital.`;
      causeEl.textContent = findEducationalCause(failedResourceKey, extraRules);
      document.getElementById('debrief-sol-reached').textContent = isEn
        ? `COLLAPSE ON SOL ${state.sol} / ${state.maxSols}`
        : `CAÍDA EN SOL ${state.sol} / ${state.maxSols}`;
    } else {
      box.className = 'max-w-4xl w-full bg-zinc-900 border-4 border-rose-500 rounded-xl p-5 shadow-[0_0_50px_rgba(244,63,94,0.35)] space-y-3.5 relative overflow-hidden';
      badge.className = 'px-3 py-1 text-xs font-black uppercase tracking-widest bg-rose-500/20 text-rose-300 border border-rose-400 rounded';
      badge.textContent = isEn ? 'ENDING D // BLACKOUT & FOOD COLLAPSE' : 'FINAL D // APAGÓN Y COLAPSO ALIMENTARIO';
      titleEl.textContent = isEn ? 'BLACKOUT & FOOD COLLAPSE' : 'APAGÓN Y COLAPSO ALIMENTARIO';
      descEl.textContent = isEn
        ? `Collapse on Sol ${state.sol}: ${failedResourceKey === 'pwr' ? 'Power' : 'Food'} dropped to 0%, making lunar outpost operations unsustainable.`
        : `Colapso en el Sol ${state.sol}: ${failedResourceKey === 'pwr' ? 'Energía' : 'Comida'} llegó al 0%, haciendo imposible sostener las operaciones del puesto lunar.`;
      causeEl.textContent = findEducationalCause(failedResourceKey, extraRules);
      document.getElementById('debrief-sol-reached').textContent = isEn
        ? `COLLAPSE ON SOL ${state.sol} / ${state.maxSols}`
        : `CAÍDA EN SOL ${state.sol} / ${state.maxSols}`;
    }

    modal.classList.remove('hidden');
  }

  function triggerCriticalFailure(resourceKey, extraRules = []) {
    sfx.playCriticalCollapse();
    triggerScreenShake();

    if (resourceKey === 'o2' || resourceKey === 'rad') {
      showNasaDebriefing('RADIATION_CONTAINMENT_BREACH', resourceKey, extraRules);
    } else {
      showNasaDebriefing('BLACKOUT_AND_STARVATION', resourceKey, extraRules);
    }
  }

  function triggerCampaignVictory() {
    clearSavedGame();
    sfx.playStamp('AUTHORIZE');

    const { o2, rad, pwr, food } = state.resources;
    const allAbove50 = o2 > 50 && rad > 50 && pwr > 50 && food > 50;
    const rejectedKeyMission = state.flags.engineer_saved === false;

    if (allAbove50 && !rejectedKeyMission) {
      showNasaDebriefing('MASTER_ENGINEER');
    } else {
      showNasaDebriefing('SURVIVAL_BY_SACRIFICE');
    }
  }

  // --- INDICADORES DE RECURSOS EN JUEGO AL PASAR EL CURSOR SOBRE SELLOS O MANIFIESTO ---
  dossierEl.addEventListener('pointerenter', () => {
    if (!state.stampedChoice) {
      setAffectedResourceDots(getStakesForCurrentCase(null));
    }
  });

  dossierEl.addEventListener('pointerleave', () => {
    if (!state.stampedChoice) {
      setAffectedResourceDots(null);
    }
  });

  // Cero previews al pasar el cursor sobre los sellos
  [stampAuthEl, stampDenyEl].forEach((stampEl) => {
    stampEl.addEventListener('pointerenter', () => {});
    stampEl.addEventListener('pointerleave', () => {});
  });

  function toggleManualBook(forceState = null) {
    if (!manualDrawerPanel) return;
    const isCurrentlyOpen = !manualDrawerPanel.classList.contains('hidden');
    const shouldOpen = forceState !== null ? forceState : !isCurrentlyOpen;

    if (shouldOpen) {
      manualDrawerPanel.classList.remove('hidden');
      state.topZIndex += 1;
      manualDrawerPanel.style.zIndex = state.topZIndex;
    } else {
      manualDrawerPanel.classList.add('hidden');
    }
    sfx.playGrab();
  }

  if (manualCloseBtn) {
    manualCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleManualBook(false);
    });
  }

  // --- SISTEMA DRAG & DROP GPU CON translate3d() (CERO REFLOW, CERO DOM READS EN ARRASTRE) ---
  let activeDragItem = null;
  let dragStartClientX = 0;
  let dragStartClientY = 0;
  let dragStartTx = 0;
  let dragStartTy = 0;
  let isHoverAuth = false;
  let isHoverDeny = false;
  let globalDragListenersBound = false;
  let dragRafPending = false;
  let latestPointerEvent = null;

  function onGlobalDeskPointerMove(e) {
    if (!activeDragItem) return;
    latestPointerEvent = e;
    if (!dragRafPending) {
      dragRafPending = true;
      requestAnimationFrame(() => {
        dragRafPending = false;
        if (!activeDragItem || !latestPointerEvent) return;
        const ev = latestPointerEvent;
        const el = activeDragItem;
        const scale = window.GAME_SCALE || 1;
        const dx = (ev.clientX - dragStartClientX) / scale;
        const dy = (ev.clientY - dragStartClientY) / scale;

        const baseLeft = el._baseLeft !== undefined ? el._baseLeft : 0;
        const baseTop = el._baseTop !== undefined ? el._baseTop : 0;
        const width = el._width || 280;
        const height = el._height || 80;

        const minTx = -baseLeft;
        const maxTx = 1600 - (baseLeft + width);
        const minTy = -baseTop;
        const maxTy = 450 - (baseTop + height);

        el._tx = Math.max(minTx, Math.min(maxTx, dragStartTx + dx));
        el._ty = Math.max(minTy, Math.min(maxTy, dragStartTy + dy));
        el.style.transform = `translate3d(${el._tx}px, ${el._ty}px, 0)`;

        const isScanner = (el === scannerEl);
        const isDossier = (el === dossierEl);
        const isCrate = (el === crateEl);
        const isStamp = el.classList.contains('stamp-tool');

        if (isScanner || isDossier || isCrate) {
          updateScannerCollisions(true);
        } else if (isStamp && !state.stampedChoice) {
          const stampType = el.getAttribute('data-stamp');
          const stampBox = {
            left: baseLeft + el._tx,
            top: baseTop + el._ty,
            right: baseLeft + el._tx + width,
            bottom: baseTop + el._ty + height
          };
          const dossierBox = {
            left: (dossierEl._baseLeft !== undefined ? dossierEl._baseLeft : 225) + (dossierEl._tx || 0),
            top: (dossierEl._baseTop !== undefined ? dossierEl._baseTop : 20) + (dossierEl._ty || 0),
            right: ((dossierEl._baseLeft !== undefined ? dossierEl._baseLeft : 225) + (dossierEl._tx || 0)) + (dossierEl._width || 320),
            bottom: ((dossierEl._baseTop !== undefined ? dossierEl._baseTop : 20) + (dossierEl._ty || 0)) + (dossierEl._height || 340)
          };
          const overDossier = !(
            stampBox.right < dossierBox.left + 20 ||
            stampBox.left > dossierBox.right - 20 ||
            stampBox.bottom < dossierBox.top + 20 ||
            stampBox.top > dossierBox.bottom - 20
          );
          const wantAuth = overDossier && stampType === 'AUTHORIZE';
          const wantDeny = overDossier && stampType === 'DENY';
          if (isHoverAuth !== wantAuth) {
            isHoverAuth = wantAuth;
            dossierEl.classList.toggle('stamp-hover-authorize', wantAuth);
          }
          if (isHoverDeny !== wantDeny) {
            isHoverDeny = wantDeny;
            dossierEl.classList.toggle('stamp-hover-deny', wantDeny);
          }
        }
      });
    }
  }

  function onGlobalDeskPointerUp(e) {
    dragRafPending = false;
    latestPointerEvent = null;
    if (!activeDragItem) return;
    const el = activeDragItem;
    activeDragItem = null;

    el.classList.remove('is-dragging');
    if (e && e.pointerId && el.releasePointerCapture) {
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    if (isHoverAuth || isHoverDeny) {
      isHoverAuth = false;
      isHoverDeny = false;
      dossierEl.classList.remove('stamp-hover-authorize', 'stamp-hover-deny');
    }

    const isStamp = el.classList.contains('stamp-tool');
    if (isStamp) {
      const stampType = el.getAttribute('data-stamp');
      const baseLeft = el._baseLeft !== undefined ? el._baseLeft : 1280;
      const baseTop = el._baseTop !== undefined ? el._baseTop : (stampType === 'AUTHORIZE' ? 35 : 140);
      const width = el._width || 270;
      const height = el._height || 86;

      const stampBox = {
        left: baseLeft + el._tx,
        top: baseTop + el._ty,
        right: baseLeft + el._tx + width,
        bottom: baseTop + el._ty + height
      };
      const dossierBox = {
        left: (dossierEl._baseLeft !== undefined ? dossierEl._baseLeft : 225) + (dossierEl._tx || 0),
        top: (dossierEl._baseTop !== undefined ? dossierEl._baseTop : 20) + (dossierEl._ty || 0),
        right: ((dossierEl._baseLeft !== undefined ? dossierEl._baseLeft : 225) + (dossierEl._tx || 0)) + (dossierEl._width || 320),
        bottom: ((dossierEl._baseTop !== undefined ? dossierEl._baseTop : 20) + (dossierEl._ty || 0)) + (dossierEl._height || 340)
      };
      const overDossier = !(
        stampBox.right < dossierBox.left + 20 ||
        stampBox.left > dossierBox.right - 20 ||
        stampBox.bottom < dossierBox.top + 20 ||
        stampBox.top > dossierBox.bottom - 20
      );

      if (overDossier && !state.stampedChoice) {
        try {
          applyDecision(stampType);
        } catch (err) {
          console.error('Error aplicando decisión con el sello:', err);
        }
      }

      // Retorno elástico acelerado por GPU al muelle (translate3d)
      el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
      el._tx = 0;
      el._ty = 0;
      el.style.transform = 'translate3d(0, 0, 0)';
      setTimeout(() => {
        if (activeDragItem !== el) {
          el.style.transition = '';
        }
      }, 260);
    }

    updateScannerCollisions(false);
  }

  function initGlobalDragListenersOnce() {
    if (globalDragListenersBound) return;
    globalDragListenersBound = true;
    window.addEventListener('pointermove', onGlobalDeskPointerMove, { passive: false });
    window.addEventListener('pointerup', onGlobalDeskPointerUp);
    window.addEventListener('pointercancel', onGlobalDeskPointerUp);
  }

  function makeDraggable(el) {
    if (!el) return;
    initGlobalDragListenersOnce();
    el.classList.add('draggable-item');
    el._tx = el._tx || 0;
    el._ty = el._ty || 0;

    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (state.isTransitioning) return;
      if (e.target && e.target.closest('#protocol-manual-close')) return;

      e.preventDefault();
      activeDragItem = el;
      dragStartClientX = e.clientX;
      dragStartClientY = e.clientY;
      dragStartTx = el._tx || 0;
      dragStartTy = el._ty || 0;

      state.topZIndex += 1;
      el.style.zIndex = state.topZIndex;
      el.classList.add('is-dragging');
      el.style.transition = 'none';

      sfx.playGrab();

      if (el.setPointerCapture && e.pointerId) {
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
      }
    });
  }

  const handleNextShiftClick = () => {
    if (!caseDecided) return;

    // Respaldo garantizado: si estaba programado minijuego en este Sol y por cualquier motivo aún no se disparó
    if (typeof prepareSolEmergencyPlan === 'function' && currentSolEmergencyPlan.sol !== state.sol) {
      prepareSolEmergencyPlan(state.sol);
    }
    if (currentSolEmergencyPlan.shouldTrigger && !minigameTriggeredThisSol) {
      minigameTriggeredThisSol = true;
      if (typeof triggerRandomEmergencyMinigame === 'function') {
        triggerRandomEmergencyMinigame();
      } else if (typeof triggerEmergency === 'function') {
        triggerEmergency();
      }
      return;
    }

    caseDecided = false;
    const nextBtn = document.getElementById('next-case-btn') || document.getElementById('next-shift-btn') || nextShiftBtn;
    if (nextBtn) {
      nextBtn.classList.add('hidden');
      nextBtn.style.display = 'none';
      nextBtn.style.pointerEvents = 'none';
    }

    if (state.caseInSol === 0) {
      transitionToNextCase(() => {
        state.caseInSol = 1;
        saveGameToStorage();
        renderCurrentCase(true);
      });
    } else {
      transitionToNextCase(() => {
        openNightReport();
      });
    }
  };

  if (nextShiftBtn) {
    nextShiftBtn.addEventListener('click', handleNextShiftClick);
  }
  const nextCaseBtnEl = document.getElementById('next-case-btn');
  if (nextCaseBtnEl && nextCaseBtnEl !== nextShiftBtn) {
    nextCaseBtnEl.addEventListener('click', handleNextShiftClick);
  }

  const donkiCard = document.getElementById('nasa-donki-card');
  const neowsCard = document.getElementById('nasa-neows-card');
  if (donkiCard) {
    donkiCard.addEventListener('click', () => {
      openNasaTelemetryModal();
    });
  }
  if (neowsCard) {
    neowsCard.addEventListener('click', () => {
      openNasaTelemetryModal();
    });
  }

  if (nasaTelemetryBtn) {
    nasaTelemetryBtn.addEventListener('click', () => {
      openNasaTelemetryModal();
    });
  }

  if (nasaTelemetryCloseBtn) {
    nasaTelemetryCloseBtn.addEventListener('click', () => {
      closeNasaTelemetryModal();
    });
  }

  if (nasaTelemetryModal) {
    nasaTelemetryModal.addEventListener('click', (e) => {
      if (e.target === nasaTelemetryModal) {
        closeNasaTelemetryModal();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nasaTelemetryModal && !nasaTelemetryModal.classList.contains('hidden')) {
      closeNasaTelemetryModal();
    }
  });

  nextSolBtn.addEventListener('click', () => {
    nightReportModal.classList.add('hidden');
    sfx.playGrab();

    if (state.sol >= state.maxSols) {
      triggerCampaignVictory();
      return;
    }

    state.sol += 1;
    state.caseInSol = 0;
    state.solLogs = [];
    minigameTriggeredThisSol = false;
    prepareSolEmergencyPlan(state.sol, true);

    // Aplicar Modificador Climático Real NASA DONKI en Sol siguiente
    applyNasaDonkiSolStartBonus();
    saveGameToStorage();
    renderCurrentCase(true);
  });

  // =======================================================================
  // 0.1 SPLASH SCREEN "MOON" (2.4 SEGUNDOS AUTOMÁTICOS + 0.4s FADE OUT)
  // =======================================================================
  let splashTransitioned = false;
  let splashTimer = null;

  function startTitleScreenFlow() {
    const titleScreen = document.getElementById('title-screen');
    const diffScreen = document.getElementById('difficulty-screen');
    const hangarScreen = document.getElementById('hangar-loadout-screen');

    if (hangarScreen) {
      hangarScreen.classList.add('hidden');
      hangarScreen.style.display = 'none';
      hangarScreen.style.pointerEvents = 'none';
    }

    if (diffScreen) {
      diffScreen.classList.add('hidden');
      diffScreen.style.display = 'none';
      diffScreen.style.pointerEvents = 'none';
    }

    if (titleScreen) {
      titleScreen.classList.remove('hidden');
      titleScreen.style.display = 'flex';
      titleScreen.style.opacity = '1';
      titleScreen.style.zIndex = '9999';
      titleScreen.style.pointerEvents = 'auto';
    }

    splashTransitioned = false;
    if (splashTimer) clearTimeout(splashTimer);

    // Muestra "MOON" durante exactamente 2.4 segundos (2400ms)
    splashTimer = setTimeout(() => {
      transitionSplashToDifficulty();
    }, 2400);
  }

  function transitionSplashToDifficulty() {
    if (splashTransitioned) return;
    splashTransitioned = true;
    if (splashTimer) {
      clearTimeout(splashTimer);
      splashTimer = null;
    }
    const titleScreen = document.getElementById('title-screen');
    const diffScreen = document.getElementById('difficulty-screen');
    if (titleScreen) {
      titleScreen.style.transition = 'opacity 0.4s ease-out';
      titleScreen.style.opacity = '0';
      setTimeout(() => {
        titleScreen.classList.add('hidden');
        titleScreen.style.display = 'none';
        titleScreen.style.pointerEvents = 'none';
        refreshTitleScreenSaveBanner();
        if (diffScreen) {
          diffScreen.classList.remove('hidden');
          diffScreen.style.display = 'flex';
          diffScreen.style.opacity = '1';
          diffScreen.style.pointerEvents = 'auto';
        }
      }, 400);
    } else {
      refreshTitleScreenSaveBanner();
      if (diffScreen) {
        diffScreen.classList.remove('hidden');
        diffScreen.style.display = 'flex';
        diffScreen.style.opacity = '1';
        diffScreen.style.pointerEvents = 'auto';
      }
    }
  }

  // Permitir clic o toque sobre la pantalla "MOON" para saltar de inmediato y desbloquear audio
  if (titleScreenModal) {
    titleScreenModal.addEventListener('click', () => {
      sfx.init();
      transitionSplashToDifficulty();
    });
  }

  function refreshTitleScreenSaveBanner() {
    const saved = loadGameFromStorage();
    if (saved && savedGameBanner && continueMissionBtn) {
      savedGameBanner.classList.remove('hidden');
      const diffLabel = saved.difficulty === 'cadet' ? 'CADETE' : (saved.difficulty === 'commander' ? 'COMANDANTE' : 'INGENIERO');
      const maxSols = saved.maxSols || (saved.difficulty === 'cadet' ? 3 : (saved.difficulty === 'commander' ? 5 : 4));
      if (savedGameSummary) {
        savedGameSummary.textContent = `SOL ${saved.sol} / ${maxSols} (CASO ${(saved.caseInSol || 0) + 1}) [${diffLabel}] — OXÍGENO: ${saved.resources.o2}% | ESCUDO: ${saved.resources.rad}% | ENERGÍA: ${saved.resources.pwr}% | COMIDA: ${saved.resources.food}%`;
      }
    } else {
      if (savedGameBanner) savedGameBanner.classList.add('hidden');
    }
  }

  // [ CONTINUAR MISIÓN EN CURSO ] (disponible en la pantalla de dificultad si existe autoguardado)
  if (continueMissionBtn) {
    continueMissionBtn.addEventListener('click', () => {
      sfx.init();
      sfx.playBootSequence();
      if (tutorialManager) tutorialManager.stop();
      const saved = loadGameFromStorage();
      if (saved) {
        applySavedState(saved);
      }
      closeAllPremissionScreens();
      layoutAllDeskToolsInitial();
      renderCurrentCase(true);
    });
  }

  // =======================================================================
  // 0.2 SELECCIÓN DE DIFICULTAD MODERNA Y SENCILLA PARA NIÑOS
  // =======================================================================
  contractCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      sfx.init();
      sfx.playHover();
    });
    card.addEventListener('click', () => {
      sfx.init();
      sfx.playMenuSelect();

      const diff = card.dataset.difficulty || 'engineer';
      const budget = parseInt(card.dataset.budget || '900', 10);
      const cap = parseInt(card.dataset.capacity || '9', 10);
      const sols = parseInt(card.dataset.sols || (diff === 'cadet' ? '3' : diff === 'commander' ? '5' : '4'), 10);

      state.difficulty = diff;
      state.budget = budget;
      state.cargoCapacity = cap;
      state.maxSols = sols;
      state.loadout = { o2: 0, rad: 0, pwr: 0, food: 0 };
      state.rocketCargoSlots = [];

      clearSavedGame();
      resetStateToDefault(20);
      state.maxSols = sols;
      generateMissionSchedule();

      setupHangarScreen();

      hidePremissionScreen(difficultyScreen);
      hidePremissionScreen(titleScreenModal);
      showPremissionScreen(hangarLoadoutScreen, 'flex');

      // Iniciar Secuencia 1 del Tutorial en el Hangar
      setTimeout(() => {
        startHangarTutorial();
      }, 300);
    });
  });

  // =======================================================================
  // 0.3 HANGAR DE CARGA TÁCTIL (DRAG & DROP REAL AL COHETE)
  // =======================================================================
  const podConfig = {
    o2: {
      label: 'OXÍGENO',
      class: 'pod-o2',
      svg: '<svg viewBox="0 0 16 16" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="8" r="3.5"/><circle cx="11" cy="8" r="3.5"/></svg>'
    },
    rad: {
      label: 'ESCUDO',
      class: 'pod-rad',
      svg: '<svg viewBox="0 0 16 16" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 14s5-2.5 5-6.5V3.5L8 1.5 3 3.5v4C3 11.5 8 14 8 14z"/></svg>'
    },
    pwr: {
      label: 'ENERGÍA',
      class: 'pod-pwr',
      svg: '<svg viewBox="0 0 16 16" class="w-3.5 h-3.5" fill="currentColor"><polygon points="9 1 2 9 8 9 7 15 14 7 8 7 9 1"/></svg>'
    },
    food: {
      label: 'COMIDA',
      class: 'pod-food',
      svg: '<svg viewBox="0 0 16 16" class="w-3.5 h-3.5" fill="currentColor"><path d="M8 15V8m0 0a5 5 0 0 1 5-5c0 3-2 5-5 5zm0 0a5 5 0 0 0-5-5c0 3 2 5 5 5z"/></svg>'
    }
  };

  function setupHangarScreen() {
    const isEn = window.GAME_SETTINGS?.lang === 'en';
    const diffMap = {
      cadet: {
        name: isEn ? 'CADET // $1,200M (12 SLOTS - 3 SOLS)' : 'CADETE // $1,200M (12 RANURAS - 3 SOLES)',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
      },
      engineer: {
        name: isEn ? 'ENGINEER // $900M (9 SLOTS - 4 SOLS)' : 'INGENIERO // $900M (9 RANURAS - 4 SOLES)',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/50'
      },
      commander: {
        name: isEn ? 'COMMANDER // $600M (6 SLOTS - 5 SOLS)' : 'COMANDANTE // $600M (6 RANURAS - 5 SOLES)',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/50'
      }
    };
    const cur = diffMap[state.difficulty] || diffMap.engineer;
    if (hangarContractBadge) {
      hangarContractBadge.textContent = cur.name;
      hangarContractBadge.className = `text-[0.65rem] px-2.5 py-0.5 rounded-full font-bold uppercase border ${cur.badge}`;
    }
    updateHangarUI();
  }

  function updateHangarUI(justAdded = false) {
    const isEn = window.GAME_SETTINGS?.lang === 'en';
    const totalContainers = (state.loadout.o2 || 0) + (state.loadout.rad || 0) + (state.loadout.pwr || 0) + (state.loadout.food || 0);
    const spentBudget = totalContainers * 100;
    const remainingBudget = Math.max(0, state.budget - spentBudget);
    const capacity = state.cargoCapacity || 9;

    // Métricas en la cabecera
    if (hangarBudgetDisplay) {
      hangarBudgetDisplay.textContent = `$${remainingBudget} M`;
      hangarBudgetDisplay.className = remainingBudget > 0
        ? 'text-lg md:text-xl font-black text-emerald-400 font-mono tracking-tight leading-tight'
        : 'text-lg md:text-xl font-black text-amber-400 font-mono tracking-tight leading-tight';
    }
    const hangarSummaryBudget = document.getElementById('hangar-summary-budget');
    if (hangarSummaryBudget) {
      hangarSummaryBudget.textContent = `$${remainingBudget} M`;
      hangarSummaryBudget.className = remainingBudget > 0
        ? 'text-emerald-400 font-mono font-bold'
        : 'text-amber-400 font-mono font-bold';
    }
    if (hangarCapacityDisplay) {
      hangarCapacityDisplay.textContent = `${totalContainers} / ${capacity}`;
      hangarCapacityDisplay.className = totalContainers < capacity
        ? 'text-lg md:text-xl font-black text-cyan-300 font-mono tracking-tight leading-tight'
        : 'text-lg md:text-xl font-black text-amber-300 font-mono tracking-tight leading-tight';
    }
    if (rocketSlotsBadge) {
      rocketSlotsBadge.textContent = `${totalContainers} / ${capacity}`;
    }

    // Actualizar las 4 mini-barras de resumen y contadores de estantería
    ['o2', 'rad', 'pwr', 'food'].forEach(key => {
      const count = state.loadout[key] || 0;
      const basePct = 20;
      const bonusPct = count * 15;
      const totalPct = basePct + bonusPct;

      const countEl = document.getElementById(`cargo-count-${key}`);
      if (countEl) countEl.textContent = isEn ? `${count} IN ROCKET` : `${count} EN COHETE`;

      const pctEl = document.getElementById(`preview-pct-${key}`);
      if (pctEl) pctEl.textContent = `${totalPct}%`;

      const barEl = document.getElementById(`preview-bar-${key}`);
      if (barEl) barEl.style.width = `${bonusPct}%`;

      // Desactivar visualmente si ya no se puede cargar más
      const card = document.querySelector(`.draggable-supply-card[data-resource="${key}"]`);
      if (card) {
        const cannotAfford = remainingBudget < 100;
        const isFull = totalContainers >= capacity;
        const isMax = totalPct >= 95;
        if (cannotAfford || isFull || isMax) {
          card.classList.add('disabled');
        } else {
          card.classList.remove('disabled');
        }
      }
    });

    // Rótulo inferior de estado
    if (hangarStatusMsg) {
      if (totalContainers >= capacity) {
        hangarStatusMsg.innerHTML = isEn
          ? '<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Cargo bay full (' + capacity + '/' + capacity + ' crates). Rocket ready for liftoff!'
          : '<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Bodega llena (' + capacity + '/' + capacity + ' cajas). ¡Cohete listo para despegar!';
      } else if (remainingBudget < 100) {
        hangarStatusMsg.innerHTML = isEn
          ? '<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Budget depleted. Rocket ready for liftoff!'
          : '<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Presupuesto agotado. ¡Cohete listo para despegar!';
      } else {
        hangarStatusMsg.innerHTML = isEn
          ? '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Cargo bay (' + totalContainers + '/' + capacity + ' modules loaded).'
          : '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Bodega de carga (' + totalContainers + '/' + capacity + ' módulos cargados).';
      }
    }

    // Renderizar las 4 Cámaras Transparentes de Cristal y Tuberías de Energía
    renderShipEnergyChambers(capacity, justAdded);
  }

  // Animación de vuelo de cápsula luminosa hacia la cámara correspondiente
  function triggerCapsuleFlightAnim(res, startCoords = null) {
    const chamber = document.getElementById(`chamber-box-${res}`);
    if (!chamber) return;
    const destRect = chamber.getBoundingClientRect();
    const destX = destRect.left + destRect.width / 2;
    const destY = destRect.top + destRect.height / 2;

    const sourceCard = document.querySelector(`.draggable-supply-card[data-resource="${res}"]`);
    let originX = window.innerWidth * 0.3;
    let originY = window.innerHeight * 0.5;

    if (startCoords && typeof startCoords.x === 'number') {
      originX = startCoords.x;
      originY = startCoords.y;
    } else if (sourceCard) {
      const srcRect = sourceCard.getBoundingClientRect();
      originX = srcRect.left + srcRect.width / 2;
      originY = srcRect.top + srcRect.height / 2;
    }

    const capsule = document.createElement('div');
    capsule.className = `flying-capsule-anim flying-capsule-${res}`;
    capsule.style.left = `${originX - 11}px`;
    capsule.style.top = `${originY - 11}px`;
    document.body.appendChild(capsule);

    requestAnimationFrame(() => {
      capsule.style.transform = `translate(${destX - originX}px, ${destY - originY}px) scale(0.35)`;
      capsule.style.opacity = '0.15';
    });

    setTimeout(() => {
      capsule.remove();
      chamber.classList.add('chamber-ripple-pulse');
      setTimeout(() => chamber.classList.remove('chamber-ripple-pulse'), 380);
    }, 420);
  }

  // Retirar 1 caja/módulo al hacer clic sobre una cámara de la nave
  function removeOneCargoResource(res) {
    if ((state.loadout[res] || 0) <= 0) return;
    sfx.init();
    sfx.playCargoUnlock();
    state.loadout[res] -= 1;
    const idx = state.rocketCargoSlots.lastIndexOf(res);
    if (idx !== -1) {
      state.rocketCargoSlots.splice(idx, 1);
    }
    updateHangarUI(false);
  }

  // Renderizar las 4 Cámaras Transparentes de Energía conectadas por tuberías luminosas
  function renderShipEnergyChambers(capacity, justAdded = false) {
    const isEn = window.GAME_SETTINGS?.lang === 'en';
    const totalContainers = (state.loadout.o2 || 0) + (state.loadout.rad || 0) + (state.loadout.pwr || 0) + (state.loadout.food || 0);

    if (rocketSlotsBadge) {
      rocketSlotsBadge.textContent = `${totalContainers} / ${capacity}`;
    }

    const chamberConfig = {
      food: { label: isEn ? 'FOOD' : 'COMIDA', maxBoxes: 5, unit: isEn ? 'FOOD' : 'COMIDA' },
      pwr: { label: isEn ? 'ENERGY' : 'ENERGÍA', maxBoxes: 5, unit: isEn ? 'ENERGY' : 'ENERGÍA' },
      o2: { label: isEn ? 'OXYGEN' : 'OXÍGENO', maxBoxes: 5, unit: isEn ? 'OXYGEN' : 'OXÍGENO' },
      rad: { label: isEn ? 'SHIELD' : 'ESCUDO', maxBoxes: 5, unit: isEn ? 'SHIELD' : 'ESCUDO' }
    };

    ['food', 'pwr', 'o2', 'rad'].forEach(resKey => {
      const count = state.loadout[resKey] || 0;
      const bonusPct = count * 15;
      const cfg = chamberConfig[resKey];

      const countBadge = document.getElementById(`chamber-count-${resKey}`);
      if (countBadge) countBadge.textContent = count;

      const bonusLabel = document.getElementById(`chamber-bonus-${resKey}`);
      if (bonusLabel) bonusLabel.textContent = `+${bonusPct}% ${cfg.unit}`;

      // Nivel de líquido / energía ascendente dentro de la cámara
      const liquidEl = document.getElementById(`chamber-liquid-${resKey}`);
      if (liquidEl) {
        const fillPct = Math.min(100, Math.round((count / cfg.maxBoxes) * 100));
        liquidEl.style.height = `${fillPct}%`;
      }

      // Módulos apilados en el interior de la cámara
      const stackEl = document.getElementById(`chamber-stack-${resKey}`);
      if (stackEl) {
        stackEl.innerHTML = '';
        for (let i = 0; i < count; i++) {
          const chip = document.createElement('div');
          chip.className = `chamber-module-chip chip-${resKey}`;
          chip.title = isEn ? `Module #${i + 1} of ${cfg.label} (+15%)` : `Módulo #${i + 1} de ${cfg.label} (+15%)`;
          stackEl.appendChild(chip);
        }
      }
    });

    // Intensidad y resplandor de las tuberías luminosas interconectoras
    const conduitH = document.getElementById('conduit-h');
    const conduitV = document.getElementById('conduit-v');
    const conduitCore = document.getElementById('conduit-core');
    const fillRatio = capacity > 0 ? (totalContainers / capacity) : 0;
    const glowLevel = Math.min(1, 0.35 + fillRatio * 0.65);

    if (conduitH) conduitH.style.opacity = glowLevel;
    if (conduitV) conduitV.style.opacity = glowLevel;
    if (conduitCore) conduitCore.style.opacity = glowLevel;
  }

  function tryAddCargoResource(res, startCoords = null) {
    const totalContainers = (state.loadout.o2 || 0) + (state.loadout.rad || 0) + (state.loadout.pwr || 0) + (state.loadout.food || 0);
    const remainingBudget = state.budget - (totalContainers * 100);
    const currentPct = 20 + ((state.loadout[res] || 0) * 15);

    if (totalContainers < state.cargoCapacity && remainingBudget >= 100 && currentPct + 15 <= 95) {
      sfx.init();
      sfx.playCargoLock();
      state.loadout[res] = (state.loadout[res] || 0) + 1;
      state.rocketCargoSlots.push(res);
      triggerCapsuleFlightAnim(res, startCoords);
      updateHangarUI(true);
      return true;
    }
    return false;
  }

  function removeCargoSlot(slotIdx) {
    if (slotIdx >= 0 && slotIdx < state.rocketCargoSlots.length) {
      const res = state.rocketCargoSlots[slotIdx];
      removeOneCargoResource(res);
    }
  }

  // Interacción al hacer clic en cualquiera de las 4 cámaras para sacar módulos
  document.querySelectorAll('.chamber-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const res = card.dataset.resource;
      if (res && (state.loadout[res] || 0) > 0) {
        removeOneCargoResource(res);
      }
    });
  });

  // =======================================================================
  // SISTEMA DRAG & DROP TÁCTIL (POINTERDOWN / MOVE / UP)
  // =======================================================================
  let activeDragResource = null;
  let dragGhostEl = null;
  let dragStartPos = { x: 0, y: 0 };
  let isDragging = false;

  function isPointerOverRocketZone(clientX, clientY) {
    const zone = rocketDropZone || document.getElementById('rocket-drop-zone');
    if (!zone) return false;
    const r = zone.getBoundingClientRect();
    return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
  }

  function setZoneHighlight(active) {
    const zone = rocketDropZone || document.getElementById('rocket-drop-zone');
    if (zone) {
      if (active) zone.classList.add('dropzone-active');
      else zone.classList.remove('dropzone-active');
    }
    if (rocketCargoBay) {
      if (active) rocketCargoBay.classList.add('dragover');
      else rocketCargoBay.classList.remove('dragover');
    }
  }

  document.querySelectorAll('.draggable-supply-card').forEach(card => {
    card.addEventListener('pointerdown', (e) => {
      if (card.classList.contains('disabled')) return;
      sfx.init();

      const res = card.dataset.resource;
      const totalContainers = (state.loadout.o2 || 0) + (state.loadout.rad || 0) + (state.loadout.pwr || 0) + (state.loadout.food || 0);
      const remainingBudget = state.budget - (totalContainers * 100);
      const currentPct = 20 + ((state.loadout[res] || 0) * 15);

      if (totalContainers >= state.cargoCapacity || remainingBudget < 100 || currentPct + 15 > 95) {
        return;
      }

      activeDragResource = res;
      dragStartPos = { x: e.clientX, y: e.clientY };
      isDragging = false;

      // Crear fantasma flotante de arrastre con SVG
      if (dragGhostEl) dragGhostEl.remove();
      dragGhostEl = document.createElement('div');
      dragGhostEl.className = 'drag-ghost';
      const cfg = podConfig[res] || podConfig.o2;
      dragGhostEl.innerHTML = `
        <span class="shrink-0 flex items-center">${cfg.svg}</span>
        <span>${card.dataset.name || 'Caja'}</span>
        <span class="text-xs text-emerald-400 font-mono">+$100M</span>
      `;
      dragGhostEl.style.display = 'none';
      document.body.appendChild(dragGhostEl);

      const onPointerMove = (moveEvt) => {
        if (!activeDragResource || !dragGhostEl) return;
        const dist = Math.hypot(moveEvt.clientX - dragStartPos.x, moveEvt.clientY - dragStartPos.y);

        if (dist > 8) {
          isDragging = true;
          dragGhostEl.style.display = 'flex';
          dragGhostEl.style.left = moveEvt.clientX + 'px';
          dragGhostEl.style.top = moveEvt.clientY + 'px';

          const overZone = isPointerOverRocketZone(moveEvt.clientX, moveEvt.clientY);
          setZoneHighlight(overZone);
        }
      };

      const onPointerUp = (upEvt) => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);

        if (!activeDragResource) return;
        const dropRes = activeDragResource;
        activeDragResource = null;

        setZoneHighlight(false);

        if (dragGhostEl) {
          dragGhostEl.remove();
          dragGhostEl = null;
        }

        const droppedOverZone = isPointerOverRocketZone(upEvt.clientX, upEvt.clientY);

        if (droppedOverZone) {
          tryAddCargoResource(dropRes, { x: upEvt.clientX, y: upEvt.clientY });
        } else if (!isDragging) {
          // Clic directo en la tarjeta
          tryAddCargoResource(dropRes, { x: upEvt.clientX, y: upEvt.clientY });
        }

        isDragging = false;
      };

      const onPointerCancel = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);

        activeDragResource = null;
        isDragging = false;
        setZoneHighlight(false);
        if (dragGhostEl) {
          dragGhostEl.remove();
          dragGhostEl = null;
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
    });
  });

  // Hangar: Volver a la pantalla de dificultad
  if (hangarBackToDiffBtn) {
    hangarBackToDiffBtn.addEventListener('click', () => {
      sfx.playGrab();
      if (tutorialManager) tutorialManager.stop();
      hidePremissionScreen(hangarLoadoutScreen);
      showPremissionScreen(difficultyScreen, 'flex');
    });
  }

  function updateLaunchLoadingText() {
    const loadingEl = document.getElementById('launch-loading-text');
    if (!loadingEl) return;
    const isEn = (window.GAME_SETTINGS?.lang === 'en');
    const word = isEn ? 'LOADING...' : 'CARGANDO...';
    loadingEl.innerHTML = word
      .split('')
      .map((char, index) => `<span class="wave-letter" style="--i: ${index}">${char}</span>`)
      .join('');
  }

  // Hangar: SECUENCIA DE LANZAMIENTO CON PANTALLA DE CARGA Y ANIMACIÓN TIPO OLA (WAVE BOUNCE)
  if (hangarLaunchExpeditionBtn) {
    hangarLaunchExpeditionBtn.addEventListener('mouseenter', () => {
      sfx.init();
      sfx.playHover();
    });
    hangarLaunchExpeditionBtn.addEventListener('click', () => {
      if (hangarLaunchExpeditionBtn.disabled) return;
      hangarLaunchExpeditionBtn.disabled = true;
      hangarLaunchExpeditionBtn.classList.add('btn-pressed');

      sfx.init();
      sfx.playRocketLaunch();

      const overlay = document.getElementById('launch-cinematic-overlay');

      // 1. Verificar idioma y construir cada letra y punto con su propio span animado
      updateLaunchLoadingText();

      // 2. Mostrar de inmediato la pantalla de carga limpia (#05070d) centrada
      if (overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
        overlay.style.pointerEvents = 'auto';
        overlay.style.transition = 'opacity 0.2s ease-in';
        requestAnimationFrame(() => {
          overlay.style.opacity = '1';
        });
      }

      // 3. Mantener visible durante exactamente 2.0 segundos (2000ms) y luego fade-out rápido (0.3s)
      setTimeout(() => {
        // Fijar exactamente los recursos cargados en el cohete como valores iniciales
        state.resources = {
          o2: 20 + ((state.loadout.o2 || 0) * 15),
          rad: 20 + ((state.loadout.rad || 0) * 15),
          pwr: 20 + ((state.loadout.pwr || 0) * 15),
          food: 20 + ((state.loadout.food || 0) * 15)
        };

        // Aplicar Modificador Climático Real NASA DONKI en Sol 1
        applyNasaDonkiSolStartBonus();

        // Ocultar pantalla de hangar y limpiar efectos
        if (hangarLoadoutScreen) {
          hidePremissionScreen(hangarLoadoutScreen);
          hangarLoadoutScreen.classList.remove('launch-screen-shake');
        }
        const flightGroup = document.getElementById('rocket-flight-group');
        if (flightGroup) flightGroup.classList.remove('rocket-liftoff');
        const plumeGroup = document.getElementById('rocket-plume-group');
        const smokeBox = document.getElementById('launch-smoke-box');
        if (plumeGroup) plumeGroup.style.opacity = '0';
        if (smokeBox) smokeBox.style.opacity = '0';

        // Guardar estado inicial en storage e iniciar Sol 1 en la esclusa lunar
        clearSavedGame();
        saveGameToStorage();
        minigameTriggeredThisSol = false;
        prepareSolEmergencyPlan(1, true);
        layoutAllDeskToolsInitial();
        renderCurrentCase(true);

        // Iniciar fade-out rápido de 0.3s (300ms) del overlay
        if (overlay) {
          overlay.style.transition = 'opacity 0.3s ease-out';
          overlay.style.opacity = '0';
          overlay.style.pointerEvents = 'none';
        }

        // Al terminar el fade-out de 0.3s (300ms), cerrar overlay y entrar al Sol 1
        setTimeout(() => {
          if (overlay) {
            hidePremissionScreen(overlay);
            overlay.style.opacity = '0';
            overlay.style.transition = '';
          }
          closeAllPremissionScreens();
          hangarLaunchExpeditionBtn.disabled = false;
          hangarLaunchExpeditionBtn.classList.remove('btn-pressed');

          // Iniciar Secuencia 2 del Tutorial en la Esclusa Lunar (Sol 1)
          setTimeout(() => {
            startAirlockTutorial();
          }, 150);
        }, 300);
      }, 2000);
    });
  }

  if (abortResetBtn) {
    abortResetBtn.addEventListener('click', () => {
      if (tutorialManager) tutorialManager.stop();
      clearTimeout(emergencyScheduledTimer);
      emergencyScheduledTimer = null;
      closeEmergencyModal();
      minigameTriggeredThisSol = false;
      prepareSolEmergencyPlan(1, true);
      sfx.stopScannerAudio();
      sfx.updateLowResourceAlarm(false);
      sfx.playGrab();
      clearSavedGame();
      resetStateToDefault(20);
      document.getElementById('mission-modal')?.classList.add('hidden');
      nightReportModal?.classList.add('hidden');
      closeNasaTelemetryModal();
      closeAllPremissionScreens();
      showPremissionScreen(difficultyScreen, 'flex');
      refreshTitleScreenSaveBanner();
      layoutAllDeskToolsInitial();
      renderCurrentCase(false);
    });
  }

  document.getElementById('restart-mission-btn')?.addEventListener('click', () => {
    if (tutorialManager) tutorialManager.stop();
    clearTimeout(emergencyScheduledTimer);
    emergencyScheduledTimer = null;
    closeEmergencyModal();
    minigameTriggeredThisSol = false;
    prepareSolEmergencyPlan(1, true);
    sfx.stopScannerAudio();
    sfx.updateLowResourceAlarm(false);
    sfx.playBootSequence();
    clearSavedGame();
    resetStateToDefault(20);
    saveGameToStorage();
    document.getElementById('mission-modal')?.classList.add('hidden');
    nightReportModal?.classList.add('hidden');
    closeAllPremissionScreens();
    showPremissionScreen(difficultyScreen, 'flex');
    layoutAllDeskToolsInitial();
    renderCurrentCase(true);
  });

  // =======================================================================
  // SISTEMA DE INTERNACIONALIZACIÓN (I18N) Y MODAL DE CONFIGURACIÓN
  // =======================================================================
  const I18N = {
    es: {
      diffTitle: 'ELIGE EL TAMAÑO DE TU MISIÓN',
      diffSub: 'Al llegar a la Luna tus sistemas empiezan al <strong class="text-amber-400 font-mono font-bold">20%</strong>. Elige tu nivel de financiamiento para comprar suministros antes del lanzamiento:',
      cadetTitle: 'CADETE // FÁCIL',
      cadetSols: 'DURACIÓN: 3 SOLES LUNARES',
      cadetDesc: '"Presupuesto alto para abastecer casi toda tu nave antes de despegar."',
      cadetBtn: '[ SELECCIONAR CADETE ]',
      engineerTitle: 'INGENIERO // NORMAL',
      engineerSols: 'DURACIÓN: 4 SOLES LUNARES',
      engineerDesc: '"Presupuesto limitado. Tendrás que elegir qué recursos priorizar en el viaje."',
      engineerBtn: '[ SELECCIONAR INGENIERO ]',
      commanderTitle: 'COMANDANTE // DIFÍCIL',
      commanderSols: 'DURACIÓN: 5 SOLES LUNARES',
      commanderDesc: '"Emergencia presupuestaria. Viajarás con reservas mínimas hacia la Luna."',
      commanderBtn: '[ SELECCIONAR COMANDANTE ]',
      savedExpeditionLabel: 'EXPEDICIÓN GUARDADA EN LOCALSTORAGE',
      resumeMissionBtn: '[ REANUDAR MISIÓN ]',
      settingsTitle: 'AJUSTES DE MISIÓN',
      settingsSubtitle: 'SISTEMAS DEL SIMULADOR LUNAR',
      minigameChanceLabel: 'PROBABILIDAD DE EMERGENCIA POR SOL',
      minigameChanceDesc: 'Evalúa al inicio de cada Sol si ocurre un minijuego táctil de emergencia (máx. 1 por Sol). Al 100% ocurre siempre garantizado. Al 0% nunca ocurrirán emergencias.',
      sliderZero: '0% (DESACTIVADO)',
      sliderHundred: '100% (GARANTIZADO)',
      langLabel: 'IDIOMA DE LA INTERFAZ // LANGUAGE',
      settingsSaveBtn: '[ ACEPTAR Y GUARDAR ]',

      changeMissionBtn: 'CAMBIAR MISIÓN',
      hangarTitle: 'CONFIGURACIÓN DE CARGA // NAVE ARTEMIS',
      remainingBudget: 'PRESUPUESTO RESTANTE',
      cargoBay: 'BODEGA DE CARGA',

      lunarCampaign: 'CAMPAÑA LUNAR',
      resOxygen: 'OXÍGENO',
      resShield: 'ESCUDO',
      resEnergy: 'ENERGÍA',
      resFood: 'COMIDA',
      restartMissionBtn: 'REINICIAR MISIÓN',

      solarRadarTitle: 'RADAR SOLAR Y TELEMETRÍA NASA',
      solarClimateTitle: 'SOLAR // NASA DONKI',
      orbitTitle: 'ÓRBITA // NASA NEOWS',
      hudDonkiLive: 'SATÉLITE DONKI // EN VIVO',
      hudNeowsLive: 'RADAR NEOWS // EN VIVO',
      hudDonkiModuleTitle: 'CLIMA SOLAR (DONKI)',
      hudNeowsModuleTitle: 'OBJETO CERCANO (NEOWS)',
      hudCell1Title: 'LLAMARADA SOLAR',
      hudCell2Title: 'IMPACTO RADIACIÓN',
      hudCell3Title: 'ASTEROIDE CERCANO',
      hudCell4Title: 'VELOCIDAD / TAMAÑO',
      crateSealedBadge: 'SELLADO // NIVEL 4',
      crateDangerXray: 'NASA-CONT-04 // PELIGRO RAYOS-X',

      manualTitle: 'GUÍA RÁPIDA DE LA ESCLUSA',
      manualSubtitle: 'CÓMO SOBREVIVIR EN 3 PASOS SIMPLES',
      manualClose: '[ CERRAR ✕ ]',
      rule1Title: 'PASO 1 // LEE LA PROMESA',
      rule1Cause: 'ESCUCHA AL VISITANTE Y REVISA LA TABLET AZUL',
      ruleCauseLabel: 'SI OCURRE ESTO:',
      ruleEffectLabel: 'PASA ESTO:',
      rule1Effect: 'NO CONFÍES A CIEGAS EN LO QUE PROMETEN',
      rule1Quote: '"En la tablet azul verás lo que el visitante dice que te dará, pero casi siempre ocultan costos secundarios."',
      rule2Title: 'PASO 2 // USA EL ESCÁNER',
      rule2Cause: 'ARRASTRA EL VISOR SOBRE LA TABLET Y EL MALETÍN',
      rule2Effect: 'DESCUBRE LOS PORCENTAJES REALES EXACTOS',
      rule2Quote: '"En la Tablet verás los 4 cambios reales exactos si autorizas, y abajo lo que pasa si deniegas. En el Maletín verás si hay fugas peligrosas."',
      rule3Title: 'PASO 3 // SELLA EL EXPEDIENTE',
      rule3Cause: 'ARRASTRA "AUTORIZAR" O "DENEGAR" A LA TABLET',
      rule3Effect: 'MANTÉN LAS 4 BARRAS ARRIBA DE 0%',
      rule3Quote: '"Tus barras subirán o bajarán exactamente lo que marcó el escáner. ¡Si cualquiera de las 4 barras llega a 0%, pierdes la misión!"',
      nightConsumption: 'CONSEJO TÁCTICO: Haz clic en las 4 barras de arriba para ver las cámaras CCTV o en el monitor de la NASA para ver datos satelitales reales.',

      digitalDossier: 'EXPEDIENTE DIGITAL',
      dossierOfficial: 'OFICIAL',
      dossierApplicantLabel: 'SOLICITANTE',
      dossierSectorLabel: 'SECTOR ASIGNADO',
      dossierMassLabel: 'MASA / CLASE',
      dossierImpactLabel: 'CONSUMO',
      dossierCargoLabel: 'DECLARACIÓN DE OPERACIÓN:',
      dossierPromiseLabel: 'PROMESA EN PAPEL',
      dossierHoloVerified: 'SELLO HOLO-ARTEMIS VERIFICADO',

      scannerTitle: 'VISOR RAYOS-X / UV',
      stamp1Label: 'SELLO #01',
      stampApproveTitle: 'AUTORIZAR',
      stamp2Label: 'SELLO #02',
      stampDenyTitle: 'DENEGAR',
      nextShiftBtn: 'SIGUIENTE TURNO ➔',

      // Hangar summary and counters
      hangarSupplySummary: 'RESUMEN DE SUMINISTROS (BASE 20%)',
      hangarBudgetLabel: 'PRESUPUESTO:',
      hangarResO2: 'O2',
      hangarResRad: 'ESCUDO',
      hangarResPwr: 'RED',
      hangarResFood: 'COMIDA',
      hangarFoodCardTitle: 'COMIDA',
      hangarFoodCardBonus: '+15% COMIDA',
      hangarPwrCardTitle: 'ENERGÍA',
      hangarPwrCardBonus: '+15% ENERGÍA',
      hangarO2CardTitle: 'OXÍGENO',
      hangarO2CardBonus: '+15% OXÍGENO',
      hangarRadCardTitle: 'ESCUDO',
      hangarRadCardBonus: '+15% ESCUDO',
      hangarClickToRemove: 'CLIC EN CAJA DENTRO DEL COHETE PARA SACAR',
      dropshipTitleTag: 'MÓDULO DE CARGA ARTEMIS // DROPSHIP',
      dropshipMainTitle: 'NAVE DE DESCENSO Y CARGA LUNAR',
      dropshipLoadedLabel: 'CARGADAS:',
      hangarFoodChamberTitle: 'COMIDA',
      hangarPwrChamberTitle: 'ENERGÍA',
      hangarO2ChamberTitle: 'OXÍGENO',
      hangarRadChamberTitle: 'ESCUDO',

      // Tutorial
      tutSkipBtn: '[ SALTAR TUTORIAL ]',
      tutContinuePrompt: '[ HAZ CLIC EN CUALQUIER LUGAR PARA CONTINUAR ]',

      // Viewport and desk
      airlockWindowTag: 'SECTOR A-04 // VENTANA DE ESCLUSA EXTERIOR',
      airlockClosedBadge: 'ESCLUSA CERRADA • SELLO 100%',
      extCamLive: 'CAM-EXT // EN VIVO',
      extSignalTag: 'SEÑAL 98%',
      inspectionZoneTag: 'ZONA DE INSPECCIÓN DE MANIFIESTOS Y MUESTRAS // MESA METALÚRGICA #01',
      hydraulicStampingTag: 'ESTACIÓN DE SELLADO HIDRÁULICO',
      ipadAirlockHeader: 'ESCLUSA',
      manualCoverWord: 'MANUAL',

      // NASA Telemetry Modal
      nasaModalTitle: 'TELEMETRÍA SATELITAL EN VIVO DE LA NASA',
      nasaModalClose: '[ CERRAR TELEMETRÍA X ]',
      solarWeatherHead: '1. CLIMA SOLAR (API DONKI)',
      solarFlareHead: 'Llamarada Solar Detectada',
      solarFlareDesc: 'Una <strong>llamarada solar</strong> es una gigantesca explosión en el Sol que expulsa radiación y viento de protones por el espacio. La NASA las vigila sin descanso para alertar a las bases espaciales.',
      intensityLabel: 'INTENSIDAD:',
      activeRegionLabel: 'REGIÓN ACTIVA:',
      solarCoordsLabel: 'COORDENADAS SOL:',
      nasaTimestampLabel: 'REGISTRO NASA:',
      solarCardClassBadge: 'CLASE M3.5',
      solarCardEffectBadge: '+8.5 mSv EN CAJAS',
      neoRadarHead: '2. RADAR NEO (API NeoWs)',
      neoRadarDesc: 'El radar <strong>NeoWs</strong> de la NASA rastrea todas las rocas que cruzan cerca de la órbita Tierra-Luna. Así calculamos su velocidad y trayectoria para evitar impactos contra el biodomo lunar.',
      approxDiamLabel: 'DIÁMETRO APROX:',
      velocityLabel: 'VELOCIDAD:',
      lunarDistLabel: 'DISTANCIA LUNAR:',
      distKmLabel: 'DISTANCIA KM:',
      nasaStdHead: '3. NORMA OFICIAL NASA',
      nasaStdSub: 'Protección para Astronautas',
      nasaStdDesc: 'En las misiones lunares Artemis, la NASA sigue el estándar <strong>NASA-STD-3001</strong> para que los astronautas no sufran daños por radiación espacial ni asfixia:',
      maxRadLabel: 'LÍMITE MÁXIMO RADIACIÓN:',
      critO2Label: 'RESERVA CRÍTICA OXÍGENO:',
      minPwrLabel: 'ENERGÍA MÍNIMA:',

      // CCTV
      cctvHeaderTitle: 'CCTV // CÁMARAS INTERNAS — BASE SHACKLETON',
      cctvCloseBtn: '[X] VOLVER A LA ESCLUSA',

      // Night report
      nightReportOutpostTag: 'PUESTO LUNAR ARTEMIS // TELEMETRÍA DE FIN DE SOL',
      nightAutosaveBadge: 'AUTOGUARDADO',
      nightLogsTitle: 'BITÁCORA DE SISTEMAS Y CONSECUENCIAS ENCADENADAS:',
      nightCctvStatusTitle: '[CCTV] ESTADO DE LAS CÁMARAS DE LA BASE:',

      // Debrief
      debriefSubHeader: 'EVALUACIÓN DE INGENIERÍA NASA // INFORME DE MISIÓN ARTEMIS',
      debriefDiagnosisTitle: 'DIAGNÓSTICO EDUCATIVO DE INGENIERÍA DE SISTEMAS:',
      debriefFinalStatusTitle: 'ESTADO FINAL DE LA BASE:',
      debriefColorCode: 'VERDE = AUTORIZADO • ROJO = DENEGADO',
      debriefTrainerFooter: 'ENTRENADOR DE MISIÓN PARA JÓVENES ASTRONAUTAS // SIMULADOR v2.6',
      debriefRestartBtn: '[ INICIAR NUEVA MISIÓN (SOL 1) ]',
      debriefResRad: 'ESCUDO:',
      debriefResPwr: 'ENERGÍA:',
      debriefResFood: 'COMIDA:'
    },
    en: {
      diffTitle: 'CHOOSE YOUR MISSION SCALE',
      diffSub: 'Upon reaching the Moon systems start at <strong class="text-amber-400 font-mono font-bold">20%</strong>. Choose your funding level to purchase supplies before launch:',
      cadetTitle: 'CADET // EASY',
      cadetSols: 'DURATION: 3 LUNAR SOLS',
      cadetDesc: '"High budget to supply almost your entire spacecraft before liftoff."',
      cadetBtn: '[ SELECT CADET ]',
      engineerTitle: 'ENGINEER // NORMAL',
      engineerSols: 'DURATION: 4 LUNAR SOLS',
      engineerDesc: '"Limited budget. You will need to choose which resources to prioritize."',
      engineerBtn: '[ SELECT ENGINEER ]',
      commanderTitle: 'COMMANDER // HARD',
      commanderSols: 'DURATION: 5 LUNAR SOLS',
      commanderDesc: '"Budget emergency. You will travel to the Moon with minimal reserves."',
      commanderBtn: '[ SELECT COMMANDER ]',
      savedExpeditionLabel: 'EXPEDITION SAVED IN LOCALSTORAGE',
      resumeMissionBtn: '[ RESUME MISSION ]',
      settingsTitle: 'MISSION SETTINGS',
      settingsSubtitle: 'LUNAR SIMULATOR SYSTEMS',
      minigameChanceLabel: 'EMERGENCY PROBABILITY PER SOL',
      minigameChanceDesc: 'Evaluates at each Sol start if a tactical emergency minigame occurs (max 1 per Sol). At 100% it is guaranteed every Sol. At 0% no emergencies occur.',
      sliderZero: '0% (DISABLED)',
      sliderHundred: '100% (GUARANTEED)',
      langLabel: 'INTERFACE LANGUAGE // IDIOMA',
      settingsSaveBtn: '[ ACCEPT AND SAVE ]',

      changeMissionBtn: 'CHANGE MISSION',
      hangarTitle: 'CARGO CONFIGURATION // ARTEMIS SPACECRAFT',
      remainingBudget: 'REMAINING BUDGET',
      cargoBay: 'CARGO BAY',

      lunarCampaign: 'LUNAR CAMPAIGN',
      resOxygen: 'OXYGEN',
      resShield: 'SHIELD',
      resEnergy: 'POWER',
      resFood: 'FOOD',
      restartMissionBtn: 'RESTART MISSION',

      solarRadarTitle: 'SOLAR RADAR AND NASA TELEMETRY',
      solarClimateTitle: 'SOLAR // NASA DONKI',
      orbitTitle: 'ORBIT // NASA NEOWS',
      hudDonkiLive: 'DONKI SATELLITE // LIVE',
      hudNeowsLive: 'NEOWS RADAR // LIVE',
      hudDonkiModuleTitle: 'SOLAR CLIMATE (DONKI)',
      hudNeowsModuleTitle: 'NEAR OBJECT (NEOWS)',
      hudCell1Title: 'SOLAR FLARE',
      hudCell2Title: 'RADIATION IMPACT',
      hudCell3Title: 'NEAR ASTEROID',
      hudCell4Title: 'SPEED / SIZE',
      crateSealedBadge: 'SEALED // LEVEL 4',
      crateDangerXray: 'NASA-CONT-04 // DANGER X-RAY',

      manualTitle: 'AIRLOCK QUICK GUIDE',
      manualSubtitle: 'HOW TO SURVIVE IN 3 SIMPLE STEPS',
      manualClose: '[ CLOSE ✕ ]',
      rule1Title: 'STEP 1 // READ THE PROMISE',
      rule1Cause: 'CHECK THE VISITOR & BLUE TABLET',
      ruleCauseLabel: 'IF THIS OCCURS:',
      ruleEffectLabel: 'THIS HAPPENS:',
      rule1Effect: 'NEVER TRUST PAPER PROMISES BLINDLY',
      rule1Quote: '"The blue tablet shows what they claim to offer, but they almost always hide secondary costs."',
      rule2Title: 'STEP 2 // USE THE SCANNER',
      rule2Cause: 'DRAG THE VIEWER OVER TABLET & BRIEFCASE',
      rule2Effect: 'REVEAL THE EXACT REAL PERCENTAGES',
      rule2Quote: '"Over the Tablet you\'ll see the exact 4 resource changes if approved, and what happens if denied. Over the Briefcase you\'ll spot dangerous leaks."',
      rule3Title: 'STEP 3 // STAMP THE TABLET',
      rule3Cause: 'DRAG "APPROVE" OR "DENY" ONTO THE TABLET',
      rule3Effect: 'KEEP ALL 4 BARS ABOVE 0%',
      rule3Quote: '"Your bars will change by the exact numbers shown on the scanner. If any of the 4 bars hits 0%, the mission fails!"',
      nightConsumption: 'TACTICAL TIP: Click the 4 top resource bars to view CCTV cameras, or click the NASA monitor for live satellite telemetry.',

      digitalDossier: 'DIGITAL DOSSIER',
      dossierOfficial: 'OFFICIAL',
      dossierApplicantLabel: 'APPLICANT',
      dossierSectorLabel: 'ASSIGNED SECTOR',
      dossierMassLabel: 'MASS / CLASS',
      dossierImpactLabel: 'CONSUMPTION',
      dossierCargoLabel: 'OPERATIONAL MANIFEST:',
      dossierPromiseLabel: 'PAPER PROMISE',
      dossierHoloVerified: 'HOLO-ARTEMIS SEAL VERIFIED',

      scannerTitle: 'X-RAY / UV VIEWER',
      stamp1Label: 'STAMP #01',
      stampApproveTitle: 'APPROVE',
      stamp2Label: 'STAMP #02',
      stampDenyTitle: 'DENY',
      nextShiftBtn: 'NEXT SHIFT ➔',

      // Hangar summary and counters
      hangarSupplySummary: 'SUPPLY SUMMARY (20% BASE)',
      hangarBudgetLabel: 'BUDGET:',
      hangarResO2: 'O2',
      hangarResRad: 'SHIELD',
      hangarResPwr: 'ENERGY',
      hangarResFood: 'FOOD',
      hangarFoodCardTitle: 'FOOD',
      hangarFoodCardBonus: '+15% FOOD',
      hangarPwrCardTitle: 'ENERGY',
      hangarPwrCardBonus: '+15% ENERGY',
      hangarO2CardTitle: 'OXYGEN',
      hangarO2CardBonus: '+15% OXYGEN',
      hangarRadCardTitle: 'SHIELD',
      hangarRadCardBonus: '+15% SHIELD',
      hangarClickToRemove: 'CLICK MODULE INSIDE ROCKET TO REMOVE',
      dropshipTitleTag: 'ARTEMIS CARGO MODULE // DROPSHIP',
      dropshipMainTitle: 'LUNAR DESCENT & CARGO LANDER',
      dropshipLoadedLabel: 'LOADED:',
      hangarFoodChamberTitle: 'FOOD',
      hangarPwrChamberTitle: 'ENERGY',
      hangarO2ChamberTitle: 'OXYGEN',
      hangarRadChamberTitle: 'SHIELD',

      // Tutorial
      tutSkipBtn: '[ SKIP TUTORIAL ]',
      tutContinuePrompt: '[ CLICK ANYWHERE TO CONTINUE ]',

      // Viewport and desk
      airlockWindowTag: 'SECTOR A-04 // OUTER AIRLOCK WINDOW',
      airlockClosedBadge: 'AIRLOCK SEALED • 100% SEAL',
      extCamLive: 'EXT-CAM // LIVE',
      extSignalTag: 'SIGNAL 98%',
      inspectionZoneTag: 'MANIFEST & SAMPLE INSPECTION ZONE // METALLURGICAL DESK #01',
      hydraulicStampingTag: 'HYDRAULIC STAMPING STATION',
      ipadAirlockHeader: 'AIRLOCK',
      manualCoverWord: 'MANUAL',

      // NASA Telemetry Modal
      nasaModalTitle: 'LIVE NASA SATELLITE TELEMETRY',
      nasaModalClose: '[ CLOSE TELEMETRY X ]',
      solarWeatherHead: '1. SOLAR WEATHER (DONKI API)',
      solarFlareHead: 'Solar Flare Detected',
      solarFlareDesc: 'A <strong>solar flare</strong> is a massive explosion on the Sun erupting radiation and proton wind into space. NASA monitors them continuously to alert space outposts.',
      intensityLabel: 'INTENSITY:',
      activeRegionLabel: 'ACTIVE REGION:',
      solarCoordsLabel: 'SOLAR COORDS:',
      nasaTimestampLabel: 'NASA TIMESTAMP:',
      solarCardClassBadge: 'CLASS M3.5',
      solarCardEffectBadge: '+8.5 mSv IN CRATES',
      neoRadarHead: '2. NEO RADAR (NEOWS API)',
      neoRadarDesc: "NASA's <strong>NeoWs</strong> radar tracks near-Earth asteroids near the Earth-Moon orbit, calculating velocity and trajectories to safeguard lunar biodomes.",
      approxDiamLabel: 'APPROX DIAMETER:',
      velocityLabel: 'VELOCITY:',
      lunarDistLabel: 'LUNAR DISTANCE:',
      distKmLabel: 'DISTANCE IN KM:',
      nasaStdHead: '3. OFFICIAL NASA STANDARD',
      nasaStdSub: 'Astronaut Protection',
      nasaStdDesc: 'In Artemis lunar missions, NASA adheres to <strong>NASA-STD-3001</strong> to protect astronauts from radiation exposure and asphyxiation:',
      maxRadLabel: 'MAX RADIATION LIMIT:',
      critO2Label: 'CRITICAL OXYGEN RESERVE:',
      minPwrLabel: 'MINIMUM POWER:',

      // CCTV
      cctvHeaderTitle: 'CCTV // INTERNAL CAMERAS — SHACKLETON BASE',
      cctvCloseBtn: '[X] RETURN TO AIRLOCK',

      // Night report
      nightReportOutpostTag: 'ARTEMIS LUNAR OUTPOST // END OF SOL TELEMETRY',
      nightAutosaveBadge: 'AUTOSAVED',
      nightLogsTitle: 'SYSTEM LOGS & CHAINED CONSEQUENCES:',
      nightCctvStatusTitle: '[CCTV] BASE CAMERA STATUS:',

      // Debrief
      debriefSubHeader: 'NASA ENGINEERING EVALUATION // ARTEMIS MISSION REPORT',
      debriefDiagnosisTitle: 'SYSTEMS ENGINEERING EDUCATIONAL DIAGNOSIS:',
      debriefFinalStatusTitle: 'FINAL BASE STATUS:',
      debriefColorCode: 'GREEN = APPROVED • RED = DENIED',
      debriefTrainerFooter: 'MISSION TRAINER FOR YOUNG ASTRONAUTS // SIMULATOR v2.6',
      debriefRestartBtn: '[ START NEW MISSION (SOL 1) ]',
      debriefResRad: 'SHIELD:',
      debriefResPwr: 'POWER:',
      debriefResFood: 'FOOD:'
    }
  };
  window.I18N = I18N;
  const I18N_STRINGS = I18N;

  function applyLanguage(lang) {
    window.GAME_SETTINGS.lang = (lang === 'en') ? 'en' : 'es';
    const isEn = window.GAME_SETTINGS.lang === 'en';
    try {
      localStorage.setItem('lunar_lang', window.GAME_SETTINGS.lang);
    } catch (_) {}

    const dict = I18N[window.GAME_SETTINGS.lang] || I18N.es;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        if (dict[key].includes('<')) {
          el.innerHTML = dict[key];
        } else {
          el.textContent = dict[key];
        }
      }
    });

    updateLaunchLoadingText();

    const btnEs = document.getElementById('lang-btn-es');
    const btnEn = document.getElementById('lang-btn-en');
    if (btnEs && btnEn) {
      if (!isEn) {
        btnEs.className = 'py-2 px-3 rounded-lg border-2 border-cyan-400 bg-cyan-950/80 text-cyan-300 font-black tracking-wider uppercase font-mono shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all cursor-pointer';
        btnEn.className = 'py-2 px-3 rounded-lg border border-zinc-700 bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 font-bold tracking-wider uppercase font-mono transition-all cursor-pointer';
      } else {
        btnEn.className = 'py-2 px-3 rounded-lg border-2 border-cyan-400 bg-cyan-950/80 text-cyan-300 font-black tracking-wider uppercase font-mono shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all cursor-pointer';
        btnEs.className = 'py-2 px-3 rounded-lg border border-zinc-700 bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 font-bold tracking-wider uppercase font-mono transition-all cursor-pointer';
      }
    }

    const extEnvReadout = document.getElementById('ext-env-readout');
    if (extEnvReadout) {
      extEnvReadout.textContent = isEn ? 'EXT. TEMP: -178°C // LUNAR VACUUM' : 'TEMP. EXT: -178°C // VACÍO LUNAR';
    }

    const channelTag = document.getElementById('visitor-channel-tag');
    if (channelTag) {
      channelTag.textContent = isEn ? 'RADIO CHANNEL 14.8 GHz' : 'CANAL DE RADIO 14.8 GHz';
    }

    const crtSolTag = document.getElementById('crt-sol-tag');
    if (crtSolTag) {
      crtSolTag.textContent = isEn ? `SOL ${state.sol} // LIVE` : `SOL ${state.sol} // EN VIVO`;
    }

    const feedbackEl = document.getElementById('decision-feedback');
    if (feedbackEl && !state.stampedChoice) {
      feedbackEl.textContent = isEn ? 'AWAITING OFFICIAL STAMP ON MANIFEST...' : 'ESPERANDO SELLO OFICIAL EN MANIFIESTO...';
    }

    const nextBtn = document.getElementById('next-case-btn') || document.getElementById('next-shift-btn');
    if (nextBtn && !nextBtn.classList.contains('hidden')) {
      if (state.caseInSol === 0) {
        nextBtn.textContent = isEn ? 'NEXT SHIFT (CASE 2/2) >>' : 'SIGUIENTE TURNO (CASO 2/2) >>';
      } else {
        nextBtn.textContent = isEn ? `CLOSE SOL ${state.sol} (NIGHT REPORT) >>` : `CERRAR SOL ${state.sol} (REPORTE NOCTURNO) >>`;
      }
    }

    const nextSolBtn = document.getElementById('next-sol-btn');
    if (nextSolBtn) {
      if (state.sol >= state.maxSols) {
        nextSolBtn.textContent = isEn
          ? `VIEW FINAL NASA EVALUATION (SOL ${state.maxSols} COMPLETED) >>`
          : `VER EVALUACIÓN FINAL DE LA NASA (SOL ${state.maxSols} COMPLETADO) >>`;
      } else {
        nextSolBtn.textContent = isEn
          ? `START SOL ${state.sol + 1} (AUTOSAVE) >>`
          : `INICIAR SOL ${state.sol + 1} (AUTOGUARDAR) >>`;
      }
    }

    try {
      setupHangarScreen();
    } catch (_) {}
    try {
      updateHangarUI();
    } catch (_) {}
    try {
      updateResourceBars();
    } catch (_) {}
    try {
      updateSolarConditionCardsRealtime();
    } catch (_) {}
    try {
      updateNasaTelemetryUI();
    } catch (_) {}
    try {
      updateScannerCollisions();
    } catch (_) {}
    try {
      updateFlagsTicker();
    } catch (_) {}
    try {
      updateCctvIncidentBanner();
    } catch (_) {}
    try {
      refreshCctvIfOpen();
    } catch (_) {}
    try {
      const missionModal = document.getElementById('mission-modal');
      if (missionModal && !missionModal.classList.contains('hidden') && currentDebriefState) {
        showNasaDebriefing(currentDebriefState.outcomeType, currentDebriefState.failedResourceKey, currentDebriefState.extraRules);
      }
    } catch (_) {}
    try {
      renderCurrentCase(false);
    } catch (_) {}
    try {
      if (tutorialManager && tutorialManager.isActive()) {
        tutorialManager.renderCurrentStep();
      }
    } catch (_) {}
  }

  function initSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    const openBtn = document.getElementById('difficulty-settings-btn');
    const closeBtn = document.getElementById('settings-close-btn');
    const saveBtn = document.getElementById('settings-save-btn');
    const slider = document.getElementById('settings-minigame-slider');
    const display = document.getElementById('settings-chance-display');
    const btnEs = document.getElementById('lang-btn-es');
    const btnEn = document.getElementById('lang-btn-en');

    if (!settingsModal) return;

    function openModal() {
      if (slider) {
        const prob = getMinigameProbability();
        slider.value = Math.round(prob * 100);
        if (display) display.textContent = slider.value + '%';
      }
      applyLanguage(window.GAME_SETTINGS.lang);
      settingsModal.classList.remove('hidden');
      settingsModal.style.display = 'flex';
      sfx.playClick();
    }

    function closeModal() {
      settingsModal.classList.add('hidden');
      settingsModal.style.display = 'none';
      sfx.playClick();
    }

    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal();
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (saveBtn) saveBtn.addEventListener('click', closeModal);

    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeModal();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsModal.style.display !== 'none' && !settingsModal.classList.contains('hidden')) {
        closeModal();
      }
    });

    if (slider && display) {
      slider.addEventListener('input', () => {
        const val = parseInt(slider.value, 10);
        display.textContent = val + '%';
        const prob = Math.max(0, Math.min(1, val / 100));
        window.GAME_SETTINGS.minigameChance = prob;
        try {
          localStorage.setItem('lunar_minigame_chance', prob.toString());
        } catch (_) {}
        if (state && typeof state.sol === 'number') {
          prepareSolEmergencyPlan(state.sol, true);
        }
      });
    }

    if (btnEs) {
      btnEs.addEventListener('click', () => {
        applyLanguage('es');
        sfx.playClick();
      });
    }
    if (btnEn) {
      btnEn.addEventListener('click', () => {
        applyLanguage('en');
        sfx.playClick();
      });
    }
  }

  // =======================================================================
  // CCTV: CÁMARAS INTERNAS DE LA BASE (PARTE 1: BIODOMO + NÚCLEO ELÉCTRICO)
  // =======================================================================
  function cctvStateFor(key, val) {
    if (key === 'pwr') return val > 65 ? 'optimal' : val >= 40 ? 'degraded' : 'critical';
    if (key === 'rad') {
      const stormFail = (state.sol === 3 || state.sol === 6) && val <= 60; // fallo en Tormenta Solar
      if (stormFail || val < 35) return 'critical';
      return val > 65 ? 'optimal' : 'degraded';
    }
    if (key === 'o2') return val > 65 ? 'optimal' : val >= 35 ? 'degraded' : 'critical';
    return val > 65 ? 'optimal' : val >= 30 ? 'degraded' : 'critical';
  }

  const CCTV_STATE_LABEL = { optimal: 'ÓPTIMO', degraded: 'DEGRADADO', critical: 'CRÍTICO' };
  const CCTV_STATE_LABEL_EN = { optimal: 'OPTIMAL', degraded: 'DEGRADED', critical: 'CRITICAL' };
  function getCctvStateLabel(st) {
    const isEn = window.GAME_SETTINGS?.lang === 'en';
    return (isEn ? CCTV_STATE_LABEL_EN[st] : CCTV_STATE_LABEL[st]) || st;
  }
  const CCTV_STATE_COLOR = { optimal: 'text-emerald-300', degraded: 'text-amber-300', critical: 'text-rose-400' };

  function wasDecision(caseId, choice) {
    return state.decisionHistory.some((d) => d.caseId === caseId && d.choice === choice);
  }

  // ---------- SALA 1: BIODOMO (COMIDA) ----------
  function renderBiodomeScene(st, uid = '') {
    const tranActive = wasDecision('SOL1-C1', 'AUTHORIZE');
    let lamps = '';
    [100, 300, 500, 700].forEach((x, i) => {
      const flick = st === 'degraded' && i % 2 === 1 ? ' uv-flicker' : '';
      lamps += `
        <g class="${flick.trim()}">
          <polygon class="uv-cone" points="${x - 50},68 ${x + 50},68 ${x + 120},300 ${x - 120},300" fill="url(#uvGrad${uid})"/>
          <rect x="${x - 62}" y="40" width="124" height="18" rx="4" fill="#3f3f46" stroke="#a1a1aa" stroke-width="1.5"/>
          <rect class="uv-tube" x="${x - 52}" y="58" width="104" height="8" rx="4"/>
        </g>`;
    });

    let pods = '';
    let drips = '';
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 125;
      const podState = st === 'optimal' ? 'ok' : st === 'degraded' ? (i % 2 === 0 ? 'ok' : 'wilt') : 'dead';
      const h = podState === 'ok' ? (st === 'optimal' ? 96 : 72) : podState === 'wilt' ? 46 : 28;
      const stem = podState === 'ok' ? '#22c55e' : podState === 'wilt' ? '#ca8a04' : '#57534e';
      const head = podState === 'ok' ? '#fde047' : podState === 'wilt' ? '#a16207' : '#44403c';
      const leaf = podState === 'ok' ? '#4ade80' : podState === 'wilt' ? '#d4a017' : '#44403c';
      const led = podState === 'ok' ? '#34d399' : podState === 'wilt' ? '#fbbf24' : '#ef4444';
      let stalks = '';
      [22, 45, 68].forEach((dx, k) => {
        const sx = x + dx;
        const hh = h - k * 6;
        stalks += `
          <g class="stalk stalk-${podState}" style="animation-delay:${(i * 0.3 + k * 0.5).toFixed(1)}s">
            <path d="M${sx} 330 C${sx - 5} ${330 - hh * 0.4}, ${sx + 5} ${330 - hh * 0.7}, ${sx} ${330 - hh}" stroke="${stem}" stroke-width="3" fill="none" stroke-linecap="round"/>
            <ellipse cx="${sx}" cy="${330 - hh - 6}" rx="4" ry="10" fill="${head}"/>
            <path d="M${sx} ${330 - hh * 0.45} q-14 -6 -18 -20 q14 2 18 20z" fill="${leaf}"/>
            <path d="M${sx} ${330 - hh * 0.6} q14 -6 18 -20 q-14 2 -18 20z" fill="${leaf}"/>
          </g>`;
      });
      pods += `
        <rect x="${x}" y="225" width="90" height="105" rx="12" fill="rgba(34,211,238,0.06)" stroke="rgba(161,161,170,0.55)" stroke-width="2"/>
        <rect x="${x + 2}" y="318" width="86" height="12" fill="rgba(56,189,248,${st === 'critical' ? 0.12 : 0.38})"/>
        ${stalks}
        <rect x="${x - 4}" y="330" width="98" height="40" rx="6" fill="#27272a" stroke="#71717a" stroke-width="2"/>
        <circle cx="${x + 12}" cy="350" r="4" fill="${led}"/>
        <rect x="${x + 24}" y="344" width="58" height="12" rx="2" fill="#0f0f12"/>`;
      if (st !== 'critical') {
        drips += `<circle class="drip${st === 'degraded' ? ' drip-slow' : ''}" cx="${x + 45}" cy="232" r="3.2" fill="#7dd3fc" style="animation-delay:${(i * 0.37).toFixed(2)}s"/>`;
      }
      drips += `<rect x="${x + 41}" y="223" width="8" height="8" fill="#a1a1aa"/>`;
    }

    // Dra. Tran supervisando (solo con estado óptimo y Sol 1 autorizado)
    const tran = tranActive && st === 'optimal' ? `
      <g>
        <rect x="372" y="322" width="50" height="92" rx="16" fill="#f4f4f5" stroke="#a1a1aa" stroke-width="2"/>
        <rect x="372" y="322" width="14" height="20" rx="6" fill="#10b981"/>
        <rect x="408" y="322" width="14" height="20" rx="6" fill="#10b981"/>
        <circle cx="397" cy="300" r="22" fill="#f4f4f5" stroke="#a1a1aa" stroke-width="2.5"/>
        <rect x="383" y="289" width="28" height="19" rx="9" fill="#065f46" stroke="#fbbf24" stroke-width="1.8"/>
        <path d="M387 294 Q397 289 407 294" stroke="#a7f3d0" stroke-width="2" fill="none"/>
        <g class="tran-arm"><rect x="418" y="330" width="46" height="11" rx="5" fill="#e4e4e7" stroke="#a1a1aa" stroke-width="1.5"/></g>
      </g>` : '';

    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const crit = st === 'critical';
    let badge;
    if (crit) badge = isEn
      ? '<div class="cctv-badge cctv-badge-crit">[!] BASE FAMINE ALERT</div>'
      : '<div class="cctv-badge cctv-badge-crit">[!] ALERTA DE HAMBRUNA EN LA BASE</div>';
    else if (st === 'optimal' && tranActive) badge = isEn
      ? '<div class="cctv-badge">[BIO] UV-C ARRAY ACTIVE (+YIELD) // DR. TRAN: MONITORING CROPS</div>'
      : '<div class="cctv-badge">[BIO] MATRIZ UV-C ACTIVA (+PRODUCCIÓN) // DRA. TRAN: SUPERVISANDO CULTIVOS</div>';
    else if (st === 'optimal') badge = isEn
      ? '<div class="cctv-badge">[OK] NOMINAL BIODOME // HEALTHY CROPS</div>'
      : '<div class="cctv-badge">[OK] BIODOMO NOMINAL // CULTIVOS SANOS</div>';
    else badge = isEn
      ? '<div class="cctv-badge cctv-badge-warn">[!] UV LAMP FAILURE // DEGRADED CROPS</div>'
      : '<div class="cctv-badge cctv-badge-warn">[!] FALLOS EN LÁMPARAS UV // CULTIVOS DEGRADADOS</div>';

    return `
      <div class="cctv-scene" data-state="${st}">
        <svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="uvGrad${uid}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(192,132,252,0.6)"/>
              <stop offset="100%" stop-color="rgba(34,211,238,0)"/>
            </linearGradient>
            <linearGradient id="bioWall${uid}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1c1c21"/>
              <stop offset="100%" stop-color="#0c0c0f"/>
            </linearGradient>
          </defs>
          <rect width="800" height="420" fill="url(#bioWall${uid})"/>
          <g stroke="#2a2a30" stroke-width="2">
            <line x1="0" y1="120" x2="800" y2="120"/><line x1="0" y1="190" x2="800" y2="190"/>
            <line x1="200" y1="0" x2="200" y2="215"/><line x1="400" y1="0" x2="400" y2="215"/><line x1="600" y1="0" x2="600" y2="215"/>
          </g>
          <rect x="0" y="36" width="800" height="6" fill="#52525b"/>
          ${lamps}
          <rect x="30" y="215" width="740" height="8" rx="3" fill="#52525b" stroke="#a1a1aa" stroke-width="1"/>
          ${pods}
          ${drips}
          <rect x="0" y="370" width="800" height="50" fill="#16161a"/>
          <g stroke="#2e2e35" stroke-width="2">
            <line x1="0" y1="385" x2="800" y2="385"/><line x1="0" y1="400" x2="800" y2="400"/>
          </g>
          ${tran}
        </svg>
        ${crit ? '<div class="cctv-darkness"></div><div class="cctv-alarm-wash"></div><div class="cctv-alarm-light"></div>' : ''}
        ${badge}
      </div>`;
  }

  // ---------- SALA 2: NÚCLEO DEL REACTOR (ENERGÍA) ----------
  function renderReactorScene(st, uid = '') {
    const rossi = state.flags.engineer_saved === true && st === 'optimal';
    const energy = st === 'optimal' ? '#38bdf8' : st === 'degraded' ? '#fbbf24' : '#ef4444';
    const halo = st === 'optimal' ? '#fbbf24' : energy;

    let coils = '';
    [90, 640].forEach((cx) => {
      for (let i = 0; i < 5; i++) {
        coils += `<rect x="${cx}" y="${100 + i * 30}" width="80" height="18" rx="9" fill="#3f3f46" stroke="${energy}" stroke-width="2" opacity="${st === 'critical' && i % 2 ? 0.5 : 1}"/>`;
      }
    });

    const litCount = st === 'optimal' ? 12 : st === 'degraded' ? 6 : 2;
    const cellColor = st === 'optimal' ? '#22d3ee' : st === 'degraded' ? '#fbbf24' : '#ef4444';
    let cells = '';
    for (let i = 0; i < 12; i++) {
      const bank = i < 6 ? 0 : 1;
      const x = (bank === 0 ? 50 : 470) + (i % 6) * 46;
      const lit = i < litCount;
      cells += `
        <rect x="${x}" y="320" width="36" height="70" rx="4" fill="#18181b" stroke="#71717a" stroke-width="2"/>
        ${lit ? `<rect x="${x + 4}" y="${st === 'optimal' ? 326 : st === 'degraded' ? 352 : 372}" width="28" height="${st === 'optimal' ? 58 : st === 'degraded' ? 32 : 14}" rx="2" fill="${cellColor}" ${st === 'critical' ? 'class="warn-amber"' : ''} opacity="0.9"/>` : ''}`;
    }

    const arcs = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy], i) => {
      const ex = 400 + dx * 118;
      const ey = 190 + dy * 118;
      const bend = 22 + i * 4;
      return `<path class="plasma" d="M400 190 Q${400 + dx * 60 + dy * bend} ${190 + dy * 60 - dx * bend}, ${ex} ${ey}" stroke="${energy}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    }).join('');

    const sparks = st === 'critical' ? [[330, 120], [470, 260], [150, 200], [650, 190], [400, 330], [260, 300]]
      .map(([x, y]) => `<g class="spark"><polygon points="${x},${y - 12} ${x + 4},${y - 3} ${x + 13},${y} ${x + 4},${y + 3} ${x},${y + 12} ${x - 4},${y + 3} ${x - 13},${y} ${x - 4},${y - 3}" fill="#fde047"/></g>`).join('') : '';
    const smoke = st === 'critical' ? [[360, 150], [440, 160], [400, 120], [320, 190], [480, 190]]
      .map(([x, y]) => `<circle class="smoke" cx="${x}" cy="${y}" r="20" fill="#52525b" opacity="0.6"/>`).join('') : '';
    const warns = st === 'degraded' ? `
      <circle class="warn-amber" cx="40" cy="40" r="9" fill="#fbbf24"/><circle class="warn-amber" cx="760" cy="40" r="9" fill="#fbbf24" style="animation-delay:.45s"/>
      <circle class="warn-amber" cx="40" cy="290" r="7" fill="#fbbf24" style="animation-delay:.2s"/><circle class="warn-amber" cx="760" cy="290" r="7" fill="#fbbf24" style="animation-delay:.6s"/>` : '';

    const rossiFig = rossi ? `
      <g>
        <rect x="700" y="250" width="46" height="90" rx="14" fill="#e4e4e7" stroke="#a1a1aa" stroke-width="2"/>
        <rect x="700" y="250" width="13" height="18" rx="6" fill="#0ea5e9"/><rect x="733" y="250" width="13" height="18" rx="6" fill="#f59e0b"/>
        <circle cx="723" cy="228" r="21" fill="#f4f4f5" stroke="#a1a1aa" stroke-width="2.5"/>
        <rect x="709" y="217" width="28" height="19" rx="9" fill="#0369a1" stroke="#fbbf24" stroke-width="1.8"/>
        <g class="weld-arm"><rect x="648" y="262" width="44" height="10" rx="5" fill="#d4d4d8" stroke="#a1a1aa" stroke-width="1.5"/></g>
        <g class="weld-spark"><circle cx="644" cy="266" r="5" fill="#bae6fd"/><circle cx="634" cy="258" r="2.5" fill="#38bdf8"/><circle cx="636" cy="276" r="2.5" fill="#7dd3fc"/><circle cx="626" cy="266" r="2" fill="#e0f2fe"/></g>
      </g>` : '';

    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const crit = st === 'critical';
    let badge;
    if (crit) badge = isEn
      ? '<div class="cctv-badge cctv-badge-crit">[!] VOLTAGE DROP: DRAINING SHIELD (RULE 1)</div>'
      : '<div class="cctv-badge cctv-badge-crit">[!] CAÍDA DE TENSIÓN: DRENANDO ESCUDO (REGLA 1)</div>';
    else if (rossi) badge = isEn
      ? '<div class="cctv-badge cctv-badge-blue">[MAINT] ENG. ROSSI: ACTIVE MAINTENANCE</div>'
      : '<div class="cctv-badge cctv-badge-blue">[MANT] ING. ROSSI: MANTENIMIENTO ACTIVO</div>';
    else if (st === 'optimal') badge = isEn
      ? '<div class="cctv-badge cctv-badge-blue">[OK] STABLE CORE // CONTROLLED PLASMA</div>'
      : '<div class="cctv-badge cctv-badge-blue">[OK] NÚCLEO ESTABLE // PLASMA CONTROLADO</div>';
    else badge = isEn
      ? '<div class="cctv-badge cctv-badge-warn">[!] LOW CORE OUTPUT // BATTERIES HALF CHARGED</div>'
      : '<div class="cctv-badge cctv-badge-warn">[!] NÚCLEO EN RÉGIMEN BAJO // BATERÍAS A MEDIA CARGA</div>';

    return `
      <div class="cctv-scene" data-state="${st}">
        <svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="coreGrad${uid}" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="35%" stop-color="${halo}"/>
              <stop offset="100%" stop-color="${energy}" stop-opacity="0.1"/>
            </radialGradient>
            <linearGradient id="reactorWall${uid}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1d1d22"/><stop offset="100%" stop-color="#0b0b0e"/>
            </linearGradient>
          </defs>
          <rect width="800" height="420" fill="url(#reactorWall${uid})"/>
          <g stroke="#2c2c33" stroke-width="10"><line x1="0" y1="70" x2="800" y2="70"/><line x1="0" y1="300" x2="800" y2="300"/></g>
          <g stroke="#3f3f46" stroke-width="3" fill="none">
            <path d="M170 140 L280 190"/><path d="M170 230 L280 190"/><path d="M640 140 L520 190"/><path d="M640 230 L520 190"/>
          </g>
          <g class="${crit ? 'reactor-shake' : ''}">
            ${coils}
            <circle cx="400" cy="190" r="125" fill="none" stroke="#3f3f46" stroke-width="26"/>
            <circle cx="400" cy="190" r="125" fill="none" stroke="#71717a" stroke-width="2"/>
            <g class="ring-spin"><circle cx="400" cy="190" r="125" fill="none" stroke="${energy}" stroke-width="6" stroke-dasharray="26 18" opacity="0.95"/></g>
            <g class="ring-spin-rev"><circle cx="400" cy="190" r="92" fill="none" stroke="${halo}" stroke-width="4" stroke-dasharray="14 12"/></g>
            ${arcs}
            <circle class="reactor-core" cx="400" cy="190" r="44" fill="url(#coreGrad${uid})"/>
            <circle cx="400" cy="190" r="14" fill="#fff" opacity="0.9"/>
          </g>
          <rect x="0" y="395" width="800" height="25" fill="#131316"/>
          ${cells}
          ${warns}
          ${rossiFig}
          ${sparks}
          ${smoke}
        </svg>
        ${crit ? '<div class="cctv-alarm-wash"></div><div class="cctv-alarm-light"></div>' : ''}
        ${badge}
      </div>`;
  }

  // ---------- SALA 3: LABORATORIO DE ESCUDO (ESCUDO) ----------
  function renderShieldScene(st, uid = '') {
    const energy = st === 'optimal' ? '#a78bfa' : st === 'degraded' ? '#fbbf24' : '#ef4444';
    const energy2 = st === 'optimal' ? '#22d3ee' : energy;
    const crit = st === 'critical';
    const storm = state.sol === 3 || state.sol === 6;

    // Torres de bobinas electromagnéticas gigantes
    let towers = '';
    [90, 710].forEach((cx) => {
      towers += `<rect x="${cx - 12}" y="50" width="24" height="330" fill="#27272a" stroke="#52525b" stroke-width="2"/>`;
      for (let i = 0; i < 9; i++) {
        const dim = crit && i % 3 === 0 ? 0.25 : 0.95;
        towers += `<ellipse cx="${cx}" cy="${64 + i * 34}" rx="46" ry="11" fill="none" stroke="${energy}" stroke-width="${crit ? 2 : 4}" opacity="${dim}"/>`;
      }
      towers += `<rect x="${cx - 34}" y="372" width="68" height="22" rx="4" fill="#3f3f46" stroke="#a1a1aa" stroke-width="2"/>`;
    });

    // Descargas eléctricas en las bobinas (degradado y crítico)
    const zig = (x, y, d) => `M${x} ${y} l${d * 12} -9 l${d * -4} 14 l${d * 14} -10 l${d * -5} 13 l${d * 13} -8 l${d * -4} 12 l${d * 12} -7`;
    let zaps = '';
    if (st !== 'optimal') {
      zaps = `
        <path class="arc-zap" d="${zig(138, 150, 1)}" stroke="#fde68a" stroke-width="2.5" fill="none"/>
        <path class="arc-zap" d="${zig(138, 250, 1)}" stroke="#fde68a" stroke-width="2.5" fill="none" style="animation-delay:.2s"/>
        <path class="arc-zap" d="${zig(662, 180, -1)}" stroke="#fde68a" stroke-width="2.5" fill="none" style="animation-delay:.35s"/>
        <path class="arc-zap" d="${zig(662, 290, -1)}" stroke="#fde68a" stroke-width="2.5" fill="none" style="animation-delay:.1s"/>`;
    }

    // Proyector holográfico + base lunar en miniatura
    const hologram = `
      <polygon points="350,366 450,366 575,332 225,332" fill="url(#holoBeam${uid})" opacity="0.55"/>
      <ellipse cx="400" cy="368" rx="80" ry="12" fill="#3f3f46" stroke="#a1a1aa" stroke-width="2"/>
      <path d="M240 345 Q400 315 560 345 L560 356 L240 356 Z" fill="#3f3f46" stroke="${energy2}" stroke-width="1" opacity="0.85"/>
      <path d="M312 336 a18 18 0 0 1 36 0z M382 336 a26 26 0 0 1 52 0z M455 338 a16 16 0 0 1 32 0z" fill="rgba(161,161,170,0.55)" stroke="${energy2}" stroke-width="1.2"/>
      <line x1="408" y1="310" x2="408" y2="288" stroke="${energy2}" stroke-width="2"/>`;

    // Cúpula de fuerza
    let dome;
    if (st === 'optimal') {
      dome = `<path class="dome-solid" d="M235 345 A165 205 0 0 1 565 345 Z" fill="url(#domeGrad${uid})" stroke="${energy2}" stroke-width="3"/>`;
    } else if (st === 'degraded') {
      dome = `
        <g class="dome-flicker">
          <path d="M235 345 A165 205 0 0 1 565 345 Z" fill="url(#domeGrad${uid})" stroke="${energy}" stroke-width="3" opacity="0.8"/>
          <path d="M330 170 L352 210 L336 240 L362 285 M470 175 L452 215 L478 250 L456 292 M400 142 L408 188 L392 214" stroke="#fde68a" stroke-width="2" fill="none"/>
        </g>`;
    } else {
      dome = `
        <path d="M235 345 A165 205 0 0 1 565 345" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="38 74" opacity="0.65"/>
        <g class="spark"><polygon points="300,200 312,214 300,222 292,212" fill="#fca5a5"/></g>
        <g class="spark"><polygon points="500,190 510,206 498,214 490,204" fill="#fca5a5"/></g>`;
    }

    // Haces de radiación roja atravesando el techo (crítico)
    const beams = crit ? [300, 400, 505].map((x, i) =>
      `<polygon class="rad-beam" points="${x - 8},0 ${x + 8},0 ${x + 26 - i * 10},350 ${x - 22 + i * 8},350" fill="url(#beamGrad${uid})" style="animation-delay:${i * 0.15}s"/>`).join('') : '';

    // Partículas de viento solar: rebotan (óptimo), mezcla (degradado) o atraviesan (crítico)
    let wind = '';
    for (let i = 0; i < 12; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const th = ((18 + (i * 13) % 55) * Math.PI) / 180;
      const px = 400 + side * 165 * Math.sin(th);
      const py = 345 - 205 * Math.cos(th);
      let nx = (side * Math.sin(th)) / 165;
      let ny = Math.cos(th) / 205;
      const nl = Math.hypot(nx, ny);
      nx /= nl; ny /= nl;
      const sx = px + nx * 150;
      const sy = py + ny * 150;
      const pierces = st === 'critical' || (st === 'degraded' && i % 2 === 1);
      wind += `<circle class="wind-p ${pierces ? 'wind-pierce' : 'wind-deflect'}" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="3.6"
        fill="${pierces ? '#fb7185' : '#fde047'}"
        style="--dx:${(px - sx).toFixed(1)}px;--dy:${(py - sy).toFixed(1)}px;--rx:${(nx * 70).toFixed(1)}px;--ry:${(ny * 70).toFixed(1)}px;--px:${(px - sx - nx * 170).toFixed(1)}px;--py:${(py - sy - ny * 150).toFixed(1)}px;animation-delay:${(i * 0.23).toFixed(2)}s"/>`;
    }

    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const geiger = st === 'optimal' ? { txt: isEn ? '0.08 mSv/h // NORMAL' : '0.08 mSv/h // NORMAL', cls: 'geiger-ok' }
      : st === 'degraded' ? { txt: isEn ? '2.4 mSv/h // MODERATE RADIATION' : '2.4 mSv/h // RADIACIÓN MODERADA', cls: 'geiger-warn' }
      : { txt: isEn ? '18.6 mSv/h // DANGER' : '18.6 mSv/h // PELIGRO', cls: 'geiger-crit' };

    let badge;
    if (crit) badge = isEn
      ? '<div class="cctv-badge cctv-badge-crit">[DANGER] BIOLOGICAL RADIATION HAZARD</div>'
      : '<div class="cctv-badge cctv-badge-crit">[PELIGRO] BIOLÓGICO POR RADIACIÓN</div>';
    else if (st === 'degraded') badge = isEn
      ? '<div class="cctv-badge cctv-badge-warn">[!] UNSTABLE DOME // SHIELD MICRO-FRACTURES</div>'
      : '<div class="cctv-badge cctv-badge-warn">[!] CÚPULA INESTABLE // FISURAS EN EL ESCUDO</div>';
    else badge = isEn
      ? '<div class="cctv-badge cctv-badge-violet">[SHIELD] SOLID DOME // SOLAR WIND DEFLECTED</div>'
      : '<div class="cctv-badge cctv-badge-violet">[ESCUDO] CÚPULA SÓLIDA // VIENTO SOLAR DESVIADO</div>';
    if (storm && st !== 'critical') badge += isEn
      ? '<div class="cctv-badge cctv-badge-warn">[ALERT] SOLAR STORM: MAINTAIN SHIELD &gt; 60%</div>'
      : '<div class="cctv-badge cctv-badge-warn">[ALERTA] TORMENTA SOLAR: MANTENER ESCUDO &gt; 60%</div>';

    return `
      <div class="cctv-scene" data-state="${st}">
        <svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="shieldWall${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1b1b20"/><stop offset="100%" stop-color="#0a0a0d"/></linearGradient>
            <radialGradient id="domeGrad${uid}" cx="50%" cy="100%" r="90%">
              <stop offset="0%" stop-color="${energy2}" stop-opacity="0.05"/>
              <stop offset="70%" stop-color="${energy}" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="${energy2}" stop-opacity="0.5"/>
            </radialGradient>
            <linearGradient id="holoBeam${uid}" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="${energy2}" stop-opacity="0.5"/><stop offset="100%" stop-color="${energy2}" stop-opacity="0"/></linearGradient>
            <linearGradient id="beamGrad${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ef4444" stop-opacity="0.85"/><stop offset="100%" stop-color="#ef4444" stop-opacity="0.15"/></linearGradient>
          </defs>
          <rect width="800" height="420" fill="url(#shieldWall${uid})"/>
          <g stroke="#2a2a30" stroke-width="2"><line x1="0" y1="110" x2="800" y2="110"/><line x1="0" y1="220" x2="800" y2="220"/><line x1="0" y1="330" x2="800" y2="330"/></g>
          <rect x="0" y="394" width="800" height="26" fill="#131316"/>
          ${towers}
          ${hologram}
          ${dome}
          ${wind}
          ${beams}
          ${zaps}
        </svg>
        ${crit ? '<div class="cctv-alarm-wash"></div><div class="cctv-snow"></div>' : ''}
        <div class="geiger-box ${geiger.cls}"><span class="geiger-led"></span>GEIGER: ${geiger.txt}</div>
        <div class="cctv-badge-stack">${badge}</div>
      </div>`;
  }

  // ---------- SALA 4: PLANTA CRIOGÉNICA (OXÍGENO) ----------
  function renderLifeScene(st, uid = '') {
    const crit = st === 'critical';
    const dust = state.flags.lunar_dust_contamination;
    const vance = wasDecision('SOL1-C2', 'AUTHORIZE');
    const level = st === 'optimal' ? 0.85 : st === 'degraded' ? 0.5 : 0.1;
    const bubbleCount = st === 'optimal' ? 7 : st === 'degraded' ? 3 : 0;

    const tank = (x, w, y, h, id) => {
      const wx = x + 14, wy = y + 22, ww = w - 28, wh = h - 62;
      const lh = wh * level;
      let bub = '';
      for (let b = 0; b < bubbleCount; b++) {
        const bx = wx + 10 + ((b * 37 + id * 11) % Math.max(10, ww - 20));
        bub += `<circle class="bubble" cx="${bx}" cy="${wy + wh - 6}" r="${2.4 + (b % 3)}" fill="#cffafe" style="--rise:${(lh - 10).toFixed(0)}px;animation-delay:${(b * 0.45).toFixed(2)}s"/>`;
      }
      return `
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#26262b" stroke="#8b8b94" stroke-width="3"/>
        <rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="12" fill="#04141c" stroke="#67e8f9" stroke-width="2"/>
        <rect x="${wx + 2}" y="${wy + wh - lh}" width="${ww - 4}" height="${lh}" rx="9" fill="rgba(34,211,238,${crit ? 0.35 : 0.6})"/>
        ${bub}
        <rect x="${x + 10}" y="${y + h - 34}" width="${w - 20}" height="22" rx="4" fill="#0f0f12" stroke="#52525b" stroke-width="1.5"/>
        <circle cx="${x + w / 2}" cy="${y + 8}" r="9" fill="#09090b" stroke="#a1a1aa" stroke-width="2"/>
        <line x1="${x + w / 2}" y1="${y + 8}" x2="${x + w / 2 + (crit ? -5 : 5)}" y2="${y + (crit ? 12 : 3)}" stroke="${crit ? '#ef4444' : '#22d3ee'}" stroke-width="2"/>`;
    };

    const turbineMode = (idx) => {
      if (st === 'optimal') return idx === 0 ? 'turbine-fast' : 'turbine-fast';
      if (st === 'degraded') return idx === 0 ? 'turbine-mid' : 'turbine-slow';
      return idx === 0 ? 'turbine-stop' : 'turbine-slow';
    };
    const turbine = (cx, cy, idx) => {
      let blades = '';
      for (let i = 0; i < 6; i++) {
        blades += `<rect x="${cx - 6}" y="${cy - 52}" width="12" height="46" rx="5" fill="${dust ? '#a8a29e' : '#a1a1aa'}" transform="rotate(${i * 60} ${cx} ${cy})"/>`;
      }
      let extras = '';
      if (dust && !(crit && idx === 0)) {
        extras += `<g class="spark"><polygon points="${cx + 50},${cy - 10} ${cx + 58},${cy - 2} ${cx + 48},${cy + 2}" fill="#fde047"/></g>
                   <g class="spark" style="animation-delay:.25s"><polygon points="${cx - 50},${cy + 12} ${cx - 59},${cy + 6} ${cx - 48},${cy + 2}" fill="#fdba74"/></g>`;
      }
      if (crit && idx === 0) {
        [0, 1, 2, 3].forEach((k) => {
          extras += `<circle class="smoke" cx="${cx - 14 + k * 9}" cy="${cy - 40}" r="14" fill="#71717a" opacity="0.6"/>`;
        });
      }
      return `
        <circle cx="${cx}" cy="${cy}" r="66" fill="#18181b" stroke="#71717a" stroke-width="6"/>
        <circle cx="${cx}" cy="${cy}" r="58" fill="#0b0b0e" stroke="#3f3f46" stroke-width="2"/>
        <g class="turbine ${turbineMode(idx)}">${blades}</g>
        <circle cx="${cx}" cy="${cy}" r="11" fill="#52525b" stroke="#d4d4d8" stroke-width="2"/>
        ${extras}`;
    };

    // Filtros HEPA con rejillas (y polvo lunar si hay contaminación)
    let slats = '';
    for (let i = 0; i < 18; i++) {
      slats += `<line x1="${480 + i * 16}" y1="76" x2="${480 + i * 16}" y2="138" stroke="${dust ? '#7c4a3a' : '#71717a'}" stroke-width="5"/>`;
    }
    const dustClouds = dust ? [[500, 108], [560, 98], [620, 112], [680, 100], [540, 150], [650, 160]]
      .map(([x, y], i) => `<circle class="dust-cloud" cx="${x}" cy="${y}" r="${20 + (i % 3) * 7}" fill="${i % 2 ? '#78716c' : '#8a5a44'}" opacity="0.55" style="animation-delay:${(i * 0.6).toFixed(1)}s"/>`).join('') : '';

    // Tanque extra conectado (Marcus Vance, Sol 1)
    const extraTank = vance && !crit ? `
      <path class="flow-dash" d="M255 330 L255 372 L330 372" stroke="#22d3ee" stroke-width="4" fill="none"/>
      <rect x="196" y="190" width="62" height="170" rx="14" fill="#26262b" stroke="#22d3ee" stroke-width="3"/>
      <rect x="206" y="206" width="42" height="110" rx="9" fill="#04141c" stroke="#67e8f9" stroke-width="1.5"/>
      <rect x="208" y="238" width="38" height="76" rx="7" fill="rgba(34,211,238,0.6)"/>
      <circle class="bubble" cx="222" cy="308" r="2.6" fill="#cffafe" style="--rise:60px"/>
      <circle class="bubble" cx="236" cy="308" r="2.2" fill="#cffafe" style="--rise:60px;animation-delay:.8s"/>` : '';

    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    let badges = '';
    if (crit) badges += isEn ? '<div class="cctv-badge cctv-badge-crit">[!] HYPOXIA WARNING</div>' : '<div class="cctv-badge cctv-badge-crit">[!] ALERTA DE HIPOXIA</div>';
    if (dust) badges += isEn ? '<div class="cctv-badge cctv-badge-warn">[!] ALERT: REGOLITH CORROSION ON FILTERS</div>' : '<div class="cctv-badge cctv-badge-warn">[!] ALERTA: CORROSIÓN POR REGOLITO EN FILTROS</div>';
    if (!crit && vance) badges += isEn ? '<div class="cctv-badge cctv-badge-blue">[CRYO] EXTRA CRYO-LOX TANK CONNECTED</div>' : '<div class="cctv-badge cctv-badge-blue">[CRIO] TANQUE CRIO-LOX EXTRA CONECTADO</div>';
    if (!badges) badges = st === 'optimal'
      ? (isEn ? '<div class="cctv-badge cctv-badge-blue">[OK] CLEAN AIR // NOMINAL TURBINES</div>' : '<div class="cctv-badge cctv-badge-blue">[OK] AIRE LIMPIO // TURBINAS NOMINALES</div>')
      : (isEn ? '<div class="cctv-badge cctv-badge-warn">[!] LOW OXYGEN // SLOW TURBINES</div>' : '<div class="cctv-badge cctv-badge-warn">[!] OXÍGENO REDUCIDO // TURBINAS LENTAS</div>');

    return `
      <div class="cctv-scene" data-state="${st}">
        <svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lifeWall${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1b1d22"/><stop offset="100%" stop-color="#0a0b0d"/></linearGradient>
          </defs>
          <rect width="800" height="420" fill="url(#lifeWall${uid})"/>
          <g stroke="#2a2c32" stroke-width="2"><line x1="0" y1="60" x2="800" y2="60"/><line x1="0" y1="200" x2="800" y2="200"/></g>
          <rect x="0" y="394" width="800" height="26" fill="#131316"/>
          <g stroke="#52525b" stroke-width="7" fill="none">
            <path d="M105 372 L105 392 L760 392"/><path d="M335 372 L335 392"/><path d="M640 312 L640 392"/><path d="M500 312 L500 392"/>
          </g>
          ${tank(50, 120, 100, 272, 1)}
          ${extraTank}
          ${tank(290, 120, 100, 272, 2)}
          <rect x="470" y="62" width="300" height="94" rx="8" fill="#1d1d22" stroke="#8b8b94" stroke-width="3"/>
          ${slats}
          ${dustClouds}
          ${turbine(540, 262, 0)}
          ${turbine(700, 262, 1)}
        </svg>
        ${crit ? '<div class="cctv-frost"></div><div class="cctv-alarm-wash"></div>' : ''}
        <div class="cctv-badge-stack">${badges}</div>
      </div>`;
  }

  const CCTV_ROOMS = {
    o2: {
      cam: 'CAM-04',
      shortTitle: (isEn) => isEn ? 'OXYGEN' : 'OXÍGENO',
      title: (isEn) => isEn ? 'CRYOGENIC OXYGEN PLANT' : 'PLANTA CRIOGÉNICA DE OXÍGENO',
      resName: (isEn) => isEn ? 'OXYGEN' : 'OXÍGENO',
      render: renderLifeScene
    },
    rad: {
      cam: 'CAM-03',
      shortTitle: (isEn) => isEn ? 'SHIELD' : 'ESCUDO',
      title: (isEn) => isEn ? 'RADIATION SHIELD LAB' : 'LABORATORIO DE ESCUDO',
      resName: (isEn) => isEn ? 'SHIELD' : 'ESCUDO',
      render: renderShieldScene
    },
    pwr: {
      cam: 'CAM-02',
      shortTitle: (isEn) => isEn ? 'POWER' : 'ENERGÍA',
      title: (isEn) => isEn ? 'POWER REACTOR CORE' : 'NÚCLEO DEL REACTOR DE ENERGÍA',
      resName: (isEn) => isEn ? 'POWER' : 'ENERGÍA',
      render: renderReactorScene
    },
    food: {
      cam: 'CAM-01',
      shortTitle: (isEn) => isEn ? 'FOOD' : 'COMIDA',
      title: (isEn) => isEn ? 'HYDROPONIC FOOD BIODOME' : 'BIODOMO DE COMIDA',
      resName: (isEn) => isEn ? 'FOOD' : 'COMIDA',
      render: renderBiodomeScene
    }
  };

  // Vista en miniatura (2x2) del estado de las 4 cámaras para el reporte nocturno
  function renderNightCctvGrid() {
    const host = document.getElementById('night-cctv-grid');
    if (!host) return;
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    host.innerHTML = ['food', 'pwr', 'rad', 'o2'].map((key) => {
      const room = CCTV_ROOMS[key];
      const val = Math.max(0, Math.min(100, state.resources[key]));
      const st = cctvStateFor(key, val);
      const shortTitle = typeof room.shortTitle === 'function' ? room.shortTitle(isEn) : room.shortTitle;
      return `
        <div class="cctv-mini-cell" data-state="${st}">
          <div class="cctv-mini-stage">${room.render(st, 'n' + key)}</div>
          <div class="cctv-mini-caption">
            <span>${room.cam} // ${shortTitle}</span>
            <span class="${CCTV_STATE_COLOR[st]}">${getCctvStateLabel(st)} ${val}%</span>
          </div>
        </div>`;
    }).join('');
  }

  const cctv = { open: false, room: 'food', clockTimer: null, sigs: {} };

  function cctvSignature(key) {
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const st = cctvStateFor(key, state.resources[key]);
    const storm = state.sol === 3 || state.sol === 6;
    return [st, isEn, wasDecision('SOL1-C1', 'AUTHORIZE'), wasDecision('SOL1-C2', 'AUTHORIZE'),
      state.flags.engineer_saved, state.flags.lunar_dust_contamination, storm].join('|');
  }

  function refreshCctv(force = false) {
    const modal = document.getElementById('cctv-modal');
    if (!modal) return;
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    Object.keys(CCTV_ROOMS).forEach((key) => {
      const room = CCTV_ROOMS[key];
      const val = Math.max(0, Math.min(100, state.resources[key]));
      const st = cctvStateFor(key, val);
      const roomEl = document.getElementById(`cctv-room-${key}`);
      const tab = document.querySelector(`[data-cctv-tab="${key}"]`);
      const tabVal = document.getElementById(`cctv-tab-val-${key}`);

      if (tab) {
        tab.dataset.state = st;
        tab.classList.toggle('active', key === cctv.room);
      }
      if (tabVal) tabVal.textContent = `${val}%`;

      if (roomEl) {
        if (room.render) {
          const sig = cctvSignature(key);
          if (force || cctv.sigs[key] !== sig) {
            roomEl.innerHTML = room.render(st);
            cctv.sigs[key] = sig;
          }
        }
        roomEl.classList.toggle('hidden', key !== cctv.room);
      }
    });

    const cur = CCTV_ROOMS[cctv.room];
    const curVal = Math.max(0, Math.min(100, state.resources[cctv.room]));
    const curState = cctvStateFor(cctv.room, curVal);
    document.getElementById('cctv-cam-id').textContent = cur.cam;
    const roomTitle = typeof cur.title === 'function' ? cur.title(isEn) : cur.title;
    const resName = typeof cur.resName === 'function' ? cur.resName(isEn) : cur.resName;
    document.getElementById('cctv-status-room').textContent = isEn
      ? `ROOM: ${roomTitle}  //  ${resName}: ${curVal}%`
      : `SALA: ${roomTitle}  //  ${resName}: ${curVal}%`;
    const stateEl = document.getElementById('cctv-status-state');
    stateEl.textContent = `${isEn ? 'STATUS' : 'ESTADO'}: ${getCctvStateLabel(curState)}`;
    stateEl.className = `font-black uppercase ${CCTV_STATE_COLOR[curState]}`;
  }

  function refreshCctvIfOpen() {
    if (cctv.open) refreshCctv(false);
  }

  function updateCctvClock() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const el = document.getElementById('cctv-clock');
    if (el) el.textContent = `SOL ${state.sol} // ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} LST`;
  }

  function openCctv(roomKey = 'food') {
    if (!titleScreenModal.classList.contains('hidden')) return;
    cctv.room = CCTV_ROOMS[roomKey] ? roomKey : 'food';
    cctv.open = true;
    document.getElementById('cctv-modal').classList.remove('hidden');
    refreshCctv(true);
    updateCctvClock();
    updateCctvIncidentBanner();
    if (cctv.clockTimer) clearInterval(cctv.clockTimer);
    cctv.clockTimer = setInterval(updateCctvClock, 1000);
    sfx.playGrab();
  }

  function closeCctv() {
    cctv.open = false;
    document.getElementById('cctv-modal').classList.add('hidden');
    if (cctv.clockTimer) {
      clearInterval(cctv.clockTimer);
      cctv.clockTimer = null;
    }
    sfx.playGrab();
  }

  function initCctv() {
    ['o2', 'rad', 'pwr', 'food'].forEach((key) => {
      const card = document.getElementById(`res-card-${key}`);
      if (card) {
        card.addEventListener('click', () => {
          openCctv(key);
        });
      }
    });

    document.querySelectorAll('.cctv-card-link').forEach((card) => {
      card.addEventListener('click', () => {
        const key = card.id.replace('res-card-', '');
        openCctv(key);
      });
    });
    const generalBtn = document.getElementById('cctv-open-btn');
    if (generalBtn) generalBtn.addEventListener('click', () => openCctv(cctv.room));
    document.getElementById('cctv-close-btn').addEventListener('click', closeCctv);
    document.querySelectorAll('[data-cctv-tab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        cctv.room = tab.dataset.cctvTab;
        refreshCctv(false);
        sfx.playGrab();
      });
    });
    document.getElementById('cctv-modal').addEventListener('click', (e) => {
      if (e.target.id === 'cctv-modal') closeCctv();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && cctv.open) closeCctv();
    });
  }


  // =======================================================================
  // 16. SISTEMA DE TUTORIAL INTERACTIVO CON RECORTE DE ENFOQUE (SPOTLIGHT)
  // =======================================================================
  const tutorialOverlay = document.getElementById('tutorial-overlay');
  const tutTop = document.getElementById('tut-top');
  const tutBottom = document.getElementById('tut-bottom');
  const tutLeft = document.getElementById('tut-left');
  const tutRight = document.getElementById('tut-right');
  const tutCutoutCatcher = document.getElementById('tut-cutout-catcher');
  const tutHighlightBox = document.getElementById('tut-highlight-box');
  const tutTooltip = document.getElementById('tut-tooltip');
  const tutStepCounter = document.getElementById('tut-step-counter');
  const tutTitle = document.getElementById('tut-title');
  const tutDesc = document.getElementById('tut-desc');
  const tutSkipBtn = document.getElementById('tut-skip-btn');

  class SpotlightTutorial {
    constructor() {
      this.sequence = null;
      this.currentIndex = 0;
      this.active = false;
      this.setupEvents();
    }

    setupEvents() {
      if (!tutorialOverlay) return;

      tutorialOverlay.addEventListener('click', (e) => {
        if (!this.active) return;
        if (e.target.closest('#tut-skip-btn')) {
          sfx.init();
          sfx.playGrab();
          this.stop();
          return;
        }
        sfx.init();
        sfx.playMenuSelect();
        this.next();
      });

      window.addEventListener('resize', () => {
        if (this.active) {
          this.renderCurrentStep();
        }
      });
    }

    isActive() {
      return this.active;
    }

    start(sequence) {
      if (!sequence || sequence.length === 0 || !tutorialOverlay) return;
      this.sequence = sequence;
      this.currentIndex = 0;
      this.active = true;
      tutorialOverlay.classList.remove('hidden');
      requestAnimationFrame(() => {
        this.renderCurrentStep();
      });
    }

    stop() {
      this.active = false;
      this.sequence = null;
      this.currentIndex = 0;
      if (tutorialOverlay) {
        tutorialOverlay.classList.add('hidden');
      }
    }

    next() {
      if (!this.active || !this.sequence) return;
      this.currentIndex++;
      if (this.currentIndex < this.sequence.length) {
        this.renderCurrentStep();
      } else {
        this.stop();
      }
    }

    computeTargetRect(targetSpec) {
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      if (Array.isArray(targetSpec)) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let found = false;
        for (const sel of targetSpec) {
          const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
          if (el) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              minX = Math.min(minX, r.left);
              minY = Math.min(minY, r.top);
              maxX = Math.max(maxX, r.right);
              maxY = Math.max(maxY, r.bottom);
              found = true;
            }
          }
        }
        if (found) {
          return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
        }
      } else if (typeof targetSpec === 'string') {
        const el = document.querySelector(targetSpec);
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            return { left: r.left, top: r.top, width: r.width, height: r.height };
          }
        }
      } else if (typeof targetSpec === 'function') {
        const r = targetSpec();
        if (r) return r;
      }

      return { left: winW * 0.15, top: winH * 0.2, width: winW * 0.7, height: winH * 0.5 };
    }

    renderCurrentStep() {
      if (!this.active || !this.sequence || !tutorialOverlay) return;
      const step = this.sequence[this.currentIndex];
      if (!step) return;

      const isEn = window.GAME_SETTINGS?.lang === 'en';
      if (tutStepCounter) {
        tutStepCounter.textContent = isEn
          ? `STEP ${this.currentIndex + 1} / ${this.sequence.length}`
          : `PASO ${this.currentIndex + 1} / ${this.sequence.length}`;
      }
      if (tutSkipBtn) {
        tutSkipBtn.textContent = isEn ? '[ SKIP TUTORIAL ]' : '[ SALTAR TUTORIAL ]';
      }
      if (tutTitle) {
        tutTitle.textContent = step.title;
      }
      if (tutDesc) {
        tutDesc.textContent = step.desc;
      }

      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const rawRect = this.computeTargetRect(step.target);
      const pad = step.pad !== undefined ? step.pad : 10;

      const x1 = Math.max(0, Math.floor(rawRect.left - pad));
      const y1 = Math.max(0, Math.floor(rawRect.top - pad));
      const x2 = Math.min(winW, Math.ceil(rawRect.left + rawRect.width + pad));
      const y2 = Math.min(winH, Math.ceil(rawRect.top + rawRect.height + pad));
      const w = Math.max(10, x2 - x1);
      const h = Math.max(10, y2 - y1);

      if (tutTop) tutTop.style.height = `${y1}px`;
      if (tutBottom) {
        tutBottom.style.top = `${y2}px`;
        tutBottom.style.height = `${Math.max(0, winH - y2)}px`;
      }
      if (tutLeft) {
        tutLeft.style.top = `${y1}px`;
        tutLeft.style.width = `${x1}px`;
        tutLeft.style.height = `${h}px`;
      }
      if (tutRight) {
        tutRight.style.top = `${y1}px`;
        tutRight.style.left = `${x2}px`;
        tutRight.style.width = `${Math.max(0, winW - x2)}px`;
        tutRight.style.height = `${h}px`;
      }

      if (tutCutoutCatcher) {
        tutCutoutCatcher.style.top = `${y1}px`;
        tutCutoutCatcher.style.left = `${x1}px`;
        tutCutoutCatcher.style.width = `${w}px`;
        tutCutoutCatcher.style.height = `${h}px`;
      }

      if (tutHighlightBox) {
        tutHighlightBox.style.top = `${y1}px`;
        tutHighlightBox.style.left = `${x1}px`;
        tutHighlightBox.style.width = `${w}px`;
        tutHighlightBox.style.height = `${h}px`;
      }

      if (tutTooltip) {
        const tipW = tutTooltip.offsetWidth || 380;
        const tipH = tutTooltip.offsetHeight || 190;
        let tipTop = 0;
        let tipLeft = 0;

        const spaceBelow = winH - y2;
        const spaceAbove = y1;
        const spaceRight = winW - x2;
        const spaceLeft = x1;

        if (spaceBelow >= tipH + 20) {
          tipTop = y2 + 14;
          tipLeft = Math.min(Math.max(16, x1 + (w - tipW) / 2), winW - tipW - 16);
        } else if (spaceAbove >= tipH + 20) {
          tipTop = y1 - tipH - 14;
          tipLeft = Math.min(Math.max(16, x1 + (w - tipW) / 2), winW - tipW - 16);
        } else if (spaceRight >= tipW + 20) {
          tipLeft = x2 + 14;
          tipTop = Math.min(Math.max(16, y1 + (h - tipH) / 2), winH - tipH - 16);
        } else if (spaceLeft >= tipW + 20) {
          tipLeft = x1 - tipW - 14;
          tipTop = Math.min(Math.max(16, y1 + (h - tipH) / 2), winH - tipH - 16);
        } else {
          tipTop = Math.max(16, Math.min(winH - tipH - 16, y2 - tipH - 14));
          tipLeft = Math.max(16, Math.min(winW - tipW - 16, (winW - tipW) / 2));
        }

        tipTop = Math.max(12, Math.min(tipTop, winH - tipH - 12));
        tipLeft = Math.max(12, Math.min(tipLeft, winW - tipW - 12));

        tutTooltip.style.top = `${tipTop}px`;
        tutTooltip.style.left = `${tipLeft}px`;
      }
    }
  }

  const tutorialManager = new SpotlightTutorial();

  function startHangarTutorial() {
    const isEn = window.GAME_SETTINGS?.lang === 'en';
    tutorialManager.start(isEn ? [
      {
        target: '#hangar-summary-card',
        title: 'YOUR BUDGET & RESERVES',
        desc: 'On the Moon your 4 vital systems start at 20%. Use your budget millions to purchase supply crates before launch.',
        pad: 6
      },
      {
        target: '#hangar-supplies-grid',
        title: 'CHOOSE YOUR SUPPLIES',
        desc: 'Each crate costs $100M and increases that resource by +15%. Drag crates with the mouse to the rocket (or click them) to load.',
        pad: 12
      },
      {
        target: '#rocket-drop-zone',
        title: 'CARGO HOLD & LAUNCH',
        desc: 'Here you will see loaded modules (click one to remove). When finished, press the red IGNITION button to launch to the Moon.',
        pad: 12
      }
    ] : [
      {
        target: '#hangar-summary-card',
        title: 'TU PRESUPUESTO Y RESERVAS',
        desc: 'En la Luna tus 4 sistemas empiezan al 20%. Usa los millones de tu presupuesto para comprar cajas de ayuda antes de despegar.',
        pad: 6
      },
      {
        target: '#hangar-supplies-grid',
        title: 'ELIGE TUS SUMINISTROS',
        desc: 'Cada caja cuesta $100M y sube +15% ese recurso. Arrastra las cajas con el mouse hacia la nave (o haz clic sobre ellas) para cargarlas.',
        pad: 12
      },
      {
        target: '#rocket-drop-zone',
        title: 'BODEGA DE LA NAVE Y DESPEGUE',
        desc: 'Aquí verás las cajas cargadas (haz clic en una si quieres sacarla). Cuando termines de armar tu carga, presiona el botón rojo de IGNICIÓN para viajar a la Luna.',
        pad: 12
      }
    ]);
  }

  function startAirlockTutorial() {
    const isEn = window.GAME_SETTINGS?.lang === 'en';
    tutorialManager.start(isEn ? [
      {
        target: '#main-resource-header',
        title: 'THE 4 VITAL SYSTEMS & CAMERAS',
        desc: `Keep Oxygen, Shield, Power, and Food above 0% across all ${state.maxSols} Sols of your mission. Click [CCTV VIEW MODULE] anytime to inspect the base interior.`,
        pad: 8
      },
      {
        target: '#airlock-viewport-panel',
        title: 'AIRLOCK VISITORS',
        desc: 'Each turn an astronaut or rover arrives requesting entry or energy. Read carefully what they need.',
        pad: 10
      },
      {
        target: '#solar-radar-monitor-panel',
        title: 'SOLAR WEATHER & NASA TELEMETRY',
        desc: 'Always monitor this panel. It displays live solar weather via NASA DONKI API, nearby asteroids, and station alerts.',
        pad: 10
      },
      {
        target: ['#draggable-dossier', '#draggable-crate'],
        title: 'DOCUMENTS & CARGO TO INSPECT',
        desc: 'Here you see what the visitor claims to carry. Watch out: manifests may contain forged signatures or crates may be damaged.',
        pad: 14
      },
      {
        target: ['#manual-book-trigger', '#draggable-scanner'],
        title: 'YOUR INSPECTION TOOLS',
        desc: 'Drag the CYAN VISOR over the tablet for UV light secrets, and over the crate for X-Ray internal scans. Open the yellow Manual if in doubt.',
        pad: 14
      },
      {
        target: ['#stamp-approve, #stamp-authorize', '#stamp-deny'],
        title: 'MAKE YOUR FINAL DECISION',
        desc: 'When ready, drag the green stamp (APPROVE) or red stamp (DENY) onto the Manifest to stamp it.',
        pad: 14
      }
    ] : [
      {
        target: '#main-resource-header',
        title: 'LOS 4 SISTEMAS VITALES Y CÁMARAS',
        desc: `Mantén Oxígeno, Escudo, Energía y Comida por encima de 0% durante los ${state.maxSols} Soles de tu misión. Haz clic en [CCTV VER MÓDULO] cuando quieras ver el interior de la base.`,
        pad: 8
      },
      {
        target: '#airlock-viewport-panel',
        title: 'SOLICITANTES EN LA ESCLUSA',
        desc: 'Cada turno llegará un astronauta o vehículo pidiendo permiso para entrar o usar energía. Lee con atención qué necesita.',
        pad: 10
      },
      {
        target: '#solar-radar-monitor-panel',
        title: 'CLIMA SOLAR Y TELEMETRÍA NASA',
        desc: 'Revisa siempre este monitor. Te muestra el clima solar en vivo con la API DONKI de la NASA, asteroides cercanos y el estado de la estación.',
        pad: 10
      },
      {
        target: ['#draggable-dossier', '#draggable-crate'],
        title: 'DOCUMENTOS Y CARGA A INSPECCIONAR',
        desc: 'Aquí ves lo que el visitante dice traer. Pero cuidado: a veces los papeles tienen errores o las cajas vienen dañadas.',
        pad: 14
      },
      {
        target: ['#manual-book-trigger', '#draggable-scanner'],
        title: 'TUS HERRAMIENTAS DE INSPECCIÓN',
        desc: 'Arrastra el VISOR CIAN encima del papel para ver secretos con Luz UV, y pásalo sobre la caja para ver su interior con Rayos-X. Abre el Manual amarillo si tienes dudas.',
        pad: 14
      },
      {
        target: ['#stamp-approve, #stamp-authorize', '#stamp-deny'],
        title: 'TOMA TU DECISIÓN FINAL',
        desc: 'Cuando decidas, arrastra el sello verde (AUTORIZAR) o el sello rojo (DENEGAR) y suéltalo encima del Manifiesto para sellarlo.',
        pad: 14
      }
    ]);
  }

  // =======================================================================
  // 17. SISTEMA DE EMERGENCIAS Y MICRO-JUEGOS ESTILO WARIOWARE
  // =======================================================================
  const emergencyModal = document.getElementById('emergency-minigame-modal');
  const emergencyScream = document.getElementById('emergency-scream');
  const emergencyDesc = document.getElementById('emergency-desc');
  const emergencyArena = document.getElementById('emergency-minigame-arena');
  const emergencyTimerText = document.getElementById('emergency-timer-text');
  const emergencyTimerBar = document.getElementById('emergency-timer-bar');
  const emergencyResultBanner = document.getElementById('emergency-result-banner');
  const emergencySystemBadge = document.getElementById('emergency-system-badge');
  const emergencySubsystemTitle = document.getElementById('emergency-subsystem-title');
  const disasterBlackoutOverlay = document.getElementById('disaster-blackout-overlay');
  const disasterFrostOverlay = document.getElementById('disaster-frost-overlay');
  const disasterCrackOverlay = document.getElementById('disaster-crack-overlay');
  const disasterSmokeOverlay = document.getElementById('disaster-smoke-overlay');

  function updateCctvIncidentBanner() {
    const el = document.getElementById('cctv-last-incident');
    if (!el) return;
    const isEn = window.GAME_SETTINGS?.lang === 'en';
    if (state.lastIncident) {
      const incPrefix = isEn ? 'LAST INCIDENT:' : 'ÚLTIMO INCIDENTE:';
      const critPrefix = isEn ? 'CRITICAL ALERT' : 'ALERTA CRÍTICA';
      el.innerHTML = `<span class="inline-flex items-center gap-1.5 text-rose-400 font-bold"><svg class="w-3.5 h-3.5 inline-block text-rose-500 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>${incPrefix} ${state.lastIncident.title} (SOL ${state.lastIncident.sol}) - ${critPrefix} (-${state.lastIncident.penalty}% ${state.lastIncident.resourceName || ''})</span>`;
    } else {
      const nomMsg = isEn ? 'CAMERA STATUS: SYSTEMS NOMINAL' : 'ESTADO DE CÁMARAS: SISTEMAS NOMINALES';
      el.innerHTML = `<span class="text-emerald-400 font-bold inline-flex items-center gap-1"><svg class="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>${nomMsg}</span>`;
    }
  }

  const EMERGENCY_CONFIG = {
    cadet: {
      prob: 0.60,
      timeLimitSec: 9.0,
      rewardPct: 10,
      penaltyPct: 15,
      label: 'CADETE (9.0s)'
    },
    engineer: {
      prob: 0.60,
      timeLimitSec: 7.5,
      rewardPct: 10,
      penaltyPct: 20,
      label: 'INGENIERO (7.5s)'
    },
    commander: {
      prob: 0.60,
      timeLimitSec: 6.0,
      rewardPct: 10,
      penaltyPct: 25,
      label: 'COMANDANTE (6.0s)'
    }
  };

  let emergencyScheduledTimer = null;
  let isEmergencyActive = false;
  let emergencyTriggeredThisCase = false;
  let emergencyAnimFrame = null;
  let emergencyResolveTimer = null;
  let currentMinigameCleanup = null;

  // Plan de Emergencias por Sol: garantiza máx 1 minijuego por Sol, respeta getMinigameProbability() (0% a 100%)
  let minigameTriggeredThisSol = false;

  let currentSolEmergencyPlan = {
    sol: -1,
    shouldTrigger: false,
    targetCaseIndex: 0
  };

  function prepareSolEmergencyPlan(solNum, forceRecalc = false) {
    if (!forceRecalc && currentSolEmergencyPlan.sol === solNum) {
      return currentSolEmergencyPlan;
    }
    const prob = getMinigameProbability();
    let shouldTrigger = false;
    if (prob >= 1.0) {
      shouldTrigger = true;
    } else if (prob <= 0.0) {
      shouldTrigger = false;
    } else {
      shouldTrigger = Math.random() < prob;
    }

    // Elegir al azar en cuál de los 2 casos del Sol ocurrirá (0 o 1)
    const targetCaseIndex = Math.random() < 0.5 ? 0 : 1;

    currentSolEmergencyPlan = {
      sol: solNum,
      shouldTrigger: shouldTrigger,
      targetCaseIndex: targetCaseIndex
    };

    if (!forceRecalc) {
      minigameTriggeredThisSol = false;
    } else if (prob >= 1.0 && !minigameTriggeredThisSol) {
      currentSolEmergencyPlan.shouldTrigger = true;
    }
    return currentSolEmergencyPlan;
  }
  window.prepareSolEmergencyPlan = prepareSolEmergencyPlan;

  function checkAndTriggerEmergencyAfterDecision() {
    if (isEmergencyActive) return false;
    if (currentSolEmergencyPlan.sol !== state.sol) {
      prepareSolEmergencyPlan(state.sol);
    }
    const shouldTriggerThisSol = currentSolEmergencyPlan.shouldTrigger;
    const isTargetCase = (state.caseInSol === currentSolEmergencyPlan.targetCaseIndex);
    const isLastCaseInSol = (state.caseInSol === 1);

    if (shouldTriggerThisSol && !minigameTriggeredThisSol && (isTargetCase || isLastCaseInSol)) {
      minigameTriggeredThisSol = true;
      currentSolEmergencyPlan.triggered = true;
      setTimeout(() => {
        if (!isEmergencyActive) {
          triggerRandomEmergencyMinigame();
        }
      }, 420);
      return true;
    }
    return false;
  }
  window.checkAndTriggerEmergencyAfterDecision = checkAndTriggerEmergencyAfterDecision;

  function scheduleCaseEmergency() {
    if (currentSolEmergencyPlan.sol !== state.sol) {
      prepareSolEmergencyPlan(state.sol);
    }
  }

  function startEmergencyCountdown(timeLimitSec, onTimeout) {
    const startTime = performance.now();
    const totalMs = timeLimitSec * 1000;
    let lastTick = -1;

    function tick() {
      if (!isEmergencyActive) return;
      const now = performance.now();
      const elapsed = now - startTime;
      const remainingMs = Math.max(0, totalMs - elapsed);
      const remainingSec = remainingMs / 1000;

      if (emergencyTimerText) {
        emergencyTimerText.textContent = remainingSec.toFixed(2) + 's';
        if (remainingSec < 2.0) {
          emergencyTimerText.className = 'text-lg md:text-xl font-black font-mono tracking-wider text-rose-500 animate-pulse';
        } else {
          emergencyTimerText.className = 'text-lg md:text-xl font-black font-mono tracking-wider text-rose-400';
        }
      }

      if (emergencyTimerBar) {
        const pct = (remainingMs / totalMs) * 100;
        emergencyTimerBar.style.width = pct + '%';
        if (pct < 30) {
          emergencyTimerBar.className = 'h-full bg-rose-500 transition-all duration-75';
        } else if (pct < 60) {
          emergencyTimerBar.className = 'h-full bg-amber-400 transition-all duration-75';
        } else {
          emergencyTimerBar.className = 'h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-75';
        }
      }

      const tickInterval = remainingSec < 2.0 ? 190 : 480;
      const currentTickPeriod = Math.floor(elapsed / tickInterval);
      if (currentTickPeriod > lastTick) {
        lastTick = currentTickPeriod;
        sfx.playTimerTick(remainingSec < 2.0);
      }

      if (remainingMs <= 0) {
        onTimeout();
        return;
      }

      emergencyAnimFrame = requestAnimationFrame(tick);
    }

    emergencyAnimFrame = requestAnimationFrame(tick);
  }

  function renderWireMinigame(container, onComplete) {
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const WIRE_COLORS = [
      { id: 'red', name: isEn ? 'RED' : 'ROJO', hex: '#ef4444', border: '#f87171', glow: 'rgba(239,68,68,0.6)' },
      { id: 'amber', name: isEn ? 'AMBER' : 'ÁMBAR', hex: '#f59e0b', border: '#fbbf24', glow: 'rgba(245,158,11,0.6)' },
      { id: 'cyan', name: isEn ? 'CYAN' : 'CIAN', hex: '#06b6d4', border: '#38bdf8', glow: 'rgba(6,182,212,0.6)' }
    ];

    const leftList = [...WIRE_COLORS].sort(() => Math.random() - 0.5);
    let rightList = [...WIRE_COLORS].sort(() => Math.random() - 0.5);
    if (leftList.every((c, i) => c.id === rightList[i].id)) {
      rightList = [rightList[1], rightList[2], rightList[0]];
    }

    container.innerHTML = `
      <div id="wire-board" class="w-full h-full flex items-center justify-between px-3 md:px-8 relative select-none" style="min-height: 220px;">
        <svg id="wire-svg-canvas" class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 15;">
          <g id="wire-paths-done"></g>
          <path id="wire-active-drag-path" stroke-width="7" stroke-linecap="round" fill="none" class="hidden"></path>
        </svg>

        <!-- Columna Izquierda -->
        <div class="flex flex-col justify-around h-full space-y-3 z-20">
          ` + leftList.map(c => `
            <div class="wire-port wire-port-left flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-700/50 hover:border-zinc-500 cursor-pointer transition-all select-none group" data-side="left" data-color="` + c.id + `" data-hex="` + c.hex + `">
              <div class="w-10 h-10 rounded-xl bg-zinc-950 border-2 flex items-center justify-center p-1.5 shadow-md pointer-events-none transition-transform group-hover:scale-105" style="border-color: ` + c.border + `; box-shadow: 0 0 10px ` + c.glow + `;">
                <div class="w-4 h-4 rounded-full" style="background-color: ` + c.hex + `;"></div>
              </div>
              <span class="text-[0.68rem] font-black font-mono tracking-wider pointer-events-none" style="color: ` + c.border + `;">` + c.name + `</span>
              <div class="wire-pin w-5 h-5 rounded-full border-2 border-white/60 bg-zinc-950 flex items-center justify-center pointer-events-none ml-auto" style="box-shadow: 0 0 8px ` + c.hex + `;">
                <div class="wire-pin-led w-2 h-2 rounded-full" style="background-color: ` + c.hex + `;"></div>
              </div>
            </div>
          `).join('') + `
        </div>

        <!-- Columna Derecha -->
        <div class="flex flex-col justify-around h-full space-y-3 z-20">
          ` + rightList.map(c => `
            <div class="wire-port wire-port-right flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-700/50 hover:border-zinc-500 cursor-pointer transition-all select-none group" data-side="right" data-color="` + c.id + `" data-hex="` + c.hex + `">
              <div class="wire-pin w-5 h-5 rounded-full border-2 border-white/60 bg-zinc-950 flex items-center justify-center pointer-events-none mr-auto" style="box-shadow: 0 0 8px ` + c.hex + `;">
                <div class="wire-pin-led w-2 h-2 rounded-full bg-zinc-700"></div>
              </div>
              <span class="text-[0.68rem] font-black font-mono tracking-wider pointer-events-none" style="color: ` + c.border + `;">` + c.name + `</span>
              <div class="w-10 h-10 rounded-xl bg-zinc-950 border-2 flex items-center justify-center p-1.5 shadow-md pointer-events-none transition-transform group-hover:scale-105" style="border-color: ` + c.border + `; box-shadow: 0 0 10px ` + c.glow + `;">
                <div class="w-4 h-4 rounded-full" style="background-color: ` + c.hex + `;"></div>
              </div>
            </div>
          `).join('') + `
        </div>
      </div>
    `;

    const connectedColors = new Set();
    let activeDrag = null;
    const svgCanvas = container.querySelector('#wire-svg-canvas');
    const pathsDoneGroup = container.querySelector('#wire-paths-done');
    const activeDragPath = container.querySelector('#wire-active-drag-path');

    function getCoordsFromPointer(e) {
      const canvasRect = svgCanvas.getBoundingClientRect();
      const scale = window.GAME_SCALE || 1;
      return {
        x: (e.clientX - canvasRect.left) / scale,
        y: (e.clientY - canvasRect.top) / scale
      };
    }

    function getPortPinCoords(portEl) {
      const pin = portEl.querySelector('.wire-pin');
      const pinRect = (pin || portEl).getBoundingClientRect();
      const canvasRect = svgCanvas.getBoundingClientRect();
      const scale = window.GAME_SCALE || 1;
      return {
        x: (pinRect.left + pinRect.width / 2 - canvasRect.left) / scale,
        y: (pinRect.top + pinRect.height / 2 - canvasRect.top) / scale
      };
    }

    function onPointerDown(e) {
      const port = e.target.closest('.wire-port');
      if (!port) return;
      const color = port.dataset.color;
      if (connectedColors.has(color)) return;
      e.preventDefault();

      const side = port.dataset.side; // 'left' o 'right'
      const hex = port.dataset.hex;
      const pinCoords = getPortPinCoords(port);

      activeDrag = {
        side,
        color,
        hex,
        portEl: port,
        startX: pinCoords.x,
        startY: pinCoords.y
      };

      activeDragPath.setAttribute('stroke', hex);
      activeDragPath.setAttribute('style', 'filter: drop-shadow(0 0 6px ' + hex + ');');
      activeDragPath.classList.remove('hidden');
      sfx.playGrab();

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }

    function onPointerMove(e) {
      if (!activeDrag) return;
      const cur = getCoordsFromPointer(e);
      let d = '';

      if (activeDrag.side === 'left') {
        const cpX = (activeDrag.startX + cur.x) / 2;
        d = 'M ' + activeDrag.startX + ' ' + activeDrag.startY + ' C ' + cpX + ' ' + activeDrag.startY + ', ' + cpX + ' ' + cur.y + ', ' + cur.x + ' ' + cur.y;
      } else {
        const cpX = (cur.x + activeDrag.startX) / 2;
        d = 'M ' + cur.x + ' ' + cur.y + ' C ' + cpX + ' ' + cur.y + ', ' + cpX + ' ' + activeDrag.startY + ', ' + activeDrag.startX + ' ' + activeDrag.startY;
      }
      activeDragPath.setAttribute('d', d);
    }

    function onPointerUp(e) {
      if (!activeDrag) return;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      activeDragPath.classList.add('hidden');

      const oppositeSide = activeDrag.side === 'left' ? 'right' : 'left';
      const cur = getCoordsFromPointer(e);

      // Detectar conector opuesto: por elementFromPoint o por cercanía euclidiana (< 48px)
      let targetPort = null;
      const targetElement = document.elementFromPoint(e.clientX, e.clientY);
      const hitPort = targetElement?.closest('.wire-port-' + oppositeSide);
      if (hitPort) {
        targetPort = hitPort;
      } else {
        const oppositePorts = container.querySelectorAll('.wire-port-' + oppositeSide);
        let minDist = 48;
        oppositePorts.forEach(candPort => {
          const candCoords = getPortPinCoords(candPort);
          const dist = Math.hypot(cur.x - candCoords.x, cur.y - candCoords.y);
          if (dist < minDist) {
            minDist = dist;
            targetPort = candPort;
          }
        });
      }

      if (targetPort) {
        const targetColor = targetPort.dataset.color;
        if (targetColor === activeDrag.color && !connectedColors.has(activeDrag.color)) {
          connectedColors.add(activeDrag.color);

          const leftPort = activeDrag.side === 'left' ? activeDrag.portEl : targetPort;
          const rightPort = activeDrag.side === 'right' ? activeDrag.portEl : targetPort;

          const leftCoords = getPortPinCoords(leftPort);
          const rightCoords = getPortPinCoords(rightPort);
          const cpX = (leftCoords.x + rightCoords.x) / 2;

          const donePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          donePath.setAttribute('d', 'M ' + leftCoords.x + ' ' + leftCoords.y + ' C ' + cpX + ' ' + leftCoords.y + ', ' + cpX + ' ' + rightCoords.y + ', ' + rightCoords.x + ' ' + rightCoords.y);
          donePath.setAttribute('stroke', activeDrag.hex);
          donePath.setAttribute('stroke-width', '7');
          donePath.setAttribute('stroke-linecap', 'round');
          donePath.setAttribute('fill', 'none');
          donePath.setAttribute('style', 'filter: drop-shadow(0 0 6px ' + activeDrag.hex + ');');
          pathsDoneGroup.appendChild(donePath);

          const leftLed = leftPort.querySelector('.wire-pin-led');
          if (leftLed) {
            leftLed.className = 'wire-pin-led w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse';
          }
          const rightLed = rightPort.querySelector('.wire-pin-led');
          if (rightLed) {
            rightLed.className = 'wire-pin-led w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse';
          }

          sfx.playWireConnect();

          if (connectedColors.size === 3) {
            onComplete(true);
          }
        } else {
          sfx.playWireBuzz();
        }
      }

      activeDrag = null;
    }

    container.addEventListener('pointerdown', onPointerDown);

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }

  function renderLeakMinigame(container, onComplete) {
    const isEn = window.GAME_SETTINGS?.lang === 'en';
    const leaksData = [
      { x: 22 + Math.floor(Math.random() * 10), y: 18 },
      { x: 48 + Math.floor(Math.random() * 8), y: 52 },
      { x: 74 + Math.floor(Math.random() * 10), y: 22 }
    ];

    container.innerHTML = `
      <div class="w-full h-full flex flex-col items-center justify-center p-2 relative select-none">
        <div class="text-[0.65rem] font-mono font-bold tracking-widest text-cyan-300 uppercase mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span id="leak-status-counter">${isEn ? 'ACTIVE LEAKS: 3 / 3' : 'FUGAS ACTIVAS: 3 / 3'}</span>
        </div>
        <div class="w-full max-w-lg h-24 rounded-2xl cryo-pipe border-2 border-zinc-500 relative flex items-center shadow-2xl">
          <div class="absolute left-0 top-0 bottom-0 w-3 rounded-l-2xl" style="background: repeating-linear-gradient(-45deg, #06b6d4, #06b6d4 4px, #0f172a 4px, #0f172a 8px);"></div>
          <div class="absolute right-0 top-0 bottom-0 w-3 rounded-r-2xl" style="background: repeating-linear-gradient(-45deg, #06b6d4, #06b6d4 4px, #0f172a 4px, #0f172a 8px);"></div>
          <div class="w-full text-center text-[0.6rem] font-mono font-bold tracking-widest text-cyan-400/40 select-none pointer-events-none">
            ${isEn ? 'LOX CRYO-CONDUIT // PRESSURE 450 kPa // VALVE ARTEMIS-04' : 'LOX CRYO-CONDUIT // PRESIÓN 450 kPa // VÁLVULA ARTEMIS-04'}
          </div>
          ` + leaksData.map((l, i) => `
            <div class="leak-node absolute" style="left: ` + l.x + `%; top: ` + l.y + `%;" data-index="` + i + `">
              <div class="leak-steam absolute bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none flex flex-col items-center steam-jet">
                <div class="w-8 h-12 bg-gradient-to-t from-cyan-300 via-sky-200 to-transparent rounded-full blur-[2px] opacity-80"></div>
                <div class="w-4 h-6 bg-white rounded-full blur-[1px] -mt-5 opacity-90"></div>
              </div>
              <div class="leak-crack cursor-pointer w-14 h-14 -ml-7 -mt-7 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-20">
                <svg viewBox="0 0 32 32" class="w-8 h-8 text-cyan-300" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M16 4 L14 12 L19 16 L13 22 L16 28" stroke-linecap="round"/>
                  <line x1="14" y1="12" x2="10" y2="15" stroke-linecap="round"/>
                  <line x1="19" y1="16" x2="23" y2="14" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="leak-patch hidden absolute -top-4 -left-8 px-2 py-0.5 rounded-md bg-zinc-900 border-2 border-emerald-400 text-emerald-300 font-mono font-black text-[0.6rem] shadow-[0_0_15px_rgba(52,211,153,0.8)] z-30 flex items-center gap-1 pointer-events-none magnetic-patch-clamped">
                <svg class="w-3 h-3 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>${isEn ? 'SEALED' : 'SELLADO'}</span>
              </div>
            </div>
          `).join('') + `
        </div>
      </div>
    `;

    let sealedCount = 0;
    const statusCounter = container.querySelector('#leak-status-counter');

    function onClickCrack(e) {
      const crackBtn = e.target.closest('.leak-crack');
      if (!crackBtn) return;
      const leakNode = crackBtn.closest('.leak-node');
      if (!leakNode || leakNode.dataset.sealed === 'true') return;

      leakNode.dataset.sealed = 'true';
      crackBtn.classList.add('hidden');
      const steam = leakNode.querySelector('.leak-steam');
      if (steam) steam.classList.add('hidden');
      const patch = leakNode.querySelector('.leak-patch');
      if (patch) patch.classList.remove('hidden');

      sfx.playPatchClang();
      sealedCount++;
      if (statusCounter) {
        statusCounter.textContent = isEn
          ? ('ACTIVE LEAKS: ' + (3 - sealedCount) + ' / 3')
          : ('FUGAS ACTIVAS: ' + (3 - sealedCount) + ' / 3');
      }

      if (sealedCount === 3) {
        onComplete(true);
      }
    }

    container.addEventListener('click', onClickCrack);

    return () => {
      container.removeEventListener('click', onClickCrack);
    };
  }

  // =======================================================================
  // MICRO-JUEGO 3: "¡DESTRUYE LOS METEORITOS!" (Escudo de Radiación)
  // =======================================================================
  function renderMeteoriteMinigame(container, onComplete) {
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const realVel = (nasaTelemetry && nasaTelemetry.neo && nasaTelemetry.neo.velocityKms) || 14.7;
    const realDiam = (nasaTelemetry && nasaTelemetry.neo && nasaTelemetry.neo.diameterM) || 84;
    const failPenaltyPct = realDiam >= 30 ? 25 : 15;

    const impactDesc = realVel > 16 ? (isEn ? 'FAST IMPACT' : 'IMPACTO RÁPIDO') : (isEn ? 'MODERATE IMPACT' : 'IMPACTO MODERADO');
    const speedLabel = isEn ? 'REAL NASA SPEED:' : 'VELOCIDAD REAL NASA:';
    const diamLabel = isEn ? 'REAL DIAMETER:' : 'DIÁMETRO REAL:';
    const riskLabel = isEn ? 'DAMAGE RISK:' : 'RIESGO DE DAÑO:';
    const shieldName = isEn ? 'SHIELD' : 'ESCUDO';

    container.innerHTML = `
      <div id="radar-meteor-arena" class="relative w-full h-[280px] md:h-[320px] bg-zinc-950 rounded-xl overflow-hidden border border-sky-900/60 tactical-crosshair select-none flex items-center justify-center">
        <!-- Rejilla y Anillos de Radar Táctico -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 300" preserveAspectRatio="none">
          <defs>
            <radialGradient id="radarBackGlow" cx="50%" cy="85%" r="75%">
              <stop offset="0%" stop-color="#0284c7" stop-opacity="0.2"/>
              <stop offset="65%" stop-color="#0369a1" stop-opacity="0.06"/>
              <stop offset="100%" stop-color="#082f49" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="400" height="300" fill="url(#radarBackGlow)"/>
          <line x1="0" y1="75" x2="400" y2="75" stroke="#0284c7" stroke-width="0.8" stroke-dasharray="3,3" stroke-opacity="0.25"/>
          <line x1="0" y1="150" x2="400" y2="150" stroke="#0284c7" stroke-width="1" stroke-dasharray="3,3" stroke-opacity="0.3"/>
          <line x1="0" y1="225" x2="400" y2="225" stroke="#0284c7" stroke-width="0.8" stroke-dasharray="3,3" stroke-opacity="0.25"/>
          <line x1="100" y1="0" x2="100" y2="300" stroke="#0284c7" stroke-width="0.8" stroke-dasharray="2,4" stroke-opacity="0.2"/>
          <line x1="200" y1="0" x2="200" y2="300" stroke="#0284c7" stroke-width="1" stroke-dasharray="3,3" stroke-opacity="0.35"/>
          <line x1="300" y1="0" x2="300" y2="300" stroke="#0284c7" stroke-width="0.8" stroke-dasharray="2,4" stroke-opacity="0.2"/>
          <circle cx="200" cy="285" r="95" fill="none" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.35"/>
          <circle cx="200" cy="285" r="175" fill="none" stroke="#0284c7" stroke-width="1" stroke-dasharray="4,4" stroke-opacity="0.25"/>
          <circle cx="200" cy="285" r="255" fill="none" stroke="#0284c7" stroke-width="0.8" stroke-dasharray="2,6" stroke-opacity="0.15"/>
        </svg>

        <!-- Capa de Rayos Láser SVG -->
        <svg id="radar-laser-layer" class="absolute inset-0 w-full h-full pointer-events-none z-20"></svg>

        <!-- Contenedor de Meteoritos en Movimiento -->
        <div id="radar-meteorites-container" class="absolute inset-0 z-30 pointer-events-auto"></div>

        <!-- Domo Lunar Protegido en la Base Inferior (bottom: 0px) -->
        <div id="radar-dome" class="absolute bottom-0 left-1/2 -translate-x-1/2 z-25 flex flex-col items-center pointer-events-none">
          <div class="w-36 h-12 rounded-t-full border-t-2 border-x-2 border-sky-400 bg-gradient-to-t from-sky-950/90 to-sky-500/25 shadow-[0_-5px_25px_rgba(56,189,248,0.5)] flex items-end justify-center pb-1">
            <svg class="w-7 h-7 text-sky-300 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v4m0 0a8 8 0 018 8v6H4v-6a8 8 0 018-8z"/>
            </svg>
          </div>
          <div class="text-[0.55rem] font-mono font-black text-sky-300 tracking-wider uppercase px-2 py-0.5 rounded-t bg-zinc-950 border-t border-x border-sky-500/50 shadow">
            ` + (isEn ? 'LUNAR BASE // SHIELD CORE' : 'BASE LUNAR // NÚCLEO ESCUDO') + `
          </div>
        </div>

        <!-- Insignia de Estado Superior Izquierda -->
        <div class="absolute top-2.5 left-3 z-40 flex items-center gap-2 bg-zinc-900/90 border border-sky-500/40 px-2.5 py-1 rounded-md text-[0.7rem] font-mono font-bold text-sky-300 shadow">
          <span class="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span id="meteor-count-label">` + (isEn ? 'DETECTED THREATS: 5 / 5' : 'AMENAZAS DETECTADAS: 5 / 5') + `</span>
        </div>

        <!-- Alerta NASA NeoWs en Vivo (Encabezado Radar con Física Real) -->
        <div class="absolute top-2.5 right-3 z-40 flex flex-col items-end gap-1">
          <div class="flex items-center gap-1.5 bg-sky-950/95 border border-sky-400/70 px-2.5 py-0.5 rounded text-[0.62rem] font-mono font-bold text-cyan-200 shadow">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>` + speedLabel + ` ` + realVel.toFixed(1) + ` KM/S -> ` + impactDesc + `</span>
          </div>
          <div class="flex items-center gap-1.5 bg-zinc-900/90 border border-amber-500/50 px-2 py-0.5 rounded text-[0.58rem] font-mono font-bold text-amber-300">
            <span>` + diamLabel + ` ` + realDiam + `m -> ` + riskLabel + ` -` + failPenaltyPct + `% ` + shieldName + `</span>
          </div>
        </div>

        <!-- Indicador inferior de ayuda -->
        <div class="absolute bottom-2.5 right-3 z-40 bg-zinc-900/90 border border-sky-500/30 px-2.5 py-0.5 rounded text-[0.62rem] font-mono text-zinc-400 pointer-events-none">
          ` + (isEn ? 'CLICK METEORITES BEFORE GROUND IMPACT' : 'DISPARA A LOS METEORITOS ANTES DEL IMPACTO') + `
        </div>
      </div>
    `;

    const arena = container.querySelector('#radar-meteor-arena');
    const meteorContainer = container.querySelector('#radar-meteorites-container');
    const laserLayer = container.querySelector('#radar-laser-layer');
    const countLabel = container.querySelector('#meteor-count-label');

    let isDone = false;
    let animId = null;
    let startDelayTimer = null;
    let destroyedCount = 0;
    const totalMeteors = 5;
    const targetCount = totalMeteors;
    const meteorList = [];
    const startTime = Date.now();

    // Fallo A: Sistema de coordenadas fijo e independiente del DOM (evita clientHeight === 0 en el frame 1)
    const scale = window.GAME_SCALE || 1;
    const measuredW = arena.clientWidth || (arena.getBoundingClientRect().width > 0 ? arena.getBoundingClientRect().width / scale : 0);
    const measuredH = arena.clientHeight || (arena.getBoundingClientRect().height > 0 ? arena.getBoundingClientRect().height / scale : 0);

    const ARENA_WIDTH = Math.max(320, measuredW || 400);
    const ARENA_HEIGHT = Math.max(260, measuredH || 280);
    const FLOOR_Y = 235; // Altura lógica fija para impacto independiente de reflow
    const groundY = Math.max(FLOOR_Y, ARENA_HEIGHT - 45);

    const domeX = ARENA_WIDTH / 2;
    const domeY = ARENA_HEIGHT - 20;

    // Fallo B & C: Función segura para terminar el minijuego
    // Bloquea por completo cualquier llamada a endMinigame(false) / failMinigame() durante los primeros 1500ms
    function safeComplete(success) {
      if (isDone) return;
      if (!success && (Date.now() - startTime < 1500)) {
        return;
      }
      isDone = true;
      if (animId) cancelAnimationFrame(animId);
      if (startDelayTimer) clearTimeout(startDelayTimer);
      onComplete(success);
    }

    // Cálculo estricto de velocidad en px/frame (velocidad moderada para dar tiempo táctico)
    const minSpeedPxSec = 55; // 55 px/s
    const maxSpeedPxSec = 110; // 110 px/s
    const normalizedVel = Math.max(0, Math.min(1, (realVel - 10) / 25));
    const baseSpeed = minSpeedPxSec + normalizedVel * (maxSpeedPxSec - minSpeedPxSec);

    // Limpieza de contenedor previo
    meteorContainer.innerHTML = '';

    // Fallo B: Crear 5 meteoritos iniciando en y = 0 (arriba del todo)
    for (let i = 0; i < totalMeteors; i++) {
      const segW = (ARENA_WIDTH * 0.82) / totalMeteors;
      const startX = (ARENA_WIDTH * 0.09) + (i * segW) + (Math.random() * (segW * 0.6));
      const startY = 0; // Iniciar en y = 0 (arriba del todo)
      const speedY = Math.max(minSpeedPxSec, Math.min(maxSpeedPxSec, baseSpeed + (Math.random() * 20 - 10)));
      // Ligero desplazamiento horizontal hacia el domo
      const distToGround = Math.max(120, groundY - startY);
      const driftX = ((domeX - startX) / distToGround) * (speedY * 0.25);

      const el = document.createElement('div');
      el.className = 'meteorite-target absolute flex items-center justify-center cursor-crosshair select-none';
      el.style.width = '52px';
      el.style.height = '52px';
      el.style.marginLeft = '-26px';
      el.style.marginTop = '-26px';
      el.style.left = startX + 'px';
      el.style.top = startY + 'px';
      el.style.zIndex = '35';
      el.style.touchAction = 'manipulation';
      el.innerHTML = `
        <div class="relative w-full h-full flex items-center justify-center pointer-events-none">
          <!-- Cola de fuego / reentrada -->
          <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-8 bg-gradient-to-t from-orange-500 via-amber-400 to-transparent rounded-full blur-[1px] opacity-80"></div>
          <!-- Meteorito Roca SVG -->
          <svg viewBox="0 0 40 40" class="w-10 h-10 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)] pointer-events-none">
            <defs>
              <radialGradient id="meteorRockGrad` + i + `" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#fed7aa"/>
                <stop offset="35%" stop-color="#ea580c"/>
                <stop offset="75%" stop-color="#9a3412"/>
                <stop offset="100%" stop-color="#431407"/>
              </radialGradient>
            </defs>
            <path d="M20 3 L31 8 L37 19 L32 32 L20 37 L9 32 L3 20 L8 8 Z" fill="url(#meteorRockGrad` + i + `)" stroke="#fb923c" stroke-width="1.8"/>
            <circle cx="15" cy="16" r="3" fill="#290e05" stroke="#7c2d12" stroke-width="0.8"/>
            <circle cx="27" cy="22" r="2.2" fill="#290e05" stroke="#7c2d12" stroke-width="0.8"/>
            <circle cx="21" cy="28" r="1.8" fill="#290e05" stroke="#7c2d12" stroke-width="0.8"/>
          </svg>
        </div>
      `;

      meteorContainer.appendChild(el);

      const meteorObj = {
        el,
        x: startX,
        y: startY,
        speedY,
        driftX,
        destroyed: false
      };

      const handleDestroy = (e) => {
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }
        if (meteorObj.destroyed || isDone) return;
        meteorObj.destroyed = true;
        destroyedCount++;

        sfx.playLaserShot();
        sfx.playMeteorPop();

        // Trazar rayo láser SVG desde el domo inferior hacia el meteorito
        if (laserLayer) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', domeX);
          line.setAttribute('y1', domeY);
          line.setAttribute('x2', meteorObj.x);
          line.setAttribute('y2', meteorObj.y);
          line.setAttribute('stroke', '#38bdf8');
          line.setAttribute('stroke-width', '4');
          line.setAttribute('style', 'filter: drop-shadow(0 0 6px #38bdf8);');
          laserLayer.appendChild(line);
          setTimeout(() => line.remove(), 90);
        }

        el.classList.add('meteor-pop-anim');
        el.style.pointerEvents = 'none';
        setTimeout(() => el.remove(), 230);

        if (countLabel) {
          countLabel.textContent = isEn
            ? ('REMAINING THREATS: ' + (totalMeteors - destroyedCount) + ' / ' + totalMeteors)
            : ('AMENAZAS RESTANTES: ' + (totalMeteors - destroyedCount) + ' / ' + totalMeteors);
        }

        // Fallo C: Al destruir la cuota de meteoritos con clic (destroyedCount >= targetCount) debe llamar a win / success (true)
        if (destroyedCount >= targetCount) {
          safeComplete(true);
        }
      };

      el.addEventListener('pointerdown', handleDestroy);
      el.addEventListener('click', handleDestroy);

      meteorList.push(meteorObj);
    }

    // Disparar rayo láser táctico al hacer clic en cualquier parte de la arena
    function onArenaClick(e) {
      if (isDone) return;
      sfx.playLaserShot();
      if (laserLayer) {
        const rect = arena.getBoundingClientRect();
        const sc = window.GAME_SCALE || 1;
        const clickX = (e.clientX - rect.left) / sc;
        const clickY = (e.clientY - rect.top) / sc;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', domeX);
        line.setAttribute('y1', domeY);
        line.setAttribute('x2', clickX);
        line.setAttribute('y2', clickY);
        line.setAttribute('stroke', '#0284c7');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '4,3');
        laserLayer.appendChild(line);
        setTimeout(() => line.remove(), 70);
      }
    }
    arena.addEventListener('pointerdown', onArenaClick);

    // Bucle de movimiento hacia abajo
    let lastTime = performance.now();

    function loop(now) {
      if (isDone) return;
      const dt = Math.min(0.06, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = Date.now() - startTime;

      for (let i = 0; i < meteorList.length; i++) {
        const m = meteorList[i];
        if (m.destroyed) continue;

        m.y += m.speedY * dt;
        m.x += m.driftX * dt;

        m.el.style.left = m.x + 'px';
        m.el.style.top = m.y + 'px';

        // Comprobación de colisión con suelo / domo
        if (m.y >= groundY) {
          // Fallo B: Bloquear por completo cualquier llamada a derrota durante los primeros 1500ms
          if (elapsed < 1500) {
            m.y = Math.min(m.y, groundY - 15);
            continue;
          }

          // Pasaron los 1500ms y colisionó con la base: derrota
          safeComplete(false);
          return;
        }
      }

      animId = requestAnimationFrame(loop);
    }

    // Fallo B: Espera 150ms con requestAnimationFrame después de mostrar el modal antes de arrancar el bucle
    startDelayTimer = setTimeout(() => {
      if (isDone) return;
      lastTime = performance.now();
      animId = requestAnimationFrame(loop);
    }, 150);

    return () => {
      isDone = true;
      if (startDelayTimer) clearTimeout(startDelayTimer);
      if (animId) cancelAnimationFrame(animId);
      arena.removeEventListener('pointerdown', onArenaClick);
      meteorList.length = 0;
    };
  }

  // =======================================================================
  // MICRO-JUEGO 4: "¡APAGA EL INCENDIO!" (Producción de Comida)
  // =======================================================================
  function renderFireMinigame(container, onComplete) {
    const isEn = window.GAME_SETTINGS?.lang === 'en';
    container.innerHTML = `
      <div id="biodome-fire-arena" class="relative w-full h-[280px] md:h-[320px] bg-gradient-to-b from-zinc-950 via-zinc-900 to-emerald-950/80 rounded-xl overflow-hidden border border-emerald-800/60 select-none cursor-crosshair">
        <!-- Estructura de domo e invernadero lunar -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 400 300" preserveAspectRatio="none">
          <line x1="200" y1="0" x2="200" y2="300" stroke="#34d399" stroke-width="2"/>
          <path d="M0 80 Q200 20 400 80 M0 180 Q200 120 400 180" stroke="#34d399" stroke-width="1.5" fill="none"/>
          <line x1="80" y1="0" x2="60" y2="300" stroke="#34d399" stroke-width="1" stroke-dasharray="4,4"/>
          <line x1="320" y1="0" x2="340" y2="300" stroke="#34d399" stroke-width="1" stroke-dasharray="4,4"/>
        </svg>

        <!-- Bandejas hidropónicas en la base -->
        <div class="absolute bottom-0 inset-x-0 h-28 bg-emerald-950/70 border-t border-emerald-600/40 flex justify-around items-end px-4 pb-2 pointer-events-none">
          <div class="w-20 h-16 bg-zinc-900 border border-emerald-500/40 rounded-t-lg flex items-center justify-center">
            <svg class="w-12 h-12 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21V9m0 0C10 5 4 4 4 4s1 6 5 8c3 1.5 3-3 3-3zm0 0c2-4 8-5 8-5s-1 6-5 8c-3 1.5-3-3-3-3z"/>
            </svg>
          </div>
          <div class="w-24 h-20 bg-zinc-900 border border-emerald-500/40 rounded-t-lg flex items-center justify-center">
            <svg class="w-14 h-14 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21V9m0 0C10 5 4 4 4 4s1 6 5 8c3 1.5 3-3 3-3zm0 0c2-4 8-5 8-5s-1 6-5 8c-3 1.5-3-3-3-3z"/>
            </svg>
          </div>
          <div class="w-20 h-16 bg-zinc-900 border border-emerald-500/40 rounded-t-lg flex items-center justify-center">
            <svg class="w-12 h-12 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21V9m0 0C10 5 4 4 4 4s1 6 5 8c3 1.5 3-3 3-3zm0 0c2-4 8-5 8-5s-1 6-5 8c-3 1.5-3-3-3-3z"/>
            </svg>
          </div>
        </div>

        <!-- 4 Focos de Fuego Activos -->
        <div id="fire-foci-container" class="absolute inset-0 pointer-events-auto"></div>

        <!-- Capa de Partículas de Espuma de CO2 -->
        <div id="spray-particles-layer" class="absolute inset-0 pointer-events-none overflow-hidden z-20"></div>

        <!-- Boquilla del Extintor Táctico -->
        <div id="co2-nozzle-cursor" class="absolute w-12 h-12 pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 hidden transition-transform duration-75">
          <svg class="w-full h-full" viewBox="0 0 48 48" fill="none">
            <rect x="20" y="24" width="8" height="20" rx="2" fill="#475569" stroke="#94a3b8" stroke-width="1.5"/>
            <path d="M16 24 L32 24 L27 8 L21 8 Z" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
            <circle cx="24" cy="8" r="4" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1"/>
            <circle cx="24" cy="6" r="3" fill="#ffffff"/>
          </svg>
        </div>

        <!-- Insignia de Estado Superior -->
        <div class="absolute top-2.5 left-3 z-40 flex items-center gap-2 bg-zinc-900/90 border border-emerald-500/40 px-2.5 py-1 rounded-md text-[0.7rem] font-mono font-bold text-emerald-300 shadow">
          <span class="inline-block w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]"></span>
          <span id="fire-count-label">${isEn ? 'ACTIVE FIRES: 4 / 4' : 'FOCOS ACTIVOS: 4 / 4'}</span>
        </div>
        <div class="absolute bottom-2.5 right-3 z-40 bg-zinc-900/90 border border-emerald-500/30 px-2.5 py-0.5 rounded text-[0.65rem] font-mono text-zinc-400 pointer-events-none">
          ${isEn ? 'DRAG EXTINGUISHER OVER FLAMES' : 'ARRASTRA EL EXTINTOR SOBRE LAS LLAMAS'}
        </div>
      </div>
    `;

    const arena = container.querySelector('#biodome-fire-arena');
    const fireContainer = container.querySelector('#fire-foci-container');
    const particleLayer = container.querySelector('#spray-particles-layer');
    const nozzleCursor = container.querySelector('#co2-nozzle-cursor');
    const countLabel = container.querySelector('#fire-count-label');

    let isDone = false;
    let extinguishedCount = 0;
    const totalFlames = 4;
    const flameNodes = [];
    let lastHissSound = 0;

    // Coordenadas proporcionales para los 4 focos de fuego
    const flamePositions = [
      { x: '20%', y: '42%' },
      { x: '42%', y: '58%' },
      { x: '65%', y: '38%' },
      { x: '82%', y: '56%' }
    ];

    flamePositions.forEach((pos, idx) => {
      const node = document.createElement('div');
      node.className = 'fire-node absolute -translate-x-1/2 -translate-y-1/2 cursor-crosshair select-none flex flex-col items-center';
      node.dataset.id = String(idx);
      node.dataset.extinguished = 'false';
      node.style.left = pos.x;
      node.style.top = pos.y;
      node.style.zIndex = '25';

      node.innerHTML = `
        <div class="flame-svg-wrapper">
          <svg class="w-12 h-14 md:w-14 md:h-16 flame-flicker" viewBox="0 0 40 50">
            <defs>
              <linearGradient id="fireGradA${idx}" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stop-color="#dc2626"/>
                <stop offset="45%" stop-color="#ea580c"/>
                <stop offset="100%" stop-color="#facc15"/>
              </linearGradient>
              <linearGradient id="fireGradB${idx}" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stop-color="#ea580c"/>
                <stop offset="70%" stop-color="#facc15"/>
                <stop offset="100%" stop-color="#ffffff"/>
              </linearGradient>
            </defs>
            <path d="M20 2 C22 14 36 20 36 32 C36 42 28 48 20 48 C12 48 4 42 4 32 C4 20 18 14 20 2 Z" fill="url(#fireGradA${idx})"/>
            <path d="M20 14 C22 22 30 26 30 34 C30 40 25 44 20 44 C15 44 10 40 10 34 C10 26 18 22 20 14 Z" fill="url(#fireGradB${idx})"/>
            <path d="M20 26 C21 30 25 32 25 37 C25 40 22 42 20 42 C18 42 15 40 15 37 C15 32 19 30 20 26 Z" fill="#ffffff"/>
          </svg>
        </div>
        <div class="steam-wrapper hidden flex flex-col items-center">
          <svg class="w-8 h-8 text-cyan-200 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v3m-6 3l2 2m10-2l-2 2M5 15a7 7 0 0014 0c0-3-3-5-7-9-4 4-7 6-7 9z"/>
          </svg>
          <span class="text-[0.6rem] font-black font-mono text-cyan-300 bg-cyan-950/90 px-1 py-0.5 rounded border border-cyan-500/40">${isEn ? 'EXTINGUISHED' : 'APAGADO'}</span>
        </div>
      `;

      fireContainer.appendChild(node);
      flameNodes.push(node);
    });

    function handleExtinguisherMove(e) {
      if (isDone) return;
      const arenaRect = arena.getBoundingClientRect();
      const scale = window.GAME_SCALE || 1;
      const px = (e.clientX - arenaRect.left) / scale;
      const py = (e.clientY - arenaRect.top) / scale;

      if (nozzleCursor) {
        nozzleCursor.style.left = px + 'px';
        nozzleCursor.style.top = py + 'px';
        nozzleCursor.classList.remove('hidden');
      }

      // Sonido de siseo del extintor
      const now = performance.now();
      if (now - lastHissSound > 130) {
        sfx.playExtinguisherHiss();
        lastHissSound = now;
      }

      // Generar partículas de espuma de CO2
      if (particleLayer) {
        for (let pIdx = 0; pIdx < 2; pIdx++) {
          const puff = document.createElement('div');
          puff.className = 'co2-spray-puff absolute w-3 h-3 rounded-full bg-cyan-100/90 pointer-events-none blur-[0.5px]';
          puff.style.left = (px + (Math.random() * 16 - 8)) + 'px';
          puff.style.top = (py + (Math.random() * 16 - 8)) + 'px';
          puff.style.setProperty('--tx', (Math.random() * 26 - 13) + 'px');
          puff.style.setProperty('--ty', (Math.random() * -24 - 8) + 'px');
          particleLayer.appendChild(puff);
          setTimeout(() => puff.remove(), 290);
        }
      }

      // Comprobar colisión / contacto con cada llama
      flameNodes.forEach((node) => {
        if (node.dataset.extinguished === 'true') return;
        const nRect = node.getBoundingClientRect();
        const fx = nRect.left + nRect.width / 2 - arenaRect.left;
        const fy = nRect.top + nRect.height / 2 - arenaRect.top;

        const dist = Math.hypot(px - fx, py - fy);
        if (dist < 46) {
          node.dataset.extinguished = 'true';
          const flameWrap = node.querySelector('.flame-svg-wrapper');
          const steamWrap = node.querySelector('.steam-wrapper');
          if (flameWrap) flameWrap.classList.add('hidden');
          if (steamWrap) steamWrap.classList.remove('hidden');

          sfx.playFireExtinguished();
          extinguishedCount++;

          if (countLabel) {
            countLabel.textContent = isEn
              ? `REMAINING FIRES: ${totalFlames - extinguishedCount} / ${totalFlames}`
              : `FOCOS RESTANTES: ${totalFlames - extinguishedCount} / ${totalFlames}`;
          }

          if (extinguishedCount === totalFlames) {
            isDone = true;
            onComplete(true);
          }
        }
      });
    }

    arena.addEventListener('pointermove', handleExtinguisherMove);
    arena.addEventListener('pointerdown', handleExtinguisherMove);

    return () => {
      isDone = true;
      arena.removeEventListener('pointermove', handleExtinguisherMove);
      arena.removeEventListener('pointerdown', handleExtinguisherMove);
    };
  }

  const MINIGAME_I18N = {
    es: {
      alertCritical: 'ALERTA CRÍTICA // ',
      subsystemTitle: 'FALLA CRÍTICA EN SUBSISTEMA LUNAR',
      wires: {
        resourceName: 'ENERGÍA',
        scream: '¡CONECTA LOS CABLES!',
        subtitle: 'Une cada terminal con su conector del mismo color (arrastra desde cualquier lado).',
        successTitle: '¡CIRCUITO RESTABLECIDO!',
        successBonus: 'SOBRECARGA APROVECHADA: +10% ENERGÍA',
        failTitle: 'DESASTRE DE CORTOCIRCUITO',
        failPenaltyText: 'ENERGÍA'
      },
      leaks: {
        resourceName: 'OXÍGENO',
        scream: '¡SELLA LAS FUGAS!',
        subtitle: 'Haz clic en cada una de las 3 fisuras del ducto para soldar los parches térmicos.',
        successTitle: '¡PRESIÓN ESTABILIZADA!',
        successBonus: 'PRESIÓN RECUPERADA: +10% OXÍGENO',
        failTitle: 'DESASTRE DE DESCOMPRESIÓN',
        failPenaltyText: 'OXÍGENO'
      },
      meteorites: {
        resourceName: 'ESCUDO',
        scream: '¡IMPACTO INMINENTE! ¡DISPARA!',
        subtitle: 'Haz clic en todos los micrometeoritos en el radar antes de que impacten la base lunar.',
        neoAlert: (name, vel) => `ALERTA NASA NEO: Fragmentos del asteroide ${name} a ${vel} km/s. ¡Dispara a todos los meteoritos antes de que impacten la base lunar!`,
        successTitle: '¡MINERALES ABSORBIDOS!',
        successBonus: 'CAMPO DEFENSIVO REFORZADO: +10% ESCUDO',
        failTitle: 'DESASTRE DE IMPACTO DE METEORITO',
        failPenaltyText: 'ESCUDO'
      },
      fire: {
        resourceName: 'COMIDA',
        scream: '¡FUEGO EN BIODOMO! ¡EXTINGUE!',
        subtitle: 'Arrastra el difusor de CO₂ sobre los 4 focos de fuego para sofocarlos con espuma fría.',
        successTitle: '¡COSECHA SALVADA!',
        successBonus: 'BIODOMO PROTEGIDO: +10% COMIDA',
        failTitle: 'DESASTRE DE INCENDIO EN BIODOMO',
        failPenaltyText: 'COMIDA'
      }
    },
    en: {
      alertCritical: 'CRITICAL ALERT // ',
      subsystemTitle: 'CRITICAL SUBSYSTEM FAILURE',
      wires: {
        resourceName: 'POWER',
        scream: 'CONNECT THE WIRES!',
        subtitle: 'Connect each terminal to its matching color on the other side (drag from either side).',
        successTitle: 'CIRCUIT RESTORED!',
        successBonus: 'SURGE HARNESSED: +10% POWER',
        failTitle: 'SHORT CIRCUIT DISASTER',
        failPenaltyText: 'POWER'
      },
      leaks: {
        resourceName: 'OXYGEN',
        scream: 'SEAL THE LEAKS!',
        subtitle: 'Click all 3 pipeline ruptures to weld thermal sealant patches.',
        successTitle: 'PRESSURE STABILIZED!',
        successBonus: 'PRESSURE RESTORED: +10% OXYGEN',
        failTitle: 'DECOMPRESSION DISASTER',
        failPenaltyText: 'OXYGEN'
      },
      meteorites: {
        resourceName: 'SHIELD',
        scream: 'INCOMING IMPACT! SHOOT!',
        subtitle: 'Click all micrometeorites on radar before ground impact.',
        neoAlert: (name, vel) => `NASA NEO ALERT: Asteroid fragments from ${name} at ${vel} km/s. Destroy all targets before ground impact!`,
        successTitle: 'MINERALS ABSORBED!',
        successBonus: 'DEFENSE FIELD REINFORCED: +10% SHIELD',
        failTitle: 'METEORITE STRIKE DISASTER',
        failPenaltyText: 'SHIELD'
      },
      fire: {
        resourceName: 'FOOD',
        scream: 'FIRE IN BIODOME! EXTINGUISH!',
        subtitle: 'Drag the CO₂ diffuser over the 4 fire spots to smother them with cold foam.',
        successTitle: 'CROPS SAVED!',
        successBonus: 'BIODOME PROTECTED: +10% FOOD',
        failTitle: 'BIODOME FIRE DISASTER',
        failPenaltyText: 'FOOD'
      }
    }
  };

  const EMERGENCY_MINIGAMES = [
    {
      id: 'wires',
      resource: 'pwr',
      resourceName: 'ENERGÍA',
      scream: '¡CONECTA LOS CABLES!',
      subtitle: 'Une cada terminal de la izquierda con su conector del mismo color a la derecha.',
      successTitle: '¡CIRCUITO RESTABLECIDO!',
      successBonus: 'SOBRECARGA APROVECHADA: +10% ENERGÍA',
      failTitle: 'DESASTRE DE CORTOCIRCUITO',
      failPenaltyText: 'ENERGÍA',
      render: (container, onComplete) => renderWireMinigame(container, onComplete)
    },
    {
      id: 'leaks',
      resource: 'o2',
      resourceName: 'OXÍGENO',
      scream: '¡SELLA LAS FUGAS!',
      subtitle: 'Haz clic en cada una de las 3 fisuras del ducto para soldar los parches térmicos.',
      successTitle: '¡PRESIÓN ESTABILIZADA!',
      successBonus: 'PRESIÓN RECUPERADA: +10% OXÍGENO',
      failTitle: 'DESASTRE DE DESCOMPRESIÓN',
      failPenaltyText: 'OXÍGENO',
      render: (container, onComplete) => renderLeakMinigame(container, onComplete)
    },
    {
      id: 'meteorites',
      resource: 'rad',
      resourceName: 'ESCUDO',
      scream: '¡IMPACTO INMINENTE! ¡DISPARA!',
      subtitle: 'Haz clic en todos los micrometeoritos en el radar antes de que alcancen el domo central.',
      successTitle: '¡MINERALES ABSORBIDOS!',
      successBonus: 'CAMPO DEFENSIVO REFORZADO: +10% ESCUDO',
      failTitle: 'DESASTRE DE IMPACTO DE METEORITO',
      failPenaltyText: 'ESCUDO',
      render: (container, onComplete) => renderMeteoriteMinigame(container, onComplete)
    },
    {
      id: 'fire',
      resource: 'food',
      resourceName: 'COMIDA',
      scream: '¡FUEGO EN BIODOMO! ¡EXTINGUE!',
      subtitle: 'Arrastra el difusor de CO₂ sobre los 4 focos de fuego para sofocarlos con espuma fría.',
      successTitle: '¡COSECHA SALVADA!',
      successBonus: 'BIODOMO PROTEGIDO: +10% COMIDA',
      failTitle: 'DESASTRE DE INCENDIO EN BIODOMO',
      failPenaltyText: 'COMIDA',
      render: (container, onComplete) => renderFireMinigame(container, onComplete)
    }
  ];

  // Sistema de "Shuffle Bag" (Mazo Barajado Persistente) usando Fisher-Yates
  function getNextMinigameType(allTypes) {
    if (!window.minigameDeck || window.minigameDeck.length === 0) {
      window.minigameDeck = [...allTypes];
      for (let i = window.minigameDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [window.minigameDeck[i], window.minigameDeck[j]] = [window.minigameDeck[j], window.minigameDeck[i]];
      }
      // Evitar que el primero del nuevo mazo sea igual al último jugado
      if (window.lastPlayedMinigame && window.minigameDeck[window.minigameDeck.length - 1] === window.lastPlayedMinigame && window.minigameDeck.length > 1) {
        const temp = window.minigameDeck.pop();
        window.minigameDeck.unshift(temp);
      }
    }
    const next = window.minigameDeck.pop();
    window.lastPlayedMinigame = next;
    return next;
  }
  window.getNextMinigameType = getNextMinigameType;
  window.minigameDeck = window.minigameDeck || [];

  function triggerEmergency(forcedMinigameId = null) {
    if (isEmergencyActive) return;
    isEmergencyActive = true;
    emergencyTriggeredThisCase = true;
    minigameTriggeredThisSol = true;
    if (currentSolEmergencyPlan && currentSolEmergencyPlan.sol === state.sol) {
      currentSolEmergencyPlan.triggered = true;
    }
    clearTimeout(emergencyScheduledTimer);
    emergencyScheduledTimer = null;

    if (tutorialManager && tutorialManager.isActive()) {
      tutorialManager.stop();
    }

    const allMinigameIds = EMERGENCY_MINIGAMES.map(m => m.id);
    const chosenId = forcedMinigameId || getNextMinigameType(allMinigameIds);
    const minigame = EMERGENCY_MINIGAMES.find(m => m.id === chosenId) || EMERGENCY_MINIGAMES[0];

    const cfg = EMERGENCY_CONFIG[state.difficulty] || EMERGENCY_CONFIG.engineer;
    const lang = (window.GAME_SETTINGS?.lang === 'en') ? 'en' : 'es';
    const mgI18n = (MINIGAME_I18N[lang] && MINIGAME_I18N[lang][minigame.id]) || minigame;
    const globalMg = MINIGAME_I18N[lang] || MINIGAME_I18N.es;

    sfx.playEmergencyAlarm();

    if (emergencyModal) {
      emergencyModal.classList.remove('hidden');
      emergencyModal.style.display = 'flex';
      emergencyModal.style.zIndex = '9500';
      emergencyModal.style.pointerEvents = 'auto';
      if (emergencySystemBadge) emergencySystemBadge.textContent = globalMg.alertCritical + mgI18n.resourceName;
      if (emergencySubsystemTitle) emergencySubsystemTitle.textContent = globalMg.subsystemTitle;
      if (emergencyScream) {
        emergencyScream.textContent = mgI18n.scream;
        emergencyScream.classList.remove('emergency-punch-in');
        void emergencyScream.offsetWidth;
        emergencyScream.classList.add('emergency-punch-in');
      }
      if (emergencyDesc) {
        if (minigame.id === 'meteorites') {
          const nName = (nasaTelemetry && nasaTelemetry.neo && nasaTelemetry.neo.name) || '363790 (2005 JE46)';
          const nVel = (nasaTelemetry && nasaTelemetry.neo && nasaTelemetry.neo.velocityKms) || 14.7;
          emergencyDesc.textContent = (typeof mgI18n.neoAlert === 'function')
            ? mgI18n.neoAlert(nName, nVel)
            : `ALERTA NASA NEO: Fragmentos del asteroide ${nName} a ${nVel} km/s.`;
        } else {
          emergencyDesc.textContent = mgI18n.subtitle;
        }
      }
      if (emergencyResultBanner) emergencyResultBanner.classList.add('hidden');
    }

    let isResolved = false;

    if (emergencyArena) {
      emergencyArena.innerHTML = '';
      currentMinigameCleanup = minigame.render(emergencyArena, (success) => {
        if (isResolved) return;
        isResolved = true;
        resolveEmergency(success, minigame, cfg);
      });
    }

    startEmergencyCountdown(cfg.timeLimitSec, () => {
      if (isResolved) return;
      isResolved = true;
      if (minigame.id === 'meteorites') {
        // Fallo C: En meteoritos, si el contador de tiempo llega a 0 sin que ningún meteorito haya tocado la base
        // (o al destruir todos), NO debe marcar derrota por error (el domo sobrevivió con éxito).
        resolveEmergency(true, minigame, cfg);
      } else {
        resolveEmergency(false, minigame, cfg);
      }
    });
  }

  function resolveEmergency(success, minigame, cfg) {
    cancelAnimationFrame(emergencyAnimFrame);
    if (typeof currentMinigameCleanup === 'function') {
      currentMinigameCleanup();
      currentMinigameCleanup = null;
    }

    const lang = (window.GAME_SETTINGS?.lang === 'en') ? 'en' : 'es';
    const mgI18n = (MINIGAME_I18N[lang] && MINIGAME_I18N[lang][minigame.id]) || minigame;

    if (success) {
      sfx.playMinigameSuccess();
      const reward = cfg.rewardPct;
      state.resources[minigame.resource] = Math.min(100, state.resources[minigame.resource] + reward);
      updateResourceBars();

      const logPrefix = lang === 'en' ? `[EMERGENCY CONTAINED SOL ${state.sol}]` : `[EMERGENCIA CONTENIDA SOL ${state.sol}]`;
      state.solLogs.push(`<div class="text-emerald-400 font-semibold bg-emerald-950/30 border border-emerald-500/20 px-2 py-1 rounded">${logPrefix} ${mgI18n.successTitle}: +${reward}% ${mgI18n.resourceName}</div>`);

      if (emergencyResultBanner) {
        emergencyResultBanner.textContent = (lang === 'en' ? '' : '¡') + mgI18n.successTitle + (lang === 'en' ? ' ' : '! ') + mgI18n.successBonus;
        emergencyResultBanner.className = 'w-full py-2.5 px-4 rounded-xl border-2 border-emerald-400 bg-emerald-950/90 text-emerald-300 text-center font-scifi uppercase tracking-wider font-black text-sm md:text-base shadow-[0_0_20px_rgba(52,211,153,0.5)]';
        emergencyResultBanner.classList.remove('hidden');
      }

      if (emergencyResolveTimer) {
        clearTimeout(emergencyResolveTimer);
        emergencyResolveTimer = null;
      }
      emergencyResolveTimer = setTimeout(() => {
        emergencyResolveTimer = null;
        closeEmergencyModal();
      }, 1200);
    } else {
      sfx.playMinigameFail();
      triggerScreenShake();

      let penalty = cfg.penaltyPct;
      if (minigame.id === 'meteorites') {
        const realDiam = (nasaTelemetry && nasaTelemetry.neo && nasaTelemetry.neo.diameterM) || 84;
        penalty = realDiam >= 30 ? 25 : 15;
      }

      state.resources[minigame.resource] = Math.max(0, state.resources[minigame.resource] - penalty);
      updateResourceBars();

      state.lastIncident = {
        title: mgI18n.failTitle,
        resource: minigame.resource,
        resourceName: mgI18n.resourceName,
        sol: state.sol,
        penalty: penalty
      };
      updateCctvIncidentBanner();

      const logPrefix = lang === 'en' ? `[INCIDENT SOL ${state.sol}]` : `[INCIDENTE SOL ${state.sol}]`;
      state.solLogs.push(`<div class="text-rose-400 font-bold bg-rose-950/40 border border-rose-500/30 px-2 py-1 rounded">${logPrefix} ${mgI18n.failTitle}: -${penalty}% ${mgI18n.failPenaltyText}</div>`);

      if (minigame.id === 'wires') {
        if (disasterBlackoutOverlay) {
          disasterBlackoutOverlay.classList.remove('hidden');
          setTimeout(() => disasterBlackoutOverlay.classList.add('hidden'), 450);
        }
      } else if (minigame.id === 'leaks') {
        if (disasterFrostOverlay) {
          disasterFrostOverlay.classList.remove('hidden');
          setTimeout(() => disasterFrostOverlay.classList.add('hidden'), 1500);
        }
      } else if (minigame.id === 'meteorites') {
        if (disasterCrackOverlay) {
          disasterCrackOverlay.classList.remove('hidden');
          setTimeout(() => disasterCrackOverlay.classList.add('hidden'), 2200);
        }
      } else if (minigame.id === 'fire') {
        if (disasterSmokeOverlay) {
          disasterSmokeOverlay.classList.remove('hidden');
          sfx.playThermalAlarm();
          setTimeout(() => disasterSmokeOverlay.classList.add('hidden'), 2500);
        }
      }

      if (emergencyResultBanner) {
        emergencyResultBanner.textContent = (lang === 'en' ? '' : '¡') + mgI18n.failTitle + '! -' + penalty + '% ' + mgI18n.failPenaltyText;
        emergencyResultBanner.className = 'w-full py-2.5 px-4 rounded-xl border-2 border-rose-500 bg-rose-950/90 text-rose-300 text-center font-scifi uppercase tracking-wider font-black text-sm md:text-base shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse';
        emergencyResultBanner.classList.remove('hidden');
      }

      if (emergencyResolveTimer) {
        clearTimeout(emergencyResolveTimer);
        emergencyResolveTimer = null;
      }
      emergencyResolveTimer = setTimeout(() => {
        emergencyResolveTimer = null;
        closeEmergencyModal();
        const failed = Object.entries(state.resources).find(([, v]) => v <= 0);
        if (failed) {
          clearSavedGame();
          setTimeout(() => triggerCriticalFailure(failed[0], ['Falla crítica en micro-juego de emergencia: ' + minigame.failTitle]), 450);
        }
      }, 1200);
    }
  }

  function closeEmergencyModal() {
    if (emergencyResolveTimer) {
      clearTimeout(emergencyResolveTimer);
      emergencyResolveTimer = null;
    }
    cancelAnimationFrame(emergencyAnimFrame);
    if (typeof currentMinigameCleanup === 'function') {
      currentMinigameCleanup();
      currentMinigameCleanup = null;
    }
    if (emergencyArena) {
      emergencyArena.innerHTML = '';
    }
    if (emergencyModal) {
      emergencyModal.classList.add('hidden');
      emergencyModal.style.display = 'none';
      emergencyModal.style.pointerEvents = 'none';
    }
    isEmergencyActive = false;
  }

  function triggerRandomEmergencyMinigame(forcedMinigameId = null) {
    return triggerEmergency(forcedMinigameId);
  }
  window.triggerEmergency = triggerEmergency;
  window.triggerRandomEmergencyMinigame = triggerRandomEmergencyMinigame;

  window.addEventListener('DOMContentLoaded', () => {
    startTitleScreenFlow();
    initSettingsModal();
    applyLanguage(window.GAME_SETTINGS.lang);
    initGlobalDragListenersOnce();
    updateWorkspaceScale(false);
    injectResourceImpactDots();
    initExteriorParticles();
    initCctv();
    initNasaLiveTelemetry();
    const hudBox = document.getElementById('helmet-hud-box');
    if (hudBox) {
      hudBox.addEventListener('click', () => {
        if (typewriter.active) finishTypewriter();
      });
    }
    const manualBookEl = document.getElementById('manual-book-trigger') || document.getElementById('manual-closed-cover');
    if (manualBookEl) {
      manualBookEl.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleManualBook();
      });
    }
    [manualBookEl, dossierEl, crateEl, scannerEl, stampAuthEl, stampDenyEl].forEach((item) => {
      if (item) makeDraggable(item);
    });
    layoutAllDeskToolsInitial();
    refreshTitleScreenSaveBanner();
    updateCctvIncidentBanner();
    renderCurrentCase(false);

    window.addEventListener('resize', () => {
      fitGameToScreen();
      updateWorkspaceScale(true);
    });
    fitGameToScreen();
  });
})();
