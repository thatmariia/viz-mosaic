export const FONT_SIZE = 16;
export const FONT = 'Arial, Helvetica, sans-serif';
export const LOGO_SIZE = 28;
export const GAP = 10;
export const number = value => Number(value.toFixed(4));
export const escapeXML = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[c]);

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

export function svgDocument(title, prefix, extent, defs, content, fontSize = FONT_SIZE) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${number(-extent)} ${number(-extent)} ${number(extent * 2)} ${number(extent * 2)}" role="img" aria-labelledby="${prefix}-title" font-family="${FONT}" font-size="${fontSize}" font-weight="500"><title id="${prefix}-title">${escapeXML(title)}</title><defs>${defs.join('')}</defs>${content.join('')}</svg>`;
}
