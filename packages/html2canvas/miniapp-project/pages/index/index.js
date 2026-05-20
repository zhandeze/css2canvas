const {renderMiniAppCanvas} = require('../../lib/canvas-renderer-miniapp');
const {extractedRenderInputs} = require('../../lib/extracted-render-inputs');

const TEMP_CANVAS_COUNT = 6;
const SERVER_ORIGIN = 'http://127.0.0.1:8080';
const EXAMPLE_BASE_URL = SERVER_ORIGIN;

const getCanvas = (that, selector) =>
  new Promise((resolve, reject) => {
    wx
      .createSelectorQuery()
      .in(that)
      .select(selector)
      .fields({node: true, size: true})
      .exec((res) => {
        if (res && res[0] && res[0].node) {
          resolve(res[0].node);
          return;
        }
        reject(new Error(`canvas node not found: ${selector}`));
      });
  });

const resolveImageSource = (src) => {
  if (typeof src !== 'string' || !src) {
    return src;
  }

  if (src.indexOf('data:image/') === 0 || /^https?:\/\//.test(src)) {
    return src;
  }

  const normalized = src.replace(/^\.\//, '');
  return `${EXAMPLE_BASE_URL}/${normalized}`;
};

const readFileAsBase64 = (filePath) =>
  new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (res) => resolve(res.data),
      fail: reject
    });
  });

