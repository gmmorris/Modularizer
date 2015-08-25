var dom = require('./utils/dom.js'), chai = require('chai'), expect = chai.expect, assert = require('simple-assert'), _ = require('underscore');

describe('Modularizer Module management', function() {
  // Create a fake global `window` and `document` object and inject default script
  dom.init(true);

  describe('load()', function() {
    it('should return false if no loader is specified', function() {
      var myModularizer = new window.Modularizer({
        detectJQuery : false,
        loader : false
      }),
      PATH = 'path/to/file.js',
      MY_PRE_REQUISITE = 'my.module',
      pckg = myModularizer.register(PATH)
        .defines(MY_PRE_REQUISITE,function(){
          return {};
        });

      assert(myModularizer.load('my.module') === false);
    });

    it('should accept a single module name', function(done) {
      var PRE_REQ_PATH = '1/path/to/file.js',PATH = '2/path/to/file.js', MY_MODULE = 'my.module', MY_SECOND_MODULE = 'my.2.module',
      myModularizer = new window.Modularizer({
        loader : function(pathToLoad){
          pathToLoad.should.equal(PRE_REQ_PATH);
          done();
        }
      });

      myModularizer.register(PRE_REQ_PATH).defines(MY_MODULE);

      myModularizer.register(PATH).defines(MY_SECOND_MODULE);

      myModularizer.load(MY_MODULE);
    });

    it('should accept an array of module names', function(done) {
      var PRE_REQ_PATH = '1/path/to/file.js',
      PATH = '2/path/to/file.js',
      MY_MODULE = 'my.module', MY_SECOND_MODULE = 'my.2.module',
      pathsThatShouldBeRequired = [PRE_REQ_PATH,PATH],
      myModularizer = new window.Modularizer({
        loader : function(pathToLoad){
          if(_.contains(pathsThatShouldBeRequired, pathToLoad)){
            pathsThatShouldBeRequired = _.without(pathsThatShouldBeRequired,pathToLoad);
          }
          if(!pathsThatShouldBeRequired.length){
            done();
          }
        }
      });

      myModularizer.register(PRE_REQ_PATH)
        .defines(MY_MODULE);

      myModularizer.register(PATH)
        .defines(MY_SECOND_MODULE);

      myModularizer.load([MY_MODULE,MY_SECOND_MODULE]);
    });
  });

  describe('require()', function() {
    it('', function() {
      assert(false);
    });
  });
  describe('knows()', function() {
    it('', function() {
      assert(false);
    });
  });
  describe('fetchResource()', function() {

    it('', function() {
      assert(false);
    });
  });

  describe('define()', function() {

    it('should throw an error when a module name is omitted', function() {
      var myModularizer = new window.Modularizer({
        loader : function(){}
      });

      expect(function(){
        myModularizer.define(function(){
          return {};
        });
      }).to.throw(myModularizer.Error);
    });

    it('should throw an error when a module name is empty', function() {
      var myModularizer = new window.Modularizer({
        loader : function(){}
      });

      expect(function(){
        myModularizer.define('',function(){
          return {};
        });
      }).to.throw(myModularizer.Error);
    });

    it('should throw an error when a module name is not a string', function() {
      var myModularizer = new window.Modularizer({
        loader : function(){}
      });

      expect(function(){
        myModularizer.define({},function(){
          return {};
        });
      }).to.throw(myModularizer.Error);
    });

    it('should throw an error when a module specified without a suitable definition callback', function() {
      var myModularizer = new window.Modularizer({
        loader : function(){}
      });

      expect(function(){
        myModularizer.define('my.module');
      }).to.throw(myModularizer.Error);

      expect(function(){
        myModularizer.define('my.module',[]);
      }).to.throw(myModularizer.Error);

      expect(function(){
        myModularizer.define('my.module',['my.other.module']);
      }).to.throw(myModularizer.Error);
    });

    it('should allow a module to be defined based on a moduel name and a callback definition function', function() {
      var MODULE_NAME = 'my.module',myModularizer = new window.Modularizer({
        loader : false
      }), moduleDef = function(){};

      myModularizer.define(MODULE_NAME,moduleDef);

      expect(myModularizer.modules).to.be.a('object');
      expect(myModularizer.modules.definitions).to.be.a('object');
      assert(myModularizer.modules.definitions[MODULE_NAME] instanceof window.Modularizer.Module);
      assert(_.isFunction(myModularizer.modules.definitions[MODULE_NAME].callback));
      assert(myModularizer.modules.definitions[MODULE_NAME].callback === moduleDef);
    });

    it('should allow a module to be defined based on a module name, a single prerequisite and a callback definition function', function() {
      var
        PRE_REQ_MODULE = 'my.prereq',
        MODULE_NAME = 'my.module',myModularizer = new window.Modularizer({
          loader : false
        }), moduleDef = function(){};

      myModularizer.define(PRE_REQ_MODULE,function(){});
      myModularizer.define(MODULE_NAME,PRE_REQ_MODULE,moduleDef);

      expect(myModularizer.modules).to.be.a('object');

      expect(myModularizer.modules.definitions).to.be.a('object');
      assert(myModularizer.modules.definitions[MODULE_NAME] instanceof window.Modularizer.Module);
      assert(_.isFunction(myModularizer.modules.definitions[MODULE_NAME].callback));
      assert(myModularizer.modules.definitions[MODULE_NAME].callback === moduleDef);
    });

    it('should allow a module to be defined based on a module name, multiple prerequisites and a callback definition function', function() {
      var
        PRE_REQ_MODULE = 'my.prereq',
        MODULE_NAME = 'my.module',myModularizer = new window.Modularizer({
          loader : false
        }), moduleDef = function(){};

      myModularizer.define(PRE_REQ_MODULE + '1',function(){});
      myModularizer.define(PRE_REQ_MODULE + '2',function(){});
      myModularizer.define(MODULE_NAME,[PRE_REQ_MODULE + '1',PRE_REQ_MODULE + '2'],moduleDef);

      expect(myModularizer.modules).to.be.a('object');

      expect(myModularizer.modules.definitions).to.be.a('object');
      assert(myModularizer.modules.definitions[MODULE_NAME] instanceof window.Modularizer.Module);
      assert(_.isFunction(myModularizer.modules.definitions[MODULE_NAME].callback));
      assert(myModularizer.modules.definitions[MODULE_NAME].callback === moduleDef);
    });
  });

});
