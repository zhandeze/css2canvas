import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import sourceMaps from 'rollup-plugin-sourcemaps';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import {resolve} from 'path';

export default {
    input: `tests/extracted-canvas-renderer-browser.ts`,
    output: [
        {
            file: resolve(__dirname, '../build/extracted-canvas-renderer-browser.js'),
            name: 'extractedCanvasRendererBrowser',
            format: 'iife',
            sourcemap: true
        }
    ],
    plugins: [
        nodeResolve(),
        json(),
        typescript({
            tsconfig: resolve(__dirname, 'tsconfig.json')
        }),
        commonjs({
            include: 'node_modules/**'
        }),
        sourceMaps()
    ]
};
