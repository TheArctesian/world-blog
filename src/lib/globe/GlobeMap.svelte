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
  import { createPopupContent } from '../marker/staticMarkers.js';

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

  // Click tooltip state
  let raycaster: any;
  let pointerDownPos: { x: number; y: number } | null = null;
  const CLICK_DRAG_THRESHOLD_PX = 5;

  // Active tooltip (only one at a time)
  let activeTooltip: {
    element: HTMLDivElement;
    sprite: any;
    interval: ReturnType<typeof setInterval>;
  } | null = null;

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
        tileUtilsModule,
        starsModule
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
        import('./tileUtils.js'),
        import('./stars.js')
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

      const stars = starsModule.createStarfield();
      scene.add(stars);

      tileTextureLoader = new globeModules.TileTextureLoader();
      tileRendererInstance = new globeModules.TileRenderer(scene, tileTextureLoader, config.radius);

      markerGroup = new THREE.Group();
      scene.add(markerGroup);

      raycaster = new THREE.Raycaster();

      if (!animationMode) {
        addAllMarkersStatic();
      }

      renderer.domElement.addEventListener('pointerdown', handlePointerDown);
      renderer.domElement.addEventListener('pointerup', handlePointerUp);
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
      closeActiveTooltip();
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

  const handlePointerDown = (event: PointerEvent): void => {
    pointerDownPos = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: PointerEvent): void => {
    if (!pointerDownPos) return;
    const dx = event.clientX - pointerDownPos.x;
    const dy = event.clientY - pointerDownPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    pointerDownPos = null;
    if (dist > CLICK_DRAG_THRESHOLD_PX) return;
    handleCanvasClick(event);
  };

  const handleCanvasClick = (event: PointerEvent): void => {
    if (!raycaster || !camera || !markerGroup || !renderer) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const intersects = raycaster.intersectObjects(markerGroup.children, false);
    if (intersects.length === 0) {
      closeActiveTooltip();
      return;
    }
    const sprite = intersects[0].object;
    showTooltipForSprite(sprite);
  };

  const showTooltipForSprite = (sprite: any): void => {
    if (!overlayElement) return;
    closeActiveTooltip();

    const location = sprite.userData?.location;
    if (!location) return;
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'marker-tooltip marker-tooltip-globe';
    tooltipEl.innerHTML = `
      <button type="button" class="marker-tooltip-close" aria-label="Close">&times;</button>
      ${createPopupContent(location)}
    `;
    overlayElement.appendChild(tooltipEl);

    const closeBtn = tooltipEl.querySelector('.marker-tooltip-close');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeActiveTooltip();
    });

    const updatePosition = () => {
      if (!activeTooltip) return;
      const screen = projectToScreen(sprite.position);
      if (screen.visible) {
        tooltipEl.style.display = 'block';
        tooltipEl.style.left = `${screen.x}px`;
        tooltipEl.style.top = `${screen.y}px`;
      } else {
        tooltipEl.style.display = 'none';
      }
    };

    const interval = setInterval(updatePosition, 16);
    activeTooltip = { element: tooltipEl, sprite, interval };
    updatePosition();
  };

  const closeActiveTooltip = (): void => {
    if (!activeTooltip) return;
    clearInterval(activeTooltip.interval);
    activeTooltip.element.remove();
    activeTooltip = null;
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
    closeActiveTooltip();
    clearIdleRotationTimeout();
    window.removeEventListener('resize', handleResize);
    if (renderer) {
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
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

  :global(.overlay-container .marker-tooltip-globe) {
    position: absolute;
    pointer-events: auto;
    z-index: 200;
    transform: translate(-50%, calc(-100% - 14px));
  }
</style>
