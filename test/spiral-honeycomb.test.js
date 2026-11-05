import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSpiralMosaic, renderHoneycombMosaic } from '../src/index.js';

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const bodies = svg => [...svg.matchAll(/<g data-component="([^"]+)"([^>]*)><path d="([^"]+)" fill="([^"]+)"/g)];
const attribute = (text, name) => Number(text.match(new RegExp(`${name}="([^"]+)"`))[1]);

test('spiral orders levels by distance, preserves skipped half-turns, and overlaps only connected ends', () => {
  const svg = renderSpiralMosaic([
    { name: 'Second level', ring: 2 }, { name: 'First', ring: 1 },
    { name: 'Second', ring: 1 }, { name: 'Fourth level', ring: 4 },
  ]);
  const pieces = bodies(svg);
  assert.deepEqual(pieces.map(piece => piece[1]), ['First', 'Second', 'Second level', 'Fourth level']);
  assert.ok(Math.abs(attribute(pieces[2][2], 'data-start') - Math.PI) < 0.0001);
  assert.ok(Math.abs(attribute(pieces[3][2], 'data-start') - Math.PI * 3) < 0.0001);
  assert.equal((svg.match(/data-spiral-join=/g) || []).length, 2);
  assert.match(svg, /feDropShadow.*stdDeviation="4.5".*flood-opacity="0.32"/);
  assert.match(svg, /<circle[^>]+r="32"/);
  assert.match(svg, /clip-path="url\(#[^)]+-join\)"/);
  assert.doesNotMatch(svg, /stroke=|NaN|Infinity|undefined/);
});

test('spiral labels and logos follow their curves, and dense input grows within a bounded capacity', () => {
  const components = Array.from({ length: 18 }, (_, index) => ({ name: `Tool ${index}`, ring: 1, logo: png }));
  const svg = renderSpiralMosaic(components, { centerLogo: png, monochromeLogos: true });
  assert.equal((svg.match(/data-spiral-join=/g) || []).length, 17);
  assert.equal((svg.match(/<textPath /g) || []).length, 18);
  assert.equal((svg.match(/<image /g) || []).length, 19);
  const logos = [...svg.matchAll(/<image[^>]+transform="rotate\(([^)]+)\)"/g)];
  assert.equal(logos.length, 18);
  assert.ok(new Set(logos.map(match => match[1].split(' ')[0])).size > 10);
  const viewWidth = value => Number(value.match(/viewBox="([^"]+)"/)[1].split(' ')[2]);
  assert.ok(viewWidth(svg) > viewWidth(renderSpiralMosaic(components.slice(0, 1))) * 2);
  assert.throws(() => renderSpiralMosaic([{ name: 'Long', ring: 1 }], { measureText: () => 100000 }), /Spiral level 1.*capacity/);
});

test('honeycomb tiles have unique lattice positions, real gaps, and contrasting physical neighbors', () => {
  const svg = renderHoneycombMosaic(Array.from({ length: 35 }, (_, index) => ({ name: `T${index}`, ring: 1 })));
  const tiles = bodies(svg);
  assert.equal(tiles.length, 35);
  const byCell = new Map(tiles.map(tile => [`${attribute(tile[2], 'data-q')},${attribute(tile[2], 'data-r')}`, tile]));
  assert.equal(byCell.size, 35);
  assert.equal(byCell.has('0,0'), false);
  assert.doesNotMatch(svg, /stroke=|<mask|<circle|NaN|Infinity|undefined/);
  let neighbors = 0;
  for (const tile of tiles) {
    const q = attribute(tile[2], 'data-q'), r = attribute(tile[2], 'data-r');
    for (const [dq, dr] of [[1, 0], [0, 1], [-1, 1]]) {
      const other = byCell.get(`${q + dq},${r + dr}`);
      if (!other) continue;
      neighbors++;
      assert.notEqual(tile[4], other[4]);
      const center = item => item[2].match(/translate\(([\d.-]+) ([\d.-]+)\)/).slice(1).map(Number);
      const a = center(tile), b = center(other);
      const radius = -Number(tile[3].match(/ Q ([\d.-]+),([\d.-]+)/)[2]);
      assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) - radius * Math.sqrt(3) > 5.99);
    }
  }
  assert.ok(neighbors > 40);
});

test('honeycomb packs lower levels first without reserving empty slots for skipped indices', () => {
  const svg = renderHoneycombMosaic([
    { name: 'Fourth', ring: 4 }, { name: 'First', ring: 1 }, { name: 'Second', ring: 2 },
  ]);
  const tiles = bodies(svg);
  assert.deepEqual(tiles.map(tile => tile[1]), ['First', 'Second', 'Fourth']);
  assert.deepEqual(tiles.map(tile => attribute(tile[2], 'data-ring')), [1, 2, 4]);
  assert.ok(tiles.every(tile => attribute(tile[2], 'data-shell') === 1));
});

test('new views share validation, category colors, portable images, scoped IDs, and immutable inputs', () => {
  const components = Object.freeze([
    Object.freeze({ name: 'Héllo & <世界>', ring: 1, categoryId: 0, logo: png }),
    Object.freeze({ name: 'Outer', ring: 4, categoryId: '0', logo: png }),
  ]);
  const svgs = [];
  for (const render of [renderSpiralMosaic, renderHoneycombMosaic]) {
    const svg = render(components, { centerLogo: png, monochromeLogos: true, categoryColors: { 0: '#abc' } });
    svgs.push(svg);
    assert.match(svg, /Héllo &amp; &lt;世界&gt;/);
    assert.equal(bodies(svg).filter(piece => piece[4] === '#abc').length, 2);
    assert.equal((svg.match(/<image /g) || []).length, 3);
    assert.equal((svg.match(/<filter [^>]+-logo-/g) || []).length, 1);
    for (const [, id] of svg.matchAll(/(?:url\(#|href="#)([\w.-]+)/g)) assert.ok(svg.includes(`id="${id}"`));
    assert.match(render([]), /viewBox="-86 -86 172 172"/);
    assert.throws(() => render([{ name: 'Bad', ring: 0 }]), /Component 1.*ring/);
    assert.throws(() => render([{ name: ' ', ring: 1 }]), /name/);
    assert.throws(() => render(components, { centerLogo: 'https://example.org/logo.png' }), /data URL/);
  }
  const ids = svgs.flatMap(svg => [...svg.matchAll(/ id="([^"]+)"/g)].map(match => match[1]));
  assert.equal(new Set(ids).size, ids.length);
  assert.match(svgs[0], />Spiral mosaic<\/title>/);
  assert.match(svgs[1], />Honeycomb mosaic<\/title>/);
  assert.throws(() => renderHoneycombMosaic([{ name: 'Long', ring: 1 }], { measureText: () => 100000 }), /Honeycomb.*capacity/);
});
