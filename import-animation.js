(() => {
  "use strict";

  const MAX_FILE_SIZE = 4 * 1024 * 1024;
  const STORAGE = Object.freeze({
    size: "glow-dots:size",
    roundness: "glow-dots:roundness",
    radius: "glow-dots:hover-radius",
    gap: "glow-dots:gap",
    randomSpread: "glow-dots:random-spread",
    fadeDuration: "glow-dots:fade-duration",
    glowFalloff: "glow-dots:glow-falloff",
    previewMode: "glow-dots:preview-mode",
    interactionMode: "glow-dots:interaction-mode",
    displayMode: "glow-dots:display-mode",
    customText: "glow-dots:custom-text",
    visualConfig: "glow-dots:visual-config",
    theme: "glow-dots:theme",
    renderScale: "glow-dots:render-scale",
    modeControls: "glow-dots:mode-controls",
    audioLimit: "glow-dots:audio-limit",
    audioRandomness: "glow-dots:audio-randomness",
    audioVolume: "glow-dots:audio-volume",
    audioWidth: "glow-dots:audio-width",
    audioPitch: "glow-dots:audio-pitch",
    audioTime: "glow-dots:audio-time",
    audioOffset: "glow-dots:audio-offset",
    audioSound: "glow-dots:audio-sound",
    audioSoundSettings: "glow-dots:audio-sound-settings",
    audioMuted: "glow-dots:audio-muted",
    shape: "glow-dots:shape",
    shapeControls: "glow-dots:shape-controls",
    lottieActive: "glow-dots:lottie-active",
    lottieData: "glow-dots:lottie-data",
    lottieName: "glow-dots:lottie-name"
  });

  const MODES = Object.freeze([
    "hover",
    "ripple",
    "countdown",
    "water",
    "matrix",
    "vortex",
    "comet",
    "drift",
    "bloom",
    "prism",
    "boom",
    "stars",
    "aura"
  ]);
  const MODE_ALIASES = Object.freeze({
    glow: "hover",
    count: "countdown",
    countdown: "countdown",
    water: "countdown",
    click: "ripple",
    pulse: "prism",
    confetti: "boom",
    orbit: "stars",
    nova: "aura"
  });
  const TRIGGERS = Object.freeze(["hover", "click", "always"]);
  const SHAPES = Object.freeze(["rectangle", "star", "honeycomb"]);
  const SOUNDS = Object.freeze(["clicks", "foam", "fire"]);

  const MODE_DEFAULTS = Object.freeze({
    hover: { spread: 27, core: 18, softness: 76 },
    countdown: { size: 20, softness: 72 },
    water: { turbulence: 54, layers: 66 },
    ripple: { waves: 60, reflection: 68 },
    matrix: { pattern: 58, randomness: 52 },
    vortex: { spin: 70, density: 56 },
    comet: { trails: 60, spread: 48 },
    drift: { flow: 58, shear: 78 },
    bloom: { petals: 52, curl: 60 },
    prism: { facets: 62, split: 54 },
    boom: { pieces: 68, force: 72 },
    stars: { twinkle: 64, depth: 58 },
    aura: { pull: 62, flow: 68 }
  });

  const CONTROL_RANGES = Object.freeze({
    hover: { spread: [0, 100], core: [0, 100], softness: [0, 100] },
    countdown: { size: [0, 100], softness: [0, 100] },
    water: { turbulence: [0, 100], layers: [0, 100] },
    ripple: { waves: [0, 100], reflection: [0, 100] },
    matrix: { pattern: [0, 100], randomness: [0, 100] },
    vortex: { spin: [0, 100], density: [0, 100] },
    comet: { trails: [0, 100], spread: [0, 100] },
    drift: { flow: [0, 100], shear: [0, 100] },
    bloom: { petals: [0, 100], curl: [0, 100] },
    prism: { facets: [0, 100], split: [0, 100] },
    boom: { pieces: [0, 100], force: [0, 100] },
    stars: { twinkle: [0, 100], depth: [0, 100] },
    aura: { pull: [0, 100], flow: [0, 100] }
  });

  const SHAPE_RANGES = Object.freeze({
    star: { size: [40, 100], points: [3, 6], depth: [10, 90], randomness: [0, 100] },
    honeycomb: { size: [40, 100], roundness: [0, 50] }
  });

  const SHAPE_DEFAULTS = Object.freeze({
    star: { points: 4, depth: 53, randomness: 0 },
    honeycomb: { roundness: 0 }
  });

  const VISUAL_DEFAULTS = Object.freeze({
    theme: "dark",
    useP3: false,
    fillColor: "#FFBB00",
    glowColor: "#FF5500",
    glowStrength: 25,
    glowBlur: 46.1,
    glowSpread: 20,
    glowHueShift: 331,
    innerShadowColor: "rgba(255,255,255,.21)",
    innerShadowBlur: 24,
    innerShadowSpread: 6.3
  });

  const scriptUrl = document.currentScript?.src || location.href;
  let lottieRuntimePromise = null;

  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);

  function ensureLottieRuntime() {
    if (window.GlowDotsLottie) return Promise.resolve(window.GlowDotsLottie);
    if (lottieRuntimePromise) return lottieRuntimePromise;
    lottieRuntimePromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-glow-dots-lottie-runtime]");
      const script = existing || document.createElement("script");
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (window.GlowDotsLottie) resolve(window.GlowDotsLottie);
        else reject(new Error("Lottie 模式初始化失败"));
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        lottieRuntimePromise = null;
        reject(new Error("Lottie 模式初始化失败"));
      };
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", fail, { once: true });
      if (!existing) {
        script.src = new URL("./lottie-dots-runtime.js?v=10", scriptUrl).href;
        script.dataset.glowDotsLottieRuntime = "true";
        document.head.appendChild(script);
      } else if (window.GlowDotsLottie) {
        finish();
      }
    });
    return lottieRuntimePromise;
  }

  function cloneJson(value, depth = 0) {
    if (depth > 8) throw new Error("参数层级过深");
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error("参数包含无效数字");
      return value;
    }
    if (Array.isArray(value)) return value.map(item => cloneJson(item, depth + 1));
    if (!isRecord(value)) throw new Error("参数包含不支持的值");
    const result = {};
    Object.entries(value).forEach(([key, item]) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") return;
      result[key] = cloneJson(item, depth + 1);
    });
    return result;
  }

  function number(value, min, max, label) {
    const result = Number(value);
    if (!Number.isFinite(result)) throw new Error(`${label}必须是数字`);
    return Math.min(max, Math.max(min, result));
  }

  function optionalNumber(value, min, max, fallback, label) {
    return value === undefined || value === null ? fallback : number(value, min, max, label);
  }

  function boolean(value, label) {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "1" || value === 1) return true;
    if (value === "false" || value === "0" || value === 0) return false;
    throw new Error(`${label}必须是 true 或 false`);
  }

  function normalizeMode(value, label = "动画模式") {
    const raw = String(value ?? "").trim().toLowerCase();
    const normalized = MODE_ALIASES[raw] || raw;
    if (!MODES.includes(normalized)) throw new Error(`${label}“${raw || "空"}”不受支持`);
    return normalized;
  }

  function normalizeTrigger(value) {
    const raw = String(value ?? "").trim().toLowerCase();
    if (!TRIGGERS.includes(raw)) throw new Error(`触发方式“${raw || "空"}”不受支持`);
    return raw;
  }

  function normalizeTriggerForMode(value, mode) {
    const trigger = normalizeTrigger(value);
    if (mode === "matrix" || mode === "countdown") return "always";
    if (mode === "drift" && trigger === "hover") return "click";
    return trigger;
  }

  function normalizeShape(value) {
    const raw = String(value ?? "").trim().toLowerCase();
    if (!SHAPES.includes(raw)) throw new Error(`形状“${raw || "空"}”不受支持`);
    return raw;
  }

  function normalizeSound(value) {
    const raw = String(value ?? "").trim().toLowerCase();
    if (!SOUNDS.includes(raw)) throw new Error(`声音“${raw || "空"}”不受支持`);
    return raw;
  }

  function readStoredObject(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      if (!value) return cloneJson(fallback);
      const parsed = JSON.parse(value);
      return isRecord(parsed) ? parsed : cloneJson(fallback);
    } catch {
      return cloneJson(fallback);
    }
  }

  function cssColor(value, label) {
    if (typeof value !== "string" || value.trim().length === 0 || value.length > 160) {
      throw new Error(`${label}不是有效颜色`);
    }
    const color = value.trim();
    let supported = false;
    try {
      supported = typeof CSS !== "undefined" && CSS.supports("color", color);
    } catch {
      supported = false;
    }
    if (!supported && !/^(?:#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})|(?:rgb|rgba|hsl|hsla)\([^)]*\)|color\([^)]*\))$/i.test(color)) {
      throw new Error(`${label}不是有效颜色`);
    }
    return color;
  }

  function normalizedControls(input, current, selectedMode = "hover") {
    const result = {};
    Object.entries(MODE_DEFAULTS).forEach(([mode, defaults]) => {
      result[mode] = {};
      Object.entries(defaults).forEach(([key, fallback]) => {
        const currentValue = current?.[mode]?.[key];
        result[mode][key] = Number.isFinite(Number(currentValue)) ? number(currentValue, 0, 100, `${mode}.${key}`) : fallback;
      });
    });
    if (input === undefined) return result;
    if (!isRecord(input)) throw new Error("动画 controls 必须是对象");

    const modeKeys = Object.keys(input).filter(key => {
      try {
        normalizeMode(key, "controls 模式");
        return true;
      } catch {
        return false;
      }
    });
    let entries;
    if (modeKeys.length > 0) {
      entries = Object.entries(input).filter(([rawMode]) => modeKeys.includes(rawMode));
    } else {
      const values = Object.values(input);
      const looksLikeDirectControls = values.every(value => Number.isFinite(Number(value)));
      if (!looksLikeDirectControls) throw new Error("controls 中没有可识别的动画模式");
      entries = [[normalizeMode(selectedMode, "controls 模式"), input]];
    }
    entries.forEach(([rawMode, values]) => {
      const mode = normalizeMode(rawMode, "controls 模式");
      if (!isRecord(values)) throw new Error(`${rawMode} controls 必须是对象`);
      const range = CONTROL_RANGES[mode] || {};
      Object.entries(values).forEach(([key, value]) => {
        if (!(key in range)) return;
        result[mode][key] = number(value, range[key][0], range[key][1], `${mode}.${key}`);
      });
    });
    return result;
  }

  function normalizedShapeControls(input, current, baseSize) {
    const storedSize = Number(localStorage.getItem(STORAGE.size));
    const defaultSize = Number.isFinite(Number(baseSize))
      ? number(baseSize, 40, 100, "shape.size")
      : (Number.isFinite(storedSize) ? number(storedSize, 40, 100, "shape.size") : 49);
    const result = {};
    Object.entries(SHAPE_RANGES).forEach(([shape, ranges]) => {
      result[shape] = {};
      Object.entries(ranges).forEach(([key, range]) => {
        const fallback = current?.[shape]?.[key];
        const builtInDefault = key === "size" ? defaultSize : SHAPE_DEFAULTS[shape][key];
        result[shape][key] = Number.isFinite(Number(fallback))
          ? number(fallback, range[0], range[1], `${shape}.${key}`)
          : number(builtInDefault, range[0], range[1], `${shape}.${key}`);
      });
    });
    if (input === undefined) return result;
    if (!isRecord(input)) throw new Error("shape.controls 必须是对象");
    Object.entries(input).forEach(([rawShape, values]) => {
      const shape = normalizeShape(rawShape);
      if (!SHAPE_RANGES[shape]) return;
      if (!isRecord(values)) throw new Error(`${rawShape} controls 必须是对象`);
      Object.entries(values).forEach(([key, value]) => {
        const range = SHAPE_RANGES[shape][key];
        if (!range) return;
        result[shape][key] = number(value, range[0], range[1], `${shape}.${key}`);
      });
    });
    return result;
  }

  function normalizedVisual(input) {
    const current = readStoredObject(STORAGE.visualConfig, VISUAL_DEFAULTS);
    const result = { ...VISUAL_DEFAULTS, ...current };
    if (input === undefined) return result;
    if (!isRecord(input)) throw new Error("lighting 必须是对象");
    if (has(input, "theme")) {
      const theme = String(input.theme).toLowerCase();
      if (theme !== "dark" && theme !== "light") throw new Error("主题必须是 dark 或 light");
      result.theme = theme;
    }
    if (has(input, "useP3")) result.useP3 = boolean(input.useP3, "P3 色彩");
    ["fillColor", "glowColor", "innerShadowColor"].forEach(key => {
      if (has(input, key)) result[key] = cssColor(input[key], key);
    });
    result.glowStrength = optionalNumber(input.glowStrength, 0, 100, result.glowStrength, "glowStrength");
    result.glowBlur = optionalNumber(input.glowBlur, 8, 120, result.glowBlur, "glowBlur");
    result.glowSpread = optionalNumber(input.glowSpread, 0, 100, result.glowSpread, "glowSpread");
    result.glowHueShift = optionalNumber(input.glowHueShift, 0, 360, result.glowHueShift, "glowHueShift");
    result.innerShadowBlur = optionalNumber(input.innerShadowBlur, 0, 120, result.innerShadowBlur, "innerShadowBlur");
    result.innerShadowSpread = optionalNumber(input.innerShadowSpread, 0, 100, result.innerShadowSpread, "innerShadowSpread");
    return result;
  }

  function normalizedAudioSettings(input) {
    if (input === undefined) return null;
    if (!isRecord(input)) throw new Error("audio.settings 必须是对象");
    return cloneJson(input);
  }

  const AUDIO_SETTING_FIELDS = Object.freeze({
    volume: "audioVolume",
    width: "audioWidth",
    pitch: "audioPitch",
    time: "audioTime",
    offsetPercent: "audioOffset",
    offset: "audioOffset",
    limit: "audioLimit",
    randomness: "audioRandomness"
  });

  function normalizePreset(raw) {
    const source = isRecord(raw?.preset) ? raw.preset : raw;
    if (!isRecord(source)) throw new Error("JSON 根节点必须是对象");
    const writes = [];
    const summary = [];
    const put = (key, value, label) => {
      writes.push([key, String(value)]);
      if (label) summary.push(label);
    };
    const putJson = (key, value) => writes.push([key, JSON.stringify(value)]);
    let recognized = false;

    const shape = source.shape;
    if (shape !== undefined) {
      recognized = true;
      if (!isRecord(shape)) throw new Error("shape 必须是对象");
      const shapeSize = has(shape, "size") ? number(shape.size, 40, 100, "shape.size") : undefined;
      if (shapeSize !== undefined) put(STORAGE.size, shapeSize, "网格");
      if (has(shape, "roundness")) put(STORAGE.roundness, number(shape.roundness, 8, 50, "shape.roundness"));
      if (has(shape, "scale")) put(STORAGE.gap, number(shape.scale, 0, 100, "shape.scale"));
      if (has(shape, "glowFalloff")) put(STORAGE.glowFalloff, number(shape.glowFalloff, 0, 100, "shape.glowFalloff"));
      if (has(shape, "configMode")) put(STORAGE.previewMode, boolean(shape.configMode, "shape.configMode"));
      if (has(shape, "type")) put(STORAGE.shape, normalizeShape(shape.type));
      if (has(shape, "controls")) putJson(STORAGE.shapeControls, normalizedShapeControls(shape.controls, readStoredObject(STORAGE.shapeControls, {}), shapeSize));
    }

    const animationKeys = ["size", "duration", "randomSpread", "mode", "trigger", "controls"];
    const animationAtRoot = source.animation === undefined && animationKeys.some(key => has(source, key));
    const animation = animationAtRoot ? source : source.animation;
    const selectedMode = animation && isRecord(animation) && has(animation, "mode") ? normalizeMode(animation.mode) : null;
    if (animation !== undefined) {
      recognized = true;
      if (!isRecord(animation)) throw new Error("animation 必须是对象");
      const animationSize = has(animation, "size") ? number(animation.size, 8, 100, "animation.size") : undefined;
      if (animationSize !== undefined && selectedMode !== "countdown") put(STORAGE.radius, animationSize);
      if (has(animation, "duration")) put(STORAGE.fadeDuration, number(animation.duration, 15, 220, "animation.duration"));
      if (has(animation, "randomSpread")) put(STORAGE.randomSpread, number(animation.randomSpread, 0, 40, "animation.randomSpread"));
      if (selectedMode) put(STORAGE.displayMode, selectedMode, "动画");
      if (has(animation, "trigger")) put(STORAGE.interactionMode, normalizeTriggerForMode(animation.trigger, selectedMode));
      const controlsInput = has(animation, "controls") ? animation.controls : source.controls;
      if (controlsInput !== undefined || (selectedMode === "countdown" && animationSize !== undefined)) {
        const controls = normalizedControls(controlsInput, readStoredObject(STORAGE.modeControls, MODE_DEFAULTS), selectedMode || "hover");
        if (selectedMode === "countdown" && animationSize !== undefined) controls.countdown.size = animationSize;
        putJson(STORAGE.modeControls, controls);
      }
    }

    if (!animationAtRoot && has(source, "mode")) {
      recognized = true;
      put(STORAGE.displayMode, normalizeMode(source.mode), "动画");
    }
    if (!animationAtRoot && has(source, "trigger")) {
      recognized = true;
      const rootMode = has(source, "mode") ? normalizeMode(source.mode) : null;
      put(STORAGE.interactionMode, normalizeTriggerForMode(source.trigger, rootMode));
    }
    if (has(source, "display")) {
      recognized = true;
      if (!isRecord(source.display)) throw new Error("display 必须是对象");
      if (has(source.display, "customText")) put(STORAGE.customText, String(source.display.customText).slice(0, 24));
    }

    const lighting = source.lighting ?? source.visualConfig;
    if (lighting !== undefined) {
      recognized = true;
      putJson(STORAGE.visualConfig, normalizedVisual(lighting));
      if (isRecord(lighting) && has(lighting, "theme")) {
        const theme = String(lighting.theme).toLowerCase();
        if (theme === "dark" || theme === "light") put(STORAGE.theme, theme);
      }
    }

    const audio = source.audio;
    if (audio !== undefined) {
      recognized = true;
      if (!isRecord(audio)) throw new Error("audio 必须是对象");
      let sound = "clicks";
      try { sound = normalizeSound(localStorage.getItem(STORAGE.audioSound) || sound); } catch {}
      if (has(audio, "sound")) sound = normalizeSound(audio.sound);
      if (has(audio, "sound")) put(STORAGE.audioSound, sound);
      const audioValues = {};
      const readAudioValue = (field, key, min, max, label) => {
        if (!has(audio, field)) return;
        const value = number(audio[field], min, max, label);
        put(key, value);
        audioValues[AUDIO_SETTING_FIELDS[field]] = value;
      };
      readAudioValue("volume", STORAGE.audioVolume, 0, 20, "audio.volume");
      readAudioValue("width", STORAGE.audioWidth, 0, 1, "audio.width");
      readAudioValue("pitch", STORAGE.audioPitch, 0.1, 4, "audio.pitch");
      readAudioValue("time", STORAGE.audioTime, 0.1, 5, "audio.time");
      readAudioValue("offsetPercent", STORAGE.audioOffset, 0, 100, "audio.offsetPercent");
      readAudioValue("offset", STORAGE.audioOffset, 0, 100, "audio.offset");
      readAudioValue("limit", STORAGE.audioLimit, 0, 2.5, "audio.limit");
      readAudioValue("randomness", STORAGE.audioRandomness, 0, 1, "audio.randomness");
      if (has(audio, "settings") || Object.keys(audioValues).length > 0) {
        const settings = has(audio, "settings")
          ? normalizedAudioSettings(audio.settings)
          : readStoredObject(STORAGE.audioSoundSettings, {});
        const mergedSettings = isRecord(settings) ? settings : {};
        const currentSoundSettings = isRecord(mergedSettings[sound]) ? mergedSettings[sound] : {};
        mergedSettings[sound] = { ...currentSoundSettings, ...audioValues };
        putJson(STORAGE.audioSoundSettings, mergedSettings);
      }
      if (has(audio, "muted")) put(STORAGE.audioMuted, boolean(audio.muted, "audio.muted"));
    }

    if (has(source, "canvas")) {
      recognized = true;
      if (!isRecord(source.canvas)) throw new Error("canvas 必须是对象");
      if (has(source.canvas, "override")) put(STORAGE.renderScale, Math.round(number(source.canvas.override, 1, 3, "canvas.override")));
    }
    if (has(source, "audioMuted")) {
      recognized = true;
      put(STORAGE.audioMuted, boolean(source.audioMuted, "audioMuted"));
    }
    if (!recognized || writes.length === 0) throw new Error("没有找到可识别的动画参数");
    return { writes, summary };
  }

  function commit(writes) {
    const previous = new Map();
    try {
      writes.forEach(([key, value]) => {
        if (!previous.has(key)) previous.set(key, localStorage.getItem(key));
        localStorage.setItem(key, value);
      });
    } catch (error) {
      previous.forEach((value, key) => {
        try {
          if (value === null) localStorage.removeItem(key);
          else localStorage.setItem(key, value);
        } catch {
          // Best-effort rollback when storage is unavailable.
        }
      });
      throw new Error("浏览器无法保存参数");
    }
  }

  function captureLottieStorage() {
    return [STORAGE.lottieActive, STORAGE.lottieData, STORAGE.lottieName]
      .reduce((snapshot, key) => ({ ...snapshot, [key]: localStorage.getItem(key) }), {});
  }

  function restoreLottieStorage(snapshot) {
    Object.entries(snapshot).forEach(([key, value]) => {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    });
  }

  function readFile(file) {
    if (!file) return Promise.reject(new Error("请选择 JSON 文件"));
    if (file.size > MAX_FILE_SIZE) return Promise.reject(new Error("文件不能超过 4 MB"));
    if (typeof file.text === "function") return file.text();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsText(file);
    });
  }

  function downloadSample() {
    const url = new URL("./动画参数示例.json", scriptUrl).href;
    const link = document.createElement("a");
    link.href = url;
    link.download = "动画参数示例.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function sectionForAnimation() {
    return Array.from(document.querySelectorAll('[data-dot-section-toggle="Animation"]'))
      .map(button => button.closest(".carousel-controls__section"))
      .find(Boolean);
  }

  function install(section) {
    if (!section || document.getElementById("glow-dots-import")) return Boolean(document.getElementById("glow-dots-import"));
    const body = section.querySelector(".carousel-controls__section-label + .carousel-controls__body") || section.querySelector(".carousel-controls__body");
    if (!body) return false;

    const wrapper = document.createElement("div");
    wrapper.id = "glow-dots-import";
    wrapper.className = "glow-dots-import";
    wrapper.innerHTML = `
      <div class="glow-dots-import__row setting-row">
        <span class="setting-label">动画文件</span>
        <span class="glow-dots-import__format">JSON / Lottie</span>
      </div>
      <div class="glow-dots-import__dropzone" role="button" tabindex="0" aria-label="上传 Glow Dots 参数或 Lottie JSON 文件">
        <span>拖入参数或 Lottie JSON</span>
        <input class="glow-dots-import__input" type="file" accept=".json,application/json" tabindex="-1" aria-hidden="true">
      </div>
      <div class="glow-dots-import__actions">
        <button class="carousel-controls__tab glow-dots-import__button" type="button">选择文件</button>
        <button class="carousel-controls__tab glow-dots-import__button" type="button">下载示例</button>
        <button class="carousel-controls__tab glow-dots-import__button glow-dots-import__button--clear" type="button" hidden>清除 Lottie</button>
      </div>
      <div class="glow-dots-import__status" role="status" aria-live="polite"></div>
    `;
    body.appendChild(wrapper);

    const input = wrapper.querySelector(".glow-dots-import__input");
    const dropzone = wrapper.querySelector(".glow-dots-import__dropzone");
    const buttons = wrapper.querySelectorAll(".glow-dots-import__button");
    const clearButton = wrapper.querySelector(".glow-dots-import__button--clear");
    const status = wrapper.querySelector(".glow-dots-import__status");
    let busy = false;

    const setStatus = (message, state = "") => {
      status.textContent = message;
      if (state) wrapper.dataset.state = state;
      else delete wrapper.dataset.state;
    };
    const setBusy = value => {
      busy = value;
      wrapper.dataset.busy = value ? "true" : "false";
      buttons.forEach(button => { button.disabled = value; });
      dropzone.setAttribute("aria-disabled", String(value));
    };
    const choose = () => { if (!busy) input.click(); };

    const updateLottieState = (message = "") => {
      const active = localStorage.getItem(STORAGE.lottieActive) === "true";
      clearButton.hidden = !active;
      buttons[1].textContent = active ? '导出波点 JSON' : '下载参数示例';
      buttons[1].title = active ? '导出可在 LottieFiles 预览的波点动画' : '仅供本网页导入的参数示例，不能在 LottieFiles 预览';
      if (message) {
        setStatus(message, "success");
      } else if (active) {
        setStatus(`已启用 Lottie：${localStorage.getItem(STORAGE.lottieName) || "Lottie JSON"}`, "success");
      }
    };

    async function applyFile(file) {
      if (busy) return;
      setBusy(true);
      setStatus("正在读取参数…");
      try {
        const text = await readFile(file);
        let raw;
        try {
          raw = JSON.parse(text);
        } catch {
          throw new Error("文件不是有效的 JSON");
        }
        const runtime = await ensureLottieRuntime();
        if (runtime.looksLikeLottie(raw)) {
          const metadata = runtime.validate(raw);
          const serialized = JSON.stringify(raw);
          const previousLottie = captureLottieStorage();
          commit([
            [STORAGE.lottieData, serialized],
            [STORAGE.lottieName, file.name || "Lottie JSON"],
            [STORAGE.lottieActive, "true"]
          ]);
          try {
            await runtime.activate(raw, { name: file.name || "Lottie JSON" });
          } catch (error) {
            runtime.clear({ removeStored: false });
            restoreLottieStorage(previousLottie);
            if (previousLottie[STORAGE.lottieActive] === "true" && previousLottie[STORAGE.lottieData]) {
              runtime.restore().catch(() => {});
            }
            throw error;
          }
          window.GlowDotsLottieSettings.reset(metadata);
          setBusy(false);
          input.value = "";
          updateLottieState(`Lottie 已加载：${metadata.layers} 个图层 · ${metadata.frameRate} FPS`);
          return;
        }
        const preset = normalizePreset(raw);
        commit([...preset.writes, [STORAGE.lottieActive, "false"]]);
        runtime.clear({ removeStored: false });
        setStatus("参数已导入，正在刷新画布…", "success");
        window.setTimeout(() => window.location.reload(), 550);
      } catch (error) {
        setBusy(false);
        input.value = "";
        setStatus(error instanceof Error ? `导入失败：${error.message}` : "导入失败：参数格式不正确", "error");
      }
    }

    buttons[0].addEventListener("click", choose);
    buttons[1].addEventListener("click", async () => {
      if (busy) return;
      if (localStorage.getItem(STORAGE.lottieActive) !== 'true') return downloadSample();
      setBusy(true);
      buttons[1].textContent = '正在导出…';
      try {
        const runtime = await ensureLottieRuntime();
        if (typeof runtime.exportLottie !== 'function') throw new Error('动画引擎版本过旧，请刷新页面后重试');
        const data = await runtime.exportLottie();
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        if (blob.size > 19 * 1024 * 1024) throw new Error('波点过于密集，请调大波点间距后重新导出');
        const url = URL.createObjectURL(blob);
        const originalName = localStorage.getItem(STORAGE.lottieName) || '动画.json';
        const link = document.createElement('a');
        link.href = url;
        link.download = originalName.replace(/\.(json|lottie)$/i, '') + '-波点.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        setStatus(`已导出：${link.download}（${(blob.size / 1024 / 1024).toFixed(2)} MB，单周期）`, 'success');
      }
      catch (error) { setStatus(`导出失败：${error.message}`, 'error'); }
      finally { setBusy(false); buttons[1].textContent = '导出波点 JSON'; }
    });
    clearButton.addEventListener("click", async () => {
      if (busy) return;
      const runtime = await ensureLottieRuntime();
      runtime.clear();
      input.value = "";
      updateLottieState("已恢复内置动画");
    });
    input.addEventListener("change", () => applyFile(input.files?.[0]));
    dropzone.addEventListener("click", event => {
      if (event.target !== input) choose();
    });
    dropzone.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose();
      }
    });
    dropzone.addEventListener("dragover", event => {
      event.preventDefault();
      if (busy) return;
      dropzone.dataset.dragover = "true";
    });
    ["dragleave", "dragend"].forEach(type => dropzone.addEventListener(type, () => { delete dropzone.dataset.dragover; }));
    dropzone.addEventListener("drop", event => {
      event.preventDefault();
      if (busy) return;
      delete dropzone.dataset.dragover;
      applyFile(event.dataTransfer?.files?.[0]);
    });
    window.addEventListener("glow-dots:lottie-clear", () => {
      clearButton.hidden = true;
      updateLottieState();
      if (wrapper.dataset.state !== "error") setStatus("已恢复内置动画", "success");
    });
    window.addEventListener("glow-dots:lottie-error", event => {
      setBusy(false);
      clearButton.hidden = true;
      setStatus(`Lottie 加载失败：${event.detail?.message || "文件格式不受支持"}`, "error");
    });
    updateLottieState();
    return true;
  }

  function addStyles() {
    if (document.getElementById("glow-dots-import-styles")) return;
    const style = document.createElement("style");
    style.id = "glow-dots-import-styles";
    style.textContent = `
      .glow-dots-import { margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--panel-border); }
      .glow-dots-import__row { min-height: 22px; align-items: center; }
      #glow-dots-import .glow-dots-import__format { margin-left: auto; color: var(--settings-text-strong); opacity: .6; font: 400 12px/15.6px "Geist", "Manrope", system-ui, sans-serif; letter-spacing: 0; text-transform: uppercase; }
      #glow-dots-import .glow-dots-import__dropzone { display: flex; align-items: center; justify-content: center; min-height: 42px; margin-top: 8px; padding: 8px 10px; border: 1px dashed var(--panel-border-strong); border-radius: 12px; background: var(--control-bg); color: var(--settings-text-strong); font: 400 13px/15.6px "Geist", "Manrope", system-ui, sans-serif; text-align: center; cursor: pointer; transition: border-color 180ms ease, color 180ms ease, background 180ms ease; }
      #glow-dots-import .glow-dots-import__dropzone > span { color: var(--settings-text-strong); opacity: .6; font: inherit; }
      .glow-dots-import__dropzone:hover, .glow-dots-import__dropzone[data-dragover="true"] { border-color: var(--slider-thumb-hover); background: var(--tab-active-bg); }
      .glow-dots-import__dropzone:hover > span, .glow-dots-import__dropzone[data-dragover="true"] > span { opacity: .9; }
      .glow-dots-import__dropzone[aria-disabled="true"] { cursor: wait; opacity: .55; }
      .glow-dots-import__input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
      .glow-dots-import__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
      #glow-dots-import .glow-dots-import__button { width: 100%; min-width: 0; height: 28px; min-height: 28px; box-sizing: border-box; padding: 0 8px; border-radius: 6px; background: var(--control-bg); color: var(--settings-text-main); font: 500 11px/normal sans-serif; white-space: nowrap; }
      #glow-dots-import .glow-dots-import__button--clear { grid-column: 1 / -1; color: var(--settings-text-strong); }
      #glow-dots-import .glow-dots-import__button[hidden] { display: none !important; }
      .glow-dots-import__button:disabled { cursor: wait; opacity: .45; }
      .glow-dots-import__status { min-height: 15px; margin-top: 7px; color: var(--text-dim); font: 500 10px/1.4 "Manrope", system-ui, sans-serif; }
      .glow-dots-import[data-state="success"] .glow-dots-import__status { color: #8ff0c1; }
      .glow-dots-import[data-state="error"] .glow-dots-import__status { color: #ff9b9b; }
      @media (max-width: 700px) { .glow-dots-import__dropzone { min-height: 38px; } }
    `;
    document.head.appendChild(style);
  }

  function start() {
    addStyles();
    ensureLottieRuntime().catch(error => console.error(error));
    const deadline = Date.now() + 15000;
    const attempt = () => {
      const shell = document.querySelector(".glow-dots-shell");
      const visible = shell && getComputedStyle(shell).visibility !== "hidden" && getComputedStyle(shell).opacity !== "0";
      const section = sectionForAnimation();
      if (visible && install(section)) return;
      if (Date.now() < deadline) window.setTimeout(attempt, 120);
    };
    // React hydrates the server-rendered panel after this script tag runs.
    // Wait until its shell is visible so hydration cannot replace the row.
    window.setTimeout(attempt, 120);
  }


  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
