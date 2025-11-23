import React, { useState, useEffect } from 'react';
import PhotoGrid from './components/PhotoGrid';
import PhotoDetail from './components/PhotoDetail';
import MapView from './components/MapView';
import Collections from './components/Collections';
import Locations from './components/Locations';
import LocationDetail from './components/LocationDetail';
import LocationsMapView from './components/LocationsMapView';
import WordPressSettings from './components/WordPressSettings';

function App() {
  const [photos, setPhotos] = useState([]);
  const [collections, setCollections] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('grid'); // grid, map, locations
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWpSettings, setShowWpSettings] = useState(false);

  useEffect(() => {
    loadPhotos();
    loadCollections();
    loadLocations();
  }, []);

  const loadPhotos = async () => {
    try {
      const allPhotos = await window.electron.getPhotos();
      setPhotos(allPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async () => {
    try {
      const allCollections = await window.electron.getCollections();
      setCollections(allCollections);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const allLocations = await window.electron.getLocations();
      setLocations(allLocations);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleImportPhotos = async () => {
    try {
      const importedPhotos = await window.electron.selectPhotos();
      if (importedPhotos.length > 0) {
        await loadPhotos();
      }
    } catch (error) {
      console.error('Error importing photos:', error);
    }
  };

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
  };

  const handleCloseDetail = () => {
    setSelectedPhoto(null);
  };

  const handlePhotoUpdate = async (photoId, updates) => {
    try {
      await window.electron.updatePhoto(photoId, updates);
      await loadPhotos();
      // Update selected photo if it's the one being updated
      if (selectedPhoto && selectedPhoto.id === photoId) {
        const updatedPhoto = await window.electron.getPhoto(photoId);
        setSelectedPhoto(updatedPhoto);
      }
    } catch (error) {
      console.error('Error updating photo:', error);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (confirm('Are you sure you want to delete this photo from the database?')) {
      try {
        await window.electron.deletePhoto(photoId);
        await loadPhotos();
        handleCloseDetail();
      } catch (error) {
        console.error('Error deleting photo:', error);
      }
    }
  };

  const handleCreateCollection = async (name, description) => {
    try {
      await window.electron.createCollection(name, description);
      await loadCollections();
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  const handleDeleteCollection = async (collectionId) => {
    if (confirm('Are you sure you want to delete this collection?')) {
      try {
        await window.electron.deleteCollection(collectionId);
        await loadCollections();
        if (selectedCollection === collectionId) {
          setSelectedCollection(null);
        }
      } catch (error) {
        console.error('Error deleting collection:', error);
      }
    }
  };

  const handleAddToCollection = async (photoId, collectionId) => {
    try {
      await window.electron.addPhotoToCollection(photoId, collectionId);
      await loadPhotos();
    } catch (error) {
      console.error('Error adding photo to collection:', error);
    }
  };

  const handleRemoveFromCollection = async (photoId, collectionId) => {
    try {
      await window.electron.removePhotoFromCollection(photoId, collectionId);
      await loadPhotos();
    } catch (error) {
      console.error('Error removing photo from collection:', error);
    }
  };

  // Location handlers
  const handleCreateLocation = async (locationData) => {
    try {
      await window.electron.createLocation(locationData);
      await loadLocations();
    } catch (error) {
      console.error('Error creating location:', error);
    }
  };

  const handleUpdateLocation = async (locationId, updates) => {
    try {
      await window.electron.updateLocation(locationId, updates);
      await loadLocations();
      // Update selected location if it's the one being updated
      if (selectedLocation && selectedLocation.id === locationId) {
        const updatedLocation = await window.electron.getLocation(locationId);
        setSelectedLocation(updatedLocation);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleDeleteLocation = async (locationId) => {
    try {
      await window.electron.deleteLocation(locationId);
      await loadLocations();
      if (selectedLocation?.id === locationId) {
        setSelectedLocation(null);
      }
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
  };

  const displayPhotos = selectedCollection
    ? photos.filter(async (photo) => {
        const photoCollections = await window.electron.getPhotoCollections(photo.id);
        return photoCollections.some(c => c.id === selectedCollection);
      })
    : photos;

  const photosWithLocation = photos.filter(p => p.latitude && p.longitude);
  const locationsWithCoords = locations.filter(l => l.latitude && l.longitude);

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Memorable</h1>
        <div className="flex gap-2">
          <button className="secondary" onClick={() => setShowWpSettings(true)}>WordPress</button>
          <button onClick={handleImportPhotos}>Import Photos</button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <Collections
            collections={collections}
            selectedCollection={selectedCollection}
            onSelectCollection={setSelectedCollection}
            onCreateCollection={handleCreateCollection}
            onDeleteCollection={handleDeleteCollection}
          />

          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <Locations
              locations={locations}
              selectedLocation={selectedLocation}
              onSelectLocation={handleSelectLocation}
              onCreateLocation={handleCreateLocation}
              onDeleteLocation={handleDeleteLocation}
            />
          </div>
        </aside>

        <main className="main-content">
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'grid' ? 'active' : ''}`}
              onClick={() => setActiveTab('grid')}
            >
              Photos ({photos.length})
            </button>
            <button
              className={`nav-tab ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              Photo Map ({photosWithLocation.length})
            </button>
            <button
              className={`nav-tab ${activeTab === 'locations' ? 'active' : ''}`}
              onClick={() => setActiveTab('locations')}
            >
              Locations ({locationsWithCoords.length})
            </button>
          </nav>

          {activeTab === 'grid' && (
            <PhotoGrid
              photos={photos}
              onPhotoClick={handlePhotoClick}
              selectedCollection={selectedCollection}
              collections={collections}
              onRefresh={loadPhotos}
            />
          )}

          {activeTab === 'map' && (
            <MapView
              photos={photosWithLocation}
              onPhotoClick={handlePhotoClick}
            />
          )}

          {activeTab === 'locations' && (
            <LocationsMapView
              locations={locations}
              onLocationClick={handleSelectLocation}
            />
          )}
        </main>
      </div>

      {selectedPhoto && (
        <PhotoDetail
          photo={selectedPhoto}
          collections={collections}
          onClose={handleCloseDetail}
          onUpdate={handlePhotoUpdate}
          onDelete={handleDeletePhoto}
          onAddToCollection={handleAddToCollection}
          onRemoveFromCollection={handleRemoveFromCollection}
        />
      )}

      {showWpSettings && (
        <WordPressSettings onClose={() => setShowWpSettings(false)} />
      )}

      {selectedLocation && (
        <LocationDetail
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          onUpdate={handleUpdateLocation}
          onDelete={handleDeleteLocation}
        />
      )}
    </div>
  );
}

export default App;
