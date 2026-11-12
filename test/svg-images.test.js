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

test('component SVGs are embedded and can be hidden while retaining the center and labels', () => {
  const logo = dataURL(source);
  const centerLogo = dataURL(source.replace('#123456', '#987654'));
  const component = Object.freeze({ name: 'Tool', ring: 1, logo });
  const options = { centerLogo, monochromeLogos: true, idPrefix: 'test' };
  for (const render of Object.values(mosaics)) {
    const svg = render([component], options);
    const image = [...svg.matchAll(/<image[^>]+\/>/g)].find(([tag]) => tag.includes(logo))[0];
    assert.match(image, /transform="rotate/);
    assert.match(image, /filter="url\(#test-logo-/);
    const textOnly = render([component], { ...options, showComponentLogos: false });
    assert.equal(textOnly, render([{ name: 'Tool', ring: 1 }], options));
    assert.doesNotMatch(textOnly, /test-logo-/);
    assert.ok(textOnly.includes(centerLogo));
    assert.ok(!textOnly.includes(logo));
    assert.match(textOnly, />Tool<\//);
  }
});

test('center and component SVGs share data URL validation', () => {
  for (const render of Object.values(mosaics)) {
    for (const logo of ['https://example.org/logo.svg', dataURL('<html/>'), dataURL('not svg'), 'data:image/svg+xml;base64,!!!']) {
      assert.throws(() => render([], { centerLogo: logo }), /centerLogo/);
      assert.throws(() => render([{ name: 'Tool', ring: 1, logo }]), /Component 1 logo/);
    }
    assert.throws(() => render([], { showComponentLogos: 'yes' }), /showComponentLogos must be a boolean/);
  }
});
