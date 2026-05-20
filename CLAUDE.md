# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun run dev` - Start development server
- `bun run build` - Create production build  
- `bun run preview` - Preview production build
- `bun run check` - Run Svelte type checking
- `bun run check:watch` - Run type checking in watch mode

### Data Structure

The application loads location data from JSON files in `src/lib/`:
- `places.json` - Cities visited (city markers)
- `ski.json` - Ski destinations (ski markers) 
- `mountains.json` - Hiking locations (hike markers)
- `lived.json` - Places lived (lived markers)

Each JSON file contains arrays of objects with: `City`, `Date`, `Latitude`, `Longitude`, and `Notes` fields.

### Animation Features

- Timeline sorts all locations chronologically by date
- Animation automatically pans and zooms (level 6) to each new location
- Markers fade in with smooth animation
- Timeline controls always visible at bottom with watercolor styling
- Auto-switches to timeline view when animation starts for better UX
- Toggle between static view (all markers) and timeline animation mode
- Helpful prompts guide users to start the timeline animation

### Styling

- Hand-drawn watercolor aesthetic using CSS custom properties
- Kalam and Caveat fonts for handwritten appearance
- Watercolor color palette with paper texture effects
- Hand-drawn button styles with subtle rotations and shadows

### Map Implementation

- Uses Stadia Maps watercolor tiles as the base layer
- Dynamically imports Leaflet in browser environment only
- Creates custom icons for different marker types (city, ski, hike, lived)
- Sets world bounds to prevent infinite panning
- Each marker shows popup with city name and date information

### Asset Organization

- Custom marker icons stored in `src/lib/` (city.png, ski.png, hike.png, lived.png, pin.png)
- Static assets in `static/` directory
- Leaflet CSS imported in LeafletMap component
