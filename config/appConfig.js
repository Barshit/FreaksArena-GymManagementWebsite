const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  viewsPath: path.join(__dirname, '..', 'views'),
};
