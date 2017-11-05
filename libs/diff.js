module.exports = function diff(original, changed, include = null) {
  original = original || {};
  changed = changed || {};

  const result = {};
  const keys = include || Object.keys(changed);
  keys.forEach(key => {
    if (original[key] !== changed[key]) {
      result[key] = changed[key];
    }
  });
  return result;
};
