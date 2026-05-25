import {expect} from 'chai';
import html2canvas from '../src/index';
import {CacheStorage} from '../src/core/cache-storage';
import {computeLayout} from '../src/layout';
import {renderMiniAppCanvas} from '../src/miniapp/canvas-renderer-miniapp';
import {layoutToMiniAppRenderInput} from '../src/miniapp/render-input';
import {FontMetrics} from '../src/render/font-metrics';
import type {MiniAppLayoutFixture} from './miniapp-layout-compare-fixture';
import {miniappLayoutCompareFixtures} from './miniapp-layout-compare-fixture';

type CompareResult = {
  identical: boolean;
  originalSize: {width: number; height: number};
  extractedSize: {width: number; height: number};
  diffPixels: number;
  diffRatio: number;
};

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

const compareCanvases = (left: HTMLCanvasElement, right: HTMLCanvasElement): CompareResult => {
  const width = Math.min(left.width, right.width);
  const height = Math.min(left.height, right.height);
  const leftCtx = left.getContext('2d');
  const rightCtx = right.getContext('2d');

  if (!leftCtx || !rightCtx) {
    throw new Error('Unable to acquire 2d contexts for canvas comparison');
  }

  const leftData = leftCtx.getImageData(0, 0, width, height).data;
  const rightData = rightCtx.getImageData(0, 0, width, height).data;
  let diffPixels = 0;

  for (let i = 0; i < leftData.length; i += 4) {
    if (
      leftData[i] !== rightData[i] ||
      leftData[i + 1] !== rightData[i + 1] ||
      leftData[i + 2] !== rightData[i + 2] ||
      leftData[i + 3] !== rightData[i + 3]
    ) {
      diffPixels++;
    }
  }

  return {
    identical: diffPixels === 0 && left.width === right.width && left.height === right.height,
    originalSize: {width: left.width, height: left.height},
    extractedSize: {width: right.width, height: right.height},
    diffPixels,
    diffRatio: width === 0 || height === 0 ? 0 : diffPixels / (width * height)
  };
};

const createBrowserFontMetrics = () => new FontMetrics(document);

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

const renderMiniAppFixture = async (fixture: MiniAppLayoutFixture) => {
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
    fontMetrics: createBrowserFontMetrics(),
    logging: false,
    userAgent: window.navigator.userAgent,
    useMiterTextStroke: 'chrome' in window
  });

  return {canvas, input};
};

export const registerMiniAppLayoutKarmaTests = (): void => {
  describe('layoutToMiniAppRenderInput', () => {
    miniappLayoutCompareFixtures.forEach((fixture) => {
      it(`serializes absolute text bounds for ${fixture.name}`, () => {
        const root = fixture.createLayoutRoot();
        computeLayout(root as never, undefined, 'ltr');

        const width = Math.ceil(root.layout.width ?? 0);
        const height = Math.ceil(root.layout.height ?? 0);
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

        expect(input.root.bounds.width).to.equal(408);
        expect(input.root.bounds.left).to.equal(0);
        expect(input.root.elements).to.have.length(1);

        const card = input.root.elements[0];
        expect(card.bounds.left).to.equal(24);
        expect(card.bounds.top).to.equal(24);

        const title = card.elements[0];
        const body = card.elements[1];
        expect(title.textNodes).to.have.length(1);
        expect(body.textNodes).to.have.length(1);

        const titleLine = title.textNodes[0].textBounds[0];
        expect(titleLine.bounds.left).to.be.closeTo(48, 0.01);
        expect(titleLine.bounds.top).to.be.closeTo(46, 0.01);

        const bodyLines = body.textNodes[0].textBounds;
        expect(bodyLines.length).to.be.greaterThan(1);
        expect(bodyLines[0].bounds.left).to.be.closeTo(48, 0.01);
        expect(bodyLines[1].bounds.top).to.be.greaterThan(bodyLines[0].bounds.top);
      });

      it(`matches html2canvas pixels for ${fixture.name}`, async () => {
        const [referenceCanvas, miniAppResult] = await Promise.all([
          renderReferenceCanvas(fixture),
          renderMiniAppFixture(fixture)
        ]);
        const compare = compareCanvases(referenceCanvas, miniAppResult.canvas);

        expect(compare.originalSize).to.deep.equal(compare.extractedSize);
        expect(compare.diffRatio).to.be.at.most(0.03);
      });
    });
  });
};
