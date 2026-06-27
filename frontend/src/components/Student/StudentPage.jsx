import React, { useState, useCallback } from 'react';
import { parseSvgMarkup } from '../../utils/svgUtils';
import RoomLabel from '../shared/RoomLabel';
import './StudentPage.css';

// Adjust this for your bundler/deployment:
//   Create React App -> process.env.REACT_APP_API_BASE
//   Vite              -> import.meta.env.VITE_API_BASE
const API_BASE = 'http://localhost:8000';

// Two rooms are considered "the same rectangle" if their coordinates
// match exactly. This is how we recognize, inside the full room list,
// which entry is the source and which is the destination — so we can
// skip drawing them twice (once gray, once colored).
function isSameRect(a, b) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export default function StudentPage() {
  const [sourceInput, setSourceInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Holds everything needed to render the map once navigation succeeds.
  const [mapData, setMapData] = useState(null);
  // Shape: { markup, viewBox, rooms: [...every room on the floor...], source, destination }

  const handleNavigate = useCallback(async () => {
    const source = sourceInput.trim();
    const destination = destinationInput.trim();

    if (!source || !destination) {
      setError('Please enter both a source and a destination (room number or room name).');
      return;
    }

    setLoading(true);
    setError('');
    setMapData(null);

    try {
      // 1. Fetch both rooms via /navigate. The backend matches by
      //    EITHER room number or room name, case-insensitively, so
      //    either input style works here with no extra logic needed.
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
      if (sourceRoom.block !== destinationRoom.block || sourceRoom.floor !== destinationRoom.floor) {
        throw new Error(
          'Source and destination are on different blocks/floors — cross-floor navigation is not supported yet.'
        );
      }

      // 2. Fetch every room on that floor, so the whole map can be drawn.
      const roomsRes = await fetch(
        `${API_BASE}/rooms?block=${encodeURIComponent(sourceRoom.block)}&floor=${sourceRoom.floor}`
      );

      if (!roomsRes.ok) {
        const body = await roomsRes.json().catch(() => ({}));
        throw new Error(body.detail || 'Failed to load rooms for this floor.');
      }

      const allRooms = await roomsRes.json();

      // 3. Fetch the floor map SVG covering this block/floor.
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
        rooms: allRooms,
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
          Enter a source and destination — by room number (e.g. A101) or room name
          (e.g. Computer Lab) — to see the full floor map with both highlighted.
        </p>
      </header>

      <div className="student-page-search-row">
        <input
          type="text"
          className="student-page-input"
          placeholder="Source: room number or name"
          value={sourceInput}
          onChange={(e) => setSourceInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNavigate();
          }}
        />
        <input
          type="text"
          className="student-page-input"
          placeholder="Destination: room number or name"
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
              {/* Every room on the floor, drawn light gray. Source and
                  destination are skipped here and drawn separately
                  below (in color) so they aren't drawn twice. */}
              {mapData.rooms
                .filter(
                  (room) =>
                    !isSameRect(room, mapData.source) && !isSameRect(room, mapData.destination)
                )
                .map((room, idx) => (
                  <g key={`${room.x}-${room.y}-${idx}`}>
                    <rect
                      x={room.x}
                      y={room.y}
                      width={room.width}
                      height={room.height}
                      className="room-all"
                    >
                      <title>
                        {room.roomName
                          ? `${room.roomNumbers.join(' / ')} — ${room.roomName}`
                          : room.roomNumbers.join(' / ')}
                      </title>
                    </rect>
                    <RoomLabel
                      x={room.x}
                      y={room.y}
                      width={room.width}
                      height={room.height}
                      roomNumbers={room.roomNumbers}
                      roomName={room.roomName}
                      numberClassName="room-all-label-number"
                      nameClassName="room-all-label-name"
                    />
                  </g>
                ))}

              {/* Source highlight — red, drawn after the gray rooms so it's on top */}
              <rect
                x={mapData.source.x}
                y={mapData.source.y}
                width={mapData.source.width}
                height={mapData.source.height}
                className="highlight-source"
              >
                <title>{`Source: ${mapData.source.roomNumbers.join(' / ')}`}</title>
              </rect>
              <RoomLabel
                x={mapData.source.x}
                y={mapData.source.y}
                width={mapData.source.width}
                height={mapData.source.height}
                roomNumbers={mapData.source.roomNumbers}
                roomName={mapData.source.roomName}
                numberClassName="highlight-source-label-number"
                nameClassName="highlight-source-label-name"
              />

              {/* Destination highlight — green */}
              <rect
                x={mapData.destination.x}
                y={mapData.destination.y}
                width={mapData.destination.width}
                height={mapData.destination.height}
                className="highlight-destination"
              >
                <title>{`Destination: ${mapData.destination.roomNumbers.join(' / ')}`}</title>
              </rect>
              <RoomLabel
                x={mapData.destination.x}
                y={mapData.destination.y}
                width={mapData.destination.width}
                height={mapData.destination.height}
                roomNumbers={mapData.destination.roomNumbers}
                roomName={mapData.destination.roomName}
                numberClassName="highlight-destination-label-number"
                nameClassName="highlight-destination-label-name"
              />
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