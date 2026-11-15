// =========================================================================
// MÓDULO DE INTRO CINEMÁTICA NARRATIVA — v5 (i18n ES/EN + Forzado Visual)
// =========================================================================

const STORY_I18N_KEY = 'story_intro_lang';

const STORY_TRANSLATIONS = {
  es: {
    line1: 'En 2026, la humanidad estableció su primera base permanente en el cráter Shackleton.',
    line2: 'Durante meses, el Comandante Vance y su equipo mantuvieron la paz en el silencio lunar.',
    line3: 'Pero hoy, las alarmas han despertado la base. Una tormenta solar Clase X se aproxima a la Tierra.',
    line4: 'La comunicación con Houston se ha perdido. La tripulación está atrapada... y depende de ti.',
    line5Line1: 'LA MISIÓN',
    line5Line2: 'COMIENZA HOY',
    langButton: 'EN',
    langButtonTitle: 'Switch to English'
  },
  en: {
    line1: 'In 2026, humanity established its first permanent base in the Shackleton crater.',
    line2: 'For months, Commander Vance and his team maintained peace in the lunar silence.',
    line3: 'But today, alarms have awakened the base. A Class X solar storm is approaching Earth.',
    line4: 'Communication with Houston has been lost. The crew is trapped... and they depend on you.',
    line5Line1: 'THE MISSION',
    line5Line2: 'STARTS TODAY',
    langButton: 'ES',
    langButtonTitle: 'Cambiar a Español'
  }
};

function getStoryLang() {
  try {
    const saved = localStorage.getItem(STORY_I18N_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch (_) {}
  const browserLang = (navigator.language || 'en').toLowerCase();
  return browserLang.startsWith('es') ? 'es' : 'en';
}

function setStoryLang(lang) {
  try { localStorage.setItem(STORY_I18N_KEY, lang); } catch (_) {}
}

window.injectStoryIntro = function () {
  if (document.getElementById('story-intro-overlay')) return;

  console.log('[story-intro] Inyectando HTML del overlay');
  const t = STORY_TRANSLATIONS[getStoryLang()];

  const introHTML = `
    <div id="story-intro-overlay" style="display:none; position:fixed; inset:0; z-index:10000; background:#000; overflow:hidden; font-family:monospace;">
      
      <!-- Botón de cambio de idioma -->
      <button id="story-lang-toggle" type="button" title="${t.langButtonTitle}"
        style="position:absolute; top:1.5rem; right:1.5rem; z-index:30; padding:0.5rem 1rem; background:rgba(15,23,42,0.9); border:2px solid #38bdf8; color:#7dd3fc; font-family:monospace; font-weight:900; font-size:0.9rem; letter-spacing:0.15em; border-radius:0.5rem; cursor:pointer; box-shadow:0 0 15px rgba(56,189,248,0.5); transition:all 0.2s ease;">
        ${t.langButton}
      </button>

      <div class="crt-scanlines" style="pointer-events:none; opacity:0.2; position:absolute; inset:0; z-index:20;"></div>

      <div style="position:absolute; inset:0; z-index:0;">
        <svg style="width:100%; height:100%;" viewBox="0 0 100 100" preserveAspectRatio="none">
          <circle cx="15" cy="20" r="0.3" fill="#fff" class="animate-pulse"/>
          <circle cx="85" cy="15" r="0.4" fill="#38bdf8" class="animate-ping"/>
          <circle cx="50" cy="85" r="0.3" fill="#fff" class="animate-pulse" style="animation-delay:1.5s"/>
          <circle cx="10" cy="60" r="0.2" fill="#fff"/>
          <circle cx="90" cy="70" r="0.3" fill="#10b981" class="animate-pulse" style="animation-delay:0.8s"/>
          <circle cx="40" cy="30" r="0.2" fill="#e879f9" class="animate-ping"/>
          <circle cx="70" cy="50" r="0.4" fill="#fbbf24"/>
        </svg>
        <div style="position:absolute; inset:0; background:linear-gradient(to bottom, transparent, rgba(15,23,42,0.6), transparent);"></div>
      </div>

      <div id="story-intro-content"
           style="position:relative; z-index:10; width:100%; height:100%; max-width:56rem; margin:0 auto; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:0 1.5rem; text-align:center; opacity:0; transform:scale(0.95); transition:opacity 1s ease, transform 1s ease;">

        <div style="position:relative; width:8rem; height:8rem; margin-bottom:2.5rem;">
          <svg viewBox="0 0 160 160" style="width:100%; height:100%; filter:drop-shadow(0 0 25px rgba(56,189,248,0.5)); animation:story-float 4s ease-in-out infinite;">
            <path d="M22 156 C22 102 138 102 138 156 Z" fill="#e2e8f0" stroke="#475569" stroke-width="3"/>
            <path d="M24 132 Q35 106 58 110 L52 132 Z" fill="#0ea5e9"/>
            <path d="M136 132 Q125 106 102 110 L108 132 Z" fill="#f59e0b"/>
            <ellipse cx="80" cy="102" rx="29" ry="7" fill="#1e293b" stroke="#cbd5e1" stroke-width="2"/>
            <circle cx="80" cy="66" r="37" fill="#f1f5f9" stroke="#94a3b8" stroke-width="3.5"/>
            <rect x="48" y="44" width="64" height="44" rx="21" fill="#020617" stroke="#38bdf8" stroke-width="3"/>
            <path d="M56 54 Q80 44 104 54" stroke="#e0f2fe" stroke-width="3" fill="none" stroke-linecap="round"/>
          </svg>
        </div>

        <div style="display:flex; flex-direction:column; gap:1.5rem; font-size:1.125rem; font-weight:bold; line-height:1.75; color:#e4e4e7;">
          <p id="s-line-1" data-story-key="line1" style="opacity:0; transform:translateY(1rem); transition:all 0.7s ease;">${t.line1}</p>
          <p id="s-line-2" data-story-key="line2" style="opacity:0; transform:translateY(1rem); transition:all 0.7s ease; color:#67e8f9;">${t.line2}</p>
          <p id="s-line-3" data-story-key="line3" style="opacity:0; transform:translateY(1rem); transition:all 0.7s ease; color:#fde68a;">${t.line3}</p>
          <p id="s-line-4" data-story-key="line4" style="opacity:0; transform:translateY(1rem); transition:all 0.7s ease; color:#fb7185;">${t.line4}</p>

          <div id="s-line-5" style="opacity:0; transform:translateY(2rem); transition:all 1s ease; margin-top:3rem; padding-top:2rem; border-top:1px solid rgba(6,182,212,0.3);">
            <span style="font-size:3rem; font-weight:900; color:#fff; text-transform:uppercase; letter-spacing:0.2em; filter:drop-shadow(0 0 20px rgba(56,189,248,0.8));">
              <span data-story-key="line5Line1">${t.line5Line1}</span><br><span data-story-key="line5Line2">${t.line5Line2}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
    <style>
      @keyframes story-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
      #story-lang-toggle:hover { background: #0ea5e9 !important; color: #020617 !important; transform: scale(1.05); }
    </style>
  `;

  document.body.insertAdjacentHTML('beforeend', introHTML);
  console.log('[story-intro] HTML inyectado correctamente');

  const langBtn = document.getElementById('story-lang-toggle');
  if (langBtn) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newLang = getStoryLang() === 'es' ? 'en' : 'es';
      setStoryLang(newLang);
      applyStoryLanguage(newLang);
    });
  }
};

