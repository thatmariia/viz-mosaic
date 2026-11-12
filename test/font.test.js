import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as mosaics from '../src/index.js';

test('each renderer embeds the chosen font for component and legend text', () => {
  const fontFamily = 'Crimson Pro';
  const bytes = readFileSync(new URL('../demo/assets/fonts/crimsonpro.woff2', import.meta.url));
  const fontSource = `data:font/woff2;base64,${bytes.toString('base64')}`;
  for (const render of Object.values(mosaics)) {
    const labelsMeasured = new Set();
    const svg = render([{ name: 'Tool', ring: 1, categoryId: 'Tools' }], {
      fontFamily, fontSource, legend: true,
      measureText: (text, size) => { labelsMeasured.add(text); return text.length * size * 0.5; },
    });
    assert.match(svg, /font-family="'Crimson Pro', Arial, Helvetica, sans-serif"/);
    assert.ok(svg.includes(`src:url('${fontSource}')`));
    assert.deepEqual(labelsMeasured, new Set(['Tool', 'Tools']));
  }
});

test('embedded fonts require a valid family and a WOFF2 data URL', () => {
  assert.throws(() => mosaics.renderRingMosaic([], { fontFamily: "Bad' } </style>" }), /fontFamily/);
  assert.throws(() => mosaics.renderRingMosaic([], { fontFamily: 'Inter', fontSource: 'https://example.org/font.woff2' }), /fontSource/);
});
