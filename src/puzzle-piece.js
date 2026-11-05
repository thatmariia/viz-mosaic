const point = (radius, angle) => [Number((radius * Math.cos(angle)).toFixed(4)), Number((radius * Math.sin(angle)).toFixed(4))];

const CONNECTIONS = [
  [
    [[26, 0], [22, 0], [28, -30], [12, -30]],
    [[12, -30], [-4, -30], [-6, -10], [5, -8]],
    [[5, -8], [16, -6], [14, 10], [3, 16]],
    [[3, 16], [-8, 22], [-18, 30], [-24, 20]],
    [[-24, 20], [-30, 10], [-22, 0], [-26, 0]],
  ],
  [
    [[26, 0], [18, 0], [20, -12], [13, -12]],
    [[13, -12], [3, -12], [12, -31], [-2, -31]],
    [[-2, -31], [-19, -31], [-18, -10], [-8, -7]],
    [[-8, -7], [4, -4], [-4, 14], [-15, 14]],
    [[-15, 14], [-26, 14], [-22, 0], [-26, 0]],
  ],
  [
    [[26, 0], [20, 0], [21, -8], [14, -8]],
    [[14, -8], [4, -8], [10, -28], [-2, -28]],
    [[-2, -28], [-14, -28], [-19, -10], [-8, -6]],
    [[-8, -6], [8, 0], [-4, 26], [-16, 26]],
    [[-16, 26], [-28, 26], [-22, 0], [-26, 0]],
  ],
];

// Neighbors share the same flowing boundary, traced in opposite directions.
// Mirrored profiles give pieces varied waists and lobes without warping the rings.
export function puzzleEdge(radius, angle, variant, reverse = false) {
  const position = ([radial, tangent]) => {
    const bend = tangent * (variant % 2 ? -1 : 1);
    const x = (radius + radial) * Math.cos(angle) - bend * Math.sin(angle);
    const y = (radius + radial) * Math.sin(angle) + bend * Math.cos(angle);
    return [Number(x.toFixed(4)), Number(y.toFixed(4))];
  };
  const curves = CONNECTIONS[variant % CONNECTIONS.length].map(curve => curve.slice());
  if (reverse) curves.reverse().forEach(curve => curve.reverse());
  return curves.map(curve => `C ${curve.slice(1).map(position).join(' ')}`).join(' ');
}

export function puzzlePiece(radius, start, end, startVariant, endVariant) {
  const outer = radius + 32;
  const inner = radius - 32;
  const outerInset = 6 / outer;
  const innerInset = 6 / inner;
  const large = end - start - innerInset * 2 > Math.PI ? 1 : 0;
  return `M ${point(outer, start + outerInset)} A ${outer} ${outer} 0 ${end - start - outerInset * 2 > Math.PI ? 1 : 0} 1 ${point(outer, end - outerInset)} Q ${point(outer, end)} ${point(radius + 26, end)} ${puzzleEdge(radius, end, endVariant)} Q ${point(inner, end)} ${point(inner, end - innerInset)} A ${inner} ${inner} 0 ${large} 0 ${point(inner, start + innerInset)} Q ${point(inner, start)} ${point(radius - 26, start)} ${puzzleEdge(radius, start, startVariant, true)} Q ${point(outer, start)} ${point(outer, start + outerInset)} Z`;
}
