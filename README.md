# Memorable - Photo Management Application

A powerful desktop application for managing, organizing, and exploring your photo collection with metadata editing, map visualization, and collection management.

## Features

### Photo Management
- **Photo Import & Management**: Import photos and automatically extract EXIF metadata
- **Photo Grid with Date Navigation**:
  - Square thumbnail display with adjustable size slider (100px-400px)
  - Photos grouped by month/year with date headers
  - Timeline sidebar for quick navigation to specific dates
- **Multi-Select Operations**: Select multiple photos for bulk actions:
  - Add/remove from collections
  - Delete multiple photos
  - Set location for multiple photos at once
- **Metadata Editing**: Edit and extend photo metadata including:
  - Date taken
  - GPS coordinates (latitude/longitude)
  - Location name (place, restaurant, attraction)
  - Camera information (make, model, lens)
  - Camera settings (focal length, aperture, ISO, shutter speed)
  - Rating system (1-5 stars)
  - Custom notes
  - Custom metadata fields (key-value pairs)

### Location Features
- **Reverse Geocoding**: Look up address and place names from photo GPS coordinates
- **Nearby Places Search**: Find restaurants, attractions, and POIs near photo location using OpenStreetMap data
- **Set Location**: Manually set GPS coordinates and location name for photos (supports pasting from Google Maps)
- **Open in Maps**: Quick link to view photo location in Google Maps

### Map View
- Visualize photos with GPS coordinates on an interactive map using OpenStreetMap
- Click markers to preview photos and access details

### Collections
- Create and manage collections to organize photos (e.g., trips, events, restaurants)
- Bulk add/remove photos from collections

### WordPress Integration
- **Publish to WordPress**: Create blog posts with photo galleries directly from the app
- **Media Upload**: Automatically upload photos to WordPress media library with:
  - Caption set to photo date
  - Description set to location information
- **Gutenberg Gallery**: Creates native WordPress Gallery blocks
- **Post Options**:
  - Title and content
  - Categories and tags
  - Featured image selection
  - Draft/Publish status
- **Custom Fields**: Support for Smart Custom Fields plugin (Lat/Lon fields)

### Other Features
- **EXIF Write-back**: Write metadata from the database back to photo files (JPEG only)
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Technology Stack

All technologies used are free and open source:

- **Electron**: Desktop application framework
- **React**: Frontend UI framework
- **Vite**: Build tool and development server
- **SQLite (sql.js)**: Local database for metadata storage (WebAssembly-based)
- **exifr**: EXIF metadata reading
- **piexifjs**: EXIF metadata writing
- **Leaflet**: Open-source map library
- **React-Leaflet**: React components for Leaflet maps
- **OpenStreetMap**: Free map tiles
- **Nominatim API**: Reverse geocoding (address lookup from coordinates)
- **Overpass API**: Nearby places search (POIs from OpenStreetMap data)
- **WordPress REST API**: Blog publishing integration

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
  - Use the size slider to adjust thumbnail size
  - Photos are grouped by month/year
  - Use the timeline sidebar on the right to jump to specific dates
- **Map View**: See photos with GPS coordinates plotted on an interactive map
- Click any photo to open the detailed view

### Multi-Select Operations

1. Click "Select" button in the toolbar to enter selection mode
2. Click photos to select/deselect them, or use "Select All"
3. Use the selection toolbar to:
   - **Add to Collection**: Add selected photos to a collection
   - **Remove from Collection**: Remove from current collection
   - **Set Location**: Set GPS coordinates for all selected photos
   - **Publish to WP**: Publish selected photos to WordPress
   - **Delete**: Remove selected photos from the database
4. Click "Cancel" to exit selection mode

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
   - Or use multi-select to add multiple photos at once
5. Click on a collection name to view only photos in that collection

### Location Lookup

For photos with GPS coordinates:

1. Open a photo in detail view
2. Click "Lookup Location" button
3. The app will:
   - Reverse geocode the coordinates to get the address
   - Search for nearby places (restaurants, attractions, etc.)
4. Select a place from the list to set as location name
5. Click "Open in Maps" to view the location in Google Maps

### Setting Location on Photos

To set GPS coordinates on photos without location data:

1. Enter selection mode and select photos
2. Click "Set Location" in the toolbar
3. Enter coordinates manually, or:
   - Open Google Maps in browser
   - Find and click on the location
   - Copy the coordinates from the URL or info panel
   - Click "Paste" or use the paste field in the dialog
4. Optionally enter a location name
5. Click "Set Location" to apply to all selected photos

### WordPress Integration

#### Initial Setup

1. Click "WordPress" button in the header
2. Enter your WordPress site details:
   - **Site URL**: Your WordPress site URL (e.g., https://example.com)
   - **Username**: Your WordPress username
   - **Application Password**: Generate one in WordPress under Users → Profile → Application Passwords
3. Click "Test Connection" to verify
4. Click "Save Settings"

#### Publishing Photos

1. Select photos you want to publish (use multi-select)
2. Click "Publish to WP" in the selection toolbar
3. Fill in the post details:
   - **Title**: Post title (required)
   - **Content**: Post content/description
   - **Categories**: Select from your WordPress categories
   - **Tags**: Add tags (type and press Enter)
   - **Featured Image**: Click a thumbnail to set as featured
   - **Lat/Lon**: Map coordinates for Smart Custom Fields plugin
   - **Status**: Draft or Publish
4. Click "Publish Now" or "Save as Draft"

The app will:
- Upload all photos to your WordPress media library
- Set caption to photo date, description to location info
- Create a post with a Gutenberg Gallery block
- Set the featured image and custom fields

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
- Photo metadata (file paths, EXIF data, ratings, notes, location names)
- Collections
- Photo-collection relationships
- Custom metadata fields

### WordPress Settings

WordPress connection settings are stored at:

- **Windows**: `%APPDATA%/memorable/wp-settings.json`
- **macOS**: `~/Library/Application Support/memorable/wp-settings.json`
- **Linux**: `~/.config/memorable/wp-settings.json`

**Note**: The application password is stored in plain text. Keep your system secure.

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
│       ├── PhotoGrid.jsx          # Photo grid with date navigation & multi-select
│       ├── PhotoDetail.jsx        # Photo detail/editor with location lookup
│       ├── MapView.jsx            # Map visualization
│       ├── Collections.jsx        # Collection sidebar
│       ├── WordPressSettings.jsx  # WordPress connection settings
│       └── WordPressPublish.jsx   # WordPress publishing dialog
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
- [sql.js](https://github.com/sql-js/sql.js) - SQLite compiled to WebAssembly
- [exifr](https://github.com/MikeKovarik/exifr)
- [piexifjs](https://github.com/hMatoba/piexifjs)
- [Leaflet](https://leafletjs.com/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Nominatim](https://nominatim.org/) - Reverse geocoding service
- [Overpass API](https://overpass-api.de/) - OpenStreetMap data queries
- [WordPress REST API](https://developer.wordpress.org/rest-api/)
