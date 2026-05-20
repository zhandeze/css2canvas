# Miniapp Native Canvas 剩余问题与测试说明

## 当前阶段结论

- 当前主问题只剩真实小程序 `native canvas` 渲染；浏览器参考链路已经稳定，不是当前瓶颈。
- 浏览器侧稳定结果：
  - `generatedCompare.diffPixels = 0`
  - `extractedCompare.diffPixels = 0`
- 真实小程序当前稳定最优结果：
  - `diffPixels = 21341`
  - `firstDiff = (630, 19)`
  - 稳定 metadata：
    - `tmp/miniapp-compare/metadata/1779189816037-demo-a834025e.json`
    - `tmp/miniapp-compare/metadata/1779189823558-demo-6b6fb61a.json`
- 旧稳定基线是 `26058`，当前阶段性最优 `21341` 比它减少了 `4717`，约 `18.1%`。

## 当前应保留的实现

- 只保留 `src/miniapp/canvas-renderer-miniapp.ts` 里的 miniapp 定制逻辑。
- 当前应继续保留的两个点：
  - miniapp 专属矩形实线边框 fast path
  - `NATIVE_MINIAPP_TEXT_BASELINE_OFFSET = 3.25`
- 继续调优时，不要回头改这些范围外的代码：
  - 共享 renderer
  - `src/index.ts`
  - 主产物 `dist/html2canvas.js`

## 当前剩余问题

### 1. 右上角/右边框残差仍然存在

- 证据最明确的是稳定 metadata 里的首差一直在 `firstDiff = (630, 19)`。
- 该点参考像素是深灰色，实际像素是纯黑色，说明右上连接区域仍然存在 native canvas 下的边框几何误差。
- 优先怀疑位置：
  - `src/miniapp/canvas-renderer-miniapp.ts`
  - `renderRectangularSolidBorder(...)`
- 当前判断：
  - 这是第一优先级问题。
  - 后续如果继续优化，应先只盯这个区域，不要重新大范围调文字。

### 2. 文字区域仍可能有次级残差，但不再是当前第一优先级

- 本轮最有效的优化来自文字基线偏移，已经把稳定结果从 `26058` 拉到 `21341`。
- 当前 `3.25` 是已确认可复现的稳定点。
- 历史上出现过更低的单次 diff，但这些结果出现在产物未完全同步或未强制 `reLaunch` 的旧验证流程里，不应作为当前基线。
- 当前判断：
  - 在边框问题没有卡死之前，不建议继续大范围试文字参数。
  - 如果右上角边框 2 到 3 轮微调后仍无下降，再回来看文字区域。

### 3. 构建产物同步风险仍然存在

- 当前仓库里，源码和小程序运行产物并不一致：
  - `src/miniapp/canvas-renderer-miniapp.ts` 里是 `NATIVE_MINIAPP_TEXT_BASELINE_OFFSET = 3.25`
  - `miniapp-project/lib/canvas-renderer-miniapp.js` 里仍是 `3.5`
- 这意味着如果直接运行真实小程序 compare，拿到的可能不是源码当前状态，而是旧产物结果。
- 当前判断：
  - 这是流程级阻塞问题。
  - 后续任何验证前，都必须先重新 build 并确认产物已经同步。

## 后续修复时的固定测试前提

- compare 服务可用：
  - `http://127.0.0.1:8080`
  - `http://127.0.0.1:8081`
- 小程序调试 websocket 可连：
  - `ws://127.0.0.1:9431`
- 当前小程序页面：
  - `pages/index/index`
- 自动化依赖使用本地解包版本：
  - `tmp/mp-automator/package/out`

## 后续修复后的统一测试流程

### 1. 改动范围约束

- 每次只改 `src/miniapp/canvas-renderer-miniapp.ts`。
- 一次只改一个变量或一类几何逻辑。
- 不接受“边框和文字一起改”的混合实验。

### 2. 先 build 和 sync

每次改完先执行：

