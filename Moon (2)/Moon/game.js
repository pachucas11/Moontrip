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
  window.evaUsedThisSol = false;

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
          this.humFilter = ctx.createBiquadFilter();
          this.humGain = ctx.createGain();

          this.humOsc1.type = 'sawtooth';
          this.humOsc1.frequency.setValueAtTime(62, now);
          this.humOsc2.type = 'sine';
          this.humOsc2.frequency.setValueAtTime(124.5, now);

          this.humFilter.type = 'lowpass';
          this.humFilter.frequency.setValueAtTime(240, now);

          this.humGain.gain.setValueAtTime(0.001, now);
          this.humGain.gain.linearRampToValueAtTime(0.045, now + 0.08);

          this.humOsc1.connect(this.humFilter);
          this.humOsc2.connect(this.humFilter);
          this.humFilter.connect(this.humGain);
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
            const osc1 = this.humOsc1;
            osc1.stop(now + 0.065);
            osc1.onended = () => {
              try { osc1.disconnect(); } catch (_) {}
            };
          }
          if (this.humOsc2) {
            const osc2 = this.humOsc2;
            const flt = this.humFilter;
            const gn = this.humGain;
            osc2.stop(now + 0.065);
            osc2.onended = () => {
              try { osc2.disconnect(); } catch (_) {}
              try { flt?.disconnect(); } catch (_) {}
              try { gn?.disconnect(); } catch (_) {}
            };
          }
        } catch (_) {
          // Ignorar
        }
      }
      this.isHumming = false;
      this.humOsc1 = null;
      this.humOsc2 = null;
      this.humFilter = null;
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

    playClick() {
      this.playMenuSelect();
    }

    playTypewriterTick(lineIdx = 0) {
      const ctx = this.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const baseFreqs = [880, 960, 740, 620];
        const base = baseFreqs[lineIdx % baseFreqs.length] || 880;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(base + (Math.random() * 40 - 20), now);
        g.gain.setValueAtTime(0.018, now);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.024);
        osc.connect(g);
        g.connect(ctx.destination);
        this.bindAutoDisconnect(osc, g);
        osc.start(now);
        osc.stop(now + 0.026);
      } catch (_) {}
    }
  }

  const sfx = new SoundFX();

  // =======================================================================
  // MOTOR DE MÚSICA DE FONDO PROCEDURAL (WEB AUDIO API - SPACE AMBIENT)
  // =======================================================================
  const bgmEngine = (() => {
    let enabled = true;
    try {
      const saved = localStorage.getItem('lunar_bgm_enabled');
      if (saved !== null) {
        enabled = saved !== 'false';
      }
    } catch (_) {}

    let isPlaying = false;
    let droneOsc1 = null;
    let droneOsc2 = null;
    let lfoOsc = null;
    let lfoGain = null;
    let filterNode = null;
    let masterGain = null;
    let arpIntervalId = null;
    let arpStep = 0;

    // Escala pentatónica menor espacial (E3, G3, B3, D4, F#4) con patrón contemplativo lunar
    const ARP_NOTES = [164.81, 196.00, 246.94, 293.66, 369.99, 293.66, 246.94, 196.00];

    function updateButtonsUI() {
      const buttons = document.querySelectorAll('[data-bgm-toggle]');
      buttons.forEach((btn) => {
        const led = btn.querySelector('.bgm-led-dot');
        const label = btn.querySelector('.bgm-btn-label');
        if (label) {
          label.textContent = enabled ? '[ BGM: ON ]' : '[ BGM: OFF ]';
        }
        if (led) {
          if (enabled) {
            led.className = 'bgm-led-dot w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] transition-all';
          } else {
            led.className = 'bgm-led-dot w-2 h-2 rounded-full bg-zinc-600 shadow-none transition-all';
          }
        }
        if (enabled) {
          btn.classList.remove('border-zinc-700/80', 'text-zinc-400');
          btn.classList.add('border-cyan-500/50', 'text-cyan-200');
        } else {
          btn.classList.remove('border-cyan-500/50', 'text-cyan-200');
          btn.classList.add('border-zinc-700/80', 'text-zinc-400');
        }
      });
    }

    function playArpNote() {
      if (!enabled || !isPlaying) return;
      const ctx = sfx.init();
      if (!ctx || !masterGain) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const freq = ARP_NOTES[arpStep % ARP_NOTES.length];
        arpStep = (arpStep + 1) % ARP_NOTES.length;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        noteGain.gain.setValueAtTime(0.0005, now);
        noteGain.gain.linearRampToValueAtTime(0.22, now + 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.53);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.onended = () => {
          try { osc.disconnect(); } catch (_) {}
          try { noteGain.disconnect(); } catch (_) {}
        };

        osc.start(now);
        osc.stop(now + 0.55);
      } catch (_) {}
    }

    function start() {
      if (!enabled || isPlaying) return;
      const ctx = sfx.init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.001, now);
        masterGain.gain.linearRampToValueAtTime(0.068, now + 1.2);

        filterNode = ctx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(320, now);
        filterNode.Q.setValueAtTime(1.8, now);

        // Modulación lenta del filtro para atmósfera espacial cálida
        lfoOsc = ctx.createOscillator();
        lfoGain = ctx.createGain();
        lfoOsc.type = 'sine';
        lfoOsc.frequency.setValueAtTime(0.11, now);
        lfoGain.gain.setValueAtTime(75, now);
        lfoOsc.connect(lfoGain);
        lfoGain.connect(filterNode.frequency);

        // Drone Pad Espacial Cálido (E2 + B2 suavemente desafinados)
        droneOsc1 = ctx.createOscillator();
        droneOsc2 = ctx.createOscillator();
        const droneSubGain1 = ctx.createGain();
        const droneSubGain2 = ctx.createGain();

        droneOsc1.type = 'sawtooth';
        droneOsc1.frequency.setValueAtTime(82.41, now); // E2
        droneOsc1.detune.setValueAtTime(-7, now);
        droneSubGain1.gain.setValueAtTime(0.38, now);

        droneOsc2.type = 'triangle';
        droneOsc2.frequency.setValueAtTime(123.47, now); // B2
        droneOsc2.detune.setValueAtTime(6, now);
        droneSubGain2.gain.setValueAtTime(0.45, now);

        droneOsc1.connect(droneSubGain1);
        droneOsc2.connect(droneSubGain2);
        droneSubGain1.connect(filterNode);
        droneSubGain2.connect(filterNode);

        filterNode.connect(masterGain);
        masterGain.connect(ctx.destination);

        droneOsc1.start(now);
        droneOsc2.start(now);
        lfoOsc.start(now);

        isPlaying = true;
        if (arpIntervalId) clearInterval(arpIntervalId);
        arpIntervalId = setInterval(playArpNote, 600);
        updateButtonsUI();
      } catch (_) {}
    }

    function stop() {
      if (arpIntervalId) {
        clearInterval(arpIntervalId);
        arpIntervalId = null;
      }
      isPlaying = false;
      try {
        if (droneOsc1) { droneOsc1.stop(); droneOsc1.disconnect(); }
      } catch (_) {}
      try {
        if (droneOsc2) { droneOsc2.stop(); droneOsc2.disconnect(); }
      } catch (_) {}
      try {
        if (lfoOsc) { lfoOsc.stop(); lfoOsc.disconnect(); }
      } catch (_) {}
      try {
        if (lfoGain) lfoGain.disconnect();
      } catch (_) {}
      try {
        if (filterNode) filterNode.disconnect();
      } catch (_) {}
      try {
        if (masterGain) masterGain.disconnect();
      } catch (_) {}
      droneOsc1 = null;
      droneOsc2 = null;
      lfoOsc = null;
      lfoGain = null;
      filterNode = null;
      masterGain = null;
      updateButtonsUI();
    }

    function toggle() {
      enabled = !enabled;
      try {
        localStorage.setItem('lunar_bgm_enabled', enabled ? 'true' : 'false');
      } catch (_) {}
      sfx.init();
      sfx.playMenuSelect();
      if (enabled) {
        start();
      } else {
        stop();
      }
      updateButtonsUI();
    }

    function tryAutoStart() {
      if (enabled && !isPlaying) {
        start();
      }
    }

    function initControls() {
      updateButtonsUI();
      document.querySelectorAll('[data-bgm-toggle]').forEach((btn) => {
        if (btn.dataset.bgmBound === '1') return;
        btn.dataset.bgmBound = '1';
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggle();
        });
      });
    }

    return {
      start,
      stop,
      toggle,
      tryAutoStart,
      initControls,
      updateButtonsUI,
      isEnabled: () => enabled
    };
  })();
  bgmEngine.initControls();

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
        donkiEffectText.className = 'text-[9.5px] font-black text-rose-300 leading-tight text-right max-w-full overflow-hidden text-ellipsis whitespace-nowrap';
      } else if (donkiMod.type === 'M') {
        donkiEffectText.textContent = isEn ? '+8.5 mSv IN CRATES' : '+8.5 mSv EN CAJAS';
        donkiEffectText.className = 'text-[9.5px] font-black text-amber-200 leading-tight text-right max-w-full overflow-hidden text-ellipsis whitespace-nowrap';
      } else {
        donkiEffectText.textContent = isEn ? '+5% PASSIVE ENERGY IN CALM' : '+5% ENERGÍA PASIVA EN CALMA';
        donkiEffectText.className = 'text-[9.5px] font-black text-emerald-300 leading-tight text-right max-w-full overflow-hidden text-ellipsis whitespace-nowrap';
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
    window.evaUsedThisSol = false;
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
  let isTransitioningCase = false;

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
    const introBriefingModal = document.getElementById('intro-briefing-modal');
    [titleScreenModal, difficultyScreen, introBriefingModal, hangarLoadoutScreen].forEach(hidePremissionScreen);
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
        donkiEffectText.className = 'text-[9.5px] font-black text-rose-300 leading-tight text-right max-w-full overflow-hidden text-ellipsis whitespace-nowrap';
      } else if (donkiMod.type === 'M') {
        donkiEffectText.textContent = isEn ? '+8.5 mSv IN CRATES' : '+8.5 mSv EN CAJAS';
        donkiEffectText.className = 'text-[9.5px] font-black text-amber-200 leading-tight text-right max-w-full overflow-hidden text-ellipsis whitespace-nowrap';
      } else {
        donkiEffectText.textContent = isEn ? '+5% PASSIVE ENERGY IN CALM' : '+5% ENERGÍA PASIVA EN CALMA';
        donkiEffectText.className = 'text-[9.5px] font-black text-emerald-300 leading-tight text-right max-w-full overflow-hidden text-ellipsis whitespace-nowrap';
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
    isTransitioningCase = false;
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

  // Caché de geometría relativa del lente dentro del escáner (actualizada solo en pointerdown/resize, CERO reflow en pointermove)
  let scannerLensOffset = { left: 8, top: 38, width: 304, height: 215 };
  function cacheScannerLensOffset() {
    if (!scannerEl) return;
    const lensEl = scannerEl.querySelector('#scanner-lens') || document.getElementById('scanner-lens');
    if (lensEl && lensEl !== scannerEl && lensEl.offsetWidth > 0 && lensEl.offsetHeight > 0) {
      scannerLensOffset = {
        left: lensEl.offsetLeft || 8,
        top: lensEl.offsetTop || 38,
        width: lensEl.offsetWidth || 304,
        height: lensEl.offsetHeight || 215
      };
    }
  }

  function applyZoneScan(targetEl, xrayZone, lensRect) {
    if (!targetEl || !xrayZone || !lensRect) return false;
    const tLeft = (targetEl._baseLeft !== undefined ? targetEl._baseLeft : 0) + (targetEl._tx || 0);
    const tTop = (targetEl._baseTop !== undefined ? targetEl._baseTop : 0) + (targetEl._ty || 0);
    const tWidth = targetEl._width || 300;
    const tHeight = targetEl._height || 300;
    const targetRect = {
      left: tLeft,
      top: tTop,
      right: tLeft + tWidth,
      bottom: tTop + tHeight
    };

    const overlapLeft = Math.max(lensRect.left, targetRect.left);
    const overlapTop = Math.max(lensRect.top, targetRect.top);
    const overlapRight = Math.min(lensRect.right, targetRect.right);
    const overlapBottom = Math.min(lensRect.bottom, targetRect.bottom);

    if (overlapRight > overlapLeft && overlapBottom > overlapTop) {
      const top = Math.round(Math.max(0, overlapTop - targetRect.top));
      const left = Math.round(Math.max(0, overlapLeft - targetRect.left));
      const right = Math.round(Math.max(0, targetRect.right - overlapRight));
      const bottom = Math.round(Math.max(0, targetRect.bottom - overlapBottom));
      const clipStr = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
      if (xrayZone._lastClip !== clipStr) {
        xrayZone._lastClip = clipStr;
        xrayZone.style.clipPath = clipStr;
        xrayZone.style.webkitClipPath = clipStr;
      }
      if (xrayZone._isColliding !== true) {
        xrayZone._isColliding = true;
        xrayZone.classList.add('is-scanned');
      }
      return true;
    } else {
      const hiddenClip = 'inset(0px 100% 100% 0px)';
      if (xrayZone._lastClip !== hiddenClip) {
        xrayZone._lastClip = hiddenClip;
        xrayZone.style.clipPath = hiddenClip;
        xrayZone.style.webkitClipPath = hiddenClip;
      }
      if (xrayZone._isColliding !== false) {
        xrayZone._isColliding = false;
        xrayZone.classList.remove('is-scanned');
      }
      return false;
    }
  }

  function updateScannerCollisions(playAudio = false) {
    if (!scannerEl || !dossierXrayZone || !crateXrayZone) return;

    const sLeft = (scannerEl._baseLeft !== undefined ? scannerEl._baseLeft : 920) + (scannerEl._tx || 0);
    const sTop = (scannerEl._baseTop !== undefined ? scannerEl._baseTop : 25) + (scannerEl._ty || 0);
    const lensRect = {
      left: sLeft + scannerLensOffset.left,
      top: sTop + scannerLensOffset.top,
      right: sLeft + scannerLensOffset.left + scannerLensOffset.width,
      bottom: sTop + scannerLensOffset.top + scannerLensOffset.height
    };

    const dossierHit = applyZoneScan(dossierEl, dossierXrayZone, lensRect);
    const crateHit = applyZoneScan(crateEl, crateXrayZone, lensRect);

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
    if (isTransitioningCase) return;
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
      nextBtn.classList.add('hidden');
      nextBtn.style.display = 'none';
      nextBtn.style.pointerEvents = 'none';
    }

    // Transición automática al estampar tras 950ms para apreciar el sello físico
    if (!isTransitioningCase) {
      isTransitioningCase = true;
      setTimeout(() => {
        if (isEmergencyActive) {
          isTransitioningCase = false;
          return;
        }
        if (typeof checkAndTriggerEmergencyAfterDecision === 'function' && checkAndTriggerEmergencyAfterDecision()) {
          isTransitioningCase = false;
          return;
        }
        handleNextShiftClick();
      }, 950);
    }
  }

  function applyDecision(stampType) {
    const res = applyStampToDossier(stampType);
    caseDecided = true;
    const nextBtn = document.getElementById('next-case-btn') || document.getElementById('next-shift-btn') || nextShiftBtn;
    if (nextBtn) {
      nextBtn.classList.add('hidden');
      nextBtn.style.display = 'none';
      nextBtn.style.pointerEvents = 'none';
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
    isTransitioningCase = false;
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
      manualDrawerPanel.style.display = '';
      manualDrawerPanel.classList.remove('hidden');
      state.topZIndex += 1;
      manualDrawerPanel.style.zIndex = state.topZIndex;
    } else {
      manualDrawerPanel.classList.add('hidden');
      manualDrawerPanel.style.display = 'none';
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
    document.body.classList.remove('is-dragging-tool');
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
      cacheScannerLensOffset();
      activeDragItem = el;
      dragStartClientX = e.clientX;
      dragStartClientY = e.clientY;
      dragStartTx = el._tx || 0;
      dragStartTy = el._ty || 0;

      state.topZIndex += 1;
      el.style.zIndex = state.topZIndex;
      el.classList.add('is-dragging');
      el.style.transition = 'none';
      document.body.classList.add('is-dragging-tool');

      sfx.playGrab();

      if (el.setPointerCapture && e.pointerId) {
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
      }
    });
  }

  const handleNextShiftClick = () => {
    if (!caseDecided) return;
    if (isEmergencyActive) return;

    // Respaldo garantizado: si estaba programado minijuego en este Sol y por cualquier motivo aún no se disparó
    if (typeof prepareSolEmergencyPlan === 'function' && currentSolEmergencyPlan.sol !== state.sol) {
      prepareSolEmergencyPlan(state.sol);
    }
    if (currentSolEmergencyPlan.shouldTrigger && !minigameTriggeredThisSol) {
      minigameTriggeredThisSol = true;
      isTransitioningCase = false;
      if (typeof triggerRandomEmergencyMinigame === 'function') {
        triggerRandomEmergencyMinigame();
      } else if (typeof triggerEmergency === 'function') {
        triggerEmergency();
      }
      return;
    }

    caseDecided = false;
    isTransitioningCase = false;
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
    window.evaUsedThisSol = false;
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
      bgmEngine.tryAutoStart();
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
      bgmEngine.tryAutoStart();
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
  // 0.15 PANTALLA DE INTRODUCCIÓN NARRATIVA ("MISSION BRIEFING")
  // =======================================================================
  const INTRO_BRIEFING_COPY = {
    es: {
      signalLost: 'SOL 1 // HOUSTON LINK: OFFLINE',
      vanceBadge: 'CDR. VANCE // EVA-COMM',
      skipTypingHint: 'TRANSMISIÓN EN CURSO // CLIC O ESPACIO PARA COMPLETAR',
      readyHint: 'TRANSMISIÓN COMPLETA // ESPERANDO CONFIRMACIÓN',
      continueBtn: '[ SALTAR / ASUMIR CONTROL >> ]',
      lines: [
        'En 2026, la humanidad estableció su primera base permanente en el Cráter Shackleton del Polo Sur Lunar.',
        'Durante meses, el Comandante Vance y la tripulación mantuvieron en equilibrio los sistemas vitales en el silencio lunar.',
        'Pero hoy las alarmas despertaron la estación: el satélite DONKI detectó una tormenta solar Clase X y asteroides acercándose al sector.',
        'El enlace con Houston se ha perdido. Tú eres el Oficial de Esclusa: inspecciona cada ingreso, protege los 4 subsistemas... la base depende de ti.'
      ]
    },
    en: {
      signalLost: 'SOL 1 // HOUSTON LINK: OFFLINE',
      vanceBadge: 'CDR. VANCE // EVA-COMM',
      skipTypingHint: 'TRANSMISSION ACTIVE // CLICK OR SPACE TO COMPLETE',
      readyHint: 'TRANSMISSION COMPLETE // AWAITING CONFIRMATION',
      continueBtn: '[ SKIP / ASSUME CONTROL >> ]',
      lines: [
        'In 2026, humanity established its first permanent base in the Shackleton Crater at the Lunar South Pole.',
        'For months, Commander Vance and the crew maintained life-support equilibrium in the lunar silence.',
        'But today, alarms have awakened the station: DONKI satellite detected a Class X solar storm and asteroids approaching the sector.',
        'Communication with Houston has been lost. You are the Airlock Officer: inspect every arrival, protect the 4 subsystems... the crew depends on you.'
      ]
    }
  };

  let introBriefingTimerId = null;
  let introBriefingIsTyping = false;
  let introBriefingOnComplete = null;
  let introBriefingKeyHandler = null;

  function getIntroBriefingLangPack() {
    const isEn = window.GAME_SETTINGS && window.GAME_SETTINGS.lang === 'en';
    return isEn ? INTRO_BRIEFING_COPY.en : INTRO_BRIEFING_COPY.es;
  }

  function completeIntroBriefingTypingInstantly() {
    if (introBriefingTimerId) {
      clearTimeout(introBriefingTimerId);
      introBriefingTimerId = null;
    }
    introBriefingIsTyping = false;
    const pack = getIntroBriefingLangPack();
    for (let i = 0; i < 4; i++) {
      const lineEl = document.getElementById(`intro-line-${i}`);
      const cardEl = document.getElementById(`intro-card-${i}`);
      if (lineEl) lineEl.textContent = pack.lines[i] || '';
      if (cardEl) {
        cardEl.classList.remove('opacity-40');
        cardEl.classList.add('opacity-100');
      }
    }
    const hintEl = document.getElementById('intro-skip-hint');
    if (hintEl) hintEl.textContent = pack.readyHint;
  }

  function refreshIntroBriefingLanguage() {
    const modal = document.getElementById('intro-briefing-modal');
    if (!modal || modal.classList.contains('hidden')) return;
    const pack = getIntroBriefingLangPack();
    const sigText = document.getElementById('intro-signal-lost-text');
    const vanceBadge = document.getElementById('intro-vance-badge-text');
    const btnText = document.getElementById('intro-briefing-btn-text');
    const hintEl = document.getElementById('intro-skip-hint');
    if (sigText) sigText.textContent = pack.signalLost;
    if (vanceBadge) vanceBadge.textContent = pack.vanceBadge;
    if (btnText) btnText.textContent = pack.continueBtn;
    if (!introBriefingIsTyping) {
      for (let i = 0; i < 4; i++) {
        const lineEl = document.getElementById(`intro-line-${i}`);
        if (lineEl) lineEl.textContent = pack.lines[i] || '';
      }
      if (hintEl) hintEl.textContent = pack.readyHint;
    } else if (hintEl) {
      hintEl.textContent = pack.skipTypingHint;
    }
  }

  function closeIntroBriefingAndProceed() {
    if (introBriefingTimerId) {
      clearTimeout(introBriefingTimerId);
      introBriefingTimerId = null;
    }
    introBriefingIsTyping = false;
    if (introBriefingKeyHandler) {
      window.removeEventListener('keydown', introBriefingKeyHandler);
      introBriefingKeyHandler = null;
    }
    const modal = document.getElementById('intro-briefing-modal');
    if (modal) hidePremissionScreen(modal);
    const cb = introBriefingOnComplete;
    introBriefingOnComplete = null;
    if (typeof cb === 'function') cb();
  }

  function openIntroBriefingModal(onComplete) {
    const modal = document.getElementById('intro-briefing-modal');
    if (!modal) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    introBriefingOnComplete = onComplete;
    if (introBriefingTimerId) {
      clearTimeout(introBriefingTimerId);
      introBriefingTimerId = null;
    }

    const pack = getIntroBriefingLangPack();
    const sigText = document.getElementById('intro-signal-lost-text');
    const vanceBadge = document.getElementById('intro-vance-badge-text');
    const btnText = document.getElementById('intro-briefing-btn-text');
    const hintEl = document.getElementById('intro-skip-hint');
    if (sigText) sigText.textContent = pack.signalLost;
    if (vanceBadge) vanceBadge.textContent = pack.vanceBadge;
    if (btnText) btnText.textContent = pack.continueBtn;
    if (hintEl) hintEl.textContent = pack.skipTypingHint;

    for (let i = 0; i < 4; i++) {
      const lineEl = document.getElementById(`intro-line-${i}`);
      const cardEl = document.getElementById(`intro-card-${i}`);
      if (lineEl) lineEl.textContent = '';
      if (cardEl) {
        if (i === 0) {
          cardEl.classList.remove('opacity-40');
          cardEl.classList.add('opacity-100');
        } else {
          cardEl.classList.remove('opacity-100');
          cardEl.classList.add('opacity-40');
        }
      }
    }

    showPremissionScreen(modal, 'flex');
    introBriefingIsTyping = true;

    let currentLine = 0;
    let currentChar = 0;

    function typeNextStep() {
      if (!introBriefingIsTyping) return;
      const activePack = getIntroBriefingLangPack();
      const lines = activePack.lines;
      if (currentLine >= lines.length) {
        completeIntroBriefingTypingInstantly();
        return;
      }

      const cardEl = document.getElementById(`intro-card-${currentLine}`);
      if (cardEl) {
        cardEl.classList.remove('opacity-40');
        cardEl.classList.add('opacity-100');
      }

      const targetStr = lines[currentLine] || '';
      const lineEl = document.getElementById(`intro-line-${currentLine}`);
      currentChar += 2; // Velocidad ágil y fluida a 60fps
      if (lineEl) {
        lineEl.textContent = targetStr.slice(0, currentChar);
      }
      if (currentChar % 4 === 0) {
        sfx.playTypewriterTick(currentLine);
      }

      if (currentChar < targetStr.length) {
        introBriefingTimerId = setTimeout(typeNextStep, 22);
      } else {
        currentLine++;
        currentChar = 0;
        if (currentLine < lines.length) {
          introBriefingTimerId = setTimeout(typeNextStep, 320);
        } else {
          completeIntroBriefingTypingInstantly();
        }
      }
    }

    introBriefingTimerId = setTimeout(typeNextStep, 180);

    const continueBtn = document.getElementById('intro-briefing-continue-btn');
    if (continueBtn) {
      continueBtn.onclick = (e) => {
        e.stopPropagation();
        sfx.init();
        sfx.playMenuSelect();
        closeIntroBriefingAndProceed();
      };
    }

    const topSkipBtn = document.getElementById('intro-top-skip-btn');
    if (topSkipBtn) {
      topSkipBtn.onclick = (e) => {
        e.stopPropagation();
        sfx.init();
        sfx.playMenuSelect();
        closeIntroBriefingAndProceed();
      };
    }

    modal.onclick = (e) => {
      if (
        e.target.closest('#intro-briefing-continue-btn') ||
        e.target.closest('#intro-top-skip-btn') ||
        e.target.closest('[data-bgm-toggle]')
      ) return;
      sfx.init();
      if (introBriefingIsTyping) {
        sfx.playClick();
        completeIntroBriefingTypingInstantly();
      } else {
        sfx.playMenuSelect();
        closeIntroBriefingAndProceed();
      }
    };

    if (introBriefingKeyHandler) {
      window.removeEventListener('keydown', introBriefingKeyHandler);
    }
    introBriefingKeyHandler = (e) => {
      if (modal.classList.contains('hidden')) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        sfx.init();
        if (introBriefingIsTyping) {
          sfx.playClick();
          completeIntroBriefingTypingInstantly();
        } else {
          sfx.playMenuSelect();
          closeIntroBriefingAndProceed();
        }
      }
    };
    window.addEventListener('keydown', introBriefingKeyHandler);
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
      bgmEngine.tryAutoStart();
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

      // Mostrar primero la Pantalla de Introducción Narrativa ("Mission Briefing")
      openIntroBriefingModal(() => {
        showPremissionScreen(hangarLoadoutScreen, 'flex');
        // Iniciar Secuencia 1 del Tutorial en el Hangar
        setTimeout(() => {
          startHangarTutorial();
        }, 300);
      });
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
        window.evaUsedThisSol = false;
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
      appMainTitle: 'MOONTRIP // SHACKLETON BASE AIRLOCK',
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
      settingsSubtitle: 'MOONTRIP // SHACKLETON BASE AIRLOCK',
      minigameChanceLabel: 'PROBABILIDAD DE EMERGENCIA POR SOL',
      minigameChanceDesc: 'Evalúa al inicio de cada Sol si ocurre un minijuego táctil de emergencia (máx. 1 por Sol). Al 100% ocurre siempre garantizado. Al 0% nunca ocurrirán emergencias.',
      sliderZero: '0% (DESACTIVADO)',
      sliderHundred: '100% (GARANTIZADO)',
      langLabel: 'IDIOMA DE LA INTERFAZ // LANGUAGE',
      settingsSaveBtn: '[ ACEPTAR Y GUARDAR ]',

      changeMissionBtn: 'CAMBIAR MISIÓN',
      hangarTitle: 'MOONTRIP // CONFIGURACIÓN DE CARGA ARTEMIS',
      remainingBudget: 'PRESUPUESTO RESTANTE',
      cargoBay: 'BODEGA DE CARGA',

      lunarCampaign: 'MOONTRIP // CAMPAÑA',
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
      appMainTitle: 'MOONTRIP // SHACKLETON BASE AIRLOCK',
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
      settingsSubtitle: 'MOONTRIP // SHACKLETON BASE AIRLOCK',
      minigameChanceLabel: 'EMERGENCY PROBABILITY PER SOL',
      minigameChanceDesc: 'Evaluates at each Sol start if a tactical emergency minigame occurs (max 1 per Sol). At 100% it is guaranteed every Sol. At 0% no emergencies occur.',
      sliderZero: '0% (DISABLED)',
      sliderHundred: '100% (GUARANTEED)',
      langLabel: 'INTERFACE LANGUAGE // IDIOMA',
      settingsSaveBtn: '[ ACCEPT AND SAVE ]',

      changeMissionBtn: 'CHANGE MISSION',
      hangarTitle: 'MOONTRIP // ARTEMIS CARGO CONFIGURATION',
      remainingBudget: 'REMAINING BUDGET',
      cargoBay: 'CARGO BAY',

      lunarCampaign: 'MOONTRIP // CAMPAIGN',
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
      refreshIntroBriefingLanguage();
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
    const headerOpenBtn = document.getElementById('header-settings-btn');
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
    if (headerOpenBtn) {
      headerOpenBtn.addEventListener('click', (e) => {
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

  // ---------- SALA 1: BIODOMO (COMIDA / BIOMASA) ----------
  function renderBiodomeScene(st, uid = '') {
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const foodVal = Math.max(0, Math.min(100, state.resources.food !== undefined ? state.resources.food : 75));
    const crit = st === 'critical' || foodVal <= 30;
    const degraded = st === 'degraded' || (!crit && foodVal < 70);
    const optimal = !crit && !degraded;
    const tranActive = wasDecision('SOL1-C1', 'AUTHORIZE');
    const u = uid || ('aph_' + Math.floor(Math.random() * 100000));

    // Paleta de Estado y Fluidos
    const statusColor = crit ? '#ef4444' : (degraded ? '#f59e0b' : '#10b981');
    const nutrientFluid = crit ? '#7f1d1d' : (degraded ? '#d97706' : '#10b981');
    const plantHealth = optimal ? 'ok' : (degraded ? 'wilt' : 'dead');

    // 1. Fotobiorreactor de Microalgas (Izquierda: x=25..135, centro 80)
    let bubbles = '';
    const bubbleCount = crit ? 2 : (degraded ? 5 : 9);
    for (let b = 0; b < bubbleCount; b++) {
      const bx = 46 + (b * 9) % 68;
      bubbles += `<circle class="bubble" cx="${bx}" cy="265" r="${1.8 + (b % 3) * 0.7}" fill="#d1fae5" style="--rise:180px; animation-delay:${(b * 0.38).toFixed(2)}s; animation-duration:${(2.2 + (b % 3) * 0.4).toFixed(1)}s;"/>`;
    }

    const algaeTower = `
      <!-- FOTOBIORREACTOR CILÍNDRICO 3D DE MICROALGAS (SPIRULINA) -->
      <g id="algae-reactor-${u}">
        <!-- Soporte superior de acero cepillado -->
        <rect x="36" y="52" width="88" height="14" rx="2" fill="url(#metalSteel${u})" stroke="#475569" stroke-width="1.2"/>
        <circle cx="46" cy="59" r="1.5" fill="#cbd5e1"/>
        <circle cx="114" cy="59" r="1.5" fill="#cbd5e1"/>

        <!-- Cilindro de Cristal Blindado -->
        <rect x="38" y="66" width="84" height="212" rx="6" fill="#030907" stroke="#334155" stroke-width="1.5"/>
        <rect x="40" y="68" width="80" height="208" rx="4" fill="url(#algaeFluid${u})" opacity="${crit ? 0.35 : 0.88}"/>
        <line x1="45" y1="70" x2="45" y2="272" stroke="#a7f3d0" stroke-width="2" opacity="0.6"/>

        <!-- Hélice / Rotor mezclador interno -->
        <g class="algae-spin" style="transform-origin: 80px 170px;">
          <line x1="80" y1="72" x2="80" y2="268" stroke="#064e3b" stroke-width="2"/>
          <ellipse cx="80" cy="115" rx="28" ry="6" fill="none" stroke="#6ee7b7" stroke-width="1.5" opacity="0.7"/>
          <ellipse cx="80" cy="170" rx="28" ry="6" fill="none" stroke="#6ee7b7" stroke-width="1.5" opacity="0.7"/>
          <ellipse cx="80" cy="225" rx="28" ry="6" fill="none" stroke="#6ee7b7" stroke-width="1.5" opacity="0.7"/>
        </g>
        ${bubbles}

        <!-- Base Pedestal y Display LCD -->
        <path d="M 32 278 L 128 278 L 132 322 L 28 322 Z" fill="url(#pedestalDark${u})" stroke="#475569" stroke-width="1.5"/>
        <rect x="36" y="284" width="88" height="28" rx="2" fill="#030712" stroke="${statusColor}" stroke-width="1"/>
        <text x="80" y="294" fill="#6ee7b7" font-family="monospace" font-size="5" font-weight="900" text-anchor="middle">ALGAE-BIO 01 // SPIRULINA</text>
        <text x="80" y="306" fill="#38bdf8" font-family="monospace" font-size="6.5" font-weight="900" text-anchor="middle">${((foodVal / 100) * 3000).toFixed(0)} kcal/d</text>
      </g>
    `;

    // 2. Torre Dosificadora Hidropónica NPK (Derecha: x=665..775, centro 720)
    const nLevel = Math.max(8, Math.round(150 * (foodVal / 100)));
    const pLevel = Math.max(8, Math.round(150 * (foodVal / 100)));
    const kLevel = Math.max(8, Math.round(150 * (foodVal / 100)));
    const needleDeg = -120 + (foodVal / 100) * 240;

    const npkTower = `
      <!-- TORRE DOSIFICADORA NPK Y RECICLAJE H2O -->
      <g id="npk-doser-${u}">
        <!-- Chasis exterior del rack -->
        <rect x="668" y="52" width="104" height="226" rx="4" fill="url(#rackMetal${u})" stroke="#334155" stroke-width="1.5"/>

        <!-- Manómetro de Presión Hidráulica Superior -->
        <g transform="translate(720, 64)">
          <circle cx="0" cy="0" r="11" fill="#030712" stroke="#64748b" stroke-width="1.5"/>
          <circle cx="0" cy="0" r="1.5" fill="#f8fafc"/>
          <line x1="0" y1="0" x2="0" y2="-7" stroke="#f43f5e" stroke-width="1.2" transform="rotate(${needleDeg})"/>
        </g>

        <!-- 3 Cilindros Químicos: N (Azul), P (Ámbar), K (Verde) -->
        <!-- Nitrógeno (N) -->
        <g transform="translate(674, 82)">
          <rect x="0" y="0" width="22" height="154" rx="3" fill="#030712" stroke="#334155" stroke-width="1"/>
          <rect x="2" y="${152 - nLevel}" width="18" height="${nLevel}" rx="2" fill="url(#nitroGrad${u})" opacity="0.9"/>
          <text x="11" y="14" fill="#38bdf8" font-family="monospace" font-size="5" font-weight="900" text-anchor="middle">N</text>
        </g>

        <!-- Fósforo (P) -->
        <g transform="translate(709, 82)">
          <rect x="0" y="0" width="22" height="154" rx="3" fill="#030712" stroke="#334155" stroke-width="1"/>
          <rect x="2" y="${152 - pLevel}" width="18" height="${pLevel}" rx="2" fill="url(#phosGrad${u})" opacity="0.9"/>
          <text x="11" y="14" fill="#fbbf24" font-family="monospace" font-size="5" font-weight="900" text-anchor="middle">P</text>
        </g>

        <!-- Potasio (K) -->
        <g transform="translate(744, 82)">
          <rect x="0" y="0" width="22" height="154" rx="3" fill="#030712" stroke="#334155" stroke-width="1"/>
          <rect x="2" y="${152 - kLevel}" width="18" height="${kLevel}" rx="2" fill="url(#potasGrad${u})" opacity="0.9"/>
          <text x="11" y="14" fill="#34d399" font-family="monospace" font-size="5" font-weight="900" text-anchor="middle">K</text>
        </g>

        <!-- Base y Pantalla LCD de Telemetría -->
        <path d="M 664 278 L 776 278 L 780 322 L 660 322 Z" fill="url(#pedestalDark${u})" stroke="#475569" stroke-width="1.5"/>
        <rect x="672" y="284" width="96" height="28" rx="2" fill="#030712" stroke="${statusColor}" stroke-width="1"/>
        <text x="720" y="294" fill="#94a3b8" font-family="monospace" font-size="5" font-weight="900" text-anchor="middle">NPK-DOSER // H2O-RECYCLE</text>
        <text x="720" y="306" fill="#38bdf8" font-family="monospace" font-size="6.5" font-weight="900" text-anchor="middle">PH: 6.2 // RH: ${foodVal >= 70 ? '78%' : (foodVal >= 35 ? '64%' : '38%')}</text>
      </g>
    `;

    // 3. Riel Superior de Luminarias Fotosintéticas LED (y: 40 a 62, despejado de y:0..36)
    const podCenters = [214, 338, 462, 586];
    let growLamps = `
      <!-- RIEL HORIZONTAL DE LUMINARIAS FOTOSINTÉTICAS (y=40 a 44) -->
      <rect x="150" y="40" width="500" height="4" fill="url(#metalSteel${u})" stroke="#475569" stroke-width="0.8"/>
    `;

    podCenters.forEach((lx, i) => {
      const lampFlicker = degraded && i % 2 === 1 ? ' uv-flicker' : '';
      growLamps += `
        <!-- Luminaria Industrial APH 0${i + 1} -->
        <g class="${lampFlicker.trim()}">
          <!-- Aletas de Disipación Térmica -->
          <g stroke="#334155" stroke-width="1">
            <line x1="${lx - 34}" y1="36" x2="${lx - 34}" y2="44"/>
            <line x1="${lx - 18}" y1="36" x2="${lx - 18}" y2="44"/>
            <line x1="${lx}" y1="36" x2="${lx}" y2="44"/>
            <line x1="${lx + 18}" y1="36" x2="${lx + 18}" y2="44"/>
            <line x1="${lx + 34}" y1="36" x2="${lx + 34}" y2="44"/>
          </g>
          <!-- Carcasa Metálica Cepillada -->
          <rect x="${lx - 38}" y="44" width="76" height="14" rx="2" fill="url(#metalSteel${u})" stroke="#64748b" stroke-width="1"/>
          <!-- Diodos LED Fotosintéticos (630nm Rojo + 450nm Azul) -->
          ${[-28, -14, 0, 14, 28].map((dx, k) => `
            <circle cx="${lx + dx}" cy="54" r="2.2" fill="${crit ? '#ef4444' : (k % 2 === 0 ? '#f43f5e' : '#38bdf8')}"/>
          `).join('')}

          <!-- Cono de Luz Fotosintética Magenta / Violeta hacia abajo -->
          <polygon class="grow-light-cone" points="${lx - 34},58 ${lx + 34},58 ${lx + 52},230 ${lx - 52},230" fill="url(#growLightGrad${u})" opacity="${crit ? 0.05 : (degraded ? 0.45 : 0.85)}"/>
        </g>`;
    });

    // 4. Conectores de Tuberías de Irrigación
    const conduits = `
      <!-- Tubería de Irrigación Superior e Inferior -->
      <path d="M 124 58 L 158 58" stroke="#1e293b" stroke-width="6"/>
      <path class="nutrient-flow" d="M 124 58 L 158 58" stroke="${nutrientFluid}" stroke-width="2"/>

      <path d="M 642 58 L 668 58" stroke="#1e293b" stroke-width="6"/>
      <path class="nutrient-flow" d="M 642 58 L 668 58" stroke="${nutrientFluid}" stroke-width="2"/>

      <path d="M 128 300 L 158 300" stroke="#1e293b" stroke-width="5"/>
      <path d="M 642 300 L 664 300" stroke="#1e293b" stroke-width="5"/>
    `;

    // 5. 4 Cápsulas de Cultivo Aeropónico de Doble Cámara (x = 158, 282, 406, 530)
    const podMeta = [
      { id: 'POD-A1', label: 'WHEAT', type: 'wheat' },
      { id: 'POD-B2', label: 'SOY', type: 'soy' },
      { id: 'POD-C3', label: 'GREENS', type: 'greens' },
      { id: 'POD-D4', label: 'FLORA', type: 'flora' }
    ];

    let podsSvg = '';
    podMeta.forEach((pod, idx) => {
      const px = 158 + idx * 124;
      const cx = px + 56;
      const rotClass = plantHealth === 'ok' ? 'stalk-ok' : (plantHealth === 'wilt' ? 'stalk-wilt' : 'stalk-dead');

      // Generador de Flora según el Tipo de Cápsula
      let plantSvg = '';
      if (pod.type === 'wheat') {
        // Trigo Enano Apogee con Espigas Doradas
        [cx - 24, cx - 8, cx + 8, cx + 24].forEach((sx, k) => {
          const stemColor = plantHealth === 'ok' ? '#eab308' : (plantHealth === 'wilt' ? '#a16207' : '#44403c');
          const grainColor = plantHealth === 'ok' ? '#fde047' : (plantHealth === 'wilt' ? '#ca8a04' : '#292524');
          plantSvg += `
            <g class="stalk ${rotClass}" style="transform-origin:${sx}px 230px; animation-delay:${(k * 0.4).toFixed(1)}s;">
              <path d="M${sx} 230 C${sx - 4} 185, ${sx + 6} 150, ${sx} 125" stroke="${stemColor}" stroke-width="2" fill="none" stroke-linecap="round"/>
              <!-- Espiga de Trigo con Granos -->
              ${[0, 6, 12, 18, 24].map(gy => `
                <ellipse cx="${sx - 3}" cy="${125 + gy}" rx="2.5" ry="4" transform="rotate(-25, ${sx - 3}, ${125 + gy})" fill="${grainColor}"/>
                <ellipse cx="${sx + 3}" cy="${125 + gy}" rx="2.5" ry="4" transform="rotate(25, ${sx + 3}, ${125 + gy})" fill="${grainColor}"/>
              `).join('')}
              <path d="M${sx} 190 Q${sx - 16} 175 ${sx - 18} 160" stroke="${stemColor}" stroke-width="1.5" fill="none"/>
              <path d="M${sx} 170 Q${sx + 16} 155 ${sx + 18} 140" stroke="${stemColor}" stroke-width="1.5" fill="none"/>
            </g>`;
        });
      } else if (pod.type === 'soy') {
        // Soja Hidropónica con Hojas Trifoliadas
        const leafColor = plantHealth === 'ok' ? '#22c55e' : (plantHealth === 'wilt' ? '#854d0e' : '#292524');
        const leafColor2 = plantHealth === 'ok' ? '#4ade80' : (plantHealth === 'wilt' ? '#ca8a04' : '#44403c');
        plantSvg = `
          <g class="stalk ${rotClass}" style="transform-origin:${cx}px 230px;">
            <path d="M${cx} 230 C${cx - 6} 190, ${cx + 4} 160, ${cx} 130" stroke="#15803d" stroke-width="3" fill="none"/>
            <!-- Hojas Trifoliadas -->
            <ellipse cx="${cx - 18}" cy="180" rx="12" ry="7" transform="rotate(-30, ${cx - 18}, 180)" fill="${leafColor}" stroke="#166534" stroke-width="0.8"/>
            <ellipse cx="${cx + 18}" cy="175" rx="12" ry="7" transform="rotate(30, ${cx + 18}, 175)" fill="${leafColor}" stroke="#166534" stroke-width="0.8"/>
            <ellipse cx="${cx - 16}" cy="145" rx="11" ry="6" transform="rotate(-20, ${cx - 16}, 145)" fill="${leafColor2}" stroke="#166534" stroke-width="0.8"/>
            <ellipse cx="${cx + 16}" cy="142" rx="11" ry="6" transform="rotate(20, ${cx + 16}, 142)" fill="${leafColor2}" stroke="#166534" stroke-width="0.8"/>
            <ellipse cx="${cx}" cy="122" rx="10" ry="14" fill="${leafColor2}" stroke="#166534" stroke-width="0.8"/>
          </g>`;
      } else if (pod.type === 'greens') {
        // Hortalizas de Hoja Ancha Outredgeous
        const outerGreen = plantHealth === 'ok' ? '#047857' : (plantHealth === 'wilt' ? '#713f12' : '#292524');
        const innerRuby = plantHealth === 'ok' ? '#10b981' : (plantHealth === 'wilt' ? '#a16207' : '#44403c');
        plantSvg = `
          <g class="stalk ${rotClass}" style="transform-origin:${cx}px 230px;">
            <path d="M${cx} 230 L${cx} 190" stroke="#065f46" stroke-width="4"/>
            <!-- Capas concéntricas de hojas onduladas -->
            <path d="M${cx - 32} 220 Q${cx - 38} 170 ${cx - 18} 150 Q${cx} 210 ${cx - 32} 220 Z" fill="${outerGreen}"/>
            <path d="M${cx + 32} 220 Q${cx + 38} 170 ${cx + 18} 150 Q${cx} 210 ${cx + 32} 220 Z" fill="${outerGreen}"/>
            <path d="M${cx - 22} 222 Q${cx - 24} 150 ${cx - 8} 135 Q${cx} 190 ${cx - 22} 222 Z" fill="${innerRuby}"/>
            <path d="M${cx + 22} 222 Q${cx + 24} 150 ${cx + 8} 135 Q${cx} 190 ${cx + 22} 222 Z" fill="${innerRuby}"/>
            <ellipse cx="${cx}" cy="140" rx="14" ry="20" fill="${innerRuby}"/>
          </g>`;
      } else {
        // Micro-flora y Tomates Miniatura Red Robin
        const floraStem = plantHealth === 'ok' ? '#15803d' : (plantHealth === 'wilt' ? '#713f12' : '#292524');
        const fruitColor = plantHealth === 'ok' ? '#ef4444' : (plantHealth === 'wilt' ? '#991b1b' : '#1c1917');
        plantSvg = `
          <g class="stalk ${rotClass}" style="transform-origin:${cx}px 230px;">
            <path d="M${cx} 230 Q${cx - 10} 180 ${cx} 130" stroke="${floraStem}" stroke-width="3" fill="none"/>
            <path d="M${cx - 4} 185 Q${cx - 24} 165 ${cx - 20} 150" stroke="${floraStem}" stroke-width="2" fill="none"/>
            <path d="M${cx + 2} 170 Q${cx + 24} 155 ${cx + 18} 140" stroke="${floraStem}" stroke-width="2" fill="none"/>
            <!-- Hojas -->
            <ellipse cx="${cx - 16}" cy="162" rx="9" ry="5" fill="#22c55e"/>
            <ellipse cx="${cx + 16}" cy="150" rx="9" ry="5" fill="#22c55e"/>
            <!-- Frutos Red Robin -->
            <circle cx="${cx - 20}" cy="150" r="5" fill="${fruitColor}" stroke="#991b1b" stroke-width="0.8"/>
            <circle cx="${cx + 18}" cy="140" r="5.5" fill="${fruitColor}" stroke="#991b1b" stroke-width="0.8"/>
            <circle cx="${cx + 2}" cy="130" r="4.5" fill="${fruitColor}" stroke="#991b1b" stroke-width="0.8"/>
          </g>`;
      }

      // Nivel de Solución de Raíces Reactivo
      const rootSolH = Math.max(4, Math.round(32 * (foodVal / 100)));
      const rootSolY = 290 - rootSolH;

      podsSvg += `
        <!-- CÁPSULA AEROPÓNICA ${pod.id} -->
        <g id="pod-${pod.id}-${u}">
          <!-- Cabezal Superior de Riego con Boquilla Mist -->
          <rect x="${px + 8}" y="82" width="96" height="12" rx="2" fill="url(#metalSteel${u})" stroke="#475569" stroke-width="1.2"/>
          <rect x="${cx - 8}" y="92" width="16" height="4" rx="1" fill="#0284c7"/>
          <!-- Cono de Rocío Aeropónico Micronizado -->
          <polygon class="aero-mist" points="${cx - 6},96 ${cx + 6},96 ${cx + 34},160 ${cx - 34},160" fill="url(#mistGrad${u})"/>

          <!-- Cámara Foliar de Cristal Biselado (y=94 a 235) -->
          <rect x="${px}" y="94" width="112" height="141" rx="6" fill="#03080e" stroke="#334155" stroke-width="1.5"/>
          <line x1="${px + 4}" y1="98" x2="${px + 4}" y2="231" stroke="#38bdf8" stroke-width="1" opacity="0.4"/>
          <!-- Vegetación Interna -->
          ${plantSvg}

          <!-- Sub-Cámara de Raíces y Solución Nutritiva (y=235 a 294) -->
          <rect x="${px}" y="235" width="112" height="59" fill="#05080e" stroke="#1e293b" stroke-width="1.2"/>
          <!-- Líquido Nutritivo Reactivo -->
          <rect x="${px + 2}" y="${rootSolY}" width="108" height="${rootSolH}" fill="url(#rootWaterGrad${u})" opacity="${crit ? 0.2 : 0.75}"/>
          <line x1="${px + 2}" y1="${rootSolY}" x2="${px + 110}" y2="${rootSolY}" stroke="#67e8f9" stroke-width="1" opacity="0.8"/>

          <!-- Raíces Ramificadas Suspendidas -->
          <g stroke="${optimal ? '#cbd5e1' : (degraded ? '#a1a1aa' : '#52525b')}" stroke-width="1.2" fill="none">
            <path d="M${cx - 15} 235 Q${cx - 20} 255 ${cx - 30} 275 M${cx - 20} 255 Q${cx - 12} 265 ${cx - 14} 280"/>
            <path d="M${cx} 235 Q${cx - 2} 260 ${cx} 284 M${cx - 2} 260 Q${cx + 8} 270 ${cx + 12} 280"/>
            <path d="M${cx + 15} 235 Q${cx + 22} 255 ${cx + 32} 275 M${cx + 22} 255 Q${cx + 14} 265 ${cx + 18} 282"/>
          </g>

          <!-- Chasis Inferior y Placa de Telemetría (y=294 a 324) -->
          <rect x="${px}" y="294" width="112" height="30" rx="3" fill="url(#metalSteel${u})" stroke="#475569" stroke-width="1.2"/>
          <rect x="${px + 4}" y="298" width="104" height="22" rx="2" fill="#090d16" stroke="#1e293b" stroke-width="0.8"/>
          <!-- Etiqueta Grabada y LED de Estado -->
          <text x="${px + 10}" y="312" fill="#f8fafc" font-family="monospace" font-size="6.5" font-weight="900">${pod.id} // ${pod.label}</text>
          <circle cx="${px + 98}" cy="309" r="3" fill="${statusColor}"/>
        </g>`;
    });

    // 6. Dra. Tran Supervisando Cultivos
    const tranFig = tranActive && optimal ? `
      <!-- DRA. TRAN: SUPERVISIÓN ACTIVA DE CULTIVOS ESPACIALES -->
      <g id="dr-tran-${u}">
        <ellipse cx="398" cy="360" rx="18" ry="5" fill="#030406" opacity="0.8"/>
        <!-- Traje de Bio-Investigación Shackleton -->
        <rect x="382" y="306" width="32" height="52" rx="8" fill="#f4f4f5" stroke="#94a3b8" stroke-width="1.5"/>
        <rect x="382" y="306" width="8" height="16" rx="4" fill="#10b981"/>
        <rect x="406" y="306" width="8" height="16" rx="4" fill="#10b981"/>
        <!-- Escafandra con Visor Botánico Reflectivo -->
        <circle cx="398" cy="292" r="15" fill="#f4f4f5" stroke="#94a3b8" stroke-width="1.8"/>
        <rect x="388" y="285" width="20" height="13" rx="5" fill="#065f46" stroke="#fbbf24" stroke-width="1.5"/>
        <path d="M390 288 Q398 284 406 288" stroke="#a7f3d0" stroke-width="1.2" fill="none"/>
        <rect x="386" y="312" width="16" height="4" rx="1" fill="#090d16"/>
        <text x="394" y="315" fill="#34d399" font-family="monospace" font-size="3" font-weight="900" text-anchor="middle">DR. TRAN</text>
        <!-- Brazo con Datapad de Telemetría Foliar -->
        <g class="tran-arm">
          <rect x="414" y="315" width="34" height="8" rx="4" fill="#e4e4e7" stroke="#94a3b8" stroke-width="1.2"/>
          <rect x="440" y="311" width="14" height="16" rx="2" fill="#030712" stroke="#10b981" stroke-width="0.8"/>
        </g>
      </g>` : '';

    // Esporas de Bio-Riesgo Flotantes (Solo en Crítico)
    const spores = crit ? [[220, 160], [310, 190], [420, 140], [520, 180], [600, 150]]
      .map(([x, y], i) => `<circle class="spore" cx="${x}" cy="${y}" r="2.5" fill="#ca8a04" style="animation-delay:${(i * 0.45).toFixed(2)}s;"/>`).join('') : '';

    // Badges de Estado Bilingües
    let badge;
    if (crit) {
      badge = isEn
        ? '<div class="cctv-badge cctv-badge-crit">[!] BASE FAMINE ALERT // BIOMASS COLLAPSE</div>'
        : '<div class="cctv-badge cctv-badge-crit">[!] ALERTA DE HAMBRUNA // COLAPSO DE BIOMASA</div>';
    } else if (tranActive && optimal) {
      badge = isEn
        ? '<div class="cctv-badge">[BIO] NASA APH NOMINAL // DR. TRAN: OPTIMIZING CROP YIELD</div>'
        : '<div class="cctv-badge">[BIO] NASA APH NOMINAL // DRA. TRAN: OPTIMIZANDO CULTIVOS</div>';
    } else if (optimal) {
      badge = isEn
        ? '<div class="cctv-badge">[OK] HYDROPONIC BIODOME NOMINAL // VEGGIE-PODS ACTIVE</div>'
        : '<div class="cctv-badge">[OK] BIODOMO HIDROPÓNICO NOMINAL // CÁPSULAS VEGGIE ACTIVAS</div>';
    } else {
      badge = isEn
        ? `<div class="cctv-badge cctv-badge-warn">[!] NPK NUTRIENT DEFICIT // CROP STRESS AT ${foodVal}%</div>`
        : `<div class="cctv-badge cctv-badge-warn">[!] DÉFICIT DE NUTRIENTES NPK // ESTRÉS EN CULTIVOS AL ${foodVal}%</div>`;
    }

    return `
      <div class="cctv-scene" data-state="${st}">
        <svg viewBox="0 0 800 380" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <!-- Gradiente de Pared del Invernadero Presurizado -->
            <linearGradient id="bioWall${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0e1216"/>
              <stop offset="50%" stop-color="#080c0f"/>
              <stop offset="100%" stop-color="#030507"/>
            </linearGradient>

            <!-- Acero y Metales Industriales -->
            <linearGradient id="metalSteel${u}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#334155"/>
              <stop offset="50%" stop-color="#64748b"/>
              <stop offset="100%" stop-color="#334155"/>
            </linearGradient>
            <linearGradient id="rackMetal${u}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#1e293b"/>
              <stop offset="50%" stop-color="#334155"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>
            <linearGradient id="pedestalDark${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#334155"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>

            <!-- Fluidos: Algas Spirulina, N, P, K y Agua de Raíces -->
            <linearGradient id="algaeFluid${u}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#064e3b"/>
              <stop offset="40%" stop-color="#10b981"/>
              <stop offset="70%" stop-color="#34d399"/>
              <stop offset="100%" stop-color="#047857"/>
            </linearGradient>
            <linearGradient id="nitroGrad${u}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#0369a1"/><stop offset="100%" stop-color="#38bdf8"/>
            </linearGradient>
            <linearGradient id="phosGrad${u}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#b45309"/><stop offset="100%" stop-color="#f59e0b"/>
            </linearGradient>
            <linearGradient id="potasGrad${u}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#047857"/><stop offset="100%" stop-color="#10b981"/>
            </linearGradient>
            <linearGradient id="rootWaterGrad${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#083344" stop-opacity="0.9"/>
            </linearGradient>

            <!-- Haces de Luz Fotosintética y Rocío Mist -->
            <linearGradient id="growLightGrad${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(232, 121, 249, 0.45)"/>
              <stop offset="60%" stop-color="rgba(168, 85, 247, 0.18)"/>
              <stop offset="100%" stop-color="rgba(168, 85, 247, 0)"/>
            </linearGradient>
            <linearGradient id="mistGrad${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(165, 243, 252, 0.6)"/>
              <stop offset="100%" stop-color="rgba(165, 243, 252, 0)"/>
            </linearGradient>
          </defs>

          <!-- FONDO DE LA BÓVEDA DEL INVERNADERO (x=0..800, y=0..380) -->
          <rect width="800" height="380" fill="url(#bioWall${u})"/>

          <!-- Costillas Estructurales Curvas de Titanio -->
          <g stroke="#1e293b" stroke-width="3" fill="none">
            <path d="M 25 320 Q 90 80, 200 42"/>
            <path d="M 775 320 Q 710 80, 600 42"/>
            <path d="M 140 320 Q 180 120, 260 42"/>
            <path d="M 660 320 Q 620 120, 540 42"/>
          </g>

          <!-- Textos Técnicos Stencil en Pared (Franja Superior y=24..34) -->
          <text x="400" y="24" fill="#475569" font-family="monospace" font-size="7.5" font-weight="900" text-anchor="middle" letter-spacing="2">BIOMASS MODULE 01 // NASA ADVANCED PLANT HABITAT (APH)</text>
          <text x="400" y="34" fill="${statusColor}" font-family="monospace" font-size="6" font-weight="bold" text-anchor="middle" letter-spacing="1">ECLSS BIO-REGENERATIVE LOOP // SPIRULINA BIOREACTOR & AEROPONICS</text>

          <!-- CONDUCCIÓN DE NUTRIENTES Y TUBERÍAS -->
          ${conduits}

          <!-- LUMINARIAS FOTOSINTÉTICAS LED SUPERIORES (y=40 a 62) -->
          ${growLamps}

          <!-- DOS TORRES LATERALES: FOTOBIORREACTOR (IZQ) Y DOSIFICADOR NPK (DER) -->
          ${algaeTower}
          ${npkTower}

          <!-- 4 CÁPSULAS CENTRALES DE CULTIVO AEROPÓNICO -->
          ${podsSvg}

          <!-- PISO TÉCNICO Y DRENAJE INFERIOR (y=324 a 380) -->
          <rect x="0" y="324" width="800" height="56" fill="#06090c"/>
          <g stroke="#1e293b" stroke-width="1">
            <line x1="0" y1="334" x2="800" y2="334"/>
            <line x1="0" y1="368" x2="800" y2="368"/>
            ${Array.from({ length: 32 }, (_, i) => `<line x1="${i * 25}" y1="324" x2="${i * 25}" y2="380" opacity="0.35"/>`).join('')}
          </g>

          <!-- FIGURA DE LA DRA. TRAN SUPERVISANDO (SI AUTORIZADA EN SOL 1) -->
          ${tranFig}

          <!-- ESPORAS FLOTANTES DE BIO-RIESGO EN MODO CRÍTICO -->
          ${spores}
        </svg>

        ${crit ? '<div class="cctv-darkness"></div><div class="cctv-alarm-wash"></div><div class="cctv-alarm-light"></div>' : ''}
        <div class="cctv-badge-stack">${badge}</div>
      </div>`;
  }

  // ---------- SALA 2: NÚCLEO DEL REACTOR (ENERGÍA) ----------
  function renderReactorScene(st, uid = '') {
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const pwrVal = Math.max(0, Math.min(100, state.resources.pwr !== undefined ? state.resources.pwr : 75));
    const crit = st === 'critical' || pwrVal <= 30;
    const degraded = st === 'degraded' || (!crit && pwrVal < 70);
    const optimal = !crit && !degraded;
    const rossi = state.flags.engineer_saved === true && optimal;
    const u = uid || ('krusty_' + Math.floor(Math.random() * 100000));

    // Paleta de Energía Reactiva
    const energyColor = crit ? '#f43f5e' : (degraded ? '#fbbf24' : '#38bdf8');
    const energyColor2 = crit ? '#ef4444' : (degraded ? '#f59e0b' : '#10b981');
    const haloColor = crit ? '#ef4444' : (degraded ? '#f59e0b' : '#38bdf8');
    const cellColor = crit ? '#f43f5e' : (degraded ? '#fbbf24' : '#22d3ee');

    // Potencia y Temperatura Real
    const kwOutput = ((pwrVal / 100) * 10.0).toFixed(1);
    const heatPipeTemp = pwrVal >= 70 ? '785°C' : (pwrVal >= 35 ? '640°C' : '410°C');
    const statusLabel = crit ? (isEn ? 'CRITICAL VOLTAGE DROP' : 'CAÍDA CRÍTICA DE TENSIÓN')
      : (degraded ? (isEn ? 'ATTENUATED KILOPOWER' : 'RÉGIMEN ATENUADO')
      : (isEn ? 'NOMINAL FISSION CORE' : 'NÚCLEO DE FISIÓN NOMINAL'));

    // Centro del Reactor NASA Kilopower KRUSTY en 3D
    const CX = 400;
    const CY = 168;

    // 4 Abrazaderas Hidráulicas de Anclaje a 45°, 135°, 225°, 315°
    let struts = '';
    [45, 135, 225, 315].forEach(deg => {
      const rad = deg * Math.PI / 180;
      const x1 = (CX + 106 * Math.cos(rad)).toFixed(1);
      const y1 = (CY + 106 * Math.sin(rad)).toFixed(1);
      const x2 = (CX + 148 * Math.cos(rad)).toFixed(1);
      const y2 = (CY + 148 * Math.sin(rad)).toFixed(1);
      struts += `
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1e293b" stroke-width="8" stroke-linecap="round"/>
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>
        <circle cx="${x2}" cy="${y2}" r="5" fill="#334155" stroke="#94a3b8" stroke-width="1.2"/>
        <circle cx="${x1}" cy="${y1}" r="3.5" fill="#475569" stroke="#cbd5e1" stroke-width="1"/>`;
    });

    // 12 Pernos Hexagonales Perimetrales del Anillo de Titanio
    let bolts = '';
    for (let b = 0; b < 12; b++) {
      const bRad = (b * 30) * Math.PI / 180;
      const bx = (CX + 100 * Math.cos(bRad)).toFixed(1);
      const by = (CY + 100 * Math.sin(bRad)).toFixed(1);
      bolts += `
        <circle cx="${bx}" cy="${by}" r="2.8" fill="#e2e8f0" stroke="#1e293b" stroke-width="0.8"/>
        <circle cx="${bx}" cy="${by}" r="1.2" fill="#475569"/>`;
    }

    // Filamentos de Plasma dinámicos (entre núcleo y reflector)
    const arcs = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy], i) => {
      const ex = CX + dx * 72;
      const ey = CY + dy * 72;
      const bend = 16 + i * 4;
      return `<path class="plasma" d="M${CX} ${CY} Q${CX + dx * 36 + dy * bend} ${CY + dy * 36 - dx * bend}, ${ex} ${ey}" stroke="${energyColor}" stroke-width="${crit ? 3.5 : 2.5}" fill="none" stroke-linecap="round"/>`;
    }).join('');

    // Racks de Conversión Stirling (Bancos A y B)
    const renderStirlingBank = (bx, bankLetter, title) => {
      let units = '';
      const unitYList = [68, 118, 168, 218];
      unitYList.forEach((uy, idx) => {
        const unitNum = idx + 1;
        const unitId = `STR-${bankLetter}${unitNum}`;
        const isOffline = crit && (idx === 1 || idx === 3);
        const isWarn = degraded && idx === 2;
        const uColor = isOffline ? '#ef4444' : (isWarn ? '#f59e0b' : '#10b981');
        const uText = isOffline ? 'OFFLINE' : (isWarn ? '60%' : '100%');

        units += `
          <!-- UNIDAD STIRLING ${unitId} -->
          <g class="stirling-unit">
            <!-- Chasis biselado de aleación -->
            <rect x="${bx}" y="${uy}" width="112" height="42" rx="3" fill="url(#stirlingChassis${u})" stroke="#475569" stroke-width="1.2"/>
            <rect x="${bx + 3}" y="${uy + 3}" width="106" height="36" rx="2" fill="#090d16" stroke="#1e293b" stroke-width="0.8"/>

            <!-- Cilindro de inducción de cobre y pistón Stirling -->
            <rect x="${bx + 6}" y="${uy + 6}" width="24" height="30" rx="3" fill="#18181b" stroke="#334155" stroke-width="1"/>
            <rect class="stirling-pulse" x="${bx + 8}" y="${uy + 8}" width="20" height="26" rx="2" fill="url(#stirlingCopper${u})" stroke="#d97706" stroke-width="0.8"/>
            <line class="stirling-pulse" x1="${bx + 8}" y1="${uy + 21}" x2="${bx + 28}" y2="${uy + 21}" stroke="#fef3c7" stroke-width="2"/>

            <!-- Etiqueta y Telemetría -->
            <text x="${bx + 36}" y="${uy + 17}" fill="#f8fafc" font-family="monospace" font-size="6.5" font-weight="900">${unitId}</text>
            <text x="${bx + 36}" y="${uy + 26}" fill="#94a3b8" font-family="monospace" font-size="5" font-weight="bold">EFF: ${uText}</text>

            <!-- Mini barras de carga de conversión -->
            <g transform="translate(${bx + 36}, ${uy + 29})">
              ${[0, 1, 2, 3].map(b => {
                const bLit = isOffline ? false : (isWarn ? b < 2 : (optimal ? true : b < 3));
                return `<rect x="${b * 6}" y="0" width="4.5" height="5" rx="1" fill="${bLit ? uColor : '#27272a'}" ${bLit ? `stroke="${uColor}" stroke-width="0.5"` : ''}/>`;
              }).join('')}
            </g>

            <!-- LED de Estado del Inversor y Hz -->
            <circle cx="${bx + 98}" cy="${uy + 15}" r="3" fill="${uColor}"/>
            <text x="${bx + 98}" y="${uy + 28}" fill="${uColor}" font-family="monospace" font-size="5.5" font-weight="900" text-anchor="middle">${isOffline ? 'TRIP' : '60Hz'}</text>
          </g>`;
      });

      return `
        <!-- RACK INDUSTRIAL VERTICAL ${title} -->
        <g id="stirling-bank-${bankLetter}-${u}">
          <!-- Armazón del Rack -->
          <rect x="${bx - 6}" y="52" width="124" height="216" rx="4" fill="url(#rackSteel${u})" stroke="#334155" stroke-width="1.5"/>
          <!-- Encabezado del Rack -->
          <rect x="${bx - 4}" y="54" width="120" height="11" rx="2" fill="#090d16" stroke="#475569" stroke-width="0.8"/>
          <text x="${bx + 56}" y="62" fill="#38bdf8" font-family="monospace" font-size="5" font-weight="900" text-anchor="middle" letter-spacing="0.5">${title}</text>
          <!-- Pernos de fijación lateral -->
          <circle cx="${bx - 2}" cy="60" r="1.5" fill="#94a3b8"/>
          <circle cx="${bx + 114}" cy="60" r="1.5" fill="#94a3b8"/>
          <circle cx="${bx - 2}" cy="262" r="1.5" fill="#94a3b8"/>
          <circle cx="${bx + 114}" cy="262" r="1.5" fill="#94a3b8"/>

          <!-- 4 Unidades Stirling -->
          ${units}
        </g>`;
    };

    // Banco de Baterías de Estado Sólido (10 Celdas en 2 bancos: 5 izq + 5 der)
    const litCount = Math.max(1, Math.min(10, Math.round((pwrVal / 100) * 10)));
    let batteriesLeft = '';
    let batteriesRight = '';

    for (let c = 0; c < 10; c++) {
      const isLeft = c < 5;
      const idxInBank = c % 5;
      const bx = isLeft ? (35 + idxInBank * 47) : (531 + idxInBank * 47);
      const isLit = c < litCount;
      const cellId = `C-0${c + 1}`;
      const fillHeight = isLit ? (optimal ? 28 : (degraded ? 18 : 8)) : 0;
      const fillY = 362 - fillHeight;

      const cellSvg = `
        <g id="cell-${cellId}-${u}">
          <!-- Terminales superiores de cobre con pernos -->
          <rect x="${bx + 8}" y="316" width="6" height="5" rx="1" fill="#d97706" stroke="#b45309" stroke-width="0.5"/>
          <rect x="${bx + 26}" y="316" width="6" height="5" rx="1" fill="#d97706" stroke="#b45309" stroke-width="0.5"/>
          <line x1="${bx + 11}" y1="316" x2="${bx + 29}" y2="316" stroke="#f59e0b" stroke-width="1.2"/>

          <!-- Chasis de Celda Blindada -->
          <rect x="${bx}" y="320" width="40" height="46" rx="3" fill="#090d16" stroke="#475569" stroke-width="1.2"/>
          <rect x="${bx + 2}" y="322" width="36" height="42" rx="2" fill="#04060a" stroke="#1e293b" stroke-width="0.8"/>

          <!-- Etiqueta de Celda -->
          <text x="${bx + 20}" y="328" fill="#64748b" font-family="monospace" font-size="4.5" font-weight="bold" text-anchor="middle">${cellId}</text>

          <!-- Visor Graduado de Carga -->
          <rect x="${bx + 5}" y="331" width="30" height="31" rx="1.5" fill="#020408" stroke="#334155" stroke-width="0.8"/>
          <!-- Marcas de Calibración -->
          <line x1="${bx + 6}" y1="339" x2="${bx + 10}" y2="339" stroke="#475569" stroke-width="0.8"/>
          <line x1="${bx + 6}" y1="347" x2="${bx + 10}" y2="347" stroke="#475569" stroke-width="0.8"/>
          <line x1="${bx + 6}" y1="355" x2="${bx + 10}" y2="355" stroke="#475569" stroke-width="0.8"/>

          <!-- Líquido / Segmento de Carga -->
          ${isLit ? `
            <rect class="battery-cell-glow" x="${bx + 6}" y="${fillY}" width="28" height="${fillHeight}" rx="1" fill="${cellColor}" opacity="0.9"/>
            <line x1="${bx + 6}" y1="${fillY}" x2="${bx + 34}" y2="${fillY}" stroke="#ffffff" stroke-width="1.2" opacity="0.85"/>
          ` : `
            <circle cx="${bx + 20}" cy="347" r="1.8" fill="${crit ? '#ef4444' : '#f59e0b'}" class="warn-amber"/>
          `}
        </g>`;

      if (isLeft) batteriesLeft += cellSvg;
      else batteriesRight += cellSvg;
    }

    // Efectos de Peligro (Chispas, Humo y Arcos en Crítico)
    const sparks = crit ? [[330, 120], [470, 260], [150, 180], [670, 180], [380, 290], [260, 310]]
      .map(([x, y]) => `<g class="spark"><polygon points="${x},${y - 12} ${x + 4},${y - 3} ${x + 13},${y} ${x + 4},${y + 3} ${x},${y + 12} ${x - 4},${y + 3} ${x - 13},${y} ${x - 4},${y - 3}" fill="#fde047"/></g>`).join('') : '';

    const smoke = crit ? [[360, 140], [440, 150], [400, 110], [140, 190], [660, 190]]
      .map(([x, y]) => `<circle class="smoke" cx="${x}" cy="${y}" r="22" fill="#52525b" opacity="0.65"/>`).join('') : '';

    const branchArcs = crit ? `
      <!-- Arcos Eléctricos Quebrados de Sobretensión -->
      <path class="branching-arc-zap" d="M 310 140 L 260 120 L 240 145 L 200 135 L 145 120" stroke="#f43f5e" stroke-width="3" fill="none"/>
      <path class="branching-arc-zap" d="M 310 140 L 260 120 L 240 145 L 200 135 L 145 120" stroke="#ffffff" stroke-width="1.2" fill="none"/>

      <path class="branching-arc-zap" d="M 490 140 L 540 120 L 560 145 L 600 135 L 655 120" stroke="#f43f5e" stroke-width="3" fill="none" style="animation-delay:0.1s;"/>
      <path class="branching-arc-zap" d="M 490 140 L 540 120 L 560 145 L 600 135 L 655 120" stroke="#ffffff" stroke-width="1.2" fill="none" style="animation-delay:0.1s;"/>

      <path class="branching-arc-zap" d="M 400 286 L 390 310 L 410 325 L 395 340 L 400 360" stroke="#f43f5e" stroke-width="3.5" fill="none" style="animation-delay:0.15s;"/>
      <path class="branching-arc-zap" d="M 400 286 L 390 310 L 410 325 L 395 340 L 400 360" stroke="#ffffff" stroke-width="1.4" fill="none" style="animation-delay:0.15s;"/>
    ` : '';

    // Figura del Ing. Rossi en Mantenimiento Activo
    const rossiFig = rossi ? `
      <!-- INGENIERO ROSSI: MANTENIMIENTO ACTIVO EN BANCO STIRLING B -->
      <g id="engineer-rossi-${u}">
        <!-- Sombra en el piso -->
        <ellipse cx="642" cy="286" rx="18" ry="5" fill="#030406" opacity="0.8"/>
        <!-- Traje espacial EVA Shackleton -->
        <rect x="625" y="235" width="34" height="48" rx="8" fill="#f4f4f5" stroke="#94a3b8" stroke-width="1.5"/>
        <!-- Mochila PLSS con soporte vital -->
        <rect x="653" y="232" width="12" height="36" rx="4" fill="#334155" stroke="#475569" stroke-width="1"/>
        <circle cx="658" cy="240" r="1.8" fill="#10b981"/>
        <circle cx="658" cy="248" r="1.8" fill="#38bdf8"/>
        <!-- Casco con Visor Dorado Reflectivo -->
        <circle cx="642" cy="222" r="16" fill="#f4f4f5" stroke="#94a3b8" stroke-width="1.8"/>
        <rect x="631" y="215" width="22" height="14" rx="6" fill="#0369a1" stroke="#f59e0b" stroke-width="1.5"/>
        <path d="M633,217 Q642,213 651,217" stroke="#fde68a" stroke-width="1" fill="none"/>
        <!-- Parche distintivo ROSSI -->
        <rect x="629" y="240" width="14" height="4" rx="1" fill="#090d16"/>
        <text x="636" y="243" fill="#38bdf8" font-family="monospace" font-size="3" font-weight="900" text-anchor="middle">ROSSI</text>
        <!-- Brazo articulado con herramienta de diagnóstico/soldadura -->
        <g class="weld-arm">
          <rect x="608" y="244" width="26" height="7" rx="3.5" fill="#d4d4d8" stroke="#94a3b8" stroke-width="1.2"/>
        </g>
        <!-- Chispas de soldadura de precisión -->
        <g class="weld-spark">
          <circle cx="604" cy="247" r="4.5" fill="#bae6fd"/>
          <circle cx="596" cy="240" r="2" fill="#38bdf8"/>
          <circle cx="598" cy="254" r="2" fill="#7dd3fc"/>
          <circle cx="590" cy="247" r="1.5" fill="#e0f2fe"/>
        </g>
      </g>` : '';

    // Etiquetas de Estado / Alarmas
    let badge;
    if (crit) badge = isEn
      ? '<div class="cctv-badge cctv-badge-crit">[!] VOLTAGE DROP: DRAINING SHIELD (RULE 1)</div>'
      : '<div class="cctv-badge cctv-badge-crit">[!] CAÍDA DE TENSIÓN: DRENANDO ESCUDO (REGLA 1)</div>';
    else if (rossi) badge = isEn
      ? '<div class="cctv-badge cctv-badge-blue">[MAINT] ENG. ROSSI: ACTIVE KILOPOWER MAINTENANCE</div>'
      : '<div class="cctv-badge cctv-badge-blue">[MANT] ING. ROSSI: MANTENIMIENTO ACTIVO KILOPOWER</div>';
    else if (st === 'optimal') badge = isEn
      ? '<div class="cctv-badge cctv-badge-blue">[OK] KILOPOWER KRUSTY NOMINAL // 10.0 kW CORE STABLE</div>'
      : '<div class="cctv-badge cctv-badge-blue">[OK] KILOPOWER KRUSTY NOMINAL // NÚCLEO 10.0 kW ESTABLE</div>';
    else badge = isEn
      ? `<div class="cctv-badge cctv-badge-warn">[!] LOW KILOPOWER OUTPUT // BATTERIES AT ${pwrVal}%</div>`
      : `<div class="cctv-badge cctv-badge-warn">[!] KILOPOWER EN RÉGIMEN BAJO // BATERÍAS AL ${pwrVal}%</div>`;

    return `
      <div class="cctv-scene" data-state="${st}">
        <svg viewBox="0 0 800 380" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <!-- Gradiente de Fondo de la Bahía del Reactor -->
            <linearGradient id="reactorWall${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0e1118"/>
              <stop offset="50%" stop-color="#080a10"/>
              <stop offset="100%" stop-color="#030406"/>
            </linearGradient>

            <!-- Gradiente 3D del Anillo de Blindaje de Titanio -->
            <linearGradient id="titaniumRing${u}" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#334155"/>
              <stop offset="25%" stop-color="#64748b"/>
              <stop offset="50%" stop-color="#cbd5e1"/>
              <stop offset="75%" stop-color="#475569"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>

            <!-- Reflector de Carburo de Boro (B4C) -->
            <radialGradient id="b4cReflector${u}" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stop-color="#1e293b"/>
              <stop offset="100%" stop-color="#0b0e14"/>
            </radialGradient>

            <!-- Núcleo de Fisión U-235 (Resplandor Cherenkov / Plasma) -->
            <radialGradient id="coreGrad${u}" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="35%" stop-color="${haloColor}"/>
              <stop offset="75%" stop-color="${energyColor}"/>
              <stop offset="100%" stop-color="${energyColor}" stop-opacity="0.05"/>
            </radialGradient>
            <radialGradient id="fissionHotspot${u}" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="60%" stop-color="${energyColor}"/>
              <stop offset="100%" stop-color="${energyColor2}"/>
            </radialGradient>

            <!-- Racks y Chasis Stirling -->
            <linearGradient id="rackSteel${u}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#1e293b"/>
              <stop offset="50%" stop-color="#334155"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>
            <linearGradient id="stirlingChassis${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#334155"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
            <linearGradient id="stirlingCopper${u}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#78350f"/>
              <stop offset="30%" stop-color="#d97706"/>
              <stop offset="50%" stop-color="#fde68a"/>
              <stop offset="70%" stop-color="#d97706"/>
              <stop offset="100%" stop-color="#78350f"/>
            </linearGradient>
          </defs>

          <!-- FONDO DE BAHÍA DE REACTOR INDUSTRIAL BLINDADA -->
          <rect width="800" height="380" fill="url(#reactorWall${u})"/>

          <!-- Paneles Térmicos de Disipación en Pared Superior -->
          <g stroke="#1e293b" stroke-width="1.2">
            ${Array.from({ length: 18 }, (_, i) => `<line x1="${160 + i * 28}" y1="18" x2="${160 + i * 28}" y2="52" opacity="0.6"/>`).join('')}
            <rect x="156" y="14" width="488" height="40" fill="none" stroke="#334155" stroke-width="1.2"/>
          </g>

          <!-- Vigas Pesadas de Contención con Franjas de Advertencia -->
          <g>
            <line x1="0" y1="62" x2="800" y2="62" stroke="#1e293b" stroke-width="8"/>
            <line x1="0" y1="62" x2="800" y2="62" stroke="#eab308" stroke-width="2" stroke-dasharray="16 16"/>

            <line x1="0" y1="298" x2="800" y2="298" stroke="#1e293b" stroke-width="8"/>
            <line x1="0" y1="298" x2="800" y2="298" stroke="#eab308" stroke-width="2" stroke-dasharray="16 16"/>
          </g>

          <!-- Textos Técnicos Stencil en Pared -->
          <text x="400" y="26" fill="#475569" font-family="monospace" font-size="7.5" font-weight="900" text-anchor="middle" letter-spacing="2">REACTOR BAY 02 // NASA KILOPOWER KRUSTY CORE (10.0 kWe)</text>
          <text x="400" y="44" fill="${energyColor}" font-family="monospace" font-size="6.5" font-weight="bold" text-anchor="middle" letter-spacing="1">COOLANT: SODIUM HEAT PIPES (750°C - 800°C) // ${statusLabel}</text>

          <!-- CONDUCTOS DE SODIO (REACTOR -> BANCOS STIRLING A Y B) -->
          <g>
            <!-- Bucle Banco A (Izquierda) -->
            <path d="M 310 138 C 240 115, 190 115, 145 115" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>
            <path d="M 310 138 C 240 115, 190 115, 145 115" fill="none" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
            <path class="heatpipe-flow" d="M 310 138 C 240 115, 190 115, 145 115" fill="none" stroke="${energyColor}" stroke-width="2.2"/>

            <path d="M 145 205 C 190 205, 240 205, 310 195" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>
            <path d="M 145 205 C 190 205, 240 205, 310 195" fill="none" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
            <path class="heatpipe-flow" d="M 145 205 C 190 205, 240 205, 310 195" fill="none" stroke="${energyColor}" stroke-width="2.2"/>

            <!-- Bucle Banco B (Derecha) -->
            <path d="M 490 138 C 560 115, 610 115, 655 115" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>
            <path d="M 490 138 C 560 115, 610 115, 655 115" fill="none" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
            <path class="heatpipe-flow" d="M 490 138 C 560 115, 610 115, 655 115" fill="none" stroke="${energyColor}" stroke-width="2.2"/>

            <path d="M 655 205 C 610 205, 560 205, 490 195" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>
            <path d="M 655 205 C 610 205, 560 205, 490 195" fill="none" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
            <path class="heatpipe-flow" d="M 655 205 C 610 205, 560 205, 490 195" fill="none" stroke="${energyColor}" stroke-width="2.2"/>

            <!-- Busbars Eléctricos Principales que bajan a Baterías -->
            <path d="M 85 268 L 85 308" stroke="#0f172a" stroke-width="8"/>
            <path d="M 85 268 L 85 308" stroke="#b45309" stroke-width="4"/>
            <path class="heatpipe-flow" d="M 85 268 L 85 308" stroke="#fde68a" stroke-width="1.8"/>

            <path d="M 715 268 L 715 308" stroke="#0f172a" stroke-width="8"/>
            <path d="M 715 268 L 715 308" stroke="#b45309" stroke-width="4"/>
            <path class="heatpipe-flow" d="M 715 268 L 715 308" stroke="#fde68a" stroke-width="1.8"/>
          </g>

          <!-- DOS TORRES DE CONVERSIÓN STIRLING (RACKS A Y B) -->
          ${renderStirlingBank(28, 'A', 'STIRLING CONVERTER BANK A')}
          ${renderStirlingBank(660, 'B', 'STIRLING CONVERTER BANK B')}

          <!-- REACTOR CENTRAL NASA KILOPOWER KRUSTY EN 3D -->
          <g id="kilopower-reactor-${u}" class="${crit ? 'reactor-shake' : ''}">
            <!-- 4 Abrazaderas Hidráulicas de Anclaje -->
            ${struts}

            <!-- Anillo Exterior de Blindaje de Titanio 3D (R = 108) -->
            <circle cx="${CX}" cy="${CY}" r="108" fill="url(#titaniumRing${u})" stroke="#475569" stroke-width="2"/>
            <circle cx="${CX}" cy="${CY}" r="92" fill="#060910" stroke="#334155" stroke-width="1.5"/>
            <!-- 12 Pernos Hexagonales Perimetrales -->
            ${bolts}

            <!-- Anillo Reflector de Carburo de Boro (B4C) (R = 92 a 74) -->
            <circle cx="${CX}" cy="${CY}" r="92" fill="url(#b4cReflector${u})" stroke="#1e293b" stroke-width="1.5"/>
            <!-- Divisiones Radiales del Reflector -->
            ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
              const r1 = deg * Math.PI / 180;
              return `<line x1="${(CX + 74 * Math.cos(r1)).toFixed(1)}" y1="${(CY + 74 * Math.sin(r1)).toFixed(1)}" x2="${(CX + 92 * Math.cos(r1)).toFixed(1)}" y2="${(CY + 92 * Math.sin(r1)).toFixed(1)}" stroke="#090d16" stroke-width="1.5"/>`;
            }).join('')}

            <!-- Rotor de Turbina Multipala Giratorio -->
            <g class="ring-spin">
              <circle cx="${CX}" cy="${CY}" r="74" fill="none" stroke="${energyColor}" stroke-width="5" stroke-dasharray="14 10" opacity="${crit ? 0.6 : 0.95}"/>
              ${[0, 60, 120, 180, 240, 300].map(deg => {
                const r1 = deg * Math.PI / 180;
                return `<line x1="${(CX + 62 * Math.cos(r1)).toFixed(1)}" y1="${(CY + 62 * Math.sin(r1)).toFixed(1)}" x2="${(CX + 74 * Math.cos(r1)).toFixed(1)}" y2="${(CY + 74 * Math.sin(r1)).toFixed(1)}" stroke="${energyColor}" stroke-width="2.5"/>`;
              }).join('')}
            </g>

            <!-- Anillo de Flujo de Energía Contrarrotatorio -->
            <g class="ring-spin-rev">
              <circle cx="${CX}" cy="${CY}" r="56" fill="none" stroke="${haloColor}" stroke-width="3.5" stroke-dasharray="8 12" opacity="0.85"/>
            </g>

            <!-- Filamentos de Plasma Curvos -->
            ${arcs}

            <!-- Núcleo de Fisión U-235 (Corazón Incandescente) -->
            <circle class="reactor-core" cx="${CX}" cy="${CY}" r="44" fill="url(#coreGrad${u})"/>
            <circle cx="${CX}" cy="${CY}" r="28" fill="url(#fissionHotspot${u})" stroke="${energyColor2}" stroke-width="1.2"/>
            <circle cx="${CX}" cy="${CY}" r="12" fill="#ffffff" opacity="0.95"/>

            <!-- Puntas Convergentes de Barras de Control de Boro -->
            <polygon points="${CX - 4},${CY - 34} ${CX + 4},${CY - 34} ${CX},${CY - 22}" fill="#334155" stroke="${energyColor}" stroke-width="1"/>
            <polygon points="${CX - 4},${CY + 34} ${CX + 4},${CY + 34} ${CX},${CY + 22}" fill="#334155" stroke="${energyColor}" stroke-width="1"/>
            <polygon points="${CX - 34},${CY - 4} ${CX - 34},${CY + 4} ${CX - 22},${CY}" fill="#334155" stroke="${energyColor}" stroke-width="1"/>
            <polygon points="${CX + 34},${CY - 4} ${CX + 34},${CY + 4} ${CX + 22},${CY}" fill="#334155" stroke="${energyColor}" stroke-width="1"/>

            <!-- Placa LCD Técnica de Potencia del Reactor -->
            <rect x="290" y="258" width="220" height="28" rx="4" fill="#030712" stroke="${energyColor}" stroke-width="1.2"/>
            <text x="400" y="268" fill="#94a3b8" font-family="monospace" font-size="5.5" font-weight="900" text-anchor="middle" letter-spacing="1">KILOPOWER KRUSTY-01 // U-235 FAST REACTOR</text>
            <text x="400" y="280" fill="${energyColor}" font-family="monospace" font-size="8.5" font-weight="900" text-anchor="middle" letter-spacing="1">OUTPUT: ${kwOutput} kW / 10.0 kW</text>
          </g>

          <!-- PISO INDUSTRIAL Y MATRIZ INFERIOR DE BATERÍAS DE ESTADO SÓLIDO -->
          <!-- Suelo de Rejilla -->
          <rect x="0" y="306" width="800" height="74" fill="#07090e"/>
          <g stroke="#1e293b" stroke-width="1">
            <line x1="0" y1="316" x2="800" y2="316"/>
            <line x1="0" y1="370" x2="800" y2="370"/>
            ${Array.from({ length: 32 }, (_, i) => `<line x1="${i * 25}" y1="306" x2="${i * 25}" y2="380" opacity="0.4"/>`).join('')}
          </g>

          <!-- Banco 1 (Izquierda): 5 Celdas de Batería de Estado Sólido -->
          <g id="battery-bank-left-${u}">
            <rect x="28" y="306" width="248" height="64" rx="3" fill="#0c0e14" stroke="#334155" stroke-width="1.2"/>
            <text x="152" y="314" fill="#38bdf8" font-family="monospace" font-size="5" font-weight="900" text-anchor="middle" letter-spacing="0.5">[ LI-S BATTERY BANK // 120V DC BUS ]</text>
            ${batteriesLeft}
          </g>

          <!-- Banco 2 (Derecha): 5 Celdas de Batería de Estado Sólido -->
          <g id="battery-bank-right-${u}">
            <rect x="524" y="306" width="248" height="64" rx="3" fill="#0c0e14" stroke="#334155" stroke-width="1.2"/>
            <text x="648" y="314" fill="#f59e0b" font-family="monospace" font-size="5" font-weight="900" text-anchor="middle" letter-spacing="0.5">[ HEAT PIPE TEMP: ${heatPipeTemp} // NOMINAL 800°C ]</text>
            ${batteriesRight}
          </g>

          <!-- FIGURA DEL ING. ROSSI EN MANTENIMIENTO ACTIVO (SI FUE SALVADO) -->
          ${rossiFig}

          <!-- EFECTOS DINÁMICOS EN CASO DE FALLO CRÍTICO -->
          ${branchArcs}
          ${sparks}
          ${smoke}
        </svg>

        ${crit ? '<div class="cctv-alarm-wash"></div><div class="cctv-alarm-light"></div>' : ''}
        <div class="cctv-badge-stack">${badge}</div>
      </div>`;
  }

  // ---------- SALA 3: LABORATORIO DE ESCUDO (ESCUDO) ----------
  function renderShieldScene(st, uid = '') {
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const radVal = Math.max(0, Math.min(100, state.resources.rad !== undefined ? state.resources.rad : 75));
    const crit = st === 'critical' || radVal <= 30;
    const degraded = st === 'degraded' || (!crit && radVal < 70);
    const optimal = !crit && !degraded;
    const storm = state.sol === 3 || state.sol === 6;
    const u = uid || ('shld_' + Math.floor(Math.random() * 100000));

    // Paleta de Energía y Telemetría Reactiva
    const energyColor = crit ? '#f43f5e' : (degraded ? '#fbbf24' : '#38bdf8');
    const energyColor2 = crit ? '#ef4444' : (degraded ? '#f59e0b' : '#818cf8');
    const statusColor = crit ? '#ef4444' : (degraded ? '#f59e0b' : '#10b981');
    const statusText = crit ? 'FAULT' : (degraded ? 'DEGRADED' : 'ONLINE');

    // Lectura de Teslas de las Bobinas Superconductoras
    const tAlpha = (radVal * 0.084).toFixed(1);
    const tBeta = (radVal * 0.083).toFixed(1);

    // Constructor de Torres Solenoides Superconductoras 3D (COIL-ALPHA y COIL-BETA)
    const renderCoilTower = (cx, idName, coilNum, teslaVal) => {
      const topY = 20;
      const botY = 322;

      // 8 Anillos Toroidales Metálicos en Relieve con Núcleo Luminiscente
      let ringsSvg = '';
      const ringYList = [46, 76, 106, 136, 166, 196, 226, 256];
      ringYList.forEach((ry, idx) => {
        const ringDamaged = crit && (idx === 2 || idx === 5);
        const ringDim = crit && (idx % 2 === 1);
        ringsSvg += `
          <!-- Anillo Toroidal ${idx + 1} -->
          <g>
            <!-- Sombra de profundidad inferior -->
            <ellipse cx="${cx}" cy="${ry + 3}" rx="36" ry="10" fill="#060910" opacity="0.8"/>
            <!-- Torus metálico de aleación 3D -->
            <ellipse cx="${cx}" cy="${ry}" rx="36" ry="10" fill="url(#toroidMetal${u})" stroke="#475569" stroke-width="1.2"/>
            <!-- Bobinado de Cobre / Aleación Nb-Ti visible en el surco central -->
            <ellipse cx="${cx}" cy="${ry}" rx="29" ry="7" fill="none" stroke="url(#copperCoil${u})" stroke-width="2.5" opacity="0.9"/>
            <!-- Núcleo interior de plasma / superconducción -->
            <ellipse cx="${cx}" cy="${ry}" rx="17" ry="4.5" fill="#030712" stroke="${ringDamaged ? '#ef4444' : energyColor}" stroke-width="${ringDamaged ? 1 : 1.5}" opacity="${ringDim ? 0.35 : 0.95}"/>
            <!-- Bisel reflectivo superior -->
            <path d="M${cx - 33},${ry - 1} A33 6 0 0 1 ${cx + 33},${ry - 1}" fill="none" stroke="${ringDamaged ? '#fca5a5' : '#e2e8f0'}" stroke-width="0.8" opacity="0.75"/>
            <!-- Micro-LED de telemetría de campo -->
            <circle cx="${cx - 32}" cy="${ry}" r="1.6" fill="${ringDamaged ? '#ef4444' : statusColor}"/>
            <circle cx="${cx + 32}" cy="${ry}" r="1.6" fill="${ringDamaged ? '#ef4444' : statusColor}"/>
            ${ringDamaged ? `<path d="M${cx - 14},${ry - 2} L${cx - 4},${ry + 3} L${cx + 8},${ry - 3}" stroke="#fca5a5" stroke-width="1.2" fill="none"/>` : ''}
          </g>`;
      });

      return `
        <!-- TORRE SOLENOIDE ${idName} -->
        <g id="tower-${idName}-${u}">
          <!-- Anclaje de techo / Brida estructural con pernos -->
          <rect x="${cx - 25}" y="${topY - 8}" width="50" height="12" rx="2" fill="#1e293b" stroke="#475569" stroke-width="1.2"/>
          <circle cx="${cx - 16}" cy="${topY - 2}" r="1.5" fill="#cbd5e1"/>
          <circle cx="${cx + 16}" cy="${topY - 2}" r="1.5" fill="#cbd5e1"/>

          <!-- Columna espinal trasera de soporte -->
          <rect x="${cx - 18}" y="${topY}" width="36" height="${botY - topY - 34}" fill="#0f172a" stroke="#334155" stroke-width="1.2"/>
          <!-- Blindaje lateral remachado -->
          <line x1="${cx - 14}" y1="${topY}" x2="${cx - 14}" y2="${botY - 34}" stroke="#1e293b" stroke-width="1.5"/>
          <line x1="${cx + 14}" y1="${topY}" x2="${cx + 14}" y2="${botY - 34}" stroke="#1e293b" stroke-width="1.5"/>

          <!-- Núcleo Superconductor Luminiscente de Plasma Interior -->
          <rect class="coil-plasma-core" x="${cx - 8}" y="${topY + 6}" width="16" height="${botY - topY - 44}" rx="3" fill="url(#corePlasma${u})" opacity="${crit ? 0.45 : (degraded ? 0.75 : 0.95)}"/>

          <!-- 8 Anillos Toroidales Metálicos -->
          ${ringsSvg}

          <!-- Pedestal Base y Consola de Control Digital -->
          <path d="M${cx - 38},${botY - 42} L${cx + 38},${botY - 42} L${cx + 44},${botY} L${cx - 44},${botY} Z" fill="url(#pedestalGrad${u})" stroke="#475569" stroke-width="1.5"/>
          <!-- Pernos de anclaje de alta resistencia al piso -->
          <rect x="${cx - 46}" y="${botY - 4}" width="92" height="6" rx="1" fill="#334155" stroke="#64748b" stroke-width="1"/>
          <circle cx="${cx - 38}" cy="${botY - 1}" r="1.5" fill="#e2e8f0"/>
          <circle cx="${cx - 20}" cy="${botY - 1}" r="1.5" fill="#e2e8f0"/>
          <circle cx="${cx + 20}" cy="${botY - 1}" r="1.5" fill="#e2e8f0"/>
          <circle cx="${cx + 38}" cy="${botY - 1}" r="1.5" fill="#e2e8f0"/>

          <!-- Pantalla LCD Base (Lectura Magnética en Tiempo Real) -->
          <rect x="${cx - 34}" y="${botY - 36}" width="68" height="26" rx="3" fill="#030712" stroke="${crit ? '#ef4444' : (degraded ? '#f59e0b' : '#0284c7')}" stroke-width="1.2"/>
          <text x="${cx}" y="${botY - 26}" fill="#94a3b8" font-family="monospace" font-size="5.5" font-weight="900" text-anchor="middle" letter-spacing="0.5">${idName} // ${statusText}</text>
          <text x="${cx}" y="${botY - 14}" fill="${energyColor}" font-family="monospace" font-size="8.5" font-weight="900" text-anchor="middle" letter-spacing="0.8">MAG: ${teslaVal} T</text>
        </g>`;
    };

    // =========================================================================
    // BÓVEDA ESTRUCTURAL DE BLINDAJE INDUSTRIAL Y CAMPO DIPOLAR (CERO HEXÁGONOS)
    // 1. Capa Interna: Chasis de titanio, remaches y 4 puntales hidráulicos
    // 2. Capa Intermedia: 6 Placas de blindaje térmico / radiación con juntas mecánicas
    // 3. Ondas de Deflexión Magnetosféricas (Campo Dipolar Alpha -> Beta)
    // =========================================================================

    // 1. CAPA INTERNA: Chasis de contención de titanio y 4 puntales hidráulicos diagonales
    const innerVault = `
      <!-- CHASIS ESTRUCTURAL DE CONTENCIÓN INTERIOR (TITANIO / HDPE) -->
      <g id="inner-containment-vault-${u}">
        <!-- Arco sólido de aleación de titanio con fondo oscuro -->
        <path d="M 248 322 A 152 172 0 0 1 552 322 L 540 322 A 140 158 0 0 0 260 322 Z" fill="#090e17" stroke="#334155" stroke-width="1.6"/>

        <!-- Línea de remaches estructurales de alta resistencia -->
        <path d="M 254 322 A 146 165 0 0 1 546 322" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="3 9"/>

        <!-- 4 Puntales Hidráulicos Diagonales anclados a la plataforma -->
        <!-- Puntal 1 (Extremo Oeste) -->
        <line x1="236" y1="322" x2="252" y2="295" stroke="#334155" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="250" y1="298" x2="266" y2="272" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="236" cy="322" r="3" fill="#1e293b" stroke="#64748b" stroke-width="1"/>
        <circle cx="266" cy="272" r="2.5" fill="#1e293b" stroke="#64748b" stroke-width="1"/>

        <!-- Puntal 2 (Interior Oeste) -->
        <line x1="276" y1="322" x2="298" y2="268" stroke="#334155" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="295" y1="272" x2="318" y2="218" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="276" cy="322" r="3" fill="#1e293b" stroke="#64748b" stroke-width="1"/>
        <circle cx="318" cy="218" r="2.5" fill="#1e293b" stroke="#64748b" stroke-width="1"/>

        <!-- Puntal 3 (Interior Este) -->
        <line x1="524" y1="322" x2="502" y2="268" stroke="#334155" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="505" y1="272" x2="482" y2="218" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="524" cy="322" r="3" fill="#1e293b" stroke="#64748b" stroke-width="1"/>
        <circle cx="482" cy="218" r="2.5" fill="#1e293b" stroke="#64748b" stroke-width="1"/>

        <!-- Puntal 4 (Extremo Este) -->
        <line x1="564" y1="322" x2="548" y2="295" stroke="#334155" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="550" y1="298" x2="534" y2="272" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="564" cy="322" r="3" fill="#1e293b" stroke="#64748b" stroke-width="1"/>
        <circle cx="534" cy="272" r="2.5" fill="#1e293b" stroke="#64748b" stroke-width="1"/>

        <!-- Esténciles Técnicos Grabados en el Chasis -->
        <text x="282" y="258" fill="#64748b" font-family="monospace" font-size="5" font-weight="900" transform="rotate(-42 282 258)" letter-spacing="0.8">[ HDPE HYDROGEN SHIELD ]</text>
        <text x="518" y="258" fill="#64748b" font-family="monospace" font-size="5" font-weight="900" transform="rotate(42 518 258)" letter-spacing="0.8">[ REGOLITH SINTERED SHELL // 2.4m ]</text>
      </g>
    `;

    // 2. CAPA INTERMEDIA: 6 Grandes Placas de Blindaje Térmico / Radiación con Juntas
    const toRad = d => (d * Math.PI) / 180;
    const makePlatePath = (cx, cy, rxOut, ryOut, rxIn, ryIn, startDeg, endDeg) => {
      const a1 = toRad(startDeg);
      const a2 = toRad(endDeg);
      const x1Out = (cx + rxOut * Math.cos(a1)).toFixed(1);
      const y1Out = (cy - ryOut * Math.sin(a1)).toFixed(1);
      const x2Out = (cx + rxOut * Math.cos(a2)).toFixed(1);
      const y2Out = (cy - ryOut * Math.sin(a2)).toFixed(1);
      const x1In = (cx + rxIn * Math.cos(a1)).toFixed(1);
      const y1In = (cy - ryIn * Math.sin(a1)).toFixed(1);
      const x2In = (cx + rxIn * Math.cos(a2)).toFixed(1);
      const y2In = (cy - ryIn * Math.sin(a2)).toFixed(1);
      return `M ${x1Out} ${y1Out} A ${rxOut} ${ryOut} 0 0 1 ${x2Out} ${y2Out} L ${x2In} ${y2In} A ${rxIn} ${ryIn} 0 0 0 ${x1In} ${y1In} Z`;
    };

    const plateConfigs = [
      { id: 1, s: 176, e: 150, label: 'P-01' },
      { id: 2, s: 147, e: 120, label: 'P-02' },
      { id: 3, s: 117, e: 91.5, label: 'P-03', apex: true },
      { id: 4, s: 88.5, e: 63, label: 'P-04', apex: true },
      { id: 5, s: 60, e: 33, label: 'P-05' },
      { id: 6, s: 30, e: 4, label: 'P-06' }
    ];

    let armorPlatesSvg = '';
    plateConfigs.forEach(p => {
      const isApex = p.apex;
      const strokeCol = optimal ? '#38bdf8' : (degraded ? (isApex ? '#fbbf24' : '#64748b') : (isApex ? '#ef4444' : '#475569'));
      const fillGrad = crit && isApex ? `url(#armorPlateCritGrad${u})` : `url(#armorPlateGrad${u})`;
      const plateCls = degraded && isApex ? 'shield-plate-vibe' : '';
      const dPath = makePlatePath(400, 322, 180, 205, 155, 175, p.s, p.e);

      if (crit && isApex) {
        if (p.id === 3) {
          armorPlatesSvg += `
            <!-- Placa 3 Fracturada y Desplazada (Gap de Brecha) -->
            <g transform="translate(-16, 12) rotate(-5 360 140)">
              <path class="${plateCls}" d="${dPath}" fill="${fillGrad}" stroke="${strokeCol}" stroke-width="1.8"/>
              <path d="M 390 120 L 378 132 L 388 144 L 380 156 L 392 168" stroke="#fca5a5" stroke-width="1.8" fill="none"/>
              <text x="350" y="145" fill="#fca5a5" font-family="monospace" font-size="4.5" font-weight="900">${p.label} // FRACTURED</text>
            </g>`;
        } else {
          armorPlatesSvg += `
            <!-- Placa 4 Fracturada y Desplazada (Gap de Brecha) -->
            <g transform="translate(16, 12) rotate(5 440 140)">
              <path class="${plateCls}" d="${dPath}" fill="${fillGrad}" stroke="${strokeCol}" stroke-width="1.8"/>
              <path d="M 410 120 L 422 132 L 412 144 L 420 156 L 408 168" stroke="#fca5a5" stroke-width="1.8" fill="none"/>
              <text x="430" y="145" fill="#fca5a5" font-family="monospace" font-size="4.5" font-weight="900">${p.label} // FRACTURED</text>
            </g>`;
        }
      } else {
        armorPlatesSvg += `
          <g>
            <path class="${plateCls}" d="${dPath}" fill="${fillGrad}" stroke="${strokeCol}" stroke-width="${optimal ? '1.5' : '1.2'}"/>
            ${degraded && isApex ? (p.id === 3
              ? `<path d="M 370 128 L 382 136 L 378 148" stroke="#fbbf24" stroke-width="1.4" fill="none"/>`
              : `<path d="M 428 128 L 418 136 L 424 148" stroke="#fbbf24" stroke-width="1.4" fill="none"/>`
            ) : ''}
          </g>`;
      }
    });

    const breachHighlight = crit ? `
      <!-- BRECHA ESTRUCTURAL ABIERTA (GAP DE IMPACTO) -->
      <path d="M 374 125 Q 400 135 426 125" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="3 3" fill="none"/>
      <ellipse cx="400" cy="128" rx="28" ry="8" fill="rgba(239, 68, 68, 0.25)" stroke="#ef4444" stroke-width="1.5"/>
    ` : '';

    // Ondas de Deflexión Magnetosféricas (Campo Dipolar Superconductor Alpha -> Beta)
    const magnetosphereFlux = `
      <!-- ONDAS DE DEFLEXIÓN MAGNETOSFÉRICAS (CAMPO DIPOLAR) -->
      <g id="magnetosphere-flux-${u}">
        <!-- Halo suave de campo exterior -->
        <path d="M 90 46 Q 400 12, 710 46" fill="none" stroke="${energyColor}" stroke-width="5" opacity="${crit ? 0.08 : 0.18}"/>

        <!-- Arco 1: Superior Principal (Ápice a y=12) -->
        <path class="mag-flux-wave" d="M 90 46 Q 400 12, 710 46" fill="none" stroke="${energyColor}" stroke-width="${crit ? 1.2 : 2.4}" stroke-dasharray="${crit ? '6 18' : '10 14'}" opacity="${crit ? 0.35 : 0.95}"/>

        <!-- Arco 2: Intermedio (Ápice a y=48) -->
        <path class="mag-flux-wave" d="M 90 76 Q 400 48, 710 76" fill="none" stroke="${energyColor2}" stroke-width="${crit ? 1.0 : 1.8}" stroke-dasharray="${crit ? '6 18' : '10 14'}" opacity="${crit ? 0.25 : 0.8}" style="animation-delay: -1.0s;"/>

        <!-- Arco 3: Base sobre Bóveda (Ápice a y=84) -->
        <path class="mag-flux-wave" d="M 90 106 Q 400 84, 710 106" fill="none" stroke="${energyColor2}" stroke-width="${crit ? 0.8 : 1.4}" stroke-dasharray="${crit ? '6 20' : '8 12'}" opacity="${crit ? 0.2 : 0.6}" style="animation-delay: -2.0s;"/>

        <!-- Líneas de retorno dipolar hacia el suelo exterior -->
        <path d="M 90 106 C 50 160, 50 260, 80 322" fill="none" stroke="${energyColor2}" stroke-width="1.2" stroke-dasharray="6 8" opacity="${crit ? 0.15 : 0.4}"/>
        <path d="M 710 106 C 750 160, 750 260, 720 322" fill="none" stroke="${energyColor2}" stroke-width="1.2" stroke-dasharray="6 8" opacity="${crit ? 0.15 : 0.4}"/>
      </g>
    `;

    // Plataforma Industrial Central y Módulos Habitacionales Shackleton
    const habitatBase = `
      <!-- PLATAFORMA INDUSTRIAL CENTRAL DE TITANIO -->
      <g id="central-platform-${u}">
        <!-- Tier 1 Base Inferior -->
        <rect x="230" y="322" width="340" height="18" rx="2" fill="url(#platMetal${u})" stroke="#475569" stroke-width="1.5"/>
        <line x1="230" y1="326" x2="570" y2="326" stroke="#64748b" stroke-width="1"/>
        <!-- Rejillas de refrigeración con retroiluminación -->
        ${[260, 310, 360, 410, 460, 510].map(gx => `
          <rect x="${gx}" y="328" width="30" height="7" rx="1" fill="#090d16" stroke="#334155" stroke-width="0.8"/>
          <line x1="${gx + 6}" y1="329" x2="${gx + 6}" y2="334" stroke="${energyColor}" stroke-width="1" opacity="0.6"/>
          <line x1="${gx + 15}" y1="329" x2="${gx + 15}" y2="334" stroke="${energyColor}" stroke-width="1" opacity="0.6"/>
          <line x1="${gx + 24}" y1="329" x2="${gx + 24}" y2="334" stroke="${energyColor}" stroke-width="1" opacity="0.6"/>
        `).join('')}

        <!-- Tier 2 Cubierta Superior Estructural -->
        <rect x="260" y="312" width="280" height="11" rx="2" fill="#1e293b" stroke="#64748b" stroke-width="1.2"/>

        <!-- ASENTAMIENTO HABITACIONAL SHACKLETON (MINIATURA BAJO EL ESCUDO) -->
        <!-- Módulo Científico Oeste -->
        <path d="M 285 312 a 20 16 0 0 1 40 0 Z" fill="url(#habDome${u})" stroke="#64748b" stroke-width="1.2"/>
        <circle cx="305" cy="303" r="2.5" fill="#38bdf8" opacity="0.9"/>

        <!-- Túnel presurizado Oeste-Centro -->
        <rect x="325" y="306" width="43" height="6" rx="2" fill="#334155" stroke="#475569" stroke-width="1"/>
        <line x1="337" y1="306" x2="337" y2="312" stroke="#64748b" stroke-width="0.8"/>
        <line x1="353" y1="306" x2="353" y2="312" stroke="#64748b" stroke-width="0.8"/>

        <!-- Módulo Central de Mando Shackleton -->
        <path d="M 368 312 a 32 24 0 0 1 64 0 Z" fill="url(#habDome${u})" stroke="#94a3b8" stroke-width="1.5"/>
        <circle cx="400" cy="298" r="3.2" fill="#38bdf8" opacity="0.95"/>
        <circle cx="386" cy="302" r="2" fill="#38bdf8" opacity="0.8"/>
        <circle cx="414" cy="302" r="2" fill="#38bdf8" opacity="0.8"/>
        <rect x="388" y="306" width="24" height="5" rx="1" fill="#090d16"/>
        <text x="400" y="310" fill="#38bdf8" font-family="monospace" font-size="4" font-weight="900" text-anchor="middle">SHACKLETON</text>

        <!-- Túnel presurizado Centro-Este -->
        <rect x="432" y="306" width="43" height="6" rx="2" fill="#334155" stroke="#475569" stroke-width="1"/>
        <line x1="447" y1="306" x2="447" y2="312" stroke="#64748b" stroke-width="0.8"/>
        <line x1="463" y1="306" x2="463" y2="312" stroke="#64748b" stroke-width="0.8"/>

        <!-- Módulo de Soporte Vital Este -->
        <path d="M 475 312 a 20 16 0 0 1 40 0 Z" fill="url(#habDome${u})" stroke="#64748b" stroke-width="1.2"/>
        <circle cx="495" cy="303" r="2.5" fill="#38bdf8" opacity="0.9"/>

        <!-- Mástil y Antena de Comunicaciones con Baliza -->
        <line x1="400" y1="288" x2="400" y2="265" stroke="#94a3b8" stroke-width="1.5"/>
        <line x1="395" y1="272" x2="405" y2="272" stroke="#94a3b8" stroke-width="1"/>
        <line x1="397" y1="278" x2="403" y2="278" stroke="#94a3b8" stroke-width="1"/>
        <circle cx="400" cy="264" r="2" fill="${crit ? '#ef4444' : '#34d399'}" class="${crit ? 'animate-ping' : ''}"/>

        <!-- Proyector Focal Central del Escudo -->
        <polygon points="392,290 408,290 414,282 386,282" fill="#0f172a" stroke="#0284c7" stroke-width="1.2"/>
        <ellipse cx="400" cy="282" rx="14" ry="3.5" fill="#030712" stroke="${energyColor}" stroke-width="1.5"/>
        <!-- Haz de proyección vertical hacia el ápice geodésico -->
        <polygon points="396,282 404,282 425,92 375,92" fill="url(#emitterBeam${u})" opacity="${crit ? 0.15 : (degraded ? 0.35 : 0.6)}"/>
      </g>
    `;

    // Conductos Pesados de Alta Tensión (Alimentación Solenoides -> Emisor)
    const heavyConduits = `
      <!-- CONDUCTOS DE ALTA TENSIÓN CON PULSOS ANIMADOS -->
      <g>
        <!-- Cable Principal Torre Alpha -->
        <path d="M 90 322 C 140 355, 190 348, 240 332" fill="none" stroke="#0f172a" stroke-width="7" stroke-linecap="round"/>
        <path d="M 90 322 C 140 355, 190 348, 240 332" fill="none" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
        <path class="coil-cable-flow" d="M 90 322 C 140 355, 190 348, 240 332" fill="none" stroke="${energyColor}" stroke-width="1.8" opacity="${crit ? 0.35 : 0.95}"/>

        <!-- Cable Principal Torre Beta -->
        <path d="M 710 322 C 660 355, 610 348, 560 332" fill="none" stroke="#0f172a" stroke-width="7" stroke-linecap="round"/>
        <path d="M 710 322 C 660 355, 610 348, 560 332" fill="none" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
        <path class="coil-cable-flow" d="M 710 322 C 660 355, 610 348, 560 332" fill="none" stroke="${energyColor}" stroke-width="1.8" opacity="${crit ? 0.35 : 0.95}"/>
      </g>
    `;

    // Partículas de Viento Solar (Rebote Suave en Modo Nominal / Fuga en Modo Crítico)
    let wind = '';
    if (!crit) {
      for (let i = 0; i < 12; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const th = ((18 + (i * 13) % 55) * Math.PI) / 180;
        const px = 400 + side * 165 * Math.sin(th);
        const py = 322 - 205 * Math.cos(th);
        let nx = (side * Math.sin(th)) / 165;
        let ny = Math.cos(th) / 205;
        const nl = Math.hypot(nx, ny);
        nx /= nl; ny /= nl;
        const sx = px + nx * 140;
        const sy = py + ny * 140;
        const pierces = degraded && i % 2 === 1;
        wind += `<circle class="wind-p ${pierces ? 'wind-pierce' : 'wind-deflect'}" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="3.2"
          fill="${pierces ? '#fb7185' : '#38bdf8'}"
          style="--dx:${(px - sx).toFixed(1)}px;--dy:${(py - sy).toFixed(1)}px;--rx:${(nx * 70).toFixed(1)}px;--ry:${(ny * 70).toFixed(1)}px;--px:${(px - sx - nx * 170).toFixed(1)}px;--py:${(py - sy - ny * 150).toFixed(1)}px;animation-delay:${(i * 0.22).toFixed(2)}s"/>`;
      }
    }

    // Haces de Radiación Ionizante Colimada + Ondas de Choque Radial (Modo Crítico / Degradado)
    let critHazards = '';
    if (crit) {
      critHazards = `
        <!-- HAZ COLIMADO SPE // PENETRACIÓN IONIZANTE DIRECTA POR LA BRECHA -->
        <polygon class="rad-beam" points="384,0 416,0 412,288 388,288" fill="url(#speFluxGrad${u})"/>
        <!-- Haces secundarios de radiación ionizante dispersada -->
        <polygon class="rad-beam" points="360,0 374,0 378,312 348,312" fill="url(#critRadBeam${u})" opacity="0.45" style="animation-delay:0.12s;"/>
        <polygon class="rad-beam" points="426,0 440,0 452,312 422,312" fill="url(#critRadBeam${u})" opacity="0.45" style="animation-delay:0.24s;"/>

        <!-- ESTÉNCIL DE ADVERTENCIA SOBRE EL HAZ IONIZANTE -->
        <rect x="310" y="55" width="180" height="15" rx="2" fill="#450a0a" stroke="#ef4444" stroke-width="1" opacity="0.9"/>
        <text x="400" y="65" fill="#fca5a5" font-family="monospace" font-size="6.5" font-weight="900" text-anchor="middle" letter-spacing="1">SPE FLUX // IONIZING PENETRATION</text>

        <!-- DESTELLO DE IMPACTO RADIAL Y ONDAS DE CHOQUE CONCÉNTRICAS EN EL TECHO DEL HÁBITAT (400, 288) -->
        <g id="spe-radial-impact-${u}">
          <ellipse class="impact-ripple" cx="400" cy="288" rx="14" ry="5" stroke="#ffffff" stroke-width="2.5" fill="none"/>
          <ellipse class="impact-ripple" cx="400" cy="288" rx="28" ry="9" stroke="#f43f5e" stroke-width="2.2" fill="none" style="animation-delay:0.35s;"/>
          <ellipse class="impact-ripple" cx="400" cy="288" rx="46" ry="14" stroke="#ef4444" stroke-width="1.8" fill="none" style="animation-delay:0.7s;"/>
          <circle cx="400" cy="288" r="9" fill="#fca5a5" opacity="0.85"/>
          <circle cx="400" cy="288" r="3.5" fill="#ffffff"/>
        </g>

        <!-- ARCOS ELÉCTRICOS LATERALES EN LAS BOBINAS SOLENOIDES -->
        <path class="branching-arc-zap" d="M 126 106 L 145 123 L 138 138 L 160 150 L 144 166 L 126 166 M 145 123 L 168 120 L 182 133" stroke="#f43f5e" stroke-width="3.5" fill="none"/>
        <path class="branching-arc-zap" d="M 126 106 L 145 123 L 138 138 L 160 150 L 144 166 L 126 166 M 145 123 L 168 120 L 182 133" stroke="#ffffff" stroke-width="1.4" fill="none"/>

        <path class="branching-arc-zap" d="M 674 76 L 650 94 L 662 110 L 640 124 L 652 140 L 674 136 M 650 94 L 632 90 L 618 106" stroke="#f43f5e" stroke-width="3.5" fill="none" style="animation-delay: 0.1s;"/>
        <path class="branching-arc-zap" d="M 674 76 L 650 94 L 662 110 L 640 124 L 652 140 L 674 136 M 650 94 L 632 90 L 618 106" stroke="#ffffff" stroke-width="1.4" fill="none" style="animation-delay: 0.1s;"/>
      `;
    } else if (degraded) {
      critHazards = `
        <path class="branching-arc-zap" d="M 126 106 L 138 118 L 130 130 L 142 142 L 126 146" stroke="#fbbf24" stroke-width="2.5" fill="none"/>
        <path class="branching-arc-zap" d="M 126 106 L 138 118 L 130 130 L 142 142 L 126 146" stroke="#ffffff" stroke-width="1" fill="none"/>
        <path class="branching-arc-zap" d="M 674 166 L 660 178 L 668 190 L 656 202 L 674 206" stroke="#fbbf24" stroke-width="2.5" fill="none" style="animation-delay:0.18s;"/>
        <path class="branching-arc-zap" d="M 674 166 L 660 178 L 668 190 L 656 202 L 674 206" stroke="#ffffff" stroke-width="1" fill="none" style="animation-delay:0.18s;"/>
      `;
    }

    // Telemetría Radiológica & Contador Geiger con Escala Gráfica
    let geigerTxt = '';
    let geigerCls = 'geiger-ok';
    let litBars = 2;
    let barColorCls = 'lit-green';

    if (crit) {
      const gVal = (18.6 + (30 - radVal) * 0.4).toFixed(1);
      geigerTxt = isEn ? `${gVal} mSv/h // CRITICAL HAZARD` : `${gVal} mSv/h // PELIGRO CRÍTICO`;
      geigerCls = 'geiger-crit';
      litBars = 8;
      barColorCls = 'lit-red';
    } else if (degraded) {
      const gVal = (2.4 + (70 - radVal) * 0.1).toFixed(2);
      geigerTxt = isEn ? `${gVal} mSv/h // ELEVATED` : `${gVal} mSv/h // ELEVADO`;
      geigerCls = 'geiger-warn';
      litBars = 5;
      barColorCls = 'lit-amber';
    } else {
      geigerTxt = isEn ? '0.08 mSv/h // NOMINAL' : '0.08 mSv/h // NOMINAL';
      geigerCls = 'geiger-ok';
      litBars = 2;
      barColorCls = 'lit-green';
    }

    const miniBarsHtml = `
      <div class="geiger-mini-bars">
        ${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `
          <span class="geiger-mini-bar ${i <= litBars ? barColorCls : ''}"></span>
        `).join('')}
      </div>
    `;

    // Etiquetas de Estado / Alarmas
    let badge;
    if (crit) {
      badge = isEn
        ? '<div class="cctv-badge cctv-badge-crit">[DANGER] IONIZING RADIATION PENETRATION // SHIELD COLLAPSE</div>'
        : '<div class="cctv-badge cctv-badge-crit">[PELIGRO] PENETRACIÓN DE RADIACIÓN IONIZANTE // COLAPSO DE ESCUDO</div>';
    } else if (degraded) {
      badge = isEn
        ? `<div class="cctv-badge cctv-badge-warn">[!] UNSTABLE DIPOLE // GEODESIC ATTENUATION AT ${radVal}%</div>`
        : `<div class="cctv-badge cctv-badge-warn">[!] DIPOLO INESTABLE // ATENUACIÓN GEODÉSICA AL ${radVal}%</div>`;
    } else {
      badge = isEn
        ? '<div class="cctv-badge cctv-badge-violet">[SHIELD] 8.4T SUPERCONDUCTING DOME NOMINAL // SOLAR WIND DEFLECTED</div>'
        : '<div class="cctv-badge cctv-badge-violet">[ESCUDO] CÚPULA SUPERCONDUCTORA 8.4T NOMINAL // VIENTO SOLAR DESVIADO</div>';
    }
    if (storm && !crit) {
      badge += isEn
        ? '<div class="cctv-badge cctv-badge-warn">[ALERT] CME SOLAR STORM DETECTED: MAINTAIN SHIELD &gt; 60%</div>'
        : '<div class="cctv-badge cctv-badge-warn">[ALERTA] TORMENTA SOLAR CME: MANTENER ESCUDO &gt; 60%</div>';
    }

    return `
      <div class="cctv-scene" data-state="${st}">
        <svg viewBox="0 0 800 380" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <!-- Gradiente de la pared blindada de Plomo y Polietileno HDPE -->
            <linearGradient id="shieldWall${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0c0e14"/>
              <stop offset="50%" stop-color="#07080d"/>
              <stop offset="100%" stop-color="#030406"/>
            </linearGradient>

            <!-- Gradiente del Metal Cepillado de los Anillos Toroidales -->
            <linearGradient id="toroidMetal${u}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#1e293b"/>
              <stop offset="25%" stop-color="#475569"/>
              <stop offset="50%" stop-color="#94a3b8"/>
              <stop offset="75%" stop-color="#334155"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>

            <!-- Gradiente de Bobinado de Cobre -->
            <linearGradient id="copperCoil${u}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#78350f"/>
              <stop offset="30%" stop-color="#d97706"/>
              <stop offset="50%" stop-color="#fde68a"/>
              <stop offset="70%" stop-color="#d97706"/>
              <stop offset="100%" stop-color="#78350f"/>
            </linearGradient>

            <!-- Gradiente del Núcleo de Plasma Superconductor -->
            <linearGradient id="corePlasma${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${energyColor2}"/>
              <stop offset="50%" stop-color="${energyColor}"/>
              <stop offset="100%" stop-color="${energyColor2}"/>
            </linearGradient>

            <!-- Gradientes Estructurales -->
            <linearGradient id="pedestalGrad${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#334155"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
            <linearGradient id="platMetal${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#475569"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>
            <radialGradient id="habDome${u}" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stop-color="#e2e8f0"/>
              <stop offset="65%" stop-color="#475569"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </radialGradient>

            <!-- Gradientes de Haces y Cúpula -->
            <radialGradient id="domeGrad${u}" cx="50%" cy="100%" r="90%">
              <stop offset="0%" stop-color="${energyColor2}" stop-opacity="0.04"/>
              <stop offset="60%" stop-color="${energyColor}" stop-opacity="0.14"/>
              <stop offset="100%" stop-color="${energyColor2}" stop-opacity="0.35"/>
            </radialGradient>
            <linearGradient id="emitterBeam${u}" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="${energyColor}" stop-opacity="0.6"/>
              <stop offset="100%" stop-color="${energyColor}" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="critRadBeam${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.85"/>
              <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.1"/>
            </linearGradient>
            <!-- Gradientes de Placas de Blindaje de Aleación y Haz SPE -->
            <linearGradient id="armorPlateGrad${u}" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#334155"/>
              <stop offset="35%" stop-color="#1e293b"/>
              <stop offset="70%" stop-color="#0f172a"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>
            <linearGradient id="armorPlateCritGrad${u}" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#450a0a"/>
              <stop offset="50%" stop-color="#1f1013"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
            <linearGradient id="speFluxGrad${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.95"/>
              <stop offset="35%" stop-color="#ef4444" stop-opacity="0.9"/>
              <stop offset="75%" stop-color="#dc2626" stop-opacity="0.85"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="1"/>
            </linearGradient>
          </defs>

          <!-- FONDO DE CÁMARA BLINDADA (PANELES HDPE / PLOMO) -->
          <rect width="800" height="380" fill="url(#shieldWall${u})"/>

          <!-- Paneles de Blindaje y Remaches -->
          <g stroke="#1e293b" stroke-width="1.5">
            <line x1="160" y1="0" x2="160" y2="322"/>
            <line x1="300" y1="0" x2="300" y2="322"/>
            <line x1="500" y1="0" x2="500" y2="322"/>
            <line x1="640" y1="0" x2="640" y2="322"/>
            <line x1="0" y1="80" x2="800" y2="80"/>
            <line x1="0" y1="180" x2="800" y2="180"/>
          </g>

          <!-- Vigas Anguladas de Refuerzo Estructural en Techo -->
          <polygon points="0,0 150,0 0,65" fill="#1e293b" stroke="#334155" stroke-width="1.2"/>
          <circle cx="35" cy="18" r="4" fill="#0c0e14"/>
          <circle cx="75" cy="16" r="4" fill="#0c0e14"/>
          <circle cx="115" cy="12" r="3" fill="#0c0e14"/>

          <polygon points="800,0 650,0 800,65" fill="#1e293b" stroke="#334155" stroke-width="1.2"/>
          <circle cx="765" cy="18" r="4" fill="#0c0e14"/>
          <circle cx="725" cy="16" r="4" fill="#0c0e14"/>
          <circle cx="685" cy="12" r="3" fill="#0c0e14"/>

          <!-- Textos Técnicos Grabados en la Pared Blindada -->
          <text x="400" y="24" fill="#475569" font-family="monospace" font-size="7.5" font-weight="900" text-anchor="middle" letter-spacing="2">CHAMBER 03-B // LEAD-HDPE RADIATION LINING (300mm)</text>
          <text x="400" y="38" fill="${crit ? '#ef4444' : (degraded ? '#f59e0b' : '#38bdf8')}" font-family="monospace" font-size="7" font-weight="bold" text-anchor="middle" letter-spacing="1">DIPOLE SYSTEM: ${crit ? 'CRITICAL INSTABILITY' : (degraded ? 'DEGRADED ATTENUATION' : 'MAXIMUM CONTAINMENT')}</text>

          <!-- PISO DE REJILLA METÁLICA DE ALTA RESISTENCIA -->
          <rect x="0" y="322" width="800" height="58" fill="#090b10"/>
          <g stroke="#1e293b" stroke-width="1">
            <line x1="0" y1="336" x2="800" y2="336"/>
            <line x1="0" y1="352" x2="800" y2="352"/>
            <line x1="0" y1="368" x2="800" y2="368"/>
            ${Array.from({ length: 32 }, (_, i) => `<line x1="${i * 25}" y1="322" x2="${i * 25}" y2="380" opacity="0.6"/>`).join('')}
          </g>
          <!-- Franja de Seguridad Amarilla / Negra en el Borde del Piso -->
          <rect x="0" y="322" width="800" height="3" fill="#eab308"/>

          <!-- CONDUCTOS PESADOS DE ALTA TENSIÓN -->
          ${heavyConduits}

          <!-- PLATAFORMA CENTRAL Y MÓDULOS HABITACIONALES SHACKLETON -->
          ${habitatBase}

          <!-- BÓVEDA ESTRUCTURAL DE BLINDAJE INDUSTRIAL MULTICAPA (CERO HEXÁGONOS) -->
          <g id="industrial-shield-arch-${u}">
            ${innerVault}
            <g id="armor-plates-layer-${u}">
              ${armorPlatesSvg}
              ${breachHighlight}
            </g>
          </g>

          <!-- ONDAS DE DEFLEXIÓN MAGNETOSFÉRICAS (CAMPO DIPOLAR) -->
          ${magnetosphereFlux}

          <!-- TORRES SOLENOIDES SUPERCONDUCTORAS (ALPHA Y BETA) -->
          ${renderCoilTower(90, 'COIL-ALPHA', 1, tAlpha)}
          ${renderCoilTower(710, 'COIL-BETA', 2, tBeta)}

          <!-- DINÁMICA DE PARTÍCULAS: VIENTO SOLAR Y HACES CRÍTICOS -->
          ${wind}
          ${critHazards}
        </svg>

        <!-- ALARMAS ÓPTICAS Y CONTADOR GEIGER -->
        ${crit ? '<div class="cctv-alarm-wash"></div><div class="cctv-snow"></div>' : ''}
        <div class="geiger-box geiger-box-top ${geigerCls}">
          <span class="geiger-led"></span>
          <span>GEIGER: ${geigerTxt}</span>
          ${miniBarsHtml}
          <span class="geiger-std-tag">NASA STD-3001 LIMIT: 50 mSv</span>
        </div>
        <div class="cctv-badge-stack">${badge}</div>
      </div>`;
  }

  // ---------- SALA 4: PLANTA CRIOGÉNICA DE ALTA FIDELIDAD (OXÍGENO) ----------
  function renderLifeScene(st, uid = '') {
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const o2Val = Math.max(0, Math.min(100, state.resources.o2 !== undefined ? state.resources.o2 : 75));
    const crit = st === 'critical' || o2Val <= 30;
    const degraded = st === 'degraded' || (o2Val > 30 && o2Val < 70);
    const dust = state.flags.lunar_dust_contamination;
    const vance = wasDecision('SOL1-C2', 'AUTHORIZE');
    const u = uid || ('lox_' + Math.floor(Math.random() * 100000));

    // Colores y lecturas de telemetría reactiva
    const statusColor = crit ? '#ef4444' : (degraded ? '#f59e0b' : '#22d3ee');
    const pressKpa = o2Val >= 70 ? '35.5' : (o2Val > 30 ? '24.2' : '12.8');
    const needleAngle = -120 + (o2Val / 100) * 240;

    // Turbinas RPM
    const rpm1 = o2Val >= 70 ? '8,400' : (o2Val > 30 ? '3,600' : '620');
    const rpm2 = o2Val >= 70 ? '8,250' : (o2Val > 30 ? '3,420' : '0 [STALL]');
    const turbMode1 = crit ? 'turbine-slow' : (degraded ? 'turbine-mid' : 'turbine-fast');
    const turbMode2 = crit ? 'turbine-stop' : (degraded ? 'turbine-mid' : 'turbine-fast');

    // Burbujas de electrólisis en mirilla
    const bubbleCount = crit ? 2 : (degraded ? 5 : 8);

    // Constructor de Tanques Criogénicos 3D (LOX-01 y LOX-02)
    const renderCryoTank = (X, Y, W, H, tankId) => {
      const GW = 44;
      const GX = X + (W - GW) / 2;
      const GY = Y + 48;
      const GH = 158;
      const maxLiquidH = GH - 8;
      const liquidH = Math.max(6, Math.min(maxLiquidH, Math.round(maxLiquidH * (o2Val / 100))));
      const liquidY = (GY + GH - 4) - liquidH;

      let bubbles = '';
      for (let b = 0; b < bubbleCount; b++) {
        const bx = GX + 8 + ((b * 29 + tankId * 13) % (GW - 16));
        const bRise = Math.max(15, liquidH - 8);
        bubbles += `<circle class="bubble" cx="${bx}" cy="${GY + GH - 6}" r="${2.0 + (b % 3) * 0.7}" fill="#cffafe" style="--rise:${bRise}px; animation-delay:${(b * 0.42).toFixed(2)}s; animation-duration:${(2.0 + (b % 3) * 0.4).toFixed(1)}s;"/>`;
      }

      return `
        <!-- Tanque Cilíndrico 3D LOX-0${tankId} -->
        <g id="tank-lox-0${tankId}-${u}">
          <!-- Patas hidráulicas de anclaje al piso -->
          <rect x="${X + 16}" y="${Y + H - 4}" width="16" height="32" rx="2" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
          <rect x="${X + 12}" y="${Y + H + 24}" width="24" height="6" rx="1" fill="#334155" stroke="#64748b" stroke-width="1"/>
          <circle cx="${X + 16}" cy="${Y + H + 27}" r="1.5" fill="#e2e8f0"/>
          <circle cx="${X + 32}" cy="${Y + H + 27}" r="1.5" fill="#e2e8f0"/>

          <rect x="${X + W - 32}" y="${Y + H - 4}" width="16" height="32" rx="2" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
          <rect x="${X + W - 36}" y="${Y + H + 24}" width="24" height="6" rx="1" fill="#334155" stroke="#64748b" stroke-width="1"/>
          <circle cx="${X + W - 32}" cy="${Y + H + 27}" r="1.5" fill="#e2e8f0"/>
          <circle cx="${X + W - 16}" cy="${Y + H + 27}" r="1.5" fill="#e2e8f0"/>

          <!-- Cúpula superior semiesférica remachada -->
          <path d="M${X},${Y + 30} C${X},${Y - 4} ${X + W},${Y - 4} ${X + W},${Y + 30} Z" fill="url(#cylSteelDome${u})" stroke="#475569" stroke-width="1.5"/>
          ${[0.15, 0.35, 0.5, 0.65, 0.85].map(ratio => `
            <circle cx="${X + W * ratio}" cy="${Y + 28}" r="2" fill="#94a3b8" stroke="#1e293b" stroke-width="0.8"/>
          `).join('')}

          <!-- Cuerpo cilíndrico principal con gradiente 3D de acero cepillado -->
          <rect x="${X}" y="${Y + 28}" width="${W}" height="${H - 32}" fill="url(#cylSteel${u})" stroke="#475569" stroke-width="1.5"/>

          <!-- Cúpula inferior invertida -->
          <path d="M${X},${Y + H - 4} C${X},${Y + H + 18} ${X + W},${Y + H + 18} ${X + W},${Y + H - 4} Z" fill="url(#cylSteelDome${u})" stroke="#334155" stroke-width="1.5"/>

          <!-- Abrazaderas metálicas horizontales con pernos -->
          <rect x="${X - 3}" y="${Y + 74}" width="${W + 6}" height="10" rx="2" fill="#1e293b" stroke="#64748b" stroke-width="1.2"/>
          <circle cx="${X + 3}" cy="${Y + 79}" r="2" fill="#cbd5e1"/>
          <circle cx="${X + W - 3}" cy="${Y + 79}" r="2" fill="#cbd5e1"/>

          <rect x="${X - 3}" y="${Y + 182}" width="${W + 6}" height="10" rx="2" fill="#1e293b" stroke="#64748b" stroke-width="1.2"/>
          <circle cx="${X + 3}" cy="${Y + 187}" r="2" fill="#cbd5e1"/>
          <circle cx="${X + W - 3}" cy="${Y + 187}" r="2" fill="#cbd5e1"/>

          <!-- Etiqueta técnica grabada -->
          <rect x="${X + 16}" y="${Y + 40}" width="42" height="11" rx="2" fill="#090d16" stroke="#f59e0b" stroke-width="0.8"/>
          <text x="${X + 37}" y="${Y + 48}" fill="#fde047" font-family="monospace" font-weight="900" font-size="6" text-anchor="middle" letter-spacing="0.5">CRYO-LOX</text>

          <!-- Ventana de Cristal Graduada (Mirilla Central) -->
          <rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" rx="6" fill="#030910" stroke="#0e7490" stroke-width="2"/>
          <rect x="${GX + 3}" y="${GY + 3}" width="${GW - 6}" height="${GH - 6}" rx="4" fill="url(#glassChamber${u})"/>

          <!-- Líquido Criogénico Reactivo (% Oxígeno) -->
          <rect x="${GX + 4}" y="${liquidY}" width="${GW - 8}" height="${liquidH}" rx="3" fill="url(#loxFluid${u})" opacity="${crit ? 0.55 : 0.9}"/>
          <!-- Menisco / Borde de superficie brillante -->
          <line x1="${GX + 4}" y1="${liquidY}" x2="${GX + GW - 4}" y2="${liquidY}" stroke="#a5f3fc" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Burbujas de electrólisis -->
          ${bubbles}

          <!-- Marcas de Calibración Láser sobre el Cristal -->
          <g stroke="#38bdf8" stroke-width="1" opacity="0.8" font-family="monospace" font-size="6" font-weight="bold" fill="#38bdf8">
            <line x1="${GX + 4}" y1="${GY + 8}" x2="${GX + 11}" y2="${GY + 8}"/>
            <text x="${GX + GW - 4}" y="${GY + 10}" text-anchor="end">100%</text>

            <line x1="${GX + 4}" y1="${GY + 46}" x2="${GX + 9}" y2="${GY + 46}"/>
            <text x="${GX + GW - 4}" y="${GY + 48}" text-anchor="end">75%</text>

            <line x1="${GX + 4}" y1="${GY + 84}" x2="${GX + 11}" y2="${GY + 84}"/>
            <text x="${GX + GW - 4}" y="${GY + 86}" text-anchor="end">50%</text>

            <line x1="${GX + 4}" y1="${GY + 122}" x2="${GX + 9}" y2="${GY + 122}"/>
            <text x="${GX + GW - 4}" y="${GY + 124}" text-anchor="end">25%</text>

            <line x1="${GX + 4}" y1="${GY + GH - 8}" x2="${GX + 11}" y2="${GY + GH - 8}"/>
            <text x="${GX + GW - 4}" y="${GY + GH - 6}" text-anchor="end">0%</text>
          </g>

          <!-- Manómetro Industrial en la Cúpula Superior -->
          <g transform="translate(${X + W / 2}, ${Y + 12})">
            <!-- Bisel metálico exterior -->
            <circle cx="0" cy="0" r="16" fill="url(#turbRing${u})" stroke="#94a3b8" stroke-width="1.8"/>
            <circle cx="0" cy="0" r="13" fill="#090d16" stroke="#334155" stroke-width="1"/>
            <!-- Arcos de zona nominal y crítica -->
            <path d="M-9,6 A11,11 0 0,1 -5,-10" fill="none" stroke="#ef4444" stroke-width="2"/>
            <path d="M-5,-10 A11,11 0 0,1 5,-10" fill="none" stroke="#f59e0b" stroke-width="2"/>
            <path d="M5,-10 A11,11 0 0,1 9,6" fill="none" stroke="#22d3ee" stroke-width="2"/>
            <!-- Aguja reactiva -->
            <line x1="0" y1="0" x2="0" y2="-9" stroke="${statusColor}" stroke-width="1.8" stroke-linecap="round" transform="rotate(${needleAngle})"/>
            <circle cx="0" cy="0" r="2.5" fill="#f8fafc"/>
          </g>

          <!-- Placa LCD Oscura de Telemetría en la Base -->
          <rect x="${X + 10}" y="${Y + H - 28}" width="${W - 20}" height="20" rx="3" fill="#09090b" stroke="${statusColor}" stroke-width="1.2"/>
          <circle cx="${X + 18}" cy="${Y + H - 18}" r="3" fill="${statusColor}" class="${crit ? 'warn-amber' : ''}"/>
          <text x="${X + 26}" y="${Y + H - 21}" fill="#f8fafc" font-family="monospace" font-weight="900" font-size="6.5" letter-spacing="0.5">LOX-0${tankId} // -183°C</text>
          <text x="${X + 26}" y="${Y + H - 12}" fill="${statusColor}" font-family="monospace" font-weight="900" font-size="6.5" letter-spacing="0.5">PRESS: ${pressKpa} kPa</text>
        </g>
      `;
    };

    // Tanque de Respaldo Extra (Marcus Vance - Sol 1)
    const extraBackupTank = (vance && !crit) ? `
      <!-- Tanque Crio-LOX Extra Conectado (Sol 1) -->
      <g id="tank-extra-vance-${u}">
        <rect x="180" y="145" width="26" height="130" rx="8" fill="url(#cylSteel${u})" stroke="#22d3ee" stroke-width="2"/>
        <rect x="184" y="160" width="18" height="95" rx="4" fill="#04121a" stroke="#06b6d4" stroke-width="1"/>
        <rect x="186" y="190" width="14" height="63" rx="2" fill="url(#loxFluid${u})"/>
        <line x1="186" y1="190" x2="200" y2="190" stroke="#a5f3fc" stroke-width="1.5"/>
        <circle class="bubble" cx="193" cy="250" r="1.8" fill="#cffafe" style="--rise:55px;"/>
        <path class="flow-dash" d="M193,275 L193,310 L230,310" stroke="#22d3ee" stroke-width="3" fill="none"/>
        <text x="193" y="156" fill="#38bdf8" font-family="monospace" font-weight="900" font-size="5" text-anchor="middle">AUX</text>
      </g>
    ` : '';

    // Celdas del Reactor Sabatier / LiOH Array (8 celdas verticales)
    const sabatierCells = [0, 1, 2, 3, 4, 5, 6, 7].map(idx => {
      const cx = 462 + idx * 39;
      const cy = 66;
      return `
        <g id="sabatier-cell-${idx}-${u}">
          <rect x="${cx}" y="${cy}" width="30" height="66" rx="4" fill="#090d14" stroke="#334155" stroke-width="1.5"/>
          <!-- Ventana activa del catalizador con gradiente reactivo -->
          <rect x="${cx + 4}" y="${cy + 8}" width="22" height="50" rx="3" fill="url(#cellGlow${u})" opacity="0.85"/>
          <!-- Aletas/rejillas de filtrado químico -->
          <line x1="${cx + 4}" y1="${cy + 18}" x2="${cx + 26}" y2="${cy + 18}" stroke="#1e293b" stroke-width="1.2"/>
          <line x1="${cx + 4}" y1="${cy + 28}" x2="${cx + 26}" y2="${cy + 28}" stroke="#1e293b" stroke-width="1.2"/>
          <line x1="${cx + 4}" y1="${cy + 38}" x2="${cx + 26}" y2="${cy + 38}" stroke="#1e293b" stroke-width="1.2"/>
          <line x1="${cx + 4}" y1="${cy + 48}" x2="${cx + 26}" y2="${cy + 48}" stroke="#1e293b" stroke-width="1.2"/>
          <!-- LED indicador superior de celda -->
          <circle cx="${cx + 15}" cy="${cy + 5}" r="2" fill="${statusColor}"/>
          <text x="${cx + 15}" y="${cy + 63}" fill="#e2e8f0" font-family="monospace" font-weight="bold" font-size="5" text-anchor="middle">C-0${idx + 1}</text>
        </g>
      `;
    }).join('');

    // Turbocompresores centrífugos de 12 álabes
    const renderCentrifugalTurbine = (cx, cy, idx, mode, rpm) => {
      let blades = '';
      for (let i = 0; i < 12; i++) {
        // Álabes curvos aerodinámicos
        blades += `
          <path d="M0,0 C5,-16 13,-32 7,-42 C1,-43 -5,-28 0,0 Z"
            fill="url(#bladeGrad${u})"
            stroke="#1e293b"
            stroke-width="0.8"
            transform="rotate(${i * 30})"/>
        `;
      }

      let extras = '';
      if (dust && !(crit && idx === 1)) {
        extras += `
          <g class="spark"><polygon points="${cx + 42},${cy - 8} ${cx + 50},${cy - 2} ${cx + 40},${cy + 2}" fill="#fde047"/></g>
          <g class="spark" style="animation-delay:.25s"><polygon points="${cx - 42},${cy + 10} ${cx - 50},${cy + 4} ${cx - 40},${cy + 2}" fill="#fdba74"/></g>
        `;
      }
      if (crit && idx === 1) {
        [0, 1, 2].forEach(k => {
          extras += `<circle class="smoke" cx="${cx - 10 + k * 10}" cy="${cy - 35}" r="12" fill="#71717a" opacity="0.65"/>`;
        });
      }

      return `
        <!-- Turbocompresor TURB-0${idx + 1} -->
        <g id="turbocompressor-0${idx + 1}-${u}">
          <!-- Carcasa exterior circular de titanio con sombra interna -->
          <circle cx="${cx}" cy="${cy}" r="56" fill="url(#turbRing${u})" stroke="#475569" stroke-width="3"/>
          <circle cx="${cx}" cy="${cy}" r="47" fill="#04060a" stroke="#1e293b" stroke-width="1.8"/>

          <!-- 8 Pernos hexagonales alrededor del anillo exterior -->
          ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
            const rad = (deg * Math.PI) / 180;
            const bx = cx + Math.cos(rad) * 51;
            const by = cy + Math.sin(rad) * 51;
            return `<circle cx="${bx}" cy="${by}" r="2" fill="#cbd5e1" stroke="#334155" stroke-width="0.7"/>`;
          }).join('')}

          <!-- Rotor de 12 Álabes Giratorios (Animación GPU) -->
          <g class="turbine ${mode}" style="transform-origin: ${cx}px ${cy}px;">
            <g transform="translate(${cx}, ${cy})">
              ${blades}
              <!-- Spinner cónico central -->
              <circle cx="0" cy="0" r="13" fill="url(#cylSteelDome${u})" stroke="#64748b" stroke-width="1.5"/>
              <circle cx="0" cy="0" r="6" fill="#0f172a" stroke="#38bdf8" stroke-width="1"/>
            </g>
          </g>

          <!-- Rejilla/Cruceta Protectora Frontal Metálica (Encima de las aspas) -->
          <circle cx="${cx}" cy="${cy}" r="22" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="12 5" pointer-events="none"/>
          <circle cx="${cx}" cy="${cy}" r="38" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="20 6" pointer-events="none"/>
          <line x1="${cx - 42}" y1="${cy - 42}" x2="${cx + 42}" y2="${cy + 42}" stroke="#475569" stroke-width="3" stroke-linecap="round" pointer-events="none"/>
          <line x1="${cx - 42}" y1="${cy + 42}" x2="${cx + 42}" y2="${cy - 42}" stroke="#475569" stroke-width="3" stroke-linecap="round" pointer-events="none"/>
          <circle cx="${cx}" cy="${cy}" r="7" fill="#1e293b" stroke="#94a3b8" stroke-width="1.5" pointer-events="none"/>

          ${extras}

          <!-- Display Digital LCD de RPM -->
          <rect x="${cx - 55}" y="${cy + 62}" width="110" height="20" rx="4" fill="#09090b" stroke="${statusColor}" stroke-width="1"/>
          <circle cx="${cx - 46}" cy="${cy + 72}" r="2.5" fill="${statusColor}"/>
          <text x="${cx}" y="${cy + 75}" fill="${statusColor}" font-family="monospace" font-weight="900" font-size="8" text-anchor="middle" letter-spacing="0.8">
            TURB-0${idx + 1} // ${rpm} RPM
          </text>
        </g>
      `;
    };

    // Badges de Alerta y Estado
    let badges = '';
    if (crit) {
      badges += isEn
        ? '<div class="cctv-badge cctv-badge-crit">[!] HYPOXIA WARNING // TURBINE STALL</div>'
        : '<div class="cctv-badge cctv-badge-crit">[!] ALERTA DE HIPOXIA // TURBINA DETENIDA</div>';
    }
    if (dust) {
      badges += isEn
        ? '<div class="cctv-badge cctv-badge-warn">[!] ALERT: REGOLITH CORROSION ON FILTERS</div>'
        : '<div class="cctv-badge cctv-badge-warn">[!] ALERTA: CORROSIÓN POR REGOLITO EN FILTROS</div>';
    }
    if (!crit && vance) {
      badges += isEn
        ? '<div class="cctv-badge cctv-badge-blue">[CRYO] EXTRA CRYO-LOX TANK CONNECTED</div>'
        : '<div class="cctv-badge cctv-badge-blue">[CRIO] TANQUE CRIO-LOX EXTRA CONECTADO</div>';
    }
    if (!badges) {
      badges = (o2Val >= 70)
        ? (isEn ? '<div class="cctv-badge cctv-badge-blue">[OK] CLEAN AIR // NOMINAL TURBINES</div>' : '<div class="cctv-badge cctv-badge-blue">[OK] AIRE LIMPIO // TURBINAS NOMINALES</div>')
        : (isEn ? '<div class="cctv-badge cctv-badge-warn">[!] LOW OXYGEN // SLOW TURBINES</div>' : '<div class="cctv-badge cctv-badge-warn">[!] OXÍGENO REDUCIDO // TURBINAS LENTAS</div>');
    }

    return `
      <div class="cctv-scene" data-state="${st}">
        <svg viewBox="0 0 800 380" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <!-- Gradiente de pared acústica lunar -->
            <linearGradient id="o2WallGrad${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#141824"/>
              <stop offset="65%" stop-color="#0a0d14"/>
              <stop offset="100%" stop-color="#040609"/>
            </linearGradient>

            <!-- Gradiente de piso de rejilla metálica -->
            <linearGradient id="floorGrad${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1e293b"/>
              <stop offset="25%" stop-color="#0f172a"/>
              <stop offset="100%" stop-color="#020408"/>
            </linearGradient>

            <!-- Acero cepillado cilíndrico 3D para tanques -->
            <linearGradient id="cylSteel${u}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#090d16"/>
              <stop offset="14%" stop-color="#1e293b"/>
              <stop offset="42%" stop-color="#475569"/>
              <stop offset="70%" stop-color="#334155"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>

            <!-- Cúpulas de tanques -->
            <linearGradient id="cylSteelDome${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#475569"/>
              <stop offset="40%" stop-color="#334155"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>

            <!-- Cámara de cristal de la mirilla -->
            <linearGradient id="glassChamber${u}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#030d14"/>
              <stop offset="40%" stop-color="#051c28"/>
              <stop offset="100%" stop-color="#02080d"/>
            </linearGradient>

            <!-- Fluido reactivo Cryo-LOX -->
            <linearGradient id="loxFluid${u}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#22d3ee"/>
              <stop offset="35%" stop-color="#06b6d4"/>
              <stop offset="100%" stop-color="#0369a1"/>
            </linearGradient>

            <!-- Álabes de turbocompresor -->
            <linearGradient id="bladeGrad${u}" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#94a3b8"/>
              <stop offset="50%" stop-color="#475569"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>

            <!-- Anillo de turbina -->
            <linearGradient id="turbRing${u}" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#475569"/>
              <stop offset="100%" stop-color="#111827"/>
            </linearGradient>

            <!-- Brillo de celdas Sabatier -->
            <linearGradient id="cellGlow${u}" x1="0" y1="0" x2="0" y2="1">
              ${crit
                ? '<stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#7f1d1d"/>'
                : (degraded
                  ? '<stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#78350f"/>'
                  : '<stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#065f46"/>')}
            </linearGradient>
          </defs>

          <!-- 1. Fondo de Paneles Acústicos Lunares -->
          <rect width="800" height="380" fill="url(#o2WallGrad${u})"/>
          <!-- Costuras de paneles y remaches -->
          <g stroke="#1e293b" stroke-width="1.5">
            <line x1="0" y1="46" x2="800" y2="46"/>
            <line x1="0" y1="150" x2="800" y2="150"/>
            <line x1="0" y1="250" x2="800" y2="250"/>
            <line x1="190" y1="0" x2="190" y2="310"/>
            <line x1="435" y1="0" x2="435" y2="310"/>
            <line x1="615" y1="0" x2="615" y2="310"/>
          </g>
          <!-- Remaches en costuras -->
          ${[40, 110, 180, 260, 340, 420, 500, 580, 660, 740].map(x => `
            <circle cx="${x}" cy="46" r="1.5" fill="#334155"/>
            <circle cx="${x}" cy="150" r="1.5" fill="#334155"/>
          `).join('')}

          <!-- Tuberías secundarias en el techo -->
          <rect x="0" y="10" width="800" height="7" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
          <rect x="0" y="20" width="800" height="5" fill="#0f172a" stroke="#1e293b" stroke-width="0.8"/>
          ${[80, 200, 320, 440, 560, 680].map(x => `
            <rect x="${x}" y="8" width="12" height="20" fill="#334155" stroke="#475569" stroke-width="1"/>
            <line x1="${x + 6}" y1="28" x2="${x + 6}" y2="34" stroke="#475569" stroke-width="2"/>
          `).join('')}

          <!-- 2. Piso de Rejilla Metálica Industrial (Perspectiva Lunar) -->
          <rect x="0" y="310" width="800" height="70" fill="url(#floorGrad${u})"/>
          <line x1="0" y1="310" x2="800" y2="310" stroke="#475569" stroke-width="2"/>
          <g stroke="#1e293b" stroke-width="1.2">
            <line x1="0" y1="324" x2="800" y2="324"/>
            <line x1="0" y1="340" x2="800" y2="340"/>
            <line x1="0" y1="358" x2="800" y2="358"/>
            <line x1="0" y1="376" x2="800" y2="376"/>
            <!-- Costillas de perspectiva -->
            ${[0, 60, 130, 210, 300, 400, 500, 600, 690, 760, 800].map(x => `
              <line x1="${x}" y1="310" x2="${x + (x - 400) * 0.15}" y2="380"/>
            `).join('')}
          </g>

          <!-- 3. Tuberías Gruesas de Transferencia con Doble Trazo y Flujo Animado -->
          <!-- Tubería de salida inferior de tanques -->
          <path d="M102,320 L102,342 L740,342" stroke="#1e293b" stroke-width="12" fill="none" stroke-linejoin="round"/>
          <path d="M277,320 L277,342" stroke="#1e293b" stroke-width="12" fill="none"/>
          <path d="M525,290 L525,342" stroke="#1e293b" stroke-width="12" fill="none"/>
          <path d="M695,290 L695,342" stroke="#1e293b" stroke-width="12" fill="none"/>

          <!-- Núcleo de flujo luminoso inferior -->
          <path class="flow-dash" d="M102,320 L102,342 L740,342" stroke="${statusColor}" stroke-width="4" fill="none" stroke-linejoin="round"/>
          <path class="flow-dash" d="M277,320 L277,342" stroke="${statusColor}" stroke-width="4" fill="none"/>

          <!-- Tubería de interconexión media hacia Sabatier y turbinas -->
          <path d="M102,175 L445,175 L445,115" stroke="#1e293b" stroke-width="11" fill="none" stroke-linejoin="round"/>
          <path d="M277,175 L445,175" stroke="#1e293b" stroke-width="11" fill="none"/>
          <path d="M445,175 L525,175 L525,185" stroke="#1e293b" stroke-width="11" fill="none"/>
          <path d="M525,175 L695,175 L695,185" stroke="#1e293b" stroke-width="11" fill="none"/>

          <!-- Núcleo luminoso superior -->
          <path class="flow-dash" d="M102,175 L445,175 L445,115" stroke="${statusColor}" stroke-width="3.5" fill="none" stroke-linejoin="round"/>
          <path class="flow-dash" d="M277,175 L445,175" stroke="${statusColor}" stroke-width="3.5" fill="none"/>
          <path class="flow-dash" d="M445,175 L695,175 L695,185" stroke="${statusColor}" stroke-width="3.5" fill="none"/>

          <!-- Válvula esférica de control industrial en bifurcación -->
          <circle cx="360" cy="175" r="12" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
          <circle cx="360" cy="175" r="6" fill="${statusColor}"/>
          <line x1="360" y1="163" x2="360" y2="152" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
          <circle cx="360" cy="151" r="5" fill="#334155" stroke="#94a3b8" stroke-width="1"/>

          <!-- 4. Tanques Criogénicos 3D (LOX-01 y LOX-02) -->
          ${renderCryoTank(35, 52, 135, 255, 1)}
          ${extraBackupTank}
          ${renderCryoTank(210, 52, 135, 255, 2)}

          <!-- 5. Módulo Superior Derecho: NASA Sabatier CO2 Scrubber / LiOH Array -->
          <g id="sabatier-module-${u}">
            <!-- Chasis biselado de titanio -->
            <rect x="445" y="32" width="335" height="114" rx="8" fill="#151922" stroke="#475569" stroke-width="2"/>
            <!-- Difusor térmico superior con aletas de refrigeración -->
            <rect x="455" y="24" width="315" height="9" rx="2" fill="#0f172a" stroke="#334155" stroke-width="1"/>
            ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(i => `
              <line x1="${462 + i * 16}" y1="21" x2="${462 + i * 16}" y2="28" stroke="#64748b" stroke-width="1.8"/>
            `).join('')}

            <!-- Barra de título técnico grabada -->
            <rect x="445" y="32" width="335" height="22" rx="4" fill="#0a0d14" stroke="#334155" stroke-width="1"/>
            <text x="458" y="47" fill="#38bdf8" font-family="monospace" font-weight="900" font-size="8.5" letter-spacing="1">
              [ NASA SABATIER CO2 SCRUBBER // LIOH-ARRAY ]
            </text>
            <circle cx="762" cy="43" r="3" fill="${statusColor}" class="${crit ? 'warn-amber' : ''}"/>

            <!-- 8 Celdas de Filtrado Químico -->
            ${sabatierCells}
          </g>

          <!-- 6. Módulo Inferior Derecho: 2 Turbocompresores Centrífugos (12 Álabes) -->
          ${renderCentrifugalTurbine(525, 226, 0, turbMode1, rpm1)}
          ${renderCentrifugalTurbine(695, 226, 1, turbMode2, rpm2)}
        </svg>

        <!-- Efectos de emergencia si el oxígeno es crítico -->
        ${crit ? '<div class="cctv-frost"></div><div class="cctv-alarm-wash"></div>' : ''}

        <!-- Pila de etiquetas de incidentes y estado -->
        <div class="cctv-badge-stack">${badges}</div>
      </div>
    `;
  }

  const CCTV_ROOMS = {
    o2: {
      cam: 'CAM-04',
      shortTitle: (isEn) => isEn ? 'OXYGEN' : 'OXÍGENO',
      title: (isEn) => isEn ? 'OGS WATER ELECTROLYSIS PLANT' : 'PLANTA DE ELECTRÓLISIS DE AGUA OGS',
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
    return [st, state.resources[key], isEn, wasDecision('SOL1-C1', 'AUTHORIZE'), wasDecision('SOL1-C2', 'AUTHORIZE'),
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
        if (key === cctv.room) {
          if (room.render) {
            const sig = cctvSignature(key);
            if (force || cctv.sigs[key] !== sig || roomEl.innerHTML === '') {
              roomEl.innerHTML = room.render(st);
              cctv.sigs[key] = sig;
            }
          }
          roomEl.classList.remove('hidden');
        } else {
          // Vaciado DOM total de cámaras CCTV inactivas (cero consumo GPU en segundo plano)
          if (roomEl.innerHTML !== '') {
            roomEl.innerHTML = '';
            delete cctv.sigs[key];
          }
          roomEl.classList.add('hidden');
        }
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

    // Actualizar controles de despliegue táctico EVA (1 uso por Sol o Modo Práctica)
    if (typeof refreshCctvEvaControls === 'function') {
      refreshCctvEvaControls();
    }
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
    if (typeof cleanupAllModalLoops === 'function') cleanupAllModalLoops();
    cctv.room = CCTV_ROOMS[roomKey] ? roomKey : 'food';
    cctv.open = true;
    const modal = document.getElementById('cctv-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
    }
    refreshCctv(true);
    updateCctvClock();
    updateCctvIncidentBanner();
    if (cctv.clockTimer) clearInterval(cctv.clockTimer);
    cctv.clockTimer = setInterval(updateCctvClock, 1000);
    if (window.activeMinigameLoops) window.activeMinigameLoops.intervals.push(cctv.clockTimer);
    sfx.playGrab();
  }

  function closeCctv() {
    cctv.open = false;
    if (typeof cleanupAllModalLoops === 'function') cleanupAllModalLoops();
    if (cctv.clockTimer) {
      clearInterval(cctv.clockTimer);
      cctv.clockTimer = null;
    }
    // Vaciado total de los 4 contenedores SVG de CCTV al cerrar el modal
    Object.keys(CCTV_ROOMS).forEach((key) => {
      const roomEl = document.getElementById(`cctv-room-${key}`);
      if (roomEl) roomEl.innerHTML = '';
    });
    cctv.sigs = {};
    const modal = document.getElementById('cctv-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
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

    // Listeners para botones de despliegue táctico EVA
    const evaDeployBtn = document.getElementById('cctv-eva-deploy-btn');
    if (evaDeployBtn) {
      evaDeployBtn.addEventListener('click', () => {
        if (typeof openEvaModal === 'function') {
          openEvaModal(cctv.room, false);
        }
      });
    }

    const evaPracticeBtn = document.getElementById('cctv-eva-practice-btn');
    if (evaPracticeBtn) {
      evaPracticeBtn.addEventListener('click', () => {
        if (typeof openEvaModal === 'function') {
          openEvaModal(cctv.room, true);
        }
      });
    }

    const o2RoomEl = document.getElementById('cctv-room-o2');
    if (o2RoomEl) {
      o2RoomEl.style.cursor = 'pointer';
      o2RoomEl.addEventListener('click', () => {
        if (typeof openEvaModal === 'function') {
          const canReal = (state.resources.o2 <= 30) && !window.evaUsedThisSol;
          openEvaModal('o2', !canReal);
        }
      });
    }

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
    let lastDomUpdate = -100;
    let lastTextClass = '';
    let lastBarClass = '';

    function tick() {
      if (!isEmergencyActive) return;
      const now = performance.now();
      const elapsed = now - startTime;
      const remainingMs = Math.max(0, totalMs - elapsed);
      const remainingSec = remainingMs / 1000;

      if (now - lastDomUpdate >= 80 || remainingMs <= 0) {
        lastDomUpdate = now;
        if (emergencyTimerText) {
          const nextText = remainingSec.toFixed(1) + 's';
          if (emergencyTimerText.textContent !== nextText) {
            emergencyTimerText.textContent = nextText;
          }
          const nextTextClass = remainingSec < 2.0
            ? 'text-lg md:text-xl font-black font-mono tracking-wider text-rose-500 animate-pulse'
            : 'text-lg md:text-xl font-black font-mono tracking-wider text-rose-400';
          if (lastTextClass !== nextTextClass) {
            lastTextClass = nextTextClass;
            emergencyTimerText.className = nextTextClass;
          }
        }

        if (emergencyTimerBar) {
          const pct = (remainingMs / totalMs) * 100;
          emergencyTimerBar.style.width = pct.toFixed(1) + '%';
          let nextBarClass;
          if (pct < 25) {
            nextBarClass = 'h-full bg-rose-500 transition-all duration-75 emergency-bar-glow shadow-[0_0_15px_#f43f5e] animate-pulse';
          } else if (pct < 55) {
            nextBarClass = 'h-full bg-amber-400 transition-all duration-75 emergency-bar-glow shadow-[0_0_15px_#fbbf24]';
          } else {
            nextBarClass = 'h-full bg-cyan-400 transition-all duration-75 emergency-bar-glow shadow-[0_0_15px_#38bdf8]';
          }
          if (lastBarClass !== nextBarClass) {
            lastBarClass = nextBarClass;
            emergencyTimerBar.className = nextBarClass;
          }
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
      <div id="wire-board" class="w-full h-full pcb-grid-board rounded-xl border border-cyan-500/40 flex items-center justify-between px-3 md:px-8 relative select-none overflow-hidden" style="min-height: 240px;">
        <!-- Pistas PCB de fondo y etiquetas técnicas de alto voltaje -->
        <div class="absolute top-2 left-3 text-[0.58rem] font-mono font-bold text-cyan-400/60 pointer-events-none tracking-widest uppercase">
          [ BUS-A // 400Hz HIGH-VOLT ]
        </div>
        <div class="absolute top-2 right-3 text-[0.58rem] font-mono font-bold text-cyan-400/60 pointer-events-none tracking-widest uppercase">
          [ BUS-B // DISTRIBUTION ]
        </div>
        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 text-[0.52rem] font-mono font-bold text-zinc-500 pointer-events-none tracking-widest uppercase hidden sm:block">
          KILOPOWER POWER DISTRIBUTION MATRIX // NASA-STD-3001
        </div>

        <svg id="wire-svg-canvas" class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 15;">
          <g id="wire-paths-done"></g>
          <path id="wire-active-drag-sheath" stroke="#050810" stroke-width="11" stroke-linecap="round" fill="none" class="hidden"></path>
          <path id="wire-active-drag-path" stroke-width="5" stroke-linecap="round" fill="none" class="wire-current-flow hidden"></path>
        </svg>

        <!-- Columna Izquierda -->
        <div class="flex flex-col justify-around h-full space-y-3 z-20 py-2">
          ` + leftList.map((c, idx) => `
            <div class="wire-port wire-port-left industrial-hex-terminal flex items-center gap-2.5 p-2 rounded-xl cursor-pointer select-none group relative" data-side="left" data-color="` + c.id + `" data-hex="` + c.hex + `">
              <div class="w-9 h-9 rounded-lg bg-zinc-950 border-2 flex items-center justify-center p-1.5 shadow-md pointer-events-none transition-transform group-hover:scale-105" style="border-color: ` + c.border + `; box-shadow: 0 0 10px ` + c.glow + `;">
                <div class="w-4 h-4 rounded-full" style="background-color: ` + c.hex + `;"></div>
              </div>
              <div class="flex flex-col pointer-events-none">
                <span class="text-[0.58rem] font-mono font-bold text-zinc-400 leading-none">CH-0` + (idx + 1) + `</span>
                <span class="text-[0.68rem] font-black font-mono tracking-wider" style="color: ` + c.border + `;">` + c.name + `</span>
              </div>
              <div class="wire-pin w-5 h-5 rounded-full border border-zinc-600 bg-zinc-950 flex items-center justify-center pointer-events-none ml-2">
                <div class="wire-pin-led w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]"></div>
              </div>
            </div>
          `).join('') + `
        </div>

        <!-- Columna Derecha -->
        <div class="flex flex-col justify-around h-full space-y-3 z-20 py-2">
          ` + rightList.map((c, idx) => `
            <div class="wire-port wire-port-right industrial-hex-terminal flex items-center gap-2.5 p-2 rounded-xl cursor-pointer select-none group relative" data-side="right" data-color="` + c.id + `" data-hex="` + c.hex + `">
              <div class="wire-pin w-5 h-5 rounded-full border border-zinc-600 bg-zinc-950 flex items-center justify-center pointer-events-none mr-2">
                <div class="wire-pin-led w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]"></div>
              </div>
              <div class="flex flex-col text-right pointer-events-none">
                <span class="text-[0.58rem] font-mono font-bold text-zinc-400 leading-none">CH-0` + (idx + 1) + `</span>
                <span class="text-[0.68rem] font-black font-mono tracking-wider" style="color: ` + c.border + `;">` + c.name + `</span>
              </div>
              <div class="w-9 h-9 rounded-lg bg-zinc-950 border-2 flex items-center justify-center p-1.5 shadow-md pointer-events-none transition-transform group-hover:scale-105" style="border-color: ` + c.border + `; box-shadow: 0 0 10px ` + c.glow + `;">
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
    const activeDragSheath = container.querySelector('#wire-active-drag-sheath');
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
      activeDragPath.removeAttribute('style');
      activeDragSheath.classList.remove('hidden');
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
      activeDragSheath.setAttribute('d', d);
      activeDragPath.setAttribute('d', d);
    }

    function onPointerUp(e) {
      if (!activeDrag) return;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      activeDragSheath.classList.add('hidden');
      activeDragPath.classList.add('hidden');

      const oppositeSide = activeDrag.side === 'left' ? 'right' : 'left';
      const cur = getCoordsFromPointer(e);

      // Detectar conector opuesto: por elementFromPoint o por cercanía euclidiana (< 52px)
      let targetPort = null;
      const targetElement = document.elementFromPoint(e.clientX, e.clientY);
      const hitPort = targetElement?.closest('.wire-port-' + oppositeSide);
      if (hitPort) {
        targetPort = hitPort;
      } else {
        const oppositePorts = container.querySelectorAll('.wire-port-' + oppositeSide);
        let minDist = 52;
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
          const d = 'M ' + leftCoords.x + ' ' + leftCoords.y + ' C ' + cpX + ' ' + leftCoords.y + ', ' + cpX + ' ' + rightCoords.y + ', ' + rightCoords.x + ' ' + rightCoords.y;

          // Doble trazo SVG: borde exterior grueso oscuro
          const sheathPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          sheathPath.setAttribute('d', d);
          sheathPath.setAttribute('stroke', '#050810');
          sheathPath.setAttribute('stroke-width', '11');
          sheathPath.setAttribute('stroke-linecap', 'round');
          sheathPath.setAttribute('fill', 'none');
          pathsDoneGroup.appendChild(sheathPath);

          // Núcleo interior luminoso con flujo animado
          const corePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          corePath.setAttribute('d', d);
          corePath.setAttribute('stroke', activeDrag.hex);
          corePath.setAttribute('stroke-width', '5');
          corePath.setAttribute('stroke-linecap', 'round');
          corePath.setAttribute('fill', 'none');
          corePath.setAttribute('class', 'wire-current-flow');
          pathsDoneGroup.appendChild(corePath);

          // Cambio de LED: rojo -> verde esmeralda brillante
          const leftLed = leftPort.querySelector('.wire-pin-led');
          if (leftLed) {
            leftLed.className = 'wire-pin-led w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse';
          }
          const rightLed = rightPort.querySelector('.wire-pin-led');
          if (rightLed) {
            rightLed.className = 'wire-pin-led w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse';
          }

          // Destello de chispas en el borne receptor
          const sparkOrigin = targetPort ? getPortPinCoords(targetPort) : rightCoords;
          const boardEl = container.querySelector('#wire-board');
          if (boardEl) {
            for (let s = 0; s < 6; s++) {
              const spark = document.createElement('div');
              spark.className = 'absolute w-1.5 h-1.5 rounded-full pointer-events-none z-30';
              spark.style.backgroundColor = activeDrag.hex;
              spark.style.boxShadow = '0 0 8px ' + activeDrag.hex;
              spark.style.left = sparkOrigin.x + 'px';
              spark.style.top = sparkOrigin.y + 'px';
              const ang = (Math.PI * 2 / 6) * s + Math.random() * 0.4;
              const dist = 14 + Math.random() * 18;
              spark.style.transition = 'all 0.22s ease-out';
              boardEl.appendChild(spark);
              requestAnimationFrame(() => {
                spark.style.transform = `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px) scale(0)`;
                spark.style.opacity = '0';
              });
              setTimeout(() => spark.remove(), 240);
            }
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
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const conduits = [
      { id: 'conduitA', name: isEn ? 'ECLSS CONDUIT A // LOX PRIMARY FEED' : 'DUCTO ECLSS A // ALIMENTACIÓN LOX PRIMARIA' },
      { id: 'conduitB', name: isEn ? 'ECLSS CONDUIT B // CABIN AIR CIRCULATION' : 'DUCTO ECLSS B // CIRCULACIÓN CABINA' },
      { id: 'conduitC', name: isEn ? 'ECLSS CONDUIT C // HIGH-PRESSURE MANIFOLD' : 'DUCTO ECLSS C // COLECTOR ALTA PRESIÓN' }
    ];

    // Distribución aleatoria de 4 fugas en las 3 tuberías
    const pipeDistribution = [0, 1, 2, Math.floor(Math.random() * 3)];
    // Barajar asignación de tuberías
    for (let i = pipeDistribution.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pipeDistribution[i], pipeDistribution[j]] = [pipeDistribution[j], pipeDistribution[i]];
    }

    const pipeLeakXCounts = { 0: [], 1: [], 2: [] };
    const leaksData = pipeDistribution.map((pipeIdx, idx) => {
      let posX;
      const existing = pipeLeakXCounts[pipeIdx];
      if (existing.length === 0) {
        posX = 16 + Math.floor(Math.random() * 64); // 16% a 80%
      } else {
        // Separación garantizada de >= 26% en la misma tubería
        if (existing[0] < 48) {
          posX = Math.min(84, existing[0] + 28 + Math.floor(Math.random() * 10));
        } else {
          posX = Math.max(14, existing[0] - 28 - Math.floor(Math.random() * 10));
        }
      }
      pipeLeakXCounts[pipeIdx].push(posX);

      const randOffset = Math.floor(Math.random() * 12 - 6); // -6px a +6px vertical
      const randAngle = Math.floor(Math.random() * 60 - 30); // -30deg a +30deg
      return {
        id: idx,
        pipeIdx,
        x: posX,
        offsetY: randOffset,
        angle: randAngle,
        state: 'open' // 'open' -> 'pending_torque' -> 'sealed'
      };
    });

    container.innerHTML = `
      <div class="w-full h-full flex flex-col justify-between p-2 md:p-3 relative select-none">
        <!-- Manómetro Digital LCD Superior -->
        <div class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-950 border border-cyan-500/40 shadow-inner">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span id="leak-status-counter" class="text-[0.68rem] font-mono font-bold tracking-widest text-cyan-300 uppercase">
              ${isEn ? 'ACTIVE RUPTURES: 4 / 4' : 'FUGAS ACTIVAS: 4 / 4'}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[0.6rem] font-mono text-zinc-400 uppercase tracking-widest hidden sm:inline-block">${isEn ? 'MANIFOLD PRESSURE:' : 'PRESIÓN MANIFOLD:'}</span>
            <span id="leak-pressure-gauge" class="text-[0.72rem] font-mono font-black text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.5)]">
              ${isEn ? 'CRITICAL // 35.5 kPa' : 'CRÍTICA // 35.5 kPa'}
            </span>
          </div>
        </div>

        <!-- 3 Tuberías Horizontales de Titanio -->
        <div class="w-full flex-1 flex flex-col justify-around py-1 md:py-2 relative">
          ${conduits.map((conduit, pIdx) => `
            <div class="titanium-pipe rounded-xl h-14 md:h-16 relative flex items-center px-4 my-1 shadow-lg border border-slate-400/60 overflow-visible" data-pipe="${pIdx}">
              <!-- Remaches de titanio en los bordes -->
              <div class="absolute left-2 inset-y-0 flex flex-col justify-around pointer-events-none py-1">
                <span class="w-1.5 h-1.5 rounded-full bg-slate-300 shadow"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-slate-300 shadow"></span>
              </div>
              <div class="absolute right-2 inset-y-0 flex flex-col justify-around pointer-events-none py-1">
                <span class="w-1.5 h-1.5 rounded-full bg-slate-300 shadow"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-slate-300 shadow"></span>
              </div>

              <!-- Etiqueta técnica grabada en el metal -->
              <div class="w-full text-center text-[0.55rem] md:text-[0.58rem] font-mono font-bold tracking-widest text-cyan-300/40 select-none pointer-events-none">
                [ ${conduit.name} // RATED 450 kPa ]
              </div>

              <!-- Contenedor de Fugas en esta Tubería -->
              <div class="pipe-leaks-container absolute inset-0 overflow-visible pointer-events-none">
                ${leaksData.filter(l => l.pipeIdx === pIdx).map(leak => `
                  <div class="leak-node absolute pointer-events-auto select-none"
                    style="left: ${leak.x}%; top: calc(50% + ${leak.offsetY}px); transform: translate(-50%, -50%);"
                    data-leak-id="${leak.id}">

                    <!-- Chorro de vapor criogénico presurizado -->
                    <div class="leak-steam absolute bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none flex flex-col items-center steam-jet-directional"
                      style="transform-origin: 50% 100%; transform: rotate(${leak.angle * 0.5}deg);">
                      <div class="w-9 h-14 bg-gradient-to-t from-cyan-300 via-sky-200 to-transparent rounded-full opacity-85"></div>
                      <div class="w-4 h-7 bg-white rounded-full -mt-6 opacity-90"></div>
                      <span class="text-[0.48rem] font-mono font-black text-cyan-200 bg-sky-950/80 px-1 rounded border border-cyan-400/40 -mt-2">
                        101 kPa JET
                      </span>
                    </div>

                    <!-- Paso 0: Fisura incandescente con rotación aleatoria -->
                    <div class="leak-crack-btn w-14 h-14 -ml-7 -mt-7 rounded-full flex items-center justify-center relative cursor-pointer"
                      style="transform: rotate(${leak.angle}deg);"
                      title="${isEn ? 'Click to stamp titanium patch' : 'Clic para colocar parche de titanio'}">
                      <span class="rupture-pulse-ring"></span>
                      <svg viewBox="0 0 32 32" class="w-8 h-8 text-cyan-300" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M16 3 L13 11 L19 15 L12 21 L16 29" stroke-linecap="round"/>
                        <line x1="13" y1="11" x2="8" y2="14" stroke-linecap="round"/>
                        <line x1="19" y1="15" x2="24" y2="13" stroke-linecap="round"/>
                      </svg>
                    </div>

                    <!-- Paso 1: Parche Metálico Pendiente de Torque (Anillo Amarillo Vibrante) -->
                    <div class="leak-patch-pending hidden absolute -top-4 -left-16 px-2.5 py-1 rounded-md hydraulic-patch-torque-pending text-amber-300 font-mono font-black text-[0.58rem] z-30 flex items-center gap-1.5 whitespace-nowrap shadow-lg select-none"
                      title="${isEn ? 'Click to torque bolts' : 'Clic para atornillar pernos'}">
                      <!-- 4 Pernos flojos amarillos -->
                      <span class="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                      <span class="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-amber-400"></span>
                      <span class="absolute bottom-0.5 left-0.5 w-1 h-1 rounded-full bg-amber-400"></span>
                      <span class="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-amber-400"></span>
                      <span class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                      <span>${isEn ? '[ CLICK TO TORQUE // 50% ]' : '[ CLIC ATORNILLAR // 50% ]'}</span>
                    </div>

                    <!-- Paso 2: Parche Sellado y Atornillado Firme (Verde Esmeralda) -->
                    <div class="leak-patch-sealed hidden absolute -top-4 -left-14 px-2.5 py-1 rounded-md hydraulic-patch-sealed text-emerald-300 font-mono font-black text-[0.6rem] z-30 flex items-center gap-1.5 whitespace-nowrap pointer-events-none select-none">
                      <!-- 4 Pernos hexagonales fijos -->
                      <span class="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-emerald-300 shadow"></span>
                      <span class="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-300 shadow"></span>
                      <span class="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-emerald-300 shadow"></span>
                      <span class="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-300 shadow"></span>
                      <svg class="w-3.5 h-3.5 text-emerald-300 shrink-0 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span class="mr-1">${isEn ? 'SEALED // 101.3 kPa' : 'SELLADO // 101.3 kPa'}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Barra Inferior de Ayuda Táctica -->
        <div class="w-full flex items-center justify-between text-[0.58rem] md:text-[0.62rem] font-mono text-zinc-400 bg-zinc-950/80 px-3 py-1 rounded border border-zinc-800">
          <span>${isEn ? 'STEP 1: STAMP TITANIUM PLATE' : 'PASO 1: ESTAMPA PLACA DE TITANIO'}</span>
          <span class="text-amber-400 font-bold">▶</span>
          <span>${isEn ? 'STEP 2: TORQUE 4 HEX BOLTS' : 'PASO 2: APLICA TORQUE A LOS 4 PERNOS'}</span>
        </div>
      </div>
    `;

    let sealedCount = 0;
    const totalLeaks = 4;
    const statusCounter = container.querySelector('#leak-status-counter');
    const pressureGauge = container.querySelector('#leak-pressure-gauge');

    const pressureStates = isEn ? [
      'CRITICAL // 35.5 kPa',
      'WARNING // 52.0 kPa',
      'STABILIZING // 71.5 kPa',
      'RESTORING // 88.0 kPa',
      'NOMINAL // 101.3 kPa'
    ] : [
      'CRÍTICA // 35.5 kPa',
      'ADVERTENCIA // 52.0 kPa',
      'ESTABILIZANDO // 71.5 kPa',
      'RESTAURANDO // 88.0 kPa',
      'NOMINAL // 101.3 kPa'
    ];

    const pressureStyles = [
      'text-rose-400 bg-rose-950/80 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
      'text-amber-400 bg-amber-950/80 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
      'text-amber-300 bg-amber-950/80 border-amber-500/50',
      'text-sky-300 bg-sky-950/80 border-sky-500/50 shadow-[0_0_8px_rgba(56,189,248,0.5)]',
      'text-emerald-300 bg-emerald-950/80 border-emerald-500/50 shadow-[0_0_10px_rgba(52,211,153,0.6)]'
    ];

    function handleLeakClick(e) {
      const crackBtn = e.target.closest('.leak-crack-btn');
      const pendingPatch = e.target.closest('.leak-patch-pending');
      const leakNode = e.target.closest('.leak-node');
      if (!leakNode) return;

      const leakId = parseInt(leakNode.dataset.leakId, 10);
      const leakItem = leaksData.find(l => l.id === leakId);
      if (!leakItem || leakItem.state === 'sealed') return;

      // PASO 1: Primer clic en la grieta -> Colocar parche pendiente de torque
      if (leakItem.state === 'open' && crackBtn) {
        leakItem.state = 'pending_torque';
        crackBtn.classList.add('hidden');

        // Vapor se reduce a la mitad
        const steam = leakNode.querySelector('.leak-steam');
        if (steam) {
          steam.style.opacity = '0.35';
          steam.style.transform = 'scale(0.55)';
        }

        const patchPending = leakNode.querySelector('.leak-patch-pending');
        if (patchPending) {
          patchPending.classList.remove('hidden');
        }

        sfx.playPatchClang();
        return;
      }

      // PASO 2: Segundo clic sobre el parche pendiente -> Atornillar y sellar al 100%
      if (leakItem.state === 'pending_torque' && (pendingPatch || crackBtn || leakNode)) {
        leakItem.state = 'sealed';

        const patchPending = leakNode.querySelector('.leak-patch-pending');
        if (patchPending) patchPending.classList.add('hidden');

        const patchSealed = leakNode.querySelector('.leak-patch-sealed');
        if (patchSealed) patchSealed.classList.remove('hidden');

        // Desaparecer vapor por completo
        const steam = leakNode.querySelector('.leak-steam');
        if (steam) steam.classList.add('hidden');

        // Chispazo neumático
        const spark = document.createElement('div');
        spark.className = 'pneumatic-spark-burst';
        leakNode.appendChild(spark);
        setTimeout(() => spark.remove(), 300);

        sfx.playCargoLock();
        sfx.playWireConnect();
        sealedCount++;

        if (statusCounter) {
          statusCounter.textContent = isEn
            ? `ACTIVE RUPTURES: ${totalLeaks - sealedCount} / ${totalLeaks}`
            : `FUGAS ACTIVAS: ${totalLeaks - sealedCount} / ${totalLeaks}`;
        }

        if (pressureGauge) {
          pressureGauge.textContent = pressureStates[sealedCount];
          pressureGauge.className = 'text-[0.72rem] font-mono font-black px-2 py-0.5 rounded border ' + pressureStyles[sealedCount];
        }

        if (sealedCount === totalLeaks) {
          setTimeout(() => {
            onComplete(true);
          }, 350);
        }
      }
    }

    container.addEventListener('click', handleLeakClick);

    return () => {
      container.removeEventListener('click', handleLeakClick);
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
      <div id="radar-meteor-arena" class="relative w-full h-[280px] md:h-[320px] cram-radar-bg rounded-xl overflow-hidden border border-sky-700/60 tactical-crosshair select-none flex items-center justify-center">
        <!-- Rejilla y Anillos de Radar Táctico -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 300" preserveAspectRatio="none">
          <defs>
            <radialGradient id="radarBackGlow" cx="50%" cy="85%" r="75%">
              <stop offset="0%" stop-color="#0284c7" stop-opacity="0.25"/>
              <stop offset="65%" stop-color="#0369a1" stop-opacity="0.08"/>
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

        <!-- Domo Lunar y Torreta C-RAM en la Base Inferior -->
        <div id="radar-dome" class="absolute bottom-0 left-1/2 -translate-x-1/2 z-25 flex flex-col items-center pointer-events-none">
          <!-- Torreta C-RAM Doble Cañón -->
          <div class="w-10 h-6 flex items-center justify-center -mb-1 z-30">
            <svg viewBox="0 0 40 24" class="w-10 h-6 text-sky-300">
              <rect x="14" y="10" width="12" height="12" rx="3" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
              <line x1="16" y1="10" x2="16" y2="2" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="24" y1="10" x2="24" y2="2" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="20" cy="16" r="3" fill="#38bdf8"/>
            </svg>
          </div>
          <!-- Cúpula de Escudo Lunar Cian -->
          <div class="w-40 h-13 rounded-t-full border-t-2 border-x-2 border-sky-400 bg-gradient-to-t from-sky-950/95 to-sky-500/30 shadow-[0_-8px_30px_rgba(56,189,248,0.6)] flex items-end justify-center pb-1">
            <svg class="w-6 h-6 text-sky-200 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v4m0 0a8 8 0 018 8v6H4v-6a8 8 0 018-8z"/>
            </svg>
          </div>
          <div class="text-[0.55rem] font-mono font-black text-sky-300 tracking-wider uppercase px-2.5 py-0.5 rounded-t bg-zinc-950 border-t border-x border-sky-500/60 shadow">
            ` + (isEn ? 'ORBITAL C-RAM // LUNAR DOME SHIELD' : 'C-RAM ORBITAL // ESCUDO DOMO LUNAR') + `
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
      el.className = 'meteorite-target meteorite-target-box absolute flex items-center justify-center cursor-crosshair select-none';
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
          <!-- Brackets tácticos de fijación de blanco -->
          <span class="target-lock-bracket bracket-tl"></span>
          <span class="target-lock-bracket bracket-tr"></span>
          <span class="target-lock-bracket bracket-bl"></span>
          <span class="target-lock-bracket bracket-br"></span>
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded bg-zinc-950/90 border border-sky-400 text-[0.48rem] font-mono font-black text-sky-300 tracking-tighter whitespace-nowrap">
            LOCK
          </div>
          <!-- Cola de fuego / reentrada -->
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 w-4 h-8 bg-gradient-to-t from-orange-500 via-amber-400 to-transparent rounded-full opacity-80"></div>
          <!-- Meteorito Roca SVG -->
          <svg viewBox="0 0 40 40" class="w-10 h-10 pointer-events-none">
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

        // Trazar rayo láser SVG C-RAM desde la torreta inferior hacia el meteorito
        if (laserLayer) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', domeX);
          line.setAttribute('y1', domeY);
          line.setAttribute('x2', meteorObj.x);
          line.setAttribute('y2', meteorObj.y);
          line.setAttribute('stroke', '#38bdf8');
          line.setAttribute('stroke-width', '4');
          line.setAttribute('class', 'cram-laser-line');
          laserLayer.appendChild(line);
          setTimeout(() => line.remove(), 90);
        }

        // Anillo de explosión vectorial C-RAM
        const blastRing = document.createElement('div');
        blastRing.className = 'cram-blast-ring';
        blastRing.style.left = meteorObj.x + 'px';
        blastRing.style.top = meteorObj.y + 'px';
        arena.appendChild(blastRing);
        setTimeout(() => blastRing.remove(), 250);

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
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const totalFlames = 4;
    let isDone = false;
    let extinguishedCount = 0;
    let animFrameId = null;
    let lastHissSound = 0;

    // Generar 4 coordenadas aleatorias con distancia mínima de 85px
    const minDistancePx = 85;
    const flamePositions = [];
    let attempts = 0;
    while (flamePositions.length < totalFlames && attempts < 300) {
      attempts++;
      const candX = 14 + Math.random() * 72; // 14% a 86%
      const candY = 22 + Math.random() * 56; // 22% a 78%
      const candPxX = (candX / 100) * 560;
      const candPxY = (candY / 100) * 260;

      let tooClose = false;
      for (const p of flamePositions) {
        const pPxX = (p.x / 100) * 560;
        const pPxY = (p.y / 100) * 260;
        const d = Math.hypot(candPxX - pPxX, candPxY - pPxY);
        if (d < minDistancePx) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        flamePositions.push({ x: candX, y: candY });
      }
    }
    // Fallback de seguridad
    while (flamePositions.length < totalFlames) {
      const i = flamePositions.length;
      flamePositions.push({ x: 20 + i * 20, y: 35 + (i % 2) * 28 });
    }

    container.innerHTML = `
      <div id="biodome-fire-arena" class="relative w-full h-[280px] md:h-[320px] thermal-reactor-grid rounded-xl overflow-hidden border border-emerald-700/60 select-none cursor-crosshair">
        <!-- Alerta de humo perimetral del reactor -->
        <div class="thermal-smoke-vignette absolute inset-0 z-10 pointer-events-none"></div>

        <!-- Manómetro de Temperatura en Vivo Superior -->
        <div class="absolute top-2.5 inset-x-3 z-40 flex items-center justify-between pointer-events-none">
          <div class="flex items-center gap-2 bg-zinc-900/90 border border-emerald-500/40 px-2.5 py-1 rounded-md text-[0.68rem] font-mono font-bold text-emerald-300 shadow">
            <span class="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span id="fire-count-label">${isEn ? 'ACTIVE FIRES: 4 / 4' : 'FOCOS ACTIVOS: 4 / 4'}</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-[0.6rem] font-mono text-zinc-400 uppercase tracking-widest hidden sm:inline-block">${isEn ? 'REACTOR TEMP:' : 'TEMP REACTOR:'}</span>
            <div id="thermal-temp-gauge" class="text-[0.68rem] font-mono font-black px-2.5 py-1 rounded border text-rose-400 bg-rose-950/80 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.6)]">
              TEMP: 980°C // ${isEn ? 'CRITICAL OVERHEAT' : 'SOBRECALENTAMIENTO CRÍTICO'}
            </div>
          </div>
        </div>

        <!-- Estructura de domo y tuberías refrigerantes al rojo vivo -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-30 z-0" viewBox="0 0 400 300" preserveAspectRatio="none">
          <line x1="200" y1="0" x2="200" y2="300" stroke="#f97316" stroke-width="2"/>
          <path d="M0 80 Q200 20 400 80 M0 180 Q200 120 400 180" stroke="#ef4444" stroke-width="1.5" fill="none"/>
          <line x1="80" y1="0" x2="60" y2="300" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="4,4"/>
          <line x1="320" y1="0" x2="340" y2="300" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="4,4"/>
        </svg>

        <!-- Bandejas hidropónicas en la base -->
        <div class="absolute bottom-0 inset-x-0 h-24 bg-emerald-950/80 border-t border-emerald-600/40 flex justify-around items-end px-4 pb-2 pointer-events-none z-10">
          <div class="w-20 h-14 bg-zinc-900 border border-emerald-500/40 rounded-t-lg flex items-center justify-center">
            <svg class="w-10 h-10 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21V9m0 0C10 5 4 4 4 4s1 6 5 8c3 1.5 3-3 3-3zm0 0c2-4 8-5 8-5s-1 6-5 8c-3 1.5-3-3-3-3z"/>
            </svg>
          </div>
          <div class="w-24 h-16 bg-zinc-900 border border-emerald-500/40 rounded-t-lg flex items-center justify-center">
            <svg class="w-12 h-12 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21V9m0 0C10 5 4 4 4 4s1 6 5 8c3 1.5 3-3 3-3zm0 0c2-4 8-5 8-5s-1 6-5 8c-3 1.5-3-3-3-3z"/>
            </svg>
          </div>
          <div class="w-20 h-14 bg-zinc-900 border border-emerald-500/40 rounded-t-lg flex items-center justify-center">
            <svg class="w-10 h-10 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21V9m0 0C10 5 4 4 4 4s1 6 5 8c3 1.5 3-3 3-3zm0 0c2-4 8-5 8-5s-1 6-5 8c-3 1.5-3-3-3-3z"/>
            </svg>
          </div>
        </div>

        <!-- Contenedor de Focos de Fuego y Plasma -->
        <div id="fire-foci-container" class="absolute inset-0 pointer-events-auto z-25"></div>

        <!-- Capa de Partículas de Escarcha y Vapor Criogénico -->
        <div id="spray-particles-layer" class="absolute inset-0 pointer-events-none overflow-hidden z-30"></div>

        <!-- Boquilla del Difusor Criogénico de Nitrógeno Líquido -->
        <div id="co2-nozzle-cursor" class="absolute w-12 h-12 pointer-events-none z-40 -translate-x-1/2 -translate-y-1/2 hidden transition-transform duration-75">
          <svg class="w-full h-full" viewBox="0 0 48 48" fill="none">
            <rect x="20" y="24" width="8" height="20" rx="2" fill="#475569" stroke="#94a3b8" stroke-width="1.5"/>
            <path d="M16 24 L32 24 L27 8 L21 8 Z" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
            <circle cx="24" cy="8" r="4" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1"/>
            <circle cx="24" cy="6" r="3" fill="#ffffff"/>
          </svg>
        </div>

        <!-- Indicador inferior de ayuda -->
        <div class="absolute bottom-2.5 right-3 z-40 bg-zinc-900/90 border border-emerald-500/30 px-2.5 py-0.5 rounded text-[0.62rem] font-mono text-zinc-400 pointer-events-none">
          ${isEn ? 'CONTINUOUS CRYO-SPRAY: HOLD OVER EACH FIRE NODE TO FREEZE (-196°C)' : 'ROCIADO CONTINUO: MANTÉN SOBRE EL FUEGO PARA CONGELAR (-196°C)'}
        </div>
      </div>
    `;

    const arena = container.querySelector('#biodome-fire-arena');
    const fireContainer = container.querySelector('#fire-foci-container');
    const particleLayer = container.querySelector('#spray-particles-layer');
    const nozzleCursor = container.querySelector('#co2-nozzle-cursor');
    const countLabel = container.querySelector('#fire-count-label');
    const tempGauge = container.querySelector('#thermal-temp-gauge');

    const flameList = flamePositions.map((pos, idx) => {
      const nodeEl = document.createElement('div');
      nodeEl.className = 'fire-node absolute -translate-x-1/2 -translate-y-1/2 cursor-crosshair select-none flex flex-col items-center';
      nodeEl.dataset.id = String(idx);
      nodeEl.style.left = `${pos.x}%`;
      nodeEl.style.top = `${pos.y}%`;

      nodeEl.innerHTML = `
        <div class="flame-interactive-wrapper relative flex flex-col items-center">
          <!-- Anillo Circular de Temperatura / Calor SVG (Circunferencia = 163.4) -->
          <svg class="w-16 h-16 md:w-20 md:h-20 pointer-events-none" viewBox="0 0 64 64">
            <!-- Anillo base oscuro -->
            <circle cx="32" cy="32" r="26" fill="rgba(15, 23, 42, 0.7)" stroke="#334155" stroke-width="3"/>
            <!-- Anillo medidor de calor activo -->
            <circle id="heat-ring-${idx}" class="heat-ring-meter" cx="32" cy="32" r="26" fill="none" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="163.4" stroke-dashoffset="0"/>
          </svg>

          <!-- Llama de Plasma Multicapa Animada en el Centro -->
          <div id="flame-body-${idx}" class="flame-body-wrap absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
            <svg class="w-9 h-11 md:w-11 md:h-13 plasma-flame-core" viewBox="0 0 40 50">
              <defs>
                <linearGradient id="fireGradOuter${idx}" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stop-color="#b91c1c"/>
                  <stop offset="50%" stop-color="#ef4444"/>
                  <stop offset="100%" stop-color="#f97316"/>
                </linearGradient>
                <linearGradient id="fireGradMid${idx}" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stop-color="#ea580c"/>
                  <stop offset="60%" stop-color="#f59e0b"/>
                  <stop offset="100%" stop-color="#fef08a"/>
                </linearGradient>
                <linearGradient id="fireGradCore${idx}" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stop-color="#fef08a"/>
                  <stop offset="100%" stop-color="#ffffff"/>
                </linearGradient>
              </defs>
              <!-- Corona exterior roja/naranja -->
              <path d="M20 2 C23 13 37 19 37 32 C37 42 28 48 20 48 C12 48 3 42 3 32 C3 19 17 13 20 2 Z" fill="url(#fireGradOuter${idx})"/>
              <!-- Corona intermedia amarilla/naranja -->
              <path d="M20 12 C22 20 31 25 31 34 C31 41 25 45 20 45 C15 45 9 41 9 34 C9 25 18 20 20 12 Z" fill="url(#fireGradMid${idx})"/>
              <!-- Núcleo incandescente caliente blanco -->
              <path d="M20 23 C21 28 26 31 26 37 C26 41 23 43 20 43 C17 43 14 41 14 37 C14 31 19 28 20 23 Z" fill="url(#fireGradCore${idx})"/>
            </svg>
          </div>

          <!-- Píldora de porcentaje de calor en tiempo real -->
          <span id="heat-tag-${idx}" class="absolute -bottom-2 text-[0.52rem] font-mono font-black text-rose-300 bg-rose-950/90 border border-rose-500/60 px-1.5 py-0.2 rounded-full whitespace-nowrap shadow uppercase">
            100% ${isEn ? 'HEAT' : 'CALOR'}
          </span>

          <!-- Estado Congelado Permanente (Oculto inicialmente) -->
          <div id="frozen-card-${idx}" class="cryo-locked-core hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl flex flex-col items-center gap-0.5 whitespace-nowrap pointer-events-none select-none z-30">
            <svg class="w-6 h-6 text-white animate-spin" style="animation-duration: 9s;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18m9-9H3m15.364-6.364l-12.728 12.728m0-12.728l12.728 12.728"/>
            </svg>
            <span class="text-[0.52rem] font-black font-mono text-white tracking-widest uppercase">
              ${isEn ? 'CRYO-LOCKED // -196°C' : 'CRYO-BLOQUEADO // -196°C'}
            </span>
          </div>
        </div>
      `;

      fireContainer.appendChild(nodeEl);

      return {
        id: idx,
        x: pos.x,
        y: pos.y,
        heat: 100.0,
        isFrozen: false,
        isSpraying: false,
        nodeEl,
        ringEl: nodeEl.querySelector(`#heat-ring-${idx}`),
        flameWrapEl: nodeEl.querySelector(`#flame-body-${idx}`),
        tagEl: nodeEl.querySelector(`#heat-tag-${idx}`),
        frozenEl: nodeEl.querySelector(`#frozen-card-${idx}`)
      };
    });

    let pointerX = -9999;
    let pointerY = -9999;
    let pointerActive = false;

    function updatePointerPos(e) {
      if (isDone) return;
      const arenaRect = arena.getBoundingClientRect();
      const scale = window.GAME_SCALE || 1;
      pointerX = (e.clientX - arenaRect.left) / scale;
      pointerY = (e.clientY - arenaRect.top) / scale;
      pointerActive = true;

      if (nozzleCursor) {
        nozzleCursor.style.left = `${pointerX}px`;
        nozzleCursor.style.top = `${pointerY}px`;
        nozzleCursor.classList.remove('hidden');
      }
    }

    function onPointerMove(e) {
      updatePointerPos(e);
    }

    function onPointerDown(e) {
      updatePointerPos(e);
    }

    function onPointerLeave() {
      pointerActive = false;
      if (nozzleCursor) nozzleCursor.classList.add('hidden');
      flameList.forEach(f => { f.isSpraying = false; });
    }

    arena.addEventListener('pointermove', onPointerMove);
    arena.addEventListener('pointerdown', onPointerDown);
    arena.addEventListener('pointerleave', onPointerLeave);

    // Bucle Principal de Rociado Continuo, Regeneración y Temperatura en Vivo
    let lastTime = performance.now();
    const cachedArenaW = arena.clientWidth || 560;
    const cachedArenaH = arena.clientHeight || 280;
    function fireLoop(now) {
      if (isDone) return;
      const dt = Math.min(0.06, (now - lastTime) / 1000);
      lastTime = now;

      const arenaW = cachedArenaW;
      const arenaH = cachedArenaH;

      let isAnyNodeSprayed = false;

      flameList.forEach(flame => {
        if (flame.isFrozen) return;

        // Coordenadas absolutas de este foco
        const fx = (flame.x / 100) * arenaW;
        const fy = (flame.y / 100) * arenaH;
        const dist = Math.hypot(pointerX - fx, pointerY - fy);

        // Si el puntero está dentro del radio de acción (48px)
        if (pointerActive && dist < 48) {
          flame.isSpraying = true;
          isAnyNodeSprayed = true;

          // Reducción continua de calor: ~0.7 segundos para pasar de 100% a 0%
          flame.heat = Math.max(0, flame.heat - (100 / 0.7) * dt);

          // Generar partículas de vapor helado criogénico
          if (particleLayer && Math.random() < 0.8) {
            const part = document.createElement('div');
            part.className = 'cryo-jet-particle w-3.5 h-3.5';
            part.style.left = `${pointerX + (Math.random() * 14 - 7)}px`;
            part.style.top = `${pointerY + (Math.random() * 14 - 7)}px`;
            part.style.setProperty('--dx', `${(Math.random() * 30 - 15)}px`);
            part.style.setProperty('--dy', `${(Math.random() * -30 - 10)}px`);
            particleLayer.appendChild(part);
            setTimeout(() => part.remove(), 320);
          }

          // Al llegar a 0% -> Congelamiento instantáneo permanente
          if (flame.heat <= 0) {
            flame.isFrozen = true;
            flame.heat = 0;
            extinguishedCount++;

            sfx.playFireExtinguished();

            if (flame.flameWrapEl) flame.flameWrapEl.classList.add('hidden');
            if (flame.ringEl) flame.ringEl.parentElement.classList.add('hidden');
            if (flame.tagEl) flame.tagEl.classList.add('hidden');
            if (flame.frozenEl) flame.frozenEl.classList.remove('hidden');

            // Chispazo de escarcha
            const burst = document.createElement('div');
            burst.className = 'pneumatic-spark-burst';
            flame.nodeEl.appendChild(burst);
            setTimeout(() => burst.remove(), 300);
          }
        } else {
          flame.isSpraying = false;
          // Si el jugador aparta el chorro antes del 0%, el fuego regenera calor (+15% / seg)
          if (flame.heat < 100) {
            flame.heat = Math.min(100, flame.heat + 15 * dt);
          }
        }

        // Actualizar visual del foco
        if (!flame.isFrozen) {
          const offset = 163.4 * (1 - flame.heat / 100);
          if (flame.ringEl) {
            flame.ringEl.style.strokeDashoffset = offset;
            flame.ringEl.style.stroke = flame.heat > 55 ? '#ef4444' : (flame.heat > 25 ? '#f59e0b' : '#38bdf8');
          }
          if (flame.tagEl) {
            flame.tagEl.textContent = `${Math.round(flame.heat)}% ${isEn ? 'HEAT' : 'CALOR'}`;
          }
          if (flame.flameWrapEl) {
            const scale = 0.35 + 0.65 * (flame.heat / 100);
            flame.flameWrapEl.style.transform = `translate(-50%, -50%) scale(${scale})`;
          }
        }
      });

      // Sonido de siseo continuo al rociar
      if (isAnyNodeSprayed && now - lastHissSound > 120) {
        sfx.playExtinguisherHiss();
        lastHissSound = now;
      }

      // Temperatura Global en Vivo: 980°C -> 24°C según promedio de calor
      const totalHeat = flameList.reduce((acc, f) => acc + f.heat, 0);
      const avgHeat = totalHeat / totalFlames;
      const globalTemp = Math.round(24 + (avgHeat / 100) * (980 - 24));

      if (tempGauge) {
        let tempStyle = 'text-rose-400 bg-rose-950/80 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
        let tempLabel = isEn ? 'CRITICAL OVERHEAT' : 'SOBRECALENTAMIENTO CRÍTICO';

        if (globalTemp <= 25) {
          tempStyle = 'text-emerald-300 bg-emerald-950/80 border-emerald-500/50 shadow-[0_0_10px_rgba(52,211,153,0.7)]';
          tempLabel = isEn ? 'NOMINAL CRYO-STATE' : 'ESTADO CRIOGÉNICO NOMINAL';
        } else if (globalTemp <= 180) {
          tempStyle = 'text-sky-300 bg-sky-950/80 border-sky-500/50';
          tempLabel = isEn ? 'DAMPENING' : 'DISIPACIÓN ACTIVA';
        } else if (globalTemp <= 450) {
          tempStyle = 'text-amber-300 bg-amber-950/80 border-amber-500/50';
          tempLabel = isEn ? 'COOLING IN PROGRESS' : 'ENFRIAMIENTO EN CURSO';
        } else if (globalTemp <= 720) {
          tempStyle = 'text-amber-400 bg-amber-950/80 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
          tempLabel = isEn ? 'HIGH THERMAL LOAD' : 'CARGA TÉRMICA ALTA';
        }

        tempGauge.textContent = `TEMP: ${globalTemp}°C // ${tempLabel}`;
        tempGauge.className = `text-[0.68rem] font-mono font-black px-2.5 py-1 rounded border ${tempStyle}`;
      }

      if (countLabel) {
        countLabel.textContent = isEn
          ? `ACTIVE FIRES: ${totalFlames - extinguishedCount} / ${totalFlames}`
          : `FOCOS ACTIVOS: ${totalFlames - extinguishedCount} / ${totalFlames}`;
      }

      // Condición de Victoria: los 4 focos congelados al 100%
      if (extinguishedCount === totalFlames) {
        isDone = true;
        cancelAnimationFrame(animFrameId);
        setTimeout(() => {
          onComplete(true);
        }, 380);
        return;
      }

      animFrameId = requestAnimationFrame(fireLoop);
    }

    animFrameId = requestAnimationFrame(fireLoop);

    return () => {
      isDone = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      arena.removeEventListener('pointermove', onPointerMove);
      arena.removeEventListener('pointerdown', onPointerDown);
      arena.removeEventListener('pointerleave', onPointerLeave);
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
        subtitle: 'Coloca el parche de titanio y atornilla los 4 pernos con torque en cada fuga (4 grietas).',
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
        subtitle: 'Rocía continuamente nitrógeno líquido (-196°C) sobre los 4 focos térmicos hasta congelarlos.',
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
        subtitle: 'Stamp the titanium patch and torque the 4 bolts on each rupture (4 leaks).',
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
        subtitle: 'Continuously spray liquid nitrogen (-196°C) over the 4 thermal cores until fully frozen.',
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
      subtitle: 'Coloca el parche de titanio y atornilla los 4 pernos con torque en cada fuga (4 grietas).',
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
      subtitle: 'Rocía continuamente nitrógeno líquido (-196°C) sobre los 4 focos térmicos hasta congelarlos.',
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
    if (typeof cleanupAllModalLoops === 'function') cleanupAllModalLoops();
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
      emergencyArena.className = 'w-full min-h-[260px] md:min-h-[280px] rounded-xl relative flex items-center justify-center overflow-hidden select-none p-0';
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
    if (typeof cleanupAllModalLoops === 'function') {
      cleanupAllModalLoops();
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
    if (caseDecided && !state.gameOver && !state.isTransitioning) {
      setTimeout(() => {
        if (caseDecided && !isEmergencyActive && !state.gameOver && !state.isTransitioning) {
          handleNextShiftClick();
        }
      }, 400);
    }
  }

  function triggerRandomEmergencyMinigame(forcedMinigameId = null) {
    return triggerEmergency(forcedMinigameId);
  }
  window.triggerEmergency = triggerEmergency;
  window.triggerRandomEmergencyMinigame = triggerRandomEmergencyMinigame;

  // =======================================================================
  // 20. SISTEMA DE INTERVENCIÓN EVA EN PRIMERA PERSONA (CASCO ARTEMIS)
  // =======================================================================

  // Gestor centralizado anti-fugas de memoria para todos los bucles de modales y minijuegos
  window.activeMinigameLoops = {
    rafs: [],
    intervals: [],
    timeouts: [],
    cleanups: []
  };

  function cleanupAllModalLoops() {
    const loops = window.activeMinigameLoops;
    if (loops) {
      while (loops.rafs.length > 0) {
        try { cancelAnimationFrame(loops.rafs.pop()); } catch (_) {}
      }
      while (loops.intervals.length > 0) {
        try { clearInterval(loops.intervals.pop()); } catch (_) {}
      }
      while (loops.timeouts.length > 0) {
        try { clearTimeout(loops.timeouts.pop()); } catch (_) {}
      }
      while (loops.cleanups.length > 0) {
        const fn = loops.cleanups.pop();
        if (typeof fn === 'function') {
          try { fn(); } catch (_) {}
        }
      }
    }

    if (evaState) {
      if (evaState.timerInterval) { clearInterval(evaState.timerInterval); evaState.timerInterval = null; }
      if (evaState.heartbeatTimer) { clearTimeout(evaState.heartbeatTimer); evaState.heartbeatTimer = null; }
      if (evaState.breathingTimer) { clearTimeout(evaState.breathingTimer); evaState.breathingTimer = null; }
      if (evaState.ecgAnimFrame) { cancelAnimationFrame(evaState.ecgAnimFrame); evaState.ecgAnimFrame = null; }
      if (evaState.o2LoopFrame) { cancelAnimationFrame(evaState.o2LoopFrame); evaState.o2LoopFrame = null; }
      if (evaState.radLoopFrame) { cancelAnimationFrame(evaState.radLoopFrame); evaState.radLoopFrame = null; }
      if (evaState.pwrLoopFrame) { cancelAnimationFrame(evaState.pwrLoopFrame); evaState.pwrLoopFrame = null; }
      if (evaState.foodLoopFrame) { cancelAnimationFrame(evaState.foodLoopFrame); evaState.foodLoopFrame = null; }
      if (evaState.geigerInterval) { clearInterval(evaState.geigerInterval); evaState.geigerInterval = null; }
      if (evaState.heatInterval) { clearInterval(evaState.heatInterval); evaState.heatInterval = null; }
      if (evaState.sprayInterval) { clearInterval(evaState.sprayInterval); evaState.sprayInterval = null; }
      if (typeof evaState.activeCleanup === 'function') {
        try { evaState.activeCleanup(); } catch (_) {}
        evaState.activeCleanup = null;
      }
    }

    if (!cctv.open && cctv.clockTimer) {
      clearInterval(cctv.clockTimer);
      cctv.clockTimer = null;
    }

    if (!isEmergencyActive) {
      if (emergencyAnimFrame) {
        cancelAnimationFrame(emergencyAnimFrame);
        emergencyAnimFrame = null;
      }
      if (typeof currentMinigameCleanup === 'function') {
        try { currentMinigameCleanup(); } catch (_) {}
        currentMinigameCleanup = null;
      }
    }

    stopEvaPlasmaTorch();
    stopEvaReactorHum();
  }
  window.cleanupAllModalLoops = cleanupAllModalLoops;

  const evaState = {
    active: false,
    roomKey: null,
    isPractice: false,
    timeLeft: 15.0,
    maxTime: 15.0,
    bpm: 95,
    timerInterval: null,
    ecgAnimFrame: null,
    ecgOffset: 0,
    heartbeatTimer: null,
    breathingTimer: null,
    // Minijuego 1 (Oxígeno)
    o2Phase: 'A',
    o2Ejected: [false, false],
    o2Inserted: [false, false],
    o2Pressure: 15.0,
    o2Igniting: false,
    o2Stabilization: 0,
    o2LoopFrame: null,
    // Minijuego 2 (Escudo)
    radCracks: [],
    radWelding: false,
    radOverheated: false,
    radStillTime: 0,
    radLastPos: { x: 0, y: 0 },
    radTotalCracks: 3,
    radCracksSealed: 0,
    radLoopFrame: null,
    geigerInterval: null,
    heatInterval: null,
    // Minijuego 3 (Energía Kilopower)
    pwrRods: [
      { id: 'alfa', y: 15, speed: 20 },
      { id: 'beta', y: 72, speed: 25 },
      { id: 'gamma', y: 40, speed: 28 }
    ],
    pwrCharge: 0,
    pwrLoopFrame: null,
    // Minijuego 4 (Comida / Biomasa APH)
    foodTarget: { n: 3, p: 2, k: 3 },
    foodCurrent: { n: 0, p: 0, k: 0 },
    foodPhotonicPct: 0,
    foodPhase: 'NPK',
    foodLoopFrame: null,
    sprayInterval: null,
    activeCleanup: null
  };

  // Sonidos Sintetizados en Web Audio API para la Intervención EVA
  function playEvaHeartbeat(bpm) {
    const ctx = sfx?.init ? sfx.init() : null;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Primer latido ("lub")
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65, now);
      osc1.frequency.exponentialRampToValueAtTime(45, now + 0.08);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      sfx.bindAutoDisconnect(osc1, gain1);
      osc1.start(now);
      osc1.stop(now + 0.09);

      // Segundo latido ("dub") 110ms después
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(55, now + 0.11);
      osc2.frequency.exponentialRampToValueAtTime(38, now + 0.18);
      gain2.gain.setValueAtTime(0.09, now + 0.11);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      sfx.bindAutoDisconnect(osc2, gain2);
      osc2.start(now + 0.11);
      osc2.stop(now + 0.19);
    } catch (_) {}
  }

  function playEvaBreathing() {
    const ctx = sfx?.init ? sfx.init() : null;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const buffer = sfx.createNoiseBuffer(0.9);
      if (!buffer) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, now);
      filter.Q.setValueAtTime(2.5, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.005, now);
      gain.gain.linearRampToValueAtTime(0.035, now + 0.4);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.85);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      sfx.bindAutoDisconnect(src, filter, gain);
      src.start(now);
      src.stop(now + 0.9);
    } catch (_) {}
  }

  function playEvaPurgeGas() {
    const ctx = sfx?.init ? sfx.init() : null;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const buffer = sfx.createNoiseBuffer(0.45);
      if (!buffer) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + 0.4);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      sfx.bindAutoDisconnect(src, filter, gain);
      src.start(now);
      src.stop(now + 0.45);
    } catch (_) {}
  }

  function playEvaCartridgeInsert() {
    const ctx = sfx?.init ? sfx.init() : null;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(640, now + 0.05);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      sfx.bindAutoDisconnect(osc, gain);
      osc.start(now);
      osc.stop(now + 0.24);
    } catch (_) {}
  }

  let evaPlasmaOsc = null;
  let evaPlasmaGain = null;
  let evaPlasmaSrc = null;

  function startEvaPlasmaTorch() {
    if (evaPlasmaOsc) return;
    const ctx = sfx?.init ? sfx.init() : null;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      evaPlasmaOsc = ctx.createOscillator();
      evaPlasmaOsc.type = 'sawtooth';
      evaPlasmaOsc.frequency.setValueAtTime(140, now);

      const buffer = sfx.createNoiseBuffer(1.0);
      evaPlasmaSrc = ctx.createBufferSource();
      evaPlasmaSrc.buffer = buffer;
      evaPlasmaSrc.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.Q.setValueAtTime(3.0, now);

      evaPlasmaGain = ctx.createGain();
      evaPlasmaGain.gain.setValueAtTime(0.07, now);

      evaPlasmaOsc.connect(evaPlasmaGain);
      evaPlasmaSrc.connect(filter);
      filter.connect(evaPlasmaGain);
      evaPlasmaGain.connect(ctx.destination);

      evaPlasmaOsc.start(now);
      evaPlasmaSrc.start(now);
    } catch (_) {}
  }

  function stopEvaPlasmaTorch() {
    if (evaPlasmaOsc) {
      try {
        evaPlasmaOsc.stop();
        evaPlasmaOsc.disconnect();
      } catch (_) {}
      evaPlasmaOsc = null;
    }
    if (evaPlasmaSrc) {
      try {
        evaPlasmaSrc.stop();
        evaPlasmaSrc.disconnect();
      } catch (_) {}
      evaPlasmaSrc = null;
    }
    if (evaPlasmaGain) {
      try { evaPlasmaGain.disconnect(); } catch (_) {}
      evaPlasmaGain = null;
    }
  }

  function playEvaOverheatAlert() {
    const ctx = sfx?.init ? sfx.init() : null;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.setValueAtTime(1250, now + 0.12);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      sfx.bindAutoDisconnect(osc, gain);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (_) {}
  }

  // Sonidos Web Audio API para Minijuegos 3 (Energía) y 4 (Comida)
  function playEvaMagneticBoost() {
    const ctx = sfx?.init ? sfx.init() : null;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.14);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      sfx.bindAutoDisconnect(osc, gain);
      osc.start(now);
      osc.stop(now + 0.17);
    } catch (_) {}
  }

  let evaReactorHumOsc = null;
  let evaReactorHumGain = null;

  function startEvaReactorHum() {
    if (evaReactorHumOsc) return;
    const ctx = sfx?.init ? sfx.init() : null;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      evaReactorHumOsc = ctx.createOscillator();
      evaReactorHumOsc.type = 'triangle';
      evaReactorHumOsc.frequency.setValueAtTime(130.81, now); // C3
      evaReactorHumGain = ctx.createGain();
      evaReactorHumGain.gain.setValueAtTime(0.045, now);
      evaReactorHumOsc.connect(evaReactorHumGain);
      evaReactorHumGain.connect(ctx.destination);
      evaReactorHumOsc.start(now);
    } catch (_) {}
  }

  function stopEvaReactorHum() {
    if (evaReactorHumOsc) {
      try {
        evaReactorHumOsc.stop();
        evaReactorHumOsc.disconnect();
      } catch (_) {}
      evaReactorHumOsc = null;
    }
    if (evaReactorHumGain) {
      try { evaReactorHumGain.disconnect(); } catch (_) {}
      evaReactorHumGain = null;
    }
  }

  function playEvaNutrientPiston() {
    const ctx = sfx?.init ? sfx.init() : null;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      sfx.bindAutoDisconnect(osc, gain);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch (_) {}
  }

  function playEvaPurgeVent() {
    const ctx = sfx?.init ? sfx.init() : null;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const buf = sfx.createNoiseBuffer(0.25);
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1500, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      sfx.bindAutoDisconnect(src, filter, gain);
      src.start(now);
      src.stop(now + 0.25);
    } catch (_) {}
  }

  function playEvaNutrientBalanced() {
    const ctx = sfx?.init ? sfx.init() : null;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.08, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        sfx.bindAutoDisconnect(osc, gain);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.2);
      });
    } catch (_) {}
  }

  function playEvaPhotonicGlow(pct) {
    const ctx = sfx?.init ? sfx.init() : null;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const baseFreq = 320 + (pct / 100) * 480;
      osc.frequency.setValueAtTime(baseFreq, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      sfx.bindAutoDisconnect(osc, gain);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (_) {}
  }

  // Refresco de botones de despliegue táctico EVA dentro del modal CCTV
  function refreshCctvEvaControls() {
    const bar = document.getElementById('cctv-eva-action-bar');
    const deployBtn = document.getElementById('cctv-eva-deploy-btn');
    const practiceBtn = document.getElementById('cctv-eva-practice-btn');
    const statusIndicator = document.getElementById('cctv-eva-status-indicator');
    const statusText = document.getElementById('cctv-eva-status-text');
    const statusSub = document.getElementById('cctv-eva-status-sub');
    if (!bar || !deployBtn || !practiceBtn) return;

    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const currentKey = cctv.room;
    const currentVal = Math.max(0, Math.min(100, state.resources[currentKey] !== undefined ? state.resources[currentKey] : 50));
    const isCritical = currentVal <= 30;
    const canDeployReal = isCritical && !window.evaUsedThisSol;

    deployBtn.textContent = isEn
      ? '[ DEPLOY EVA ASTRONAUT // 1ST-PERSON REPAIR (+20%) ]'
      : '[ DESPLEGAR ASTRONAUTA EVA // REPARACIÓN EN 1RA PERSONA (+20%) ]';

    practiceBtn.textContent = isEn
      ? '[ SIMULATE EVA TRAINING (PRACTICE) ]'
      : '[ SIMULAR ENTRENAMIENTO EVA (PRÁCTICA) ]';

    if (canDeployReal) {
      deployBtn.classList.remove('hidden');
      deployBtn.classList.add('animate-pulse');
      if (statusIndicator) statusIndicator.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e] shrink-0 animate-ping';
      if (statusText) {
        statusText.textContent = isEn
          ? `CRITICAL STATE (${currentVal}%) // EVA EMERGENCY DEPLOYMENT READY`
          : `ESTADO CRÍTICO (${currentVal}%) // DESPLIEGUE EVA DE EMERGENCIA LISTO`;
        statusText.className = 'text-[0.68rem] font-black uppercase tracking-wider text-rose-300 font-mono';
      }
      if (statusSub) {
        statusSub.textContent = isEn
          ? '1 REAL MISSION AVAILABLE THIS SOL (+20% SUCCESS / -5% FAIL)'
          : '1 MISIÓN REAL DISPONIBLE ESTE SOL (+20% ÉXITO / -5% FALLO)';
      }
    } else {
      deployBtn.classList.add('hidden');
      deployBtn.classList.remove('animate-pulse');
      if (window.evaUsedThisSol) {
        if (statusIndicator) statusIndicator.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b] shrink-0';
        if (statusText) {
          statusText.textContent = isEn
            ? 'EVA EMERGENCY USED THIS SOL // PRACTICE MODE ENABLED'
            : 'EVA DE EMERGENCIA USADO ESTE SOL // MODO PRÁCTICA HABILITADO';
          statusText.className = 'text-[0.68rem] font-black uppercase tracking-wider text-amber-300 font-mono';
        }
        if (statusSub) {
          statusSub.textContent = isEn
            ? 'PRACTICE PROTOCOLS FREELY — DOES NOT ALTER RESOURCES'
            : 'ENTRENA PROTOCOLOS LIBREMENTE — NO ALTERA RECURSOS';
        }
      } else {
        if (statusIndicator) statusIndicator.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] shrink-0';
        if (statusText) {
          statusText.textContent = isEn
            ? `SYSTEM OPERATIONAL (${currentVal}%) // EVA TRAINING AVAILABLE`
            : `SISTEMA OPERATIVO (${currentVal}%) // ENTRENAMIENTO EVA DISPONIBLE`;
          statusText.className = 'text-[0.68rem] font-black uppercase tracking-wider text-zinc-300 font-mono';
        }
        if (statusSub) {
          statusSub.textContent = isEn
            ? 'TEST INTERVENTION SIMULATION WITHOUT RISK'
            : 'PRUEBA LA SIMULACIÓN DE INTERVENCIÓN SIN RIESGO';
        }
      }
    }
  }

  // Animación del ECG en vivo en Canvas
  function startEvaEcg() {
    const canvas = document.getElementById('eva-ecg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    const ecgPattern = [
      { dx: 0.05, dy: 0 },
      { dx: 0.10, dy: -3 }, // P wave
      { dx: 0.08, dy: 0 },
      { dx: 0.04, dy: 2 },  // Q wave
      { dx: 0.06, dy: -14 }, // R wave
      { dx: 0.05, dy: 8 },  // S wave
      { dx: 0.12, dy: 0 },
      { dx: 0.15, dy: -5 }, // T wave
      { dx: 0.35, dy: 0 }   // Isoelectric line
    ];

    function draw() {
      if (!evaState.active) return;
      ctx.fillStyle = 'rgba(0, 5, 10, 0.25)';
      ctx.fillRect(0, 0, width, height);

      // Líneas de cuadrícula tenue
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < width; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Velocidad del trazo acorde al ritmo cardíaco (BPM)
      const bpmFactor = evaState.bpm / 95;
      evaState.ecgOffset = (evaState.ecgOffset + 1.8 * bpmFactor) % width;

      // Color del trazo: verde -> ámbar -> rojo según BPM
      let strokeColor = '#34d399';
      if (evaState.bpm > 145) strokeColor = '#f43f5e';
      else if (evaState.bpm > 120) strokeColor = '#f59e0b';

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = 6;
      ctx.beginPath();

      let cycleLength = 70 / bpmFactor;
      for (let x = 0; x < width; x += 2) {
        const cyclePos = (x + evaState.ecgOffset) % cycleLength;
        const norm = cyclePos / cycleLength;
        let yOffset = 0;

        let accum = 0;
        for (let i = 0; i < ecgPattern.length; i++) {
          const seg = ecgPattern[i];
          if (norm >= accum && norm < accum + seg.dx) {
            const segProgress = (norm - accum) / seg.dx;
            yOffset = Math.sin(segProgress * Math.PI) * seg.dy;
            break;
          }
          accum += seg.dx;
        }

        const y = centerY + yOffset;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      evaState.ecgAnimFrame = requestAnimationFrame(draw);
    }

    evaState.ecgAnimFrame = requestAnimationFrame(draw);
  }

  // Bucle de Audio Fisiológico (Latido dinámico sincronizado y respiración)
  function startEvaAudioLoop() {
    function scheduleNextBeat() {
      if (!evaState.active) return;
      playEvaHeartbeat(evaState.bpm);
      const intervalMs = (60 / evaState.bpm) * 1000;
      evaState.heartbeatTimer = setTimeout(scheduleNextBeat, intervalMs);
    }
    scheduleNextBeat();

    function scheduleNextBreath() {
      if (!evaState.active) return;
      playEvaBreathing();
      evaState.breathingTimer = setTimeout(scheduleNextBreath, 3200);
    }
    scheduleNextBreath();
  }

  // Interacción Reactiva de los Guantes Espaciales con el Cursor
  function initEvaGloveInteractions() {
    const modal = document.getElementById('eva-firstperson-modal');
    const leftGlove = document.getElementById('eva-glove-left');
    const rightGlove = document.getElementById('eva-glove-right');
    if (!modal || !leftGlove || !rightGlove) return;

    modal.addEventListener('mousemove', (e) => {
      if (!evaState.active) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      leftGlove.style.transform = `translate(${nx * 14}px, ${ny * 8}px) rotate(${nx * 3}deg)`;
      rightGlove.style.transform = `translate(${nx * 20}px, ${ny * 12}px) rotate(${nx * -4}deg)`;
    });

    modal.addEventListener('mousedown', () => {
      if (!evaState.active) return;
      rightGlove.style.transform += ' scale(1.04) translateY(-8px)';
    });

    modal.addEventListener('mouseup', () => {
      if (!evaState.active) return;
      rightGlove.style.transform = rightGlove.style.transform.replace(' scale(1.04) translateY(-8px)', '');
    });
  }

  // Apertura del Modal en Primera Persona
  function openEvaModal(roomKey = 'o2', isPractice = false) {
    cleanupAllModalLoops();
    evaState.active = true;
    evaState.roomKey = roomKey;
    evaState.isPractice = isPractice;
    evaState.timeLeft = 15.0;
    evaState.bpm = 95;

    // Regla de 1 uso por Sol en modo real
    if (!isPractice) {
      window.evaUsedThisSol = true;
    }

    const modal = document.getElementById('eva-firstperson-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const modeBadge = document.getElementById('eva-suit-mode-badge');
    if (modeBadge) {
      modeBadge.textContent = isPractice
        ? (isEn ? 'PRACTICE (NO RISK)' : 'PRÁCTICA (SIN RIESGO)')
        : (isEn ? 'REAL (+20% / -5%)' : 'REAL (+20% / -5%)');
      modeBadge.className = isPractice
        ? 'text-[0.55rem] font-extrabold uppercase px-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
        : 'text-[0.55rem] font-extrabold uppercase px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30';
    }

    const timerDisp = document.getElementById('eva-timer-display');
    if (timerDisp) {
      timerDisp.textContent = '15.0s';
      timerDisp.className = 'text-xl md:text-2xl font-black font-mono text-cyan-300';
    }

    const bpmDisp = document.getElementById('eva-bpm-display');
    if (bpmDisp) {
      bpmDisp.textContent = '95';
      bpmDisp.className = 'text-lg md:text-xl font-black font-mono text-emerald-400';
    }

    const feedbackBanner = document.getElementById('eva-feedback-banner');
    if (feedbackBanner) feedbackBanner.classList.add('hidden');

    // Configurar Niebla Inicial de CO2 (solo opacity + radial-gradient, cero blur)
    const fogEl = document.getElementById('eva-visor-fog');
    if (fogEl) {
      fogEl.style.display = 'block';
      fogEl.style.setProperty('--eva-fog-opacity', '0.12');
    }

    // Iniciar ECG y Audio
    startEvaEcg();
    startEvaAudioLoop();

    // Renderizar Minijuego Específico
    renderEvaMinigame(roomKey);

    // Iniciar Cronómetro del Traje (throttled a 100ms y sólo actualiza DOM si cambia)
    let lastTs = performance.now();
    let lastBpmStr = '';
    let lastBpmClass = '';
    let lastTimerStr = '';
    let lastTimerClass = '';
    evaState.timerInterval = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      evaState.timeLeft = Math.max(0, evaState.timeLeft - dt);

      // Ritmo cardíaco acelerando conforme el O2 se agota (95 -> 180 BPM)
      const timeRatio = 1.0 - (evaState.timeLeft / evaState.maxTime);
      evaState.bpm = Math.min(180, Math.round(95 + timeRatio * 85));

      if (bpmDisp) {
        const nextBpmStr = String(evaState.bpm);
        if (lastBpmStr !== nextBpmStr) {
          lastBpmStr = nextBpmStr;
          bpmDisp.textContent = nextBpmStr;
        }
        const nextBpmClass = evaState.bpm > 145
          ? 'text-lg md:text-xl font-black font-mono text-rose-400'
          : (evaState.bpm > 120
            ? 'text-lg md:text-xl font-black font-mono text-amber-300'
            : 'text-lg md:text-xl font-black font-mono text-emerald-400');
        if (lastBpmClass !== nextBpmClass) {
          lastBpmClass = nextBpmClass;
          bpmDisp.className = nextBpmClass;
        }
      }

      if (timerDisp) {
        const nextTimerStr = `${evaState.timeLeft.toFixed(1)}s`;
        if (lastTimerStr !== nextTimerStr) {
          lastTimerStr = nextTimerStr;
          timerDisp.textContent = nextTimerStr;
        }
        const nextTimerClass = evaState.timeLeft <= 4.0
          ? 'text-xl md:text-2xl font-black font-mono text-rose-400 animate-pulse'
          : 'text-xl md:text-2xl font-black font-mono text-cyan-300';
        if (lastTimerClass !== nextTimerClass) {
          lastTimerClass = nextTimerClass;
          timerDisp.className = nextTimerClass;
        }
      }

      // Empañamiento progresivo de visera por acumulación de CO2 (solo opacity)
      if (fogEl && (evaState.roomKey !== 'o2' || evaState.o2Phase === 'B')) {
        const fogOpacity = (0.10 + timeRatio * 0.72).toFixed(2);
        fogEl.style.setProperty('--eva-fog-opacity', fogOpacity);
      }

      if (evaState.timeLeft <= 0) {
        clearInterval(evaState.timerInterval);
        evaState.timerInterval = null;
        resolveEvaMission(false);
      }
    }, 100);
    if (window.activeMinigameLoops) window.activeMinigameLoops.intervals.push(evaState.timerInterval);

    sfx.playCargoLock();
  }

  // Cierre y Limpieza del Modal EVA (Vaciado DOM Total y Cancelación de Todos los Bucles)
  function closeEvaModal() {
    evaState.active = false;
    cleanupAllModalLoops();

    const stage = document.getElementById('eva-interactive-stage');
    if (stage) stage.innerHTML = '';

    const fogEl = document.getElementById('eva-visor-fog');
    if (fogEl) {
      fogEl.style.setProperty('--eva-fog-opacity', '0');
      fogEl.style.display = 'none';
    }

    const modal = document.getElementById('eva-firstperson-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }

    // Refrescar CCTV solo si sigue abierto
    if (cctv.open) {
      refreshCctv(true);
    }
    refreshCctvEvaControls();
  }

  // Renderizado de Minijuegos Específicos
  function renderEvaMinigame(roomKey) {
    const stage = document.getElementById('eva-interactive-stage');
    const moduleTitle = document.getElementById('eva-module-title');
    const objectiveText = document.getElementById('eva-objective-text');
    if (!stage) return;
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');

    const key = (roomKey || '').toLowerCase();
    if (key === 'o2' || key === 'oxygen') {
      renderOxygenMinigame(stage, moduleTitle, objectiveText, isEn);
    } else if (key === 'rad' || key === 'shield') {
      renderShieldMinigame(stage, moduleTitle, objectiveText, isEn);
    } else if (key === 'pwr' || key === 'energy' || key === 'power') {
      renderEnergyMinigame(stage, moduleTitle, objectiveText, isEn);
    } else if (key === 'food' || key === 'comida') {
      renderFoodMinigame(stage, moduleTitle, objectiveText, isEn);
    }
  }

  // =======================================================================
  // MINIJUEGO 1: OXÍGENO — ELECTRÓLISIS DEL AGUA NASA OGS (H2 : O2 = 2 : 1)
  // =======================================================================
  function renderOxygenMinigame(stage, moduleTitle, objectiveText, isEn) {
    evaState.o2Phase = 'OGS';
    let powerOn = false;
    let voltagePct = 38; // 0..100% (0.0V a 2.4V; zona óptima: 65% a 85% / 1.8V - 2.0V)
    let progress = 0;    // 0..100% (desplazamiento estequiométrico H2:O2 = 2:1)
    let completed = false;
    let completeTimeout = null;
    let holdingDir = 0;  // -1, 0, +1
    let draggingBar = false;
    let lastBubbleBeep = 0;
    let lastOvervoltBeep = 0;

    if (moduleTitle) {
      moduleTitle.innerHTML = `<span class="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span><span>${isEn ? 'NASA OGS WATER ELECTROLYSIS // H2 : O2 = 2 : 1' : 'ELECTRÓLISIS DE AGUA OGS NASA // H2 : O2 = 2 : 1'}</span>`;
    }
    if (objectiveText) {
      objectiveText.textContent = isEn
        ? 'TURN ON [ POWER ] AND HOLD VOLTAGE IN OPTIMAL BAND (65% - 85%) UNTIL O2 & H2 REACH 100% GOAL'
        : 'ENCIENDE [ ENERGÍA ] Y MANTÉN EL VOLTAJE EN LA BANDA ÓPTIMA (65% - 85%) HASTA LLEGAR AL 100% EN O2 Y H2';
    }

    // Audio sintetizado Web Audio API para el módulo de electrólisis
    function playOgsSwitchSound(isOn) {
      const ctx = sfx?.init ? sfx.init() : null;
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isOn ? 340 : 620, now);
        osc.frequency.exponentialRampToValueAtTime(isOn ? 760 : 240, now + 0.09);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.connect(gain);
        gain.connect(ctx.destination);
        sfx.bindAutoDisconnect(osc, gain);
        osc.start(now);
        osc.stop(now + 0.12);
      } catch (_) {}
    }

    function playOgsVoltageStepSound(dir, pct) {
      const ctx = sfx?.init ? sfx.init() : null;
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const baseFreq = 280 + (pct / 100) * 520 + (dir > 0 ? 35 : -25);
        osc.frequency.setValueAtTime(baseFreq, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
        osc.connect(gain);
        gain.connect(ctx.destination);
        sfx.bindAutoDisconnect(osc, gain);
        osc.start(now);
        osc.stop(now + 0.06);
      } catch (_) {}
    }

    function playOgsElectrolysisPulse(pct) {
      const ctx = sfx?.init ? sfx.init() : null;
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520 + (pct / 100) * 440, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        sfx.bindAutoDisconnect(osc, gain);
        osc.start(now);
        osc.stop(now + 0.07);
      } catch (_) {}
    }

    const basePwrPct = Math.max(0, Math.min(100, Math.round(state?.resources?.pwr ?? 75)));

    // Partículas de burbujas internas para Ánodo (O2: 7 burbujas) y Cátodo (H2: 14 burbujas, doble volumen)
    const o2BubbleDefs = Array.from({ length: 7 }, (_, i) => ({
      id: `ogs-b-o2-${i}`,
      baseX: 216 + (i % 5) * 9,
      wobbleAmp: 1.5 + (i % 3) * 0.8,
      wobbleFreq: 2.5 + i * 0.4,
      r: 1.8 + (i % 3) * 0.65,
      relY: (i / 7),
      speedMul: 0.82 + (i % 4) * 0.14
    }));

    const h2BubbleDefs = Array.from({ length: 14 }, (_, i) => ({
      id: `ogs-b-h2-${i}`,
      baseX: 324 + (i % 6) * 8.5,
      wobbleAmp: 1.6 + (i % 3) * 0.9,
      wobbleFreq: 3.0 + i * 0.35,
      r: 1.6 + (i % 3) * 0.7,
      relY: (i / 14),
      speedMul: 0.9 + (i % 5) * 0.14
    }));

    stage.innerHTML = `
      <div id="eva-o2-container" class="eva-workstation-panel eva-titanium-panel flex flex-col justify-between p-3 md:p-4 relative select-none overflow-hidden">
        <!-- Esquinas con Placas de Titanio y Remaches Hexagonales -->
        <div class="absolute top-2 left-2 flex items-center gap-1 opacity-70 pointer-events-none">
          <div class="w-2 h-2 rounded-full bg-slate-400 border border-slate-600"></div>
          <div class="w-6 h-0.5 bg-slate-600"></div>
        </div>
        <div class="absolute top-2 right-2 flex items-center gap-1 opacity-70 pointer-events-none">
          <div class="w-6 h-0.5 bg-slate-600"></div>
          <div class="w-2 h-2 rounded-full bg-slate-400 border border-slate-600"></div>
        </div>
        <div class="absolute bottom-2 left-2 flex items-center gap-1 opacity-70 pointer-events-none">
          <div class="w-2 h-2 rounded-full bg-slate-400 border border-slate-600"></div>
          <div class="w-6 h-0.5 bg-slate-600"></div>
        </div>
        <div class="absolute bottom-2 right-2 flex items-center gap-1 opacity-70 pointer-events-none">
          <div class="w-6 h-0.5 bg-slate-600"></div>
          <div class="w-2 h-2 rounded-full bg-slate-400 border border-slate-600"></div>
        </div>

        <!-- 1. CABECERA TÉCNICA DEL VISOR -->
        <div class="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-zinc-950/90 border border-zinc-700/80 rounded-lg z-20 shrink-0">
          <!-- Arriba a la izquierda: ● REC CAM-04 // OGS ELECTROLYSIS CELL -->
          <div class="flex items-center gap-2 text-[0.62rem] md:text-xs font-mono font-black tracking-wider text-zinc-200">
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span class="w-2 h-2 rounded-full bg-rose-500 -ml-2"></span>
            <span class="text-cyan-300">REC CAM-04</span>
            <span class="text-zinc-500">//</span>
            <span>${isEn ? 'OGS ELECTROLYSIS CELL' : 'OGS ELECTROLYSIS CELL // CELDA OGS'}</span>
          </div>

          <!-- Arriba a la derecha: Insignia luminosa de estequiometría -->
          <div id="ogs-stoich-badge" class="ogs-stoich-badge px-2.5 py-0.5 rounded font-mono text-[0.6rem] md:text-[0.68rem] font-black tracking-widest uppercase flex items-center gap-1.5">
            <span id="ogs-stoich-dot" class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>${isEn ? '[ ⚡ H₂ : O₂ = 2 : 1 // STOICHIOMETRIC RATIO ]' : '[ ⚡ H₂ : O₂ = 2 : 1 // STOICHIOMETRIC RATIO ]'}</span>
          </div>
        </div>

        <!-- 2. ESCENARIO CENTRAL SVG INDUSTRIAL (viewBox="0 0 760 300") -->
        <div class="relative w-full flex-1 min-h-0 flex items-center justify-center my-1 overflow-hidden rounded-xl border border-slate-700/80 bg-[#040811]">
          <svg id="ogs-electrolysis-svg" viewBox="0 0 760 300" class="w-full h-full max-h-[270px] select-none" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <!-- Fondo Industrial y Cuadrícula Técnica -->
              <linearGradient id="ogsBgGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#060c18"/>
                <stop offset="55%" stop-color="#040811"/>
                <stop offset="100%" stop-color="#020409"/>
              </linearGradient>
              <pattern id="ogsTechGrid" width="38" height="30" patternUnits="userSpaceOnUse">
                <path d="M 38 0 L 0 0 0 30" fill="none" stroke="#1e293b" stroke-width="0.6" stroke-opacity="0.55"/>
              </pattern>

              <!-- Chasis de Titanio / Acero Cepillado -->
              <linearGradient id="ogsTitaniumFrame" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#1e293b"/>
                <stop offset="30%" stop-color="#475569"/>
                <stop offset="50%" stop-color="#94a3b8"/>
                <stop offset="70%" stop-color="#334155"/>
                <stop offset="100%" stop-color="#0f172a"/>
              </linearGradient>

              <!-- Solución Electrolítica (H2O + KOH) en la Cuba Principal (#083344 a #06b6d4) -->
              <linearGradient id="ogsElectrolyteBath" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.72"/>
                <stop offset="45%" stop-color="#0891b2" stop-opacity="0.82"/>
                <stop offset="100%" stop-color="#083344" stop-opacity="0.95"/>
              </linearGradient>

              <!-- Columna de Líquido Electrolítico dentro de los Tubos de Hofmann -->
              <linearGradient id="ogsTubeLiquidGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#083344" stop-opacity="0.92"/>
                <stop offset="35%" stop-color="#06b6d4" stop-opacity="0.88"/>
                <stop offset="65%" stop-color="#22d3ee" stop-opacity="0.92"/>
                <stop offset="100%" stop-color="#0e7490" stop-opacity="0.92"/>
              </linearGradient>

              <!-- Gas Acumulado en la Parte Superior de los Tubos (O2 y H2) -->
              <linearGradient id="ogsGasPocketO2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.38"/>
                <stop offset="100%" stop-color="#0284c7" stop-opacity="0.14"/>
              </linearGradient>
              <linearGradient id="ogsGasPocketH2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#34d399" stop-opacity="0.38"/>
                <stop offset="100%" stop-color="#059669" stop-opacity="0.14"/>
              </linearGradient>

              <!-- Volumen Cilíndrico 3D de Cristal Blindado para los Tubos de Hofmann -->
              <linearGradient id="ogsGlassCylinder3D" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
                <stop offset="18%" stop-color="#bae6fd" stop-opacity="0.06"/>
                <stop offset="50%" stop-color="#000000" stop-opacity="0.18"/>
                <stop offset="84%" stop-color="#bae6fd" stop-opacity="0.08"/>
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0.26"/>
              </linearGradient>

              <!-- Chasis de Acero Cepillado de la Batería DC -->
              <linearGradient id="ogsBatteryChassis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#334155"/>
                <stop offset="18%" stop-color="#1e293b"/>
                <stop offset="85%" stop-color="#0f172a"/>
                <stop offset="100%" stop-color="#020617"/>
              </linearGradient>

              <!-- Celdas Blindadas de Cátodo (-) y Ánodo (+) -->
              <linearGradient id="ogsCathodeCellGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0f2942"/>
                <stop offset="100%" stop-color="#061220"/>
              </linearGradient>
              <linearGradient id="ogsAnodeCellGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0a2e36"/>
                <stop offset="100%" stop-color="#04161c"/>
              </linearGradient>

              <!-- Bornes Hexagonales de Cobre -->
              <linearGradient id="ogsCopperTerminal" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#92400e"/>
                <stop offset="35%" stop-color="#f59e0b"/>
                <stop offset="55%" stop-color="#fde68a"/>
                <stop offset="80%" stop-color="#d97706"/>
                <stop offset="100%" stop-color="#78350f"/>
              </linearGradient>
            </defs>

            <!-- Fondo con Retícula de Ingeniería -->
            <rect width="760" height="300" fill="url(#ogsBgGrad)"/>
            <rect width="760" height="300" fill="url(#ogsTechGrid)"/>

            <!-- PANEL LATERAL IZQUIERDO: ECUACIÓN QUÍMICA Y TELEMETRÍA ESTEQUIOMÉTRICA (x=14..146) -->
            <g transform="translate(14, 18)">
              <rect x="0" y="0" width="132" height="236" rx="6" fill="#070d19" stroke="#334155" stroke-width="1.5"/>
              <rect x="0" y="0" width="132" height="22" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1"/>
              <text x="66" y="14" fill="#38bdf8" font-family="monospace" font-size="7.5" font-weight="900" text-anchor="middle" letter-spacing="0.6">NASA-STD-3001 // OGS</text>

              <!-- Ecuación Estequiométrica Global -->
              <rect x="8" y="30" width="116" height="36" rx="4" fill="#030712" stroke="#0891b2" stroke-width="1"/>
              <text x="66" y="43" fill="#94a3b8" font-family="monospace" font-size="6.5" font-weight="bold" text-anchor="middle">${isEn ? 'STOICHIOMETRIC REACTION' : 'REACCIÓN ESTEQUIOMÉTRICA'}</text>
              <text x="66" y="57" fill="#67e8f9" font-family="monospace" font-size="8.5" font-weight="900" text-anchor="middle">2H₂O → 2H₂ + O₂</text>

              <!-- Semirreacción Ánodo (+) -->
              <rect x="8" y="74" width="116" height="44" rx="4" fill="#041824" stroke="#0284c7" stroke-width="1"/>
              <text x="14" y="87" fill="#38bdf8" font-family="monospace" font-size="7" font-weight="900">${isEn ? '+ ANODE (1 VOL O₂)' : '+ ÁNODO (1 VOL O₂)'}</text>
              <text x="14" y="99" fill="#cbd5e1" font-family="monospace" font-size="6.2">2H₂O → O₂↑ + 4H⁺ + 4e⁻</text>
              <text id="ogs-side-o2-vol" x="14" y="111" fill="#fbbf24" font-family="monospace" font-size="6.8" font-weight="900">0.0 / 1.0 VOL (0%)</text>

              <!-- Semirreacción Cátodo (-) -->
              <rect x="8" y="126" width="116" height="44" rx="4" fill="#04221c" stroke="#10b981" stroke-width="1"/>
              <text x="14" y="139" fill="#34d399" font-family="monospace" font-size="7" font-weight="900">${isEn ? '- CATHODE (2 VOL H₂)' : '- CÁTODO (2 VOL H₂)'}</text>
              <text x="14" y="151" fill="#cbd5e1" font-family="monospace" font-size="6.2">4H₂O + 4e⁻ → 2H₂↑ + 4OH⁻</text>
              <text id="ogs-side-h2-vol" x="14" y="163" fill="#fbbf24" font-family="monospace" font-size="6.8" font-weight="900">0.0 / 2.0 VOL (0%)</text>

              <!-- Estado Térmico y Electrolito -->
              <rect x="8" y="178" width="116" height="48" rx="4" fill="#030712" stroke="#334155" stroke-width="1"/>
              <text x="14" y="191" fill="#94a3b8" font-family="monospace" font-size="6.2" font-weight="bold">${isEn ? 'ELECTROLYTE: H₂O + KOH' : 'ELECTROLITO: H₂O + KOH'}</text>
              <text id="ogs-side-temp" x="14" y="204" fill="#67e8f9" font-family="monospace" font-size="7" font-weight="900">TEMP: 65.0°C // NOMINAL</text>
              <text id="ogs-side-status" x="14" y="217" fill="#f59e0b" font-family="monospace" font-size="6.5" font-weight="900">${isEn ? 'STATUS: STANDBY (OFF)' : 'ESTADO: EN ESPERA (OFF)'}</text>
            </g>

            <!-- =================================================================
                 2.A CUBA ELECTROLÍTICA PRINCIPAL Y 2 TUBOS DE HOFMANN INVERTIDOS
                 (Izquierda-Centro x=160..420)
                 ================================================================= -->

            <!-- Chasis Inferior y Soportes de Titanio de la Cuba (x=160..420) -->
            <rect x="156" y="242" width="268" height="14" rx="3" fill="url(#ogsTitaniumFrame)" stroke="#64748b" stroke-width="1.2"/>
            <rect x="164" y="54" width="252" height="190" rx="6" fill="#041521" stroke="#475569" stroke-width="2.5"/>

            <!-- Solución Electrolítica (H2O + KOH) en la Cuba con Ondas Suaves -->
            <rect id="ogs-bath-liquid" x="166" y="92" width="248" height="150" fill="url(#ogsElectrolyteBath)"/>
            <path id="ogs-bath-wave" d="M 166 92 Q 197 88 228 92 T 290 92 T 352 92 T 414 92 L 414 102 L 166 102 Z" fill="#22d3ee" opacity="0.38"/>
            <line x1="166" y1="92" x2="414" y2="92" stroke="#67e8f9" stroke-width="1.5" opacity="0.8"/>

            <!-- Etiqueta Grabada en la Cuba de Contención -->
            <text x="290" y="236" fill="#a5f3fc" fill-opacity="0.55" font-family="monospace" font-size="7" font-weight="900" text-anchor="middle" letter-spacing="1.2">
              ${isEn ? 'H₂O + KOH ELECTROLYTIC CONTAINMENT BATH' : 'CUBA ELECTROLÍTICA H₂O + KOH // TITANIO'}
            </text>

            <!-- Marcas de Nivel en el Cristal Blindado de la Cuba -->
            <g stroke="#38bdf8" stroke-width="0.9" opacity="0.45">
              <line x1="168" y1="115" x2="178" y2="115"/><line x1="402" y1="115" x2="412" y2="115"/>
              <line x1="168" y1="145" x2="175" y2="145"/><line x1="405" y1="145" x2="412" y2="145"/>
              <line x1="168" y1="175" x2="178" y2="175"/><line x1="402" y1="175" x2="412" y2="175"/>
              <line x1="168" y1="205" x2="175" y2="205"/><line x1="405" y1="205" x2="412" y2="205"/>
            </g>

            <!-- =================================================================
                 TUBO IZQUIERDO — ÁNODO (O₂ 0% -> 100%, 1 VOLUMEN, META A MEDIA ALTURA y=114)
                 Centro x=234, Ancho=58 (x=205..263), Altura interior y=34..226
                 ================================================================= -->
            <g id="ogs-anode-tube-group">
              <!-- Rótulo Superior del Tubo Ánodo -->
              <rect x="184" y="6" width="100" height="20" rx="4" fill="#061e2e" stroke="#0284c7" stroke-width="1.2"/>
              <text x="234" y="15" fill="#7dd3fc" font-family="monospace" font-size="6.8" font-weight="900" text-anchor="middle">${isEn ? 'ANODE (+) // O₂' : 'ÁNODO (+) // O₂'}</text>
              <text id="ogs-o2-pct-text" x="234" y="23" fill="#ffffff" font-family="monospace" font-size="7.5" font-weight="900" text-anchor="middle">O₂: 0%</text>

              <!-- Fondo Oscuro de la Columna del Tubo -->
              <rect x="205" y="34" width="58" height="192" rx="6" fill="#030b14"/>

              <!-- Gas O2 Acumulado en la Parte Superior (Crece de y=34 hacia abajo hasta y=114) -->
              <rect id="ogs-o2-gas-rect" x="206" y="34" width="56" height="0" rx="4" fill="url(#ogsGasPocketO2)"/>

              <!-- Columna de Líquido Desplazada hacia Abajo (Empieza en y=34, baja hasta tocar META en y=114) -->
              <rect id="ogs-o2-liquid-rect" x="206" y="34" width="56" height="192" fill="url(#ogsTubeLiquidGrad)"/>

              <!-- Menisco Luminoso en la Interfaz Gas/Líquido del Ánodo -->
              <ellipse id="ogs-o2-meniscus" cx="234" cy="34" rx="27" ry="3.2" fill="#a5f3fc" stroke="#ffffff" stroke-width="1"/>

              <!-- Electrodo Metálico Interno Positivo (+) de Platino-Iridio -->
              <rect x="228" y="198" width="12" height="28" rx="2" fill="url(#ogsTitaniumFrame)" stroke="#38bdf8" stroke-width="1.2"/>
              <circle cx="234" cy="208" r="5.5" fill="#083344" stroke="#22d3ee" stroke-width="1.2"/>
              <text x="234" y="211" fill="#67e8f9" font-family="monospace" font-size="8.5" font-weight="900" text-anchor="middle">+</text>

              <!-- Burbujas Animadas Subiendo desde el Electrodo Positivo (+) -->
              <g id="ogs-o2-bubbles-layer">
                ${o2BubbleDefs.map(b => `<circle id="${b.id}" cx="${b.baseX}" cy="200" r="${b.r}" fill="#e0f2fe" stroke="#38bdf8" stroke-width="0.7" opacity="0"/>`).join('')}
              </g>

              <!-- Reflejo Cilíndrico 3D y Paredes de Cristal Graduado -->
              <rect x="205" y="34" width="58" height="192" rx="6" fill="url(#ogsGlassCylinder3D)" stroke="#38bdf8" stroke-width="1.8"/>

              <!-- Escala Graduada Grabada en el Tubo O2 -->
              <g stroke="#bae6fd" stroke-width="0.9" opacity="0.65">
                <line x1="206" y1="54" x2="214" y2="54"/>
                <line x1="206" y1="74" x2="218" y2="74"/>
                <line x1="206" y1="94" x2="214" y2="94"/>
                <line x1="206" y1="114" x2="220" y2="114"/>
                <line x1="206" y1="134" x2="214" y2="134"/>
                <line x1="206" y1="154" x2="218" y2="154"/>
                <line x1="206" y1="174" x2="214" y2="174"/>
                <line x1="206" y1="194" x2="218" y2="194"/>
              </g>

              <!-- LÍNEA PUNTEADA ÁMBAR DE META A MEDIA ALTURA DEL TUBO (y=114 -> 1 VOLUMEN DE O2) -->
              <line id="ogs-o2-meta-line" x1="198" y1="114" x2="270" y2="114" stroke="#fbbf24" stroke-width="2.2" stroke-dasharray="4 3"/>
              <rect x="170" y="106" width="34" height="15" rx="3" fill="#451a03" stroke="#fbbf24" stroke-width="1.2"/>
              <text x="187" y="116" fill="#fde68a" font-family="monospace" font-size="6.5" font-weight="900" text-anchor="middle">${isEn ? 'GOAL' : 'META'}</text>
              <text x="234" y="126" fill="#fde68a" font-family="monospace" font-size="6.2" font-weight="900" text-anchor="middle">1 VOL O₂</text>
            </g>

            <!-- =================================================================
                 TUBO DERECHO — CÁTODO (H₂ 0% -> 100%, 2 VOLÚMENES, META EN PARTE INFERIOR y=194)
                 Centro x=346, Ancho=58 (x=317..375), Altura interior y=34..226
                 ================================================================= -->
            <g id="ogs-cathode-tube-group">
              <!-- Rótulo Superior del Tubo Cátodo -->
              <rect x="296" y="6" width="100" height="20" rx="4" fill="#04221c" stroke="#10b981" stroke-width="1.2"/>
              <text x="346" y="15" fill="#6ee7b7" font-family="monospace" font-size="6.8" font-weight="900" text-anchor="middle">${isEn ? 'CATHODE (-) // H₂' : 'CÁTODO (-) // H₂'}</text>
              <text id="ogs-h2-pct-text" x="346" y="23" fill="#ffffff" font-family="monospace" font-size="7.5" font-weight="900" text-anchor="middle">H₂: 0%</text>

              <!-- Fondo Oscuro de la Columna del Tubo -->
              <rect x="317" y="34" width="58" height="192" rx="6" fill="#030b14"/>

              <!-- Gas H2 Acumulado en la Parte Superior (Crece el DOBLE: de y=34 hasta y=194) -->
              <rect id="ogs-h2-gas-rect" x="318" y="34" width="56" height="0" rx="4" fill="url(#ogsGasPocketH2)"/>

              <!-- Columna de Líquido Desplazada hacia Abajo (Empieza en y=34, baja el DOBLE hasta tocar META en y=194) -->
              <rect id="ogs-h2-liquid-rect" x="318" y="34" width="56" height="192" fill="url(#ogsTubeLiquidGrad)"/>

              <!-- Menisco Luminoso en la Interfaz Gas/Líquido del Cátodo -->
              <ellipse id="ogs-h2-meniscus" cx="346" cy="34" rx="27" ry="3.2" fill="#6ee7b7" stroke="#ffffff" stroke-width="1"/>

              <!-- Electrodo Metálico Interno Negativo (-) de Platino-Iridio -->
              <rect x="340" y="198" width="12" height="28" rx="2" fill="url(#ogsTitaniumFrame)" stroke="#34d399" stroke-width="1.2"/>
              <circle cx="346" cy="208" r="5.5" fill="#042f2e" stroke="#34d399" stroke-width="1.2"/>
              <text x="346" y="211" fill="#6ee7b7" font-family="monospace" font-size="9" font-weight="900" text-anchor="middle">-</text>

              <!-- Burbujas Animadas Subiendo desde el Electrodo Negativo (-) (Doble densidad) -->
              <g id="ogs-h2-bubbles-layer">
                ${h2BubbleDefs.map(b => `<circle id="${b.id}" cx="${b.baseX}" cy="200" r="${b.r}" fill="#ecfdf5" stroke="#34d399" stroke-width="0.7" opacity="0"/>`).join('')}
              </g>

              <!-- Reflejo Cilíndrico 3D y Paredes de Cristal Graduado -->
              <rect x="317" y="34" width="58" height="192" rx="6" fill="url(#ogsGlassCylinder3D)" stroke="#34d399" stroke-width="1.8"/>

              <!-- Escala Graduada Grabada en el Tubo H2 -->
              <g stroke="#a7f3d0" stroke-width="0.9" opacity="0.65">
                <line x1="318" y1="54" x2="326" y2="54"/>
                <line x1="318" y1="74" x2="330" y2="74"/>
                <line x1="318" y1="94" x2="326" y2="94"/>
                <line x1="318" y1="114" x2="330" y2="114"/>
                <line x1="318" y1="134" x2="326" y2="134"/>
                <line x1="318" y1="154" x2="330" y2="154"/>
                <line x1="318" y1="174" x2="326" y2="174"/>
                <line x1="318" y1="194" x2="332" y2="194"/>
              </g>

              <!-- LÍNEA PUNTEADA ÁMBAR DE META EN PARTE INFERIOR DEL TUBO (y=194 -> 2 VOLÚMENES DE H2) -->
              <line id="ogs-h2-meta-line" x1="310" y1="194" x2="382" y2="194" stroke="#fbbf24" stroke-width="2.2" stroke-dasharray="4 3"/>
              <rect x="378" y="186" width="34" height="15" rx="3" fill="#451a03" stroke="#fbbf24" stroke-width="1.2"/>
              <text x="395" y="196" fill="#fde68a" font-family="monospace" font-size="6.5" font-weight="900" text-anchor="middle">${isEn ? 'GOAL' : 'META'}</text>
              <text x="346" y="188" fill="#fde68a" font-family="monospace" font-size="6.2" font-weight="900" text-anchor="middle">2 VOL H₂</text>
            </g>

            <!-- Abrazadera Horizontal de Titanio que Sujeta Ambos Tubos de Hofmann -->
            <rect x="196" y="62" width="188" height="8" rx="2" fill="url(#ogsTitaniumFrame)" stroke="#475569" stroke-width="1"/>
            <circle cx="202" cy="66" r="1.8" fill="#cbd5e1"/>
            <circle cx="290" cy="66" r="2.2" fill="#38bdf8"/>
            <circle cx="378" cy="66" r="1.8" fill="#cbd5e1"/>

            <!-- =================================================================
                 2.B FUENTE RECTIFICADORA DE BATERÍA DC (BATERÍA - / +) Y TELEMETRÍA
                 (Derecha x=450..740)
                 ================================================================= -->

            <!-- Módulo de Telemetría ENERGÍA (Arriba a la derecha x=456..742, y=14..86) -->
            <g id="ogs-telemetry-module" transform="translate(456, 14)">
              <rect x="0" y="0" width="286" height="72" rx="7" fill="#060c17" stroke="#0891b2" stroke-width="1.8"/>
              <rect x="4" y="4" width="278" height="20" rx="4" fill="#091526"/>
              <circle id="ogs-telemetry-led" cx="16" cy="14" r="4" fill="#f59e0b"/>
              <text id="ogs-telemetry-title" x="28" y="17" fill="#67e8f9" font-family="monospace" font-size="8.2" font-weight="900" letter-spacing="0.6">
                ${isEn ? 'POWER: ' : 'ENERGÍA: '}${basePwrPct}% // 35.5 kPa O2 OUTPUT
              </text>

              <!-- Lectura Digital de Voltaje DC, Corriente y Caudal Estequiométrico -->
              <text id="ogs-telemetry-volt-readout" x="14" y="42" fill="#e2e8f0" font-family="monospace" font-size="9.5" font-weight="900">
                ${isEn ? 'CELL BUS: 0.00V DC // 0.0 A (OFF)' : 'BUS CELDA: 0.00V DC // 0.0 A (OFF)'}
              </text>
              <text id="ogs-telemetry-zone-readout" x="14" y="59" fill="#fbbf24" font-family="monospace" font-size="7.5" font-weight="900">
                ${isEn ? '[ FLIP POWER SWITCH TO ENERGIZE CELL ]' : '[ ENCIENDE EL SWITCH DE ENERGÍA PARA INICIAR ]'}
              </text>
            </g>

            <!-- Vector Indicador con Flecha desde Telemetría hacia la Batería DC -->
            <g stroke="#22d3ee" stroke-width="1.8" fill="none">
              <path d="M 599 86 L 599 112" stroke-dasharray="3 2"/>
              <polygon points="599,118 594,109 604,109" fill="#22d3ee" stroke="none"/>
            </g>

            <!-- Módulo Industrial de Batería DC Dividida en 2 Celdas Blindadas (x=456..742, y=120..236) -->
            <g id="ogs-battery-module" transform="translate(456, 120)">
              <!-- Chasis de Acero Cepillado -->
              <rect x="0" y="0" width="286" height="114" rx="8" fill="url(#ogsBatteryChassis)" stroke="#64748b" stroke-width="2"/>
              <!-- Pernos Hexagonales en las 4 Esquinas -->
              <circle cx="10" cy="10" r="2.5" fill="#cbd5e1" stroke="#334155" stroke-width="0.8"/>
              <circle cx="276" cy="10" r="2.5" fill="#cbd5e1" stroke="#334155" stroke-width="0.8"/>
              <circle cx="10" cy="104" r="2.5" fill="#cbd5e1" stroke="#334155" stroke-width="0.8"/>
              <circle cx="276" cy="104" r="2.5" fill="#cbd5e1" stroke="#334155" stroke-width="0.8"/>

              <!-- Placa Superior del Rectificador DC -->
              <rect x="18" y="6" width="250" height="18" rx="3" fill="#090d16" stroke="#334155" stroke-width="1"/>
              <text x="143" y="18" fill="#e2e8f0" font-family="monospace" font-size="8" font-weight="900" text-anchor="middle" letter-spacing="1.2">
                ${isEn ? 'DC BATTERY RECTIFIER // [ - / + ]' : 'BATERÍA DC RECTIFICADORA // [ - / + ]'}
              </text>

              <!-- CELDA IZQUIERDA: [ - CÁTODO ] (Conectada al tubo derecho H2) -->
              <rect id="ogs-bat-cell-neg" x="14" y="30" width="122" height="72" rx="5" fill="url(#ogsCathodeCellGrad)" stroke="#10b981" stroke-width="1.6"/>
              <rect x="22" y="36" width="106" height="18" rx="3" fill="#021c17" stroke="#059669" stroke-width="1"/>
              <text x="75" y="48" fill="#6ee7b7" font-family="monospace" font-size="8.5" font-weight="900" text-anchor="middle">
                ${isEn ? '[ - CATHODE ]' : '[ - CÁTODO ]'}
              </text>
              <circle cx="42" cy="74" r="12" fill="#042f2e" stroke="#34d399" stroke-width="1.5"/>
              <text x="42" y="78" fill="#6ee7b7" font-family="monospace" font-size="15" font-weight="900" text-anchor="middle">-</text>
              <text x="90" y="71" fill="#a7f3d0" font-family="monospace" font-size="6.8" font-weight="bold" text-anchor="middle">H₂ DRIVE</text>
              <text id="ogs-bat-neg-v" x="90" y="83" fill="#34d399" font-family="monospace" font-size="7.5" font-weight="900" text-anchor="middle">-0.00V</text>

              <!-- CELDA DERECHA: [ + ÁNODO ] (Conectada al tubo izquierdo O2) -->
              <rect id="ogs-bat-cell-pos" x="150" y="30" width="122" height="72" rx="5" fill="url(#ogsAnodeCellGrad)" stroke="#0284c7" stroke-width="1.6"/>
              <rect x="158" y="36" width="106" height="18" rx="3" fill="#041d2e" stroke="#0284c7" stroke-width="1"/>
              <text x="211" y="48" fill="#7dd3fc" font-family="monospace" font-size="8.5" font-weight="900" text-anchor="middle">
                ${isEn ? '[ + ANODE ]' : '[ + ÁNODO ]'}
              </text>
              <circle cx="178" cy="74" r="12" fill="#083344" stroke="#38bdf8" stroke-width="1.5"/>
              <text x="178" y="78" fill="#7dd3fc" font-family="monospace" font-size="14" font-weight="900" text-anchor="middle">+</text>
              <text x="226" y="71" fill="#bae6fd" font-family="monospace" font-size="6.8" font-weight="bold" text-anchor="middle">O₂ DRIVE</text>
              <text id="ogs-bat-pos-v" x="226" y="83" fill="#38bdf8" font-family="monospace" font-size="7.5" font-weight="900" text-anchor="middle">+0.00V</text>

              <!-- Bornes Hexagonales Inferiores de Cobre (Salidas - y +) -->
              <!-- Borne Negativo (-) en x = 456 + 75 = 531 -->
              <g transform="translate(65, 110)">
                <rect x="0" y="0" width="20" height="10" rx="2" fill="url(#ogsCopperTerminal)" stroke="#fde68a" stroke-width="1"/>
                <line x1="4" y1="5" x2="16" y2="5" stroke="#78350f" stroke-width="1.2"/>
              </g>
              <!-- Borne Positivo (+) en x = 456 + 211 = 667 -->
              <g transform="translate(201, 110)">
                <rect x="0" y="0" width="20" height="10" rx="2" fill="url(#ogsCopperTerminal)" stroke="#fde68a" stroke-width="1"/>
                <line x1="4" y1="5" x2="16" y2="5" stroke="#78350f" stroke-width="1.2"/>
              </g>
            </g>

            <!-- =================================================================
                 2 CABLES INFERIORES DE ALTA VISIBILIDAD (Vaina oscura + Línea punteada cian #22d3ee)
                 1) Polo (-) (x=531, y=240) -> Electrodo Cátodo H2 (x=346, y=226)
                 2) Polo (+) (x=667, y=240) -> Electrodo Ánodo O2 (x=234, y=226)
                 ================================================================= -->
            <!-- Cable Negativo (-) hacia el Tubo Derecho H2 -->
            <path d="M 531 240 L 531 268 L 346 268 L 346 226" fill="none" stroke="#090d16" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M 531 240 L 531 268 L 346 268 L 346 226" fill="none" stroke="#334155" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path id="ogs-cable-neg-core" class="ogs-cable-core" d="M 531 240 L 531 268 L 346 268 L 346 226" fill="none" stroke="#22d3ee" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
            <text x="442" y="264" fill="#6ee7b7" font-family="monospace" font-size="6.5" font-weight="900" text-anchor="middle">${isEn ? 'CATHODE LINE (-) → H₂' : 'LÍNEA CÁTODO (-) → H₂'}</text>

            <!-- Cable Positivo (+) hacia el Tubo Izquierdo O2 -->
            <path d="M 667 240 L 667 288 L 234 288 L 234 226" fill="none" stroke="#090d16" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M 667 240 L 667 288 L 234 288 L 234 226" fill="none" stroke="#334155" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path id="ogs-cable-pos-core" class="ogs-cable-core" d="M 667 240 L 667 288 L 234 288 L 234 226" fill="none" stroke="#22d3ee" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
            <text x="442" y="284" fill="#7dd3fc" font-family="monospace" font-size="6.5" font-weight="900" text-anchor="middle">${isEn ? 'ANODE LINE (+) → O₂' : 'LÍNEA ÁNODO (+) → O₂'}</text>
          </svg>

          <!-- BANNER LUMINOSO CIAN DE VICTORIA SOBRE LA CELDA (Oculto hasta llegar al 100%) -->
          <div id="ogs-victory-overlay" class="hidden absolute inset-x-6 top-1/2 -translate-y-1/2 z-30 ogs-victory-overlay rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2.5">
            <div class="flex items-center gap-2 text-cyan-300 font-mono text-xs font-black tracking-widest uppercase">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]"></span>
              <span>${isEn ? 'STOICHIOMETRIC TARGET ACHIEVED // 35.5 kPa' : 'META ESTEQUIOMÉTRICA ALCANZADA // 35.5 kPa'}</span>
            </div>
            <div class="text-base md:text-xl font-black font-scifi tracking-wider text-white uppercase drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]">
              ${isEn ? 'OXYGEN PRODUCED // H₂ : O₂ = 2 : 1 COMPLETED' : 'OXÍGENO PRODUCIDO // H₂ : O₂ = 2 : 1 COMPLETADO'}
            </div>
            <div class="text-[0.68rem] font-mono text-cyan-200">
              ${isEn ? 'ANODE O₂: 100% (1 VOL)  •  CATHODE H₂: 100% (2 VOL)' : 'ÁNODO O₂: 100% (1 VOL)  •  CÁTODO H₂: 100% (2 VOL)'}
            </div>
            <div class="flex items-center gap-3 pt-1">
              <button id="ogs-restart-btn" type="button" class="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-400/70 text-cyan-200 font-mono text-xs font-black uppercase tracking-wider cursor-pointer transition-all">
                ${isEn ? '[ RESTART ]' : '[ REINICIAR ]'}
              </button>
              <button id="ogs-finish-btn" type="button" class="px-5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-300 text-white font-mono text-xs font-black uppercase tracking-wider shadow-[0_0_18px_rgba(16,185,129,0.6)] cursor-pointer transition-all">
                ${isEn ? '[ COMPLETE & SEAL O₂ ]' : '[ COMPLETAR Y TRANSFERIR O₂ ]'}
              </button>
            </div>
          </div>
        </div>

        <!-- 3. CONSOLA INFERIOR DE CONTROL DE VOLTAJE Y ENERGÍA (3 Controles Interactivos) -->
        <div class="w-full bg-zinc-950/95 border border-zinc-700/90 rounded-xl px-3 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 z-20 shrink-0 shadow-lg">
          <!-- Control 1: Switch Maestro [ ⚡ ENERGÍA ] / [ ⚡ POWER ] (Izquierda) -->
          <button id="ogs-power-switch" type="button" class="ogs-power-toggle-btn ogs-power-off-hint px-3.5 py-2 rounded-xl flex items-center gap-3 cursor-pointer select-none shrink-0">
            <span id="ogs-power-led" class="w-3 h-3 rounded-full bg-zinc-600 border border-zinc-400 transition-all"></span>
            <div class="flex flex-col text-left">
              <span class="text-xs font-mono font-black tracking-wider text-cyan-200 uppercase">
                ${isEn ? '[ ⚡ POWER ]' : '[ ⚡ ENERGÍA ]'}
              </span>
              <span id="ogs-power-state-text" class="text-[0.58rem] font-mono font-bold text-amber-300 uppercase">
                ${isEn ? 'OFF // CLICK TO START' : 'OFF // CLIC PARA INICIAR'}
              </span>
            </div>
          </button>

          <!-- Control 2: Barra Deslizante / Medidor de VOLTAJE (Centro) -->
          <div class="flex-1 w-full flex flex-col space-y-1">
            <div class="flex items-center justify-between text-[0.62rem] font-mono font-black">
              <span class="text-zinc-300 uppercase tracking-wider">
                ${isEn ? 'ELECTROLYSIS VOLTAGE:' : 'VOLTAJE DE ELECTRÓLISIS:'}
                <strong id="ogs-voltage-pct-label" class="text-cyan-300 ml-1">38% (0.91V)</strong>
              </span>
              <span id="ogs-voltage-band-badge" class="text-emerald-400 uppercase tracking-wider">
                ${isEn ? 'OPTIMAL BAND: 65% - 85% (1.8V - 2.0V)' : 'ZONA NOMINAL: 65% - 85% (1.8V - 2.0V)'}
              </span>
            </div>

            <!-- Pista Interactiva de Voltaje -->
            <div id="ogs-voltage-track" class="ogs-voltage-track w-full" title="${isEn ? 'Click or drag to regulate voltage' : 'Haz clic o arrastra para regular el voltaje'}">
              <!-- Relleno dinámico -->
              <div id="ogs-voltage-fill" class="ogs-voltage-fill" style="width: 38%;"></div>

              <!-- Banda Óptima de Electrólisis (65% a 85%) -->
              <div class="ogs-voltage-optimal-band flex items-center justify-center">
                <span class="text-[0.52rem] font-mono font-black text-emerald-200 uppercase tracking-tighter drop-shadow">
                  ${isEn ? 'OPTIMAL 65-85%' : 'ÓPTIMO 65-85%'}
                </span>
              </div>

              <!-- Zona Roja de Peligro (> 85% Sobrevoltaje Térmico) -->
              <div class="ogs-voltage-danger-band flex items-center justify-center">
                <span class="text-[0.48rem] font-mono font-black text-rose-300 uppercase">
                  &gt;85%
                </span>
              </div>

              <!-- Aguja Indicadora Luminosa -->
              <div id="ogs-voltage-needle" class="ogs-voltage-needle" style="left: 38%;"></div>
            </div>

            <!-- Escala Inferior del Medidor -->
            <div class="flex justify-between text-[0.54rem] font-mono text-zinc-400 px-0.5">
              <span>0% (0.0V)</span>
              <span>35% (0.8V)</span>
              <span class="text-emerald-400 font-black">65% - 85% (${isEn ? 'NOMINAL ZONE' : 'ZONA NOMINAL'})</span>
              <span class="text-rose-400 font-bold">&gt;85% (${isEn ? 'THERMAL OVERVOLT' : 'SOBREVOLTAJE'})</span>
            </div>
          </div>

          <!-- Control 3: Botones Tácticos [ - ] y [ + ] (Derecha) -->
          <div class="flex items-center gap-2 shrink-0">
            <button id="ogs-volt-minus" type="button" class="ogs-step-btn w-12 h-11 rounded-xl font-mono font-black text-lg flex items-center justify-center cursor-pointer select-none" title="${isEn ? 'Decrease Voltage (Left Arrow)' : 'Disminuir Voltaje (Flecha Izquierda)'}">
              [ - ]
            </button>
            <button id="ogs-volt-plus" type="button" class="ogs-step-btn w-12 h-11 rounded-xl font-mono font-black text-lg flex items-center justify-center cursor-pointer select-none" title="${isEn ? 'Increase Voltage (Right Arrow)' : 'Aumentar Voltaje (Flecha Derecha)'}">
              [ + ]
            </button>
          </div>
        </div>
      </div>
    `;

    // Referencias DOM para actualización a 60/120 FPS sin reflows
    const stoichBadge = document.getElementById('ogs-stoich-badge');
    const stoichDot = document.getElementById('ogs-stoich-dot');
    const powerSwitchBtn = document.getElementById('ogs-power-switch');
    const powerLed = document.getElementById('ogs-power-led');
    const powerStateText = document.getElementById('ogs-power-state-text');
    const voltTrack = document.getElementById('ogs-voltage-track');
    const voltFill = document.getElementById('ogs-voltage-fill');
    const voltNeedle = document.getElementById('ogs-voltage-needle');
    const voltPctLabel = document.getElementById('ogs-voltage-pct-label');
    const voltBandBadge = document.getElementById('ogs-voltage-band-badge');
    const btnMinus = document.getElementById('ogs-volt-minus');
    const btnPlus = document.getElementById('ogs-volt-plus');

    const o2GasRect = document.getElementById('ogs-o2-gas-rect');
    const o2LiqRect = document.getElementById('ogs-o2-liquid-rect');
    const o2Meniscus = document.getElementById('ogs-o2-meniscus');
    const o2PctText = document.getElementById('ogs-o2-pct-text');

    const h2GasRect = document.getElementById('ogs-h2-gas-rect');
    const h2LiqRect = document.getElementById('ogs-h2-liquid-rect');
    const h2Meniscus = document.getElementById('ogs-h2-meniscus');
    const h2PctText = document.getElementById('ogs-h2-pct-text');

    const sideO2Vol = document.getElementById('ogs-side-o2-vol');
    const sideH2Vol = document.getElementById('ogs-side-h2-vol');
    const sideTemp = document.getElementById('ogs-side-temp');
    const sideStatus = document.getElementById('ogs-side-status');

    const telemetryLed = document.getElementById('ogs-telemetry-led');
    const telemetryTitle = document.getElementById('ogs-telemetry-title');
    const telemetryVoltReadout = document.getElementById('ogs-telemetry-volt-readout');
    const telemetryZoneReadout = document.getElementById('ogs-telemetry-zone-readout');
    const batNegV = document.getElementById('ogs-bat-neg-v');
    const batPosV = document.getElementById('ogs-bat-pos-v');
    const cableNegCore = document.getElementById('ogs-cable-neg-core');
    const cablePosCore = document.getElementById('ogs-cable-pos-core');
    const bathWave = document.getElementById('ogs-bath-wave');

    const victoryOverlay = document.getElementById('ogs-victory-overlay');
    const restartBtn = document.getElementById('ogs-restart-btn');
    const finishBtn = document.getElementById('ogs-finish-btn');

    const o2BubbleEls = o2BubbleDefs.map(b => ({ def: b, el: document.getElementById(b.id) }));
    const h2BubbleEls = h2BubbleDefs.map(b => ({ def: b, el: document.getElementById(b.id) }));

    function setPowerState(nextOn) {
      if (completed) return;
      powerOn = Boolean(nextOn);
      playOgsSwitchSound(powerOn);

      if (powerOn) {
        powerSwitchBtn?.classList.add('ogs-power-on');
        powerSwitchBtn?.classList.remove('ogs-power-off-hint');
        if (powerLed) {
          powerLed.className = 'w-3 h-3 rounded-full bg-emerald-400 border border-emerald-200 shadow-[0_0_10px_#34d399] transition-all';
        }
        if (powerStateText) {
          powerStateText.textContent = isEn ? 'ON // CURRENT ACTIVE' : 'ON // CORRIENTE ACTIVA';
          powerStateText.className = 'text-[0.58rem] font-mono font-black text-emerald-300 uppercase';
        }
        cableNegCore?.classList.add('ogs-cable-live');
        cablePosCore?.classList.add('ogs-cable-live');
        stoichBadge?.classList.add('ogs-active');
      } else {
        powerSwitchBtn?.classList.remove('ogs-power-on');
        powerSwitchBtn?.classList.add('ogs-power-off-hint');
        if (powerLed) {
          powerLed.className = 'w-3 h-3 rounded-full bg-zinc-600 border border-zinc-400 transition-all';
        }
        if (powerStateText) {
          powerStateText.textContent = isEn ? 'OFF // CLICK TO START' : 'OFF // CLIC PARA INICIAR';
          powerStateText.className = 'text-[0.58rem] font-mono font-bold text-amber-300 uppercase';
        }
        cableNegCore?.classList.remove('ogs-cable-live');
        cablePosCore?.classList.remove('ogs-cable-live');
        stoichBadge?.classList.remove('ogs-active', 'ogs-optimal');
      }
    }

    function adjustVoltage(deltaPct, withSound = true) {
      if (completed) return;
      if (!powerOn && deltaPct > 0) {
        setPowerState(true);
      }
      voltagePct = Math.max(0, Math.min(100, voltagePct + deltaPct));
      if (withSound) {
        playOgsVoltageStepSound(deltaPct >= 0 ? 1 : -1, voltagePct);
      }
    }

    function setVoltageFromPointer(e) {
      if (!voltTrack || completed) return;
      if (!powerOn) setPowerState(true);
      const rect = voltTrack.getBoundingClientRect();
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left);
      const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / Math.max(1, rect.width)) * 100));
      const dir = pct >= voltagePct ? 1 : -1;
      voltagePct = pct;
      playOgsVoltageStepSound(dir, voltagePct);
    }

    // Eventos del Switch de Energía
    powerSwitchBtn?.addEventListener('click', () => {
      setPowerState(!powerOn);
    });

    // Eventos de la Barra Deslizante de Voltaje
    voltTrack?.addEventListener('pointerdown', (e) => {
      draggingBar = true;
      setVoltageFromPointer(e);
    });
    const onPointerMove = (e) => {
      if (!draggingBar) return;
      setVoltageFromPointer(e);
    };
    const onPointerUp = () => {
      draggingBar = false;
      holdingDir = 0;
      btnMinus?.classList.remove('active');
      btnPlus?.classList.remove('active');
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Eventos de los Botones Tácticos [ - ] y [ + ]
    btnMinus?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btnMinus.classList.add('active');
      adjustVoltage(-7.5, true);
      holdingDir = -1;
    });
    btnPlus?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btnPlus.classList.add('active');
      adjustVoltage(8.5, true);
      holdingDir = 1;
    });

    // Soporte de Teclado (Flechas Izquierda/Derecha, A/D, Espacio para Energía)
    const onKeyDown = (e) => {
      if (!evaState.active || completed) return;
      if (e.key === 'ArrowLeft' || e.code === 'KeyA' || e.key === '-') {
        e.preventDefault();
        btnMinus?.classList.add('active');
        adjustVoltage(-6.5, true);
      } else if (e.key === 'ArrowRight' || e.code === 'KeyD' || e.key === '+' || e.key === '=') {
        e.preventDefault();
        btnPlus?.classList.add('active');
        adjustVoltage(7.5, true);
      } else if (e.code === 'Space') {
        e.preventDefault();
        setPowerState(!powerOn);
      }
    };
    const onKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.code === 'KeyA' || e.key === '-') {
        btnMinus?.classList.remove('active');
      } else if (e.key === 'ArrowRight' || e.code === 'KeyD' || e.key === '+' || e.key === '=') {
        btnPlus?.classList.remove('active');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Botones del Banner de Victoria: [ REINICIAR ] y [ COMPLETAR ]
    restartBtn?.addEventListener('click', () => {
      if (completeTimeout) {
        clearTimeout(completeTimeout);
        completeTimeout = null;
      }
      completed = false;
      progress = 0;
      voltagePct = 42;
      evaState.timeLeft = evaState.maxTime || 15.0;
      victoryOverlay?.classList.add('hidden');
      setPowerState(true);
      lastTime = performance.now();
      evaState.o2LoopFrame = requestAnimationFrame(loop);
    });

    finishBtn?.addEventListener('click', () => {
      if (completeTimeout) {
        clearTimeout(completeTimeout);
        completeTimeout = null;
      }
      cleanupElectrolysisListeners();
      resolveEvaMission(true);
    });

    function cleanupElectrolysisListeners() {
      if (completeTimeout) {
        clearTimeout(completeTimeout);
        completeTimeout = null;
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    }
    evaState.activeCleanup = cleanupElectrolysisListeners;
    if (window.activeMinigameLoops) window.activeMinigameLoops.cleanups.push(cleanupElectrolysisListeners);

    let lastTime = performance.now();

    function loop(now) {
      if (!evaState.active || evaState.o2Phase !== 'OGS') {
        cleanupElectrolysisListeners();
        return;
      }
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;

      if (!completed) {
        // Ajuste continuo si mantiene presionado [ - ] o [ + ]
        if (holdingDir !== 0) {
          adjustVoltage(holdingDir * 32.0 * dt, false);
        }

        // Fluctuación natural hacia abajo de la red cuando ENERGÍA está activa
        if (powerOn && !draggingBar && holdingDir === 0) {
          const gridDrop = 10.5 + Math.sin(now * 0.0045) * 2.5;
          voltagePct = Math.max(8, voltagePct - gridDrop * dt);
        }

        const inOptimalBand = powerOn && voltagePct >= 65 && voltagePct <= 85;
        const isOvervolt = powerOn && voltagePct > 85;
        const isSubOptimal = powerOn && voltagePct >= 15 && voltagePct < 65;

        if (inOptimalBand) {
          // Avance óptimo estequiométrico (~28% por segundo -> ~3.5s para 100%)
          progress = Math.min(100, progress + 28.5 * dt);
          if (now - lastBubbleBeep > 240) {
            playOgsElectrolysisPulse(progress);
            lastBubbleBeep = now;
          }
        } else if (isSubOptimal) {
          // Avance lento sub-nominal proporcional al voltaje
          const subRate = ((voltagePct - 15) / 50) * 8.5;
          progress = Math.min(100, progress + subRate * dt);
        } else if (isOvervolt) {
          // Sobrevoltaje térmico (>85%): inestabilidad y alerta
          progress = Math.max(0, progress - 3.5 * dt);
          if (now - lastOvervoltBeep > 380) {
            playEvaOverheatAlert();
            lastOvervoltBeep = now;
          }
        }

        // Reducir progresivamente el empañamiento del visor conforme se produce O2 puro
        const fogEl = document.getElementById('eva-visor-fog');
        if (fogEl && progress > 0) {
          const cleanFog = Math.max(0.04, 0.14 - (progress / 100) * 0.10);
          fogEl.style.setProperty('--eva-fog-opacity', cleanFog.toFixed(2));
        }
      }

      // Actualizar Medidor de Voltaje
      const vRound = Math.round(voltagePct);
      const volts = ((voltagePct / 100) * 2.4).toFixed(2);
      const amps = powerOn ? ((voltagePct / 100) * 54.0).toFixed(1) : '0.0';
      if (voltFill) voltFill.style.width = `${voltagePct.toFixed(1)}%`;
      if (voltNeedle) voltNeedle.style.left = `${voltagePct.toFixed(1)}%`;
      if (voltPctLabel) voltPctLabel.textContent = `${vRound}% (${volts}V)`;

      const inOptimal = powerOn && voltagePct >= 65 && voltagePct <= 85;
      const isOver = powerOn && voltagePct > 85;

      // Actualizar Telemetría de Energía y Estado
      const kpaOut = (18.0 + (progress / 100) * 17.5).toFixed(1);
      if (telemetryTitle) {
        telemetryTitle.textContent = `${isEn ? 'POWER' : 'ENERGÍA'}: ${basePwrPct}% // ${kpaOut} kPa O2 OUTPUT`;
      }
      if (telemetryVoltReadout) {
        telemetryVoltReadout.textContent = powerOn
          ? `${isEn ? 'CELL BUS' : 'BUS CELDA'}: ${volts}V DC // ${amps} A`
          : `${isEn ? 'CELL BUS: 0.00V DC // 0.0 A (OFF)' : 'BUS CELDA: 0.00V DC // 0.0 A (OFF)'}`;
      }
      if (batNegV) batNegV.textContent = powerOn ? `-${(volts / 2).toFixed(2)}V` : '-0.00V';
      if (batPosV) batPosV.textContent = powerOn ? `+${(volts / 2).toFixed(2)}V` : '+0.00V';

      if (!powerOn) {
        if (telemetryLed) telemetryLed.setAttribute('fill', '#f59e0b');
        if (telemetryZoneReadout) {
          telemetryZoneReadout.textContent = isEn
            ? '[ FLIP POWER SWITCH TO ENERGIZE CELL ]'
            : '[ ENCIENDE EL SWITCH DE ENERGÍA PARA INICIAR ]';
          telemetryZoneReadout.setAttribute('fill', '#fbbf24');
        }
        if (sideStatus) {
          sideStatus.textContent = isEn ? 'STATUS: STANDBY (OFF)' : 'ESTADO: EN ESPERA (OFF)';
          sideStatus.setAttribute('fill', '#f59e0b');
        }
        stoichBadge?.classList.remove('ogs-optimal');
      } else if (inOptimal) {
        if (telemetryLed) telemetryLed.setAttribute('fill', '#34d399');
        if (telemetryZoneReadout) {
          telemetryZoneReadout.textContent = isEn
            ? '★ OPTIMAL ELECTROLYSIS (1.8V - 2.0V) // H₂:O₂ = 2:1 ★'
            : '★ ELECTRÓLISIS ÓPTIMA (1.8V - 2.0V) // H₂:O₂ = 2:1 ★';
          telemetryZoneReadout.setAttribute('fill', '#34d399');
        }
        if (voltBandBadge) {
          voltBandBadge.textContent = isEn ? '★ OPTIMAL ZONE LOCKED (65% - 85%) ★' : '★ ZONA NOMINAL ACTIVA (65% - 85%) ★';
          voltBandBadge.className = 'text-emerald-300 font-black uppercase tracking-wider';
        }
        if (sideStatus) {
          sideStatus.textContent = isEn ? 'STATUS: OPTIMAL REACTION' : 'ESTADO: REACCIÓN ÓPTIMA';
          sideStatus.setAttribute('fill', '#34d399');
        }
        if (sideTemp) {
          sideTemp.textContent = 'TEMP: 68.4°C // NOMINAL';
          sideTemp.setAttribute('fill', '#34d399');
        }
        stoichBadge?.classList.add('ogs-optimal');
        if (stoichDot) stoichDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping';
      } else if (isOver) {
        if (telemetryLed) telemetryLed.setAttribute('fill', '#f43f5e');
        if (telemetryZoneReadout) {
          telemetryZoneReadout.textContent = isEn
            ? '[!] WARNING: THERMAL OVERVOLTAGE (>85%) — LOWER VOLTAGE!'
            : '[!] ALERTA: SOBREVOLTAJE TÉRMICO (>85%) — ¡BAJA EL VOLTAJE!';
          telemetryZoneReadout.setAttribute('fill', '#fb7185');
        }
        if (voltBandBadge) {
          voltBandBadge.textContent = isEn ? '[!] THERMAL OVERVOLTAGE (>85%)' : '[!] SOBREVOLTAJE TÉRMICO (>85%)';
          voltBandBadge.className = 'text-rose-400 font-black uppercase tracking-wider animate-pulse';
        }
        if (sideStatus) {
          sideStatus.textContent = isEn ? 'STATUS: OVERVOLTAGE!' : 'ESTADO: ¡SOBREVOLTAJE!';
          sideStatus.setAttribute('fill', '#fb7185');
        }
        if (sideTemp) {
          sideTemp.textContent = 'TEMP: 94.2°C // HIGH!';
          sideTemp.setAttribute('fill', '#fb7185');
        }
        stoichBadge?.classList.remove('ogs-optimal');
      } else {
        if (telemetryLed) telemetryLed.setAttribute('fill', '#38bdf8');
        if (telemetryZoneReadout) {
          telemetryZoneReadout.textContent = isEn
            ? 'LOW VOLTAGE (<65%) — CLICK [ + ] TO REACH 65%-85% BAND'
            : 'VOLTAJE BAJO (<65%) — USA [ + ] PARA SUBIR A LA ZONA 65%-85%';
          telemetryZoneReadout.setAttribute('fill', '#38bdf8');
        }
        if (voltBandBadge) {
          voltBandBadge.textContent = isEn ? 'RAISE VOLTAGE TO 65% - 85%' : 'SUBE EL VOLTAJE A 65% - 85%';
          voltBandBadge.className = 'text-cyan-300 uppercase tracking-wider';
        }
        if (sideStatus) {
          sideStatus.textContent = isEn ? 'STATUS: SUB-NOMINAL' : 'ESTADO: SUB-NOMINAL';
          sideStatus.setAttribute('fill', '#38bdf8');
        }
        if (sideTemp) {
          sideTemp.textContent = 'TEMP: 65.5°C // NOMINAL';
          sideTemp.setAttribute('fill', '#67e8f9');
        }
        stoichBadge?.classList.remove('ogs-optimal');
        if (stoichDot) stoichDot.className = 'w-1.5 h-1.5 rounded-full bg-cyan-400';
      }

      // =====================================================================
      // FÍSICA VISUAL EN VIVO: DESPLAZAMIENTO ESTEQUIOMÉTRICO 1:2 Y BURBUJAS
      // Tubo Izquierdo Ánodo (O2): 0% -> 100% desplaza 80px (y=34 a y=114 META)
      // Tubo Derecho Cátodo (H2): 0% -> 100% desplaza 160px (y=34 a y=194 META)
      // =====================================================================
      const pNorm = Math.max(0, Math.min(1, progress / 100));
      const pRound = Math.floor(progress);

      const o2GasH = pNorm * 80;
      const o2MeniscusY = 34 + o2GasH;
      const o2LiqH = 226 - o2MeniscusY;

      if (o2GasRect) o2GasRect.setAttribute('height', o2GasH.toFixed(1));
      if (o2LiqRect) {
        o2LiqRect.setAttribute('y', o2MeniscusY.toFixed(1));
        o2LiqRect.setAttribute('height', o2LiqH.toFixed(1));
      }
      if (o2Meniscus) o2Meniscus.setAttribute('cy', o2MeniscusY.toFixed(1));
      if (o2PctText) o2PctText.textContent = `O₂: ${pRound}%`;
      if (sideO2Vol) sideO2Vol.textContent = `${(pNorm * 1.0).toFixed(2)} / 1.0 VOL (${pRound}%)`;

      const h2GasH = pNorm * 160;
      const h2MeniscusY = 34 + h2GasH;
      const h2LiqH = 226 - h2MeniscusY;

      if (h2GasRect) h2GasRect.setAttribute('height', h2GasH.toFixed(1));
      if (h2LiqRect) {
        h2LiqRect.setAttribute('y', h2MeniscusY.toFixed(1));
        h2LiqRect.setAttribute('height', h2LiqH.toFixed(1));
      }
      if (h2Meniscus) h2Meniscus.setAttribute('cx', '346');
      if (h2Meniscus) h2Meniscus.setAttribute('cy', h2MeniscusY.toFixed(1));
      if (h2PctText) h2PctText.textContent = `H₂: ${pRound}%`;
      if (sideH2Vol) sideH2Vol.textContent = `${(pNorm * 2.0).toFixed(2)} / 2.0 VOL (${pRound}%)`;

      // Onda suave en la cuba electrolítica (transform GPU)
      if (bathWave) {
        const waveShift = Math.sin(now * 0.004) * 3.5;
        bathWave.setAttribute('transform', `translate(${waveShift.toFixed(2)}, 0)`);
      }

      // Animación de Burbujas Subiendo desde los 2 Electrodos Metálicos Internos
      const bubbleSpeed = powerOn ? (0.35 + (voltagePct / 100) * 1.45) : 0;
      const bubbleOpacity = powerOn ? Math.min(0.95, 0.25 + (voltagePct / 100) * 0.75) : 0;

      o2BubbleEls.forEach(({ def, el }) => {
        if (!el) return;
        if (!powerOn || voltagePct < 5) {
          el.setAttribute('opacity', '0');
          return;
        }
        def.relY = (def.relY + dt * bubbleSpeed * def.speedMul) % 1;
        const startY = 202;
        const endY = Math.min(198, o2MeniscusY + 4);
        const curY = startY - def.relY * Math.max(8, startY - endY);
        const curX = def.baseX + Math.sin(now * 0.006 * def.wobbleFreq) * def.wobbleAmp;
        el.setAttribute('cx', curX.toFixed(1));
        el.setAttribute('cy', curY.toFixed(1));
        el.setAttribute('opacity', bubbleOpacity.toFixed(2));
      });

      h2BubbleEls.forEach(({ def, el }) => {
        if (!el) return;
        if (!powerOn || voltagePct < 5) {
          el.setAttribute('opacity', '0');
          return;
        }
        def.relY = (def.relY + dt * bubbleSpeed * def.speedMul * 1.15) % 1;
        const startY = 202;
        const endY = Math.min(198, h2MeniscusY + 4);
        const curY = startY - def.relY * Math.max(6, startY - endY);
        const curX = def.baseX + Math.sin(now * 0.006 * def.wobbleFreq) * def.wobbleAmp;
        el.setAttribute('cx', curX.toFixed(1));
        el.setAttribute('cy', curY.toFixed(1));
        el.setAttribute('opacity', bubbleOpacity.toFixed(2));
      });

      // Comprobar Estado de Victoria (100% en ambos tubos al tocar sus líneas META)
      if (progress >= 100 && !completed) {
        completed = true;
        // Pausar temporizador de traje EVA para que no pueda expirar durante la celebración
        if (evaState.timerInterval) {
          clearInterval(evaState.timerInterval);
          evaState.timerInterval = null;
        }
        sfx.playMinigameSuccess();
        victoryOverlay?.classList.remove('hidden');

        // Otorgar recompensa automáticamente tras una breve pausa si no pulsa Reiniciar
        completeTimeout = setTimeout(() => {
          if (completed && evaState.active) {
            cleanupElectrolysisListeners();
            resolveEvaMission(true);
          }
        }, 1900);
      }

      evaState.o2LoopFrame = requestAnimationFrame(loop);
    }

    evaState.o2LoopFrame = requestAnimationFrame(loop);
  }

  // =======================================================================
  // MINIJUEGO 2: ESCUDO — SOLDADURA DE REGOLITO CON SOPLETE DE PLASMA
  // =======================================================================
  function renderShieldMinigame(stage, moduleTitle, objectiveText, isEn) {
    evaState.radWelding = false;
    evaState.radOverheated = false;
    evaState.radStillTime = 0;
    evaState.radTotalCracks = 3;
    evaState.radCracksSealed = 0;
    evaState.radLastPos = { x: 0, y: 0 };

    if (moduleTitle) {
      moduleTitle.innerHTML = `<span class="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]"></span><span>${isEn ? 'RADIATION SHIELD // PLASMA SINTERING TORCH' : 'ESCUDO DE RADIACIÓN // SOLDADURA DE REGOLITO CON PLASMA'}</span>`;
    }
    if (objectiveText) {
      objectiveText.textContent = isEn
        ? 'HOLD LEFT CLICK & DRAG THE PLASMA TORCH ALONG ALL 3 MICRO-CRACKS TO SINTER REGOLITH'
        : 'MANTÉN PRESIONADO Y DESLIZA EL SOPLETE DE PLASMA A LO LARGO DE LAS 3 MICRO-FISURAS';
    }

    // 3 Trazados de micro-fisuras con nodos interactivos a lo largo de su trayectoria
    evaState.radCracks = [
      {
        id: 'crack-0',
        name: isEn ? 'CRACK 01 // NW' : 'FISURA 01 // NO',
        badgePos: { x: 130, y: 165 },
        sealed: false,
        nodes: [
          { x: 120, y: 80, sealed: false },
          { x: 155, y: 95, sealed: false },
          { x: 190, y: 90, sealed: false },
          { x: 220, y: 120, sealed: false },
          { x: 260, y: 135, sealed: false },
          { x: 295, y: 125, sealed: false },
          { x: 330, y: 150, sealed: false }
        ]
      },
      {
        id: 'crack-1',
        name: isEn ? 'CRACK 02 // NE' : 'FISURA 02 // NE',
        badgePos: { x: 485, y: 145 },
        sealed: false,
        nodes: [
          { x: 480, y: 70, sealed: false },
          { x: 515, y: 85, sealed: false },
          { x: 550, y: 80, sealed: false },
          { x: 585, y: 110, sealed: false },
          { x: 620, y: 105, sealed: false },
          { x: 660, y: 130, sealed: false },
          { x: 700, y: 120, sealed: false }
        ]
      },
      {
        id: 'crack-2',
        name: isEn ? 'CRACK 03 // SOUTH' : 'FISURA 03 // SUR',
        badgePos: { x: 285, y: 305 },
        sealed: false,
        nodes: [
          { x: 260, y: 240, sealed: false },
          { x: 300, y: 230, sealed: false },
          { x: 340, y: 250, sealed: false },
          { x: 385, y: 245, sealed: false },
          { x: 430, y: 270, sealed: false },
          { x: 480, y: 260, sealed: false },
          { x: 530, y: 280, sealed: false }
        ]
      }
    ];

    function makeBolt(hx, hy) {
      return `<polygon points="${hx},${hy-3} ${hx+2.6},${hy-1.5} ${hx+2.6},${hy+1.5} ${hx},${hy+3} ${hx-2.6},${hy+1.5} ${hx-2.6},${hy-1.5}" fill="#334155" stroke="#64748b" stroke-width="0.8"/><circle cx="${hx}" cy="${hy}" r="1" fill="#94a3b8"/>`;
    }

    function makeSegmentSvg(p1, p2, cIdx, sIdx) {
      const d = `M ${p1.x},${p1.y} L ${p2.x},${p2.y}`;
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * 9;
      const ny = (dx / len) * 9;
      const x1 = (mx - nx).toFixed(1);
      const y1 = (my - ny).toFixed(1);
      const x2 = (mx + nx).toFixed(1);
      const y2 = (my + ny).toFixed(1);

      return `
        <g id="weld-seg-${cIdx}-${sIdx}" class="opacity-0 transition-opacity duration-200 pointer-events-none">
          <path d="${d}" stroke="url(#sinteredWeldGrad)" stroke-width="11" stroke-linecap="round"/>
          <path d="${d}" stroke="#e2e8f0" stroke-width="2.5" stroke-linecap="round"/>
        </g>
        <g id="clamp-${cIdx}-${sIdx}" class="opacity-0 transition-opacity duration-200 pointer-events-none">
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="${x1}" cy="${y1}" r="2" fill="#e2e8f0" stroke="#0284c7" stroke-width="0.8"/>
          <circle cx="${x2}" cy="${y2}" r="2" fill="#e2e8f0" stroke="#0284c7" stroke-width="0.8"/>
        </g>`;
    }

    const boltsSvg = [
      [22, 22], [378, 22], [22, 183], [378, 183], [200, 22], [200, 183],
      [422, 22], [778, 22], [422, 183], [778, 183], [600, 22], [600, 183],
      [395, 45], [395, 95], [395, 145],
      [22, 217], [778, 217], [22, 378], [778, 378], [200, 378], [400, 378], [600, 378],
      [120, 217], [240, 217], [360, 217], [480, 217], [600, 217], [720, 217]
    ].map(([x, y]) => makeBolt(x, y)).join('');

    stage.innerHTML = `
      <div id="eva-shield-container" class="eva-shield-dome flex flex-col justify-between p-4 relative select-none">
        <!-- Telemetría Radiológica Superior -->
        <div class="flex items-center justify-between z-20 bg-zinc-950/90 px-4 py-2 rounded-xl border border-purple-500/40 shadow-lg">
          <!-- Tasa de radiación y barra de fuga dinámica -->
          <div class="flex items-center gap-3">
            <div class="relative flex items-center justify-center w-7 h-7 rounded-lg bg-purple-950/80 border border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.4)]">
              <span class="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
              <span class="absolute w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            </div>
            <div class="flex flex-col">
              <div class="flex items-center gap-2">
                <span class="text-[0.65rem] font-mono font-black text-purple-300 uppercase tracking-wider">${isEn ? 'COSMIC RADIATION LEAKAGE' : 'FUGA DE RADIACIÓN CÓSMICA'}</span>
                <span class="text-[0.6rem] font-mono text-zinc-500">[ALARA METRICS]</span>
              </div>
              <div class="flex items-center gap-2">
                <span id="eva-rad-level-display" class="text-xs font-mono font-black text-rose-400">480 mSv/h [CRITICAL LEAK]</span>
                <div class="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/60">
                  <div id="eva-rad-leak-bar" class="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-500" style="width: 100%;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 3 Indicadores LED de Brechas -->
          <div class="flex items-center gap-2">
            <div id="eva-breach-led-0" class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/60 border border-rose-500/60 transition-all duration-300">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span class="text-[0.65rem] font-mono font-bold text-rose-300">[ BREACH 01 ]</span>
            </div>
            <div id="eva-breach-led-1" class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/60 border border-rose-500/60 transition-all duration-300">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span class="text-[0.65rem] font-mono font-bold text-rose-300">[ BREACH 02 ]</span>
            </div>
            <div id="eva-breach-led-2" class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/60 border border-rose-500/60 transition-all duration-300">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span class="text-[0.65rem] font-mono font-bold text-rose-300">[ BREACH 03 ]</span>
            </div>
          </div>

          <!-- Contador de Brechas Selladas -->
          <div class="flex items-center gap-2">
            <span id="eva-cracks-sealed-count" class="text-xs font-mono font-black text-zinc-300 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-700">
              ${isEn ? 'SEALED: 0 / 3' : 'SELLADAS: 0 / 3'}
            </span>
          </div>
        </div>

        <!-- SVG de Blindaje Estructural del Domo y Fisuras -->
        <svg id="eva-cracks-svg" class="eva-crack-svg" viewBox="0 0 800 400" preserveAspectRatio="none">
          <defs>
            <!-- Gradiente de Chapas de Blindaje de Titanio -->
            <linearGradient id="hullPlateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#182030"/>
              <stop offset="50%" stop-color="#0f1520"/>
              <stop offset="100%" stop-color="#070a10"/>
            </linearGradient>
            <!-- Gradiente de Cordón de Soldadura de Regolito Fundido -->
            <linearGradient id="sinteredWeldGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#0284c7"/>
              <stop offset="35%" stop-color="#38bdf8"/>
              <stop offset="50%" stop-color="#e0f2fe"/>
              <stop offset="65%" stop-color="#38bdf8"/>
              <stop offset="100%" stop-color="#0284c7"/>
            </linearGradient>
            <!-- Patrón de Retícula Táctica de Micro-coordenadas -->
            <pattern id="tacticalGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#38bdf8" stroke-width="0.5" stroke-opacity="0.08"/>
            </pattern>
          </defs>

          <!-- Fondo de Retícula Táctica -->
          <rect width="800" height="400" fill="url(#tacticalGrid)"/>

          <!-- Placas Estructurales de Titanio / Regolito -->
          <!-- Panel 1 (NO) -->
          <rect x="15" y="15" width="370" height="175" rx="8" fill="url(#hullPlateGrad)" stroke="#334155" stroke-width="1.5" />
          <rect x="25" y="25" width="350" height="155" rx="4" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="8 6" />
          
          <!-- Panel 2 (NE) -->
          <rect x="415" y="15" width="370" height="175" rx="8" fill="url(#hullPlateGrad)" stroke="#334155" stroke-width="1.5" />
          <rect x="425" y="25" width="350" height="155" rx="4" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="8 6" />

          <!-- Panel 3 (Sur) -->
          <rect x="15" y="210" width="770" height="175" rx="8" fill="url(#hullPlateGrad)" stroke="#334155" stroke-width="1.5" />
          <rect x="25" y="220" width="750" height="155" rx="4" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="8 6" />

          <!-- Juntas de Dilatación -->
          <rect x="393" y="10" width="14" height="185" fill="#090d16" stroke="#1e293b" stroke-width="1"/>
          <rect x="10" y="196" width="780" height="10" fill="#090d16" stroke="#1e293b" stroke-width="1"/>

          <!-- Remaches Hexagonales de Titanio -->
          <g id="eva-hull-bolts" class="pointer-events-none">
            ${boltsSvg}
          </g>

          <!-- Serigrafía Técnica Estarcida en el Casco -->
          <g font-family="'Share Tech Mono', 'JetBrains Mono', monospace" fill="#475569" letter-spacing="1" class="pointer-events-none">
            <text x="35" y="42" font-size="8.5" font-weight="bold" fill="#64748b">[ HDPE + SINTERED REGOLITH // 2.4m ]</text>
            <text x="35" y="54" font-size="7.5">[ SHACKLETON DOME HULL // SECTOR 04-A ]</text>
            
            <text x="435" y="42" font-size="8.5" font-weight="bold" fill="#64748b">[ ALARA RADIATION BARRIER // CLASS-V ]</text>
            <text x="435" y="54" font-size="7.5">[ EXPANSION JOINT TITANIUM-6AL-4V ]</text>

            <text x="35" y="238" font-size="8.5" font-weight="bold" fill="#64748b">[ DOME PERIMETER STRUCTURAL SHIELDING // SINTERING BAY ]</text>
            <text x="35" y="250" font-size="7.5">[ SPEC: NASA-STD-3001 // EVA SURFACE OPS ]</text>
          </g>

          <!-- Miras Láser de Referencia Técnica -->
          <g stroke="#38bdf8" stroke-width="0.8" opacity="0.3" class="pointer-events-none">
            <line x1="195" y1="95" x2="205" y2="95"/>
            <line x1="200" y1="90" x2="200" y2="100"/>
            <line x1="595" y1="95" x2="605" y2="95"/>
            <line x1="600" y1="90" x2="600" y2="100"/>
            <line x1="395" y1="295" x2="405" y2="295"/>
            <line x1="400" y1="290" x2="400" y2="300"/>
          </g>

          <!-- Capas Multicapa de Fisuras Abiertas -->
          ${evaState.radCracks.map((crack) => {
            const pathD = crack.nodes.map((n, i) => (i === 0 ? `M ${n.x},${n.y}` : `L ${n.x},${n.y}`)).join(' ');
            return `
              <g id="group-${crack.id}" class="pointer-events-none">
                <!-- Sombra de Fractura Profunda -->
                <path id="shadow-${crack.id}" d="${pathD}" stroke="#03050a" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none" />
                <!-- Borde Térmico Incandescente -->
                <path id="edge-${crack.id}" d="${pathD}" class="eva-fissure-edge transition-opacity duration-500" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
                <!-- Núcleo de Plasma Vibrante -->
                <path id="core-${crack.id}" d="${pathD}" class="eva-fissure-core transition-opacity duration-500" stroke="#fde047" stroke-width="2" stroke-dasharray="6 3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              </g>
            `;
          }).join('')}

          <!-- Cordones de Soldadura de Regolito y Grapas Transversales (por tramos) -->
          ${evaState.radCracks.map((crack, cIdx) =>
            crack.nodes.slice(0, -1).map((node, sIdx) =>
              makeSegmentSvg(node, crack.nodes[sIdx + 1], cIdx, sIdx)
            ).join('')
          ).join('')}

          <!-- Retículas Tácticas de Apuntado Láser (Nodos) -->
          <g id="eva-nodes-group" class="pointer-events-none">
            ${evaState.radCracks.map((crack, cIdx) =>
              crack.nodes.map((node, nIdx) => `
                <g id="node-${cIdx}-${nIdx}" class="eva-weld-target cursor-crosshair" data-crack="${cIdx}" data-node="${nIdx}" transform="translate(${node.x}, ${node.y})">
                  <rect x="-11" y="-11" width="22" height="22" rx="3" class="target-box fill-zinc-950/80 stroke-rose-500" stroke-width="1.6" stroke-dasharray="3 2"/>
                  <line x1="-7" y1="0" x2="7" y2="0" class="stroke-rose-400" stroke-width="1.2"/>
                  <line x1="0" y1="-7" x2="0" y2="7" class="stroke-rose-400" stroke-width="1.2"/>
                  <circle cx="0" cy="0" r="2.5" class="target-dot fill-rose-500"/>
                </g>
              `).join('')
            ).join('')}
          </g>

          <!-- Sellos de Brecha 100% Reparada -->
          ${evaState.radCracks.map((crack, cIdx) => `
            <g id="crack-seal-badge-${cIdx}" class="opacity-0 transition-opacity duration-300 pointer-events-none">
              <rect x="${crack.badgePos.x}" y="${crack.badgePos.y}" width="220" height="24" rx="5" fill="#022c22" stroke="#10b981" stroke-width="1.5"/>
              <text x="${crack.badgePos.x + 110}" y="${crack.badgePos.y + 16}" fill="#6ee7b7" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="bold" text-anchor="middle" letter-spacing="0.5">
                ✓ [ HULL BREACH 0${cIdx + 1} SEALED // 100% ]
              </text>
            </g>
          `).join('')}
        </svg>

        <!-- Haz de Plasma Centrado en Cursor -->
        <div id="eva-plasma-beam" class="eva-plasma-beam hidden"></div>

        <!-- Banner de Alerta de Sobrecalentamiento -->
        <div id="eva-overheat-alert" class="hidden absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-lg eva-overheat-badge font-mono font-black text-xs uppercase tracking-widest text-center shadow-2xl">
          ${isEn ? 'WARNING: PLASMA TORCH OVERHEAT! COOLING 0.8s' : '¡ALERTA: SOBRECALENTAMIENTO DEL SOPLETE! ENFRIANDO 0.8s'}
        </div>

        <!-- Barra de Control Térmico e Instrucción Inferior -->
        <div class="z-20 flex items-center justify-between bg-zinc-950/80 px-4 py-1.5 rounded-xl border border-zinc-800 text-[0.65rem] font-mono text-zinc-400">
          <!-- Termómetro Digital en Tiempo Real -->
          <div class="flex items-center gap-2">
            <span class="text-zinc-500 uppercase">${isEn ? 'TORCH TEMP:' : 'TEMP SOPLETE:'}</span>
            <span id="eva-torch-temp-val" class="font-bold text-sky-400">1,200°C</span>
            <div class="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/60">
              <div id="eva-torch-temp-bar" class="h-full bg-gradient-to-r from-sky-400 to-rose-500 transition-all duration-75" style="width: 0%;"></div>
            </div>
          </div>
          <!-- Instrucción Táctil -->
          <div class="text-center text-zinc-400">
            ${isEn ? 'Keep torch moving along cracks. Holding in one spot > 1.5s overheats torch.' : 'Mueve el soplete a lo largo de las grietas. Quedarte en un punto > 1.5s lo sobrecalienta.'}
          </div>
          <!-- Estado Hardware -->
          <div class="text-right text-zinc-500 hidden sm:block">
            <span>[ SINTERING TORCH: 2.8kW ]</span>
          </div>
        </div>
      </div>
    `;

    // Sonido de Geiger inicial sincronizado
    if (evaState.geigerInterval) clearInterval(evaState.geigerInterval);
    evaState.geigerInterval = setInterval(() => {
      if (!evaState.active) return;
      const unsealed = evaState.radTotalCracks - evaState.radCracksSealed;
      if (unsealed > 0 && Math.random() < (unsealed * 0.35)) {
        sfx.playGeigerTick(0.08);
      }
    }, 120);

    // Manejo de Soplete de Plasma y Detección de Trayectoria
    const container = document.getElementById('eva-shield-container');
    const plasmaBeam = document.getElementById('eva-plasma-beam');
    const overheatAlert = document.getElementById('eva-overheat-alert');
    const radLevelDisp = document.getElementById('eva-rad-level-display');
    const radLeakBar = document.getElementById('eva-rad-leak-bar');
    const cracksCountDisp = document.getElementById('eva-cracks-sealed-count');
    const torchTempVal = document.getElementById('eva-torch-temp-val');
    const torchTempBar = document.getElementById('eva-torch-temp-bar');

    let isMouseDown = false;
    let lastMoveTime = performance.now();
    let heatInterval = null;

    const checkTorchHeat = () => {
      if (!isMouseDown || evaState.radOverheated) return;
      const now = performance.now();
      const idleMs = now - lastMoveTime;
      const heatRatio = Math.min(1, idleMs / 1500);
      const temp = Math.floor(1200 + heatRatio * 1600);

      if (torchTempVal) {
        torchTempVal.textContent = `${temp.toLocaleString()}°C`;
        if (temp >= 2400) {
          torchTempVal.className = 'font-bold text-rose-400 animate-pulse';
        } else if (temp >= 1800) {
          torchTempVal.className = 'font-bold text-amber-400';
        } else {
          torchTempVal.className = 'font-bold text-sky-400';
        }
      }
      if (torchTempBar) {
        torchTempBar.style.width = `${Math.round(heatRatio * 100)}%`;
      }

      if (idleMs >= 1500) {
        triggerOverheat();
      }
    };

    const triggerOverheat = () => {
      evaState.radOverheated = true;
      isMouseDown = false;
      if (heatInterval) { clearInterval(heatInterval); heatInterval = null; evaState.heatInterval = null; }
      stopEvaPlasmaTorch();
      if (plasmaBeam) plasmaBeam.classList.add('hidden');
      if (overheatAlert) overheatAlert.classList.remove('hidden');
      if (torchTempVal) {
        torchTempVal.textContent = '1,200°C';
        torchTempVal.className = 'font-bold text-sky-400';
      }
      if (torchTempBar) {
        torchTempBar.style.width = '0%';
      }
      playEvaOverheatAlert();

      setTimeout(() => {
        evaState.radOverheated = false;
        if (overheatAlert) overheatAlert.classList.add('hidden');
      }, 800);
    };

    const activateTorch = (e) => {
      if (evaState.radOverheated) return;
      isMouseDown = true;
      lastMoveTime = performance.now();
      startEvaPlasmaTorch();
      if (plasmaBeam) plasmaBeam.classList.remove('hidden');
      if (heatInterval) clearInterval(heatInterval);
      heatInterval = setInterval(checkTorchHeat, 50);
      evaState.heatInterval = heatInterval;
      if (window.activeMinigameLoops) window.activeMinigameLoops.intervals.push(heatInterval);
      updateTorchPos(e);
    };

    const deactivateTorch = () => {
      isMouseDown = false;
      if (heatInterval) { clearInterval(heatInterval); heatInterval = null; evaState.heatInterval = null; }
      stopEvaPlasmaTorch();
      if (plasmaBeam) plasmaBeam.classList.add('hidden');
      if (torchTempVal) {
        torchTempVal.textContent = '1,200°C';
        torchTempVal.className = 'font-bold text-sky-400';
      }
      if (torchTempBar) {
        torchTempBar.style.width = '0%';
      }
    };

    const updateCrackWeldSegments = (cIdx) => {
      const crack = evaState.radCracks[cIdx];
      if (!crack) return;
      for (let i = 0; i < crack.nodes.length - 1; i++) {
        if (crack.nodes[i].sealed && crack.nodes[i + 1].sealed) {
          const segEl = document.getElementById(`weld-seg-${cIdx}-${i}`);
          const clampEl = document.getElementById(`clamp-${cIdx}-${i}`);
          if (segEl) segEl.classList.remove('opacity-0');
          if (clampEl) clampEl.classList.remove('opacity-0');
        }
      }
    };

    const updateTorchPos = (e) => {
      if (!container || !plasmaBeam) return;
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : undefined);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : undefined);
      if (clientX === undefined || clientY === undefined) return;

      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      plasmaBeam.style.left = `${relX}px`;
      plasmaBeam.style.top = `${relY}px`;

      if (isMouseDown && !evaState.radOverheated) {
        // Detección de inmovilidad (> 1.5s quieto genera sobrecalentamiento)
        const dist = Math.hypot(relX - evaState.radLastPos.x, relY - evaState.radLastPos.y);
        const now = performance.now();
        if (dist > 6) {
          lastMoveTime = now;
          evaState.radLastPos = { x: relX, y: relY };
        }
        checkTorchHeat();

        // Conversión a coordenadas relativas del SVG (800 x 400)
        const svgX = (relX / rect.width) * 800;
        const svgY = (relY / rect.height) * 400;

        // Comprobar colisión con los nodos de soldadura (radio <= 32px)
        evaState.radCracks.forEach((crack, cIdx) => {
          if (crack.sealed) return;
          let newlySealed = false;
          crack.nodes.forEach((node, nIdx) => {
            if (node.sealed) return;
            const nodeDist = Math.hypot(svgX - node.x, svgY - node.y);
            if (nodeDist <= 32) {
              node.sealed = true;
              newlySealed = true;
              const nodeEl = document.getElementById(`node-${cIdx}-${nIdx}`);
              if (nodeEl) nodeEl.classList.add('node-sealed');
              sfx.playCargoUnlock();
            }
          });

          if (newlySealed) {
            updateCrackWeldSegments(cIdx);
          }

          // Comprobar si toda la grieta fue sellada
          const allNodesSealed = crack.nodes.every((n) => n.sealed);
          if (allNodesSealed && !crack.sealed) {
            crack.sealed = true;
            evaState.radCracksSealed += 1;

            // Ocultar borde y núcleo incandescentes dejando el cordón de soldadura limpio
            const edgeEl = document.getElementById(`edge-${crack.id}`);
            const coreEl = document.getElementById(`core-${crack.id}`);
            if (edgeEl) edgeEl.classList.add('opacity-0');
            if (coreEl) coreEl.classList.add('opacity-0');

            // Mostrar placa digital de grieta sellada al 100%
            const badgeEl = document.getElementById(`crack-seal-badge-${cIdx}`);
            if (badgeEl) badgeEl.classList.remove('opacity-0');

            // Actualizar indicador LED individual de la brecha
            const breachLed = document.getElementById(`eva-breach-led-${cIdx}`);
            if (breachLed) {
              breachLed.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-500/60 transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
              breachLed.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span class="text-[0.65rem] font-mono font-bold text-emerald-300">[ BREACH 0${cIdx + 1} SEALED ]</span>`;
            }

            playEvaCartridgeInsert();

            // Actualizar nivel de radiación y barra dinámica en HUD
            const sealedCount = evaState.radCracksSealed;
            if (sealedCount === 1) {
              if (radLevelDisp) {
                radLevelDisp.textContent = isEn ? '240 mSv/h [LEAK REDUCED]' : '240 mSv/h [FUGA REDUCIDA]';
                radLevelDisp.className = 'text-xs font-mono font-black text-amber-400';
              }
              if (radLeakBar) {
                radLeakBar.style.width = '60%';
                radLeakBar.className = 'h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500';
              }
            } else if (sealedCount === 2) {
              if (radLevelDisp) {
                radLevelDisp.textContent = isEn ? '80 mSv/h [MINOR LEAK]' : '80 mSv/h [FUGA MENOR]';
                radLevelDisp.className = 'text-xs font-mono font-black text-yellow-300';
              }
              if (radLeakBar) {
                radLeakBar.style.width = '25%';
                radLeakBar.className = 'h-full bg-gradient-to-r from-yellow-400 to-cyan-400 transition-all duration-500';
              }
            } else if (sealedCount >= 3) {
              if (radLevelDisp) {
                radLevelDisp.textContent = isEn ? '0.08 mSv/h [SHIELD NOMINAL]' : '0.08 mSv/h [ESCUDO NOMINAL]';
                radLevelDisp.className = 'text-xs font-mono font-black text-emerald-400';
              }
              if (radLeakBar) {
                radLeakBar.style.width = '4%';
                radLeakBar.className = 'h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500';
              }
            }

            if (cracksCountDisp) {
              cracksCountDisp.textContent = isEn
                ? `SEALED: ${evaState.radCracksSealed} / 3`
                : `SELLADAS: ${evaState.radCracksSealed} / 3`;
            }

            // Victoria si las 3 están selladas
            if (evaState.radCracksSealed >= evaState.radTotalCracks) {
              deactivateTorch();
              resolveEvaMission(true);
            }
          }
        });
      }
    };

    container.addEventListener('mousedown', activateTorch);
    window.addEventListener('mouseup', deactivateTorch);
    container.addEventListener('mousemove', updateTorchPos);

    container.addEventListener('touchstart', (e) => { e.preventDefault(); activateTorch(e); });
    window.addEventListener('touchend', deactivateTorch);
    container.addEventListener('touchmove', (e) => { e.preventDefault(); updateTorchPos(e); });

    const cleanupShieldListeners = () => {
      deactivateTorch();
      window.removeEventListener('mouseup', deactivateTorch);
      window.removeEventListener('touchend', deactivateTorch);
    };
    evaState.activeCleanup = cleanupShieldListeners;
    if (window.activeMinigameLoops) window.activeMinigameLoops.cleanups.push(cleanupShieldListeners);
  }

  // =======================================================================
  // MINIJUEGO 3: ENERGÍA — SINCRONIZACIÓN DE FASES STIRLING (KILOPOWER)
  // =======================================================================
  function renderEnergyMinigame(stage, moduleTitle, objectiveText, isEn) {
    let phasesLocked = 0;
    let needlePos = 0; // 0 a 100 (%)
    let needleDir = 1; // 1 o -1
    const needleSpeed = 56; // % por segundo (velocidad cómoda y rítmica)
    let lastTime = performance.now();

    if (moduleTitle) {
      moduleTitle.innerHTML = `<span class="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span><span>${isEn ? 'KILOPOWER // STIRLING CONVERTER PHASE SYNC' : 'REACTOR KILOPOWER // SINCRONIZACIÓN DE FASES STIRLING'}</span>`;
    }
    if (objectiveText) {
      objectiveText.textContent = isEn
        ? 'CLICK [ ENGAGE STIRLING PHASE ] WHEN NEEDLE PASSES THROUGH THE CENTRAL GOLDEN ZONE (3 LOCKS)'
        : 'PULSA [ ACOPLAR FASE STIRLING ] CUANDO LA AGUJA CRUCE LA ZONA DORADA CENTRAL (3 ACIERTOS)';
    }

    stage.innerHTML = `
      <div id="eva-stirling-panel" class="eva-kilopower-panel flex flex-col justify-between items-center p-3 sm:p-5 relative select-none">
        <!-- Remaches Hexagonales en las 4 Esquinas -->
        <div class="absolute top-2.5 left-2.5 w-3 h-3 flex items-center justify-center pointer-events-none opacity-70">
          <div class="w-2.5 h-2.5 bg-zinc-700 border border-zinc-500 rounded-sm rotate-45 flex items-center justify-center">
            <div class="w-1 h-1 bg-zinc-400 rounded-full"></div>
          </div>
        </div>
        <div class="absolute top-2.5 right-2.5 w-3 h-3 flex items-center justify-center pointer-events-none opacity-70">
          <div class="w-2.5 h-2.5 bg-zinc-700 border border-zinc-500 rounded-sm rotate-45 flex items-center justify-center">
            <div class="w-1 h-1 bg-zinc-400 rounded-full"></div>
          </div>
        </div>
        <div class="absolute bottom-2.5 left-2.5 w-3 h-3 flex items-center justify-center pointer-events-none opacity-70">
          <div class="w-2.5 h-2.5 bg-zinc-700 border border-zinc-500 rounded-sm rotate-45 flex items-center justify-center">
            <div class="w-1 h-1 bg-zinc-400 rounded-full"></div>
          </div>
        </div>
        <div class="absolute bottom-2.5 right-2.5 w-3 h-3 flex items-center justify-center pointer-events-none opacity-70">
          <div class="w-2.5 h-2.5 bg-zinc-700 border border-zinc-500 rounded-sm rotate-45 flex items-center justify-center">
            <div class="w-1 h-1 bg-zinc-400 rounded-full"></div>
          </div>
        </div>

        <!-- Serigrafía Lateral de Conductos de Refrigerante y Bus -->
        <div class="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[0.52rem] font-mono font-bold text-amber-500/60 uppercase tracking-widest hidden md:block pointer-events-none whitespace-nowrap">
          [ NaK COOLANT LOOP // 800°C ]
        </div>
        <div class="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 origin-center text-[0.52rem] font-mono font-bold text-cyan-500/60 uppercase tracking-widest hidden md:block pointer-events-none whitespace-nowrap">
          [ 120V DC BUS // 400Hz ]
        </div>

        <!-- Barra de Telemetría Superior del Reactor -->
        <div class="w-full flex items-center justify-between z-20 bg-zinc-950/90 px-4 py-2 rounded-xl border border-cyan-500/40 shadow-lg">
          <div class="flex items-center gap-3">
            <div class="relative flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <span class="w-3 h-3 rounded-full bg-cyan-400 animate-ping"></span>
              <span class="absolute w-2 h-2 rounded-full bg-cyan-300"></span>
            </div>
            <div class="flex flex-col">
              <span class="text-[0.62rem] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                ${isEn ? 'KILOPOWER KRUSTY REACTOR // STIRLING BUS' : 'REACTOR NUCLEAR KILOPOWER // BUS STIRLING'}
              </span>
              <span class="text-[0.58rem] font-mono text-zinc-400">
                ${isEn ? 'CORE TEMP: 1,073 K (800°C) // NaK FLOW: 0.42 kg/s' : 'TEMP NÚCLEO: 1.073 K (800°C) // FLUJO NaK: 0.42 kg/s'}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <!-- Potencia Stirling Generada -->
            <div class="flex flex-col items-end">
              <span class="text-[0.58rem] font-mono text-zinc-400 uppercase">${isEn ? 'TOTAL POWER OUTPUT' : 'POTENCIA GENERADA'}</span>
              <div class="flex items-baseline gap-1">
                <span id="eva-stirling-kw" class="text-xl md:text-2xl font-black font-mono text-cyan-300">0.0 kW</span>
                <span class="text-[0.6rem] font-mono text-zinc-500">/ 10.0 kW</span>
              </div>
            </div>

            <!-- Badges de Fase A, B, C -->
            <div class="hidden sm:flex items-center gap-1.5 border-l border-zinc-800 pl-3">
              <span id="eva-stirling-phase-0" class="px-2 py-0.5 rounded text-[0.6rem] font-mono font-black bg-zinc-900 border border-zinc-700 text-zinc-500 transition-all duration-300">
                ${isEn ? '[ PHASE A ]' : '[ FASE A ]'}
              </span>
              <span id="eva-stirling-phase-1" class="px-2 py-0.5 rounded text-[0.6rem] font-mono font-black bg-zinc-900 border border-zinc-700 text-zinc-500 transition-all duration-300">
                ${isEn ? '[ PHASE B ]' : '[ FASE B ]'}
              </span>
              <span id="eva-stirling-phase-2" class="px-2 py-0.5 rounded text-[0.6rem] font-mono font-black bg-zinc-900 border border-zinc-700 text-zinc-500 transition-all duration-300">
                ${isEn ? '[ PHASE C ]' : '[ FASE C ]'}
              </span>
            </div>
          </div>
        </div>

        <!-- Módulo Visual SVG de 3 Turbogeneradores Stirling y Núcleo Cherenkov -->
        <div class="w-full flex items-center justify-center my-auto z-10 py-1">
          <svg id="eva-kilopower-svg" class="w-full max-w-xl h-auto" viewBox="0 0 560 115" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="stirlingCaseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#1e293b"/>
                <stop offset="50%" stop-color="#0f172a"/>
                <stop offset="100%" stop-color="#020617"/>
              </linearGradient>
              <linearGradient id="copperCoilGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#d97706"/>
                <stop offset="50%" stop-color="#92400e"/>
                <stop offset="100%" stop-color="#78350f"/>
              </linearGradient>
              <linearGradient id="copperGlowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#6ee7b7"/>
                <stop offset="50%" stop-color="#10b981"/>
                <stop offset="100%" stop-color="#047857"/>
              </linearGradient>
              <linearGradient id="nakPipeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#78350f"/>
                <stop offset="50%" stop-color="#f59e0b"/>
                <stop offset="100%" stop-color="#78350f"/>
              </linearGradient>
              <radialGradient id="cherenkovGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#67e8f9" stop-opacity="0.95"/>
                <stop offset="40%" stop-color="#06b6d4" stop-opacity="0.6"/>
                <stop offset="75%" stop-color="#0891b2" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="#0e7490" stop-opacity="0"/>
              </radialGradient>
            </defs>

            <!-- Cables de Conexión de Fases hacia el Núcleo -->
            <path d="M 120 57.5 L 244 57.5" fill="none" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
            <path id="eva-flow-line-0" d="M 120 57.5 L 244 57.5" fill="none" stroke="#64748b" stroke-width="1.8"/>
            <path id="eva-flow-pulse-0" d="M 120 57.5 L 244 57.5" fill="none" stroke="#34d399" stroke-width="2.5" stroke-dasharray="6 4" class="opacity-0 transition-opacity duration-300 eva-power-flow"/>

            <path d="M 230 57.5 L 244 57.5" fill="none" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
            <path id="eva-flow-line-1" d="M 230 57.5 L 244 57.5" fill="none" stroke="#64748b" stroke-width="1.8"/>
            <path id="eva-flow-pulse-1" d="M 230 57.5 L 244 57.5" fill="none" stroke="#34d399" stroke-width="2.5" stroke-dasharray="6 4" class="opacity-0 transition-opacity duration-300 eva-power-flow"/>

            <path d="M 330 57.5 L 316 57.5" fill="none" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
            <path id="eva-flow-line-2" d="M 330 57.5 L 316 57.5" fill="none" stroke="#64748b" stroke-width="1.8"/>
            <path id="eva-flow-pulse-2" d="M 330 57.5 L 316 57.5" fill="none" stroke="#34d399" stroke-width="2.5" stroke-dasharray="6 4" class="opacity-0 transition-opacity duration-300 eva-power-flow"/>

            <!-- Tuberías de Sodio Líquido NaK (Loop Térmico) -->
            <path d="M 440 46 L 316 46" fill="none" stroke="url(#nakPipeGrad)" stroke-width="3" stroke-linecap="round"/>
            <path d="M 440 69 L 316 69" fill="none" stroke="url(#nakPipeGrad)" stroke-width="3" stroke-linecap="round"/>

            <!-- UNIDAD STIRLING 0: ROTOR ALFA (FASE A) -->
            <g id="eva-stirling-unit-0" class="transition-all duration-300">
              <rect id="eva-stirling-casing-0" x="20" y="18" width="100" height="79" rx="6" fill="url(#stirlingCaseGrad)" stroke="#475569" stroke-width="1.5" class="transition-colors duration-300"/>
              <rect x="22" y="20" width="96" height="16" rx="4" fill="#0f172a"/>
              <text x="28" y="32" fill="#94a3b8" font-family="'JetBrains Mono', monospace" font-size="7.5" font-weight="bold">${isEn ? 'PHASE A // ALFA' : 'FASE A // ALFA'}</text>
              <circle id="eva-stirling-led-0" cx="108" cy="28" r="3" fill="#f59e0b" class="transition-colors duration-300 shadow-[0_0_6px_#f59e0b]"/>
              <rect x="26" y="40" width="88" height="34" rx="4" fill="#020617" stroke="#334155" stroke-width="1"/>
              <g id="eva-coils-0">
                <rect x="32" y="43" width="14" height="28" rx="2" fill="url(#copperCoilGrad)"/>
                <rect x="50" y="43" width="14" height="28" rx="2" fill="url(#copperCoilGrad)"/>
                <rect x="68" y="43" width="14" height="28" rx="2" fill="url(#copperCoilGrad)"/>
                <rect x="86" y="43" width="14" height="28" rx="2" fill="url(#copperCoilGrad)"/>
              </g>
              <line x1="26" y1="57" x2="114" y2="57" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
              <text id="eva-stirling-status-0" x="70" y="89" fill="#71717a" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="bold" text-anchor="middle">
                ${isEn ? 'UNLOCKED' : 'EN ESPERA'}
              </text>
            </g>

            <!-- UNIDAD STIRLING 1: ROTOR BETA (FASE B) -->
            <g id="eva-stirling-unit-1" class="transition-all duration-300">
              <rect id="eva-stirling-casing-1" x="130" y="18" width="100" height="79" rx="6" fill="url(#stirlingCaseGrad)" stroke="#475569" stroke-width="1.5" class="transition-colors duration-300"/>
              <rect x="132" y="20" width="96" height="16" rx="4" fill="#0f172a"/>
              <text x="138" y="32" fill="#94a3b8" font-family="'JetBrains Mono', monospace" font-size="7.5" font-weight="bold">${isEn ? 'PHASE B // BETA' : 'FASE B // BETA'}</text>
              <circle id="eva-stirling-led-1" cx="218" cy="28" r="3" fill="#f59e0b" class="transition-colors duration-300 shadow-[0_0_6px_#f59e0b]"/>
              <rect x="136" y="40" width="88" height="34" rx="4" fill="#020617" stroke="#334155" stroke-width="1"/>
              <g id="eva-coils-1">
                <rect x="142" y="43" width="14" height="28" rx="2" fill="url(#copperCoilGrad)"/>
                <rect x="160" y="43" width="14" height="28" rx="2" fill="url(#copperCoilGrad)"/>
                <rect x="178" y="43" width="14" height="28" rx="2" fill="url(#copperCoilGrad)"/>
                <rect x="196" y="43" width="14" height="28" rx="2" fill="url(#copperCoilGrad)"/>
              </g>
              <line x1="136" y1="57" x2="224" y2="57" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
              <text id="eva-stirling-status-1" x="180" y="89" fill="#71717a" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="bold" text-anchor="middle">
                ${isEn ? 'UNLOCKED' : 'EN ESPERA'}
              </text>
            </g>

            <!-- NÚCLEO CENTRAL KILOPOWER U-235 Y ANILLO B4C -->
            <g id="eva-kilopower-core-group">
              <!-- Anillo Reflector Exterior de Carburo de Boro (B4C) -->
              <circle cx="280" cy="57.5" r="44" fill="#0a0f18" stroke="#334155" stroke-width="2"/>
              <line x1="280" y1="13.5" x2="280" y2="18.5" stroke="#64748b" stroke-width="1.5"/>
              <line x1="280" y1="96.5" x2="280" y2="101.5" stroke="#64748b" stroke-width="1.5"/>
              <line x1="236" y1="57.5" x2="241" y2="57.5" stroke="#64748b" stroke-width="1.5"/>
              <line x1="319" y1="57.5" x2="324" y2="57.5" stroke="#64748b" stroke-width="1.5"/>

              <!-- Resplandor de Radiación Cherenkov Dinámico -->
              <circle id="eva-svg-cherenkov" cx="280" cy="57.5" r="40" fill="url(#cherenkovGrad)" opacity="0.35" class="transition-all duration-500"/>

              <!-- Vasija Hexagonal del Reactor Kilopower U-235 -->
              <polygon id="eva-svg-core-hex" points="280,26 307,42 307,73 280,89 253,73 253,42" fill="#030712" stroke="#0891b2" stroke-width="2" class="transition-colors duration-300"/>

              <!-- Órbitas de Resonancia Magnética Cuántica -->
              <ellipse cx="280" cy="57.5" rx="27" ry="10" fill="none" stroke="#22d3ee" stroke-width="0.8" opacity="0.4" transform="rotate(30 280 57.5)"/>
              <ellipse cx="280" cy="57.5" rx="27" ry="10" fill="none" stroke="#22d3ee" stroke-width="0.8" opacity="0.4" transform="rotate(-30 280 57.5)"/>

              <!-- Centro del Reactor y Telemetría Digital Interna -->
              <circle cx="280" cy="57.5" r="16" fill="#021a28" stroke="#38bdf8" stroke-width="1.5"/>
              <text x="280" y="54" fill="#38bdf8" font-family="'JetBrains Mono', monospace" font-size="7.5" font-weight="bold" text-anchor="middle">U-235</text>
              <text id="eva-svg-core-kw" x="280" y="64" fill="#67e8f9" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="900" text-anchor="middle">0.0 kW</text>
            </g>

            <!-- UNIDAD STIRLING 2: ROTOR GAMMA (FASE C) -->
            <g id="eva-stirling-unit-2" class="transition-all duration-300">
              <rect id="eva-stirling-casing-2" x="330" y="18" width="100" height="79" rx="6" fill="url(#stirlingCaseGrad)" stroke="#475569" stroke-width="1.5" class="transition-colors duration-300"/>
              <rect x="332" y="20" width="96" height="16" rx="4" fill="#0f172a"/>
              <text x="338" y="32" fill="#94a3b8" font-family="'JetBrains Mono', monospace" font-size="7.5" font-weight="bold">${isEn ? 'PHASE C // GAMMA' : 'FASE C // GAMMA'}</text>
              <circle id="eva-stirling-led-2" cx="418" cy="28" r="3" fill="#f59e0b" class="transition-colors duration-300 shadow-[0_0_6px_#f59e0b]"/>
              <rect x="336" y="40" width="88" height="34" rx="4" fill="#020617" stroke="#334155" stroke-width="1"/>
              <g id="eva-coils-2">
                <rect x="342" y="43" width="14" height="28" rx="2" fill="url(#copperCoilGrad)"/>
                <rect x="360" y="43" width="14" height="28" rx="2" fill="url(#copperCoilGrad)"/>
                <rect x="378" y="43" width="14" height="28" rx="2" fill="url(#copperCoilGrad)"/>
                <rect x="396" y="43" width="14" height="28" rx="2" fill="url(#copperCoilGrad)"/>
              </g>
              <line x1="336" y1="57" x2="424" y2="57" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
              <text id="eva-stirling-status-2" x="380" y="89" fill="#71717a" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="bold" text-anchor="middle">
                ${isEn ? 'UNLOCKED' : 'EN ESPERA'}
              </text>
            </g>

            <!-- MÓDULO 4: RADIADOR NaK & BOMBA ELECTROMAGNÉTICA -->
            <g id="eva-nak-unit">
              <rect x="440" y="18" width="100" height="79" rx="6" fill="#090d16" stroke="#b45309" stroke-width="1.5"/>
              <rect x="442" y="20" width="96" height="16" rx="4" fill="#291a08"/>
              <text x="448" y="32" fill="#f59e0b" font-family="'JetBrains Mono', monospace" font-size="7.5" font-weight="bold">NaK LOOP // 800°C</text>
              <circle cx="528" cy="28" r="3" fill="#eab308" class="animate-pulse"/>
              <rect x="446" y="40" width="88" height="34" rx="4" fill="#180e04" stroke="#78350f" stroke-width="1"/>
              <g stroke="#ca8a04" stroke-width="1.5">
                <line x1="454" y1="44" x2="454" y2="70"/>
                <line x1="464" y1="44" x2="464" y2="70"/>
                <line x1="474" y1="44" x2="474" y2="70"/>
                <line x1="484" y1="44" x2="484" y2="70"/>
                <line x1="494" y1="44" x2="494" y2="70"/>
                <line x1="504" y1="44" x2="504" y2="70"/>
                <line x1="514" y1="44" x2="514" y2="70"/>
                <line x1="524" y1="44" x2="524" y2="70"/>
              </g>
              <text x="490" y="89" fill="#f59e0b" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="bold" text-anchor="middle">
                ${isEn ? 'HEAT REJECTION' : 'DISIPACIÓN TÉRMICA'}
              </text>
            </g>
          </svg>
        </div>

        <!-- Osciloscopio de Calibración Electromagnética -->
        <div class="w-full flex flex-col items-center justify-center my-auto z-20 px-2 sm:px-4">
          <div class="eva-stirling-track relative w-full max-w-xl flex items-center">
            <!-- Cuadrícula técnica sutil del osciloscopio -->
            <svg class="absolute inset-0 w-full h-full pointer-events-none rounded-xl overflow-hidden opacity-30" preserveAspectRatio="none" viewBox="0 0 540 50">
              <defs>
                <pattern id="trackGrid" width="27" height="12.5" patternUnits="userSpaceOnUse">
                  <path d="M 27 0 L 0 0 0 12.5" fill="none" stroke="#38bdf8" stroke-width="0.5" stroke-opacity="0.3"/>
                </pattern>
              </defs>
              <rect width="540" height="50" fill="url(#trackGrid)"/>
              <!-- Onda sinusoidal decorativa -->
              <path d="M 0 25 Q 67.5 5 135 25 T 270 25 T 405 25 T 540 25" fill="none" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.6"/>
            </svg>

            <!-- Marcas de Graduación Milimétricas -->
            <div class="absolute inset-x-0 bottom-1 flex justify-between px-3 text-[0.55rem] font-mono text-zinc-500 pointer-events-none">
              <span>| 0°</span>
              <span>| 45°</span>
              <span>| 90°</span>
              <span>| 135°</span>
              <span>| 180°</span>
            </div>

            <!-- Zona Dorada Central: 35% a 65% (30% de ancho) -->
            <div id="eva-stirling-gold" class="eva-stirling-golden-zone flex items-center justify-center">
              <!-- Corchetes de sujeción electromagnética -->
              <div class="absolute -top-1.5 left-0 w-3 h-1.5 border-t-2 border-l-2 border-amber-400"></div>
              <div class="absolute -top-1.5 right-0 w-3 h-1.5 border-t-2 border-r-2 border-amber-400"></div>
              <div class="absolute -bottom-1.5 left-0 w-3 h-1.5 border-b-2 border-l-2 border-amber-400"></div>
              <div class="absolute -bottom-1.5 right-0 w-3 h-1.5 border-b-2 border-r-2 border-amber-400"></div>

              <span class="text-[0.55rem] font-mono font-black text-amber-300 uppercase tracking-widest whitespace-nowrap px-1">
                ${isEn ? '★ 50Hz HARMONIC LOCK ZONE ★' : '★ ZONA DE ACOPLE 50Hz ★'}
              </span>
            </div>

            <!-- Cabezal / Aguja Oscilante de Doble Filo -->
            <div id="eva-stirling-needle" class="eva-stirling-needle" style="left: 0%;">
              <div class="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-[6px] border-b-cyan-400"></div>
              <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-[6px] border-t-cyan-400"></div>
              <div class="absolute inset-x-0.5 inset-y-1 bg-white rounded-sm shadow-[0_0_8px_#ffffff]"></div>
            </div>
          </div>

          <!-- Sub-etiquetas Bilingües Limpias -->
          <div class="flex justify-between w-full max-w-xl text-[0.6rem] font-mono font-bold text-zinc-400 mt-2 px-2">
            <span>0° (${isEn ? 'MIN PHASE' : 'FASE MÍN'})</span>
            <span class="text-amber-400 font-black">★ ${isEn ? '50Hz HARMONIC LOCK (35% - 65%)' : 'ACOPLE ÓPTIMO (35% - 65%)'} ★</span>
            <span>180° (${isEn ? 'MAX PHASE' : 'FASE MÁX'})</span>
          </div>
        </div>

        <!-- Interruptor Hidráulico de Alta Tensión (Botón Inferior) -->
        <div class="w-full max-w-md mx-auto z-20 pb-1">
          <button id="eva-stirling-btn" type="button" class="eva-stirling-btn w-full py-3 px-6 rounded-2xl font-mono font-black text-xs sm:text-sm tracking-widest uppercase cursor-pointer flex items-center justify-between shadow-2xl">
            <div class="absolute left-0 top-0 bottom-0 w-3 bg-[repeating-linear-gradient(45deg,#f59e0b_0_4px,#18181b_4px_8px)] opacity-60"></div>
            
            <div class="flex items-center gap-2 pl-2">
              <span class="text-base text-cyan-300">⚡</span>
              <span id="eva-stirling-btn-label">
                ${isEn ? '[ ENGAGE STIRLING PHASE (0/3) ]' : '[ ACOPLAR FASE STIRLING (0/3) ]'}
              </span>
            </div>

            <!-- 3 LEDs de Fases Acopladas Integrados en el Botón -->
            <div class="flex items-center gap-1.5 pr-2">
              <span id="eva-btn-led-0" class="w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-600 transition-all duration-300"></span>
              <span id="eva-btn-led-1" class="w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-600 transition-all duration-300"></span>
              <span id="eva-btn-led-2" class="w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-600 transition-all duration-300"></span>
            </div>

            <div class="absolute right-0 top-0 bottom-0 w-3 bg-[repeating-linear-gradient(-45deg,#f59e0b_0_4px,#18181b_4px_8px)] opacity-60"></div>
          </button>
        </div>
      </div>
    `;

    const needleEl = document.getElementById('eva-stirling-needle');
    const goldZone = document.getElementById('eva-stirling-gold');
    const btn = document.getElementById('eva-stirling-btn');
    const btnLabel = document.getElementById('eva-stirling-btn-label');
    const kwDisp = document.getElementById('eva-stirling-kw');

    const kwValues = ['0.0 kW', '3.3 kW', '6.6 kW', '10.0 kW'];

    // Bucle de Oscilación Suave
    function stirlingLoop(now) {
      if (!evaState.active || (evaState.roomKey !== 'pwr' && evaState.roomKey !== 'energy' && evaState.roomKey !== 'power')) return;
      const dt = Math.min(0.06, (now - lastTime) / 1000);
      lastTime = now;

      needlePos += needleDir * needleSpeed * dt;
      if (needlePos >= 100) {
        needlePos = 100;
        needleDir = -1;
      } else if (needlePos <= 0) {
        needlePos = 0;
        needleDir = 1;
      }

      if (needleEl) {
        needleEl.style.left = `${needlePos}%`;
      }

      evaState.pwrLoopFrame = requestAnimationFrame(stirlingLoop);
    }
    evaState.pwrLoopFrame = requestAnimationFrame(stirlingLoop);

    // Clic en el Botón de Acople
    btn?.addEventListener('click', () => {
      if (phasesLocked >= 3 || !evaState.active) return;

      // Zona Dorada: 35% a 65% (30% de ancho)
      const inGoldZone = needlePos >= 35 && needlePos <= 65;

      if (inGoldZone) {
        phasesLocked++;
        sfx.playWireConnect();
        sfx.playCargoUnlock();

        // 1. Actualizar Telemetría y LEDs de Fase Superior
        if (kwDisp) kwDisp.textContent = kwValues[phasesLocked];
        const phaseBadge = document.getElementById(`eva-stirling-phase-${phasesLocked - 1}`);
        if (phaseBadge) {
          phaseBadge.className = 'px-2 py-0.5 rounded text-[0.6rem] font-mono font-black bg-emerald-950/90 border border-emerald-400 text-emerald-300 shadow-[0_0_10px_#34d399]';
        }

        // 2. Actualizar el Módulo Stirling SVG específico
        const uIdx = phasesLocked - 1;
        const casing = document.getElementById(`eva-stirling-casing-${uIdx}`);
        const led = document.getElementById(`eva-stirling-led-${uIdx}`);
        const statusText = document.getElementById(`eva-stirling-status-${uIdx}`);
        const flowPulse = document.getElementById(`eva-flow-pulse-${uIdx}`);
        const coils = document.getElementById(`eva-coils-${uIdx}`);

        if (casing) {
          casing.setAttribute('stroke', '#10b981');
          casing.setAttribute('stroke-width', '2');
        }
        if (led) {
          led.setAttribute('fill', '#34d399');
          led.setAttribute('class', 'shadow-[0_0_8px_#34d399]');
        }
        if (statusText) {
          statusText.textContent = isEn ? 'LOCKED // 3.3 kW' : 'ACOPLADO // 3.3 kW';
          statusText.setAttribute('fill', '#34d399');
        }
        if (flowPulse) {
          flowPulse.classList.remove('opacity-0');
        }
        if (coils) {
          coils.querySelectorAll('rect').forEach(r => r.setAttribute('fill', 'url(#copperGlowGrad)'));
        }

        // 3. Actualizar Núcleo SVG Central
        const svgCherenkov = document.getElementById('eva-svg-cherenkov');
        const svgCoreKw = document.getElementById('eva-svg-core-kw');
        const svgCoreHex = document.getElementById('eva-svg-core-hex');
        if (svgCherenkov) {
          svgCherenkov.setAttribute('opacity', `${0.35 + phasesLocked * 0.22}`);
          svgCherenkov.setAttribute('r', `${40 + phasesLocked * 2}`);
        }
        if (svgCoreKw) {
          svgCoreKw.textContent = kwValues[phasesLocked];
        }
        if (svgCoreHex && phasesLocked >= 3) {
          svgCoreHex.setAttribute('stroke', '#34d399');
          svgCoreHex.setAttribute('fill', '#022c22');
        }

        // 4. Actualizar LED en el botón inferior
        const btnLed = document.getElementById(`eva-btn-led-${phasesLocked - 1}`);
        if (btnLed) {
          btnLed.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-300 shadow-[0_0_8px_#34d399] transition-all duration-300';
        }

        // 5. Destello de acople en el botón
        if (btn) {
          btn.style.boxShadow = '0 0 35px #38bdf8';
          setTimeout(() => { if (btn) btn.style.boxShadow = ''; }, 200);
        }

        if (btnLabel) {
          btnLabel.textContent = isEn
            ? `[ ENGAGE STIRLING PHASE (${phasesLocked}/3) ]`
            : `[ ACOPLAR FASE STIRLING (${phasesLocked}/3) ]`;
        }

        if (phasesLocked >= 3) {
          if (btnLabel) {
            btnLabel.textContent = isEn
              ? '✓ ALL PHASES LOCKED (10.0 kW)!'
              : '¡✓ TODAS LAS FASES ACOPLADAS (10.0 kW)!';
          }
          if (btn) {
            btn.className = 'eva-stirling-btn w-full py-3 px-6 rounded-2xl font-mono font-black text-xs sm:text-sm tracking-widest uppercase cursor-pointer flex items-center justify-between shadow-2xl !bg-emerald-600 !border-emerald-400 !text-white shadow-[0_0_35px_#34d399]';
          }
          cancelAnimationFrame(evaState.pwrLoopFrame);
          setTimeout(() => {
            resolveEvaMission(true);
          }, 500);
        }
      } else {
        // Fallo: parpadeo rojo/ámbar sin perder, sigue intentando
        sfx.playWireBuzz();
        if (needleEl) {
          needleEl.style.backgroundColor = '#f43f5e';
          needleEl.style.borderColor = '#fb7185';
          needleEl.style.boxShadow = '0 0 24px #f43f5e';
          setTimeout(() => {
            if (needleEl) {
              needleEl.style.backgroundColor = '#ffffff';
              needleEl.style.borderColor = '#38bdf8';
              needleEl.style.boxShadow = '0 0 16px #38bdf8, 0 0 32px #0284c7';
            }
          }, 220);
        }
        if (goldZone) {
          goldZone.style.backgroundColor = 'rgba(244, 63, 94, 0.28)';
          setTimeout(() => {
            if (goldZone) goldZone.style.backgroundColor = '';
          }, 220);
        }
      }
    });
  }

  // =======================================================================
  // MINIJUEGO 4: COMIDA / BIOMASA — SIEMBRA Y CRECIMIENTO HIDROPÓNICO ACELERADO (3 PLANTAS)
  // =======================================================================
  function renderFoodMinigame(stage, moduleTitle, objectiveText, isEn) {
    if (moduleTitle) {
      moduleTitle.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span><span>${isEn ? 'REC CAM-01 // NASA APH VEGGIE GROWTH CHAMBER' : 'REC CAM-01 // CÁMARA HIDROPÓNICA NASA APH VEGGIE'}</span>`;
    }
    if (objectiveText) {
      objectiveText.textContent = isEn
        ? 'PLANT SEEDS IN ALL 3 HYDROPONIC PODS — WAIT 3.5s FOR ACCELERATED GROWTH & HARVEST AT 100%'
        : 'PLANTA LAS SEMILLAS EN LAS 3 CÁPSULAS HIDROPÓNICAS — ESPERA 3.5s DE CRECIMIENTO ACELERADO Y COSECHA AL 100%';
    }

    const GROWTH_DURATION_MS = 3500; // Exactamente 3.5 segundos por planta

    const podsData = [
      {
        id: 0,
        code: 'POD-01',
        title: isEn ? 'POD-01 // APOGEE WHEAT' : 'POD-01 // TRIGO APOGEE',
        sub: isEn ? 'TRITICUM AESTIVUM // DWARF CV.' : 'TRITICUM AESTIVUM // VAR. ENANA',
        npkLabel: 'NPK 18-8-14 // 630nm',
        state: 'empty', // 'empty' | 'growing' | 'ready' | 'harvested'
        progress: 0,    // 0 a 100
        plantedAt: 0,
        readySoundPlayed: false
      },
      {
        id: 1,
        code: 'POD-02',
        title: isEn ? 'POD-02 // LUNAR SOY' : 'POD-02 // SOYA LUNAR',
        sub: isEn ? 'GLYCINE MAX // HIGH-PROTEIN' : 'GLYCINE MAX // ALTA PROTEÍNA',
        npkLabel: 'NPK 14-12-18 // 450nm',
        state: 'empty',
        progress: 0,
        plantedAt: 0,
        readySoundPlayed: false
      },
      {
        id: 2,
        code: 'POD-03',
        title: isEn ? 'POD-03 // SPACE LETTUCE' : 'POD-03 // LECHUGA ESPACIAL',
        sub: isEn ? 'LACTUCA SATIVA // OUTREDGEOUS' : 'LACTUCA SATIVA // OUTREDGEOUS',
        npkLabel: 'NPK 16-6-16 // 630nm',
        state: 'empty',
        progress: 0,
        plantedAt: 0,
        readySoundPlayed: false
      }
    ];

    let allReadyTimestamp = 0;
    let missionResolved = false;
    let autoWinTimeout = null;

    // Función auxiliar que construye el SVG evolutivo de cada planta según su especie (0: Trigo, 1: Soya, 2: Lechuga)
    function buildCropEvolutionSvg(idx) {
      if (idx === 0) {
        // POD-01: TRIGO APOGEE (Tallos rectos, hojas lanceoladas y espigas doradas en Etapa 3)
        return `
          <!-- ETAPA 1: Germinación (1% - 35%) - Plant Pillow abriéndose + raíces blancas + primer brote -->
          <g id="aph-stage1-${idx}" opacity="0" style="transition: opacity 0.18s ease;">
            <!-- Plant Pillow abierta -->
            <ellipse cx="90" cy="142" rx="16" ry="5.5" fill="#cbd5e1" stroke="#64748b" stroke-width="1.2"/>
            <path d="M 82 140 Q 90 135 98 140" fill="none" stroke="#0f172a" stroke-width="1.5"/>
            <!-- Raíces blancas descendiendo al tanque NPK -->
            <g id="aph-roots-${idx}" style="transform-origin: 90px 145px; transform: scaleY(0.2);">
              <path d="M 90 145 Q 84 160 80 176 M 90 145 Q 96 162 100 178 M 90 145 V 180 M 86 158 Q 76 168 74 176 M 94 158 Q 104 168 106 176" fill="none" stroke="#f8fafc" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>
            </g>
            <!-- Primer brote verde -->
            <path d="M 90 141 Q 88 128 92 120" fill="none" stroke="#4ade80" stroke-width="2.6" stroke-linecap="round"/>
            <path d="M 90 132 Q 82 126 80 130 Q 84 134 90 133 Z" fill="#22c55e"/>
          </g>

          <!-- ETAPA 2: Desarrollo Vegetativo (36% - 85%) - Tallo escalable + hojas esmeralda -->
          <g id="aph-stage2-${idx}" opacity="0" style="transform-origin: 90px 142px; transform: scaleY(0.35); transition: opacity 0.18s ease;">
            <path d="M 90 142 V 62" stroke="url(#aphStemGrad)" stroke-width="3.2" stroke-linecap="round"/>
            <path d="M 85 142 Q 83 102 82 72" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
            <path d="M 95 142 Q 97 104 98 74" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
            <!-- Hojas intermedias lanceoladas -->
            <path d="M 90 120 Q 66 108 56 116 Q 72 122 90 124 Z" fill="url(#aphLeafGrad)"/>
            <path d="M 90 114 Q 114 102 124 110 Q 108 118 90 118 Z" fill="url(#aphLeafGrad)"/>
            <path d="M 90 94 Q 64 80 54 88 Q 72 96 90 98 Z" fill="url(#aphLeafGrad)"/>
            <path d="M 90 88 Q 116 74 126 82 Q 108 90 90 92 Z" fill="url(#aphLeafGrad)"/>
          </g>

          <!-- ETAPA 3: Madurez Lista (100%) - Espigas doradas y esmeralda vibrantes -->
          <g id="aph-stage3-${idx}" opacity="0" style="transition: opacity 0.2s ease;">
            <!-- Resplandor detrás de la espiga madura -->
            <circle cx="90" cy="64" r="26" fill="url(#aphGoldenGlow)" opacity="0.75"/>
            <!-- Aristas/barbas del trigo -->
            <path d="M 90 42 L 84 30 M 90 42 L 90 28 M 90 42 L 96 30 M 83 52 L 75 40 M 97 52 L 105 40 M 81 62 L 73 50 M 99 62 L 107 50" stroke="#fde68a" stroke-width="1.1" stroke-linecap="round"/>
            <!-- Espiga Central Dorada -->
            <ellipse cx="90" cy="46" rx="4.2" ry="7" fill="url(#aphGoldGrainGrad)" stroke="#fef08a" stroke-width="0.8"/>
            <ellipse cx="85" cy="54" rx="3.8" ry="6" fill="url(#aphGoldGrainGrad)" stroke="#fef08a" stroke-width="0.7" transform="rotate(-18 85 54)"/>
            <ellipse cx="95" cy="54" rx="3.8" ry="6" fill="url(#aphGoldGrainGrad)" stroke="#fef08a" stroke-width="0.7" transform="rotate(18 95 54)"/>
            <ellipse cx="85" cy="64" rx="3.8" ry="6" fill="url(#aphGoldGrainGrad)" stroke="#fef08a" stroke-width="0.7" transform="rotate(-18 85 64)"/>
            <ellipse cx="95" cy="64" rx="3.8" ry="6" fill="url(#aphGoldGrainGrad)" stroke="#fef08a" stroke-width="0.7" transform="rotate(18 95 64)"/>
            <ellipse cx="86" cy="74" rx="3.5" ry="5.5" fill="url(#aphGoldGrainGrad)" stroke="#fef08a" stroke-width="0.7" transform="rotate(-15 86 74)"/>
            <ellipse cx="94" cy="74" rx="3.5" ry="5.5" fill="url(#aphGoldGrainGrad)" stroke="#fef08a" stroke-width="0.7" transform="rotate(15 94 74)"/>
            <!-- Espigas Laterales Secundarias -->
            <ellipse cx="80" cy="68" rx="3.2" ry="6" fill="url(#aphGoldGrainGrad)" transform="rotate(-14 80 68)"/>
            <ellipse cx="100" cy="70" rx="3.2" ry="6" fill="url(#aphGoldGrainGrad)" transform="rotate(14 100 70)"/>
          </g>
        `;
      } else if (idx === 1) {
        // POD-02: SOYA LUNAR (Tallo ramificado, hojas trifoliadas esmeralda y vainas doradas/verdes en Etapa 3)
        return `
          <!-- ETAPA 1: Germinación (1% - 35%) -->
          <g id="aph-stage1-${idx}" opacity="0" style="transition: opacity 0.18s ease;">
            <ellipse cx="90" cy="142" rx="16" ry="5.5" fill="#cbd5e1" stroke="#64748b" stroke-width="1.2"/>
            <path d="M 82 140 Q 90 135 98 140" fill="none" stroke="#0f172a" stroke-width="1.5"/>
            <g id="aph-roots-${idx}" style="transform-origin: 90px 145px; transform: scaleY(0.2);">
              <path d="M 90 145 Q 82 160 76 177 M 90 145 Q 98 160 104 177 M 90 145 V 180 M 85 156 Q 74 165 72 175 M 95 156 Q 106 165 108 175" fill="none" stroke="#f8fafc" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>
            </g>
            <!-- Cotiledones de soya abriéndose -->
            <path d="M 90 141 V 124" stroke="#4ade80" stroke-width="2.8" stroke-linecap="round"/>
            <ellipse cx="85" cy="124" rx="5" ry="3.2" fill="#22c55e" transform="rotate(-20 85 124)"/>
            <ellipse cx="95" cy="124" rx="5" ry="3.2" fill="#22c55e" transform="rotate(20 95 124)"/>
          </g>

          <!-- ETAPA 2: Desarrollo Vegetativo (36% - 85%) -->
          <g id="aph-stage2-${idx}" opacity="0" style="transform-origin: 90px 142px; transform: scaleY(0.35); transition: opacity 0.18s ease;">
            <path d="M 90 142 V 64" stroke="url(#aphStemGrad)" stroke-width="3.5" stroke-linecap="round"/>
            <path d="M 90 112 L 68 96 M 90 106 L 112 90 M 90 86 L 70 72 M 90 82 L 110 68" stroke="#10b981" stroke-width="2.2" stroke-linecap="round"/>
            <!-- Hojas anchas trifoliadas esmeralda -->
            <ellipse cx="64" cy="94" rx="11" ry="6.5" fill="url(#aphLeafGrad)" stroke="#6ee7b7" stroke-width="0.7" transform="rotate(-22 64 94)"/>
            <ellipse cx="116" cy="88" rx="11" ry="6.5" fill="url(#aphLeafGrad)" stroke="#6ee7b7" stroke-width="0.7" transform="rotate(22 116 88)"/>
            <ellipse cx="68" cy="70" rx="10" ry="6" fill="url(#aphLeafGrad)" stroke="#6ee7b7" stroke-width="0.7" transform="rotate(-18 68 70)"/>
            <ellipse cx="112" cy="66" rx="10" ry="6" fill="url(#aphLeafGrad)" stroke="#6ee7b7" stroke-width="0.7" transform="rotate(18 112 66)"/>
          </g>

          <!-- ETAPA 3: Madurez Lista (100%) - Corona frondosa + Vainas de Soya Doradas/Esmeralda -->
          <g id="aph-stage3-${idx}" opacity="0" style="transition: opacity 0.2s ease;">
            <circle cx="90" cy="68" r="28" fill="url(#aphGoldenGlow)" opacity="0.7"/>
            <ellipse cx="90" cy="52" rx="9" ry="13" fill="url(#aphLeafGrad)" stroke="#a7f3d0" stroke-width="0.9"/>
            <!-- Vainas de soya maduras colgando (dorado-esmeralda) -->
            <path d="M 84 82 C 76 86 75 98 82 104 C 87 100 88 88 84 82 Z" fill="url(#aphGoldGrainGrad)" stroke="#fef08a" stroke-width="0.9"/>
            <path d="M 96 78 C 104 82 105 94 98 100 C 93 96 92 84 96 78 Z" fill="url(#aphGoldGrainGrad)" stroke="#fef08a" stroke-width="0.9"/>
            <path d="M 83 104 C 75 108 74 120 81 126 C 86 122 87 110 83 104 Z" fill="url(#aphGoldGrainGrad)" stroke="#fef08a" stroke-width="0.9"/>
            <path d="M 97 102 C 105 106 106 118 99 124 C 94 120 93 108 97 102 Z" fill="url(#aphGoldGrainGrad)" stroke="#fef08a" stroke-width="0.9"/>
            <!-- Semillas marcadas dentro de las vainas -->
            <circle cx="81" cy="91" r="2" fill="#fef08a"/>
            <circle cx="81" cy="97" r="2" fill="#fef08a"/>
            <circle cx="99" cy="87" r="2" fill="#fef08a"/>
            <circle cx="99" cy="93" r="2" fill="#fef08a"/>
          </g>
        `;
      } else {
        // POD-03: LECHUGA ESPACIAL (Roseta de hojas rizadas esmeralda y corazón dorado/esmeralda en Etapa 3)
        return `
          <!-- ETAPA 1: Germinación (1% - 35%) -->
          <g id="aph-stage1-${idx}" opacity="0" style="transition: opacity 0.18s ease;">
            <ellipse cx="90" cy="142" rx="16" ry="5.5" fill="#cbd5e1" stroke="#64748b" stroke-width="1.2"/>
            <path d="M 82 140 Q 90 135 98 140" fill="none" stroke="#0f172a" stroke-width="1.5"/>
            <g id="aph-roots-${idx}" style="transform-origin: 90px 145px; transform: scaleY(0.2);">
              <path d="M 90 145 Q 83 160 78 176 M 90 145 Q 97 160 102 176 M 90 145 V 179 M 84 156 Q 74 166 71 174 M 96 156 Q 106 166 109 174" fill="none" stroke="#f8fafc" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>
            </g>
            <!-- Brote de roseta inicial -->
            <path d="M 90 140 C 82 130 80 122 86 120 C 90 120 90 132 90 140 Z" fill="#4ade80"/>
            <path d="M 90 140 C 98 130 100 122 94 120 C 90 120 90 132 90 140 Z" fill="#22c55e"/>
          </g>

          <!-- ETAPA 2: Desarrollo Vegetativo (36% - 85%) -->
          <g id="aph-stage2-${idx}" opacity="0" style="transform-origin: 90px 142px; transform: scaleY(0.35); transition: opacity 0.18s ease;">
            <!-- Hojas exteriores e intermedias en abanico -->
            <path d="M 90 140 C 62 132 50 102 64 82 C 74 70 86 90 90 140 Z" fill="url(#aphLeafGrad)" stroke="#6ee7b7" stroke-width="0.8"/>
            <path d="M 90 140 C 118 132 130 102 116 82 C 106 70 94 90 90 140 Z" fill="url(#aphLeafGrad)" stroke="#6ee7b7" stroke-width="0.8"/>
            <path d="M 90 140 C 72 116 68 84 82 70 C 90 64 94 88 90 140 Z" fill="#10b981" stroke="#a7f3d0" stroke-width="0.8"/>
            <path d="M 90 140 C 108 116 112 84 98 70 C 90 64 86 88 90 140 Z" fill="#059669" stroke="#a7f3d0" stroke-width="0.8"/>
            <!-- Nervaduras centrales -->
            <path d="M 90 138 Q 74 110 66 88 M 90 138 Q 106 110 114 88 M 90 138 V 76" fill="none" stroke="#a7f3d0" stroke-width="1.2" opacity="0.75" stroke-linecap="round"/>
          </g>

          <!-- ETAPA 3: Madurez Lista (100%) - Cogollo central vibrante dorado/esmeralda -->
          <g id="aph-stage3-${idx}" opacity="0" style="transition: opacity 0.2s ease;">
            <circle cx="90" cy="82" r="30" fill="url(#aphGoldenGlow)" opacity="0.72"/>
            <path d="M 90 136 C 74 102 72 62 90 52 C 108 62 106 102 90 136 Z" fill="url(#aphGoldGrainGrad)" stroke="#fef08a" stroke-width="1.1"/>
            <path d="M 90 134 C 80 106 80 70 90 60 C 100 70 100 106 90 134 Z" fill="#34d399" stroke="#fde68a" stroke-width="0.9" opacity="0.85"/>
            <path d="M 90 130 V 62 M 90 95 L 82 80 M 90 95 L 98 80 M 90 80 L 84 68 M 90 80 L 96 68" fill="none" stroke="#fef08a" stroke-width="1.3" stroke-linecap="round"/>
          </g>
        `;
      }
    }

    stage.innerHTML = `
      <div id="eva-aph-container" class="eva-aph-dome flex flex-col justify-between p-2.5 sm:p-4 relative select-none overflow-hidden">
        <!-- Definitions SVG compartidas 3D (Cero filtros blur pesados) -->
        <svg class="w-0 h-0 absolute pointer-events-none" aria-hidden="true">
          <defs>
            <linearGradient id="aphMetalBezel" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#334155"/>
              <stop offset="18%" stop-color="#64748b"/>
              <stop offset="50%" stop-color="#1e293b"/>
              <stop offset="82%" stop-color="#475569"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
            <linearGradient id="aphGlassChamber" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#0f172a" stop-opacity="0.88"/>
              <stop offset="50%" stop-color="#04101c" stop-opacity="0.94"/>
              <stop offset="100%" stop-color="#022c22" stop-opacity="0.9"/>
            </linearGradient>
            <linearGradient id="aphGrowBeam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#e879f9" stop-opacity="0.55"/>
              <stop offset="45%" stop-color="#22d3ee" stop-opacity="0.28"/>
              <stop offset="100%" stop-color="#10b981" stop-opacity="0.02"/>
            </linearGradient>
            <linearGradient id="aphNpkWater" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.72"/>
              <stop offset="50%" stop-color="#0284c7" stop-opacity="0.85"/>
              <stop offset="100%" stop-color="#083344" stop-opacity="0.96"/>
            </linearGradient>
            <linearGradient id="aphArcilliteBed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#78350f"/>
              <stop offset="50%" stop-color="#451a03"/>
              <stop offset="100%" stop-color="#1c1917"/>
            </linearGradient>
            <linearGradient id="aphStemGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="#059669"/>
              <stop offset="60%" stop-color="#10b981"/>
              <stop offset="100%" stop-color="#6ee7b7"/>
            </linearGradient>
            <linearGradient id="aphLeafGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#34d399"/>
              <stop offset="65%" stop-color="#10b981"/>
              <stop offset="100%" stop-color="#047857"/>
            </linearGradient>
            <linearGradient id="aphGoldGrainGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="55%" stop-color="#f59e0b"/>
              <stop offset="100%" stop-color="#10b981"/>
            </linearGradient>
            <radialGradient id="aphGoldenGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.55"/>
              <stop offset="60%" stop-color="#10b981" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
            </radialGradient>
          </defs>
        </svg>

        <!-- 1. CABECERA TÉCNICA DEL MÓDULO APH -->
        <div class="flex flex-wrap items-center justify-between gap-2 z-20 bg-zinc-950/90 px-3.5 py-2 rounded-xl border border-emerald-500/40 shadow-lg shrink-0">
          <!-- Izquierda: ● REC CAM-01 // NASA APH VEGGIE GROWTH CHAMBER -->
          <div class="flex items-center gap-2.5">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse"></span>
            <span class="text-[0.65rem] sm:text-xs font-mono font-black text-emerald-300 tracking-wider uppercase">
              ● REC CAM-01 // NASA APH VEGGIE GROWTH CHAMBER
            </span>
          </div>

          <!-- Derecha: Indicador de ciclo fotosintético y contador CULTIVOS LISTOS: X / 3 -->
          <div class="flex items-center gap-2 sm:gap-3">
            <span class="hidden lg:inline-block px-2 py-0.5 rounded bg-fuchsia-950/70 border border-fuchsia-500/50 text-[0.58rem] font-mono font-bold text-fuchsia-200 tracking-wider">
              ${isEn ? '[ PHOTOSYNTHETIC CYCLE: 630nm RED / 450nm BLUE ]' : '[ CICLO FOTOSINTÉTICO: 630nm RED / 450nm BLUE ]'}
            </span>
            <div id="aph-ready-counter-badge" class="px-2.5 py-1 rounded-md bg-emerald-950/90 border border-emerald-400/70 text-[0.65rem] sm:text-xs font-mono font-black text-emerald-200 tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              ${isEn ? 'CROPS READY: 0 / 3' : 'CULTIVOS LISTOS: 0 / 3'}
            </div>
          </div>
        </div>

        <!-- 2. ESCENARIO CENTRAL: 3 CÁPSULAS DE CULTIVO HIDROPÓNICO EN SVG -->
        <div class="relative flex-1 w-full my-1.5 grid grid-cols-3 gap-2.5 sm:gap-4 items-stretch z-20 min-h-0">
          ${podsData.map((pod, idx) => `
            <div id="aph-pod-bay-${idx}" class="aph-pod-bay flex flex-col justify-between p-2 sm:p-2.5 select-none cursor-pointer" data-pod="${idx}">
              <!-- Encabezado de la Cápsula -->
              <div class="flex items-center justify-between gap-1 border-b border-slate-700/80 pb-1 shrink-0">
                <div class="flex flex-col min-w-0">
                  <span class="text-[0.6rem] sm:text-[0.68rem] font-mono font-black text-cyan-200 truncate tracking-wide">${pod.title}</span>
                  <span class="text-[0.48rem] font-mono text-slate-400 truncate hidden sm:block">${pod.sub}</span>
                </div>
                <span id="aph-pod-led-${idx}" class="w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-400 shrink-0 transition-colors"></span>
              </div>

              <!-- Visor Central de Cristal Biselado + SVG 3D de la Planta (4 Etapas) -->
              <div class="relative flex-1 w-full my-1 flex items-center justify-center overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950/90 min-h-0">
                <svg viewBox="0 0 180 200" class="w-full h-full max-h-[210px] select-none pointer-events-none" preserveAspectRatio="xMidYMid meet">
                  <!-- Chasis Lateral de Aluminio Anodizado -->
                  <rect x="2" y="2" width="176" height="196" rx="8" fill="url(#aphGlassChamber)" stroke="url(#aphMetalBezel)" stroke-width="3"/>
                  <!-- Líneas de Escala Milimétrica en el Cristal -->
                  <g stroke="#334155" stroke-width="0.8" opacity="0.65">
                    <line x1="14" y1="45" x2="22" y2="45"/>
                    <line x1="14" y1="70" x2="20" y2="70"/>
                    <line x1="14" y1="95" x2="22" y2="95"/>
                    <line x1="14" y1="120" x2="20" y2="120"/>
                    <line x1="158" y1="45" x2="166" y2="45"/>
                    <line x1="160" y1="70" x2="166" y2="70"/>
                    <line x1="158" y1="95" x2="166" y2="95"/>
                    <line x1="160" y1="120" x2="166" y2="120"/>
                  </g>

                  <!-- CABEZAL SUPERIOR LED FOTOSINTÉTICO (630nm RED / 450nm BLUE) Y RIEGO -->
                  <g>
                    <rect x="26" y="5" width="128" height="14" rx="3" fill="url(#aphMetalBezel)" stroke="#475569" stroke-width="1"/>
                    <!-- Matriz de Diodos LED (Apagados al inicio, encendidos al plantar) -->
                    <g id="aph-led-strip-${idx}" opacity="0.22" style="transition: opacity 0.2s ease;">
                      <rect x="34" y="9" width="112" height="5" rx="2" fill="#e879f9"/>
                      <circle cx="44" cy="11.5" r="2.2" fill="#f43f5e"/>
                      <circle cx="62" cy="11.5" r="2.2" fill="#38bdf8"/>
                      <circle cx="80" cy="11.5" r="2.2" fill="#e879f9"/>
                      <circle cx="98" cy="11.5" r="2.2" fill="#38bdf8"/>
                      <circle cx="116" cy="11.5" r="2.2" fill="#f43f5e"/>
                      <circle cx="134" cy="11.5" r="2.2" fill="#e879f9"/>
                    </g>
                    <!-- Boquilla Central de Riego Hidropónico -->
                    <rect x="83" y="19" width="14" height="5" rx="1.5" fill="#94a3b8" stroke="#334155" stroke-width="0.8"/>

                    <!-- Haz de Luz Fotosintética Magenta/Cian (Oculto en Etapa 0) -->
                    <polygon id="aph-light-beam-${idx}" points="34,19 146,19 168,142 12,142" fill="url(#aphGrowBeam)" opacity="0" style="transition: opacity 0.25s ease;"/>

                    <!-- Rocío de Agua Animado (Gotitas que caen mientras crece) -->
                    <g id="aph-mist-group-${idx}" opacity="0" style="transition: opacity 0.2s ease;">
                      <line x1="86" y1="26" x2="82" y2="34" stroke="#67e8f9" stroke-width="1.5" stroke-linecap="round" class="aph-mist-drop-1"/>
                      <line x1="90" y1="26" x2="90" y2="35" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" class="aph-mist-drop-2"/>
                      <line x1="94" y1="26" x2="98" y2="34" stroke="#67e8f9" stroke-width="1.5" stroke-linecap="round" class="aph-mist-drop-3"/>
                      <circle cx="76" cy="42" r="1.4" fill="#a5f3fc" class="aph-mist-drop-2"/>
                      <circle cx="104" cy="40" r="1.4" fill="#a5f3fc" class="aph-mist-drop-3"/>
                    </g>
                  </g>

                  <!-- TANQUE INFERIOR DE SOLUCIÓN NUTRITIVA NPK + SUSTRATO ARCILLITE -->
                  <g>
                    <!-- Cámara de Solución Hidropónica Cian -->
                    <rect x="8" y="146" width="164" height="46" rx="4" fill="url(#aphNpkWater)" stroke="#0e7490" stroke-width="1.2"/>
                    <!-- Nivel de Agua NPK Ondulado -->
                    <path d="M 10 152 Q 50 149 90 152 T 170 152" fill="none" stroke="#67e8f9" stroke-width="1.2" opacity="0.75"/>
                    <!-- Etiqueta Técnica NPK dentro del tanque -->
                    <text x="16" y="186" fill="#a5f3fc" font-family="'JetBrains Mono', monospace" font-size="7.5" font-weight="bold" opacity="0.8">${pod.npkLabel}</text>
                    <text id="aph-stage-label-${idx}" x="164" y="186" fill="#fde68a" font-family="'JetBrains Mono', monospace" font-size="7.5" font-weight="bold" text-anchor="end">STAGE 0/3</text>

                    <!-- Burbujas Animadas en el Tanque de Raíces (Activas al plantar) -->
                    <g id="aph-bubbles-${idx}" opacity="0" style="transition: opacity 0.25s ease;">
                      <circle cx="48" cy="182" r="2.4" fill="#67e8f9" class="aph-root-bubble-1"/>
                      <circle cx="76" cy="185" r="1.8" fill="#a5f3fc" class="aph-root-bubble-2"/>
                      <circle cx="92" cy="184" r="2.6" fill="#67e8f9" class="aph-root-bubble-3"/>
                      <circle cx="112" cy="185" r="2.0" fill="#a5f3fc" class="aph-root-bubble-1"/>
                      <circle cx="136" cy="182" r="2.2" fill="#67e8f9" class="aph-root-bubble-2"/>
                    </g>

                    <!-- Lecho de Sustrato de Arcilla Calcinada (Arcillite) -->
                    <rect x="18" y="138" width="144" height="10" rx="3" fill="url(#aphArcilliteBed)" stroke="#92400e" stroke-width="1"/>
                    <!-- Gránulos de Arcillite -->
                    <circle cx="34" cy="143" r="2" fill="#b45309"/>
                    <circle cx="52" cy="142" r="1.8" fill="#d97706"/>
                    <circle cx="72" cy="143" r="2.1" fill="#92400e"/>
                    <circle cx="108" cy="143" r="2" fill="#b45309"/>
                    <circle cx="128" cy="142" r="1.7" fill="#d97706"/>
                    <circle cx="146" cy="143" r="2" fill="#92400e"/>
                  </g>

                  <!-- PLANTA EVOLUTIVA EN 4 ETAPAS (0: Vacía, 1: Germinación, 2: Vegetativo, 3: Madurez 100%) -->
                  ${buildCropEvolutionSvg(idx)}

                  <!-- Reflejo diagonal de cristal biselado -->
                  <polygon points="10,22 32,22 14,134 10,134" fill="#ffffff" opacity="0.035"/>
                </svg>

                <!-- BOTÓN TÁCTIL ETAPA 0: [ + PLANTAR SEMILLA ] / [ + PLANT SEED ] -->
                <button id="aph-plant-btn-${idx}" type="button" data-pod="${idx}"
                  class="aph-plant-seed-btn absolute z-30 px-3 py-2 rounded-lg font-mono font-black text-[0.62rem] sm:text-xs uppercase tracking-wider cursor-pointer select-none">
                  ${isEn ? '[ + PLANT SEED ]' : '[ + PLANTAR SEMILLA ]'}
                </button>

                <!-- BOTÓN TÁCTIL ETAPA 3 (100%): [ ★ 100% LISTO — CLIC PARA COSECHAR ] -->
                <button id="aph-harvest-btn-${idx}" type="button" data-pod="${idx}"
                  class="aph-harvest-btn hidden absolute z-30 px-2.5 py-2 rounded-lg font-mono font-black text-[0.56rem] sm:text-[0.66rem] uppercase tracking-wider text-center leading-tight cursor-pointer select-none mx-1">
                  ${isEn ? '[ ★ 100% READY — CLICK TO HARVEST ]' : '[ ★ 100% LISTO — CLIC PARA COSECHAR ]'}
                </button>

                <!-- INSIGNIA DE COSECHADO -->
                <div id="aph-harvested-badge-${idx}" class="hidden absolute top-2.5 right-2.5 z-30 px-2 py-0.5 rounded bg-emerald-950/95 border border-emerald-400 text-[0.55rem] font-mono font-black text-emerald-300 uppercase shadow-[0_0_10px_#34d399] pointer-events-none">
                  ${isEn ? '✓ HARVESTED' : '✓ COSECHADO'}
                </div>
              </div>

              <!-- Base Inferior de la Cápsula: Barra de Crecimiento Digital (0% -> 100%), Nivel NPK y Cronómetro (3.5s) -->
              <div class="flex flex-col gap-1 pt-1 shrink-0">
                <div class="flex items-center justify-between text-[0.58rem] sm:text-[0.65rem] font-mono font-black">
                  <span id="aph-pod-status-txt-${idx}" class="text-slate-400 uppercase truncate">
                    ${isEn ? 'AWAITING SEED' : 'ESPERANDO SEMILLA'}
                  </span>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <span id="aph-pod-timer-${idx}" class="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">3.5s</span>
                    <span id="aph-pod-pct-${idx}" class="text-cyan-300 min-w-[2.4rem] text-right">0%</span>
                  </div>
                </div>

                <!-- Barra de Crecimiento Digital -->
                <div class="w-full h-2.5 sm:h-3 bg-slate-950 rounded-full border border-slate-700 overflow-hidden p-0.5 shadow-inner">
                  <div id="aph-pod-bar-${idx}" class="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-300 rounded-full transition-none" style="width: 0%;"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Barra de Instrucción Inferior -->
        <div id="aph-bottom-hint" class="z-20 text-center text-[0.62rem] sm:text-xs font-mono font-bold text-emerald-200 bg-zinc-950/85 border border-emerald-500/30 py-1.5 px-4 rounded-xl mx-auto shrink-0">
          ${isEn
            ? 'STEP 1: CLICK ALL 3 HYDROPONIC PODS TO PLANT SEEDS // STEP 2: 3.5s ACCELERATED GROWTH // STEP 3: HARVEST AT 100%'
            : 'PASO 1: HAZ CLIC EN LAS 3 CÁPSULAS PARA PLANTAR SEMILLAS // PASO 2: CRECIMIENTO ACELERADO (3.5s) // PASO 3: COSECHAR AL 100%'}
        </div>
      </div>
    `;

    // Referencias DOM pre-cacheadas para actualizar a 60/120 FPS sin consultas repetidas
    const readyCounterBadge = document.getElementById('aph-ready-counter-badge');
    const bottomHint = document.getElementById('aph-bottom-hint');

    const podDom = podsData.map((_, idx) => ({
      bay: document.getElementById(`aph-pod-bay-${idx}`),
      led: document.getElementById(`aph-pod-led-${idx}`),
      ledStrip: document.getElementById(`aph-led-strip-${idx}`),
      lightBeam: document.getElementById(`aph-light-beam-${idx}`),
      mistGroup: document.getElementById(`aph-mist-group-${idx}`),
      bubbles: document.getElementById(`aph-bubbles-${idx}`),
      stageLabel: document.getElementById(`aph-stage-label-${idx}`),
      stage1: document.getElementById(`aph-stage1-${idx}`),
      roots: document.getElementById(`aph-roots-${idx}`),
      stage2: document.getElementById(`aph-stage2-${idx}`),
      stage3: document.getElementById(`aph-stage3-${idx}`),
      plantBtn: document.getElementById(`aph-plant-btn-${idx}`),
      harvestBtn: document.getElementById(`aph-harvest-btn-${idx}`),
      harvestedBadge: document.getElementById(`aph-harvested-badge-${idx}`),
      statusTxt: document.getElementById(`aph-pod-status-txt-${idx}`),
      timerTxt: document.getElementById(`aph-pod-timer-${idx}`),
      pctTxt: document.getElementById(`aph-pod-pct-${idx}`),
      bar: document.getElementById(`aph-pod-bar-${idx}`)
    }));

    function triggerMissionSuccess() {
      if (missionResolved || !evaState.active) return;
      missionResolved = true;
      if (autoWinTimeout) {
        clearTimeout(autoWinTimeout);
        autoWinTimeout = null;
      }
      if (evaState.foodLoopFrame) {
        cancelAnimationFrame(evaState.foodLoopFrame);
        evaState.foodLoopFrame = null;
      }
      sfx.playMinigameSuccess();
      resolveEvaMission(true);
    }

    function updateReadyCounterUI() {
      const readyOrHarvestedCount = podsData.filter(p => p.state === 'ready' || p.state === 'harvested').length;
      const harvestedCount = podsData.filter(p => p.state === 'harvested').length;
      if (readyCounterBadge) {
        readyCounterBadge.textContent = isEn
          ? `CROPS READY: ${readyOrHarvestedCount} / 3`
          : `CULTIVOS LISTOS: ${readyOrHarvestedCount} / 3`;
        if (readyOrHarvestedCount === 3) {
          readyCounterBadge.className = 'px-2.5 py-1 rounded-md bg-amber-500/25 border border-amber-300 text-[0.65rem] sm:text-xs font-mono font-black text-amber-200 tracking-wider shadow-[0_0_14px_rgba(251,191,36,0.5)]';
        }
      }

      // Si las 3 plantas fueron cosechadas manualmente con clic -> victoria inmediata
      if (harvestedCount === 3) {
        if (bottomHint) {
          bottomHint.textContent = isEn
            ? '★ ALL 3 HYDROPONIC CROPS HARVESTED! BIOMASS RESERVES RESTORED ★'
            : '★ ¡LOS 3 CULTIVOS HIDROPÓNICOS HAN SIDO COSECHADOS! BIOMASA RESTAURADA ★';
        }
        setTimeout(() => triggerMissionSuccess(), 180);
      }
    }

    // Acción Paso 1: Plantar Semilla en la cápsula `idx`
    function plantSeedInPod(idx) {
      if (!evaState.active || missionResolved) return;
      const pod = podsData[idx];
      const dom = podDom[idx];
      if (!pod || pod.state !== 'empty') return;

      pod.state = 'growing';
      pod.plantedAt = performance.now();
      pod.progress = 1;

      // Sonido mecánico/hidráulico Web Audio API al plantar
      playEvaNutrientPiston();
      sfx.playClick();

      // Activar lámpara LED fotosintética superior, haz de luz, rocío y burbujas en el tanque NPK
      if (dom.bay) dom.bay.classList.add('aph-pod-planted');
      if (dom.led) dom.led.className = 'w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] shrink-0 animate-pulse';
      if (dom.ledStrip) dom.ledStrip.setAttribute('opacity', '1');
      if (dom.lightBeam) dom.lightBeam.setAttribute('opacity', '0.9');
      if (dom.mistGroup) dom.mistGroup.setAttribute('opacity', '1');
      if (dom.bubbles) dom.bubbles.setAttribute('opacity', '1');
      if (dom.plantBtn) dom.plantBtn.classList.add('hidden');
      if (dom.stage1) dom.stage1.setAttribute('opacity', '1');
      if (dom.stageLabel) dom.stageLabel.textContent = 'STAGE 1/3';
      if (dom.statusTxt) {
        dom.statusTxt.textContent = isEn ? 'GERMINATING...' : 'GERMINANDO...';
        dom.statusTxt.className = 'text-cyan-300 uppercase truncate';
      }

      const plantedCount = podsData.filter(p => p.state !== 'empty').length;
      if (bottomHint && plantedCount < 3) {
        bottomHint.textContent = isEn
          ? `SEED PLANTED (${plantedCount}/3) — CLICK REMAINING EMPTY PODS TO START GROWTH!`
          : `SEMILLA PLANTADA (${plantedCount}/3) — ¡HAZ CLIC EN LAS CÁPSULAS RESTANTES PARA INICIAR EL CULTIVO!`;
      } else if (bottomHint && plantedCount === 3) {
        bottomHint.textContent = isEn
          ? 'ALL 3 SEEDS PLANTED — ACCELERATED HYDROPONIC GROWTH IN PROGRESS (3.5s)...'
          : 'LAS 3 SEMILLAS PLANTADAS — CRECIMIENTO HIDROPÓNICO ACELERADO EN CURSO (3.5s)...';
      }
    }

    // Acción Paso 3: Cosechar planta cuando llega al 100%
    function harvestPod(idx) {
      if (!evaState.active || missionResolved) return;
      const pod = podsData[idx];
      const dom = podDom[idx];
      if (!pod || pod.state !== 'ready') return;

      pod.state = 'harvested';
      sfx.playCargoUnlock();
      playEvaNutrientBalanced();

      if (dom.bay) {
        dom.bay.classList.remove('aph-pod-ready');
        dom.bay.classList.add('aph-pod-harvested');
      }
      if (dom.harvestBtn) dom.harvestBtn.classList.add('hidden');
      if (dom.harvestedBadge) dom.harvestedBadge.classList.remove('hidden');
      if (dom.led) dom.led.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] shrink-0';
      if (dom.statusTxt) {
        dom.statusTxt.textContent = isEn ? '✓ HARVESTED' : '✓ COSECHADO';
        dom.statusTxt.className = 'text-emerald-300 uppercase truncate';
      }

      updateReadyCounterUI();
    }

    // Eventos de clic en cada cápsula y sus botones táctiles
    podsData.forEach((_, idx) => {
      const dom = podDom[idx];
      if (dom.plantBtn) {
        dom.plantBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          plantSeedInPod(idx);
        });
      }
      if (dom.harvestBtn) {
        dom.harvestBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          harvestPod(idx);
        });
      }
      if (dom.bay) {
        dom.bay.addEventListener('click', () => {
          if (podsData[idx].state === 'empty') {
            plantSeedInPod(idx);
          } else if (podsData[idx].state === 'ready') {
            harvestPod(idx);
          }
        });
      }
    });

    // Bucle de animación a 60/120 FPS para el crecimiento continuo de 3.5s por cápsula
    function growthLoop(now) {
      if (!evaState.active || missionResolved || (evaState.roomKey !== 'food' && evaState.roomKey !== 'comida')) return;

      let newlyReady = false;

      for (let i = 0; i < podsData.length; i++) {
        const pod = podsData[i];
        const dom = podDom[i];

        if (pod.state === 'growing') {
          const elapsed = Math.max(0, now - pod.plantedAt);
          const ratio = Math.min(1, elapsed / GROWTH_DURATION_MS);
          const pct = Math.min(100, Math.floor(ratio * 100));
          const remainingSec = Math.max(0, (GROWTH_DURATION_MS - elapsed) / 1000);

          pod.progress = pct;

          if (dom.bar) dom.bar.style.width = `${pct}%`;
          if (dom.pctTxt) dom.pctTxt.textContent = `${pct}%`;
          if (dom.timerTxt) dom.timerTxt.textContent = `${remainingSec.toFixed(1)}s`;

          // Actualizar las 4 etapas visuales en el SVG
          if (pct < 36) {
            // Etapa 1: Germinación (1% a 35%)
            const rootScale = 0.2 + (pct / 35) * 0.8;
            if (dom.stage1) dom.stage1.setAttribute('opacity', '1');
            if (dom.roots) dom.roots.style.transform = `scaleY(${rootScale.toFixed(2)})`;
            if (dom.stage2) dom.stage2.setAttribute('opacity', '0');
            if (dom.stage3) dom.stage3.setAttribute('opacity', '0');
            if (dom.stageLabel) dom.stageLabel.textContent = 'STAGE 1/3';
            if (dom.statusTxt) {
              dom.statusTxt.textContent = isEn ? 'STAGE 1: GERMINATION' : 'ETAPA 1: GERMINACIÓN';
            }
          } else if (pct < 100) {
            // Etapa 2: Desarrollo Vegetativo (36% a 85% -> 99%)
            const vegNorm = Math.min(1, (pct - 35) / 60);
            const stemScale = 0.35 + vegNorm * 0.65;
            if (dom.stage1) dom.stage1.setAttribute('opacity', '1');
            if (dom.roots) dom.roots.style.transform = 'scaleY(1)';
            if (dom.stage2) {
              dom.stage2.setAttribute('opacity', '1');
              dom.stage2.style.transform = `scaleY(${stemScale.toFixed(2)})`;
            }
            if (dom.stage3) {
              dom.stage3.setAttribute('opacity', pct >= 86 ? String(((pct - 85) / 15).toFixed(2)) : '0');
            }
            if (dom.stageLabel) dom.stageLabel.textContent = 'STAGE 2/3';
            if (dom.statusTxt) {
              dom.statusTxt.textContent = isEn ? 'STAGE 2: VEGETATIVE' : 'ETAPA 2: VEGETATIVO';
              dom.statusTxt.className = 'text-emerald-300 uppercase truncate';
            }
          } else {
            // Etapa 3: Madurez Lista (100%)
            pod.state = 'ready';
            pod.progress = 100;
            newlyReady = true;

            if (!pod.readySoundPlayed) {
              pod.readySoundPlayed = true;
              playEvaNutrientBalanced();
            }

            if (dom.bar) dom.bar.style.width = '100%';
            if (dom.pctTxt) dom.pctTxt.textContent = '100%';
            if (dom.timerTxt) {
              dom.timerTxt.textContent = '0.0s';
              dom.timerTxt.className = 'text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500';
            }
            if (dom.stage1) dom.stage1.setAttribute('opacity', '1');
            if (dom.roots) dom.roots.style.transform = 'scaleY(1)';
            if (dom.stage2) {
              dom.stage2.setAttribute('opacity', '1');
              dom.stage2.style.transform = 'scaleY(1)';
            }
            if (dom.stage3) dom.stage3.setAttribute('opacity', '1');
            if (dom.mistGroup) dom.mistGroup.setAttribute('opacity', '0');
            if (dom.stageLabel) dom.stageLabel.textContent = 'STAGE 3/3 ★';

            if (dom.bay) {
              dom.bay.classList.remove('aph-pod-planted');
              dom.bay.classList.add('aph-pod-ready');
            }
            if (dom.led) dom.led.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24] shrink-0 animate-ping';
            if (dom.harvestBtn) dom.harvestBtn.classList.remove('hidden');
            if (dom.statusTxt) {
              dom.statusTxt.textContent = isEn ? '★ 100% MATURE // READY' : '★ 100% MADURO // LISTO';
              dom.statusTxt.className = 'text-amber-300 uppercase truncate';
            }
          }
        }
      }

      if (newlyReady) {
        updateReadyCounterUI();

        // Si las 3 plantas ya llegaron al 100% (listas o cosechadas), pausamos el reloj de oxígeno del traje
        // y programamos auto-victoria tras 0.8s para que el jugador jamás pierda por no dar el último clic a tiempo
        const allThreeDone = podsData.every(p => p.state === 'ready' || p.state === 'harvested');
        if (allThreeDone && !allReadyTimestamp) {
          allReadyTimestamp = now;
          if (evaState.timerInterval) {
            clearInterval(evaState.timerInterval);
            evaState.timerInterval = null;
          }
          if (bottomHint) {
            bottomHint.textContent = isEn
              ? '★ ALL 3 CROPS AT 100% MATURITY! CLICK TO HARVEST OR AUTO-COLLECTING IN 0.8s ★'
              : '★ ¡LOS 3 CULTIVOS AL 100% DE MADUREZ! HAZ CLIC PARA COSECHAR O AUTO-COSECHA EN 0.8s ★';
          }
          autoWinTimeout = setTimeout(() => {
            podsData.forEach((_, idx) => {
              const dom = podDom[idx];
              if (dom.harvestBtn) dom.harvestBtn.classList.add('hidden');
              if (dom.harvestedBadge) dom.harvestedBadge.classList.remove('hidden');
            });
            triggerMissionSuccess();
          }, 800);
        }
      }

      evaState.foodLoopFrame = requestAnimationFrame(growthLoop);
    }

    evaState.foodLoopFrame = requestAnimationFrame(growthLoop);

    // Registro de limpieza total al cerrar el modal
    const cleanupFoodMinigame = () => {
      if (evaState.foodLoopFrame) {
        cancelAnimationFrame(evaState.foodLoopFrame);
        evaState.foodLoopFrame = null;
      }
      if (autoWinTimeout) {
        clearTimeout(autoWinTimeout);
        autoWinTimeout = null;
      }
    };
    evaState.activeCleanup = cleanupFoodMinigame;
    if (window.activeMinigameLoops && Array.isArray(window.activeMinigameLoops.cleanups)) {
      window.activeMinigameLoops.cleanups.push(cleanupFoodMinigame);
    }
  }

  // =======================================================================
  // RESOLUCIÓN DE MISIÓN EVA (ÉXITO O FRACASO)
  // =======================================================================
  function resolveEvaMission(success) {
    if (!evaState.active) return;
    evaState.active = false;
    cleanupAllModalLoops();

    const banner = document.getElementById('eva-feedback-banner');
    const isEn = (window.GAME_SETTINGS?.lang === 'en') || (localStorage.getItem('lunar_lang') === 'en');
    const cur = CCTV_ROOMS[evaState.roomKey];
    const resName = cur ? (typeof cur.resName === 'function' ? cur.resName(isEn) : cur.resName) : evaState.roomKey.toUpperCase();

    if (success) {
      sfx.playMinigameSuccess();

      if (!evaState.isPractice) {
        // Modo real: +20% al recurso
        state.resources[evaState.roomKey] = Math.min(100, (state.resources[evaState.roomKey] || 0) + 20);
        try { updateResourceBars(); } catch (_) {}
        saveGameToStorage();

        const logMsg = isEn
          ? `[EVA MISSION SOL ${state.sol}] SUCCESS: ${resName} RESTORED (+20%)`
          : `[MISIÓN EVA SOL ${state.sol}] ÉXITO: ${resName} RESTAURADO (+20%)`;
        state.solLogs.push(`<div class="text-emerald-400 font-semibold bg-emerald-950/30 border border-emerald-500/20 px-2 py-1 rounded">${logMsg}</div>`);

        if (banner) {
          banner.textContent = isEn
            ? `SYSTEM RESTORED // +20% ${resName}`
            : `¡SISTEMA RESTAURADO! // +20% ${resName}`;
          banner.className = 'absolute top-20 z-50 px-8 py-3 rounded-xl border-2 border-emerald-400 bg-emerald-950/95 text-emerald-300 text-center font-scifi uppercase tracking-widest font-black text-sm md:text-base shadow-[0_0_35px_rgba(52,211,153,0.7)]';
          banner.classList.remove('hidden');
        }
      } else {
        // Modo práctica: sin alterar porcentajes
        if (banner) {
          banner.textContent = isEn
            ? 'EVA SIMULATION PASSED! // PRACTICE MODE (+0%)'
            : '¡SIMULACIÓN EVA SUPERADA! // MODO PRÁCTICA (+0%)';
          banner.className = 'absolute top-20 z-50 px-8 py-3 rounded-xl border-2 border-cyan-400 bg-cyan-950/95 text-cyan-300 text-center font-scifi uppercase tracking-widest font-black text-sm md:text-base shadow-[0_0_35px_rgba(34,211,238,0.7)]';
          banner.classList.remove('hidden');
        }
      }

      setTimeout(() => {
        closeEvaModal();
      }, 2200);

    } else {
      // Tiempo agotado o fallo
      sfx.playMinigameFail();
      playEvaOverheatAlert();

      // En el momento de aborto el pulso llega a 180 BPM
      evaState.bpm = 180;
      const bpmDisp = document.getElementById('eva-bpm-display');
      if (bpmDisp) {
        bpmDisp.textContent = '180';
        bpmDisp.className = 'text-lg md:text-xl font-black font-mono text-rose-400 animate-pulse';
      }

      if (!evaState.isPractice) {
        // Modo real: -5% al recurso
        state.resources[evaState.roomKey] = Math.max(0, (state.resources[evaState.roomKey] || 0) - 5);
        try { updateResourceBars(); } catch (_) {}
        saveGameToStorage();

        state.lastIncident = {
          title: isEn ? 'EVA TIMEOUT // ABORT' : 'EVA AGOTADO // ABORTO',
          resource: evaState.roomKey,
          resourceName: resName,
          sol: state.sol,
          penalty: 5
        };
        updateCctvIncidentBanner();

        const logMsg = isEn
          ? `[EVA INCIDENT SOL ${state.sol}] TIMEOUT: SAFETY ABORT (-5% ${resName})`
          : `[INCIDENTE EVA SOL ${state.sol}] TIEMPO AGOTADO: ABORTO DE SEGURIDAD (-5% ${resName})`;
        state.solLogs.push(`<div class="text-rose-400 font-semibold bg-rose-950/30 border border-rose-500/20 px-2 py-1 rounded">${logMsg}</div>`);

        if (banner) {
          banner.textContent = isEn
            ? `TIME EXPIRED! // SAFETY ABORT (-5% ${resName})`
            : `¡TIEMPO AGOTADO! // ABORTO DE SEGURIDAD (-5% ${resName})`;
          banner.className = 'absolute top-20 z-50 px-8 py-3 rounded-xl border-2 border-rose-500 bg-rose-950/95 text-rose-300 text-center font-scifi uppercase tracking-widest font-black text-sm md:text-base shadow-[0_0_35px_rgba(244,63,94,0.7)]';
          banner.classList.remove('hidden');
        }

        // Chequeo de colapso crítico si el recurso llega a 0
        const failedResource = Object.entries(state.resources).find(([, v]) => v <= 0);
        if (failedResource) {
          clearSavedGame();
          setTimeout(() => triggerCriticalFailure(failedResource[0]), 650);
          return;
        }
      } else {
        if (banner) {
          banner.textContent = isEn
            ? 'TIME EXPIRED // SIMULATION ENDED (PRACTICE MODE)'
            : 'TIEMPO AGOTADO // FIN DE SIMULACIÓN (MODO PRÁCTICA)';
          banner.className = 'absolute top-20 z-50 px-8 py-3 rounded-xl border-2 border-zinc-500 bg-zinc-950/95 text-zinc-300 text-center font-scifi uppercase tracking-widest font-black text-sm md:text-base shadow-[0_0_20px_rgba(0,0,0,0.8)]';
          banner.classList.remove('hidden');
        }
      }

      setTimeout(() => {
        closeEvaModal();
      }, 2400);
    }
  }

  // Inicialización de Listeners Generales de EVA
  function initEvaFirstPerson() {
    const abortBtn = document.getElementById('eva-abort-btn');
    if (abortBtn) {
      abortBtn.addEventListener('click', closeEvaModal);
    }
    initEvaGloveInteractions();
  }


  window.addEventListener('DOMContentLoaded', () => {
    startTitleScreenFlow();
    initSettingsModal();
    applyLanguage(window.GAME_SETTINGS.lang);
    initGlobalDragListenersOnce();
    updateWorkspaceScale(false);
    injectResourceImpactDots();
    initExteriorParticles();
    initCctv();
    initEvaFirstPerson();
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
    cacheScannerLensOffset();
    refreshTitleScreenSaveBanner();
    updateCctvIncidentBanner();
    renderCurrentCase(false);

    window.addEventListener('resize', () => {
      fitGameToScreen();
      updateWorkspaceScale(true);
      cacheScannerLensOffset();
    });
    fitGameToScreen();
  });
})();
