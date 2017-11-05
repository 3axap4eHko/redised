const SEPARATOR = '-';
module.exports = (...args) => args.map(encodeURIComponent).join(SEPARATOR);
module.exports.SEPARATOR = SEPARATOR;