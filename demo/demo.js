import { renderRingMosaic, renderPuzzleMosaic, renderRadialMosaic, renderSpiralMosaic, renderHoneycombMosaic } from '../src/index.js';
import { downloadDiagram } from './download.js';
import { researchSoftwareExample } from './research-software.js';

const $ = selector => document.querySelector(selector);
const renderers = { ring: renderRingMosaic, puzzle: renderPuzzleMosaic, radial: renderRadialMosaic, spiral: renderSpiralMosaic, honeycomb: renderHoneycombMosaic };
const standardPlacement = { label: 'Ring', hint: 'Ring 1 is closest to the center. Skipped rings stay empty.', summary: 'occupied rings' };
const placements = {
  radial: { label: 'Reach', hint: 'Reach 1 is shortest. Higher values extend farther from the center.', summary: 'reach levels' },
  spiral: { label: 'Level', hint: 'Each level occupies a half-turn, starting near the center. Skipped levels stay empty.', summary: 'distance levels' },
  honeycomb: { label: 'Level', hint: 'Lower levels pack first, closest to the center. Tiles pack tightly without reserving empty levels.', summary: 'priority levels' },
};
const placement = () => placements[visualization] ?? standardPlacement;
let nextId = 0;
let components = [];
let categoryColors = [];
let centerLogo;
let svg = '';
let visualization = 'ring';
let exampleRevision = 0;
let exampleLoading = false;

function placeholderLogo(background, size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = background;
  context.beginPath();
  context.roundRect(0, 0, size, size, size * 0.23);
  context.fill();
  for (const [x, y, color] of [[0.22, 0.22, '#adc2ad'], [0.53, 0.22, '#527b9b'], [0.22, 0.53, '#a45d45'], [0.53, 0.53, '#d5b575']]) {
    context.fillStyle = color;
    context.fillRect(size * x, size * y, size * 0.25, size * 0.25);
  }
  return canvas.toDataURL('image/png');
}

const componentLogo = placeholderLogo('#ffffff', 64);
function centerMark() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 120;
  const context = canvas.getContext('2d');
  context.strokeStyle = '#27232d';
  context.lineWidth = 5;
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(60, 13);
  for (const [x, y] of [[101, 37], [101, 83], [60, 107], [19, 83], [19, 37], [60, 13], [101, 37], [60, 60], [19, 37]]) context.lineTo(x, y);
  context.moveTo(60, 60);
  context.lineTo(60, 107);
  context.stroke();
  return canvas.toDataURL('image/png');
}
const systemLogo = centerMark();
const context = document.createElement('canvas').getContext('2d');

function render() {
  try {
    const colors = Object.create(null);
    for (const entry of categoryColors) {
      if (!entry.id.trim()) throw new Error('Enter a category ID for each custom color, or remove the empty color row.');
      if (Object.hasOwn(colors, entry.id)) throw new Error(`Category "${entry.id}" has more than one custom color.`);
      colors[entry.id] = entry.color;
    }
    svg = renderers[visualization](components.map(({ id, ...component }) => component), {
      title: $('#title').value,
      centerLogo,
      monochromeLogos: true,
      categoryColors: colors,
      idPrefix: 'preview',
      measureText: (name, fontSize) => {
        context.font = `500 ${fontSize}px Arial, Helvetica, sans-serif`;
        return context.measureText(name).width;
      },
    });
    $('#preview').innerHTML = svg;
    $('#error').hidden = true;
    $('#download').disabled = exampleLoading;
    const rings = new Set(components.map(component => component.ring));
    $('#summary').textContent = `${components.length} components · ${rings.size} ${placement().summary}`;
  } catch (error) {
    showError(`${error.message} Preview shows the last valid diagram.`);
  }
}

function showError(message) {
  $('#error').textContent = message;
  $('#error').hidden = false;
  $('#download').disabled = true;
}

