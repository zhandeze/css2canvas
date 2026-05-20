

  • 当前结论

  - 这轮中断前没有产生新改动，也没有新增结论；可以直接从上次最优版本继续。
  - 当前最优真实小程序 compare 结果是 diffPixels = 26058，稳定复现 3 次，首差在 (630,19)，说明主要剩余问题还在 native
    canvas 的右边框/右上连接处。
  - 浏览器参考图链路已经稳定，generatedCompare.diffPixels = 0，下次不需要优先重查浏览器端。
  - 当前应保留的修改只在 src/miniapp/canvas-renderer-miniapp.ts，同步产物是 miniapp-project/lib/canvas-renderer-
    miniapp.js。
  - 工作树状态还是：
      - M src/miniapp/canvas-renderer-miniapp.ts
      - `M miniapp-project/lib/canvas-renderer-mini可以，下一次会话直接按这个最小清单继续。

  当前状态

  - 浏览器参考链路已经稳定，generatedCompare.diffPixels = 0。
  - 真正剩余问题只在真实小程序 native canvas。
  - 当前最优真实结果是 diffPixels = 26058，稳定复现 3 次：
      - tmp/miniapp-compare/metadata/1779184051441-demo-c9fe22f7.json
      - tmp/miniapp-compare/metadata/1779184053625-demo-81fd9f14.json
      - tmp/miniapp-compare/metadata/1779184055633-demo-54d08a59.json
  - 当前保留代码只改了 miniapp 专属边框快路径，位置在 src/miniapp/canvas-renderer-miniapp.ts:289。
  - 工作树当前重点文件：
      - src/miniapp/canvas-renderer-miniapp.ts
      - miniapp-project/lib/canvas-renderer-miniapp.js
      - note.md

  下次直接做

  1. 先读 note.md 和上面 3 个 metadata，确认基线还是 26058。
  2. 只改 src/miniapp/canvas-renderer-miniapp.ts，不要动共享 renderer、src/index.ts、主 dist/html2canvas.js。
  3. 继续只试“右边框”微调，不回头改文字。
  4. 优先实验这两类改动，一次只改一个变量：
      - 右边框 x = bounds.left + bounds.width - right 的像素吸附
      - 右边框实际宽度 right 做极小增减，观察 (630,19) 和右侧边框残差是否一起下降
  5. 每次改完都走完整验证：
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