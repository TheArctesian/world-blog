<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import type { LocationData } from '../marker/types.js';
  import { MARKER_CONFIGS } from '../marker/markerConfig.js';
  import { createTimeline } from '../timeline/timelineBuilder.js';
  import { TimelineAnimator } from '../timeline/animator.js';
  import type { TimelineEntry, AnimationState } from '../timeline/types.js';
  import AnimationControls from '../timeline/AnimationControls.svelte';

  import places from '../data/places.json';
  import ski from '../data/ski.json';
  import hike from '../data/mountains.json';
  import lived from '../data/lived.json';

  const dispatch = createEventDispatcher<{
    switchToTimeline: void;
  }>();

  export let animationMode = false;

  let containerElement: HTMLDivElement;
  let overlayElement: HTMLDivElement;
  let animator: TimelineAnimator | null = null;
  let animationState: AnimationState;
  let modeSwitching = false;
  let destroyed = false;

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

  // Module references
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
      // Dynamic imports for browser-only
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

      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(config.backgroundColor);

      // Camera
      const aspect = containerElement.clientWidth / containerElement.clientHeight;
      camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
      const initialDirection = globeModules
        .latLonToVector3(config.initialFocusLat, config.initialFocusLon, 1)
        .normalize();
      camera.position.copy(initialDirection.multiplyScalar(config.initialCameraDistance));
      camera.lookAt(0, 0, 0);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(containerElement.clientWidth, containerElement.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerElement.appendChild(renderer.domElement);

      // Controls
      controls = globeModules.setupOrbitControls(camera, renderer.domElement);
      setupIdleAutoRotate();

      // Base sphere (background behind tiles, fills polar caps)
      const capGeometry = new THREE.SphereGeometry(config.radius * 0.998, 32, 32);
      const capMaterial = new THREE.MeshBasicMaterial({ color: '#b8d4e3' });
      const capSphere = new THREE.Mesh(capGeometry, capMaterial);
      capSphere.renderOrder = -1;
      scene.add(capSphere);

      // Tile system
      tileTextureLoader = new globeModules.TileTextureLoader();
      tileRendererInstance = new globeModules.TileRenderer(scene, tileTextureLoader, config.radius);

      // Markers group
      markerGroup = new THREE.Group();
      scene.add(markerGroup);

      // Initialize animation
      initializeAnimation();

      // Add static markers if not in animation mode
      if (!animationMode) {
        addAllMarkersStatic();
      }

      // Handle resize
      window.addEventListener('resize', handleResize);

      // Start render loop
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

  const initializeAnimation = (): void => {
    const timeline = createTimeline(
      places as LocationData[],
      ski as LocationData[],
      hike as LocationData[],
      lived as LocationData[]
    );

    animator = new TimelineAnimator(
      timeline,
      (state) => {
        animationState = state;
      },
      (entry: TimelineEntry) => {
        const iconUrl = MARKER_CONFIGS[entry.type]?.iconUrl;
        if (iconUrl && markerGroup && camera && controls && overlayElement) {
          globeModules.addAnimatedMarker(
            markerGroup, camera, controls, entry, iconUrl,
            overlayElement, projectToScreen
          );
        }
      }
    );

    animationState = animator.getState();
  };

  const renderLoop = (): void => {
    if (destroyed) return;

    animationFrameId = requestAnimationFrame(renderLoop);

    controls.update();

    // Update tiles based on camera distance
    const cameraDistance = camera.position.length();
    const zoom = globeModules.getZoomForDistance(cameraDistance);

    if (zoom !== lastZoom) {
      console.log('[globe] tile zoom', {
        zoom,
        previousZoom: lastZoom,
        cameraDistance
      });

      // Preserve in-flight requests during normal zoom transitions to avoid
      // visible placeholder flicker while orbit damping settles.
      if (lastZoom !== -1 && Math.abs(zoom - lastZoom) > 1) {
        tileTextureLoader.clearQueue();
      }
      lastZoom = zoom;
    }

    const tiles = globeModules.getVisibleTiles(camera, globeModules.GLOBE_CONFIG.radius, zoom);
    tileRendererInstance.updateTiles(tiles);
    tileRendererInstance.refreshTextures();

    // Update marker scales
    globeModules.updateMarkerScales(markerGroup, cameraDistance);

    renderer.render(scene, camera);
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

  const handlePlay = (): void => {
    if (!animationMode) {
      dispatch('switchToTimeline');
      requestAnimationFrame(() => startAnimation());
    } else {
      startAnimation();
    }
  };

  const startAnimation = (): void => {
    if (markerGroup && !animationMode) {
      globeModules.clearAllMarkers(markerGroup);
    }
    animator?.play();
  };

  const handlePause = (): void => {
    animator?.pause();
  };

  const handleReset = (): void => {
    if (markerGroup) {
      globeModules.clearAllMarkers(markerGroup);
      if (!animationMode) {
        addAllMarkersStatic();
      }
    }
    animator?.reset();
  };

  const handleSpeedChange = (event: CustomEvent<{ speed: number }>): void => {
    animator?.setSpeed(event.detail.speed);
  };

  $: if (browser && markerGroup && globeModules && !modeSwitching) {
    if (!animator) {
      initializeAnimation();
    }

    if (animationMode) {
      if (!animationState?.isPlaying) {
        globeModules.clearAllMarkers(markerGroup);
        if (animator) {
          animator.reset();
        }
      }
    } else {
      modeSwitching = true;
      globeModules.clearAllMarkers(markerGroup);
      if (animator) {
        animator.pause();
      }
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
    if (animator) {
      animator.destroy();
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

<main>
  <div class="globe-container" bind:this={containerElement}>
    <div class="overlay-container" bind:this={overlayElement}></div>
  </div>

  {#if animationState}
    <AnimationControls
      {animationState}
      isTimelineMode={animationMode}
      on:play={handlePlay}
      on:pause={handlePause}
      on:reset={handleReset}
      on:speedChange={handleSpeedChange}
    />
  {/if}
</main>

<style>
  main {
    position: relative;
    width: 100%;
    height: 100vh;
  }

  .globe-container {
    height: calc(100vh - 140px);
    width: 100vw;
    margin: 0;
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

  @media (max-width: 768px) {
    .globe-container {
      height: calc(100vh - 160px);
    }
  }

  @media (max-width: 480px) {
    .globe-container {
      height: calc(100vh - 180px);
    }
  }
</style>