function renderRows() {
  $('#components').replaceChildren(...components.map(component => {
    const row = $('#component-row').content.firstElementChild.cloneNode(true);
    row.dataset.id = component.id;
    for (const field of ['name', 'ring', 'categoryId']) row.querySelector(`[data-field="${field}"]`).value = component[field] ?? '';
    row.querySelector('[data-field="ring"]').setAttribute('aria-label', `${placement().label} index`);
    row.querySelector('.logo-button').classList.toggle('has-logo', Boolean(component.logo));
    row.querySelector('.logo-button span').textContent = component.logo ? '✓' : '+';
    row.querySelector('[data-action="clear-logo"]').hidden = !component.logo;
    row.querySelector('[data-action="remove"]').setAttribute('aria-label', `Remove ${component.name || 'component'}`);
    return row;
  }));
}

function renderColors() {
  $('#colors').replaceChildren(...categoryColors.map(entry => {
    const row = $('#color-row').content.firstElementChild.cloneNode(true);
    row.dataset.key = entry.key;
    row.querySelector('[data-field="id"]').value = entry.id;
    row.querySelector('[data-field="color"]').value = entry.color;
    return row;
  }));
}

async function readImage(file) {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Choose a PNG or JPEG image.');
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = data;
  await image.decode().catch(() => { throw new Error('The selected file is not a readable image.'); });
  return data;
}

async function reset() {
  const revision = ++exampleRevision;
  const selected = $('#example').value;
  const skipped = [
    { name: 'Collection', ring: 1, categoryId: 'data', logo: componentLogo },
    { name: 'Processing', ring: 1, categoryId: 'tools' },
    { name: 'Records', ring: 2, categoryId: 'data' },
    { name: 'Quality checks', ring: 2, categoryId: 'tools', logo: componentLogo },
    { name: 'Reporting', ring: 2, categoryId: 'people' },
    { name: 'Collaboration', ring: 4, categoryId: 'people' },
    { name: 'Discovery', ring: 4, categoryId: 'tools' },
    { name: 'Data exports', ring: 4, categoryId: 'data' },
    { name: 'Governance', ring: 4, categoryId: 'people' },
  ];
  const packed = [
    ['Intake', 1, 'data'], ['Mapping', 1, 'transform'], ['Validation', 1, 'quality'], ['Routing', 1, 'compute'],
    ['Consent', 2, 'services'], ['Audit', 2, 'control'], ['API gateway', 2, 'integration'], ['Schema catalog', 2, 'services'], ['Rule engine', 2, 'control'],
    ['Delivery queue', 3, 'quality'], ['Access control', 3, 'data'], ['Trace index', 3, 'compute'], ['File intake', 3, 'transform'], ['Code lookup', 3, 'quality'], ['ID matching', 3, 'data'], ['Retry policy', 3, 'transform'],
    ['Key rotation', 4, 'services'], ['Dashboards', 4, 'control'], ['Event intake', 4, 'integration'], ['Terminology', 4, 'services'], ['Deduplication', 4, 'control'], ['Acknowledgment', 4, 'integration'], ['Encryption', 4, 'services'], ['Monitoring', 4, 'control'],
  ].map(([name, ring, categoryId], index) => ({ name, ring, categoryId, ...(index === 0 ? { logo: componentLogo } : {}) }));
  let example = { components: selected === 'skipped' ? skipped : packed, title: 'Atlas research platform', centerLogo: systemLogo, categoryColors: [
    { id: 'data', color: '#cf123c' }, { id: 'transform', color: '#ffd43b' }, { id: 'quality', color: '#f2a1c4' },
    { id: 'compute', color: '#ff9c2c' }, { id: 'services', color: '#0653c4' }, { id: 'control', color: '#006b50' }, { id: 'integration', color: '#54389b' },
  ] };
  exampleLoading = true;
  $('#preview').setAttribute('aria-busy', 'true');
  $('#download').disabled = true;
  try { if (selected === 'research') example = await researchSoftwareExample(); }
  catch (error) {
    if (revision !== exampleRevision) return;
    exampleLoading = false;
    $('#preview').setAttribute('aria-busy', 'false');
    showError(error.message);
    return;
  }
  if (revision !== exampleRevision) return;
  exampleLoading = false;
  $('#preview').setAttribute('aria-busy', 'false');
  components = example.components.map(component => ({ ...component, id: String(++nextId) }));
  categoryColors = example.categoryColors.map(entry => ({ ...entry, key: String(++nextId) }));
  centerLogo = example.centerLogo;
  $('#title').value = example.title;
  $('#example-note').hidden = selected !== 'research';
  $('#center-logo').value = '';
  $('#clear-center').disabled = false;
  renderRows();
  renderColors();
  render();
}

