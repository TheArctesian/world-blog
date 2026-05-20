export interface LocationData {
  City: string;
  Date: string | number;
  Latitude: number;
  Longitude: number;
  Notes?: string;
  Ratings?: number | string;
}

export interface MarkerConfig {
  iconUrl: string;
  iconSize: [number, number];
}
