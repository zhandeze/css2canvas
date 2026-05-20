const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const miniappLibDir = path.resolve(projectRoot, 'miniapp-project/lib');
const runtimeSourcePath = path.resolve(projectRoot, 'dist/canvas-renderer-miniapp.js');
const inputsSourcePath = path.resolve(projectRoot, 'tests/generated/extracted-render-inputs.js');
const runtimeTargetPath = path.resolve(miniappLibDir, 'canvas-renderer-miniapp.js');
const inputsTargetPath = path.resolve(miniappLibDir, 'extracted-render-inputs.js');

const ensureDir = (dirPath) => {
    fs.mkdirSync(dirPath, {recursive: true});
};

const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const write = (filePath, content) => fs.writeFileSync(filePath, content, 'utf8');

const toCommonJsRuntime = (source) => {
    if (!source.includes('export { renderMiniAppCanvas };')) {
        throw new Error('Unexpected runtime export shape');
    }

    return source.replace(
        'export { renderMiniAppCanvas };',
        "module.exports = {renderMiniAppCanvas: renderMiniAppCanvas};"
    );
};

const toCommonJsInputs = (source) => {
    if (!source.includes('export const extractedRenderInputs = ')) {
        throw new Error('Unexpected extracted inputs export shape');
    }

    return source
        .replace('export const extractedRenderInputs = ', 'const extractedRenderInputs = ')
        .concat('\nmodule.exports = {extractedRenderInputs};\n');
};

const main = () => {
    ensureDir(miniappLibDir);
    const runtimeSource = read(runtimeSourcePath);
    const inputsSource = read(inputsSourcePath);

    write(runtimeTargetPath, toCommonJsRuntime(runtimeSource));
    write(inputsTargetPath, toCommonJsInputs(inputsSource));

    console.log(JSON.stringify({
        runtimeTargetPath,
        inputsTargetPath
    }));
};

main();
