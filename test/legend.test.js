import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as mosaics from '../src/index.js';

const components = Object.freeze([
  Object.freeze({ name: 'Outer tool', ring: 2, categoryId: 'Tools & <discovery>' }),
  Object.freeze({ name: 'Inner workflow', ring: 1, categoryId: 'Workflows' }),
  Object.freeze({ name: 'Another tool', ring: 1, categoryId: 'Tools & <discovery>' }),
]);
const viewBox = svg => svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);

test('every renderer includes an optional portable legend with matching colors and escaped category labels', () => {
  for (const render of Object.values(mosaics)) {
    const options = { idPrefix: 'test', categoryColors: { Workflows: '#123456' } };
    const plain = render(components, options);
    assert.equal(render(components, { ...options, legend: false }), plain);
    assert.doesNotMatch(plain, /data-legend/);
    const svg = render(components, { ...options, legend: true });
    const legend = svg.slice(svg.indexOf('<g data-legend=""'));
    assert.match(legend, /Tools &amp; &lt;discovery&gt;/);
    assert.doesNotMatch(legend, /Levels|Level [12]/);
    assert.equal([...legend.matchAll(/data-legend-label=/g)].length, 2);
    assert.deepEqual([...legend.matchAll(/<rect[^>]+fill="([^"]+)"/g)].map(match => match[1]), ['#FF9A4A', '#123456']);
    // Showing a legend must not move or resize the component geometry.
    const pieces = value => [...value.matchAll(/<g data-component="[\s\S]*?<path[^>]+>/g)].map(match => match[0]);
    assert.deepEqual(pieces(svg), pieces(plain));
    assert.doesNotMatch(render([], { legend: true }), /data-legend/);
  }
});

test('legend placement expands the canvas on the requested side without covering the diagram', () => {
  for (const render of Object.values(mosaics)) {
    const [x, y, width, height] = viewBox(render(components));
    for (const position of ['top', 'right', 'bottom', 'left']) {
      const [lx, ly, lw, lh] = viewBox(render(components, { legend: true, legendPosition: position }));
      if (position === 'top' || position === 'bottom') {
        assert.equal(lx, x); assert.equal(lw, width); assert.ok(lh > height);
        assert.ok(Math.abs((position === 'top' ? ly + lh : ly) - (position === 'top' ? y + height : y)) < 0.001);
      } else {
        assert.ok(lw > width); assert.ok(lh >= height);
        assert.ok(Math.abs((position === 'left' ? lx + lw : lx) - (position === 'left' ? x + width : x)) < 0.001);
      }
    }
  }
});

test('legend options reject malformed visibility and positions', () => {
  for (const render of Object.values(mosaics)) {
    for (const legend of ['yes', 1, null]) assert.throws(() => render([], { legend }), /legend must/);
    assert.throws(() => render([], { legendPosition: 'center' }), /legendPosition must/);
  }
});

test('horizontal category legends balance rows and align equal columns', () => {
  const svg = mosaics.renderRingMosaic(['Tools', 'Workflows', 'Packaging', 'Benchmarking'].map(categoryId => ({ name: categoryId, ring: 3, categoryId })), { legend: true, measureText: () => 30 });
  const legend = svg.slice(svg.indexOf('<g data-legend=""'));
  const swatches = [...legend.matchAll(/<rect x="([^"]+)" y="([^"]+)"/g)].map(match => match.slice(1).map(Number));
  assert.equal(swatches.length, 4);
  assert.equal(swatches[0][1], swatches[1][1]);
  assert.equal(swatches[2][1], swatches[3][1]);
  assert.equal(swatches[0][0], swatches[2][0]);
  assert.equal(swatches[1][0], swatches[3][0]);
  assert.ok(swatches[2][1] > swatches[0][1]);
});
