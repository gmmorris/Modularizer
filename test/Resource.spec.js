var dom = require('./utils/dom.js'), chai = require('chai'), expect = chai.expect, assert = require('simple-assert'), _ = require('underscore');

describe('Modularizer register()', function() {
  // Create a fake global `window` and `document` object and inject default script
  dom.init(true);

  it('should add a resource in the package based on a file path', function() {
    var PATH = '/path/to/file.js',
      myModularizer = new window.Modularizer({
      loader : function(){}
    });
    var pckg = myModularizer.register(PATH);
    pckg.filePath.should.equal(PATH);
  });

  it('should return the newly created package', function() {
    var PATH = '/path/to/file.js',
    myModularizer = new window.Modularizer({
      loader : function(){}
    });
    var pckg = myModularizer.register(PATH);
    assert(pckg instanceof window.Modularizer.Resource);
  });
});

describe('Modularizer getResourceByModule()', function() {
  // Create a fake global `window` and `document` object and inject default script
  dom.init(true);

  it('should return false if an invalid module name is specified', function() {
    var myModularizer = new window.Modularizer({
      loader : function(){}
    });
    assert(myModularizer.getResourceByModule('') === false);
    assert(myModularizer.getResourceByModule(1) === false);
    assert(myModularizer.getResourceByModule(false) === false);
    assert(myModularizer.getResourceByModule({}) === false);
  });

  it('should return false if no resource exists in the package', function() {
    var myModularizer = new window.Modularizer({
      loader : function(){}
    });
    assert(myModularizer.getResourceByModule('my.module') === false);
  });

  it('should return false if no resource exists in the package that contains the module', function() {
    var PATH = '/path/to/file.js',
    myModularizer = new window.Modularizer({
      loader : function(){}
    });

    var pckg = myModularizer.register(PATH).defines('my.other.module',function(){});

    assert(myModularizer.getResourceByModule('my.module') === false);
  });

  it('should return a package if it contains the requested module', function() {
    var PATH = '/path/to/file.js',
    myModularizer = new window.Modularizer({
      loader : function(){}
    });

    var pckg = myModularizer.register(PATH).defines('my.module',function(){
      return {};
    });

    assert(myModularizer.getResourceByModule('my.module') === pckg);
  });
});

