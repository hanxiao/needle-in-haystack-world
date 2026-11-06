import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The deliverable is one self-contained index.html that can be dropped at
// https://hanxiao.io/needle-in-haystack-world/ with no asset server.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 20_000,
    minify: true,
    reportCompressedSize: true,
  },
  server: { host: '127.0.0.1', port: 5173 },
});
