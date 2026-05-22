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

const toCommonJsNamedExports = (namedExports) =>
  namedExports
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const aliasMatch = entry.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);

      if (aliasMatch) {
        const [, localName, exportedName] = aliasMatch;
        return `${exportedName}: ${localName}`;
      }

      return `${entry}: ${entry}`;
    })
    .join(', ');

const toCommonJsRuntime = (source) => {
  const namedExportPattern = /^export\s*\{\s*([^}]+)\s*\};$/m;
  const match = source.match(namedExportPattern);

  if (!match) {
    throw new Error('Unexpected runtime export shape');
  }

  return source.replace(
    namedExportPattern,
    `module.exports = {${toCommonJsNamedExports(match[1])}};`
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

  console.log(
    JSON.stringify({
      runtimeTargetPath,
      inputsTargetPath
    })
  );
};

main();
