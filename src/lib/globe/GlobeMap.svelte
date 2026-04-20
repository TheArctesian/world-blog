<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import type { LocationData } from '../marker/types.js';
  import { MARKER_CONFIGS } from '../marker/markerConfig.js';
  import type { TimelineEntry } from '../timeline/types.js';
  import type { TimelineAnimator } from '../timeline/animator.js';
  import {
    HANDOFF_CAMERA_DISTANCE,
    HANDOFF_LEAFLET_ZOOM,
    cameraDirectionToLatLon
  } from '../transition/mapping.js';

  import places from '../data/places.json';
  import ski from '../data/ski.json';
  import hike from '../data/mountains.json';
  import lived from '../data/lived.json';

  const dispatch = createEventDispatcher<{
    requestZoomIn: { lat: number; lon: number; leafletZoom: number };
  }>();

  export let animationMode = false;
  export let active = true;
  export let animator: TimelineAnimator | null = null;
  export let initialFocus: { lat: number; lon: number; distance: number } | null = null;

  let containerElement: HTMLDivElement;
  let overlayElement: HTMLDivElement;
  let modeSwitching = false;
  let destroyed = false;
  let handoffFired = false;

  // Three.js objects (loaded dynamically)
  let THREE: any;
  let scene: any;
  let camera: any;
  let renderer: any;
  let controls: any;
  let tileTextureLoader: any;
  let tileRendererInstance: any;
  let markerGroup: any;
  let animationFrameId: number;
  let lastZoom = -1;
  let idleRotationTimeout: ReturnType<typeof window.setTimeout> | null = null;
  let userHasInteracted = false;
  let initialized = false;

  let globeModules: {
    GLOBE_CONFIG: any;
    setupOrbitControls: any;
    flyTo: any;
    createAtmosphere: any;
    TileTextureLoader: any;
    TileRenderer: any;
    getZoomForDistance: any;
    getVisibleTiles: any;
    addAllStaticMarkers: any;
    clearAllMarkers: any;
    addAnimatedMarker: any;
    updateMarkerScales: any;
    worldToScreen: any;
    latLonToVector3: any;
  };

  const initializeGlobe = async (): Promise<void> => {
    try {
      const [
        threeModule,
        globeConfigModule,
        cameraModule,
        atmosphereModule,
        tileLoaderModule,
        tileRendererModule,
        tileLODModule,
        markersModule,
        overlayModule,
        tileUtilsModule
      ] = await Promise.all([
        import('three'),
        import('./globeConfig.js'),
        import('./cameraControls.js'),
        import('./atmosphere.js'),
        import('./tileLoader.js'),
        import('./tileRenderer.js'),
        import('./tileLOD.js'),
        import('./markers.js'),
        import('./overlay.js'),
        import('./tileUtils.js')
      ]);

      THREE = threeModule;

      globeModules = {
        GLOBE_CONFIG: globeConfigModule.GLOBE_CONFIG,
        setupOrbitControls: cameraModule.setupOrbitControls,
        flyTo: cameraModule.flyTo,
        createAtmosphere: atmosphereModule.createAtmosphere,
        TileTextureLoader: tileLoaderModule.TileTextureLoader,
        TileRenderer: tileRendererModule.TileRenderer,
        getZoomForDistance: tileLODModule.getZoomForDistance,
        getVisibleTiles: tileLODModule.getVisibleTiles,
        addAllStaticMarkers: markersModule.addAllStaticMarkers,
        clearAllMarkers: markersModule.clearAllMarkers,
        addAnimatedMarker: markersModule.addAnimatedMarker,
        updateMarkerScales: markersModule.updateMarkerScales,
        worldToScreen: overlayModule.worldToScreen,
        latLonToVector3: tileUtilsModule.latLonToVector3
      };

      const config = globeModules.GLOBE_CONFIG;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(config.backgroundColor);

      const aspect = containerElement.clientWidth / containerElement.clientHeight;
      camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
      const focusLat = initialFocus?.lat ?? config.initialFocusLat;
      const focusLon = initialFocus?.lon ?? config.initialFocusLon;
      const focusDist = initialFocus?.distance ?? config.initialCameraDistance;
      const initialDirection = globeModules
        .latLonToVector3(focusLat, focusLon, 1)
        .normalize();
      camera.position.copy(initialDirection.multiplyScalar(focusDist));
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(containerElement.clientWidth, containerElement.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerElement.appendChild(renderer.domElement);

      controls = globeModules.setupOrbitControls(camera, renderer.domElement);
      // Relax the minimum distance so the wheel gesture can continue smoothly
      // through the handoff point instead of bouncing off the hard stop.
      controls.minDistance = HANDOFF_CAMERA_DISTANCE - 0.3;
      setupIdleAutoRotate();

      const capGeometry = new THREE.SphereGeometry(config.radius * 0.998, 32, 32);
      const capMaterial = new THREE.MeshBasicMaterial({ color: '#b8d4e3' });
      const capSphere = new THREE.Mesh(capGeometry, capMaterial);
      capSphere.renderOrder = -1;
      scene.add(capSphere);

      tileTextureLoader = new globeModules.TileTextureLoader();
      tileRendererInstance = new globeModules.TileRenderer(scene, tileTextureLoader, config.radius);

      markerGroup = new THREE.Group();
      scene.add(markerGroup);

      if (!animationMode) {
        addAllMarkersStatic();
      }

      window.addEventListener('resize', handleResize);

      initialized = true;
      renderLoop();
    } catch (error) {
      console.error('Failed to initialize globe:', error);
    }
  };

  const addAllMarkersStatic = (): void => {
    if (!markerGroup || !globeModules) return;

    globeModules.addAllStaticMarkers(markerGroup, places as LocationData[], MARKER_CONFIGS.city.iconUrl);
    globeModules.addAllStaticMarkers(markerGroup, ski as LocationData[], MARKER_CONFIGS.ski.iconUrl);
    globeModules.addAllStaticMarkers(markerGroup, hike as LocationData[], MARKER_CONFIGS.hike.iconUrl);
    globeModules.addAllStaticMarkers(markerGroup, lived as LocationData[], MARKER_CONFIGS.lived.iconUrl);
  };

  const projectToScreen = (pos: any) => {
    return globeModules.worldToScreen(pos, camera, renderer.domElement);
  };

  export const addMarker = (entry: TimelineEntry): void => {
    const iconUrl = MARKER_CONFIGS[entry.type]?.iconUrl;
    if (!iconUrl || !markerGroup || !camera || !controls || !overlayElement) return;
    globeModules.addAnimatedMarker(
      markerGroup, camera, controls, entry, iconUrl,
      overlayElement, projectToScreen
    );
  };

  export const clearMarkers = (): void => {
    if (markerGroup && globeModules) {
      globeModules.clearAllMarkers(markerGroup);
    }
  };

  export const refreshStaticMarkers = (): void => {
    clearMarkers();
    addAllMarkersStatic();
  };

  export const focusOn = (lat: number, lon: number, distance: number): void => {
    if (!camera || !controls || !globeModules) return;
    // Snap instantly — the crossfade itself provides the sense of motion,
    // and an animated flyTo would force the user to wait before the fade starts.
    const direction = globeModules.latLonToVector3(lat, lon, 1).normalize();
    camera.position.copy(direction.multiplyScalar(distance));
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
    handoffFired = false;
  };

  const renderLoop = (): void => {
    if (destroyed) return;

    animationFrameId = requestAnimationFrame(renderLoop);

    if (!active) return;

    controls.update();

    const cameraDistance = camera.position.length();
    const zoom = globeModules.getZoomForDistance(cameraDistance);

    if (zoom !== lastZoom) {
      if (lastZoom !== -1 && Math.abs(zoom - lastZoom) > 1) {
        tileTextureLoader.clearQueue();
      }
      lastZoom = zoom;
    }

    const tiles = globeModules.getVisibleTiles(camera, globeModules.GLOBE_CONFIG.radius, zoom);
    tileRendererInstance.updateTiles(tiles);
    tileRendererInstance.refreshTextures();

    globeModules.updateMarkerScales(markerGroup, cameraDistance);

    renderer.render(scene, camera);

    // Handoff to 2D view when camera pushes past the threshold.
    if (!handoffFired && cameraDistance <= HANDOFF_CAMERA_DISTANCE) {
      handoffFired = true;
      const { lat, lon } = cameraDirectionToLatLon(camera.position);
      dispatch('requestZoomIn', { lat, lon, leafletZoom: HANDOFF_LEAFLET_ZOOM });
    }
  };

  const clearIdleRotationTimeout = (): void => {
    if (idleRotationTimeout !== null) {
      window.clearTimeout(idleRotationTimeout);
      idleRotationTimeout = null;
    }
  };

  const scheduleIdleAutoRotate = (): void => {
    if (!browser || !controls || userHasInteracted) return;

    clearIdleRotationTimeout();
    idleRotationTimeout = window.setTimeout(() => {
      if (!userHasInteracted && controls) {
        controls.autoRotate = true;
      }
    }, globeModules.GLOBE_CONFIG.idleAutoRotateDelayMs);
  };

  const stopAutoRotate = (): void => {
    clearIdleRotationTimeout();
    if (controls) {
      controls.autoRotate = false;
    }
  };

  const handleUserInteractionStart = (): void => {
    userHasInteracted = true;
    stopAutoRotate();
  };

  const setupIdleAutoRotate = (): void => {
    if (!controls) return;

    controls.addEventListener('start', handleUserInteractionStart);
    scheduleIdleAutoRotate();
  };

  const handleResize = (): void => {
    if (!camera || !renderer || !containerElement) return;
    const width = containerElement.clientWidth;
    const height = containerElement.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };

  $: if (browser && markerGroup && globeModules && !modeSwitching) {
    if (animationMode) {
      if (!animator || !animator.getState().isPlaying) {
        globeModules.clearAllMarkers(markerGroup);
        animator?.reset();
      }
    } else {
      modeSwitching = true;
      globeModules.clearAllMarkers(markerGroup);
      animator?.pause();
      addAllMarkersStatic();
      modeSwitching = false;
    }
  }

  onMount(() => {
    if (browser) {
      initializeGlobe();
    }
  });

  onDestroy(() => {
    destroyed = true;
    if (!browser) return;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    clearIdleRotationTimeout();
    window.removeEventListener('resize', handleResize);
    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }
    if (tileTextureLoader) {
      tileTextureLoader.dispose();
    }
    if (tileRendererInstance) {
      tileRendererInstance.dispose();
    }
    if (controls) {
      controls.removeEventListener('start', handleUserInteractionStart);
      controls.dispose();
    }
  });
</script>

<div class="globe-container" bind:this={containerElement}>
  <div class="overlay-container" bind:this={overlayElement}></div>
</div>

<style>
  .globe-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    cursor: grab;
  }

  .globe-container:active {
    cursor: grabbing;
  }

  .overlay-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10;
  }

  :global(.globe-container canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
</style>
