import React, { useState, useCallback } from 'react';
import { parseSvgMarkup } from '../../utils/svgUtils';
import './StudentPage.css';

// Adjust this for your bundler/deployment:
//   Create React App -> process.env.REACT_APP_API_BASE
//   Vite              -> import.meta.env.VITE_API_BASE
const API_BASE = 'http://localhost:8000';

export default function StudentPage() {
  const [sourceInput, setSourceInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Holds everything needed to render the map once navigation succeeds.
  const [mapData, setMapData] = useState(null);
  // Shape: { markup, viewBox, source: {roomNo,x,y,width,height}, destination: {...} }

  const handleNavigate = useCallback(async () => {
    const source = sourceInput.trim();
    const destination = destinationInput.trim();

    if (!source || !destination) {
      setError('Please enter both a source and a destination room.');
      return;
    }

    setLoading(true);
    setError('');
    setMapData(null);

    try {
      // 1. Fetch both rooms via /navigate
      const navigateRes = await fetch(
        `${API_BASE}/navigate?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`
      );

      if (!navigateRes.ok) {
        const body = await navigateRes.json().catch(() => ({}));
        throw new Error(body.detail || 'One or both rooms were not found.');
      }

      const { source: sourceRoom, destination: destinationRoom } = await navigateRes.json();

      // MVP assumption: source and destination live on the same
      // block + floor, so a single floor map covers both highlights.
      // (No multi-floor/multi-block stitching yet — that's a later step.)
      if (sourceRoom.block !== destinationRoom.block || sourceRoom.floor !== destinationRoom.floor) {
        throw new Error(
          'Source and destination are on different blocks/floors — cross-floor navigation is not supported yet.'
        );
      }

      // 2. Fetch the floor map covering both rooms
      const floorMapRes = await fetch(
        `${API_BASE}/floor-map/${encodeURIComponent(sourceRoom.block)}/${sourceRoom.floor}`
      );

      if (!floorMapRes.ok) {
        const body = await floorMapRes.json().catch(() => ({}));
        throw new Error(body.detail || 'Floor map not found for this block/floor.');
      }

      const floorMap = await floorMapRes.json();
      const { markup, viewBox } = parseSvgMarkup(floorMap.svgContent);

      setMapData({
        markup,
        viewBox,
        source: sourceRoom,
        destination: destinationRoom,
      });
    } catch (err) {
      setError(err.message || 'Something went wrong while navigating.');
    } finally {
      setLoading(false);
    }
  }, [sourceInput, destinationInput]);

  return (
    <div className="student-page">
      <header className="student-header">
        <h1>Campus Navigation — Find My Way</h1>
        <p className="student-page-subtitle">
          Enter a source and destination room to see them highlighted on the map.
        </p>
      </header>

      <div className="student-page-search-row">
        <input
          type="text"
          className="student-page-input"
          placeholder="Source room (e.g. A101)"
          value={sourceInput}
          onChange={(e) => setSourceInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNavigate();
          }}
        />
        <input
          type="text"
          className="student-page-input"
          placeholder="Destination room (e.g. A111)"
          value={destinationInput}
          onChange={(e) => setDestinationInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNavigate();
          }}
        />
        <button
          type="button"
          className="navigate-button"
          onClick={handleNavigate}
          disabled={loading}
        >
          {loading ? 'Navigating…' : 'Navigate'}
        </button>
      </div>

      {error && <div className="student-page-error">{error}</div>}

      <div className="student-map-panel">
        {mapData ? (
          <div className="student-map-stage">
            <div
              className="student-map-background"
              dangerouslySetInnerHTML={{ __html: mapData.markup }}
            />
            <svg
              className="student-map-overlay"
              viewBox={mapData.viewBox}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Source highlight — red */}
              <rect
                x={mapData.source.x}
                y={mapData.source.y}
                width={mapData.source.width}
                height={mapData.source.height}
                className="highlight-source"
              >
                <title>{`Source: ${mapData.source.roomNo}`}</title>
              </rect>
              <text
                x={mapData.source.x + mapData.source.width / 2}
                y={mapData.source.y + mapData.source.height / 2}
                className="highlight-label highlight-label-source"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {mapData.source.roomNo}
              </text>

              {/* Destination highlight — green */}
              <rect
                x={mapData.destination.x}
                y={mapData.destination.y}
                width={mapData.destination.width}
                height={mapData.destination.height}
                className="highlight-destination"
              >
                <title>{`Destination: ${mapData.destination.roomNo}`}</title>
              </rect>
              <text
                x={mapData.destination.x + mapData.destination.width / 2}
                y={mapData.destination.y + mapData.destination.height / 2}
                className="highlight-label highlight-label-destination"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {mapData.destination.roomNo}
              </text>
            </svg>
          </div>
        ) : (
          <div className="student-map-placeholder">
            {loading ? 'Loading map…' : 'Enter rooms above and click Navigate to see the map.'}
          </div>
        )}
      </div>
    </div>
  );
}