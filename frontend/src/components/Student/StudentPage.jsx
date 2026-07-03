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
// which entries are source/destination matches — so we can skip
// drawing them twice (once gray, once colored).
function isSameRect(a, b) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

// True if `room` matches ANY entry in `list` by coordinates.
function matchesAny(room, list) {
  return list.some((entry) => isSameRect(room, entry));
}

export default function StudentPage() {
  const [sourceInput, setSourceInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Holds everything needed to render the map once navigation succeeds.
  const [mapData, setMapData] = useState(null);
  // Shape: { markup, viewBox, rooms: [...every room on the floor...],
  //          sourceRooms: [...ALL matches...], destinationRooms: [...ALL matches...] }

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
      // 1. Fetch ALL rooms matching source and ALL rooms matching
      //    destination via /navigate. A name search like "Toilets" or
      //    "Lift" can legitimately return more than one room — the
      //    backend returns arrays specifically so none of those
      //    duplicates get silently dropped.
      const navigateRes = await fetch(
        `${API_BASE}/navigate?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`
      );

      if (!navigateRes.ok) {
        const body = await navigateRes.json().catch(() => ({}));
        throw new Error(body.detail || 'One or both rooms were not found.');
      }

      const { source: sourceMatches, destination: destinationMatches } = await navigateRes.json();

      // MVP assumption: everything highlighted lives on the same
      // block + floor, so a single floor map covers all of it. Use
      // the first source match as the canonical floor, and keep only
      // the matches (from either array) that are actually on it —
      // this guards against a name search spanning multiple floors.
    




      const { block, floor } = sourceMatches[0];

      const sourceRooms = sourceMatches.filter((r) => r.block === block && r.floor === floor);
      const destinationRooms = destinationMatches.filter(
        (r) => r.block === block && r.floor === floor
      );

      if (sourceRooms.length === 0 || destinationRooms.length === 0) {
        throw new Error(
          'Source and destination are on different blocks/floors — cross-floor navigation is not supported yet.'
        );
      }

      // 2. Fetch every room on that floor, so the whole map can be drawn.
      const roomsRes = await fetch(
        `${API_BASE}/rooms?block=${encodeURIComponent(block)}&floor=${floor}`
      );

      if (!roomsRes.ok) {
        const body = await roomsRes.json().catch(() => ({}));
        throw new Error(body.detail || 'Failed to load rooms for this floor.');
      }

      const allRooms = await roomsRes.json();

      // 3. Fetch the floor map SVG covering this block/floor.
      const floorMapRes = await fetch(
        `${API_BASE}/floor-map/${encodeURIComponent(block)}/${floor}`
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
        sourceRooms,
        destinationRooms,
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
          (e.g. Computer Lab, Toilets) — to see the full floor map with every match
          highlighted.
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
              {/* Every room on the floor, drawn light gray. Any room
                  that matches a source or destination result (there
                  may be several of each) is skipped here and drawn
                  separately below in color, so it isn't drawn twice. */}
              {mapData.rooms
                .filter(
                  (room) =>
                    !matchesAny(room, mapData.sourceRooms) &&
                    !matchesAny(room, mapData.destinationRooms)
                )
                .map((room, idx) => (
                  <g key={`gray-${room.x}-${room.y}-${idx}`}>
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

              {/* Source highlight(s) — red. Drawn after the gray rooms
                  so they're on top. Every matching room gets its own
                  rect + label, e.g. both "Toilets" if there are two. */}
              {mapData.sourceRooms.map((room, idx) => (
                <g key={`source-${room.x}-${room.y}-${idx}`}>
                  <rect
                    x={room.x}
                    y={room.y}
                    width={room.width}
                    height={room.height}
                    className="highlight-source"
                  >
                    <title>{`Source: ${room.roomNumbers.join(' / ')}`}</title>
                  </rect>
                  <RoomLabel
                    x={room.x}
                    y={room.y}
                    width={room.width}
                    height={room.height}
                    roomNumbers={room.roomNumbers}
                    roomName={room.roomName}
                    numberClassName="highlight-source-label-number"
                    nameClassName="highlight-source-label-name"
                  />
                </g>
              ))}

              {/* Destination highlight(s) — green. Same idea: every
                  matching room is highlighted, not just the first. */}
              {mapData.destinationRooms.map((room, idx) => (
                <g key={`destination-${room.x}-${room.y}-${idx}`}>
                  <rect
                    x={room.x}
                    y={room.y}
                    width={room.width}
                    height={room.height}
                    className="highlight-destination"
                  >
                    <title>{`Destination: ${room.roomNumbers.join(' / ')}`}</title>
                  </rect>
                  <RoomLabel
                    x={room.x}
                    y={room.y}
                    width={room.width}
                    height={room.height}
                    roomNumbers={room.roomNumbers}
                    roomName={room.roomName}
                    numberClassName="highlight-destination-label-number"
                    nameClassName="highlight-destination-label-name"
                  />
                </g>
              ))}
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