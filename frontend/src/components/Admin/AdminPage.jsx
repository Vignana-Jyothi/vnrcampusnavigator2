import { useState, useRef, useMemo, useCallback } from 'react';
import RoomLabel from '../shared/RoomLabel';
import './AdminPage.css';
import { Navigate } from "react-router-dom";

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
    roomNumbers: null, // array of strings once mapped, e.g. ["A101", "A102"]
    roomName: null, // optional
  }));

  const markup = new XMLSerializer().serializeToString(svgEl);

  return { markup, viewBox, rects };
}

/**
 * Parses the comma-separated room-number input from a prompt into a
 * clean, de-duplicated array. "A101, a101, A102" -> ["A101", "A102"]
 * (first occurrence's casing wins; duplicates compared case-insensitively).
 */
function parseRoomNumbersInput(raw) {
  const seen = new Set();
  const result = [];
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((num) => {
      const lower = num.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(num);
      }
    });
  return result;
}

export default function AdminPage() {

   const isAdmin = localStorage.getItem("isAdmin");

  const [markup, setMarkup] = useState('');
  const [viewBox, setViewBox] = useState('0 0 800 600');
  const [rects, setRects] = useState([]);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  // --- Save To Server state ---
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null); // { type: 'success' | 'error', text: string }

  // Every rect that has at least one room number assigned.
  const mappedRects = useMemo(
    () => rects.filter((r) => r.roomNumbers && r.roomNumbers.length > 0),
    [rects]
  );
  const mappedCount = mappedRects.length;

  // The clean array shape used for the JSON preview, Export JSON, and
  // as the basis for each POST /rooms payload. Internal `key` is
  // stripped out since it's just a React tracking id, not real data.

  // const [rotatedRooms, setRotatedRooms] = useState({});

  // const handleRotate = (roomId) => {
  //   setRotatedRooms((prev) => ({
  //     ...prev,
  //     [roomId]: ((prev[roomId] || 0) + 90) % 360,
  //   }));
  // };



  const mappedRooms = useMemo(
    () =>
      mappedRects.map((r) => ({
        roomNumbers: r.roomNumbers,
        ...(r.roomName ? { roomName: r.roomName } : {}),
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      })),
    [mappedRects]
  );

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
        setSaveMessage(null);
      } catch (err) {
        setError(err.message || 'Failed to parse SVG file.');
        setMarkup('');
        setRects([]);
      }
    };
    reader.onerror = () => setError('Could not read the selected file.');
    reader.readAsText(file);
  }, []);

  // Shared edit flow used both by clicking a rectangle on the map and
  // by the "Edit" button in the Mapped Rooms list below.
  const handleEditRoom = useCallback(
    (rectKey) => {
      const target = rects.find((r) => r.key === rectKey);
      if (!target) return;

      // IMPORTANT: window.prompt must run OUTSIDE setRects.
      // React's StrictMode double-invokes state updater functions in
      // development to catch impure logic — if prompt() lived inside
      // setRects(prev => {...}), it would fire twice per click.
      const numbersMessage = target.roomNumbers
        ? 'Edit room number(s), comma separated (leave blank to unmap):'
        : 'Enter room number(s), comma separated (e.g. A101, A102):';

      const numbersInput = window.prompt(
        numbersMessage,
        target.roomNumbers ? target.roomNumbers.join(', ') : ''
      );
      if (numbersInput === null) return; // user cancelled — leave unchanged

      const parsedNumbers = parseRoomNumbersInput(numbersInput);

      // Blank input unmaps the rectangle entirely.
      if (parsedNumbers.length === 0) {
        setRects((prev) =>
          prev.map((r) =>
            r.key === rectKey ? { ...r, roomNumbers: null, roomName: null } : r
          )
        );
        return;
      }

      // Room name is optional.
      const nameInput = window.prompt(
        'Enter room name (optional — leave blank to skip):',
        target.roomName || ''
      );
      // Cancelling the name prompt just means "skip the name", not
      // "abort the whole edit" — the room numbers above already apply.
      const trimmedName = nameInput ? nameInput.trim() : '';

      setRects((prev) =>
        prev.map((r) =>
          r.key === rectKey
            ? { ...r, roomNumbers: parsedNumbers, roomName: trimmedName || null }
            : r
        )
      );
    },
    [rects]
  );

  // Explicit delete (used by the Mapped Rooms list's Delete button).
  const handleDeleteRoom = useCallback((rectKey) => {
    if (!window.confirm('Remove the room mapping for this rectangle?')) return;
    setRects((prev) =>
      prev.map((r) =>
        r.key === rectKey ? { ...r, roomNumbers: null, roomName: null } : r
      )
    );
  }, []);

  // --- Save To Server handler ---
  // Saves the floor map (POST /floor-map) and every mapped room
  // (POST /rooms) to the FastAPI backend.
  const handleSaveToServer = useCallback(async () => {
    // Guard: ignore clicks while a save is already in flight — this is
    // the main protection against duplicate submissions (e.g. a fast
    // double-click before the button visually disables).
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
    const API_BASE = `${import.meta.env.VITE_API_URL}`;

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

      // 2. Save every mapped room (one POST per rectangle — a rectangle
      //    with multiple room numbers is still a single document, per
      //    the backend's upsert-by-rectangle-identity logic).
      const roomResults = await Promise.all(
        mappedRects.map((r) =>
          fetch(`${API_BASE}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomNumbers: r.roomNumbers,
              ...(r.roomName ? { roomName: r.roomName } : {}),
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
                throw new Error(
                  body.detail || `Failed to save room ${r.roomNumbers.join('/')}`
                );
              }
              return { label: r.roomNumbers.join('/'), ok: true };
            })
            .catch((err) => ({
              label: r.roomNumbers.join('/'),
              ok: false,
              error: err.message,
            }))
        )
      );

      const failed = roomResults.filter((r) => !r.ok);

      if (failed.length === 0) {
        setSaveMessage({
          type: 'success',
          text: `Saved successfully: floor map + ${roomResults.length} room(s).`,
        });
      } else {
        const failedList = failed.map((f) => f.label).join(', ');
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
  }, [isSaving, block, floor, markup, mappedCount, mappedRects]);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(mappedRooms, null, 2);

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
  }, [mappedRooms]);

  const handleReset = useCallback(() => {
    setMarkup('');
    setRects([]);
    setError('');
    setFileName('');
    setSaveMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleLogout = () => {
  localStorage.removeItem("isAdmin");
  window.location.href = "/";
};

  if (isAdmin !== "true") {
    return <Navigate to="/admin-login" />;
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Campus Navigation — Admin</h1>
        <p className="admin-subtitle">
          Upload a floor map SVG, click each room rectangle, and assign one or more
          room numbers (room name optional).
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
        <div className={saveMessage.type === 'success' ? 'admin-success' : 'admin-error'}>
          {saveMessage.text}
        </div>
      )}

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-body">
        <div className="map-panel">
          {markup ? (
            <div className="map-stage">
              <div className="map-background" dangerouslySetInnerHTML={{ __html: markup }} />
              <svg className="map-overlay" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
                {rects.map((r) => {
                  const isMapped = Boolean(r.roomNumbers && r.roomNumbers.length > 0);
                  return (
                    <g key={r.key}>
                      <rect
                        x={r.x}
                        y={r.y}
                        width={r.width}
                        height={r.height}
                        className={isMapped ? 'room-rect room-rect-mapped' : 'room-rect'}
                        onClick={() => handleEditRoom(r.key)}
                      >
                        <title>
                          {isMapped
                            ? r.roomName
                              ? `${r.roomNumbers.join(' / ')} — ${r.roomName}`
                              : r.roomNumbers.join(' / ')
                            : 'Click to assign room number(s)'}
                        </title>
                      </rect>
                      {isMapped && (
                        <RoomLabel
                          x={r.x}
                          y={r.y}
                          width={r.width}
                          height={r.height}
                          roomNumbers={r.roomNumbers}
                          roomName={r.roomName}
                          numberClassName="room-label-number"
                          nameClassName="room-label-name"
  //                         rotation={rotatedRooms[r.key] || 0}
  // onClick={() => handleRotate(r.key)}
                        />
                      )}
                    </g>
                  );
                })}
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

          {mappedRects.length > 0 && (
            <ul className="room-list">
              {mappedRects.map((r) => (
                <li key={r.key} className="room-list-item">
                  <div className="room-list-info">
                    <span className="room-list-numbers">{r.roomNumbers.join(' / ')}</span>
                    {r.roomName && <span className="room-list-name">{r.roomName}</span>}
                  </div>
                  <div className="room-list-actions">
                    <button
                      type="button"
                      className="room-list-edit"
                      onClick={() => handleEditRoom(r.key)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="room-list-delete"
                      onClick={() => handleDeleteRoom(r.key)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <pre className="json-preview">{JSON.stringify(mappedRooms, null, 2)}</pre>
        </div>
      </div>
      <br />
      <br />
      <button type="button" onClick={handleLogout} className="logout-button">
  Logout
</button>
    </div>
    
  );
}