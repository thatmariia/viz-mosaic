import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('packed package installs offline and exposes the public import and declarations', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'viz-mosaic-consumer-'));
  const root = fileURLToPath(new URL('../', import.meta.url));
  const cache = join(temporary, 'cache');
  try {
    const [pack] = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temporary, '--cache', cache], { cwd: root, encoding: 'utf8' }));
    assert.ok(pack.files.some(file => file.path === 'types/index.d.ts'));
    assert.ok(!pack.files.some(file => file.path.startsWith('test/')));
    execFileSync('npm', ['install', join(temporary, pack.filename), '--prefix', temporary, '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', cache], { encoding: 'utf8' });
    const svgs = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', "import { renderRingMosaic, renderPuzzleMosaic } from 'viz-mosaic'; console.log(JSON.stringify([renderRingMosaic,renderPuzzleMosaic].map(render=>render([{name:'Consumer',ring:4,categoryId:1}],{categoryColors:{1:'#abc'}}))));"], { cwd: temporary, encoding: 'utf8' }));
    for (const svg of svgs) {
      assert.match(svg, /data-ring="4"/);
      assert.match(svg, /stroke="#abc"/);
    }
    const declaration = readFileSync(join(temporary, 'node_modules/viz-mosaic/types/index.d.ts'), 'utf8');
    assert.match(declaration, /export function renderRingMosaic/);
    assert.match(declaration, /export function renderPuzzleMosaic/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
