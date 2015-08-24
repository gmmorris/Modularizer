var dom = require('./utils/dom.js'), chai = require('chai'), expect = chai.expect;
chai.should();

describe('Modularizer Configuration', function() {
  // Create a fake global `window` and `document` object and inject default script
  dom.init(true);

  it('should use the default config when none is provided', function() {
    var myModularizer = new window.Modularizer();
    expect(myModularizer.config).to.deep.equal(window.Modularizer.config);
  });

  it('should use the default config value when no equivalent key is provided', function() {
    var myModularizer = new window.Modularizer({
      timeout : 1000
    });
    myModularizer.config.timeout.should.not.equal(window.Modularizer.config.timeout);
    myModularizer.config.timeout.should.equal(1000);
    myModularizer.config.strictRequirment.should.equal(window.Modularizer.config.strictRequirment);
  });

  it('should detect a local jQuery instance by default as its loader', function() {
  });

  it('should ignore a local jQuery instance when configured detectJQuery = false', function() {
  });

  it('should allow a custom loader function to be specified', function() {
  });
});
