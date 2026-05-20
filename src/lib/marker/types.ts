export interface LocationData {
  City: string;
  Date: string | number;
  Latitude: number;
  Longitude: number;
  Notes?: string;
  Rating?: number;
}

export interface MarkerConfig {
  iconUrl: string;
  iconSize: [number, number];
}
