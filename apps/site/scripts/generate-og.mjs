// Regenerates the social share preview image (public/og.png) from og-image.svg.
//
// The PNG is committed, so you only need to run this after editing og-image.svg:
//   pnpm --filter @affect-kit/site dlx sharp-cli  # not required — see below
//   node apps/site/scripts/generate-og.mjs
//
// Requires `sharp` to be resolvable. It is not a site dependency (the PNG is a
// build-time-static asset), so install it transiently if needed:
//   npm i -D sharp && node apps/site/scripts/generate-og.mjs
//
// Output: 1200×630 PNG, supersampled 2× for crisp text/edges.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const svg = join(here, 'og-image.svg');
const out = join(here, '..', 'public', 'og.png');

await sharp(svg, { density: 144 })
  .resize(1200, 630)
  .png()
  .toFile(out);

console.log(`Wrote ${out}`);
