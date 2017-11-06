const SEPARATOR = '-';
module.exports = (...args) => args.map(value => encodeURIComponent(value).replace(/[*]/,'\\*')).join(SEPARATOR);
module.exports.SEPARATOR = SEPARATOR;