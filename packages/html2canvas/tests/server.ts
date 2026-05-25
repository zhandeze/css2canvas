import express from 'express';
const cors = require('cors');
const path = require('path');
const os = require('os');
const serveIndex = require('serve-index');
const proxy = require('html2canvas-proxy');
import yargs from 'yargs';
import {
  ExtractedRenderCompare,
  ExtractedRenderInputEntry,
  FirstDiff,
  ImageCompareResult,
  MiniAppCompareRequest,
  MiniAppCompareResponse,
  ScreenshotRequest
} from './types';
const fs = require('fs');
const bodyParser = require('body-parser');
const filenamifyUrl = require('filenamify-url');
const mkdirp = require('mkdirp');
const crypto = require('crypto');
const {spawn} = require('child_process');
const {PNG} = require('pngjs');

export const app = express();

export const corsApp = express();
corsApp.use('/proxy', proxy());
corsApp.use('/cors', cors(), express.static(path.resolve(__dirname, '../')));
corsApp.use('/', express.static(path.resolve(__dirname, '.')));

export const screenshotApp = express();
screenshotApp.use(cors());
screenshotApp.use('/results', express.static(path.resolve(__dirname, '../tmp/miniapp-compare')));
const applyDefaultJsonContentType = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  // IE9 doesn't set headers for cross-domain ajax requests
  if (typeof req.headers['content-type'] === 'undefined') {
    req.headers['content-type'] = 'application/json';
  }
  next();
};

const jsonBodyParser = bodyParser.json({
  limit: '50mb',
  type: '*/*'
});

screenshotApp.use(applyDefaultJsonContentType);
screenshotApp.use(jsonBodyParser);

const prefix = 'data:image/png;base64,';
const screenshotFolder = '../tmp/reftests';
const metadataFolder = '../tmp/reftests/metadata';
const miniAppCompareFolder = '../tmp/miniapp-compare';
const miniAppCompareMetadataFolder = '../tmp/miniapp-compare/metadata';
const defaultExampleServerPort = Number(
  process.env.MINIAPP_EXAMPLE_SERVER_PORT || process.env.HTML2CANVAS_EXAMPLE_PORT || 8080
);

type ExampleDefinition = {
  name: string;
  selector: string;
  canvasSelector?: string;
  before?: string;
  path: string;
};

type BrowserReferenceArtifacts = {
  requestId: string;
  originalImage: string;
  extractedImage: string;
  generatedCompare: ExtractedRenderCompare;
  extractedCompare?: ExtractedRenderCompare;
  metadata: {
    url: string;
    title: string;
    selector: string;
    canvasSelector?: string;
    scale?: number;
  };
};

const exampleDefinitions: ExampleDefinition[] = [
  {
    name: 'demo',
    path: '/examples/demo.html',
    selector: 'body'
  },
  {
    name: 'demo2',
    path: '/examples/demo2.html',
    selector: 'body'
  }
];

const extractedRenderInputs = require('./generated/extracted-render-inputs') as {
  extractedRenderInputs: ExtractedRenderInputEntry[];
};

