import React from 'react';

/**
 * Room/space names that are already permanently drawn inside the
 * uploaded floor-map SVG itself (e.g. Auditorium, Toilets, Lift,
 * Stairs, Corridor). These names exist ONLY for search purposes in
 * the app — they must never be rendered again from React, since the
 * SVG artwork already displays them.
 *
 * Matching is case-insensitive and also matches as a substring, so
 * "Main Auditorium" or "Auditorium Hall" are still recognized as
 * already-drawn, not just an exact "Auditorium".
 *
 * Pass a custom `bakedInNames` prop to RoomLabel to override/extend
 * this list per floor map if some maps use different built-in labels.
 */
export const DEFAULT_BAKED_IN_NAMES = [
  'auditorium',
  'toilet',
  'toilets',
  'restroom',
  'restrooms',
  'washroom',
  'lift',
  'lifts',
  'elevator',
  'stairs',
  'staircase',
  'corridor',
];

function isNameBakedIntoSvg(roomName, bakedInNames) {
  if (!roomName) return false;
  const normalized = roomName.trim().toLowerCase();
  return bakedInNames.some(
    (baked) => normalized === baked || normalized.includes(baked)
  );
}

// How far up from dead-center the badge shifts when the room's name
// is already baked into the SVG (Case 2) — expressed as a fraction of
// the rectangle's height, so it scales sensibly for rooms of any size
// while staying inside the rectangle.
const TOP_SHIFT_RATIO = 0.28;

/**
 * Renders the room-number badge for a room marker as a small white
 * pill (real background + padding + rounded corners, via an SVG
 * <foreignObject> wrapping a flexbox HTML element — plain SVG <text>
 * can't auto-size a background to its content, which is why this
 * isn't just styled <text>).
 *
 * Case 1 — no optional room name:
 *   Show only the room number, perfectly centered (both axes).
 *
 * Case 2 — optional room name IS already drawn in the SVG itself
 *          (e.g. "Auditorium"):
 *   Show only the room number (the name is NEVER rendered from React
 *   here — it exists solely so the search box can match it). The
 *   badge is shifted toward the top of the rectangle so it doesn't
 *   sit on top of the SVG's own (presumably center-positioned) text.
 *
 * Case 3 — optional room name is NOT found anywhere in the SVG
 *          (e.g. a custom name like "Computer Lab"):
 *   Show the room number on top (large/bold) and the name below it
 *   (smaller/lighter), centered normally — there's no existing SVG
 *   text here to avoid colliding with.
 */
export default function RoomLabel({
  x,
  y,
  width,
  height,
  roomNumbers,
  roomName,
  numberClassName,
  nameClassName,
  onClick,
  bakedInNames = DEFAULT_BAKED_IN_NAMES,
}) {
  const numbersText = (roomNumbers || []).join(' / ');
  const nameIsBakedIn = isNameBakedIntoSvg(roomName, bakedInNames);
  const showName = Boolean(roomName) && !nameIsBakedIn;

  const centerX = x + width / 2;
  // Case 2 shifts up; Cases 1 and 3 stay perfectly centered.
  const badgeCenterY = nameIsBakedIn ? y + height * TOP_SHIFT_RATIO : y + height / 2;

  // Generous fixed footprint for the foreignObject. SVG's default
  // overflow for foreignObject (unlike the outer <svg> root) is
  // "visible", so the actual HTML content inside is free to size to
  // its own content and is never clipped even if it exceeds these
  // declared bounds — this is just a layout anchor, not a hard limit.
  const boxWidth = 140;
  const boxHeight = showName ? 56 : 36;

  return (
    <foreignObject
      x={centerX - boxWidth / 2}
      y={badgeCenterY - boxHeight / 2}
      width={boxWidth}
      height={boxHeight}
      style={{ overflow: 'visible', pointerEvents: onClick ? 'auto' : 'none' }}
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClick}
      >
        <div className="room-label-badge">
          <span className={numberClassName}>{numbersText}</span>
          {showName && <span className={nameClassName}>{roomName}</span>}
        </div>
      </div>
    </foreignObject>
  );
}