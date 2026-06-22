/**
 * Shared SVG helpers.
 *
 * parseSvgMarkup() takes raw SVG text (e.g. fetched from the
 * floor-map API) and returns:
 *  - markup:  the SVG serialized with width/height forced to 100%
 *             so it scales responsively inside its container
 *  - viewBox: the original (or inferred) viewBox string, which the
 *             overlay <svg> reuses so highlight coordinates always
 *             line up with the background map
 */
export function parseSvgMarkup(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');

  if (doc.querySelector('parsererror')) {
    throw new Error('The floor map SVG is invalid.');
  }

  const svgEl = doc.querySelector('svg');
  if (!svgEl) {
    throw new Error('No <svg> root element found in the floor map.');
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

  const markup = new XMLSerializer().serializeToString(svgEl);

  return { markup, viewBox };
}