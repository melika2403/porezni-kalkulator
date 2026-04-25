// Sequelize models — exported under the same variable name
// so existing imports (const prisma = require("../prisma")) still work
// via the model-level API used in controllers.
const models = require("./models/index");
module.exports = models;