const resolveBrowserHarnessCommand = (): string => {
  const configuredPath = process.env.BROWSER_HARNESS_PATH;
  const homeDirectory = os.homedir();
  const candidates = [
    configuredPath,
    process.platform === 'win32'
      ? path.join(homeDirectory, '.local', 'bin', 'browser-harness.exe')
      : path.join(homeDirectory, '.local', 'bin', 'browser-harness'),
    process.platform === 'win32' ? 'browser-harness.exe' : 'browser-harness',
    'browser-harness'
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  for (const candidate of candidates) {
    if (!path.isAbsolute(candidate) || fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `browser-harness executable not found. Set BROWSER_HARNESS_PATH or install it under ${path.join(
      homeDirectory,
      '.local',
      'bin'
    )}`
  );
};

const browserHarnessCommand = resolveBrowserHarnessCommand();

mkdirp.sync(path.resolve(__dirname, screenshotFolder));
mkdirp.sync(path.resolve(__dirname, metadataFolder));
mkdirp.sync(path.resolve(__dirname, miniAppCompareFolder));
mkdirp.sync(path.resolve(__dirname, miniAppCompareMetadataFolder));

const writeScreenshot = (buffer: Buffer, body: ScreenshotRequest) => {
  const filename = `${filenamifyUrl(body.test.replace(/^\/tests\/reftests\//, '').replace(/\.html$/, ''), {
    replacement: '-'
  })}!${[process.env.TARGET_BROWSER, body.platform.name, body.platform.version].join('-')}`;

  fs.writeFileSync(path.resolve(__dirname, screenshotFolder, `${filename}.png`), buffer);
  return filename;
};

const getExampleDefinition = (exampleName: string): ExampleDefinition => {
  const definition = exampleDefinitions.find((example) => example.name === exampleName);
  if (!definition) {
    throw new Error(`Unknown example: ${exampleName}`);
  }
  return definition;
};

const getExtractedRenderInput = (exampleName: string): ExtractedRenderInputEntry => {
  const entry = extractedRenderInputs.extractedRenderInputs.find((item) => item.name === exampleName);
  if (!entry) {
    throw new Error(`Extracted render input not found: ${exampleName}`);
  }
  return entry;
};

const normalizeBaseUrl = (value?: string): string => {
  const fallback = `http://127.0.0.1:${defaultExampleServerPort}`;
  if (!value) {
    return fallback;
  }
  return value.replace(/\/$/, '');
};

const createRequestId = (exampleName: string): string =>
  `${Date.now()}-${filenamifyUrl(exampleName, {replacement: '-'})}-${crypto.randomBytes(4).toString('hex')}`;

const toFileUrl = (requestId: string, filename: string): string => `/results/${requestId}/${filename}`;

const decodePngDataUrl = (value: string): Buffer => {
  if (typeof value !== 'string' || !value.startsWith(prefix)) {
    throw new Error('Expected a PNG data URL');
  }
  return Buffer.from(value.substring(prefix.length), 'base64');
};

const ensureRequestFolder = (requestId: string): string => {
  const requestFolder = path.resolve(__dirname, miniAppCompareFolder, requestId);
  mkdirp.sync(requestFolder);
  return requestFolder;
};

const createBlankPng = (width: number, height: number): any => {
  const png = new PNG({width, height});
  png.data.fill(0);
  return png;
};

const getPixelSample = (data: Buffer, width: number, x: number, y: number) => {
  const index = (width * y + x) * 4;
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    a: data[index + 3]
  };
};

const comparePngBuffers = (
  referenceBuffer: Buffer,
  actualBuffer: Buffer
): {compare: ImageCompareResult; diffBuffer: Buffer} => {
  const referencePng = PNG.sync.read(referenceBuffer);
  const actualPng = PNG.sync.read(actualBuffer);
  const overlapWidth = Math.min(referencePng.width, actualPng.width);
  const overlapHeight = Math.min(referencePng.height, actualPng.height);
  const totalPixels = Math.max(referencePng.width, actualPng.width) * Math.max(referencePng.height, actualPng.height);
  const diffPng = createBlankPng(
    Math.max(referencePng.width, actualPng.width),
    Math.max(referencePng.height, actualPng.height)
  );

  let diffPixels = 0;
  let firstDiff: FirstDiff | undefined;

  const markDiffPixel = (
    x: number,
    y: number,
    referencePixel?: {r: number; g: number; b: number; a: number},
    actualPixel?: {r: number; g: number; b: number; a: number}
  ) => {
    const diffIndex = (diffPng.width * y + x) * 4;
    diffPng.data[diffIndex] = 255;
    diffPng.data[diffIndex + 1] = 0;
    diffPng.data[diffIndex + 2] = 0;
    diffPng.data[diffIndex + 3] = 255;
    diffPixels += 1;

    if (!firstDiff && referencePixel && actualPixel) {
      firstDiff = {
        x,
        y,
        reference: referencePixel,
        actual: actualPixel
      };
    }
  };

  for (let y = 0; y < overlapHeight; y += 1) {
    for (let x = 0; x < overlapWidth; x += 1) {
      const referencePixel = getPixelSample(referencePng.data, referencePng.width, x, y);
      const actualPixel = getPixelSample(actualPng.data, actualPng.width, x, y);
      const same =
        referencePixel.r === actualPixel.r &&
        referencePixel.g === actualPixel.g &&
        referencePixel.b === actualPixel.b &&
        referencePixel.a === actualPixel.a;

      const referenceIndex = (referencePng.width * y + x) * 4;
      const diffIndex = (diffPng.width * y + x) * 4;

      if (same) {
        const gray = Math.max(
          0,
          Math.min(255, Math.round(referencePixel.r * 0.3 + referencePixel.g * 0.59 + referencePixel.b * 0.11))
        );
        diffPng.data[diffIndex] = gray;
        diffPng.data[diffIndex + 1] = gray;
        diffPng.data[diffIndex + 2] = gray;
        diffPng.data[diffIndex + 3] = Math.max(80, Math.round(referencePng.data[referenceIndex + 3] * 0.35));
        continue;
      }

      markDiffPixel(x, y, referencePixel, actualPixel);
    }
  }

  for (let y = 0; y < diffPng.height; y += 1) {
    for (let x = 0; x < diffPng.width; x += 1) {
      if (x < overlapWidth && y < overlapHeight) {
        continue;
      }
      markDiffPixel(x, y);
    }
  }

  const compare: ImageCompareResult = {
    identical: diffPixels === 0 && referencePng.width === actualPng.width && referencePng.height === actualPng.height,
    diffPixels,
    diffRatio: totalPixels === 0 ? 0 : diffPixels / totalPixels,
    totalPixels,
    overlapSize: {
      width: overlapWidth,
      height: overlapHeight
    },
    referenceSize: {
      width: referencePng.width,
      height: referencePng.height
    },
    actualSize: {
      width: actualPng.width,
      height: actualPng.height
    },
    firstDiff
  };

  return {
    compare,
    diffBuffer: PNG.sync.write(diffPng)
  };
};

const buildBrowserHarnessScript = (
  example: ExampleDefinition,
  exampleEntry: ExtractedRenderInputEntry,
  url: string
): string => {
  const beforeHook = example.before ? `${example.before}\n` : '';
  const expectedWidth = Math.floor(exampleEntry.input.renderOptions.width * (exampleEntry.input.renderOptions.scale || 1));
  const expectedHeight = Math.floor(
    exampleEntry.input.renderOptions.height * (exampleEntry.input.renderOptions.scale || 1)
  );
  return `
import json

new_tab(${JSON.stringify(url)})
wait_for_load()
result = js("""
(async () => {
  delete window.extractedCanvasRendererBrowser;
  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-miniapp-compare-helper="1"]');
    if (existing) {
      existing.remove();
    }
    const s = document.createElement('script');
    s.dataset.miniappCompareHelper = '1';
    s.src = '/build/extracted-canvas-renderer-browser.js?v=' + Date.now();
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('helper load failed'));
    document.head.appendChild(s);
  });

  ${beforeHook}

  const options = {
    selector: ${JSON.stringify(example.selector)},
    scale: ${JSON.stringify(exampleEntry.input.renderOptions.scale || 1)}
  };
  ${example.canvasSelector ? `options.canvasSelector = ${JSON.stringify(example.canvasSelector)};` : ''}

  let rendered = null;
  const attempts = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    rendered = await window.extractedCanvasRendererBrowser.renderOriginalAndExtracted(options);
    attempts.push(rendered.compare);
    if (
      rendered.compare.identical &&
      rendered.compare.originalSize.width === ${expectedWidth} &&
      rendered.compare.originalSize.height === ${expectedHeight}
    ) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (
    !rendered ||
    !rendered.compare.identical ||
    rendered.compare.originalSize.width !== ${expectedWidth} ||
    rendered.compare.originalSize.height !== ${expectedHeight}
  ) {
    throw new Error('Unstable browser reference render: ' + JSON.stringify(attempts));
  }

  return {
    title: document.title,
    originalDataUrl: rendered.original.toDataURL('image/png'),
    extractedDataUrl: rendered.extracted.toDataURL('image/png'),
    compare: rendered.compare
  };
})()
""")
print(json.dumps(result))
`;
};

const runBrowserHarness = (script: string): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const child = spawn(browserHarnessCommand, ['-c', script]);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error && error.code === 'ENOENT') {
        reject(
          new Error(
            `Unable to start browser-harness from "${browserHarnessCommand}". ` +
              'Set BROWSER_HARNESS_PATH to the full executable path.'
          )
        );
        return;
      }
      reject(error);
    });
    child.on('close', (code: number) => {
      if (code !== 0) {
        reject(new Error(`browser-harness exited with code ${code}: ${stderr || stdout}`));
        return;
      }
      resolve(stdout.trim());
    });
  });

