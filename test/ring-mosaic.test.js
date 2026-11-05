import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderRingMosaic } from '../src/index.js';

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const radius = svg => Number(svg.match(/data-radius="([\d.]+)"/)[1]);

test('ring indices remain distances, including when only ring 4 is occupied', () => {
  const svg = renderRingMosaic([1, 2, 4].map(ring => ({ name: `Ring ${ring}`, ring })));
  assert.deepEqual([...svg.matchAll(/data-ring="(\d+)"/g)].map(match => Number(match[1])), [1, 2, 4]);
  assert.deepEqual([...svg.matchAll(/data-radius="([\d.]+)"/g)].map(match => Number(match[1])), [88, 152, 280]);
  assert.equal(radius(renderRingMosaic([{ name: 'Outer', ring: 4 }])), 280);
  assert.match(svg, /<circle r="280"/);
});

test('groups rings in distance order and preserves component order inside each ring', () => {
  const svg = renderRingMosaic([
    { name: 'First', ring: 2 }, { name: 'Inner', ring: 1 }, { name: 'Second', ring: 2 },
  ]);
  assert.deepEqual([...svg.matchAll(/data-component="([^"]+)"/g)].map(match => match[1]), ['Inner', 'First', 'Second']);
  assert.equal((svg.match(/clipPath id=/g) || []).length, 2);
  assert.equal((svg.match(/filter="url\(#/g) || []).length, 2);
});

test('dense rings grow without changing ring numbers and extreme density explains the limit', () => {
  const components = Array.from({ length: 35 }, (_, i) => ({ name: `Component ${i}`, ring: 1 }));
  const svg = renderRingMosaic(components);
  assert.ok(radius(svg) > 88);
  assert.equal((svg.match(/<textPath /g) || []).length, 35);
  assert.throws(() => renderRingMosaic([{ name: 'Long '.repeat(3000), ring: 1 }]), /Ring 1 cannot fit.*capacity/);
});

test('rejects invalid rings with the entry and valid range', () => {
  for (const ring of [0, -1, 1.2, '', '2', NaN, Infinity, 33, undefined]) {
    assert.throws(() => renderRingMosaic([{ name: 'Bad', ring }]), /Component 1 \(Bad\).*integer from 1 to 32/);
  }
});

test('rejects missing and blank names without coercing input', () => {
  for (const component of [null, {}, { name: '   ', ring: 1 }, { name: 23, ring: 1 }]) {
    assert.throws(() => renderRingMosaic([component]), /Component 1: name/);
  }
  assert.throws(() => renderRingMosaic({}), /components must be an array/);
});

test('preserves Unicode, punctuation, whitespace and escapes XML text and attributes', () => {
  const name = '  Héllo & <世界> "RNA" 🧬\'  ';
  const svg = renderRingMosaic([{ name, ring: 1, categoryId: '"<cat>&' }], { title: 'A & B' });
  assert.match(svg, /Héllo &amp; &lt;世界&gt; &quot;RNA&quot; 🧬&apos;/);
  assert.match(svg, /data-category-id="&quot;&lt;cat&gt;&amp;"/);
  assert.match(svg, />A &amp; B<\/title>/);
  assert.match(svg, /xml:space="preserve"/);
});

test('category overrides and defaults are shared across rings and handle numeric IDs', () => {
  const svg = renderRingMosaic([
    { name: 'A', ring: 1, categoryId: 0 }, { name: 'B', ring: 2, categoryId: '0' },
    { name: 'C', ring: 3, categoryId: 'unmapped' }, { name: 'D', ring: 4, categoryId: 'unmapped' },
  ], { categoryColors: { 0: '#abc' } });
  assert.equal((svg.match(/stroke="#abc"/g) || []).length, 2);
  const fills = [...svg.matchAll(/<circle r="[\d.]+" fill="none" stroke="([^"]+)"/g)].map(match => match[1]);
  assert.equal(fills[2], fills[3]);
  assert.throws(() => renderRingMosaic([], { categoryColors: { unsafe: 'url(https://example.org)' } }), /solid #rgb or #rrggbb/);
  assert.throws(() => renderRingMosaic([{ name: 'A', ring: 1, categoryId: {} }]), /categoryId/);
});

test('all local references resolve and automatically generated IDs never overlap', () => {
  const input = [{ name: 'One', ring: 1 }, { name: 'Two', ring: 1 }];
  const svgs = [renderRingMosaic(input), renderRingMosaic(input)];
  const ids = svgs.map(svg => [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  assert.equal(new Set(ids.flat()).size, ids.flat().length);
  for (const [index, svg] of svgs.entries()) {
    const references = [...svg.matchAll(/(?:href="#|url\(#|aria-labelledby=")([^"\)]+)/g)].map(match => match[1]);
    assert.ok(references.every(reference => ids[index].includes(reference)));
  }
  assert.equal(renderRingMosaic(input, { idPrefix: 'stable' }), renderRingMosaic(input, { idPrefix: 'stable' }));
  assert.throws(() => renderRingMosaic(input, { idPrefix: 'bad prefix' }), /idPrefix/);
});

test('both logos are embedded without network resources', () => {
  const svg = renderRingMosaic([{ name: 'Logo', ring: 1, logo: png }], { centerLogo: png });
  assert.equal((svg.match(/<image href="data:image\/png;base64,/g) || []).length, 2);
  assert.match(svg, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.doesNotMatch(svg, /<image[^>]+transform=/);
  for (const logo of ['https://example.org/logo.png', 'data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,YmFk', png.slice(0, -1)]) {
    assert.throws(() => renderRingMosaic([{ name: 'Logo', ring: 1, logo }]), /Component 1 logo/);
  }
});

test('measurement callback receives font size, changes layout and must return usable widths', () => {
  const input = [{ name: 'Measured', ring: 1 }];
  const svg = renderRingMosaic(input, { measureText: (name, size) => {
    assert.equal(name, 'Measured');
    assert.equal(size, 16);
    return 1000;
  } });
  assert.ok(radius(svg) > 88);
  for (const value of [0, -10, NaN, Infinity, '100']) {
    assert.throws(() => renderRingMosaic(input, { measureText: () => value }), /positive finite width/);
  }
});

test('empty mosaics are accessible standalone SVGs and rendering does not mutate inputs', () => {
  const empty = renderRingMosaic([]);
  assert.match(empty, /viewBox="-86 -86 172 172"/);
  assert.match(empty, /<title[^>]*>Ring mosaic<\/title>/);
  assert.doesNotMatch(empty, /data-ring=/);
  const components = Object.freeze([Object.freeze({ name: 'Frozen', ring: 1 })]);
  const options = Object.freeze({ categoryColors: Object.freeze({}) });
  assert.doesNotThrow(() => renderRingMosaic(components, options));
});
