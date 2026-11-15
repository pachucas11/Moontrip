# REGLAS DE ARQUITECTURA - AIRLOCK QUARTERMASTER (NASA SPACE APPS)
1. CERO LIBRERÍAS EXTERNAS DE JS: Usa únicamente Vanilla JavaScript (ES6+), HTML5 y Tailwind CSS (vía CDN).
2. PROHIBIDO EL SCROLL: La aplicación entera debe vivir en `h-screen w-screen overflow-hidden select-none`.
3. REGLA ANTI-DASHBOARD: Prohibido crear tablas de telemetría, gráficas o botones simples de "+1 recurso". Toda acción del jugador debe ser TÁCTIL (arrastrar objetos en el escritorio, pasar el escáner por encima, estampar sellos físicos).
4. LOS 4 RECURSOS OFICIALES: Toda la simulación gira únicamente en torno a 4 pilares (0% a 100%):
   - Life Support (Soporte Vital / O2)
   - Radiation Shielding (Escudo de Radiación)
   - Power (Energía)
   - Food Production (Producción de Comida)
   Si cualquiera llega a 0%, ocurre un fallo crítico inmediato.
5. ARQUITECTURA DE ARCHIVOS: Mantén todo separado estrictamente en `index.html`, `styles.css` y `game.js`.
