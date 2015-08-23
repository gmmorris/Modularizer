var dom = require('./utils/dom.js'), should = require('should');

describe('Modularizer Configuration', function() {
  // Create a fake global `window` and `document` object and inject default script
  dom.init(true);

  it('should use the default config when none is provided', function() {
    var myModularizer = new window.Modularizer();
    should(myModularizer.config).be.deepEqual(window.Modularizer.config);
  });

  it('should use the default config value when no equivalent key is provided', function() {
    var myModularizer = new window.Modularizer({
      timeout : 1000
    });
    should(myModularizer.config.timeout).be.not.eql(window.Modularizer.config.timeout);
    should(myModularizer.config.timeout).be.eql(1000);
    should(myModularizer.config.strictRequirment).be.eql(window.Modularizer.config.strictRequirment);
  });
});
