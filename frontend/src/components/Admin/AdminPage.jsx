import React, { useState, useRef, useMemo, useCallback } from 'react';
import './AdminPage.css';

let keyCounter = 0;
function nextKey() {
  keyCounter += 1;
  return `rect-${keyCounter}`;
}

/**
 * Parses raw SVG file text into:
 *  - markup:  serialized <svg> with width/height forced to 100% so it
 *             scales responsively inside its container
 *  - viewBox: the original (or inferred) viewBox, reused by the overlay
 *             so overlay coordinates always line up with the map
 *  - rects:   every <rect> found inside the SVG, with raw x/y/width/height
 */
function parseSvgFile(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'image/svg+xml');

  if (doc.querySelector('parsererror')) {
    throw new Error('The uploaded file is not a valid SVG.');
  }

  const svgEl = doc.querySelector('svg');
  if (!svgEl) {
    throw new Error('No <svg> root element found in the uploaded file.');
  }

  let viewBox = svgEl.getAttribute('viewBox');
  if (!viewBox) {
    const w = parseFloat(svgEl.getAttribute('width')) || 800;
    const h = parseFloat(svgEl.getAttribute('height')) || 600;
    viewBox = `0 0 ${w} ${h}`;
  }

  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', '100%');
  svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const rectEls = Array.from(doc.querySelectorAll('rect'));
  const rects = rectEls.map((rectEl) => ({
    key: nextKey(),
    x: parseFloat(rectEl.getAttribute('x')) || 0,
    y: parseFloat(rectEl.getAttribute('y')) || 0,
    width: parseFloat(rectEl.getAttribute('width')) || 0,
    height: parseFloat(rectEl.getAttribute('height')) || 0,
    roomNumber: null,
    roomName: null,
  }));

  const markup = new XMLSerializer().serializeToString(svgEl);

  return { markup, viewBox, rects };
}