function applyStoryLanguage(lang) {
  const t = STORY_TRANSLATIONS[lang];
  if (!t) return;
  document.querySelectorAll('#story-intro-overlay [data-story-key]').forEach((el) => {
    const key = el.getAttribute('data-story-key');
    if (t[key] !== undefined) el.textContent = t[key];
  });
  const btn = document.getElementById('story-lang-toggle');
  if (btn) {
    btn.textContent = t.langButton;
    btn.title = t.langButtonTitle;
  }
}

window.applyStoryLanguage = applyStoryLanguage;
window.getStoryLang = getStoryLang;
window.setStoryLang = setStoryLang;

window.playStoryIntro = function (onComplete) {
  const overlay = document.getElementById('story-intro-overlay');
  const content = document.getElementById('story-intro-content');

  if (!overlay || !content) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }

  applyStoryLanguage(getStoryLang());

  // FORZAR VISIBILIDAD
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  overlay.style.pointerEvents = 'auto';

  try {
    if (window.BGM && typeof window.BGM.playStoryMusic === 'function') window.BGM.playStoryMusic();
    if (window.sfx && typeof window.sfx.playBootSequence === 'function') window.sfx.playBootSequence();
  } catch (e) {}

  requestAnimationFrame(() => {
    content.style.opacity = '1';
    content.style.transform = 'scale(1)';
  });

  const lines = ['s-line-1', 's-line-2', 's-line-3', 's-line-4', 's-line-5'].map(id => document.getElementById(id));

  // ---------------------------------------------------------------------
  // LÓGICA DE SALTO (SKIP)
  // ---------------------------------------------------------------------
  let timers = [];
  let isCompleted = false;

  const cleanupAndFinish = () => {
    if (isCompleted) return;
    isCompleted = true;

    // Limpiar todos los temporizadores pendientes
    timers.forEach(t => clearTimeout(t));
    timers = [];

    // Remover listeners para evitar fuga de memoria
    overlay.removeEventListener('click', handleSkipClick);
    window.removeEventListener('keydown', handleSkipKey);

    // Ocultar overlay
    content.style.opacity = '0';
    content.style.transform = 'scale(1.1)';
    
    setTimeout(() => {
      overlay.style.display = 'none';
      if (typeof onComplete === 'function') {
        try { onComplete(); } catch (e) {}
      }
    }, 300); // Transición rápida al saltar
  };

  const handleSkipClick = (e) => {
    // Si se hace clic en el botón de idioma, no saltar la intro
    if (e.target.closest('#story-lang-toggle')) return;
    cleanupAndFinish();
  };

  const handleSkipKey = (e) => {
    // Teclas permitidas para saltar: Espacio, Enter, Escape
    if (['Space', 'Enter', 'Escape'].includes(e.code) || e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      cleanupAndFinish();
    }
  };

  // Registrar eventos de teclado y clic
  overlay.addEventListener('click', handleSkipClick);
  window.addEventListener('keydown', handleSkipKey);
  // ---------------------------------------------------------------------

  let delay = 1200;
  lines.forEach((line, index) => {
    const tId = setTimeout(() => {
      if (!line || isCompleted) return;
      line.style.opacity = '1';
      line.style.transform = 'translateY(0)';
      try {
        if (window.sfx) {
          if (index === 2 || index === 3) window.sfx.playEmergencyAlarm();
          else if (index === 4) window.sfx.playMinigameSuccess();
          else window.sfx.playRadioChirp('astronaut');
        }
      } catch (e) {}
    }, delay);

    timers.push(tId);
    delay += (index === 4 ? 3000 : 2200);
  });

  // Temporizador para finalización natural si no se salta
  const finalTimer = setTimeout(() => {
    cleanupAndFinish();
  }, delay + 1200);

  timers.push(finalTimer);
};