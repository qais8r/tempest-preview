import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { contentFixture } from './helpers/content-fixture.mjs';

const run = promisify(execFile);

test('production builds responsive portraits without publishing portrait-only originals', async (t) => {
  const content = await contentFixture(t, {
    authors: [
      {
        slug: 'writer',
        name: 'Writer',
        portrait: '/media/images/writer.jpg',
        status: 'published',
      },
      { slug: 'secret-writer', name: 'Private name', status: 'draft' },
    ],
  });
  const output = await mkdtemp(path.join(tmpdir(), 'tempest-portrait-build-'));
  t.after(() => rm(output, { recursive: true, force: true }));

  await mkdir(path.join(content, 'media/images'), { recursive: true });
  await mkdir(path.join(content, 'media/pdfs'), { recursive: true });
  await mkdir(path.join(content, 'media/audio'), { recursive: true });
  const portrait = createCanvas(800, 1000);
  portrait.getContext('2d').fillRect(0, 0, portrait.width, portrait.height);
  await writeFile(path.join(content, 'media/images/writer.jpg'), portrait.toBuffer('image/jpeg'));
  await copyFile('content/media/pdfs/2026.pdf', path.join(content, 'media/pdfs/2026.pdf'));
  await copyFile(
    'content/media/audio/sample-reading.mp3',
    path.join(content, 'media/audio/public.mp3'),
  );
  await symlink(path.resolve('node_modules'), path.join(output, 'node_modules'), 'dir');

  await run(process.execPath, [path.resolve('scripts/prepare.mjs')], {
    cwd: output,
    env: { ...process.env, CONTENT_DIR: content },
  });

  const generated = JSON.parse(
    await readFile(path.join(output, 'src/generated/content.json'), 'utf8'),
  );
  const sources = generated.authors[0].portraitSources;
  assert.deepEqual(
    sources.map(({ width }) => width),
    [128, 256, 384, 512, 768, 800],
  );
  for (const source of sources) {
    assert.match(source.src, /^\/media\/portraits\/[a-f0-9]{16}-\d+\.webp$/);
    await access(path.join(output, 'public', source.src));
  }
  await assert.rejects(access(path.join(output, 'public/media/images/writer.jpg')), {
    code: 'ENOENT',
  });
});

for (const file of [
  'src/pages/authors/index.astro',
  'src/pages/authors/[slug].astro',
  'src/pages/works/[slug].astro',
]) {
  test(`${file} uses generated portrait sources`, async () => {
    const source = await readFile(file, 'utf8');
    assert.match(source, /srcset=\{imageSrcset\(author\.portraitSources\)\}/);
  });
}
