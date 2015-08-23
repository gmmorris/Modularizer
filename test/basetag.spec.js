var dom = require('./utils/dom.js'), should = require('should');

describe('Modularizer BaseTag', function() {
  // Create a fake global `window` and `document` object:
  dom.init();

  it('should have a default empty basetag configuration value', function(done) {
    dom.inject("./modularizer.js",null,function(){
      should(window.Modularizer.config.base).be.a.String().be.eql('');
      done();
    });
  });

  it('should use the data-modularizer atribtue wheb present for the basetag configuration value', function(done) {
    var attr = '/static/';
    dom.inject("./modularizer.js",{
      'data-modularizer' : attr
    },function(){
      should(window.Modularizer.config.base).be.a.String().be.eql(attr);
      done();
    });
  });
});