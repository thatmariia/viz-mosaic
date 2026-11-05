import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderRingMosaic, renderPuzzleMosaic, renderRadialMosaic, renderSpiralMosaic, renderSpiralPuzzleMosaic, renderHoneycombMosaic } from '../src/index.js';

const fills = svg => new Map([...svg.matchAll(/<g data-component="([^"]+)"[^>]*><path[^>]+fill="([^"]+)"/g)].map(match => [match[1], match[2]]));
const renderers = [renderRingMosaic, renderPuzzleMosaic, renderRadialMosaic, renderSpiralMosaic, renderSpiralPuzzleMosaic, renderHoneycombMosaic];

test('supplied palette presets work in all views and preserve the original default', () => {
  const palettes = {
    'palette-1': ['#FF9A4A', '#1F4B6B', '#CFD24F', '#BB424A', '#84BFFD', '#4BAE87'],
    'palette-2': ['#3CBA77', '#FF7BAC', '#3D69DD', '#FED255', '#64E9D1', '#F87553', '#7C7FD3', '#FF8C29', '#5DB1F7', '#BCBD42'],
  };
  const components = [1, 2, 3].flatMap(ring => [0, 1, 2].map(index => ({ name: `${ring}-${index}`, ring, categoryId: index === 0 ? 0 : undefined })));
  for (const render of renderers) {
    assert.equal(render(components, { idPrefix: 'default' }), render(components, { palette: 'classic', idPrefix: 'default' }));
    for (const [palette, expected] of Object.entries(palettes)) {
      const options = { palette, idPrefix: 'preset' };
      const svg = render(components, options), colors = fills(svg);
      assert.equal(colors.size, 9);
      assert.ok([...colors.values()].every(color => expected.includes(color)));
      assert.equal(colors.get('1-0'), colors.get('3-0'));
      assert.ok(new Set(colors.values()).size > 1);
      assert.equal(render(components, options), svg);
    }
  }
});

test('category overrides take priority over presets and invalid palette names are rejected', () => {
  const components = Object.freeze([
    Object.freeze({ name: 'Pinned', ring: 1, categoryId: 0 }), Object.freeze({ name: 'Auto', ring: 1 }),
    Object.freeze({ name: 'Same category', ring: 2, categoryId: '0' }), Object.freeze({ name: 'Other auto', ring: 2 }),
  ]);
  for (const render of renderers) {
    for (const palette of ['palette-1', 'palette-2']) {
      const colors = fills(render(components, { palette, categoryColors: Object.freeze({ 0: '#123456' }) }));
      assert.equal(colors.get('Pinned'), '#123456');
      assert.equal(colors.get('Same category'), '#123456');
      assert.notEqual(colors.get('Auto'), '#123456');
    }
    for (const palette of ['', 'unknown', '__proto__', null, []]) assert.throws(() => render([], { palette }), /palette must be/);
  }
});

test('automatic colors avoid equal circular and cross-ring neighbors, including wraparound', () => {
  const components = [1, 2, 3].flatMap(ring => [0, 1, 2].map(index => ({ name: `${ring}-${index}`, ring })));
  for (const render of [renderRingMosaic, renderPuzzleMosaic]) {
    const colors = fills(render(components, { measureText: () => 50 }));
    assert.equal(colors.size, 9);
    for (const ring of [1, 2, 3]) for (const index of [0, 1, 2]) {
      assert.notEqual(colors.get(`${ring}-${index}`), colors.get(`${ring}-${(index + 1) % 3}`));
      if (ring < 3) {
        assert.notEqual(colors.get(`${ring + 1}-${index}`), colors.get(`${ring}-${index}`));
        assert.notEqual(colors.get(`${ring + 1}-${index}`), colors.get(`${ring}-${(index + 1) % 3}`));
      }
    }
  }
});

test('automatic colors favor perceptual contrast while category overrides remain exact', () => {
  for (const render of [renderRingMosaic, renderPuzzleMosaic]) {
    const automatic = render([{ name: 'A', ring: 1 }, { name: 'B', ring: 1 }, { name: 'C', ring: 1 }]);
    const textColors = new Set([...automatic.matchAll(/<text fill="([^"]+)"/g)].map(match => match[1]));
    assert.equal(textColors.size, 2);
    const explicit = fills(render([
      { name: 'Fixed', ring: 1, categoryId: 'pin' },
      { name: 'Auto', ring: 1 },
      { name: 'Same category', ring: 2, categoryId: 'pin' },
      { name: 'Outer auto', ring: 2 },
    ], { categoryColors: { pin: '#CF123C' } }));
    assert.equal(explicit.get('Fixed'), '#CF123C');
    assert.equal(explicit.get('Same category'), '#CF123C');
    assert.notEqual(explicit.get('Auto').toLowerCase(), '#cf123c');
    assert.notEqual(explicit.get('Outer auto').toLowerCase(), '#cf123c');
  }
});

test('neighboring rings start at staggered angles without changing component order', () => {
  const components = [1, 2, 3].flatMap(ring => [0, 1, 2].map(index => ({ name: `${ring}-${index}`, ring })));
  for (const render of [renderRingMosaic, renderPuzzleMosaic]) {
    const svg = render(components, { measureText: () => 50 });
    const starts = svg.split(/<g data-ring="\d+" data-radius="[\d.]+">/).slice(1).map(group => {
      const [, x, y] = group.match(/d="M ([\d.-]+),([\d.-]+)/);
      return Math.atan2(Number(y), Number(x));
    });
    assert.equal(starts.length, 3);
    for (let i = 1; i < starts.length; i++) assert.ok(Math.abs(Math.atan2(Math.sin(starts[i] - starts[i - 1]), Math.cos(starts[i] - starts[i - 1]))) > 0.3);
    assert.deepEqual([...svg.matchAll(/data-component="([^"]+)"/g)].map(match => match[1]), components.map(component => component.name));
  }
});
