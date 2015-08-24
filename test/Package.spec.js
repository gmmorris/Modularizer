var dom = require('./utils/dom.js'), chai = require('chai'), expect = chai.expect, sinon = require("sinon");

describe('Modularizer Package', function() {
  // Create a fake global `window` and `document` object and inject default script
  dom.init(true);

  describe('load()', function() {
    it('should return false if no loader is specified', function() {
    });

    it('should accept a single module name', function() {
    });

    it('should accept an array of module names', function() {
    });
  });
});
