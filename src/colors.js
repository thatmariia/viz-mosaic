const normalize = color => color.length === 4 ? '#'+color.slice(1).split('').map(c => c+c).join('') : color;

function linearRGB(color) {
  const hex = normalize(color).slice(1);
  return [0, 2, 4].map(offset => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
}

export function contrastColor(color) {
  const [r, g, b] = linearRGB(color);
  return r * 0.2126 + g * 0.7152 + b * 0.0722 > 0.179 ? '#182323' : '#ffffff';
}

// Assign one palette slot per first-seen category (or uncategorized component).
export function assignColors(entries, overrides, palette) {
  const groups = new Map();
  for (const entry of entries) {
    const key = entry.categoryId === undefined ? entry : String(entry.categoryId);
    if (!groups.has(key)) {
      groups.set(key, {
        label: entry.categoryId === undefined ? entry.name : String(entry.categoryId),
        color: (entry.categoryId === undefined ? undefined : overrides.get(key)) ?? palette[groups.size % palette.length],
      });
    }
    entry.color = groups.get(key).color;
  }
  return [...groups.values()];
}
