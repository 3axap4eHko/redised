module.exports = function sanitize(data, fields, filter = v => v) {
  const result = {};
  fields.forEach(field => field in data && (result[field] = filter(data[field], field)));
  return result;
};