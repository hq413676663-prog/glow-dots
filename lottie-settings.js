(() => {
  'use strict';
  const KEY = 'glow-dots:lottie-settings-v1';
  const defaults = { trigger: 'always', shape: 'rectangle', gap: 6, size: 68, roundness: 50, projectionSize: 83, durationSeconds: 84, scatter: 10 };
  let active = false;
  let panels = [];
  const ranges = { gap: [0,100], size: [40,100], roundness: [8,50], projectionSize: [1,200], durationSeconds: [1,600], scatter: [0,40] };
  function read() {
    let saved; try { saved = JSON.parse(localStorage.getItem(KEY)); } catch {}
    const config = { ...defaults, ...saved };
    for (const [key, [min,max]] of Object.entries(ranges)) {
      config[key] = Number.isFinite(Number(config[key])) ? Math.max(min, Math.min(max, Number(config[key]))) : defaults[key];
    }
    if (!['rectangle','star','honeycomb'].includes(config.shape)) config.shape = 'rectangle';
    if (!['hover','click','always'].includes(config.trigger)) config.trigger = 'always';
    return config;
  }
  function save(key, value) {
    const config = read();
    config[key] = value;
    localStorage.setItem(KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('glow-dots:lottie-settings-change', { detail: { key, value } }));
  }
  function row(key, label, title) {
    const el = document.createElement('div');
    el.className = 'setting-row carousel-controls__field--stacked';
    const [min,max] = ranges[key];
    el.innerHTML = `<span class="setting-label">${label}</span><div class="setting-control"><input class="lottie-setting-range" type="range" min="${min}" max="${max}" step="1" aria-label="Lottie ${label}" title="${title}"></div><div class="setting-value settings-integer-field"><input class="settings-integer-input" type="number" min="${min}" max="${max}" step="1" aria-label="Lottie ${label}数值" title="${title}"></div>`;
    const [slider, number] = el.querySelectorAll('input');
    function sync(value) { slider.value = number.value = value; slider.style.setProperty("--progress", `${(Number(value)-min)/(max-min)*100}%`); }
    sync(read()[key]);
    slider.addEventListener('input', () => { save(key, Number(slider.value)); sync(slider.value); });
    function commit() {
      if (number.value === '' || !Number.isFinite(Number(number.value))) return sync(read()[key]);
      const value = Math.max(min, Math.min(max, Math.round(Number(number.value))));
      save(key,value); sync(value);
    }
    number.addEventListener('input', () => { if (/^\d+$/.test(number.value) && Number(number.value)>=min && Number(number.value)<=max) { save(key, Number(number.value)); slider.value = number.value; slider.style.setProperty("--progress", `${(Number(number.value)-min)/(max-min)*100}%`); } });
    number.addEventListener('change',commit); number.addEventListener('blur',commit);
    number.addEventListener('keydown', e => { if (['e','E','.','+','-'].includes(e.key)) e.preventDefault(); if(e.key==='Enter') { commit(); number.blur(); } });
    return el;
  }
  function install() {
    const grid = document.querySelector('[data-dot-section-toggle="Grid"]')?.closest('section');
    const animation = document.querySelector('[data-dot-section-toggle="Animation"]')?.closest('section');
    const upload = document.getElementById('glow-dots-import');
    if (!grid || !animation || !upload) return false;
    if (grid.querySelector('.lottie-settings-panel')) { show(); return true; }
    panels = [];
    for (const [section, entries] of [[grid, [['gap','缩放','点阵间距'],['size','点大小','单个波点大小'],['roundness','半径','波点圆角']]], [animation,[['projectionSize','大小','投射尺寸百分比：100 为适应画布，200 为两倍尺寸'],['durationSeconds','时长（秒）','完整播放一遍所需秒数，数值越小播放越快'],['scatter','散布','向周围波点晕染的范围与强度，0 为无晕染']]]]) {
      const body = section.querySelector(':scope > .carousel-controls__body');
      const panel = document.createElement('div'); panel.className = 'lottie-settings-panel';
      if (section === animation) {
        const trigger = document.createElement('div');
        trigger.className = 'setting-row carousel-controls__field--tabs';
        trigger.innerHTML = '<span class="setting-label">触发方式</span><div class="setting-control carousel-controls__button-group carousel-controls__button-group--trigger"></div>';
        for (const [key,label] of [['hover','悬停'],['click','点击'],['always','始终']]) {
          const button = document.createElement('button');
          button.type = 'button'; button.className = 'carousel-controls__tab'; button.textContent = label;
          button.classList.toggle('is-active', read().trigger === key);
          button.setAttribute('aria-pressed', String(read().trigger === key));
          button.addEventListener('click', () => {
            save('trigger', key);
            for (const b of trigger.querySelectorAll('button')) {
              b.classList.toggle('is-active', b === button);
              b.setAttribute('aria-pressed', String(b === button));
            }
          });
          trigger.lastChild.append(button);
        }
        panel.append(trigger);
      }
      if (section === grid) {
        const shape = document.createElement('div'); shape.className='setting-row carousel-controls__field--tabs';
        shape.innerHTML='<span class="setting-label">形状</span><div class="setting-control carousel-controls__button-group carousel-controls__button-group--shape"></div>';
        for (const [key,label] of [['rectangle','矩形'],['star','星形'],['honeycomb','蜂巢']]) {
          const button=document.createElement('button'); button.type='button'; button.className='carousel-controls__tab'; button.textContent=label;
          button.classList.toggle('is-active',read().shape===key); button.setAttribute('aria-pressed',String(read().shape===key));
          button.addEventListener('click',()=>{save('shape',key); for(const b of shape.querySelectorAll('button')) {b.classList.toggle('is-active',b===button);b.setAttribute('aria-pressed',String(b===button));}});
          shape.lastChild.append(button);
        }
        panel.append(shape);
      }
      for (const args of entries) panel.append(row(...args));
      for (const child of body.children) if(child!==upload) child.classList.add('lottie-native-control');
      body.prepend(panel); panels.push(panel);
    }
    show(); return true;
  }
  function show() { document.querySelector('.glow-dots-shell')?.classList.toggle('lottie-settings-active',active); }
  function rebuild() { for(const p of panels) p.remove(); panels=[]; install(); }
  function reset() {
    localStorage.setItem(KEY, JSON.stringify(defaults));
    window.dispatchEvent(new CustomEvent('glow-dots:lottie-settings-change', { detail: { reset: true } }));
    active=true; rebuild();
  }
  async function download() {
    const data = await window.GlowDotsLottie.exportLottie();
    const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
    if (blob.size > 20 * 1024 * 1024) throw new Error('文件超过 LottieFiles 的 20MB 限制，请减小画布后重试');
    const url = URL.createObjectURL(blob);
    const originalName = localStorage.getItem('glow-dots:lottie-name') || '动画.json';
    const link = document.createElement('a'); link.href = url;
    link.download = originalName.replace(/\.(json|lottie)$/i, '') + '-波点.json';
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  window.GlowDotsLottieSettings=Object.freeze({read,reset,download});
  window.addEventListener('glow-dots:lottie-ready',()=>{ active=true; install(); });
  window.addEventListener('glow-dots:lottie-clear',()=>{active=false;show();});
  const style=document.createElement('style');
  style.textContent=`.lottie-settings-panel{display:none}.lottie-settings-active .lottie-settings-panel{display:block}.lottie-settings-active .lottie-native-control{display:none!important}.lottie-settings-panel .setting-row{margin-bottom:8px}.lottie-setting-range{width:100%;height:2px;appearance:none;background:linear-gradient(to right,#0088ff 0 var(--progress),var(--panel-border) var(--progress) 100%);accent-color:#70caff;cursor:pointer}.lottie-setting-range::-webkit-slider-thumb{appearance:none;width:3px;height:20px;border-radius:2px;background:#70caff;box-shadow:0 0 8px #70caff}.lottie-setting-range::-moz-range-thumb{width:3px;height:20px;border:0;background:#70caff}`;
  document.head.append(style);
})();
