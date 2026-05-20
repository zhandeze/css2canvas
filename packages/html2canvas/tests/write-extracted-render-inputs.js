const fs = require('fs');
const path = require('path');

const outputPath = path.resolve(process.cwd(), 'tests/generated/extracted-render-inputs.js');

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

    if (containerType !== 'canvas') {
        delete sanitized.canvasData;
    }
    if (containerType !== 'svg') {
        delete sanitized.svg;
    }
    if (containerType !== 'image') {
        delete sanitized.src;
    }

    return sanitized;
};

const sanitizedPayload = payload.map((entry) => ({
    ...entry,
    input: {
        ...entry.input,
        root: sanitizeContainer(entry.input.root)
    }
}));

fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(
    outputPath,
    `export const extractedRenderInputs = ${JSON.stringify(sanitizedPayload, null, 2)};\n`,
    'utf8'
);
console.log(outputPath);
