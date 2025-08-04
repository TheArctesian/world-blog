export interface LocationData {
  City: string;
  Date: string | number;
  Latitude: number;
  Longitude: number;
  Notes?: string;
}

export interface MarkerConfig {
  iconUrl: string;
  iconSize: [number, number];
}

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
