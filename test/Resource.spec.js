var dom = require('./utils/dom.js'), chai = require('chai'), expect = chai.expect;
chai.should();

describe('Modularizer Resource', function() {
	// Create a fake global `window` and `document` object and inject default script
	dom.init(true);

	describe('defines()', function() {
		it('should allow defining a module inside of the Resource using a name, list of prerequisite modules and a defining function', function() {
		});

		it('should allow defining a module inside of the Resource using just a name and a defining function', function() {
		});

		it('should throw an error when a module name is omitted', function() {
		});

		it('should throw an error when a module name is empty', function() {
		});

		it('should throw an error when a module name is not a string', function() {
		});

		it('should throw an error when a module definition is omitted', function() {
		});

		it('should throw an error when a module definition is not a function', function() {
		});
	});

	describe('shouldDefine()', function() {
		it('should return true if a module has been registered in the resource', function() {
		});
		it('should return false if a module has not been registered in the resource', function() {
		});
	});

	describe('load()', function() {
		it('should allow loading its modules', function() {
		});

		it('should load the prerequisite of the module it contains', function() {
		});

		it('should load the multiple prerequisites of the module it contains', function() {
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

describe('Modularizer register()', function() {
	// Create a fake global `window` and `document` object and inject default script
	dom.init(true);

	it('should add a resource in the package based on a file path', function() {
	});

	it('should return the newly created package', function() {
	});
});

describe('Modularizer getResourceByModule()', function() {
	// Create a fake global `window` and `document` object and inject default script
	dom.init(true);

	it('should return false if an invalid module name is specified', function() {
	});

	it('should return false if no resource exists in the package', function() {
	});

	it('should return false if no resource exists in the package that contains the module', function() {
	});

	it('should return a package if it contains the requested module', function() {
	});
});
