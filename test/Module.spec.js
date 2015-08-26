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

  describe('knows()', function() {
    it('should return false if an invalid module is requested', function() {
      var myModularizer = new window.Modularizer({
        loader : false
      }), moduleDef = function(){};

      assert(myModularizer.knows() === false);
      assert(myModularizer.knows('') === false);
      assert(myModularizer.knows({}) === false);
      assert(myModularizer.knows(false) === false);
    });
    it('should return true if the requested module defined in the package', function() {
      var MODULE_NAME = 'my.module',
        myModularizer = new window.Modularizer({
          loader : false
        });

      myModularizer.define(MODULE_NAME,function(){});

      assert(myModularizer.knows(MODULE_NAME));
    });
    it('should return false if multiple modules have been requested and any of them is not defined', function() {
      var MODULE_NAME = 'my.module',
      myModularizer = new window.Modularizer({
        loader : false
      });

      myModularizer.define(MODULE_NAME,function(){});

      assert(myModularizer.knows([MODULE_NAME,MODULE_NAME + '.unknown']) === false);
    });
    it('should return true if the requested modules are all defined in the package', function() {
      var MODULE_NAME = 'my.module',
      myModularizer = new window.Modularizer({
        loader : false
      });

      myModularizer.define(MODULE_NAME+'1',function(){});
      myModularizer.define(MODULE_NAME+'2',function(){});

      assert(myModularizer.knows([MODULE_NAME+'1',MODULE_NAME+'2']));
    });
    it('should return false if the requested module defined in a resource which has not yet been loaded', function() {
      var PATH = '/path/to/file.js', MY_MODULE = 'my.module',
        myModularizer = new window.Modularizer({
          loader : function(){}
        });

      var pckg = myModularizer.register(PATH).defines(MY_MODULE);

      assert(myModularizer.knows(MY_MODULE) === false);
    });
    it('should return true if the requested module defined in a resource which has been loaded', function() {
      var PATH = '/path/to/file.js', MY_MODULE = 'my.module',
      myModularizer = new window.Modularizer({
        loader : function(){
          myModularizer.define(MY_MODULE,function(){

          });
        }
      });

      var pckg = myModularizer.register(PATH).defines(MY_MODULE);
      pckg.load();
      assert(myModularizer.knows(MY_MODULE));
    });
  });


  describe('require()', function() {
    it('should throw an error if no required module is specified', function() {
      var myModularizer = new window.Modularizer({
        loader : function(){}
      });

      expect(function(){
        myModularizer.require();
      }).to.throw(myModularizer.Error);
    });
    it('should throw an error if an invalid module is specified', function() {
      var myModularizer = new window.Modularizer({
        loader : function(){}
      });

      expect(function(){
        myModularizer.require('');
      }).to.throw(myModularizer.Error);
    });
    it('should throw an error for an undefined module requirment', function() {
      var myModularizer = new window.Modularizer({
        loader : function(){}
      });

      expect(function(){
        myModularizer.require('my.module');
      }).to.throw(myModularizer.Error);
    });
    it('should throw an error for an undefined module requirment even when included with multiple modules', function() {
      var myModularizer = new window.Modularizer({
        loader : function(){}
      }), MODULE_NAME = 'my.module', NON_EXISTANT_MODULE_NAME = 'my.missing.module';

      myModularizer.define(MODULE_NAME,function(){});

      expect(function(){
        myModularizer.require([MODULE_NAME,NON_EXISTANT_MODULE_NAME]);
      }).to.throw(myModularizer.Error);
    });
    it('should load defined but unloaded modules', function(done) {
      var PATH = '/path/to/file.js', MY_MODULE = 'my.module',
      myModularizer = new window.Modularizer({
        loader : function(){
          myModularizer.define(MY_MODULE,function(){
            return {};
          });
        }
      });

      myModularizer.register(PATH).defines(MY_MODULE);

      myModularizer.require(MY_MODULE,function(){
        done();
      });
    });
    it('should throw an error when a defined but unloaded module is required in synchronous mode', function() {
      var PATH = '/path/to/file.js', MY_MODULE = 'my.module',
      myModularizer = new window.Modularizer({
        loader : function(){
          myModularizer.define(MY_MODULE,function(){
            return {};
          });
        }
      });

      myModularizer.register(PATH).defines(MY_MODULE);

      expect(function(){
        myModularizer.require(MY_MODULE,function(){
        },{},
          // syncro = true
          true);
      }).to.throw(myModularizer.Error);
    });
    it('should pass the required modules, in order, to the callback when succesful', function(done) {
      var MY_MODULE = 'my.module.1',MY_2ND_MODULE = 'my.module.2',MY_3RD_MODULE = 'my.module.3',
      myModularizer = new window.Modularizer({
        loader : function(){}
      });

      myModularizer.define(MY_MODULE,function(){
        return {
          name : MY_MODULE
        };
      });
      myModularizer.define(MY_2ND_MODULE,function(){
        return {
          name : MY_2ND_MODULE
        };
      });
      myModularizer.define(MY_3RD_MODULE,function(){
        return {
          name : MY_3RD_MODULE
        };
      });

      myModularizer.require([MY_MODULE,MY_2ND_MODULE,MY_3RD_MODULE],function(first,second,third){
        first.name.should.be.eql(MY_MODULE);
        second.name.should.be.eql(MY_2ND_MODULE);
        third.name.should.be.eql(MY_3RD_MODULE);
        done();
      });
    });
    it('should call the callback in the supplied context when succesful', function() {
      var MY_MODULE = 'my.module.1',myContext = {},
      myModularizer = new window.Modularizer({
        loader : function(){}
      });

      myModularizer.define(MY_MODULE,function(){
        return {
          name : MY_MODULE
        };
      });

      myModularizer.require(MY_MODULE,function(){
        assert(myContext === this);
      },myContext);
    });
    it('should call the callback in the global scope context when no context is specified', function() {
      var MY_MODULE = 'my.module.1',myContext = {},
      myModularizer = new window.Modularizer({
        loader : function(){}
      });

      myModularizer.define(MY_MODULE,function(){
        return {
          name : MY_MODULE
        };
      });

      myModularizer.require(MY_MODULE,function(){
        assert(window === this);
      });
    });
  });

  //describe('fetchResource()', function() {
  //
  //  it('', function() {
  //    assert(false);
  //  });
  //});

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
