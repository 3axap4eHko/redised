const Schema = require('./libs/Schema');
const Model = require('./libs/Model');
const createClient = require('./libs/redis');

module.exports = {
  Schema,
  Model,
  createClient,
};
