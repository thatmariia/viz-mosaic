import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderRadialMosaic, renderRingMosaic } from '../src/index.js';

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const pieces = svg => [...svg.matchAll(/<g data-component="([^"]+)"[^>]+>(.*?)<\/g>/g)];
const reach = piece => Number(piece[0].match(/data-radius="([\d.]+)"/)[1]);
const attribute = (text, name) => Number(text.match(new RegExp(`${name}="([^"]+)"`))[1]);

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
  assert.ok(2 * outer * Math.sin(Math.PI / count) - 2 * 80 > 5.99, 'Rounded ends must remain separated.');
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

test('radial facing edges stay parallel with a constant gap for different reaches', () => {
  for (const count of [3, 9, 24, 70]) {
    const rays = pieces(renderRadialMosaic(Array.from({ length: count }, (_, index) => ({ name: `T${index}`, ring: index % 3 + 1 }))));
    const rotate = ([x, y], angle) => [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)];
    const edge = (ray, index, lower) => {
      const points = [...ray[2].matchAll(/[ML] ([\d.-]+) ([\d.-]+)/g)].slice(0, 2).map(match => [Number(match[1]), Number(match[2]) * (lower ? -1 : 1)]);
      return points.map(point => rotate(point, -Math.PI / 2 + index * Math.PI * 2 / count));
    };
    const gaps = [];
    rays.forEach((ray, index) => {
      const [a, b] = edge(ray, index, true), next = (index + 1) % count;
      const [c, d] = edge(rays[next], next, false);
      const u = [b[0] - a[0], b[1] - a[1]], v = [d[0] - c[0], d[1] - c[1]];
      assert.ok(Math.abs(u[0] * v[1] - u[1] * v[0]) / Math.hypot(...u) / Math.hypot(...v) < 0.00001);
      gaps.push(Math.abs(u[0] * (c[1] - a[1]) - u[1] * (c[0] - a[0])) / Math.hypot(...u));
    });
    assert.ok(Math.min(...gaps) > 5.99);
    assert.ok(Math.max(...gaps) - Math.min(...gaps) < 0.001);
    const caps = rays.map(ray => Number(ray[2].match(/ A ([\d.]+) [\d.]+ 0 1 1/)[1]));
    assert.ok(caps[2] > caps[1] && caps[1] > caps[0]);
  }
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
    const image = ray[2].match(/<image[^>]+/)[0];
    assert.ok(Math.abs(attribute(image, 'x') + attribute(image, 'width') / 2 - reach(ray)) < 0.0001);
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
  for (const value of [12, '', ' ', '12345678901234567']) {
    assert.throws(() => renderRadialMosaic([{ name: 'Tool', ring: 1, value }]), /value must be a nonempty string of at most 16 characters/);
  }
  assert.throws(() => renderRadialMosaic([{ name: 'Tool', ring: 1, value: '71%' }], {
    measureText: (text, size, weight) => weight === 600 ? NaN : size,
  }), /positive finite width for the value/);
  assert.throws(() => renderRadialMosaic(input, { centerLogo: 'https://example.org/logo.png' }), /data URL/);
  assert.throws(() => renderRadialMosaic(input, { categoryColors: { a: 'url(#bad)' } }), /solid #rgb/);
});

test('radial logos fill the rounded ends and labels fill the rest, while long labels fit', () => {
  const components = [
    { name: 'Short', ring: 1, logo: png },
    { name: 'Large', ring: 3, logo: png },
    { name: 'Long label', ring: 3, logo: png },
    { name: 'Text only', ring: 4 },
  ];
  const options = { idPrefix: 'test', measureText: name => name === 'Long label' ? 650 : 60 };
  const fixed = renderRadialMosaic(components, options);
  assert.equal(renderRadialMosaic(components, { ...options, scaleRadialLabels: false }), fixed);
  const [short, large, long, textOnly] = pieces(renderRadialMosaic(components, { ...options, scaleRadialLabels: true }));
  const fontSize = ray => Number(ray[2].match(/<text[^>]* font-size="([\d.]+)"/)?.[1] ?? 36);
  const logoWidth = ray => attribute(ray[2].match(/<image[^>]+/)[0], 'width');
  assert.ok(fontSize(short) >= 36);
  assert.ok(logoWidth(short) > 64);
  assert.ok(logoWidth(large) > logoWidth(short));
  assert.ok(fontSize(large) > fontSize(short));
  assert.equal(fontSize(long), fontSize(large)); // same leaf size, same text size
  const longCenter = Number(long[2].match(/translate\(([\d.]+) 0\)/)[1]);
  const longEnd = longCenter + 650 * fontSize(long) / 36 / 2;
  assert.ok(longEnd < reach(long) - logoWidth(long) / 2);
  assert.ok(fontSize(textOnly) > fontSize(large));
  assert.deepEqual([short, large, long, textOnly].map(reach), pieces(fixed).map(reach));
});

test('radial values sit upright across the rounded end and grow with the leaf', () => {
  const components = [
    { name: 'Up', ring: 1, value: '12%', logo: png },
    { name: 'Right', ring: 4, value: '71%' },
    { name: 'Down', ring: 2, value: '40%' },
    { name: 'Left', ring: 3, value: '55%' },
  ];
  const svg = renderRadialMosaic(components, { idPrefix: 'test', keepInputOrder: true, scaleRadialLabels: true });
  assert.doesNotMatch(svg, /<image/);
  const values = [...svg.matchAll(/<text[^>]* font-size="([\d.]+)" font-weight="600"[^>]* transform="translate\([\d.]+ 0\) rotate\((-?\d+)\)">([^<]+)</g)]
    .map(([, size, turn, text]) => ({ size: Number(size), turn: Number(turn), text }));
  assert.deepEqual(values.map(v => v.text), ['12%', '71%', '40%', '55%']);
  // On screen (ray rotation plus the value's turn), values are never upside down.
  const rays = [-90, 0, 90, 180];
  const onScreen = values.map((v, i) => ((rays[i] + v.turn) % 360 + 540) % 360 - 180);
  assert.deepEqual(onScreen, [0, 90, 0, 90]);
  assert.ok(values[1].size > values[3].size && values[3].size > values[2].size && values[2].size >= values[0].size);
});