```powershell
npx rollup -c miniapp.rollup.config.ts
npm run build:miniapp-demo-assets
rg -n "NATIVE_MINIAPP_TEXT_BASELINE_OFFSET" src/miniapp/canvas-renderer-miniapp.ts dist/canvas-renderer-miniapp.js miniapp-project/lib/canvas-renderer-miniapp.js
```

判断标准：

- `src`
- `dist/canvas-renderer-miniapp.js`
- `miniapp-project/lib/canvas-renderer-miniapp.js`

这三个位置的关键值必须一致，否则本轮验证无效。

### 3. 强制重启页面再触发真实 compare

必须使用 `reLaunch('/pages/index/index')`，不要沿用旧页面状态。

可直接复用下面的验证脚本：

```powershell
@'
const automator = require('./tmp/mp-automator/package/out');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitUntil = async (getter, timeout = 60000, interval = 500) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await getter();
    if (value) {
      return value;
    }
    await sleep(interval);
  }
  throw new Error('waitUntil timeout');
};

(async () => {
  const miniProgram = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9431' });
  const page = await miniProgram.reLaunch('/pages/index/index');

  await page.waitFor(1500);
  await page.setData({ selectedIndex: 0 });
  await page.callMethod('renderSelectedExample');

  await waitUntil(async () => {
    const data = await page.data();
    return data.status && data.status.startsWith('渲染完成') && data.previewImagePath ? true : false;
  });

  await page.callMethod('onCompareTap');

  const finalData = await waitUntil(async () => {
    const data = await page.data();
    if (!data.compareStatus) {
      return false;
    }
    if (data.compareStatus.startsWith('上传比对完成')) {
      return data;
    }
    if (data.compareStatus.startsWith('上传比对发现差异')) {
      return data;
    }
    return false;
  });

  console.log(finalData.compareStatus);
  await miniProgram.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
'@ | node
```

### 4. 读取最新 metadata

compare 完成后，读取最新 metadata：

```powershell
Get-ChildItem tmp/miniapp-compare/metadata |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 3 FullName, LastWriteTime
```

然后打开最新文件，重点记录这三项：

- 文件名
- `diff.diffPixels`
- `diff.firstDiff`

### 5. 验证是否接受本次修复

只有同时满足下面条件，才接受这次改动：

- 浏览器参考链路仍然是 `diffPixels = 0`
- 真实小程序 `diffPixels < 21341`
- 最好连续跑 2 次，结果都不回退

不接受的情况：

- 浏览器侧出现回归
- 真实小程序总 diff 上升
- 只修了局部视觉问题，但总 diff 变大
- 没有重新 build/sync 就直接比较

## 针对每类问题的测试重点

### A. 如果修的是右边框/右上角问题

- 固定 `NATIVE_MINIAPP_TEXT_BASELINE_OFFSET = 3.25` 不动。
- 只试边框几何微调。
- 每次都关注：
  - `diffPixels` 是否低于 `21341`
  - `firstDiff` 是否还停在 `(630, 19)`
- 如果 `(630, 19)` 消失但总 diff 上升，也不要保留。

优先实验方向：

- 右边框 `x` 的像素吸附方式
- 右边框宽度 `right` 的极小增减
- 右上角与顶部连接处的补偿方式

### B. 如果修的是文字区域问题

- 先把边框几何保持不变。
- 一次只调一个文字基线参数。
- 建议只在 `3.0` 到 `3.5` 之间做小步长实验，不要重新大范围扫值。
- 仍然要走完整 compare 流程，不能只凭肉眼截图判断。

### C. 如果修的是流程/同步问题

- 每次 build 后先核对 `src`、`dist`、`miniapp-project/lib` 三处是否一致。
- 如果三处不一致，本轮 compare 直接视为无效。
- 这类问题修完后，第一轮验证目标不是追求更低 diff，而是确保“改什么就测到什么”。

## 推荐的后续推进顺序

1. 先修 build/sync 一致性，确保后续结果可信。
2. 固定文字偏移 `3.25`，只攻右上角/右边框残差。
3. 如果边框连续 2 到 3 轮都降不动，再回头微调文字区域。
4. 任何新结果都以最新 metadata 为准，不以肉眼截图或单次偶然低值为准。
