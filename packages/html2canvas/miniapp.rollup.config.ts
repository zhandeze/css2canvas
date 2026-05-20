import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import sourceMaps from 'rollup-plugin-sourcemaps';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

export default {
    input: `src/miniapp/canvas-renderer-miniapp.ts`,
    output: [
        {
            file: `dist/canvas-renderer-miniapp.js`,
            format: 'esm',
            sourcemap: true
        }
    ],
    external: [],
    plugins: [
        resolve(),
        json(),
        typescript({sourceMap: true, inlineSources: true}),
        commonjs({
            include: 'node_modules/**'
        }),
        sourceMaps()
    ]
};
