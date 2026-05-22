 前言：css-layout.ts 继续只负责 flex/box 布局，文本排版独立放到 packages/layout/text-layout/，通过 measure(width) 接入pretext。这样既不污染布局核心，也方便后面把文本能力继续拆成多个 TS 文件扩展。

  最终方案：text-layout/ 作为文本排版子系统，负责样式归一化、pretext 适配、换行测量、text-align、text-decoration 和颜
  色；css-layout.ts 只调用它产出的测量结果。

  结构建议：

  - text-layout/index.ts
  - text-layout/types.ts
  - text-layout/normalize-style.ts
  - text-layout/pretext-adapter.ts
  - text-layout/measure.ts
  - text-layout/align.ts
  - text-layout/decorate.ts

  第一版支持：

  - font-size
  - font-family
  - font-weight
  - font-style
  - line-height
  - letter-spacing
  - word-break
  - white-space
  - text-align
  - text-decoration
  - text-decoration-color

  边界：

  - 不改 css-layout.ts 的 flex 核心
  - 不做浏览器级完整 inline formatting
  - 先支持单段文本，后续再扩富文本/inline 片段
代码写完要增加测试，主要测增加了文本后，css-layout计算出来的结果是否是对的  