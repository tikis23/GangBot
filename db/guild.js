const mariadb = require('mariadb');
const config = require('../config.json');

module.exports = mariadb.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  port: config.db.port
});