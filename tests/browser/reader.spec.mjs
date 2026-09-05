import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

// Use the real reader and PageFlip. A controllable PDF renderer exposes queue ordering
// without depending on machine speed or the complexity of a particular PDF page.
const mockPdf = `
export const GlobalWorkerOptions = {};
const state = window.pdfTest = { renders: [], hold: null, release: null };
export const getDocument = () => ({ promise: Promise.resolve({
  numPages: 40,
  async getPage(number) { return {
    getViewport({ scale }) { return { width: 560 * scale, height: 724 * scale, scale }; },
    render() {
      state.renders.push(number);
      return { promise: state.hold === number
        ? new Promise(resolve => { state.release = () => { state.hold = null; resolve(); }; })
        : Promise.resolve() };
    },
    async getTextContent() { return { number }; }
  }; }
}) });
export class TextLayer {
  constructor(options) { this.options = options; }
  async render() { this.options.container.textContent = 'Page ' + this.options.textContentSource.number; }
}
`;
const bundled = await build({
  stdin: {
    contents: await readFile(new URL('../../src/lib/reader.ts', import.meta.url), 'utf8'),
    resolveDir: new URL('../../src/lib', import.meta.url).pathname,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  plugins: [
    {
      name: 'controlled-pdf',
      setup(builder) {
        builder.onResolve({ filter: /^pdfjs-dist/ }, ({ path }) => ({
          path,
          namespace: 'test-pdf',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'test-pdf' }, ({ path }) => ({
          contents: path.includes('worker') ? 'export default "";' : mockPdf,
        }));
      },
    },
  ],
});

async function controlledReader(page) {
  await page.route('**/_astro/reader.*.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: bundled.outputFiles[0].text,
    }),
  );
  await page.goto('issues/2018/reader/');
  await expect(page.locator('#page-range')).toBeEnabled();
  await expect(page.locator('.pdf-page[data-page="4"] canvas')).toHaveCount(1);
  await page.evaluate(() => {
    window.pdfTest.renders = [];
    window.pdfTest.hold = 8;
  });
  await jump(page, [8]);
  await expect.poll(() => page.evaluate(() => window.pdfTest.renders)).toEqual([8]);
}

async function jump(page, pages) {
  await page.locator('#page-range').evaluate((range, pages) => {
    for (const number of pages) {
      range.value = String(number);
      range.dispatchEvent(new Event('change'));
    }
  }, pages);
}

test('rapid jumps skip obsolete queued pages and render the current spread first', async ({
  page,
}) => {
  await controlledReader(page);
  await jump(page, [10, 20, 30]);
  await page.evaluate(() => window.pdfTest.release());
  await expect(page.locator('.pdf-page[data-page="33"] canvas')).toHaveCount(1);
  expect(await page.evaluate(() => window.pdfTest.renders)).toEqual([8, 30, 31, 29, 32, 28, 33]);
  await expect(page.locator('#page-range')).toHaveValue('30');
  await expect(page.locator('.page-retry')).toHaveCount(0);
});

test('returning to an inflight page renders it after its obsolete request finishes', async ({
  page,
}) => {
  await controlledReader(page);
  await jump(page, [20, 8]);
  await page.evaluate(() => window.pdfTest.release());
  await expect(page.locator('.pdf-page[data-page="8"] .textLayer')).toHaveText('Page 8');
  await expect(page.locator('.pdf-page[data-page="11"] canvas')).toHaveCount(1);
  expect(await page.evaluate(() => window.pdfTest.renders)).toEqual([8, 8, 9, 7, 10, 6, 11]);
  await expect(page.locator('#page-range')).toHaveValue('8');
});

test('real PDF navigation, continuous view, and resizing keep the selected page readable', async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('issues/2018/reader/?page=8');
  await expect(page.locator('#page-range')).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('.pdf-page[data-page="8"] canvas')).toHaveCount(1);
  await jump(page, [20, 10]);
  await expect(page.locator('.pdf-page[data-page="10"] canvas')).toHaveCount(1);
  await expect(page.locator('#page-range')).toHaveValue('10');
  await page.locator('#view-toggle').click();
  await expect(page.locator('#view-toggle')).toBeEnabled();
  await expect(page.locator('#continuous-pages .pdf-page[data-page="10"] canvas')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page
        .locator('#continuous-pages .pdf-page[data-page="10"]')
        .evaluate((node) => node.getBoundingClientRect().width),
    )
    .toBeLessThanOrEqual(390);
  await expect(page.locator('#continuous-pages .pdf-page[data-page="10"] canvas')).toHaveCount(1);
  await jump(page, [16]);
  await expect(page.locator('#continuous-pages .pdf-page[data-page="16"] canvas')).toHaveCount(1);
  await expect(page.locator('#reader-error')).toBeHidden();
  await expect(page.locator('.page-retry')).toHaveCount(0);
  expect(errors).toEqual([]);
});