const generateBrowserReferenceArtifacts = async (
  requestId: string,
  exampleName: string,
  exampleBaseUrl?: string
): Promise<BrowserReferenceArtifacts> => {
  const example = getExampleDefinition(exampleName);
  const exampleEntry = getExtractedRenderInput(exampleName);
  const baseUrl = normalizeBaseUrl(exampleBaseUrl);
  const url = `${baseUrl}${example.path}`;
  const requestFolder = ensureRequestFolder(requestId);
  const output = await runBrowserHarness(buildBrowserHarnessScript(example, exampleEntry, url));
  const parsed = JSON.parse(output) as {
    title: string;
    originalDataUrl: string;
    extractedDataUrl: string;
    compare: ExtractedRenderCompare;
  };

  const originalImage = 'reference-original.png';
  const extractedImage = 'reference-extracted.png';
  fs.writeFileSync(path.resolve(requestFolder, originalImage), decodePngDataUrl(parsed.originalDataUrl));
  fs.writeFileSync(path.resolve(requestFolder, extractedImage), decodePngDataUrl(parsed.extractedDataUrl));

  const metadata = {
    url,
    title: parsed.title,
    selector: example.selector,
    canvasSelector: example.canvasSelector,
    scale: exampleEntry.input.renderOptions.scale
  };

  fs.writeFileSync(
    path.resolve(requestFolder, 'browser-reference.json'),
    JSON.stringify(
      {
        exampleName,
        compare: parsed.compare,
        metadata
      },
      null,
      2
    )
  );

  return {
    requestId,
    originalImage,
    extractedImage,
    generatedCompare: parsed.compare,
    extractedCompare: exampleEntry.compare,
    metadata
  };
};

