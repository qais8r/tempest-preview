import { transform } from 'esbuild';
import source from '../scripts/view-transitions.js?raw';

// One transform per module load, shared by every static page.
export const transitionScript = transform(source, {
  minify: true,
  target: 'es2022',
  legalComments: 'none',
}).then(({ code }) => code);