export default function AdminPage() {
  const [markup, setMarkup] = useState('');
  const [viewBox, setViewBox] = useState('0 0 800 600');
  const [rects, setRects] = useState([]);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  // --- Student Testing section state (unchanged) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedRoom, setHighlightedRoom] = useState(null); // matched room key, or null

  // --- Save To Server state (new) ---
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null); // { type: 'success' | 'error', text: string }

  const mappedCount = rects.filter((r) => r.roomNumber).length;

  // Derived room map: { "C101": { x, y, width, height }, ... }
  const rooms = useMemo(() => {
    const result = {};
    rects.forEach((r) => {
      if (r.roomNumber) {
        result[r.roomNumber] = {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          ...(r.roomName ? { name: r.roomName } : {}),
        };
      }
    });
    return result;
  }, [rects]);

  const handleFileChange = useCallback((event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseSvgFile(reader.result);
        setMarkup(parsed.markup);
        setViewBox(parsed.viewBox);
        setRects(parsed.rects);
        setError('');
        setFileName(file.name);
        setHighlightedRoom(null); // new map — old highlight no longer applies
        setSearchTerm('');
      } catch (err) {
        setError(err.message || 'Failed to parse SVG file.');
        setMarkup('');
        setRects([]);
      }
    };
    reader.onerror = () => setError('Could not read the selected file.');
    reader.readAsText(file);
  }, []);

  const handleRectClick = useCallback(
    (rectKey) => {
      const target = rects.find((r) => r.key === rectKey);
      if (!target) return;

      // IMPORTANT: window.prompt must run OUTSIDE setRects.
      // React's StrictMode double-invokes state updater functions in
      // development to catch impure logic — if prompt() lived inside
      // setRects(prev => {...}), it would fire twice per click and
      // only the second answer would ever "stick".
      const numberMessage = target.roomNumber
        ? 'Edit room number (leave blank to unmap):'
        : 'Enter room number (e.g. C101, C205, LAB1):';

      const numberInput = window.prompt(numberMessage, target.roomNumber || '');
      if (numberInput === null) return; // user cancelled — leave unchanged

      const trimmedNumber = numberInput.trim();

      // Room name is optional. Only ask for it if a room number was
      // actually given (no point naming an unmapped rectangle).
      let trimmedName = '';
      if (trimmedNumber) {
        const nameInput = window.prompt(
          'Enter room name (optional — leave blank to skip):',
          target.roomName || ''
        );
        // nameInput === null means "cancel", which we treat the same
        // as "skip" rather than aborting the whole mapping.
        trimmedName = nameInput ? nameInput.trim() : '';
      }

      setRects((prev) =>
        prev.map((r) =>
          r.key === rectKey
            ? {
                ...r,
                roomNumber: trimmedNumber || null,
                roomName: trimmedNumber ? trimmedName || null : null,
              }
            : r
        )
      );
    },
    [rects]
  );

  // --- Student Testing handler (new) ---
  // Looks up the typed room number against the existing `rooms` map
  // (case-insensitive) and highlights it on the map, or alerts if missing.
  const handleFindRoom = useCallback(() => {
    const query = searchTerm.trim();
    if (!query) return;

    const matchedKey = Object.keys(rooms).find(
      (key) => key.toLowerCase() === query.toLowerCase()
    );

    if (matchedKey) {
      setHighlightedRoom(matchedKey);
    } else {
      setHighlightedRoom(null);
      window.alert('Room not found');
    }
  }, [searchTerm, rooms]);

  // --- Save To Server handler (new) ---
  // Saves the floor map (POST /floor-map) and every mapped room
  // (POST /rooms) to the FastAPI backend.
  const handleSaveToServer = useCallback(async () => {
    // Guard #1: ignore clicks while a save is already in flight —
    // this is the main protection against duplicate submissions
    // (e.g. a fast double-click before the button visually disables).
    if (isSaving) return;

    const trimmedBlock = block.trim();
    const trimmedFloor = floor.trim();

    if (!markup) {
      setSaveMessage({ type: 'error', text: 'Upload a floor map before saving.' });
      return;
    }
    if (!trimmedBlock || !trimmedFloor) {
      setSaveMessage({ type: 'error', text: 'Enter both Block and Floor before saving.' });
      return;
    }
    if (!Number.isInteger(Number(trimmedFloor))) {
      setSaveMessage({ type: 'error', text: 'Floor must be a whole number (e.g. 1, 2, 3).' });
      return;
    }
    if (mappedCount === 0) {
      setSaveMessage({ type: 'error', text: 'Map at least one room before saving.' });
      return;
    }

    const floorNumber = Number(trimmedFloor);
    const API_BASE = 'http://localhost:8000';

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // 1. Save the floor map
      const floorMapRes = await fetch(`${API_BASE}/floor-map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block: trimmedBlock,
          floor: floorNumber,
          svgContent: markup,
        }),
      });

      if (!floorMapRes.ok) {
        const body = await floorMapRes.json().catch(() => ({}));
        throw new Error(body.detail || 'Failed to save the floor map.');
      }

      // 2. Save every mapped room
      const roomsToSave = rects.filter((r) => r.roomNumber);

      const roomResults = await Promise.all(
        roomsToSave.map((r) =>
          fetch(`${API_BASE}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomNo: r.roomNumber,
              block: trimmedBlock,
              floor: floorNumber,
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
            }),
          })
            .then(async (res) => {
              if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.detail || `Failed to save room ${r.roomNumber}`);
              }
              return { roomNumber: r.roomNumber, ok: true };
            })
            .catch((err) => ({ roomNumber: r.roomNumber, ok: false, error: err.message }))
        )
      );

      const failed = roomResults.filter((r) => !r.ok);

      if (failed.length === 0) {
        setSaveMessage({
          type: 'success',
          text: `Saved successfully: floor map + ${roomResults.length} room(s).`,
        });
      } else {
        const failedList = failed.map((f) => f.roomNumber).join(', ');
        setSaveMessage({
          type: 'error',
          text: `Floor map saved, but ${failed.length} room(s) failed: ${failedList}`,
        });
      }
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err.message || 'Something went wrong while saving to the server.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, block, floor, markup, mappedCount, rects]);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(rooms, null, 2);

    // eslint-disable-next-line no-console
    console.log(json);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rooms.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rooms]);

  const handleReset = useCallback(() => {
    setMarkup('');
    setRects([]);
    setError('');
    setFileName('');
    setHighlightedRoom(null);
    setSearchTerm('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Campus Navigation — Admin</h1>
        <p className="admin-subtitle">
          Upload a floor map SVG, click each room rectangle, and assign a room number (room name optional).
        </p>
      </header>

      <div className="admin-toolbar">
        <label className="upload-button">
          Upload SVG Floor Map
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            onChange={handleFileChange}
          />
        </label>

        {fileName && <span className="file-name">{fileName}</span>}

        {markup && (
          <button type="button" className="secondary-button" onClick={handleReset}>
            Clear Map
          </button>
        )}

        <input
          type="text"
          className="block-input"
          placeholder="Block (e.g. A)"
          value={block}
          onChange={(e) => setBlock(e.target.value)}
        />
        <input
          type="number"
          className="floor-input"
          placeholder="Floor (e.g. 1)"
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
        />

        <button
          type="button"
          className="save-server-button"
          onClick={handleSaveToServer}
          disabled={isSaving || !markup || mappedCount === 0}
        >
          {isSaving ? 'Saving…' : 'Save To Server'}
        </button>

        <button
          type="button"
          className="export-button"
          onClick={handleExport}
          disabled={mappedCount === 0}
        >
          Export JSON
        </button>
      </div>

      {saveMessage && (
        <div
          className={
            saveMessage.type === 'success' ? 'admin-success' : 'admin-error'
          }
        >
          {saveMessage.text}
        </div>
      )}

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-body">
        <div className="map-panel">
          {markup ? (
            <div className="map-stage">
              <div
                className="map-background"
                dangerouslySetInnerHTML={{ __html: markup }}
              />
              <svg
                className="map-overlay"
                viewBox={viewBox}
                preserveAspectRatio="xMidYMid meet"
              >
                {rects.map((r) => (
                  <g key={r.key}>
                    <rect
                      x={r.x}
                      y={r.y}
                      width={r.width}
                      height={r.height}
                      className={
                        r.roomNumber ? 'room-rect room-rect-mapped' : 'room-rect'
                      }
                      onClick={() => handleRectClick(r.key)}
                    >
                      <title>
                        {r.roomNumber
                          ? r.roomName
                            ? `${r.roomNumber} — ${r.roomName}`
                            : r.roomNumber
                          : 'Click to assign a room number'}
                      </title>
                    </rect>
                    {r.roomNumber && (
                      <text
                        x={r.x + r.width / 2}
                        y={r.y + r.height / 2}
                        className="room-label"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        onClick={() => handleRectClick(r.key)}
                      >
                        {r.roomNumber}
                      </text>
                    )}
                  </g>
                ))}

                {/* Student Testing highlight — rendered last so it
                    paints on top of every other rect/text above */}
                {highlightedRoom && rooms[highlightedRoom] && (
                  <rect
                    x={rooms[highlightedRoom].x}
                    y={rooms[highlightedRoom].y}
                    width={rooms[highlightedRoom].width}
                    height={rooms[highlightedRoom].height}
                    className="room-highlight"
                  >
                    <title>{highlightedRoom}</title>
                  </rect>
                )}
              </svg>
            </div>
          ) : (
            <div className="map-placeholder">
              No SVG uploaded yet. Use the button above to choose a floor map file.
            </div>
          )}
        </div>

        <div className="json-panel">
          <div className="json-panel-header">
            <h2>Mapped Rooms</h2>
            <span className="room-count">
              {mappedCount} / {rects.length} mapped
            </span>
          </div>
          <pre className="json-preview">{JSON.stringify(rooms, null, 2)}</pre>
        </div>
      </div>

      {/* --- Student Testing section (new) --- */}
      <section className="student-section">
        <h2>Student Testing</h2>
        <p className="student-subtitle">
          For testing only — search a room number to highlight it on the map above.
        </p>
        <div className="student-search-row">
          <input
            type="text"
            className="student-search-input"
            placeholder="e.g. C101"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFindRoom();
            }}
          />
          <button type="button" className="find-room-button" onClick={handleFindRoom}>
            Find Room
          </button>
        </div>
      </section>
    </div>
  );
}