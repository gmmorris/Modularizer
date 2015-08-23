//var chai = require('chai'), jsdom = require('jsdom');
//
//describe('Modularizer BaseTag', function(){
//  before('render script tag with basetag', function() {
//    //global.document = jsdom.jsdom('<!doctype html><html><body><script data-modularizer="/static/" src="../modularizer.js"></script></body></html>');
//    //global.window = document.parentWindow;
//  });
//
//  it('should detect the basetag attrbute', function() {
//    Modularizer.config.base.should.be.a('string').and.equal('/static/');
//  });
//});

// Create a fake global `window` and `document` object:

var jsdom = require('mocha-jsdom');
describe('Modularizer BaseTag', function() {
  jsdom({
    features : {
      FetchExternalResources: ["script"],
      ProcessExternalResources: ["script"],
      SkipExternalResources: false
    }
  });

  it('should have a default empty basetag configuration value', function() {
    document.body.innerHTML =  '<script type="text/javascript">window.gidi = {b:1};window.gidi.what = function(){};</script><script type="text/javascript" src="./testing.js"></script>';
    //document.body.innerHTML = '<script type="text/javascript" src="./test/testing.js"></script>';
    //document.body.innerHTML = '<script type="text/javascript" src="./test/testing.js"></script><script type="text/javascript">window.gidi = {a:1};window.gidi.what = function(){console.log("gidi");};</script><script type="text/javascript" src="../modularizer.js"></script>';
    window.gidi.what();
    window.gidi.b.should.be.equal(1);
    window.lev.a.should.be.equal(1);
    //window.Modularizer.config.base.should.be.a('string').and.equal('');
  });
  //
  //it('should have a default empty basetag configuration value', function() {
  //  dom.create('<script type="text/javascript" src="./test/utils/testing.js"></script><script type="text/javascript">window.gidi = {a:1};window.gidi.what = function(){};</script>');
  //  window.gidi.what();
  //  window.lev.a.should.be.equal(1);
  //});
  //
  //
  //it('should detect the basetag attrbute', function() {
  //  //document.body.innerHTML = '<!doctype html><html><body><script data-modularizer="/static/" src="../modularizer.js"></script></body></html>';
  //  //Modularizer.config.base.should.be.a('string').and.equal('/static/');
  //});
});
