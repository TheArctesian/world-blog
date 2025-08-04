import type { Map } from 'leaflet';

export const waitForTilesToLoad = (map: Map, timeout: number = 3000): Promise<void> => {
  return new Promise((resolve) => {
    let tilesLoading = 0;
    let loadTimeout: number;
    
    const checkComplete = () => {
      if (tilesLoading === 0) {
        clearTimeout(loadTimeout);
        resolve();
      }
    };

    // Set up tile loading listeners
    const tileLayer = map.eachLayer((layer: any) => {
      if (layer.on && typeof layer.on === 'function') {
        layer.on('loading', () => {
          tilesLoading++;
        });
        
        layer.on('load', () => {
          tilesLoading--;
          checkComplete();
        });
        
        layer.on('tileerror', () => {
          tilesLoading--;
          checkComplete();
        });
      }
    });

    // Fallback timeout in case tile events don't fire properly
    loadTimeout = window.setTimeout(() => {
      resolve();
    }, timeout);

    // If no tiles are loading initially, resolve immediately
    if (tilesLoading === 0) {
      setTimeout(resolve, 100); // Small delay to ensure map has settled
    }
  });
};