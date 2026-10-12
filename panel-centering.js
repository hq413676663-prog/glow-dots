(() => {
  const DESKTOP = '(min-width: 1025px)';
  const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
  const MOVE_DURATION = 0.42;
  let initialized = false;
  let allowOpenClick = false;
  let closeTimer = 0;

  const getParts = () => {
    const hero = document.querySelector('.glow-dots-shell .hero');
    return {
      hero,
      main: hero?.querySelector('.hero__stage-main'),
      panel: hero?.querySelector('.hero__settings-panel')
    };
  };

  const centerOffset = (hero) => {
    const value = getComputedStyle(hero).getPropertyValue('--settings-panel-width');
    return (Number.parseFloat(value) || 300) / 2;
  };

  const setShift = (main, value) => {
    main.style.setProperty('--panel-center-shift', `${value}px`);
  };

  const animateShift = (hero, main, value, onComplete) => {
    const duration = matchMedia(REDUCED_MOTION).matches ? 0 : MOVE_DURATION;
    if (window.gsap) {
      window.gsap.to(main, {
        '--panel-center-shift': `${value}px`,
        duration,
        ease: 'power3.inOut',
        overwrite: 'auto',
        onComplete
      });
      return;
    }
    setShift(main, value);
    window.setTimeout(onComplete || (() => {}), duration * 1000);
  };

  const sync = (animate = false) => {
    const { hero, main } = getParts();
    if (!hero || !main) return;
    if (!matchMedia(DESKTOP).matches) {
      setShift(main, 0);
      return;
    }
    const closed = hero.dataset.settingsOpen === 'false';
    const value = closed ? centerOffset(hero) : 0;
    if (animate) animateShift(hero, main, value);
    else setShift(main, value);
  };

  const initialize = () => {
    const { hero, main } = getParts();
    if (!hero || !main || initialized) return false;
    initialized = true;
    sync(false);

    new MutationObserver(() => {
      window.clearTimeout(closeTimer);
      if (hero.dataset.settingsOpen !== 'false') {
        setShift(main, 0);
        return;
      }
      const foldSeconds = Number.parseFloat(
        getComputedStyle(hero).getPropertyValue('--fold-duration')
      ) || 0.6;
      closeTimer = window.setTimeout(() => {
        if (hero.dataset.settingsOpen === 'false') {
          animateShift(hero, main, centerOffset(hero));
        }
      }, matchMedia(REDUCED_MOTION).matches ? 0 : foldSeconds * 1000);
    }).observe(hero, { attributes: true, attributeFilter: ['data-settings-open'] });

    addEventListener('resize', () => sync(false), { passive: true });
    window.setTimeout(() => sync(false), 900);
    return true;
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-dot-inline-toggle]');
    if (!button || allowOpenClick || !matchMedia(DESKTOP).matches) return;
    const { hero, main } = getParts();
    if (!hero || !main) return;

    if (hero.dataset.settingsOpen !== 'false') {
      const foldSeconds = Number.parseFloat(
        getComputedStyle(hero).getPropertyValue('--fold-duration')
      ) || 0.6;
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        if (hero.dataset.settingsOpen === 'false') {
          animateShift(hero, main, centerOffset(hero));
        }
      }, matchMedia(REDUCED_MOTION).matches ? 0 : foldSeconds * 1000);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    animateShift(hero, main, 0, () => {
      allowOpenClick = true;
      button.click();
      allowOpenClick = false;
    });
  }, true);

  const boot = () => {
    if (!initialize()) requestAnimationFrame(boot);
  };
  boot();
})();
