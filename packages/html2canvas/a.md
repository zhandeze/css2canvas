  每次改完都走完整验证：
    - npx rollup -c miniapp.rollup.config.ts
    - npm run build:miniapp-demo-assets
    - 跑真实小程序 compare
    - 记录新 metadata 文件名、diffPixels、firstDiff
  验证前提

  - compare 服务必须在 8080/8081
  - 小程序调试端口必须可连：ws://127.0.0.1:9431
  - 当前页面应是 pages/index/index

  判断标准

  - 只接受真实小程序 diffPixels < 26058 的改动。
  - 如果某次改动让右边框改善但总 diff 上升，也先记下来，不直接保留。
  - 如果 2 到 3 轮右边框微调都降不动，再考虑把剩余问题切到文字区域。

  可以使用browser skills去调用浏览器测试，注意不要重复打开tab，尽量复用tab