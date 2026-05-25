const fs = require('fs');
const path = require('path');
const prettier = require('prettier');

const outputPath = path.resolve(process.cwd(), 'tests/generated/extracted-render-inputs.js');
const jsonOutputPath = path.resolve(process.cwd(), 'tests/generated/extracted-render-inputs.json');

const input = process.argv[2];
if (!input) {
  throw new Error('Missing JSON payload path');
}

const payload = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), input), 'utf8'));

const UNSUPPORTED_MEDIA_TYPES = new Set(['canvas', 'iframe', 'svg', 'video']);

const sanitizeContainer = (container) => {
  const containerType = UNSUPPORTED_MEDIA_TYPES.has(container.containerType) ? 'element' : container.containerType;
  const sanitized = {
    ...container,
    containerType,
    elements: Array.isArray(container.elements) ? container.elements.map(sanitizeContainer) : []
  };

  if (container.tree && containerType === 'iframe') {
    sanitized.tree = sanitizeContainer(container.tree);
  } else {
    delete sanitized.tree;
  }

  if (containerType !== 'svg') {
    delete sanitized.svg;
  }
  if (containerType !== 'image') {
    delete sanitized.src;
  }

  return sanitized;
};

const sanitizedPayload = payload
  .filter((entry) => entry.name !== 'existing_canvas')
  .map((entry) => ({
    ...entry,
    input: {
      ...entry.input,
      renderOptions: {
        ...entry.input.renderOptions,
        canvas: undefined
      },
      root: sanitizeContainer(entry.input.root)
    }
  }));

const formatOutputModule = (entries) =>
  prettier.format(`export const extractedRenderInputs = ${JSON.stringify(entries, null, 2)};\n`, {
    parser: 'babel',
    singleQuote: true,
    trailingComma: 'none',
    tabWidth: 2,
    useTabs: true,
    bracketSpacing: false,
    printWidth: 120
  });

fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(outputPath, formatOutputModule(sanitizedPayload), 'utf8');
fs.writeFileSync(jsonOutputPath, `${JSON.stringify(sanitizedPayload)}\n`, 'utf8');
console.log(outputPath);
