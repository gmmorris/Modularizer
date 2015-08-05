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
var jsdom = require('mocha-jsdom'), assert = require('assert');

describe('Modularizer BaseTag', function() {
  jsdom();

  it('should detect the basetag attrbute', function() {
    //Modularizer.config.base.should.be.a('string').and.equal('/static/');
  });
});
