import typescript from '@rollup/plugin-typescript'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import copy from 'rollup-plugin-copy'
import scss from 'rollup-plugin-scss'
import serve from 'rollup-plugin-serve'

const isProduction = process.env.NODE_ENV === 'production'

export default (async () => {
  const terser = isProduction && (await import('rollup-plugin-terser')).terser
  return [
    {
      input: 'src/index.ts',
      context: 'window',
      output: {
        file: 'dist/bundle.js',
        format: 'iife',
        inlineDynamicImports: true,
        sourcemap: isProduction,
      },
      preserveEntrySignatures: false,
      plugins: [
        typescript(),
        nodeResolve(),
        commonjs(),
        scss({
          output: 'dist/bundle.css',
          outputStyle: isProduction && 'compressed',
          sourceMap: isProduction,
        }),
        isProduction && terser(),
        copy({
          targets: [
            {
              src: 'node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.ttf',
              dest: 'dist',
            },
            {
              src: 'static/*',
              dest: 'dist',
            },
          ],
        }),
        process.env.ROLLUP_WATCH && serve({
          contentBase: 'dist',
          open: true
        })
      ],
    },
    {
      input: 'node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
      context: 'self',
      output: {
        file: 'dist/editor.worker.js',
        format: 'iife',
        name: 'whatever',
        sourcemap: isProduction,
      },
      plugins: [
        isProduction && terser(),
      ],
    },
  ]
})()
