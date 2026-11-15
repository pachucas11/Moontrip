// music.js
let audioCtx = null;
let musicPlaying = false;
let musicNodes = [];

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function toggleSpaceMusic() {
  initAudio(); // Asegura que el audio esté despierto

  const btn = document.getElementById('music-toggle-btn');

  if (musicPlaying) {
    // APAGAR MÚSICA
    musicNodes.forEach(node => {
      try {
        if (node.gain) node.gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
        if (node.osc) node.osc.stop(audioCtx.currentTime + 1.5);
        if (node.lfo) node.lfo.stop(audioCtx.currentTime + 1.5);
      } catch(e) {}
    });
    musicNodes = [];
    musicPlaying = false;
    if (btn) {
      btn.innerHTML = '🔇 Música: OFF';
      btn.classList.replace('text-emerald-400', 'text-cyan-300');
    }
  } else {
    // ENCENDER MÚSICA
    musicPlaying = true;
    if (btn) {
      btn.innerHTML = '🎵 Música: ON';
      btn.classList.replace('text-cyan-300', 'text-emerald-400');
    }

    const freqs = [55.00, 110.00, 164.81, 220.00];
    
    freqs.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;

      filter.type = 'lowpass';
      filter.frequency.value = 400 + (i * 100);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      
      gain.gain.setTargetAtTime(0.15 / (i + 1), audioCtx.currentTime, 2);

      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.1 + (i * 0.05);
      lfoGain.gain.value = 3;
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      musicNodes.push({ osc, gain, lfo });
    });
  }
}

// Arranca automáticamente al hacer el primer clic en el juego (para desbloquear)
document.addEventListener('click', function initAudioOnce() {
  initAudio();
  if (!musicPlaying) {
    toggleSpaceMusic();
  }
  document.removeEventListener('click', initAudioOnce);
});

// Escuchar el botón manual
document.addEventListener('click', function(e) {
  if (e.target.closest('#music-toggle-btn')) {
    toggleSpaceMusic();
  }
});