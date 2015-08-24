var dom = require('./utils/dom.js'), chai = require('chai');
chai.should();

describe('Modularizer BaseTag', function() {
  // Create a fake global `window` and `document` object:
  dom.init();

  it('should have a default empty basetag configuration value', function(done) {
    dom.clear().inject("./modularizer.js",null,function(){
      window.Modularizer.config.base.should.be.a('string');
      window.Modularizer.config.base.should.equal('');
      done();
    });
  });

  it('should use the data-modularizer attribtue when present for the basetag configuration value', function(done) {
    var attr = '/static/';
    dom.clear().inject("./modularizer.js",{
      'data-modularizer' : attr
    },function(){
      window.Modularizer.config.base.should.be.a('string');
      window.Modularizer.config.base.should.equal(attr);
      done();
    });
  });

  it('should return the basetag value', function(done) {
    var attr = '/static/';
    dom.clear().inject("./modularizer.js",{
      'data-modularizer' : attr
    },function(){
      var base = window.Modularizer.prototype.getTagBase();
      base.should.be.a('string');
      base.should.equal(attr);
      done();
    });
  });
});
