import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
  // ES Module build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true
    },
    plugins: [
      nodeResolve()
    ]
  },
  // CommonJS build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      inlineDynamicImports: true
    },
    plugins: [
      nodeResolve()
    ]
  },
  // UMD build for browsers
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'AccessibleMenu',
      sourcemap: true,
      inlineDynamicImports: true,
      exports: 'named'
    },
    plugins: [
      nodeResolve()
    ]
  }
];
