import json

module_version = "miniapp-sanitized-v2"

examples = [
    {
        "name": "demo",
        "url": "http://127.0.0.1:8090/examples/demo.html",
        "selector": "body",
    },
    {
        "name": "demo2",
        "url": "http://127.0.0.1:8090/examples/demo2.html",
        "selector": "body",
    },
]

results = []

script_template = """
(async () => {
  delete window.extractedCanvasRendererBrowser;
  if (!window.extractedCanvasRendererBrowser) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/build/extracted-canvas-renderer-browser.js?v=' + MODULE_VERSION;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('helper load failed'));
      document.head.appendChild(s);
    });
  }

  PREPARE_HOOK

  const [{renderMiniAppCanvas}, inputsModule] = await Promise.all([
    import('/dist/canvas-renderer-miniapp.js?v=' + MODULE_VERSION),
    import('/tests/generated/extracted-render-inputs.js?v=' + MODULE_VERSION)
  ]);

  const entry = inputsModule.extractedRenderInputs.find((item) => item.name === EXAMPLE_NAME);
  if (!entry) {
    throw new Error('input not found: ' + EXAMPLE_NAME);
  }

  const options = {
    selector: SELECTOR_VALUE,
    scale: entry.input.renderOptions.scale
  };
  const expectedSize = {
    width: Math.floor(entry.input.renderOptions.width * entry.input.renderOptions.scale),
    height: Math.floor(entry.input.renderOptions.height * entry.input.renderOptions.scale)
  };

  let reference = null;
  const referenceAttempts = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    reference = await window.extractedCanvasRendererBrowser.renderOriginalAndExtracted(options);
    referenceAttempts.push(reference.compare);
    if (
      reference.compare.identical &&
      reference.compare.originalSize.width === expectedSize.width &&
      reference.compare.originalSize.height === expectedSize.height
    ) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (
    !reference ||
    !reference.compare.identical ||
    reference.compare.originalSize.width !== expectedSize.width ||
    reference.compare.originalSize.height !== expectedSize.height
  ) {
    throw new Error('unstable reference render: ' + JSON.stringify(referenceAttempts));
  }

  const BrowserFontMetrics = class {
    constructor(doc) {
      this.doc = doc;
      this.cache = {};
    }

    getMetrics(fontFamily, fontSize) {
      const key = fontFamily + ' ' + fontSize;
      if (!this.cache[key]) {
        this.cache[key] = this.measure(fontFamily, fontSize);
      }
      return this.cache[key];
    }

    measure(fontFamily, fontSize) {
      const container = this.doc.createElement('div');
      const img = this.doc.createElement('img');
      const span = this.doc.createElement('span');
      const body = this.doc.body;

      container.style.visibility = 'hidden';
      container.style.fontFamily = fontFamily;
      container.style.fontSize = fontSize;
      container.style.margin = '0';
      container.style.padding = '0';
      container.style.whiteSpace = 'nowrap';
      body.appendChild(container);

      img.src =
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
      img.width = 1;
      img.height = 1;
      img.style.margin = '0';
      img.style.padding = '0';
      img.style.verticalAlign = 'baseline';

      span.style.fontFamily = fontFamily;
      span.style.fontSize = fontSize;
      span.style.margin = '0';
      span.style.padding = '0';
      span.appendChild(this.doc.createTextNode('Hidden Text'));
      container.appendChild(span);
      container.appendChild(img);

      const baseline = img.offsetTop - span.offsetTop + 2;

      container.removeChild(span);
      container.appendChild(this.doc.createTextNode('Hidden Text'));
      container.style.lineHeight = 'normal';
      img.style.verticalAlign = 'super';

      const middle = img.offsetTop - container.offsetTop + 2;
      body.removeChild(container);
      return {baseline, middle};
    }
  };

  const createCanvas = () => document.createElement('canvas');

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const input = entry.input;
  const miniCanvas = document.createElement('canvas');
  miniCanvas.width = Math.floor(input.renderOptions.width * input.renderOptions.scale);
  miniCanvas.height = Math.floor(input.renderOptions.height * input.renderOptions.scale);
  miniCanvas.style.width = String(input.renderOptions.width) + 'px';
  miniCanvas.style.height = String(input.renderOptions.height) + 'px';

  await renderMiniAppCanvas(input, {
    canvas: miniCanvas,
    createCanvas,
    loadImage,
    fontMetrics: new BrowserFontMetrics(document),
    userAgent: input.environment.userAgent,
    useMiterTextStroke: input.environment.useMiterTextStroke,
    logging: true
  });

  const compareCanvases = (left, right) => {
    const width = Math.min(left.width, right.width);
    const height = Math.min(left.height, right.height);
    const leftData = left.getContext('2d').getImageData(0, 0, width, height).data;
    const rightData = right.getContext('2d').getImageData(0, 0, width, height).data;
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
      diffPixels,
      leftSize: {width: left.width, height: left.height},
      rightSize: {width: right.width, height: right.height}
    };
  };

  return {
    inputName: entry.name,
    referenceCompare: reference.compare,
    miniappCompare: compareCanvases(reference.original, miniCanvas)
  };
})()
"""

for example in examples:
    new_tab(example["url"])
    wait_for_load()
    script = script_template.replace("EXAMPLE_NAME", json.dumps(example["name"]))
    script = script.replace("SELECTOR_VALUE", json.dumps(example["selector"]))
    script = script.replace("PREPARE_HOOK", example.get("before", ""))
    script = script.replace("MODULE_VERSION", json.dumps(module_version))
    result = js(script)
    results.append(result)

print(json.dumps(results))