const compareMiniAppImage = async (
  req: express.Request<{}, MiniAppCompareResponse, MiniAppCompareRequest>,
  res: express.Response<MiniAppCompareResponse | {error: string}>
) => {
  try {
    if (!req.body || typeof req.body.exampleName !== 'string' || typeof req.body.actualImage !== 'string') {
      res.status(400).json({error: 'exampleName and actualImage are required'});
      return;
    }

    const requestId = createRequestId(req.body.exampleName);
    console.log(`[miniapp/compare] requestId=${requestId} example=${req.body.exampleName}`);
    const requestFolder = ensureRequestFolder(requestId);
    const browserArtifacts = await generateBrowserReferenceArtifacts(
      requestId,
      req.body.exampleName,
      req.body.exampleBaseUrl
    );

    const actualImageName = 'actual-miniapp.png';
    const diffImageName = 'diff.png';
    const actualBuffer = decodePngDataUrl(req.body.actualImage);
    const referenceBuffer = fs.readFileSync(path.resolve(requestFolder, browserArtifacts.originalImage));
    const compared = comparePngBuffers(referenceBuffer, actualBuffer);

    fs.writeFileSync(path.resolve(requestFolder, actualImageName), actualBuffer);
    fs.writeFileSync(path.resolve(requestFolder, diffImageName), compared.diffBuffer);

    const metadata = {
      requestId,
      exampleName: req.body.exampleName,
      generatedAt: new Date().toISOString(),
      exampleBaseUrl: normalizeBaseUrl(req.body.exampleBaseUrl),
      browser: {
        generatedCompare: browserArtifacts.generatedCompare,
        extractedCompare: browserArtifacts.extractedCompare,
        metadata: browserArtifacts.metadata
      },
      diff: compared.compare
    };
    const metadataFilename = `${requestId}.json`;
    fs.writeFileSync(
      path.resolve(__dirname, miniAppCompareMetadataFolder, metadataFilename),
      JSON.stringify(metadata, null, 2)
    );

    const response: MiniAppCompareResponse = {
      exampleName: req.body.exampleName,
      requestId,
      browser: {
        referenceUrl: toFileUrl(requestId, browserArtifacts.originalImage),
        extractedUrl: toFileUrl(requestId, browserArtifacts.extractedImage),
        extractedCompare: browserArtifacts.extractedCompare,
        generatedCompare: browserArtifacts.generatedCompare
      },
      actual: {
        url: toFileUrl(requestId, actualImageName)
      },
      diff: {
        url: toFileUrl(requestId, diffImageName),
        compare: compared.compare
      },
      metadataUrl: `/results/metadata/${metadataFilename}`
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

app.use('/results/metadata', express.static(path.resolve(__dirname, miniAppCompareMetadataFolder)));
app.use(applyDefaultJsonContentType);
app.use(jsonBodyParser);
app.post('/miniapp/compare', compareMiniAppImage);
app.use('/results', express.static(path.resolve(__dirname, '../tmp/miniapp-compare')));
app.use([/^\/src($|\/)/, '/'], express.static(path.resolve(__dirname, '../')));
app.use('/', serveIndex(path.resolve(__dirname, '../'), {icons: true}));

screenshotApp.use('/results/metadata', express.static(path.resolve(__dirname, miniAppCompareMetadataFolder)));
screenshotApp.post('/miniapp/compare', compareMiniAppImage);

screenshotApp.post('/screenshot', (req: express.Request<{}, void, ScreenshotRequest>, res: express.Response) => {
  if (!req.body || !req.body.screenshot) {
    return res.sendStatus(400);
  }

  const buffer = Buffer.from(req.body.screenshot.substring(prefix.length), 'base64');
  const filename = writeScreenshot(buffer, req.body);
  fs.writeFileSync(
    path.resolve(__dirname, metadataFolder, `${filename}.json`),
    JSON.stringify({
      windowWidth: req.body.windowWidth,
      windowHeight: req.body.windowHeight,
      platform: req.body.platform,
      devicePixelRatio: req.body.devicePixelRatio,
      test: req.body.test,
      id: process.env.TARGET_BROWSER,
      screenshot: filename
    })
  );
  return res.sendStatus(200);
});

screenshotApp.use((error: Error, _req: express.Request, _res: express.Response, next: express.NextFunction) => {
  console.error(error);
  next();
});

const args = yargs(process.argv.slice(2)).number(['port', 'cors']).parseSync();

if (args.port) {
  app.listen(args.port, () => {
    console.log(`Server running on port ${args.port}`);
  });
}

if (args.cors) {
  corsApp.listen(args.cors, () => {
    console.log(`CORS server running on port ${args.cors}`);
  });
}
