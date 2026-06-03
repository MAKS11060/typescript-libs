import {defineConfig} from 'tsdown'

export default defineConfig({
  entry: [
    './src/mod.ts',
    './src/plugins/zod.ts',
  ],
  outDir: 'dist',
  format: 'esm',
  dts: {
    tsgo: true,
  },
  // unbundle: true,

  deps: {
    // alwaysBundle: ['@std/yaml'],
  },
})