describe('Modularizer Resource', function() {
  // Create a fake global `window` and `document` object and inject default script
  dom.init(true);

  describe('defines()', function() {

    it('should allow defining a module inside of the Resource using just a name and a defining function', function() {
      var PATH = '/path/to/file.js', MY_MODULE = 'my.module',
      myModularizer = new window.Modularizer({
        loader : function(){}
      });

      var pckg = myModularizer.register(PATH)
        .defines(MY_MODULE,function(){
          return {};
        });

      assert(_.isArray(pckg.modules));
      assert(pckg.modules.length === 1);
      assert(pckg.modules[0] === MY_MODULE);
    });

    it('should allow defining a module inside of the Resource using a name, list of prerequisite modules and a defining function', function() {
      var PATH = '/path/to/file.js', MY_MODULE = 'my.module', MY_PRE_REQUISITE = 'my.pre.req',
      myModularizer = new window.Modularizer({
        loader : function(){}
      });

      myModularizer.register('1/'+PATH)
        .defines(MY_PRE_REQUISITE,function(){
        return {};
      });

      var pckg = myModularizer.register('2/'+PATH)
        .defines(MY_MODULE,[MY_PRE_REQUISITE],function(){
        return {};
      });

      assert(_.isArray(pckg.modules));
      assert(pckg.modules.length === 1);
      assert(pckg.modules[0] === MY_MODULE);
      assert(_.isArray(pckg.prereq));
      assert(pckg.prereq.length === 1);
      assert(pckg.prereq[0] === MY_PRE_REQUISITE);
    });

    it('should allow defining a module inside of the Resource using a name and a prerequisit on a module in the same package', function() {
      var PATH = '/path/to/file.js', MY_MODULE = 'my.module', MY_PRE_REQUISITE = 'my.pre.req',
      myModularizer = new window.Modularizer({
        loader : function(){}
      });

      var pckg = myModularizer.register(PATH)
        .defines(MY_PRE_REQUISITE,function(){
        return {};
      }).defines(MY_MODULE,[MY_PRE_REQUISITE],function(){
        return {};
      });

      assert(_.isArray(pckg.modules));
      assert(pckg.modules.length === 2);
      assert(pckg.modules[0] === MY_PRE_REQUISITE);
      assert(pckg.modules[1] === MY_MODULE);
      assert(!_.isArray(pckg.prereq));
    });

    it('shouldnt allow defining a module with an unknown prerequisite module', function() {
      var PATH = '/path/to/file.js', MY_MODULE = 'my.module', MY_PRE_REQUISITE = 'my.pre.req',
      myModularizer = new window.Modularizer({
        loader : function(){}
      });

      var pckg = myModularizer.register(PATH);

      expect(function(){
        pckg.defines(MY_MODULE,[MY_PRE_REQUISITE],function(){
          return {};
        });
      }).to.throw(myModularizer.Error);
    });

    it('should throw an error when a module name is omitted', function() {
      var PATH = '/path/to/file.js', myModularizer = new window.Modularizer({
        loader : function(){}
      });

      var pckg = myModularizer.register(PATH);

      expect(function(){
        pckg.defines(function(){
          return {};
        });
      }).to.throw(myModularizer.Error);
    });

    it('should throw an error when a module name is empty', function() {
      var PATH = '/path/to/file.js', myModularizer = new window.Modularizer({
        loader : function(){}
      });

      var pckg = myModularizer.register(PATH);

      expect(function(){
        pckg.defines('',function(){
          return {};
        });
      }).to.throw(myModularizer.Error);
    });

    it('should throw an error when a module name is not a string', function() {
      var PATH = '/path/to/file.js', myModularizer = new window.Modularizer({
        loader : function(){}
      });

      var pckg = myModularizer.register(PATH);

      expect(function(){
        pckg.defines({},function(){
          return {};
        });
      }).to.throw(myModularizer.Error);
    });

    it('should throw an error when a module definition is not a function', function() {
      var PATH = '/path/to/file.js', myModularizer = new window.Modularizer({
        loader : function(){}
      });

      var pckg = myModularizer.register(PATH);

      expect(function(){
        pckg.defines('my.module',{});
      }).to.throw(myModularizer.Error);
    });
  });

  describe('shouldDefine()', function() {
    it('should return true if a module has been registered in the resource', function() {
      var PATH = '/path/to/file.js', MY_MODULE = 'my.module'
      myModularizer = new window.Modularizer({
        loader : function(){}
      });

      var pckg = myModularizer.register(PATH)
        .defines(MY_MODULE,function(){
          return {};
        });
      assert(pckg.shouldDefine(MY_MODULE));
    });
    it('should return false if a module has not been registered in the resource', function() {
      var PATH = '/path/to/file.js', MY_MODULE = 'my.module', myModularizer = new window.Modularizer({
        loader : function(){}
      });

      var pckg = myModularizer.register(PATH);
      assert(pckg.shouldDefine(MY_MODULE) === false);
    });
  });

  describe('load()', function() {
    it('should allow loading its modules by fetching the package from its path', function(done) {
      var PATH = '/path/to/file.js', MY_MODULE = 'my.module',
        pckg,
        myModularizer = new window.Modularizer({
          loader : function(pathToLoad){
            pathToLoad.should.equal(PATH);
            assert(pckg.loading());
            done();
          }
        });

      pckg = myModularizer.register(PATH)
        .defines(MY_MODULE);

      pckg.load();
    });

    it('should load the prerequisite of the module it contains', function(done) {
      var PRE_REQ_PATH = '1/path/to/file.js',PATH = '2/path/to/file.js', MY_MODULE = 'my.module', MY_PRE_REQUISITE = 'my.pre.req',
      myModularizer = new window.Modularizer({
        loader : function(pathToLoad){
          pathToLoad.should.equal(PRE_REQ_PATH);
          done();
        }
      });

      myModularizer.register(PRE_REQ_PATH)
        .defines(MY_PRE_REQUISITE);

      var pckg = myModularizer.register(PATH)
        .defines(MY_MODULE,[MY_PRE_REQUISITE],function(){
          return {};
        });

      pckg.load();
    });
  });

  // Todo: Tests for loading, loaded
  //describe('loading()', function() {
  //
  //});
  //describe('loaded()', function() {
  //
  //});
});
