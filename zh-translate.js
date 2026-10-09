(() => {
  const textMap = {
    Settings: "设置",
    "Render scale": "渲染倍率",
    "Animation on page load": "页面加载时播放动画",
    Grid: "网格",
    Shape: "形状",
    "Honeycomb size": "蜂巢大小",
    "Honeycomb roundness": "蜂巢圆润度",
    Rect: "矩形",
    Star: "星形",
    Comb: "蜂巢",
    Scale: "缩放",
    "Dot size": "点大小",
    Radius: "半径",
    Dots: "波点",
    Fill: "填充",
    Glow: "发光",
    Blur: "模糊",
    Spread: "扩散",
    "Hue Shift": "色相偏移",
    Animation: "动画",
    Trigger: "触发方式",
    Hover: "悬停",
    Click: "点击",
    Always: "始终",
    Ripple: "涟漪",
    Count: "计数",
    Matrix: "矩阵",
    Vortex: "漩涡",
    Comet: "彗星",
    Drift: "漂移",
    Bloom: "绽放",
    Prism: "棱镜",
    Boom: "爆发",
    Stars: "星尘",
    Aura: "光环",
    Size: "大小",
    Duration: "时长",
    Scatter: "散布",
    Core: "核心",
    Softness: "柔和度",
    Audio: "音频",
    Sound: "声音",
    Clicks: "点击音",
    Foam: "泡沫",
    Fire: "火焰",
    Volume: "音量",
    Width: "宽度",
    Pitch: "音高",
    Time: "时间",
    Offset: "偏移",
    Limit: "限制",
    Random: "随机性",
    "Auto-saved locally": "已自动保存到本地",
    "COPY JSON": "复制 JSON",
    COPIED: "已复制",
    By: "作者",
    "Drag across": "拖动",
    "the dots": "波点",
    "to animate": "以播放动画"
    ,"Glow Dots ⋮⋮ Interactive Dot Grid": "发光波点 ⋮⋮ 互动点阵"
    ,"Star size": "星形大小"
    ,"Star points": "星形点数"
    ,"Star depth": "星形深度"
    ,"Star rotation randomness": "星形旋转随机性"
    ,"Comb size": "蜂巢大小"
    ,"Honeycomb size": "蜂巢大小"
    ,"Honeycomb roundness": "蜂巢圆润度"
    ,Roundness: "圆润度"
    ,Points: "点数"
    ,Depth: "深度"
    ,Wave: "波动"
    ,Reflection: "反射"
    ,Spin: "旋转"
    ,Density: "密度"
    ,Trails: "尾迹"
    ,Flow: "流动"
    ,Shear: "剪切"
    ,Arms: "臂数"
    ,Twist: "扭曲"
    ,Facets: "面数"
    ,Split: "分裂"
    ,Pieces: "碎片"
    ,Force: "力度"
    ,Twinkle: "闪烁"
    ,Pull: "拉力"
  };
  const attrMap = {
    "Toggle sound": "切换声音",
    "Toggle dark/light mode": "切换深色/浅色模式",
    "Toggle settings": "切换设置面板",
    "Reset to default settings": "恢复默认设置",
    "Pick fill color": "选择填充颜色",
    "Show settings": "显示设置",
    "Scale": "缩放",
    "Dot size": "点大小",
    "Glow blur": "发光模糊",
    "Glow spread": "发光扩散",
    "Glow hue shift": "发光色相偏移",
    "Animation size": "动画大小",
    "Animation duration": "动画时长",
    "Animation scatter": "动画散布",
    "Hover spread": "悬停扩散",
    "Hover core": "悬停核心",
    "Hover softness": "悬停柔和度",
    "Audio volume": "音频音量",
    "Audio width": "音频宽度",
    "Audio pitch": "音频音高",
    "Audio time multiplier": "音频时间倍率",
    "Audio sample offset": "音频采样偏移",
    "Audio sample limit": "音频采样限制",
    "Audio randomness": "音频随机性",
    "Animation mode": "动画模式",
    "Trigger mode": "触发模式",
    "Render scale": "渲染倍率",
    Shape: "形状",
    "Honeycomb size": "蜂巢大小",
    "Honeycomb roundness": "蜂巢圆润度",
    Radius: "半径",
    Glow: "发光",
    Fill: "填充",
    Spread: "扩散",
    "Hue Shift": "色相偏移",
    Size: "大小",
    Duration: "时长",
    Scatter: "散布",
    Core: "核心",
    Softness: "柔和度",
    Sound: "声音",
    Volume: "音量",
    Width: "宽度",
    Pitch: "音高",
    Time: "时间",
    Offset: "偏移",
    Limit: "限制",
    Random: "随机性",
    Grid: "网格",
    Dots: "波点",
    Animation: "动画",
    Audio: "音频"
  };
  const translate = () => {
    document.title = "发光波点 ⋮⋮ 互动点阵";
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(textNode => {
      let value = textNode.nodeValue;
      const trimmed = value.trim();
      if (textMap[trimmed]) {
        textNode.nodeValue = value.replace(trimmed, textMap[trimmed]);
        return;
      }
      Object.entries(textMap).forEach(([from, to]) => {
        if (from.length > 2 && value.includes(from)) value = value.split(from).join(to);
      });
      textNode.nodeValue = value;
    });
    document.querySelectorAll("[aria-label], [title]").forEach(element => {
      ["aria-label", "title"].forEach(attribute => {
        const value = element.getAttribute(attribute);
        if (value && attrMap[value] && value !== attrMap[value]) element.setAttribute(attribute, attrMap[value]);
      });
    });
    const hint = document.querySelector("[data-dot-trigger-hint]");
    if (hint) hint.textContent = "v1.0";
    document.querySelectorAll("[data-copy-label]").forEach(element => {
      element.setAttribute("data-copy-label", "复制 JSON");
      element.setAttribute("data-copy-success-label", "已复制");
    });
  };
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      translate();
    });
  };
  const start = () => {
    translate();
    setTimeout(translate, 300);
    setTimeout(translate, 1200);
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label", "title"] });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
