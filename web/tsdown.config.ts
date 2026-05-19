import {defineConfig} from 'tsdown'

export default defineConfig({
  entry: './src/mod.ts',
  outDir: 'dist',
  format: 'esm',
  dts: {
    tsgo: true,
  },
  unbundle: true,
})
