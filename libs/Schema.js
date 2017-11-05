const filters = {
  Number: value => parseFloat(value) || 0,
  String: value => value ? value.toString() : '',
  Boolean: value => !!value,
};

function fieldSchema(name, data) {
  if (typeof data === 'function') {
    data = { type: data };
  }
  if (typeof data.type !== 'function') {
    throw new Error(`Schema field '${name}' does not have type`);
  }
  const filter = data.filter || filters[data.type.name];
  if (!filter) {
    throw new Error(`Filter type ${data.type.name} not found`)
  }
  return {
    name,
    type: data.type,
    index: !!data.index,
    filter,
  };
}

module.exports = function Schema(fields) {
  const schema = {};
  Object.keys(fields).forEach(name => {
    schema[name] = fieldSchema(name, fields[name]);
  });

  return schema;
};