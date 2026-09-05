import { writeFile } from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';

export const coverWidths = [320, 640, 1050];
export const thumbnailWidths = [128, 256, 384];

// Keep originals intact. Only generated display copies are resized or cropped.
export async function imageVariants(image, prefix, widths, square = false) {
  const sourceWidth = square ? Math.min(image.width, image.height) : image.width;
  const sourceHeight = square ? sourceWidth : image.height;
  const variants = [];
  for (const width of [...new Set(widths.map((w) => Math.min(w, sourceWidth)))]) {
    const height = Math.max(1, Math.round((width * sourceHeight) / sourceWidth));
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      (image.width - sourceWidth) / 2,
      (image.height - sourceHeight) / 2,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height,
    );
    const file = `${prefix}-${width}.webp`;
    await writeFile(file, await canvas.encode('webp', 85));
    variants.push({ file, width, height });
  }
  return variants;
}
