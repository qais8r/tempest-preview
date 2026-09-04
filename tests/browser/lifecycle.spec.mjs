import { test, expect } from './transitions.fixture.mjs';

const work = 'works/anatomy-of-quiet/';

test('an older completion cannot clear a newer transition, and rejection restores styles', async ({
  page,
  transitions,
}) => {
  await transitions.visit(work);
  const result = await page.evaluate(async () => {
    const names = () =>
      [...document.querySelectorAll('[style]')]
        .map((element) => element.style.viewTransitionName)
        .filter((name) => /^(work|author)-/.test(name))
        .sort();
    const swap = (path) => {
      let resolve, reject;
      const finished = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      });
      const event = new Event('pageswap');
      Object.defineProperties(event, {
        viewTransition: { value: { finished, skipTransition() {} } },
        activation: {
          value: { entry: { url: new URL(path, location.href).href }, navigationType: 'push' },
        },
      });
      window.dispatchEvent(event);
      return { resolve, reject };
    };
    const first = swap('../../authors/alex-morgan/');
    const initial = names();
    const second = swap('../../issues/2026/');
    first.resolve();
    await Promise.resolve();
    const afterOldCompletion = names();
    second.reject(new Error('Interrupted'));
    await Promise.resolve();
    return {
      initial,
      afterOldCompletion,
      final: names(),
      root: document.documentElement.style.viewTransitionName,
    };
  });
  expect(result).toEqual({
    initial: ['author-name'],
    afterOldCompletion: ['work-author', 'work-title'],
    final: [],
    root: '',
  });
});

test('malformed, expired and skipped handoffs are consumed without leaving transition names', async ({
  page,
  transitions,
}) => {
  await transitions.visit('authors/alex-morgan/');
  const results = await page.evaluate(() => {
    Object.defineProperty(window, 'navigation', { value: undefined });
    const key = 'tempest-transitions:/tempest-web/:pending';
    const plan = {
      version: 1,
      kind: 'author',
      slug: 'alex-morgan',
      parts: ['portrait', 'name'],
      created: Date.now(),
      from: { url: new URL('../', location.href).href, key: null, context: 'card', index: 0 },
      to: { url: location.href, key: null, context: 'profile', index: 0 },
    };
    return [
      ['{broken', true],
      [JSON.stringify({ ...plan, parts: 'portrait name' }), true],
      [JSON.stringify({ ...plan, parts: ['name', 'name'] }), true],
      [JSON.stringify({ ...plan, created: Date.now() - 60000 }), true],
      [JSON.stringify(plan), false],
    ].map(([stored, animated]) => {
      sessionStorage.setItem(key, stored);
      const event = new Event('pagereveal');
      Object.defineProperty(event, 'viewTransition', {
        value: animated
          ? { ready: new Promise(() => {}), finished: new Promise(() => {}), skipTransition() {} }
          : null,
      });
      window.dispatchEvent(event);
      return {
        stored: sessionStorage.getItem(key),
        root: document.documentElement.style.viewTransitionName,
        named: document.querySelectorAll('[style*="author-name"], [style*="author-portrait"]')
          .length,
      };
    });
  });
  expect(results).toEqual(Array.from({ length: 5 }, () => ({ stored: null, root: '', named: 0 })));
});

test('history preserves the selected card even after reloading the work document', async ({
  page,
  transitions,
}) => {
  await transitions.visit('issues/2026/');
  await transitions.navigate(() => page.locator(`.issue-works a[href$="/${work}"]`).click(), work);
  await transitions.reload();
  const result = await transitions.navigate(() => page.goBack(), 'issues/2026/');
  expect(
    result.incoming.named
      .filter((element) => element.name.startsWith('work-'))
      .map((element) => element.section),
  ).toEqual(['companion', 'companion']);
});

test('mobile navigation pairs work cards and author links', async ({ page, transitions }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await transitions.visit('issues/2026/');
  const result = await transitions.navigate(
    () => page.locator(`.issue-works a[href$="/${work}"]`).click(),
    work,
  );
  expect(result.incoming.named.map((element) => element.name).sort()).toEqual([
    'work-author',
    'work-title',
  ]);
  await transitions.navigate(() => page.locator('.author-teaser').click(), 'authors/alex-morgan/');
});
