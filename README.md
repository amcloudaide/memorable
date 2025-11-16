# Memorable - Photo Management Application

A powerful desktop application for managing, organizing, and exploring your photo collection with metadata editing, map visualization, and collection management.

## Features

- **Photo Import & Management**: Import photos and automatically extract EXIF metadata
- **Metadata Editing**: Edit and extend photo metadata including:
  - Date taken
  - GPS coordinates (latitude/longitude)
  - Camera information (make, model, lens)
  - Camera settings (focal length, aperture, ISO, shutter speed)
  - Rating system (1-5 stars)
  - Custom notes
  - Custom metadata fields (key-value pairs)
- **Map View**: Visualize photos with GPS coordinates on an interactive map using OpenStreetMap
- **Collections**: Create and manage collections to organize photos (e.g., trips, events, restaurants)
- **EXIF Write-back**: Write metadata from the database back to photo files (JPEG only)
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Technology Stack

All technologies used are free and open source:

- **Electron**: Desktop application framework
- **React**: Frontend UI framework
- **Vite**: Build tool and development server
- **SQLite (better-sqlite3)**: Local database for metadata storage
- **exifr**: EXIF metadata reading
- **piexifjs**: EXIF metadata writing
- **Leaflet**: Open-source map library
- **React-Leaflet**: React components for Leaflet maps
- **OpenStreetMap**: Free map tiles

## Installation

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

### Setup

1. Navigate to the project directory:
```bash
cd memorable
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Development Mode

Run the application in development mode with hot reload:

```bash
npm run electron:dev
```

This will:
- Start the Vite development server
- Launch the Electron application
- Enable developer tools
- Support hot module replacement

### Production Build

Build the application for production:

```bash
npm run electron:build
```

This will create distributable packages in the `release` directory for your current platform.

## Usage Guide

### Importing Photos

1. Click the "Import Photos" button in the top-right corner
2. Select one or more photo files (JPEG, PNG, TIFF, etc.)
3. The application will:
   - Copy metadata to the SQLite database
   - Extract EXIF data (GPS, camera info, date taken, etc.)
   - Generate thumbnails for display

### Viewing Photos

- **Grid View**: Browse all photos in a grid layout
- **Map View**: See photos with GPS coordinates plotted on an interactive map
- Click any photo to open the detailed view

### Editing Metadata

1. Click on a photo to open the detail view
2. Click the "Edit" button in the Metadata section
3. Modify any fields:
   - Date taken
   - GPS coordinates
   - Rating (1-5 stars)
   - Notes
   - Camera information
   - Camera settings
4. Click "Save" to update the database

### Custom Metadata

Add your own custom metadata fields:

1. Open a photo in detail view
2. Scroll to the "Custom Metadata" section
3. Enter a key name and value
4. Click "Add"

Examples of custom metadata:
- Location: "Eiffel Tower"
- Event: "Birthday Party 2024"
- People: "John, Sarah"
- Weather: "Sunny"

### Collections

Organize photos into collections:

1. Click "New" in the Collections sidebar
2. Enter a name and optional description
3. Click "Create"
4. To add photos to a collection:
   - Open a photo in detail view
   - Check the collection(s) in the "Collections" section
5. Click on a collection name to view only photos in that collection

### Writing Metadata to EXIF

Write database metadata back to the original photo file:

1. Open a photo in detail view
2. Scroll to the "Actions" section
3. Click "Write Metadata to EXIF"
4. Confirm the action
5. A backup file (.backup) will be created automatically

**Note**: EXIF writing only works for JPEG files. Other formats are not supported by piexifjs.

### Map View

Photos with GPS coordinates (latitude/longitude) are displayed on the map:

- Click on a marker to see a photo preview
- Click "View Details" in the popup to open the full detail view
- The map uses OpenStreetMap tiles (free and open source)

## Data Storage

### Database

All metadata is stored in a SQLite database located at:

- **Windows**: `%APPDATA%/memorable/memorable.db`
- **macOS**: `~/Library/Application Support/memorable/memorable.db`
- **Linux**: `~/.config/memorable/memorable.db`

The database contains:
- Photo metadata (file paths, EXIF data, ratings, notes)
- Collections
- Photo-collection relationships
- Custom metadata fields

### Photo Files

Original photo files remain in their original locations. The application:
- Reads files from their current path
- Does NOT move or copy photo files
- Only modifies files when you explicitly use "Write Metadata to EXIF"

### Backups

When writing metadata to EXIF:
- A backup file is created with `.backup` extension
- The original file is preserved before modification
- Example: `photo.jpg` → `photo.jpg.backup`

## Supported File Formats

### Reading

The application can read metadata from:
- JPEG (.jpg, .jpeg)
- PNG (.png)
- TIFF (.tiff, .tif)
- WebP (.webp)
- HEIC (.heic)
- BMP (.bmp)
- GIF (.gif)

### Writing EXIF

EXIF metadata can only be written to:
- JPEG (.jpg, .jpeg)

This limitation is due to the piexifjs library, which only supports JPEG files.

## Development

### Project Structure

```
memorable/
├── electron/
│   ├── main.cjs          # Electron main process
│   └── preload.cjs       # Preload script (IPC bridge)
├── src/
│   ├── App.jsx           # Main React component
│   ├── main.jsx          # React entry point
│   ├── index.css         # Global styles
│   └── components/
│       ├── PhotoGrid.jsx     # Photo grid view
│       ├── PhotoDetail.jsx   # Photo detail/editor
│       ├── MapView.jsx       # Map visualization
│       └── Collections.jsx   # Collection sidebar
├── package.json
├── vite.config.js
└── index.html
```

### Database Schema

**photos** table:
- Stores all photo metadata
- Indexed on latitude/longitude and date_taken

**collections** table:
- Stores collection names and descriptions

**photo_collections** table:
- Many-to-many relationship between photos and collections

**custom_metadata** table:
- Stores user-defined metadata fields

### Available Scripts

```bash
npm run dev              # Run Vite dev server only
npm run build            # Build React app for production
npm run preview          # Preview production build
npm run electron:dev     # Run Electron app in development
npm run electron:build   # Build Electron app for distribution
```

## Troubleshooting

### Photos not appearing

- Ensure photo files still exist at their original paths
- Check that files have appropriate read permissions
- Try re-importing the photos

### Map not loading

- Ensure you have an internet connection (map tiles are fetched from OpenStreetMap)
- Check that photos have valid GPS coordinates (latitude/longitude)

### EXIF writing fails

- Ensure the file is JPEG format
- Check that you have write permissions for the file
- Verify the file is not corrupted
- The backup file ensures you can restore if needed

### Application won't start

- Ensure Node.js 18+ is installed
- Delete `node_modules` and run `npm install` again
- Check for error messages in the console

## License

MIT License - Feel free to use, modify, and distribute this application.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## Credits

Built with:
- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [exifr](https://github.com/MikeKovarik/exifr)
- [piexifjs](https://github.com/hMatoba/piexifjs)
- [Leaflet](https://leafletjs.com/)
- [OpenStreetMap](https://www.openstreetmap.org/)
