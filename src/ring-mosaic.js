import { renderCircularMosaic } from './circular-mosaic.js';

export function renderRingMosaic(components, options) {
  return renderCircularMosaic(components, options, 'ring');
}