$('#components').addEventListener('input', event => {
  const { field } = event.target.dataset;
  if (!field || field === 'logo') return;
  const component = components.find(component => component.id === event.target.closest('.component-row').dataset.id);
  const value = event.target.value;
  component[field] = field === 'ring' ? (value === '' ? NaN : Number(value)) : (field === 'categoryId' && value === '' ? undefined : value);
  render();
});

$('#components').addEventListener('change', async event => {
  if (event.target.dataset.field !== 'logo' || !event.target.files[0]) return;
  const component = components.find(component => component.id === event.target.closest('.component-row').dataset.id);
  try {
    const logo = await readImage(event.target.files[0]);
    if (!components.includes(component)) return;
    component.logo = logo;
    renderRows();
    render();
  } catch (error) { showError(error.message); }
});

$('#components').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = button.closest('.component-row').dataset.id;
  if (button.dataset.action === 'remove') components = components.filter(component => component.id !== id);
  else delete components.find(component => component.id === id).logo;
  renderRows();
  render();
});

$('#add-component').addEventListener('click', () => {
  components.push({ id: String(++nextId), name: 'New component', ring: 1 });
  renderRows();
  render();
  $('#components .component-row:last-child input').focus();
});

$('#colors').addEventListener('input', event => {
  const entry = categoryColors.find(entry => entry.key === event.target.closest('.color-row').dataset.key);
  entry[event.target.dataset.field] = event.target.value;
  render();
});
$('#colors').addEventListener('click', event => {
  if (!event.target.closest('button')) return;
  const key = event.target.closest('.color-row').dataset.key;
  categoryColors = categoryColors.filter(entry => entry.key !== key);
  renderColors();
  render();
});
$('#add-color').addEventListener('click', () => {
  categoryColors.push({ key: String(++nextId), id: '', color: '#426a5a' });
  renderColors();
  render();
  $('#colors .color-row:last-child input').focus();
});

$('#title').addEventListener('input', render);
$('.visualizations').addEventListener('click', event => {
  const button = event.target.closest('[data-visualization]');
  if (!button) return;
  visualization = button.dataset.visualization;
  const name = button.textContent;
  for (const option of document.querySelectorAll('[data-visualization]')) {
    option.setAttribute('aria-pressed', String(option === button));
  }
  $('#visualization-heading').textContent = name;
  $('#visualization-label').textContent = name.toLowerCase();
  $('#placement-hint').textContent = placement().hint;
  $('#distance-label').textContent = placement().label;
  for (const input of document.querySelectorAll('[data-field="ring"]')) {
    input.setAttribute('aria-label', `${placement().label} index`);
  }
  document.title = `viz-mosaic · ${name}`;
  render();
});
$('#center-logo').addEventListener('change', async event => {
  if (!event.target.files[0]) return;
  try {
    centerLogo = await readImage(event.target.files[0]);
    $('#clear-center').disabled = false;
    render();
  } catch (error) { showError(error.message); }
});
$('#clear-center').addEventListener('click', () => {
  centerLogo = undefined;
  $('#center-logo').value = '';
  $('#clear-center').disabled = true;
  render();
});
$('#reset').addEventListener('click', reset);
$('#example').addEventListener('change', reset);
$('#format').addEventListener('change', render);
$('#download').addEventListener('click', async () => {
  $('#download').disabled = true;
  try { await downloadDiagram(svg, $('#format').value); }
  catch (error) { showError(error.message); return; }
  $('#download').disabled = !$('#error').hidden;
});
reset();
