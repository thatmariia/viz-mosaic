import { number, escapeXML } from './format.js';
import { layoutLegend } from './legend.js';
export { number, escapeXML };

export const FONT_SIZE = 16;
export const FONT = 'Arial, Helvetica, sans-serif';
export const LOGO_SIZE = 28;
export const GAP = 10;

export function opacityAttribute(opacity, attribute = 'opacity') {
  return opacity === 1 ? '' : ` ${attribute}="${opacity}"`;
}

// Reserve the previous cap's footprint so the two translucent fills cannot stack.
export function clipOutsideCap(defs, id, [x, y], radius, extent) {
  const left = number(x - radius);
  const right = number(x + radius);
  const bounds = `M ${-extent} ${-extent} H ${extent} V ${extent} H ${-extent} Z`;
  const hole = `M ${left} ${y} A ${radius} ${radius} 0 1 0 ${right} ${y} A ${radius} ${radius} 0 1 0 ${left} ${y} Z`;
  defs.push(`<clipPath id="${id}"><path clip-rule="evenodd" d="${bounds} ${hole}"/></clipPath>`);
  return ` clip-path="url(#${id})"`;
}

export function createImages(defs, prefix, monochrome) {
  const filters = new Set();
  return {
    component(logo, x, y, rotation, color, size = LOGO_SIZE) {
      if (!logo) return '';
      let filter = '';
      if (monochrome) {
        const id = `${prefix}-logo-${color.slice(1)}`;
        if (!filters.has(color)) {
          filters.add(color);
          // Preserve source transparency and turn white details into cutouts.
          defs.push(`<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.2126 -0.7152 -0.0722 0 1" result="ink"/><feComposite in="ink" in2="SourceGraphic" operator="in" result="alpha"/><feFlood flood-color="${color}"/><feComposite in2="alpha" operator="in"/></filter>`);
        }
        filter = ` filter="url(#${id})"`;
      }
      return `<image href="${escapeXML(logo)}" x="${number(x - size / 2)}" y="${number(y - size / 2)}" width="${size}" height="${size}" transform="rotate(${rotation} ${x} ${y})"${filter} preserveAspectRatio="xMidYMid meet"/>`;
    },
    center(logo, innerRadius) {
      if (!logo) return '';
      const size = (innerRadius - 12) * Math.SQRT2;
      return `<image href="${escapeXML(logo)}" x="${number(-size / 2)}" y="${number(-size / 2)}" width="${number(size)}" height="${number(size)}" preserveAspectRatio="xMidYMid meet"/>`;
    },
  };
}

export function svgDocument(title, prefix, extent, defs, content, fontSize = FONT_SIZE, legend, font) {
  const layout = layoutLegend(extent, fontSize, legend, font?.measureText);
  const family = font ? `'${font.family}', ${FONT}` : FONT;
  const face = font?.source
    ? `<style>@font-face{font-family:'${font.family}';src:url('${font.source}') format('woff2');font-weight:500 600}</style>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${layout.viewBox.map(number).join(' ')}" role="img" aria-labelledby="${prefix}-title" font-family="${family}" font-size="${fontSize}" font-weight="500"><title id="${prefix}-title">${escapeXML(title)}</title><defs>${face}${defs.join('')}</defs>${content.join('')}${layout.content}</svg>`;
}

export function shadowFilter(prefix) {
  return `<filter id="${prefix}-shadow" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="0" stdDeviation="4.5" flood-opacity="0.32"/></filter>`;
}
