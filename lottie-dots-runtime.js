(() => {
  "use strict";

  const STORAGE = Object.freeze({
    active: "glow-dots:lottie-active",
    data: "glow-dots:lottie-data",
    name: "glow-dots:lottie-name",
    gap: "glow-dots:gap",
    size: "glow-dots:size",
    roundness: "glow-dots:roundness",
    shape: "glow-dots:shape",
    shapeControls: "glow-dots:shape-controls",
    fadeDuration: "glow-dots:fade-duration",
    theme: "glow-dots:theme",
    visualConfig: "glow-dots:visual-config"
  });
  const DEFAULT_VISUAL = Object.freeze({
    fillColor: "#FFBB00",
    glowColor: "#FF5500",
    glowStrength: 25,
    glowBlur: 46.1,
    glowSpread: 20
  });
  const scriptUrl = document.currentScript?.src || location.href;
  const state = {
    animation: null,
    baseCanvas: null,
    baseOpacity: "",
    host: null,
    overlay: null,
    overlayContext: null,
    shell: null,
    sourceCanvas: null,
    sampleCanvas: document.createElement("canvas"),
    sampleContext: null,
    resizeObserver: null,
    mutationObserver: null,
    raf: 0,
    width: 0,
    height: 0,
    scale: 1,
    columns: 0,
    rows: 0,
    targets: new Float32Array(0),
    levels: new Float32Array(0),
    startedAt: 0,
    playbackPhase: 0,
    hovering: false,
    clickPlaying: false,
    lastPaintAt: 0,
    lastConfigAt: 0,
    config: null,
    data: null
  };
  let libraryPromise = null;
  let activationToken = 0;

  const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const finite = value => Number.isFinite(Number(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function looksLikeLottie(value) {
    return isRecord(value) && (
      Array.isArray(value.layers) ||
      (typeof value.v === "string" && ["w", "h", "fr", "ip", "op"].some(key => key in value))
    );
  }

  function validate(value) {
    if (!isRecord(value)) throw new Error("Lottie JSON 根节点必须是对象");
    if (!Array.isArray(value.layers)) throw new Error("缺少 Lottie 图层 layers");
    ["w", "h", "fr", "ip", "op"].forEach(key => {
      if (!finite(value[key])) throw new Error(`Lottie 字段 ${key} 必须是数字`);
    });
    const width = Number(value.w);
    const height = Number(value.h);
    const frameRate = Number(value.fr);
    const firstFrame = Number(value.ip);
    const lastFrame = Number(value.op);
    if (width < 1 || height < 1 || width > 8192 || height > 8192) throw new Error("Lottie 画布尺寸必须在 1 到 8192 之间");
    if (frameRate <= 0 || frameRate > 240) throw new Error("Lottie 帧率必须大于 0 且不超过 240");
    if (lastFrame <= firstFrame) throw new Error("Lottie 结束帧 op 必须大于起始帧 ip");
    if (lastFrame - firstFrame > frameRate * 600) throw new Error("Lottie 动画时长不能超过 10 分钟");

    const externalAssets = Array.isArray(value.assets)
      ? value.assets.filter(asset => isRecord(asset) && typeof asset.p === "string" && asset.p && asset.e !== 1 && !/^data:/i.test(asset.p))
      : [];
    if (externalAssets.length > 0) {
      throw new Error("暂不支持引用外部图片或音频的 Lottie，请先在导出时嵌入资源");
    }
    const externalFonts = Array.isArray(value.fonts?.list)
      ? value.fonts.list.filter(font => isRecord(font) && typeof font.fPath === "string" && font.fPath && !/^data:/i.test(font.fPath))
      : [];
    if (externalFonts.length > 0) {
      throw new Error("暂不支持引用外部字体的 Lottie，请将文字转为形状后再导出");
    }
    return {
      width,
      height,
      frameRate,
      firstFrame,
      lastFrame,
      frames: lastFrame - firstFrame,
      duration: (lastFrame - firstFrame) / frameRate,
      layers: value.layers.length
    };
  }

  function ensureLibrary() {
    if (window.lottie?.loadAnimation) return Promise.resolve(window.lottie);
    if (libraryPromise) return libraryPromise;
    libraryPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-glow-dots-lottie-library]");
      const script = existing || document.createElement("script");
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (window.lottie?.loadAnimation) resolve(window.lottie);
        else reject(new Error("Lottie 运行库加载失败"));
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        libraryPromise = null;
        reject(new Error("Lottie 运行库加载失败"));
      };
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", fail, { once: true });
      if (!existing) {
        script.src = new URL("./vendor/lottie.min.js", scriptUrl).href;
        script.dataset.glowDotsLottieLibrary = "true";
        document.head.appendChild(script);
      } else if (window.lottie?.loadAnimation) {
        finish();
      }
    });
    return libraryPromise;
  }

  function waitForStage(timeout = 15000) {
    return new Promise((resolve, reject) => {
      const deadline = performance.now() + timeout;
      const check = () => {
        const baseCanvas = document.querySelector(".hero [data-dot-canvas]");
        const shell = baseCanvas?.closest(".hero__grid-shell");
        const controlsReady = document.getElementById("glow-dots-import");
        if (controlsReady && baseCanvas instanceof HTMLCanvasElement && shell instanceof HTMLElement && shell.clientWidth > 0 && shell.clientHeight > 0) {
          resolve({ baseCanvas, shell });
          return;
        }
        if (performance.now() >= deadline) {
          reject(new Error("未找到波点动画画布"));
          return;
        }
        window.setTimeout(check, 100);
      };
      check();
    });
  }

  function waitForSourceCanvas(host, timeout = 6000) {
    return new Promise((resolve, reject) => {
      const deadline = performance.now() + timeout;
      const check = () => {
        const canvas = host.querySelector("canvas");
        if (canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0) {
          resolve(canvas);
          return;
        }
        if (performance.now() >= deadline) {
          reject(new Error("Lottie 画布初始化超时"));
          return;
        }
        window.setTimeout(check, 40);
      };
      check();
    });
  }

  function numericStorage(key, fallback, min, max) {
    const stored = localStorage.getItem(key);
    if (stored === null || stored === "") return fallback;
    const value = Number(stored);
    return Number.isFinite(value) ? clamp(value, min, max) : fallback;
  }

  function storedObject(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return isRecord(value) ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function readConfig() {
    const visual = { ...DEFAULT_VISUAL, ...storedObject(STORAGE.visualConfig, DEFAULT_VISUAL) };
    const uploaded = window.GlowDotsLottieSettings.read(state.data?.metadata);
    return {
      projectionSize: uploaded.projectionSize,
      durationSeconds: uploaded.durationSeconds,
      trigger: uploaded.trigger,
      scatter: uploaded.scatter,
      gap: uploaded.gap,
      size: uploaded.size,
      roundness: uploaded.roundness,
      shape: uploaded.shape,
      theme: localStorage.getItem(STORAGE.theme) === "light" ? "light" : "dark",
      fillColor: typeof visual.fillColor === "string" ? visual.fillColor : DEFAULT_VISUAL.fillColor,
      glowColor: typeof visual.glowColor === "string" ? visual.glowColor : DEFAULT_VISUAL.glowColor,
      glowStrength: clamp(finite(visual.glowStrength) ? Number(visual.glowStrength) : DEFAULT_VISUAL.glowStrength, 0, 100),
      glowBlur: clamp(finite(visual.glowBlur) ? Number(visual.glowBlur) : DEFAULT_VISUAL.glowBlur, 8, 120),
      glowSpread: clamp(finite(visual.glowSpread) ? Number(visual.glowSpread) : DEFAULT_VISUAL.glowSpread, 0, 100)
    };
  }

  function gridFor(width, height, gap) {
    const mix = Math.pow(clamp(gap / 100, 0, 1), 0.82);
    const nominalColumns = Math.round(58 - 40 * mix);
    const nominalRows = Math.max(6, Math.round(nominalColumns / (800 / 600)));
    const slot = Math.min(800 / nominalColumns, 600 / nominalRows);
    return {
      // Derive both dimensions from the same pitch. Do not cap rows at 58:
      // on a tall, wide monitor that cap creates a different vertical pitch.
      columns: clamp(Math.round(width / slot), 8, 160),
      rows: clamp(Math.max(6, Math.round(height / slot)), 6, 160)
    };
  }

  function rebuildGrid() {
    if (!state.config || !state.width || !state.height) return;
    const grid = gridFor(state.width, state.height, state.config.gap);
    if (grid.columns === state.columns && grid.rows === state.rows) return;
    state.columns = grid.columns;
    state.rows = grid.rows;
    state.targets = new Float32Array(grid.columns * grid.rows);
    state.levels = new Float32Array(grid.columns * grid.rows);
    const sampling = 4;
    state.sampleCanvas.width = grid.columns * sampling;
    state.sampleCanvas.height = grid.rows * sampling;
    state.sampleContext = state.sampleCanvas.getContext("2d", { willReadFrequently: true });
  }

  function syncSize() {
    if (!state.shell || !state.overlay || !state.baseCanvas) return;
    const rect = state.shell.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const measuredScale = state.baseCanvas.clientWidth > 0 ? state.baseCanvas.width / state.baseCanvas.clientWidth : 0;
    const scale = measuredScale >= 1 && measuredScale <= 3.2 ? measuredScale : clamp(window.devicePixelRatio || 1, 1, 3);
    if (width === state.width && height === state.height && Math.abs(scale - state.scale) < 0.01) return;
    state.width = width;
    state.height = height;
    state.scale = scale;
    state.overlay.width = Math.round(width * scale);
    state.overlay.height = Math.round(height * scale);
    state.overlay.style.width = `${width}px`;
    state.overlay.style.height = `${height}px`;
    state.overlayContext = state.overlay.getContext("2d");
    rebuildGrid();
  }

  function addDotPath(context, x, y, size, shape, roundness) {
    const half = size / 2;
    if (shape === "star") {
      const outer = half;
      const inner = half * 0.43;
      for (let point = 0; point < 8; point += 1) {
        const radius = point % 2 === 0 ? outer : inner;
        const angle = -Math.PI / 2 + point * Math.PI / 4;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (point === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      return;
    }
    if (shape === "honeycomb") {
      for (let point = 0; point < 6; point += 1) {
        const angle = Math.PI / 6 + point * Math.PI / 3;
        const px = x + Math.cos(angle) * half;
        const py = y + Math.sin(angle) * half;
        if (point === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      return;
    }
    const radius = clamp((roundness / 50) * half, 0, half);
    if (typeof context.roundRect === "function") {
      context.roundRect(x - half, y - half, size, size, radius);
      return;
    }
    context.rect(x - half, y - half, size, size);
  }

  function sampleFrame() {
    const context = state.sampleContext;
    const source = state.sourceCanvas;
    if (!context || !source || !state.columns || !state.rows) return;
    const sampleWidth = state.sampleCanvas.width;
    const sampleHeight = state.sampleCanvas.height;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, sampleWidth, sampleHeight);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const sourceAspect = source.width / source.height;
    const targetAspect = sampleWidth / sampleHeight;
    let drawWidth = sampleWidth;
    let drawHeight = sampleHeight;
    if (sourceAspect > targetAspect) drawHeight = sampleWidth / sourceAspect;
    else drawWidth = sampleHeight * sourceAspect;
    drawWidth *= state.config.projectionSize / 100;
    drawHeight *= state.config.projectionSize / 100;
    const drawX = (sampleWidth - drawWidth) / 2;
    const drawY = (sampleHeight - drawHeight) / 2;
    context.drawImage(source, drawX, drawY, drawWidth, drawHeight);
    const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
    const sampling = 4;
    for (let row = 0; row < state.rows; row += 1) {
      for (let column = 0; column < state.columns; column += 1) {
        let alpha = 0;
        for (let sy = 0; sy < sampling; sy += 1) {
          const pixelRow = row * sampling + sy;
          for (let sx = 0; sx < sampling; sx += 1) {
            const pixelColumn = column * sampling + sx;
            alpha = Math.max(alpha, pixels[(pixelRow * sampleWidth + pixelColumn) * 4 + 3]);
          }
        }
        state.targets[row * state.columns + column] = clamp(alpha / 170, 0, 1);
      }
    }
  }

  function spreadTargets() {
    const amount = state.config.scatter / 40;
    if (amount <= 0) return;
    const original = state.targets.slice();
    const radius = Math.ceil(amount * 4);
    const sigma = 0.35 + amount * 1.65;
    for (let row = 0; row < state.rows; row++) {
      for (let column = 0; column < state.columns; column++) {
        const index = row * state.columns + column;
        let level = original[index];
        for (let dy = -radius; dy <= radius; dy++) {
          if (row + dy < 0 || row + dy >= state.rows) continue;
          for (let dx = -radius; dx <= radius; dx++) {
            if (column + dx < 0 || column + dx >= state.columns) continue;
            const weight = amount * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
            level = Math.max(level, original[(row + dy) * state.columns + column + dx] * weight);
          }
        }
        state.targets[index] = level;
      }
    }
  }

  function drawDots(deltaMs) {
    const context = state.overlayContext;
    if (!context || !state.config) return;
    const width = state.width;
    const height = state.height;
    context.setTransform(state.scale, 0, 0, state.scale, 0, 0);
    context.clearRect(0, 0, width, height);
    // Use one square cell size for both axes. This keeps the visible dot spacing
    // identical horizontally and vertically on wide displays.
    const slot = Math.min(width / state.columns, height / state.rows);
    const gridWidth = slot * state.columns;
    const gridHeight = slot * state.rows;
    const offsetX = (width - gridWidth) / 2;
    const offsetY = (height - gridHeight) / 2;
    const baseSize = slot * clamp(state.config.size / 100 * 0.6, 0.22, 0.72);
    const shapeScale = state.config.shape === "rectangle" ? 1 : state.config.shape === "star" ? 1.18 : 0.95;
    const dotSize = baseSize * shapeScale;
    const decayMs = 100; // Playback duration never changes the afterglow.
    const decay = Math.exp(-Math.max(1, deltaMs) / decayMs);
    const rise = clamp(deltaMs / 38, 0.25, 0.82);
    for (let index = 0; index < state.levels.length; index += 1) {
      const target = state.targets[index];
      const previous = state.levels[index];
      state.levels[index] = target >= previous
        ? previous + (target - previous) * rise
        : Math.max(target, previous * decay);
    }

    context.shadowBlur = 0;
    context.globalAlpha = 1;
    context.fillStyle = state.config.theme === "light" ? "rgba(20, 22, 24, .15)" : "rgba(255, 255, 255, .105)";
    context.beginPath();
    for (let row = 0; row < state.rows; row += 1) {
      for (let column = 0; column < state.columns; column += 1) {
        addDotPath(
          context,
          offsetX + (column + 0.5) * slot,
          offsetY + (row + 0.5) * slot,
          dotSize,
          state.config.shape,
          state.config.roundness
        );
      }
    }
    context.fill();

    const buckets = 8;
    context.fillStyle = state.config.fillColor;
    context.shadowColor = state.config.glowColor;
    context.shadowBlur = (3 + state.config.glowBlur * 0.25) * (0.45 + state.config.glowStrength / 100);
    for (let bucket = 1; bucket <= buckets; bucket += 1) {
      context.beginPath();
      let hasDots = false;
      for (let row = 0; row < state.rows; row += 1) {
        for (let column = 0; column < state.columns; column += 1) {
          const level = state.levels[row * state.columns + column];
          if (level < 0.035 || Math.ceil(level * buckets) !== bucket) continue;
          hasDots = true;
          addDotPath(
            context,
            offsetX + (column + 0.5) * slot,
            offsetY + (row + 0.5) * slot,
            dotSize * (1 + level * 0.08),
            state.config.shape,
            state.config.roundness
          );
        }
      }
      if (hasDots) {
        context.globalAlpha = clamp(bucket / buckets * 1.15, 0, 1);
        context.fill();
      }
    }
    context.globalAlpha = 1;
    context.shadowBlur = 0;
  }

  function paint(now) {
    if (!state.animation || !state.data || !state.overlay?.isConnected) return;
    syncSize();
    if (now - state.lastConfigAt > 220) {
      state.config = readConfig();
      state.lastConfigAt = now;
      rebuildGrid();
    }
    const metadata = state.data.metadata;
    const deltaSeconds = state.lastPaintAt ? Math.max(0, now - state.lastPaintAt) / 1000 : 0;
    const playing = state.config.trigger === 'always' || (state.config.trigger === 'hover' && state.hovering) || (state.config.trigger === 'click' && state.clickPlaying);
    if (playing) {
      const phase = state.playbackPhase + deltaSeconds / state.config.durationSeconds;
      if (state.config.trigger === 'click' && phase >= 1) {
        state.playbackPhase = 0;
        state.clickPlaying = false;
      } else state.playbackPhase = phase % 1;
    }
    // lottie-web goToAndStop uses frames relative to the animation's in point.
    const frame = state.playbackPhase * metadata.frames;
    state.animation.goToAndStop(frame, true);
    try {
      sampleFrame();
    } catch (error) {
      console.error("Glow Dots Lottie sampling failed", error);
      clear({ removeStored: false });
      window.dispatchEvent(new CustomEvent("glow-dots:lottie-error", { detail: { message: "Lottie 像素读取失败，请检查是否包含外部资源" } }));
      return;
    }
    spreadTargets();
    drawDots(state.lastPaintAt ? now - state.lastPaintAt : 16.7);
    state.lastPaintAt = now;
    state.raf = requestAnimationFrame(paint);
  }

  function onSettingsChange() {
    if (!state.animation || !state.data) return;
    const previousTrigger = state.config?.trigger;
    state.config = readConfig();
    if (previousTrigger !== state.config.trigger) {
      state.playbackPhase = 0;
      state.clickPlaying = false;
    }
    state.lastConfigAt = performance.now();
    rebuildGrid();
  }

  function destroyVisual() {
    activationToken += 1;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.resizeObserver?.disconnect();
    state.mutationObserver?.disconnect();
    state.resizeObserver = null;
    state.mutationObserver = null;
    try { state.animation?.destroy(); } catch {}
    state.animation = null;
    state.host?.remove();
    state.overlay?.remove();
    if (state.baseCanvas?.isConnected) state.baseCanvas.style.opacity = state.baseOpacity;
    state.baseCanvas = null;
    state.host = null;
    state.overlay = null;
    state.overlayContext = null;
    state.shell = null;
    state.sourceCanvas = null;
    state.data = null;
    state.hovering = false;
    state.clickPlaying = false;
    state.width = 0;
    state.height = 0;
    state.columns = 0;
    state.rows = 0;
    state.targets = new Float32Array(0);
    state.levels = new Float32Array(0);
  }

  async function activate(animationData, options = {}) {
    const metadata = validate(animationData);
    const token = activationToken + 1;
    destroyVisual();
    activationToken = token;
    const [{ baseCanvas, shell }, lottie] = await Promise.all([waitForStage(), ensureLibrary()]);
    if (token !== activationToken) throw new Error("Lottie 加载已取消");

    const overlay = document.createElement("canvas");
    overlay.className = "hero__canvas glow-dots-lottie-canvas";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.zIndex = "2";
    overlay.style.pointerEvents = "none";
    shell.appendChild(overlay);

    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = `position:fixed;left:-10000px;top:-10000px;width:${metadata.width}px;height:${metadata.height}px;opacity:0;pointer-events:none;overflow:hidden;`;
    document.body.appendChild(host);

    state.baseCanvas = baseCanvas;
    state.baseOpacity = baseCanvas.style.opacity;
    state.shell = shell;
    state.overlay = overlay;
    state.host = host;
    state.data = { animationData, metadata, name: options.name || "" };
    state.config = readConfig();
    syncSize();

    try {
      state.animation = lottie.loadAnimation({
        container: host,
        renderer: "canvas",
        loop: false,
        autoplay: false,
        animationData,
        rendererSettings: {
          clearCanvas: true,
          dpr: 1,
          preserveAspectRatio: "xMidYMid meet"
        }
      });
      state.sourceCanvas = await waitForSourceCanvas(host);
      if (token !== activationToken) throw new Error("Lottie 加载已取消");
      state.animation.goToAndStop(0, true);
      baseCanvas.style.opacity = "0";
      state.resizeObserver = new ResizeObserver(syncSize);
      state.resizeObserver.observe(shell);
      state.mutationObserver = new MutationObserver(syncSize);
      state.mutationObserver.observe(baseCanvas, { attributes: true, attributeFilter: ["width", "height"] });
      state.startedAt = performance.now();
      state.playbackPhase = 0;
      state.lastPaintAt = 0;
      state.lastConfigAt = 0;
      state.raf = requestAnimationFrame(paint);
      window.dispatchEvent(new CustomEvent("glow-dots:lottie-ready", { detail: { metadata, name: options.name || "" } }));
      return metadata;
    } catch (error) {
      if (activationToken !== token) throw new Error("Lottie 加载已取消");
      destroyVisual();
      throw error;
    }
  }

  function clear(options = {}) {
    destroyVisual();
    if (options.removeStored !== false) {
      localStorage.removeItem(STORAGE.active);
      localStorage.removeItem(STORAGE.data);
      localStorage.removeItem(STORAGE.name);
    }
    window.dispatchEvent(new CustomEvent("glow-dots:lottie-clear"));
  }

  async function restore() {
    if (localStorage.getItem(STORAGE.active) !== "true") return null;
    const serialized = localStorage.getItem(STORAGE.data);
    if (!serialized) {
      localStorage.removeItem(STORAGE.active);
      return null;
    }
    try {
      const animationData = JSON.parse(serialized);
      return await activate(animationData, { name: localStorage.getItem(STORAGE.name) || "Lottie JSON" });
    } catch (error) {
      if (error instanceof Error && error.message === "Lottie 加载已取消") return null;
      console.error("Glow Dots Lottie restore failed", error);
      clear();
      window.dispatchEvent(new CustomEvent("glow-dots:lottie-error", {
        detail: { message: error instanceof Error ? error.message : "Lottie 恢复失败" }
      }));
      return null;
    }
  }

  function onResetClick(event) {
    if (!(event.target instanceof Element) || !event.target.closest("[data-dot-reset-controls]")) return;
    clear();
  }

  async function exportLottie() {
    if (!state.animation || !state.data) throw new Error('请先上传 Lottie JSON 动画');
    const savedPhase = state.playbackPhase;
    cancelAnimationFrame(state.raf);
    state.config = readConfig();
    const duration = state.config.durationSeconds;
    const width = Math.min(640, state.width);
    const height = Math.round(width * state.height / state.width);
    rebuildGrid();
    // Dense grids get fewer temporal samples so opacity keys stay compact.
    const frames = Math.max(8, Math.min(240, Math.max(24, Math.ceil(state.data.metadata.duration * 24)), Math.floor(160000 / state.targets.length)));
    const samples = [];
    const layers = [];
    try {
      for (let i = 0; i < frames; i++) {
        state.animation.goToAndStop(i / frames * state.data.metadata.frames, true);
        sampleFrame(); spreadTargets();
        samples.push(Uint8Array.from(state.targets, value => Math.round(clamp(value * 1.15, 0, 1) * 20) * 5));
        if (i % 8 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      }
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = colorCanvas.height = 1;
      const colorContext = colorCanvas.getContext('2d');
      colorContext.fillStyle = state.config.fillColor;
      colorContext.fillRect(0, 0, 1, 1);
      const rgba = colorContext.getImageData(0, 0, 1, 1).data;
      const color = Array.from(rgba.slice(0, 3), value => Math.round(value / 255 * 1000) / 1000);
      const scale = width / state.width;
      const slot = Math.min(state.width / state.columns, state.height / state.rows) * scale;
      const size = slot * clamp(state.config.size / 100 * 0.6, 0.22, 0.72);
      const shapes = [];
      for (let cell = 0; cell < state.targets.length; cell++) {
        if (!samples.some(sample => sample[cell] > 0)) continue;
        const keys = [];
        for (let i = 0; i < frames; i++) {
          if (i === 0 || samples[i][cell] !== samples[i - 1][cell]) keys.push({t:i,s:[samples[i][cell]],h:1});
        }
        const x = (width - slot * state.columns) / 2 + (cell % state.columns + 0.5) * slot;
        const y = (height - slot * state.rows) / 2 + (Math.floor(cell / state.columns) + 0.5) * slot;
        let geometry = {ty:'rc',d:1,s:{a:0,k:[size,size]},p:{a:0,k:[0,0]},r:{a:0,k:size * state.config.roundness / 100}};
        if (state.config.shape !== 'rectangle') {
          const count = state.config.shape === 'star' ? 8 : 6;
          const vertices = Array.from({length:count}, (_, i) => {
            const radius = size / 2 * (state.config.shape === 'star' && i % 2 ? 0.43 : 1);
            const angle = -Math.PI / 2 + i * Math.PI * 2 / count;
            return [Math.round(Math.cos(angle)*radius*100)/100,Math.round(Math.sin(angle)*radius*100)/100];
          });
          geometry = {ty:'sh',ks:{a:0,k:{c:true,v:vertices,i:vertices.map(()=>[0,0]),o:vertices.map(()=>[0,0])}}};
        }
        shapes.push({ty:'gr',it:[geometry,{ty:'fl',c:{a:0,k:color},o:{a:0,k:100},r:1},
          {ty:'tr',p:{a:0,k:[Math.round(x*100)/100,Math.round(y*100)/100]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:keys.length === 1 ? {a:0,k:keys[0].s[0]} : {a:1,k:keys},sk:{a:0,k:0},sa:{a:0,k:0}}]});
      }
      layers.push({ddd:0,ind:1,ty:4,nm:'动态彩色波点',sr:1,ks:{o:{a:0,k:100},r:{a:0,k:0},p:{a:0,k:[0,0,0]},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}},shapes,ip:0,op:frames,st:0,bm:0});
      return {v:'5.7.4', fr:frames / duration, ip:0, op:frames, w:width, h:height, nm:'波点单次循环', ddd:0, assets:[], layers, markers:[]};
    } finally {
      state.playbackPhase = savedPhase;
      state.lastPaintAt = performance.now();
      state.raf = requestAnimationFrame(paint);
    }
  }

  document.addEventListener("click", onResetClick, true);
  function isOverStage(event) {
    if (!state.baseCanvas || event.target?.closest?.('.carousel-controls, #glow-dots-import, .lottie-settings-panel')) return false;
    const rect = state.baseCanvas.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX < rect.right && event.clientY >= rect.top && event.clientY < rect.bottom;
  }
  document.addEventListener('pointermove', event => { state.hovering = isOverStage(event); });
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) state.hovering = false; });
  window.addEventListener('blur', () => { state.hovering = false; });
  document.addEventListener('click', event => {
    if (state.config?.trigger !== 'click' || !isOverStage(event)) return;
    state.playbackPhase = 0;
    state.lastPaintAt = performance.now();
    state.clickPlaying = true;
  });
  window.addEventListener("glow-dots:lottie-settings-change", onSettingsChange);
  window.GlowDotsLottie = Object.freeze({ activate, clear, looksLikeLottie, restore, validate, exportLottie });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", restore, { once: true });
  else restore();
})();
