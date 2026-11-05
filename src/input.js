import { FONT_SIZE, LOGO_SIZE, GAP } from './svg.js';

let sequence = 0;

// Deliberately conservative; callers can supply measured widths for their font.
function estimateWidth(name, fontSize) {
  return Array.from(name).reduce((width, character) => {
    if (/\p{Mark}/u.test(character)) return width;
    if (/\s/u.test(character)) return width + fontSize * 0.35;
    if (/[ilI.,'!:;|]/u.test(character)) return width + fontSize * 0.35;
    return width + fontSize * (/[^\u0000-\u024f]/u.test(character) ? 1.05 : 0.72);
  }, 0);
}

function imageData(value, label) {
  if (value === undefined) return;
  const match = typeof value === 'string' && /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) {
    throw new TypeError(`${label} must be a base64 PNG or JPEG data URL.`);
  }
  const bytes = atob(match[2]);
  const signature = match[1] === 'png' ? '\x89PNG\r\n\x1a\n' : '\xff\xd8\xff';
  if (!bytes.startsWith(signature) || bytes.length <= signature.length) {
    throw new TypeError(`${label} has an invalid ${match[1].toUpperCase()} image signature.`);
  }
  return value;
}

export function prepareInput(components, options = {}, defaultTitle, fontSize = FONT_SIZE) {
  if (!Array.isArray(components)) throw new TypeError('components must be an array.');
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object.');
  if (components.length > 10000) throw new RangeError('Use at most 10000 components per mosaic.');
  const { title = defaultTitle, idPrefix = `viz-${++sequence}-${Math.random().toString(36).slice(2)}`, categoryColors = {}, measureText = estimateWidth } = options;
  if (typeof title !== 'string' || !title.trim()) throw new TypeError('title must be a nonempty string.');
  if (typeof idPrefix !== 'string' || !/^[A-Za-z][\w.-]*$/.test(idPrefix)) {
    throw new TypeError('idPrefix must start with a letter and contain only letters, digits, underscores, dots, or hyphens.');
  }
  if (typeof measureText !== 'function') throw new TypeError('measureText must be a function.');
  if (options.monochromeLogos !== undefined && typeof options.monochromeLogos !== 'boolean') {
    throw new TypeError('monochromeLogos must be a boolean.');
  }
  if (!categoryColors || typeof categoryColors !== 'object' || Array.isArray(categoryColors)) {
    throw new TypeError('categoryColors must be an object mapping category IDs to hex colors.');
  }
  const colors = new Map(Object.entries(categoryColors));
  for (const [id, color] of colors) {
    if (typeof color !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color)) {
      throw new TypeError(`categoryColors[${JSON.stringify(id)}] must be a solid #rgb or #rrggbb color.`);
    }
  }
  const centerLogo = imageData(options.centerLogo, 'centerLogo');
  const entries = [];
  components.forEach((component, index) => {
    const label = `Component ${index + 1}`;
    if (!component || typeof component.name !== 'string' || !component.name.trim()) {
      throw new TypeError(`${label}: name must be a nonempty string.`);
    }
    if (!Number.isInteger(component.ring) || component.ring < 1 || component.ring > 32) {
      throw new RangeError(`${label} (${component.name}): ring must be an integer from 1 to 32.`);
    }
    const { name, ring, categoryId } = component;
    if (categoryId !== undefined && !(
      (typeof categoryId === 'string' && categoryId.trim()) ||
      (typeof categoryId === 'number' && Number.isFinite(categoryId))
    )) throw new TypeError(`${label}: categoryId must be a nonempty string or a finite number.`);
    const logo = imageData(component.logo, `${label} logo`);
    const width = measureText(name, fontSize);
    if (!Number.isFinite(width) || width <= 0) throw new TypeError(`${label}: measureText must return a positive finite width.`);
    const groupWidth = width + (logo ? LOGO_SIZE + GAP : 0);
    entries.push({ name, ring, order: index, logo, categoryId, width, groupWidth });
  });

  return { entries, colors, centerLogo, title, idPrefix, monochromeLogos: options.monochromeLogos };
}
