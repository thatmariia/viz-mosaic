import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderRadialMosaic, renderRingMosaic } from '../src/index.js';

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const pieces = svg => [...svg.matchAll(/<g data-component="([^"]+)"[^>]+>(.*?)<\/g>/g)];
const reach = piece => Number(piece[0].match(/data-radius="([\d.]+)"/)[1]);

test('radial mosaic keeps global input order and uses distance indices for outward reach', () => {
  const components = Object.freeze([4, 1, 2].map((ring, index) => Object.freeze({ name: `Tool ${index}`, ring })));
  const svg = renderRadialMosaic(components, { measureText: () => 50 });
  const rays = pieces(svg);
  assert.deepEqual(rays.map(ray => ray[1]), ['Tool 0', 'Tool 1', 'Tool 2']);
  assert.equal(reach(rays[0]) - reach(rays[1]), 3 * 84);
  assert.equal(reach(rays[2]) - reach(rays[1]), 84);
  const single = pieces(renderRadialMosaic([{ name: 'Only', ring: 4 }], { measureText: () => 50 }));
  const nearest = pieces(renderRadialMosaic([{ name: 'Only', ring: 1 }], { measureText: () => 50 }));
  assert.equal(reach(single[0]) - reach(nearest[0]), 3 * 84);
  assert.match(svg, /rotate\(-90\)/);
  assert.match(svg, /rotate\(150\)/);
  assert.doesNotMatch(svg, /<circle|fill-opacity|<textPath|stroke=|<mask|NaN|Infinity|undefined/);
});

test('radial rays grow for density and labels while retaining transparent space and round ends', () => {
  const count = 70;
  const svg = renderRadialMosaic(Array.from({ length: count }, (_, index) => ({ name: `Tool ${index}`, ring: 1 })));
  const rays = pieces(svg);
  const outer = reach(rays[0]);
  assert.equal(rays.length, count);
  assert.ok(2 * outer * Math.sin(Math.PI / count) > 2 * 80 + 6, 'Rounded ends must remain separated.');
  assert.match(rays[0][2], / A 80 80 0 1 1 /);
  assert.match(rays[0][2], / A 4 4 0 0 1 /);
  const roomy = renderRadialMosaic(Array.from({ length: 9 }, (_, index) => ({ name: `Tool ${index}`, ring: 1 })));
  assert.match(roomy, / A 16 16 0 0 1 /);
  const long = pieces(renderRadialMosaic([{ name: 'Long name', ring: 1 }], { measureText: () => 500 }));
  const short = pieces(renderRadialMosaic([{ name: 'Long name', ring: 1 }], { measureText: () => 50 }));
  assert.ok(reach(long[0]) > reach(short[0]));
  assert.throws(() => renderRadialMosaic([{ name: 'Long', ring: 1 }], { measureText: () => 10000 }), /capacity.*Shorten names/);
  assert.throws(() => renderRadialMosaic(Array.from({ length: 300 }, () => ({ name: 'A', ring: 1 }))), /capacity/);
});

test('radial logos face with readable labels and the upright center fits the open space', () => {
  const measuredSizes = [];
  const svg = renderRadialMosaic(Array.from({ length: 4 }, (_, index) => ({ name: `Tool ${index}`, ring: 1, logo: png, categoryId: 0 })), {
    centerLogo: png, monochromeLogos: true, categoryColors: { 0: '#abc' }, idPrefix: 'radial-test',
    measureText: (name, size) => { measuredSizes.push(size); return name.length * size * 0.6; },
  });
  const fontSize = Number(svg.match(/font-size="([\d.]+)"/)[1]);
  assert.ok(fontSize >= 32);
  assert.deepEqual(measuredSizes, Array(4).fill(fontSize));
  const rays = pieces(svg);
  for (const ray of rays) {
    assert.match(ray[2], /fill="#abc"/);
    assert.match(ray[2], /fill="#182323"/);
    assert.ok(Number(ray[2].match(/<image[^>]+width="([\d.]+)"/)[1]) >= 56);
    const flip = ray[2].match(/<text[^>]*rotate\((\d+)\)/)[1];
    assert.match(ray[2], new RegExp(`<image[^>]*rotate\\(${flip} `));
  }
  assert.match(rays[3][2], /rotate\(180\)/);
  assert.equal((svg.match(/<filter /g) || []).length, 1);
  const center = svg.match(/<image[^>]+preserveAspectRatio="xMidYMid meet"\/><\/svg>$/)[0];
  const size = Number(center.match(/width="([\d.]+)"/)[1]);
  assert.ok(size > 140 && size / Math.SQRT2 < 112 - 11.99);
  assert.doesNotMatch(center, /transform=|filter=/);
  for (const [, id] of svg.matchAll(/url\(#([^)]+)\)/g)) assert.ok(svg.includes(`id="${id}"`));
  const automatic = pieces(renderRadialMosaic(Array.from({ length: 9 }, (_, index) => ({ name: `Tool ${index}`, ring: 1 }))));
  const colors = automatic.map(ray => ray[2].match(/<path[^>]+fill="([^"]+)"/)[1]);
  colors.forEach((color, index) => assert.notEqual(color, colors[(index + 1) % colors.length]));
});

test('radial mosaic shares validation, escapes names, and scopes accessible SVGs', () => {
  const input = [{ name: 'Héllo & <世界>', ring: 1, categoryId: '"unsafe' }];
  const svg = renderRadialMosaic(input);
  assert.match(svg, />Radial mosaic<\/title>/);
  assert.match(svg, /Héllo &amp; &lt;世界&gt;/);
  assert.match(svg, /data-category-id="&quot;unsafe"/);
  const ids = [svg, renderRingMosaic(input)].flatMap(value => [...value.matchAll(/ id="([^"]+)"/g)].map(match => match[1]));
  assert.equal(ids.length, new Set(ids).size);
  assert.match(renderRadialMosaic([], { centerLogo: png }), /viewBox="-86 -86 172 172"/);
  assert.throws(() => renderRadialMosaic([{ name: 'Bad', ring: 0 }]), /Component 1.*ring/);
  assert.throws(() => renderRadialMosaic([{ name: ' ', ring: 1 }]), /name/);
  assert.throws(() => renderRadialMosaic(input, { centerLogo: 'https://example.org/logo.png' }), /data URL/);
  assert.throws(() => renderRadialMosaic(input, { categoryColors: { a: 'url(#bad)' } }), /solid #rgb/);
});
