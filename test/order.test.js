import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as mosaics from '../src/index.js';

const pieces = svg => [...svg.matchAll(/<g data-component="([^"]+)"([^>]*)><path[^>]+fill="([^"]+)"/g)];
const contacts = colors => colors.reduce((sum, color, i) => sum + (color === colors[(i + 1) % colors.length] ? 1 : 0), 0);

test('all layouts separate repeated colors by moving whole components within their level', () => {
  const components = Object.freeze(['A', 'A', 'B', 'B', 'C', 'C'].map((categoryId, i) => Object.freeze({ name: `Tool ${i}`, ring: 1, categoryId })));
  for (const render of Object.values(mosaics)) {
    const options = { idPrefix: 'ordered', measureText: () => 80 };
    const svg = render(components, options), actual = pieces(svg);
    const colors = actual.map(piece => piece[3]);
    const repeated = render.name.includes('Spiral') ? colors.slice(1).filter((color, i) => color === colors[i]).length : contacts(colors);
    assert.equal(repeated, 0, render.name);
    assert.deepEqual(actual.map(piece => piece[1]).sort(), components.map(component => component.name));
    const categoryColors = { A: '#FF9A4A', B: '#1F4B6B', C: '#CFD24F' };
    for (const piece of actual) assert.equal(piece[3], categoryColors[components.find(component => component.name === piece[1]).categoryId]);
    assert.equal(render(components, options), svg);
  }
});

test('circular ordering avoids matching colors across neighboring rings as well as around each ring', () => {
  const components = [1, 2].flatMap(ring => ['A', 'B', 'C'].map(categoryId => ({ name: `${categoryId}${ring}`, ring, categoryId })));
  for (const render of [mosaics.renderRingMosaic, mosaics.renderPuzzleMosaic]) {
    const svg = render(components, { measureText: () => 80 });
    const rings = svg.split(/<g data-ring="\d+" data-radius="[\d.]+">/).slice(1).map(group => pieces(group));
    assert.equal(rings.length, 2);
    for (const [i, inner] of rings[0].entries()) for (const [j, outer] of rings[1].entries()) {
      // Equal-sized pieces and the half-piece stagger leave one nonadjacent
      // outer slot for each inner piece; wraparound counts as adjacency too.
      if (j === i || j === (i + 2) % 3) assert.notEqual(inner[3], outer[3]);
    }
    assert.deepEqual(rings.map(ring => ring.map(piece => piece[1].slice(-1))), [['1', '1', '1'], ['2', '2', '2']]);
  }
});

test('ordering handles unavoidable shared colors and equivalent hex spellings without moving levels', () => {
  const components = [
    { name: 'A', ring: 1, categoryId: 'a' }, { name: 'B', ring: 2, categoryId: 'b' },
    { name: 'C', ring: 1, categoryId: 'b' }, { name: 'D', ring: 2, categoryId: 'a' },
  ];
  for (const render of Object.values(mosaics)) {
    const svg = render(components, { categoryColors: { a: '#abc', b: '#AABBCC' } });
    const actual = pieces(svg);
    assert.deepEqual(actual.map(piece => piece[1]).sort(), ['A', 'B', 'C', 'D']);
    for (const piece of actual) {
      const original = components.find(component => component.name === piece[1]);
      assert.equal(piece[3], original.categoryId === 'a' ? '#abc' : '#AABBCC');
      const level = piece[2].match(/data-ring="(\d+)"/);
      if (level) assert.equal(Number(level[1]), original.ring);
    }
    if (render === mosaics.renderRingMosaic || render === mosaics.renderPuzzleMosaic) {
      for (const group of svg.split(/<g data-ring="/).slice(1)) {
        const level = Number(group.match(/^([0-9]+)/)[1]);
        for (const piece of pieces(group)) assert.equal(components.find(component => component.name === piece[1]).ring, level);
      }
    }
  }
});
