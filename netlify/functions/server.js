const serverless = require("serverless-http");
const app = require("../../src/server");

// Export Express app as Netlify Function
module.exports.handler = serverless(app);

