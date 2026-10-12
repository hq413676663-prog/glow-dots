# 发光波点 1.0

可部署到 GitHub Pages 的静态网站，入口为 `index.html`，无需安装依赖或构建。

## GitHub Pages 部署

1. 将本文件夹内的全部文件和子目录上传到仓库根目录，保留文件名及目录结构。
2. 在仓库 Settings → Pages 中选择 Deploy from a branch。
3. 选择对应分支和 `/ (root)`，保存并等待部署。
4. 使用 GitHub 提供的网站地址访问。不要把 `index.html` 单独上传。

## 本地预览

Mac 用户双击 `启动本地网站.command`，即可自动启动本地服务并打开网页。启动后终端窗口可以关闭；修改页面文件后刷新浏览器即可，无需重新启动。重复双击会复用已有服务，电脑重启后再次双击即可。这两个本地启动文件无需上传 GitHub。

建议在本目录启动静态服务器，再访问网站；直接双击 HTML 可能受到浏览器对模块加载的限制。

```sh
python3 -m http.server 4175
```

访问 `http://localhost:4175/`。

## 文件说明

- `index.html`：唯一首页入口，含页面样式和布局。
- `.mjs` 文件：原页面的模块及运行依赖，保留原名称以避免导入路径失效。
- `import-animation.js`、`lottie-settings.js`、`lottie-dots-runtime.js`：动画上传、参数修改及波点导出。
- `integer-settings.css`、`integer-settings.mjs`、`zh-translate.js`：参数控件和中文界面支持。
- `assets/`：本地图标、图片、字体与视频。
- `vendor/`：本地动画库。
- `动画参数示例.json`、`下层动画效果.json`：参数及动画示例。
- `.nojekyll`：让 GitHub Pages 直接发布静态文件。

## JSON 导出

上传有效的 Lottie JSON 后，“导出波点 JSON”导出彩色波点的单周期动画，文件名为 `原名称-波点.json`。导出不包含灰色背景点、光晕或逐帧图片。密集点阵会降低时间采样精度来控制大小，超过 19 MB 时会提示调整波点间距。

未上传 Lottie 动画时，参数示例仅供本网站使用，不是标准 Lottie 动画。

## 网络与数据

已有图标、图片、字体和主要动画库随网站一起提供。原页面的 Coloris 颜色控件、部分音效与 Subway 字体仍引用 `glow-dots.vercel.app`，这些功能需要该服务可访问。原页面也保留 Framer 的运行代码及外部链接。

设置和已导入动画保存在当前浏览器中，不会随仓库上传，也不会自动同步到其他设备。上线后第一次访问需要重新上传自己的动画。
