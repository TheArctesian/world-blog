export interface MapConfig {
  center: [number, number];
  zoom: number;
  minZoom: number;
  maxZoom: number;
  bounds: {
    southWest: [number, number];
    northEast: [number, number];
  };
}
