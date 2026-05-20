import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  site: 'https://cronos.sebastiangallo.com',
  integrations: [react()],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    ssr: {
      noExternal: ['d3-scale', 'd3-selection', 'd3-axis', 'd3-zoom', 'd3-array'],
    },
  },
});
