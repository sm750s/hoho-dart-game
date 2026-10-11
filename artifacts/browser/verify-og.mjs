import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const buildDir = process.argv[2] ?? 'dist';
const expectedUrl = process.argv[3] ?? 'http://localhost:6173/';
const getMeta = (html, property) => html.match(new RegExp(`<meta (?:property|name)="${property}" content="([^"]+)"`))?.[1];
function verify(html, expected) {
  assert.equal(getMeta(html, 'og:title'), '호호가족의 다트 게임');
  assert.equal(getMeta(html, 'og:type'), 'website');
  assert.equal(getMeta(html, 'og:locale'), 'ko_KR');
  assert.equal(getMeta(html, 'og:url'), expected);
  assert.equal(getMeta(html, 'og:image'), new URL('og-cover.png', expected).href);
  assert.equal(getMeta(html, 'twitter:image'), getMeta(html, 'og:image'));
  assert.equal(getMeta(html, 'twitter:card'), 'summary_large_image');
  assert.equal(getMeta(html, 'og:image:width'), '1200');
  assert.equal(getMeta(html, 'og:image:height'), '630');
  assert.ok(getMeta(html, 'og:description'));
  assert.ok(getMeta(html, 'og:image:alt'));
  assert.ok(!html.includes('__SITE_URL__') && !html.includes('__OG_IMAGE_URL__'));
}
const built = await fs.readFile(`${buildDir}/index.html`, 'utf8');
verify(built, expectedUrl);
const png = await fs.readFile(`${buildDir}/og-cover.png`);
assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
console.log('PASS built HTML metadata, absolute URLs and 1200x630 PNG');
const response = await fetch('http://localhost:6173/');
assert.equal(response.status, 200);
const html = await response.text();
verify(html, getMeta(html, 'og:url'));
const image = await fetch(getMeta(html, 'og:image'));
assert.equal(image.status, 200);
assert.match(image.headers.get('content-type'), /image\/png/);
assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
console.log('PASS server HTML exposes OG without JavaScript; image HTTP 200');
