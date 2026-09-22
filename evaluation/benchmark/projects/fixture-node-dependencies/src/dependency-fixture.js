const lodash = require("lodash");

module.exports = function formatItems(items) {
  return lodash.compact(items).join(", ");
};
