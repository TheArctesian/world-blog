import type { MapConfig } from './types.js';

export const MAP_CONFIG: MapConfig = {
  center: [37.8, -122.27],
  zoom: 8,
  minZoom: 1,
  maxZoom: 16,
  bounds: {
    southWest: [-89.98155760646617, -180],
    northEast: [89.99346179538875, 180]
  }
};

export const TILE_LAYER = {
  url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.{ext}',
  options: {
    minZoom: MAP_CONFIG.minZoom,
    maxZoom: MAP_CONFIG.maxZoom,
    attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    ext: 'jpg'
  }
};