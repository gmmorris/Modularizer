var dom = require('./utils/dom.js'), _ = require('underscore'), chai = require('chai'), expect = chai.expect, assert = require('simple-assert');

describe('Modularizer Configuration', function() {
  // Create a fake global `window` and `document` object and inject default script
  dom.init(true);

  it('should use the default config when none is provided (other than loader which is auto applied)', function() {
    var myModularizer = new window.Modularizer();
    // omit loader because a mod
    expect(_.omit(myModularizer.config,'loader')).to.eql(_.omit(window.Modularizer.config,'loader'));
  });

  it('should use the default config value when no equivalent key is provided', function() {
    var myModularizer = new window.Modularizer({
      timeout : 1000
    });
    myModularizer.config.timeout.should.not.equal(window.Modularizer.config.timeout);
    myModularizer.config.timeout.should.equal(1000);
    myModularizer.config.strictRequirment.should.equal(window.Modularizer.config.strictRequirment);
  });

  it('should detect a local jQuery instance by default as its loader', function(done) {
    dom.init(true,true).inject("https://cdnjs.cloudflare.com/ajax/libs/jquery/3.0.0-alpha1/jquery.min.js",null, function(){
      var myModularizer = new window.Modularizer();
      assert(myModularizer.config.loader === window.$.getScript);
      done();
    });
  });

  it('should ignore a local jQuery instance when configured detectJQuery = false', function(done) {
    dom.init(true,true).inject("https://cdnjs.cloudflare.com/ajax/libs/jquery/3.0.0-alpha1/jquery.min.js",null, function(){
      var myModularizer = new window.Modularizer({
        detectJQuery : false
      });
      assert(myModularizer.config.loader !== window.$.getScript);
      assert(_.isFunction(myModularizer.config.loader));
      done();
    });
  });

  it('should allow a custom loader function to be specified', function(done) {
    var myLoader = function(){};
    dom.init(true).inject("https://cdnjs.cloudflare.com/ajax/libs/jquery/3.0.0-alpha1/jquery.min.js",null, function(){
      var myModularizer = new window.Modularizer({
        loader : myLoader
      });
      assert(myModularizer.config.loader !== window.$.getScript);
      assert(myModularizer.config.loader === myLoader);
      done();
    });
  });
});
