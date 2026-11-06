import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as mosaics from '../src/index.js';

const dataURL = svg => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
const source = '<?xml version="1.0"?>\n<!-- Café & ecosystem -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><path fill="#123456" d="M0 0H200V100H0Z"/></svg>';

test('every view embeds a vector center image at the available size without recoloring or rasterizing it', () => {
  const centerLogo = dataURL(source);
  for (const render of Object.values(mosaics)) {
    const svg = render([{ name: 'Tool', ring: 2 }], { centerLogo, monochromeLogos: true });
    const image = svg.match(/<image[^>]+href="data:image\/svg\+xml;base64,[^"]+"[^>]*\/>/)[0];
    assert.ok(image.includes(centerLogo));
    assert.ok(Number(image.match(/width="([^"]+)"/)[1]) > 0);
    assert.doesNotMatch(image, /filter=|transform=/);
    assert.equal(Buffer.from(image.match(/base64,([^"]+)/)[1], 'base64').toString(), source);
    assert.match(render([], { centerLogo }), /data:image\/svg\+xml;base64,/);
  }
});

test('center SVGs share data URL validation and component images retain their raster contract', () => {
  for (const render of Object.values(mosaics)) {
    for (const centerLogo of ['https://example.org/logo.svg', dataURL('<html/>'), dataURL('not svg'), 'data:image/svg+xml;base64,!!!']) {
      assert.throws(() => render([], { centerLogo }), /centerLogo/);
    }
    assert.throws(() => render([{ name: 'Tool', ring: 1, logo: dataURL(source) }]), /Component 1 logo/);
  }
});
