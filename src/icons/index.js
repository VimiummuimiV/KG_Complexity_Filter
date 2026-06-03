// Icon registry: automatically loads all SVG files in this folder as raw strings.
// Each file becomes a key based on its filename.

const svgContext = require.context('./', false, /\.svg$/i);

export const icons = svgContext.keys().reduce((map, key) => {
  const name = key.replace(/^\.\//, '').replace(/\.svg$/i, '');
  map[name] = svgContext(key).default || svgContext(key);
  return map;
}, {});
