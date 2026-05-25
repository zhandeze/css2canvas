import html2canvas from '../src/index';
import {CacheStorage} from '../src/core/cache-storage';
import {computeLayout} from '../src/layout';
import {renderMiniAppCanvas} from '../src/miniapp/canvas-renderer-miniapp';
import {layoutToMiniAppRenderInput} from '../src/miniapp/render-input';
import {FontMetrics} from '../src/render/font-metrics';
import type {MiniAppLayoutFixture} from './miniapp-layout-compare-fixture';
import {miniappLayoutCompareFixtures} from './miniapp-layout-compare-fixture';

type PreviewResult = {
  name: string;
  referenceDataUrl: string;
  miniappDataUrl: string;
  diffDataUrl: string;
  diffPixels: number;
  diffRatio: number;
};

declare global {
  interface Window {
    __miniappLayoutPreview?: {
      results: PreviewResult[];
      renderAll: () => Promise<PreviewResult[]>;
    };
  }
}

const createFixtureFrame = async (fixture: MiniAppLayoutFixture): Promise<HTMLIFrameElement> => {
  const frame = document.createElement('iframe');
  frame.width = '640';
  frame.height = '480';
  frame.style.position = 'fixed';
  frame.style.left = '10000px';
  frame.style.top = '0';
  frame.style.visibility = 'hidden';

  const loaded = new Promise<void>((resolve, reject) => {
    frame.onload = () => resolve();
    frame.onerror = () => reject(new Error(`Failed to load fixture ${fixture.name}`));
  });

  frame.srcdoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${fixture.css}</style></head><body>${fixture.html}</body></html>`;
  document.body.appendChild(frame);
  await loaded;
  await new Promise((resolve) => setTimeout(resolve, 0));
  return frame;
};

const removeFixtureFrame = (frame: HTMLIFrameElement): void => {
  if (frame.parentNode) {
    frame.parentNode.removeChild(frame);
  }
};

const compareCanvases = (left: HTMLCanvasElement, right: HTMLCanvasElement) => {
  const width = Math.min(left.width, right.width);
  const height = Math.min(left.height, right.height);
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = Math.max(left.width, right.width);
  diffCanvas.height = Math.max(left.height, right.height);
  const leftCtx = left.getContext('2d');
  const rightCtx = right.getContext('2d');
  const diffCtx = diffCanvas.getContext('2d');

  if (!leftCtx || !rightCtx || !diffCtx) {
    throw new Error('Unable to acquire 2d context');
  }

  const leftData = leftCtx.getImageData(0, 0, width, height).data;
  const rightData = rightCtx.getImageData(0, 0, width, height).data;
  let diffPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const same =
        leftData[index] === rightData[index] &&
        leftData[index + 1] === rightData[index + 1] &&
        leftData[index + 2] === rightData[index + 2] &&
        leftData[index + 3] === rightData[index + 3];

      if (same) {
        const gray = Math.round(leftData[index] * 0.3 + leftData[index + 1] * 0.59 + leftData[index + 2] * 0.11);
        diffCtx.fillStyle = `rgba(${gray},${gray},${gray},0.35)`;
      } else {
        diffPixels += 1;
        diffCtx.fillStyle = 'rgba(255,0,0,1)';
      }

      diffCtx.fillRect(x, y, 1, 1);
    }
  }

  return {
    diffCanvas,
    diffPixels,
    diffRatio: width === 0 || height === 0 ? 0 : diffPixels / (width * height)
  };
};

const renderReferenceCanvas = async (fixture: MiniAppLayoutFixture): Promise<HTMLCanvasElement> => {
  const frame = await createFixtureFrame(fixture);

  try {
    const frameWindow = frame.contentWindow;
    const frameDocument = frame.contentDocument;
    if (!frameWindow || !frameDocument) {
      throw new Error(`Fixture window is unavailable for ${fixture.name}`);
    }

    const element = frameDocument.querySelector(fixture.selector) as HTMLElement | null;
    if (!element) {
      throw new Error(`Selector ${fixture.selector} was not found for ${fixture.name}`);
    }

    CacheStorage.setContext(frameWindow);
    return await html2canvas(element, {
      backgroundColor: null,
      logging: false,
      removeContainer: true,
      scale: fixture.scale,
      useCORS: false
    });
  } finally {
    CacheStorage.setContext(window);
    removeFixtureFrame(frame);
  }
};

const renderMiniAppFixture = async (fixture: MiniAppLayoutFixture): Promise<HTMLCanvasElement> => {
  const root = fixture.createLayoutRoot();
  computeLayout(root as never, undefined, 'ltr');

  if (!root.layout || typeof root.layout.width !== 'number' || typeof root.layout.height !== 'number') {
    throw new Error(`Layout root is missing computed dimensions for ${fixture.name}`);
  }

  const width = Math.ceil(root.layout.width);
  const height = Math.ceil(root.layout.height);
  const baseInput = layoutToMiniAppRenderInput(root as never);
  const input = {
    ...baseInput,
    selector: fixture.selector,
    renderOptions: {
      ...baseInput.renderOptions,
      backgroundColor: null,
      scale: fixture.scale,
      x: 0,
      y: 0,
      width,
      height
    },
    windowBounds: {
      left: 0,
      top: 0,
      width,
      height
    },
    environment: {
      userAgent: window.navigator.userAgent,
      useMiterTextStroke: 'chrome' in window
    }
  };

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(width * fixture.scale);
  canvas.height = Math.floor(height * fixture.scale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  await renderMiniAppCanvas(input, {
    canvas: canvas as never,
    createCanvas: () => document.createElement('canvas') as never,
    fontMetrics: new FontMetrics(document),
    logging: false,
    userAgent: window.navigator.userAgent,
    useMiterTextStroke: 'chrome' in window
  });

  return canvas;
};

const appendCanvasCard = (
  host: HTMLElement,
  label: string,
  canvas: HTMLCanvasElement,
  note?: string
): void => {
  const card = document.createElement('div');
  card.className = 'canvas-card';

  const title = document.createElement('div');
  title.className = 'canvas-label';
  title.textContent = label;
  card.appendChild(title);

  if (note) {
    const noteElement = document.createElement('div');
    noteElement.className = 'canvas-note';
    noteElement.textContent = note;
    card.appendChild(noteElement);
  }

  card.appendChild(canvas);
  host.appendChild(card);
};

const renderFixturePreview = async (fixture: MiniAppLayoutFixture): Promise<PreviewResult> => {
  const [referenceCanvas, miniappCanvas] = await Promise.all([
    renderReferenceCanvas(fixture),
    renderMiniAppFixture(fixture)
  ]);
  const {diffCanvas, diffPixels, diffRatio} = compareCanvases(referenceCanvas, miniappCanvas);

  const section = document.createElement('section');
  section.className = 'fixture-preview';

  const heading = document.createElement('h2');
  heading.textContent = fixture.name;
  section.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'canvas-grid';
  appendCanvasCard(grid, 'html2canvas', referenceCanvas);
  appendCanvasCard(grid, 'renderMiniAppCanvas', miniappCanvas);
  appendCanvasCard(grid, 'diff', diffCanvas, `diffPixels=${diffPixels}, diffRatio=${diffRatio.toFixed(4)}`);
  section.appendChild(grid);

  document.body.appendChild(section);

  return {
    name: fixture.name,
    referenceDataUrl: referenceCanvas.toDataURL('image/png'),
    miniappDataUrl: miniappCanvas.toDataURL('image/png'),
    diffDataUrl: diffCanvas.toDataURL('image/png'),
    diffPixels,
    diffRatio
  };
};

const renderAll = async (): Promise<PreviewResult[]> => {
  const results: PreviewResult[] = [];

  for (const fixture of miniappLayoutCompareFixtures) {
    results.push(await renderFixturePreview(fixture));
  }

  return results;
};

window.__miniappLayoutPreview = {
  results: [],
  async renderAll() {
    if (!window.__miniappLayoutPreview) {
      throw new Error('Preview controller is unavailable');
    }

    if (window.__miniappLayoutPreview.results.length === 0) {
      window.__miniappLayoutPreview.results = await renderAll();
    }

    return window.__miniappLayoutPreview.results;
  }
};

void window.__miniappLayoutPreview.renderAll();