Page({
  data: {
    exampleNames: extractedRenderInputs.map((item) => item.name),
    selectedIndex: 0,
    status: '等待渲染',
    previewImagePath: '',
    compareStatus: '等待上传比对',
    compareSummary: '',
    compareDiffImageUrl: '',
    compareReferenceImageUrl: '',
    compareActualImageUrl: '',
    compareExtractedImageUrl: '',
    canvasWidth: 300,
    canvasHeight: 150,
    pixelWidth: 300,
    pixelHeight: 150,
    renderScale: 1,
    tempCanvasIds: Array.from({length: TEMP_CANVAS_COUNT}, (_, index) => `tempCanvas${index}`)
  },

  async onReady() {
    try {
      await this.prepareCanvases();
      await this.renderSelectedExample();
    } catch (error) {
      this.setStatus(error);
    }
  },

  onExampleChange(event) {
    const nextIndex = Number(event.detail.value) || 0;
    this.setData({
      selectedIndex: nextIndex,
      previewImagePath: '',
      compareStatus: '等待上传比对',
      compareSummary: '',
      compareDiffImageUrl: '',
      compareReferenceImageUrl: '',
      compareActualImageUrl: '',
      compareExtractedImageUrl: ''
    });
    this.renderSelectedExample();
  },

  async onRenderTap() {
    await this.renderSelectedExample();
  },

  async onCompareTap() {
    try {
      if (!this.data.previewImagePath) {
        throw new Error('请先完成渲染');
      }

      const entry = this.getSelectedEntry();
      this.setData({
        compareStatus: `上传比对中: ${entry.name}`,
        compareSummary: ''
      });

      const base64 = await readFileAsBase64(this.data.previewImagePath);
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${SERVER_ORIGIN}/miniapp/compare`,
          method: 'POST',
          data: {
            exampleName: entry.name,
            exampleBaseUrl: EXAMPLE_BASE_URL,
            actualImage: `data:image/png;base64,${base64}`
          },
          success: (res) => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(res.data);
              return;
            }
            reject(new Error((res.data && res.data.error) || `compare request failed: ${res.statusCode}`));
          },
          fail: reject
        });
      });

      const compare = response.diff.compare;
      const summary = compare.identical
        ? `像素一致，尺寸 ${compare.actualSize.width} x ${compare.actualSize.height}`
        : `差异像素 ${compare.diffPixels} / ${compare.totalPixels}，比例 ${(compare.diffRatio * 100).toFixed(4)}%`;

      this.setData({
        compareStatus: compare.identical ? `上传比对完成: ${entry.name}` : `上传比对发现差异: ${entry.name}`,
        compareSummary: summary,
        compareDiffImageUrl: `${SERVER_ORIGIN}${response.diff.url}`,
        compareReferenceImageUrl: `${SERVER_ORIGIN}${response.browser.referenceUrl}`,
        compareActualImageUrl: `${SERVER_ORIGIN}${response.actual.url}`,
        compareExtractedImageUrl: `${SERVER_ORIGIN}${response.browser.extractedUrl}`
      });
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      this.setData({
        compareStatus: `上传比对失败: ${message}`
      });
      console.error(error);
    }
  },

  onPreviewTap() {
    if (!this.data.previewImagePath) {
      return;
    }

    wx.previewImage({
      current: this.data.previewImagePath,
      urls: [this.data.previewImagePath]
    });
  },

  async prepareCanvases() {
    const displayCanvas = await getCanvas(this, '#displayCanvas');
    const measureCanvas = await getCanvas(this, '#measureCanvas');
    const tempCanvases = [];

    for (let index = 0; index < TEMP_CANVAS_COUNT; index += 1) {
      tempCanvases.push(await getCanvas(this, `#tempCanvas${index}`));
    }

    this.displayCanvas = displayCanvas;
    this.measureCanvas = measureCanvas;
    this.tempCanvases = tempCanvases;
    this.tempCanvasCursor = 0;
  },

  createCanvas() {
    if (!this.tempCanvases || this.tempCanvases.length === 0) {
      throw new Error('temporary canvases are not ready');
    }

    const canvas = this.tempCanvases[this.tempCanvasCursor % this.tempCanvases.length];
    this.tempCanvasCursor += 1;
    canvas.width = 1;
    canvas.height = 1;
    return canvas;
  },

  loadImage(src) {
    const targetCanvas = this.displayCanvas || (this.tempCanvases && this.tempCanvases[0]);
    if (!targetCanvas || typeof targetCanvas.createImage !== 'function') {
      return Promise.reject(new Error('canvas.createImage is not available'));
    }

    return new Promise((resolve, reject) => {
      const image = targetCanvas.createImage();
      image.onload = () => resolve(image);
      image.onerror = (error) => reject(error || new Error(`image load failed: ${src}`));
      image.src = resolveImageSource(src);
    });
  },

  getSelectedEntry() {
    const entry = extractedRenderInputs[this.data.selectedIndex];
    if (!entry) {
      throw new Error(`example not found at index ${this.data.selectedIndex}`);
    }
    return entry;
  },

  async renderSelectedExample() {
    const renderToken = Symbol('render');
    this.renderToken = renderToken;
    const entry = this.getSelectedEntry();
    const input = entry.input;
    const width = Math.max(1, input.renderOptions.width);
    const height = Math.max(1, input.renderOptions.height);
    const scale = input.renderOptions.scale || 1;
    const pixelWidth = Math.max(1, Math.floor(input.renderOptions.width * scale));
    const pixelHeight = Math.max(1, Math.floor(input.renderOptions.height * scale));

    this.setData({
      status: `渲染中: ${entry.name}`,
      previewImagePath: '',
      compareStatus: '等待上传比对',
      compareSummary: '',
      compareDiffImageUrl: '',
      compareReferenceImageUrl: '',
      compareActualImageUrl: '',
      compareExtractedImageUrl: '',
      canvasWidth: width,
      canvasHeight: height,
      pixelWidth,
      pixelHeight,
      renderScale: scale
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    this.displayCanvas.width = pixelWidth;
    this.displayCanvas.height = pixelHeight;
    this.measureCanvas.width = 256;
    this.measureCanvas.height = 64;
    this.tempCanvasCursor = 0;
    this.clearCanvas(this.displayCanvas);
    this.clearCanvas(this.measureCanvas);
    (this.tempCanvases || []).forEach((canvas) => this.clearCanvas(canvas));

    const existingCanvasSnapshot = input.renderOptions.canvas;
    if (existingCanvasSnapshot && existingCanvasSnapshot.dataURL) {
      const image = await this.loadImage(existingCanvasSnapshot.dataURL);
      const ctx = this.displayCanvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
    }

    await renderMiniAppCanvas(input, {
      canvas: this.displayCanvas,
      createCanvas: () => this.createCanvas(),
      loadImage: (src) => this.loadImage(src),
      measureCanvas: this.measureCanvas,
      logging: true
    });

    if (this.renderToken !== renderToken) {
      return;
    }

    const previewImagePath = await this.exportCanvasToImage(this.displayCanvas, pixelWidth, pixelHeight);
    if (this.renderToken !== renderToken) {
      return;
    }

    this.setData({
      previewImagePath,
      status: `渲染完成: ${entry.name}${entry.compare && entry.compare.identical ? '，原浏览器对比一致' : ''}`
    });
  },

  exportCanvasToImage(canvas, width, height) {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        x: 0,
        y: 0,
        width,
        height,
        destWidth: width,
        destHeight: height,
        success: (res) => resolve(res.tempFilePath),
        fail: reject
      });
    });
  },

  clearCanvas(canvas) {
    if (!canvas) {
      return;
    }

    const width = canvas.width || 1;
    const height = canvas.height || 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }
  },

  setStatus(error) {
    const message = error && error.message ? error.message : String(error);
    this.setData({status: `渲染失败: ${message}`});
    console.error(error);
  }
});
