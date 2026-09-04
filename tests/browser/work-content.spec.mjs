import { test, expect } from '@playwright/test';

test('artwork comes before writing when a work includes both', async ({ page }) => {
  await page.goto('works/the-light-we-leave/');

  const contentOrder = await page
    .locator('.work-body > .work-art, .work-body > .prose')
    .evaluateAll((elements) =>
      elements.map((element) => (element.classList.contains('work-art') ? 'artwork' : 'writing')),
    );

  expect(contentOrder).toEqual(['artwork', 'writing']);
});

test('audio comes before writing when a work includes both', async ({ page }) => {
  await page.goto('works/anatomy-of-quiet/');

  const contentOrder = await page
    .locator('.work-body > .audio-section, .work-body > .poem')
    .evaluateAll((elements) =>
      elements.map((element) =>
        element.classList.contains('audio-section') ? 'audio' : 'writing',
      ),
    );

  expect(contentOrder).toEqual(['audio', 'writing']);
});
