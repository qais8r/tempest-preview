import { test as base, expect } from '@playwright/test';

const prefix = 'tempest-transition-test:';

export const test = base.extend({
  transitions: async ({ page }, use) => {
    const events = [];
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.text().startsWith(prefix))
        events.push(JSON.parse(message.text().slice(prefix.length)));
    });
    await page.addInitScript((prefix) => {
      const add = window.addEventListener;
      // Observe the real lifecycle immediately after the site's handlers execute.
      window.addEventListener = function (type, listener, options) {
        if (!['pageswap', 'pagereveal'].includes(type))
          return add.call(this, type, listener, options);
        return add.call(
          this,
          type,
          function (event) {
            listener.call(this, event);
            const report = (phase, extra = {}) =>
              console.debug(
                prefix +
                  JSON.stringify({
                    phase,
                    path: location.pathname,
                    ...extra,
                  }),
              );
            const named = [...document.querySelectorAll('[style]')]
              .filter(
                (element) =>
                  element.style.viewTransitionName && element.style.viewTransitionName !== 'none',
              )
              .map((element) => ({
                name: element.style.viewTransitionName,
                context: element.style.viewTransitionName.startsWith('work-')
                  ? element.dataset.workTransitionContext
                  : element.dataset.authorTransitionContext,
                section: element.closest('.issue-works')
                  ? 'companion'
                  : element.closest('.featured-works')
                    ? 'featured'
                    : null,
              }));
            report(type, {
              transition: !!event.viewTransition,
              named,
              root: document.documentElement.style.viewTransitionName,
            });
            if (type === 'pagereveal' && event.viewTransition) {
              event.viewTransition.ready.then(
                () => report('ready'),
                (error) => report('skipped', { error: error.name }),
              );
              event.viewTransition.finished.then(() => report('finished'));
            }
          },
          options,
        );
      };
    }, prefix);
    await use({
      events,
      async visit(path) {
        const start = events.length;
        await page.goto(path);
        await expect
          .poll(() => events.slice(start).some((event) => event.phase === 'pagereveal'))
          .toBe(true);
      },
      async reload() {
        const start = events.length;
        await page.reload();
        // load can precede pagereveal, particularly in WebKit.
        await expect
          .poll(() => events.slice(start).some((event) => event.phase === 'pagereveal'))
          .toBe(true);
      },
      async navigate(action, path, { animated = true } = {}) {
        const start = events.length;
        const destination = `/tempest-web/${path}`;
        await action();
        await expect(page).toHaveURL(
          new RegExp(`/tempest-web/${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
        );
        await expect
          .poll(() =>
            events
              .slice(start)
              .some((event) => event.phase === 'pagereveal' && event.path === destination),
          )
          .toBe(true);
        const current = events.slice(start);
        const incoming = current.find(
          (event) => event.phase === 'pagereveal' && event.path === destination,
        );
        const outgoing = current.find((event) => event.phase === 'pageswap');
        expect(incoming.transition).toBe(animated);
        if (animated) {
          await expect
            .poll(() =>
              events.slice(start).some((event) => ['ready', 'skipped'].includes(event.phase)),
            )
            .toBe(true);
          expect(events.slice(start).find((event) => event.phase === 'skipped')).toBeUndefined();
          await expect
            .poll(() => events.slice(start).some((event) => event.phase === 'finished'))
            .toBe(true);
          await expect(page.locator('html')).not.toHaveAttribute(
            'style',
            /view-transition-name: none/,
          );
          expect(
            await page
              .locator('[style*="view-transition-name"]')
              .evaluateAll(
                (elements) =>
                  elements.filter((element) =>
                    /^(work|author)-/.test(element.style.viewTransitionName),
                  ).length,
              ),
          ).toBe(0);
        }
        return { incoming, outgoing };
      },
    });
    expect(errors).toEqual([]);
  },
});
export { expect };
