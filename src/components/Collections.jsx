import React, { useState } from 'react';

function Collections({ collections, selectedCollection, onSelectCollection, onCreateCollection, onDeleteCollection }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');

  const handleCreate = () => {
    if (newCollectionName.trim()) {
      onCreateCollection(newCollectionName, newCollectionDescription);
      setNewCollectionName('');
      setNewCollectionDescription('');
      setShowCreateForm(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Collections</h2>
        <button className="small" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'New'}
        </button>
      </div>

      {showCreateForm && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '0.375rem' }}>
          <input
            type="text"
            placeholder="Collection name"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            style={{ marginBottom: '0.5rem' }}
          />
          <textarea
            placeholder="Description (optional)"
            value={newCollectionDescription}
            onChange={(e) => setNewCollectionDescription(e.target.value)}
            style={{ marginBottom: '0.5rem', minHeight: '60px' }}
          />
          <button onClick={handleCreate} style={{ width: '100%' }}>Create</button>
        </div>
      )}

      <div
        className={`collection-item ${selectedCollection === null ? 'active' : ''}`}
        onClick={() => onSelectCollection(null)}
      >
        <div className="collection-name">All Photos</div>
      </div>

      <ul className="collection-list">
        {collections.map((collection) => (
          <li
            key={collection.id}
            className={`collection-item ${selectedCollection === collection.id ? 'active' : ''}`}
          >
            <div onClick={() => onSelectCollection(collection.id)}>
              <div className="collection-name">{collection.name}</div>
              {collection.description && (
                <div className="collection-count">{collection.description}</div>
              )}
            </div>
            {selectedCollection === collection.id && (
              <button
                className="danger small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCollection(collection.id);
                }}
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                Delete Collection
              </button>
            )}
          </li>
        ))}
      </ul>

      {collections.length === 0 && !showCreateForm && (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
          No collections yet. Click "New" to create one.
        </div>
      )}
    </div>
  );
}

export default Collections;
