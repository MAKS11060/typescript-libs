import {defineConfig} from 'tsdown'

export default defineConfig({
  // entry: './src/mod.ts',
  entry: [
    './src/broadcast-channel.ts',
    './src/fetch/mod.ts',
    './src/mod.ts',
    './src/url-pattern.ts',
  ],
  outDir: 'dist',
  format: 'esm',
  dts: {
    tsgo: true,
  },
  unbundle: true,
})
