# Memorable - Development Context

## Quick Start

```bash
npm install
npm run electron:dev    # Development with hot reload
npm run electron:build  # Production build
```

## Tech Stack

- **Electron** - Desktop app framework
- **React 18** - UI (no TypeScript)
- **Vite** - Build tool
- **sql.js** - SQLite in WebAssembly (browser-compatible)
- **exifr** - EXIF metadata reading
- **piexifjs** - EXIF metadata writing (JPEG only)
- **Leaflet/React-Leaflet** - Maps with OpenStreetMap tiles

## Project Structure

```
electron/
  main.cjs        # Electron main process, IPC handlers, file operations
  preload.cjs     # IPC bridge between main and renderer

src/
  App.jsx         # Main React component, state management
  main.jsx        # React entry point
  index.css       # All styles (single CSS file)
  components/
    PhotoGrid.jsx        # Grid view with date grouping, multi-select
    PhotoDetail.jsx      # Detail view, metadata editing, location lookup
    MapView.jsx          # Leaflet map with photo markers
    Collections.jsx      # Collection sidebar
    WordPressSettings.jsx # WP connection config
    WordPressPublish.jsx  # WP publishing dialog
```

## Architecture

- **Main Process** (electron/main.cjs): File I/O, database operations via IPC
- **Renderer Process** (React): UI, calls main process via `window.electronAPI`
- **Database**: SQLite stored in user's app data directory

## Database Schema

Tables: `photos`, `collections`, `photo_collections`, `custom_metadata`

Key photo fields: `id`, `file_path`, `date_taken`, `latitude`, `longitude`, `location_name`, `rating`, `notes`, camera fields

## External APIs

- **Nominatim** - Reverse geocoding (address from coords)
- **Overpass** - POI search near coordinates
- **WordPress REST API** - Blog publishing

## Key Patterns

- All IPC calls go through `window.electronAPI.*`
- Photos remain in original locations (only metadata stored in DB)
- EXIF write creates `.backup` file before modifying

## Common Tasks

- **Add new metadata field**: Update DB schema in main.cjs, add UI in PhotoDetail.jsx
- **Add new IPC handler**: Add in main.cjs `ipcMain.handle()`, expose in preload.cjs
- **Styling**: All in src/index.css
