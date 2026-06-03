// Icon registry: automatically loads all SVG files in this folder as raw strings.
// Each file becomes a key based on its filename.

const svgContext = require.context('./', false, /\.svg$/i);

export const icons = svgContext.keys().reduce((map, key) => {
  const name = key.replace(/^\.\//, '').replace(/\.svg$/i, '');
  map[name] = svgContext(key).default || svgContext(key);
  return map;
}, {});

const parseSvg = (svgString) =>
  new DOMParser().parseFromString(svgString, 'image/svg+xml').documentElement;

export const createIcon = (name, attrs = {}) => {
  const svgString = icons[name];
  if (!svgString) {
    throw new Error(`Icon not found: ${name}`);
  }

  const svg = parseSvg(svgString);
  svg.classList.add('panel-icon');

  const { class: classNames, ...rest } = attrs;
  if (classNames) {
    svg.classList.add(...classNames.split(/\s+/).filter(Boolean));
  }

  Object.entries(rest).forEach(([key, value]) => svg.setAttribute(key, value));
  return svg;
};
