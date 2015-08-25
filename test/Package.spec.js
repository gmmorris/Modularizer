var dom = require('./utils/dom.js'), chai = require('chai'), expect = chai.expect, sinon = require("sinon"), assert = require('simple-assert'), _ = require('underscore');

describe('Modularizer Package', function() {
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

      myModularizer.register(PRE_REQ_PATH)
        .defines(MY_MODULE);

      myModularizer.register(PATH)
        .defines(MY_SECOND_MODULE);

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
});
