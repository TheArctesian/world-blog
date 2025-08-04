# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Create production build  
- `npm run preview` - Preview production build
- `npm run check` - Run Svelte type checking
- `npm run check:watch` - Run type checking in watch mode

## Architecture Overview

This is a SvelteKit application that displays an interactive world map showing places the author has visited, lived, or done activities. The application uses Leaflet.js for mapping functionality.

### Key Components

- **LeafletMap.svelte** (`src/lib/LeafletMap.svelte`) - Main map component that renders an interactive Leaflet map with multiple marker types
- **Info.svelte** (`src/lib/info.svelte`) - Information/legend component  
- **Popup.svelte** (`src/lib/Popup.svelte`) - Popup component (currently commented out)

### Data Structure

The application loads location data from JSON files in `src/lib/`:
- `places.json` - Cities visited (city markers)
- `ski.json` - Ski destinations (ski markers) 
- `mountains.json` - Hiking locations (hike markers)
- `lived.json` - Places lived (lived markers)

Each JSON file contains arrays of objects with: `City`, `Date`, `Latitude`, `Longitude`, and `Notes` fields.

### Map Implementation

- Uses Stadia Maps watercolor tiles as the base layer
- Dynamically imports Leaflet in browser environment only
- Creates custom icons for different marker types (city, ski, hike, lived)
- Sets world bounds to prevent infinite panning
- Each marker shows popup with city name and date information

### Asset Organization

- Custom marker icons stored in `src/lib/` (city.png, ski.png, hike.png, lived.png, pin.png)
- Static assets in `static/` directory
- Leaflet CSS imported both locally and from CDN in LeafletMap component