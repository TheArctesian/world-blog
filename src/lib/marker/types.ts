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
