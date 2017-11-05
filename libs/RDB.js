const redisAPI = require('./redisAPI');

const context = {
  api: null,
  isConnected: false,
};

module.exports = {
  async connect(options) {
    context.api = redisAPI(options);
    return context.api.connection
      .then(() => {
        context.isConnected = true;
        return context.api;
      });
  },
  get isConnected() {
    return context.isConnected;
  },
  get api() {
    if (!context.api) {
      throw new Error('Attempt to access API before connection initialized');
    }
    return context.api;
  }
};