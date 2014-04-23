/**
 * @name Modularizer.js
 * @author Gidi Meir Morris, 2014
 * @version 0.2.0
 *
 */
(function (window, undefined) {
	'use strict';

	var Modularizer;
	/**
	 * @namespace The Modularizer component which encapsulates basic modularization using the AMD API but in a self contained package rather than on the global object
	 *
	 * Initialization of the Resource manager's configuration
	 * @constructs
	 * @param {object} config A configuration object for the YUI Loader
	 * @example
	 * <code><pre>
	 * var package = new Modularizer({
     *    debug : true
     * });
	 * </pre></code>
	 */
	Modularizer = window.Modularizer = function (config) {
		if (typeof config === 'object') {
			this.config = config;
		} else {
			this.config = Modularizer.config;
		}

		// merge config with default values
		for (var prop in Modularizer.config) {
			if (Modularizer.config.hasOwnProperty(prop) && typeof this.config[prop] === "undefined") {
				this.config[prop] = Modularizer.config[prop];
			}
		}

		if (!this.config.loader) {
			if (this.config.detectJQuery && typeof $ === 'function' && typeof $.getScript === 'function') {
				this.config.loader = $.getScript;
			} else {
				this.config.loader = loadFile;
			}
		}

		// The list of packages which have been registered with the resource manager
		// Modules are contained inside a package.
		this.packages = [];

		this.modules = {
			// Container of module definitions. A Module definition is a key in the container with the name of the module and inside it is
			// another object which holds a callback to be called after the module is requested and an array of resources (modules) that the
			// callback expects to recieve as parameters
			definitions: {},
			// Container of modules which have been instanciated
			instances: {}
		};

		// Event holder which allows an callback to be specified for all (*) events or specific events on a namespaced module
		this.events = {};

		if(typeof this.config.timeout === 'number') {
			this.timer = new Timer(this.config.timeout,this);
		} else {
			this.timer = false;
		}

		return this;
	};

	// Current version of the library.
	Modularizer.VERSION = '0.0.1';

	// default config
	Modularizer.config = {
		/* should use console log messages */
		debug: false,
		/* no cachbuster by default */
		cb: false,
		/* no loader function is provided by default, but we do ry and detect jQuery by default */
		loader: false,
		detectJQuery: true,
		/* by default give a 3 second timeout */
		timeout:3000,
		base: '',
		/**
		 * How should requirement which are defined for a module which is unknown be treated? Strictly or Leniently?
		 * True - yes, treat strictly and hence throw an error.
		 * False - no, treat leniently, and hence only throw an error when an actual requirement is made, rather than defined.
		 * */
		strictRequirment:true,
		/***
		 * A string or array of strings with regex matches which will be treated as exceptions for the strictRequirment mode.
		 * This means that if these values are matched with a required resource, then they will be treated in the opposite to the specified mode.
		 * So if strictRequirment is set to true, the matched modules will be treated leniently and vi
		 */
		requirementExceptions:null
	};

	/***
	 * INTERNAL MODULES
	 * Modules which are defined by default by the Modularizer.
	 * If a user module with the same name is specified, the user module will take precedance.
	 * These functions will be called in the context of the Modularaizer package itself
	 */
	Modularizer.prototype.fn = {
		/***
		 * Return the current package
		 */
		'~': function () {
			return this;
		}
	};

	/***
	 * RESOURCE MANAGEMENT & FETCHING USING YUILOADER
	 */

	var ResourceDefinition = Modularizer.Resource = function (pckg, filePath) {

		this.filePath = filePath;
		this.package = pckg;

		// list of moduels this resource contains
		this.modules = false;
		this.prereq = false;

		var definitions = false;
		// A method for specifying a module definition inside the package
		// @ module: The name of a module which is known to reside inside the package
		// @ definedBy: If we wish to specify a definition function which will actually define this module we can do so here
		this.defines = function (module, prerequisites, defineBy) {
			this.package.modules.definitions[module] = this;

			var modules = this.modules = this.modules || [];
			modules.push(module);

			if (typeof prerequisites === "function") {
				defineBy = prerequisites;
				prerequisites = [];
			} else if(prerequisites instanceof Array && defineBy === undefined) {
				throw new ModularizerError('A defining callback must be provided, yet one is missing for module:' + module,Modularizer.ErrorType.InvalidDefinition);
			}

			if (typeof defineBy === 'function' && prerequisites instanceof Array) {
				definitions = definitions || {};
				definitions[module] = {
					def: defineBy,
					req: prerequisites
				};

				// very often a resource will contain two modules which have a dependancy between them - lets make
				// sure none of the depenadencies specifoed for this module are already defined in this resource
				if (prerequisites.length) {
					prerequisites = _.filter(prerequisites, function (prereqModule) {
						return _.indexOf(modules,prereqModule) === -1;
					});
				}
				if (this.prereq && this.prereq.length) {
					this.prereq = _.filter(prerequisites, function (prereqModule) {
						return (prereqModule !== module);
					});
				}

				// If we have prerequisits find their modules so that we can register to their load event
				// we have to do this to prevent resources from being loaded before their prerequisites
				if (prerequisites.length) {
					this.prereq = this.prereq || [];
					var res;
					for (var resourceIndex = 0; resourceIndex < prerequisites.length; resourceIndex++) {
						res = pckg.getResourceByModule(prerequisites[resourceIndex]);
						if (!res) {
							throw new ModularizerError("Modularizer.Resource.defines: A prerequisite has been specified for a module which is unknown to Modularizer",Modularizer.ErrorType.InvalidDefinition);
						}
						this.prereq.push(prerequisites[resourceIndex]);
					}
				}
			}

			//return this for chaining capabilities
			return this;
		};

		var state = RESOURCE_STATE.registered;
		this.loading = function (val) {
			// if a value is being set
			if (val) {
				state = RESOURCE_STATE.loading;
			}
			return (state === RESOURCE_STATE.loading);
		};
		this.loaded = function (val) {
			// if a value is being set
			if (val) {
				state = RESOURCE_STATE.loaded;
				// now that this resource is loaded - see if it has any definition overrides and if
				// so execute them and notify that this module is has been loaded
				if (definitions) {
					for (var module in definitions) {
						if (definitions.hasOwnProperty(module)) {
							// call the definition at package context
							this.package.define(module, definitions[module].req, definitions[module].def);
						}
					}
				}
			}
			return (state === RESOURCE_STATE.loaded);
		};
		this.load = function () {
			this.loading(true);

			if (this.prereq && !pckg.knows(this.prereq)) {
				pckg.load(this.prereq, loadResource, {
					res: this,
					pckg: pckg
				});
			} else {
				loadResource(this, pckg);
			}
		};

		this.shouldDefine = function (module) {
			if (!this.modules) {
				return false;
			}

			for (var index = 0; index < this.modules.length; index++) {
				if (this.modules[index] === module) {
					return true;
				}
			}
		};

		return this;
	};

	/***
	 * Internal functions for resources
	 */
	var onResourceLoadedClosure = function (res, pckg) {
		return function () {
			res.loaded(true);
			// trigger global package loaded event
			pckg.trigger("PACKAGE:loaded");
		};
	};
	var loadResource = function (res, pckg) {
		res = res || this.res;
		pckg = pckg || this.pckg;
		pckg.config.loader(pckg.config.base + res.filePath + (pckg.config.cb? pckg.config.cb : ''), onResourceLoadedClosure(res, pckg));
	};

	var RESOURCE_STATE = {
		registered: 0,
		loading: 1,
		loaded: 2
	};

	/**
	 * Get the value of the "data-modularizer" attribute on the modularizer script tag
	 * <code><pre>
	 * var src = Modularizer.getTagBase();
	 * </pre></code>
	 */
	Modularizer.prototype.getTagBase = function () {
		var allScriptElements = document.getElementsByTagName('script');
		var attr;
		for (var index = allScriptElements.length - 1; index >= 0; index--) {
			attr = allScriptElements[index].getAttribute("data-modularizer");
			if (attr) {
				return attr;
			}
		}
		return false;
	};

	Modularizer.prototype.log = function (dbg) {
		if (this.config.debug) {
			try { //for ie8
				console.log(dbg);
			} catch (e) {
			}
		}
	};

	// set default Base config based on attribute on script tag
	Modularizer.config.base = (function (tagAttribute) {
		if (tagAttribute) {
			return tagAttribute;
		}
		return '';
	})(Modularizer.prototype.getTagBase());

	/**
	 * Register a new file to be added into the manager as a package
	 * The method will add the package to the registeredPackages array and return the package's instance for additional details, such as module definitions and dependency definitions
	 * @param {string} filePath A path, relative to the base URL in the config, to the package's source JS or CSS file
	 * @example
	 * <code><pre>
	 * Modularizer.register('scripts/Libraries/jquery/jquery.js');
	 * </pre></code>
	 */
	Modularizer.prototype.register = function (filePath) {

		// Add the package into the Resource manager's registeredPackages list
		var res = new ResourceDefinition(this, filePath);
		this.packages.push(res);

		// return the package for chaining capabilities
		return res;
	};

	/**
	 */
	Modularizer.prototype.getResourceByModule = function (module) {
		var res = false;
		for (var index = 0; index < this.packages.length && !res; index++) {
			if (this.packages[index].shouldDefine(module)) {
				res = this.packages[index];
			}
		}
		return res;
	};

	/**
	 */
	Modularizer.prototype.load = function (modules, postLoadCallback, context, forModule) {
		var msg;
		if (!this.config.loader) {
			this.log({
				evt: 'Modularizer.load: No loader specified, can\'t load resources.',
				params: {
					module: modules
				}
			});
			return false;
		}

		if (typeof modules === 'string') {
			modules = [modules];
		} else if (!(modules instanceof Array)) {
			msg = "Modularizer.load: Invalid resources specified for the load function";
			this.log(msg);
			throw new ModularizerError(msg,Modularizer.ErrorType.InvalidState);
		}


		// A resource doesn't necceserily correlate to a single module, as sometimes multiple modules are defined in the same file
		var resourcesToLoad = [];
		var modulesToWaitFor = [];
		for (var index = 0; index < modules.length; index++) {
			var currModule = modules[index];
			//not yet instanciated
			if (!this.modules.instances.hasOwnProperty(currModule)) {
				if (!this.modules.definitions.hasOwnProperty(currModule) && !this.fn.hasOwnProperty(currModule)) {
					var shouldThrowError = this.config.strictRequirment;
					// if this is an exception - switch the decision
					shouldThrowError = (isStringMatched(currModule,this.config.requirementExceptions)? !shouldThrowError : shouldThrowError);
					if(shouldThrowError){
						// not defined!
						msg = 'Modularizer.load: No resource defined for the module ' + currModule;
						this.log(msg);
						throw new ModularizerError(msg,Modularizer.ErrorType.InvalidState);
					}

					// we don't know this module but we have been told to be lenient, so we'll tell our component to wait for this module
					// and hopefully someone, somewhere, will define it - timeouts will also ignore this module
					modulesToWaitFor.push(currModule);
				} else {
					var def = this.modules.definitions[currModule];
					if (def instanceof ResourceDefinition) {
						// this module is still a resource, which means it hasn't had a definition call yet
						// so we need to fetch it
						modulesToWaitFor.push(currModule);
						if (!def.loading() && !_.contains(resourcesToLoad, def)) {
							resourcesToLoad.push(def);
						}
					} else if (def instanceof ModuleDefinition && !def.ready()) {
						// we know this module but it isn't ready for usage yet (its waiting for another resource to load) so wait for it
						modulesToWaitFor.push(currModule);
					}
				}
			}
		}

		//register to module load events
		var moduleReadyContext = {
			modules: modulesToWaitFor,
			countDown: modulesToWaitFor.length,
			callback: postLoadCallback,
			context: context || window
		};

		if(forModule && this.config.timeout) {
			moduleReadyContext.forModule = forModule;
		}

		if (modulesToWaitFor.length) {
			for (index = 0; index < modulesToWaitFor.length; index++) {

				var moduleName = modulesToWaitFor[index];
				if(this.timer){
					this.timer.start(moduleName);
				}
				this.on(moduleName + ":ready", moduleReadyCallback, moduleReadyContext);
			}

			// now that we have added hooks for the load events - fetch the files
			if(resourcesToLoad.length) {
				for (index = 0; index < resourcesToLoad.length; index++) {
					resourcesToLoad[index].load();
				}
			}
		} else if (typeof moduleReadyContext.callback === "function") {
			moduleReadyContext.callback.call(moduleReadyContext.context);
		}
	};

	/***
	 * An internal use function which creates a closure which is called whenever a module reports readyness.
	 * We call it with a context which contains a list of modules to wait for. Once they are all loaded - we can continue
	 */
	function moduleReadyCallback() {
		// reduce dountdown by one module
		// when this reaches zero, we know we can execute the final callback
		this.countDown--;
		if (this.countDown === 0) {
			this.callback.call(this.context);
		}
	}

	/***
	 * MODULE MANAGEMENT
	 */

	/**
	 * A method which instanciates a module and retrieves it for usage out side of the manager
	 * @param {string} module The name of the module whose instance you wish to fetch
	 * @example
	 * <code><pre>
	 * Modularizer.fetchResource('Lib.Monkey');
	 * });
	 * </pre></code>
	 */
	Modularizer.prototype.fetchResource = function (module, callqueue) {
		this.log({
			evt: 'Modularizer.fetchResource: begin.',
			params: {
				module: module
			}
		});

		if (callqueue && _.contains(callqueue, module)) {
			callqueue.push(module);
			var errorMessage = 'Modularizer.fetchResource: A circular dependancy has been detected. The module "' + module + '" is required by one of it\'s dependencies as seen in the following dependancy tree:' + callqueue.join("->");
			this.log({
				evt: errorMessage,
				type: 'error',
				params: {
					module: module
				}
			});
			throw new ModularizerError(errorMessage,Modularizer.ErrorType.CircularDependency);
		} else {
			callqueue = callqueue || [];
			callqueue.push(module);
		}

		// Check to see if a definition for this module exists.
		// If, in fact, one does exist, this means we have not yet instanciated it.
		// So we request the module's dependnecies' instances and pass them as parameters to the module's callback.
		// The callback is expected to return an instance of the module to be stored for future retrieval
		if (this.modules.definitions.hasOwnProperty(module)) {
			this.log('Modularizer.fetchResource: retrieve and call module definition.');

			// retireve definition
			var definition = this.modules.definitions[module];

			// If there is no callback, then we return undefined.
			// In such a case, presumably, the module is external and loading the JS file was enough in the first place
			if (definition.callback) {

				// Make sure we have the needed details (callback and dependancies)
				if (!definition.dependancies) {
					definition.dependancies = [];
				} else {
					// Fetch each one of the dependency instances
					for (var index = 0; index < definition.dependancies.length; index++) {
						definition.dependancies[index] = this.fetchResource(definition.dependancies[index], callqueue.slice(0));
					}
				}

				// Call the callback, with the dependancies and then store as a loaded module
				try {
					this.modules.instances[module] = definition.callback.apply(this, definition.dependancies);
				} catch (o_O) {
					this.log({
						evt: 'Modularizer.fetchResource: The definition callback for the following module threw an exception.',
						params: {
							ex: o_O,
							module: module
						}
					});
					throw o_O;
				}
			}

			this.log('Modularizer.fetchResource: delete module definition.');
			// remove from definitions object, otherwise we risk reinstanciating the module
			delete this.modules.definitions[module];
		}

		// Check to see if the module exists in the loaded modules list
		if (this.modules.instances.hasOwnProperty(module)) {
			this.log('Modularizer.fetchResource: retreive loaded module.');
			// return the instance from the list
			return this.modules.instances[module];
		} else if (this.fn.hasOwnProperty(module)) {
			// return the cutom fn instance
			return this.fn[module].call(this);
		} else {
			this.log('Modularizer.fetchResource: the module requested hasn\'t been loaded.');
			// Return undefined... presumably no instance was requested, or it is a mistake.
			// If, in fact, this is a mistake and the module was expected, it is worth examaning both the config file and the actual module file
			// as BOTH include keys for refering to the module (one for registrarion and the other for definition) and they may, accidentaly, be different
			// TODO: Add warning?
			return undefined;
		}
	};

	/**
	 * A helper method for checking whether a specific module has been defined/instanciated.
	 * If it HAS been either defined or instanciated, then its dependencies will also have been by now.
	 * @param {Array} dependancies An array of module names which you wish to make sure have been defined
	 * @example
	 * <code><pre>
	 * Modularizer.knows('Router.Items');
	 * </pre></code>
	 */
	Modularizer.prototype.knows = function (dependancies) {

		// make sure the requested module (resource) is inside an array
		if (typeof(dependancies) === 'string') {
			// replace the single string inside 'dependancies' with an array whose first cell is the resource
			dependancies = [dependancies];
		} else if (!dependancies || !(dependancies.length)) {
			// invalid module sent to be checked, return false
			return false;
		}

		var isCompletelyUnknownToUs, isKnownButNotLoaded, isLoadedButNotReady, hasDef, def;
		for (var index = 0; index < dependancies.length; index++) {
			hasDef = this.modules.definitions.hasOwnProperty(dependancies[index]);
			// if we haven't instanciated or defined even one of these modules, then the answer is - no! We do not know them all!
			isCompletelyUnknownToUs = !(this.modules.instances.hasOwnProperty(dependancies[index]) || hasDef || this.fn.hasOwnProperty(dependancies[index]));
			if (isCompletelyUnknownToUs) {
				return false;
			} else if (hasDef) {
				def = this.modules.definitions[dependancies[index]];
				isKnownButNotLoaded = (def instanceof ResourceDefinition);
				isLoadedButNotReady = (def instanceof ModuleDefinition && !def.ready());
				if (isKnownButNotLoaded || isLoadedButNotReady) {
					return false;
				}
			}
		}

		// if we reached this point, then we knew them all
		return true;
	};

	/**
	 * A method for actually requesting an instance(s) of a module(s) and a callback for calling after it has been retireved
	 * @param {string} dependancies An array of resources the inner callback is expecting to recieve. The order of resources in the array is the order by which they will be sent as parameters
	 * @param {function} callback A callback function to call with the required resources sent as parameters
	 * @example
	 * <code><pre>
	 * Modularizer.require('Router.Items', function(itemsRouter) {
     * itemsRouter.route('!');
     * });
	 * </pre></code>
	 */
//	Modularizer.prototype.requireSynchronously = function (dependancies, callback, context) {
//		return this.require(dependancies, callback, context, true);
//	};


	/**
	 * A method for actually requesting an instance(s) of a module(s) and a callback for calling after it has been retireved
	 * @param {string} resources An array of resources the inner callback is expecting to recieve. The order of resources in the array is the order by which they will be sent as parameters
	 * @param {function} callback A callback function to call with the required resources sent as parameters
	 * @example
	 * <code><pre>
	 * Modularizer.require('Router.Items', function(itemsRouter) {
     * itemsRouter.route('!');
     * });
	 * </pre></code>
	 */
	Modularizer.prototype.require = function (dependancies, callback, context, synchronous) {
		if (!(dependancies instanceof Array)) {
			if (typeof dependancies === 'string') {
				dependancies = [dependancies];
			} else {
				throw new ModularizerError('Modularizer.require: A non array argument has been specified as the list of dependancies.',Modularizer.ErrorType.InvalidArgument);
			}
		}
		if (typeof callback !== "function") {
			// if no funciton callback has been specified we assume the require simply wished to fetch the module definition from
			// the server - we continue as usual, but withou a callback
			callback = false;
		}

		this.log({
			evt: 'Modularizer.require: Require dependancies.',
			params: {
				dependancies: dependancies
			}
		});

		context = context || (context = {});

		// make sure the requested module (resource) is inside an array
		if (typeof(dependancies) === 'string') {
			// replace the single string inside 'resources' with an array whose first cell is the resource
			dependancies = [dependancies];
		} else if (!dependancies || !(dependancies.length)) {
			// invalid module sent to be required, simply call the callback
			throw new ModularizerError('Modularizer.require: An invalid dependancy has been specified for requirment, must be either a module name (string) or an array of module names.',Modularizer.ErrorType.InvalidArgument);
		}

		// This function fetched the actual resoucres and calls the callback.
		// We will either send it to YUI to call after loading what we need or call it directly
		// if there is no need to actually lao anything
		var deliverPayload = function () {
			for (var index = 0; index < dependancies.length; index++) {
				// get the instances of each dependnecy
				dependancies[index] = this.fetchResource(dependancies[index]);
			}
			if (callback) {
				callback.apply(context, dependancies);
			}
			return dependancies;
		};

		if (!this.knows(dependancies)) {

			if (synchronous) {
				// If the request was demanded as synchronous
				throw new ModularizerError('A dependancy has been requested synchronously but has not yet been loaded.',Modularizer.ErrorType.InvalidState);
			}

			this.load(dependancies, deliverPayload, this);
		} else {
			// call the resouce delivery function, as all the modules have already been defined or instanciated anyway
			return deliverPayload.call(this);
		}
	};

	/**
	 * A method for defining a module, a callback which will instanciate it and the resources it needs for instanciation.
	 * @param {string} module The name of the module being defined! This is how we will recognize it throughout the system
	 * @param {Array} resources An array of resource names (module names) which need to be sent to the callback as parameters
	 * @param {function} callback A callback function to call with the required resources sent as parameters. It is expected to return a reference to the instance.
	 * @example
	 * <code><pre>
	 * Modularizer.define('Router.Items', ['Engine.MVC'], function(MVCEngine) {
	 * ItemsRouter = MVCEngine.Instanciate('Router.Items');
	 *
	 * return ItemsRouter;
	 * });
	 *  </pre></code>
	 */
	Modularizer.prototype.define = function (module, dependancies, callback) {

		//as the dependancies are optional, check to see if perhaps the callback was sent second and is now inside the 'dependancies' variable
		if (typeof(dependancies) === 'function') {
			callback = dependancies;
			dependancies = [];
		} else if (!dependancies || !(dependancies.length)) {
			// if an invalid dependancies array has been sent simply replace it with an empty array. hopefully the callback will manage to stomach the lack of parameters
			// TODO: Warning?
			dependancies = [];
		}

		// Only add the module definition if there is a callback, otherwise it is pointless as no definition will become an object without a callback to define it, anyway.
		// We will probably have this kind of behaviour if for some reason the YUI loader configuration isn't possible for preventing a file from being loaded twice.
		// Hopefully we will never see this sort of behaviour.
		if (typeof(callback) === 'function') {
			var moduleDefinition = this.modules.definitions[module] = new ModuleDefinition(callback, dependancies);
			if (dependancies.length && !this.knows(dependancies)) {
				// if this definition actually requires any resources to be executed, then we might as well fetch them
				// as we will definitely need them - otherwise this definition wouldn't have been fetch from the server
				this.load(dependancies, function () {
					moduleDefinition.ready(true);

					// extend timeout timer
					if(this.timer){
						this.timer.mark(module);
					}

					//notify all that this module definition is ready to be used (all it's resources are loaded)
					this.trigger(module + ":ready");
				}, this, module);
			} else {
				// no dependancies? Ready to go!
				moduleDefinition.ready(true);
				this.trigger(module + ":ready");
			}
		} else {
			throw new ModularizerError('A defining callback must be provided, yet one is missing for module:' + module,Modularizer.ErrorType.InvalidDefinition);
		}
	};

	/***
	 * Module component which describes a specific module definition
	 * @param callback (function) The callback that instanciates the module or provides the prototype from which instances are made
	 * @param dependancies (array[string]) List of module names which this module definition needs before it can be used
	 * @returns {window.Modularizer.Module}
	 * @constructor
	 */
	var ModuleDefinition = Modularizer.Module = function (callback, dependancies) {
		var isReady = false;
		this.ready = function (val) {
			if (typeof val === 'boolean') {
				isReady = val;
			}
			return isReady;
		};
		this.callback = callback;
		this.dependancies = dependancies;
		return this;
	};

	Modularizer.prototype.ErrorType = {
		Timeout : 0,
		InvalidDefinition : 1,
		InvalidState: 2,
		CircularDependency: 3,
		InvalidArgument: 4
	};
	var ModularizerError = Modularizer.prototype.Error = function (message,type) {
		this.name = "Modularizer.Error";
		this.type = type;
		this.message = message;
		return this;
	};
	ModularizerError.prototype = Error.prototype;

	/**
	 *  INTERNAL EVENT MANGEMENT
	 **/
	Modularizer.prototype.on = function (event, callback, context) {
		if (typeof event !== 'string') {
			this.log({
				evt: 'Modularizer.on: An invalid (non string) event name has been specified.',
				params: {
					event: event
				}
			});
		} else if (typeof callback !== 'function') {
			this.log({
				evt: 'Modularizer.on: An invalid (non function) event callback has been specified.',
				params: {
					callback: callback
				}
			});
		}
		event = _.trim(event).split(":");
		if (event.length) {
			if (event.length === 1) {
				// if no specific event has type has been specified but just the namespace, then
				// link to the "all" event selector which is *
				event.push("*");
			}

			var moduleName = event[0];
			var eventName = event[1];

			this.events[moduleName] = this.events[moduleName] || {};
			this.events[moduleName][eventName] = this.events[moduleName][eventName] || [];

			this.events[moduleName][eventName].push([callback, context || window]);
		}
	};

	Modularizer.prototype.trigger = function (event) {
		this.log("Triggered event: " + event);
		if (typeof event !== 'string') {
			this.log({
				evt: 'Modularizer.trigger: An invalid (non string) event name has been specified.',
				params: {
					event: event
				}
			});
		}
		event = _.trim(event).split(":");
		if (event.length) {

			var moduleName = event[0];
			var eventName = event[1];

			if (this.events.hasOwnProperty(moduleName)) {
				if (event.length === 2) {
					executeEventCallbacks.call(this, moduleName, event[1]);
				}
				executeEventCallbacks.call(this, moduleName, '*');

				// check module and see if it has any more callbacks attached to it - if not, remove it from the events object all together
				var foundEvents = false;
				for (var prop in this.events[moduleName]) {
					if (this.events[moduleName].hasOwnProperty(prop)) {
						// found an event callback still on it - do nothing
						foundEvents = true;
					}
				}
				if (!foundEvents) {
					// no events bound to this module - remove it from the events object for cleanliness
					delete this.events[moduleName];
				}
			}

		}
	};

	/***
	 * Check that the current state of the modularizer is valid in the sense that it isn't waiting on something to be
	 * initialized but isn't actually performing any file fetching or object initialization OR that it has been waiting for them
	 * too long.
	 */
	function checkModularizerValidity(modularizerPackage){
		var inValididty = false;
		if(modularizerPackage.events) {
			for(var eventComponentName in modularizerPackage.events) {
				if(modularizerPackage.events.hasOwnProperty(eventComponentName)) {
					// we have events which are still being listened for
					// this ,means we have at least one component which is waiting for another component.
					// we will now check to see if it is waiting for the 'ready' event which means the other one hasn't completed
					// its initialization process yet, which mean we are not in a valid state for this call as this call is ,eamt
					// to test the timeout period
					var componentEvents = modularizerPackage.events[eventComponentName],
						hasAReadyEvent = componentEvents.hasOwnProperty('ready') && componentEvents.ready instanceof Array && componentEvents.ready.length;
					// this means there are callbacks waiting for the ready event on this component
					if( hasAReadyEvent &&
						(!modularizerPackage.config.strictRequirment ||
						(modularizerPackage.config.strictRequirment && !isStringMatched(eventComponentName,modularizerPackage.config.requirementExceptions)))) {
						// if we are in strict mode but this specific module has been specified as being treated as a lenient requirment
						// then we ignore it.
						// If, on the other hand, we are in lenient mode in general, then we want the timeout configuration to take
						// precedance over leniency, so we ignore this situation
						inValididty = inValididty || [];
						inValididty.push(eventComponentName);
					}
				}
			}
		}

		if(inValididty) {
			// In *normal timeout mode*, this is enough for us to know that the modularizer is invalid, so we'll
			// add this name to the list and move on
			if(modularizerPackage.config.debug) {
				// In *debug timeout mode* we want more information as to why the component isn't ready, so we'll go digging to
				// identify circular references etc.
				// lets take a look at the context of the callback and perhaps we can infur from that who is waiting for this module and why
				inValididty = narrowDownInvalidModuleNames(modularizerPackage,inValididty);
			}
			return new InvalidState(inValididty);
		}
		//valid
		return true;
	}

	/***
	 * Go over a list of module names which are invalid and narrow them down to the root problems
	 * The idea is that if A is waiting for B which is waiting for C and C is hanging, then all three are seen
	 * as invalid, but we only really care about C because he is the root of the problem - narrow down that list!
	 */
	function narrowDownInvalidModuleNames(modularizerPackage, listOfInvalidModules, depQueue){
		var eventComponentName, narrowedDownList,
			moduleDefs = modularizerPackage.modules.definitions,
			moduleIndex, moduleCount = listOfInvalidModules.length;

		// keep track of the dep queue - we need this to identify a circular reference
		depQueue = depQueue || [];

		for(moduleIndex = 0; moduleIndex  < moduleCount; moduleIndex++) {
			eventComponentName = listOfInvalidModules[moduleIndex];
			if(_.contains(depQueue,eventComponentName)) {
				// we have already investigated this component... this means we're in a circular reference
				listOfInvalidModules[moduleIndex] = {
					type:ModuleDefinition,
					name:eventComponentName,
					problem:'has a circular reference with ' + depQueue.pop()
				};
			} else if(moduleDefs.hasOwnProperty(eventComponentName)) {
				if(moduleDefs[eventComponentName] instanceof ModuleDefinition) {
					// module is ready? remove from list
					if(!moduleDefs[eventComponentName].ready()) {
						// module is not ready? Figure out why
						narrowedDownList = narrowDownInvalidModuleNames(
							modularizerPackage,
							moduleDefs[eventComponentName].dependancies.slice(0),
							// clone Queue and add this new module to the end of it
							cloneAndPush(depQueue,eventComponentName));

						if(narrowedDownList.length) {
							// this module is waiting for other - add the mto the list

							// skip to the next module (jumping over those we just evaluated
							moduleCount += narrowedDownList.length - 1;
							moduleIndex += narrowedDownList.length - 1;

							// convert the list of modules to an argument list for "splice" by adding the index of the current module (that we're removing) as
							// first arg then "1" as second as we wish to remove that module form the list and then adding the narrowedDownList of modules
							narrowedDownList.splice(0,0,moduleIndex,1);
							listOfInvalidModules.splice.apply(listOfInvalidModules,narrowedDownList);
						} else {
							//else this module isn't waiting for anyone else, it is the source of the problem - leave it in the list
							listOfInvalidModules[moduleIndex] = {
								type:ModuleDefinition,
								name:eventComponentName,
								problem:'never reported completion, perhaps an internal error in it caused it to fail'
							};
						}
					}
				} else if(moduleDefs[eventComponentName] instanceof ResourceDefinition) {
					if(moduleDefs[eventComponentName].loaded()) {
						// resource loaded? then it failed to define its module - this is the problem
						listOfInvalidModules[moduleIndex] = {
							type:ResourceDefinition,
							path:moduleDefs[eventComponentName].filePath,
							problem:'didn\'t contain a definition for ' + eventComponentName
						};
					} else {
						// the resource hasn't loaded? That's the problem
						listOfInvalidModules[moduleIndex] = {
							type:ResourceDefinition,
							path:moduleDefs[eventComponentName].filePath,
							problem:'wasn\'t loaded at all'
						};
					}
				}
			}
		}

		if(listOfInvalidModules.length) {
			//remove duplicates, as often a single point of failure brings down multiple components
			listOfInvalidModules = (function(list){
				var keys = {r:{},m:{}};
				return _.filter(list,function(item){
					if(typeof item === 'string') {
						if(!keys.m.hasOwnProperty(item)) {
							keys.m[item] = true;
							return true;
						}
					} else if(item.type === ResourceDefinition && !keys.r.hasOwnProperty(item.path)) {
						keys.r[item.path] = true;
						return true;
					} else if(item.type === ModuleDefinition && !keys.m.hasOwnProperty(item.name)) {
						keys.m[item.name] = true;
						return true;
					}
					return false;
				});
			})(listOfInvalidModules);
		}

		return listOfInvalidModules;
	}

	function executeEventCallbacks(moduleName, eventName) {
		// cycle registered callbacks for event and remove from events object
		if (this.events.hasOwnProperty(moduleName)) {
			if (this.events[moduleName].hasOwnProperty(eventName)) {
				var callbacks = this.events[moduleName][eventName];
				delete this.events[moduleName][eventName];
				for (var index = 0; index < callbacks.length; index++) {
					callbacks[index][0].call(callbacks[index][1]);
				}
			}
		}
	}

	/**
	 * File Handling
	 **/
	var lastScriptOnPage;

	function loadFile(filePath, fileType, callback) {

		// get las tscript tag on page or use the last one created as a reference
		lastScriptOnPage = lastScriptOnPage || (function () {
			var scripts = document.getElementsByTagName("script");
			return scripts[scripts.length - 1];
		})();

		if (typeof fileType === "function") {
			callback = fileType;
			fileType = null;
		}
		if (typeof callback !== 'function') {
			callback = false;
		}

		var fileTag;
		switch (fileType) {
			case 'css':
				var fileref = document.createElement("link");
				fileTag.setAttribute("rel", "stylesheet");
				fileTag.setAttribute("type", "text/css");
				fileTag.setAttribute("href", filePath);
				break;
			default:
			case 'js':
				fileTag = document.createElement('script');
				fileTag.setAttribute("type", "text/javascript");
				fileTag.setAttribute("src", filePath);
				break;
		}

		if (callback) {
			if (fileTag.readyState) {  //IE
				fileTag.onreadystatechange = function () {
					if (fileTag.readyState === "loaded" || fileTag.readyState === "complete") {
						fileTag.onreadystatechange = null;
						callback();
					}
				};
			} else {  //Others
				fileTag.onload = function () {
					callback();
				};
			}
		}

		if (fileTag) {
			lastScriptOnPage.parentNode.insertBefore(fileTag, lastScriptOnPage.nextSibling);
			lastScriptOnPage = fileTag;
		}
	}

	/***
	 * INTERNAL FUNCTIONS AND MEMBERS
	 */
	var Timer = function(timeout,modularizerPackage){
		// the predefined timeout duration
		this.timeout = timeout;

		// the setTimeout timeout response
		this.checkTimeout = null;
		/***
		 * Start a timer with the current timout.
		 * Whenever the timeout is executed it will check if any resources are being loaded and whether any modules are marked as not ready.
		 * If no resources are loading but modules aren't ready that means that a problem has occurred and we trigger a timeout.
		 */
		this.start = function(id){
			if(this.checkTimeout) {
				this.clear();
			}
			if(id) {
				if(timedModules.hasOwnProperty(id)) {
					delete timedModules[id];
				} else {
					timedModules[id] = true;
				}
			}

			this.checkTimeout = setTimeout(function(){
				var invalidState = checkModularizerValidity(modularizerPackage);
				if(invalidState !== true && typeof invalidState === 'object') {
					throw new ModularizerError("Modularizer.timer: A timeout has occurred. " + invalidState.toString(),Modularizer.ErrorType.Timeout);
				}
			},this.timeout);
		};

		// an object to hold references to all of the modules which are currently waiting to be initialized
		// we use this to test the validity of the modularizer for timeout needs
		var timedModules = {};
		/***
		 * Mark that a module has been marked as ready and extend the time to the timeout check
		 */
		this.mark = function(id){
			if(this.checkTimeout) {
				this.clear();
				this.start(id);
			}
		};

		this.clear = function(){
			clearTimeout(this.checkTimeout);
			this.checkTimeout = null;
		};
		return this;
	};

	var InvalidState = function(invalidModules){
		invalidModules = invalidModules || [];

		this.toString = function(){
			if(invalidModules.length) {
				var messages = [];
				for(var index = 0; index < invalidModules.length;index++) {
					if(typeof invalidModules[index] === 'string') {
						messages.push(invalidModules[index]);
					} else if(typeof invalidModules[index] === 'object') {
						if(invalidModules[index].type === ResourceDefinition) {
							messages.push("The resource at path '" + invalidModules[index].path + "' " + invalidModules[index].problem);
						} else if(invalidModules[index].type === ModuleDefinition) {
							messages.push("The module named '" + invalidModules[index].name + "' " + invalidModules[index].problem);
						}
					}
				}
				return "The following components are have not been initialized on time:" + messages.join(', ');
			}
			return 'The Modularizer has timed out, but no specific modules could be narrowed down to the source of the problem.';
		};

		return this;
	};

	// clone an array and push an element into the new clone
	var cloneAndPush = function(queue,module){
		queue = queue.slice(0);
		queue.push(module);
		return queue;
	};

	var cachedMatching = {},
		isStringMatched = function(nameToMatch,matchingOptions){
			if(typeof matchingOptions === 'string') {
				matchingOptions = [matchingOptions];
			}
			if(matchingOptions instanceof Array) {
				var pattern;
				for(var index = 0; index < matchingOptions.length;index++) {
					pattern = matchingOptions[index];
					if(typeof pattern !== 'string') {
						return false;
					}
					if(!cachedMatching.hasOwnProperty(matchingOptions[index])) {
						cachedMatching[matchingOptions[index]] = new RegExp(matchingOptions[index]);
					}
					if(cachedMatching[matchingOptions[index]].test(nameToMatch)) {
						return true;
					}
				}
			}
			return false;
	};

	var _ = {
		trim : function(str){
			if(typeof str === 'string') {
				if(typeof str.trim === 'function') {
					// use native
					return str.trim();
				} else {
					return str.replace(/^\s+|\s+$/g, '');
				}
			}
			return str;
		},
		indexOf : function (haystack, needle) {
			var indexOf;
			if (typeof Array.prototype.indexOf === 'function') {
				indexOf = Array.prototype.indexOf;
			} else {
				/**
				 * Older IEs don't have indexOf on Arrays
				 * */
				indexOf = function (needle) {
					var index = -1;

					for (var currItemIndex = 0; currItemIndex < this.length; currItemIndex++) {
						if (this[currItemIndex] === needle) {
							index = currItemIndex;
							break;
						}
					}

					return index;
				};
			}

			return indexOf.call(haystack, needle);
		},
		filter : (function () {
			if (Array.prototype.filter) {
				return function (arr, func) {
					return arr.filter(func);
				};
			} else {
				var filter = function (fun /*, thisArg */) {
					"use strict";

					if (this === void 0 || this === null)
						throw new TypeError();

					var t = Object(this);
					var len = t.length >>> 0;
					if (typeof fun != "function")
						throw new TypeError();

					var res = [];
					var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
					for (var i = 0; i < len; i++) {
						if (i in t) {
							var val = t[i];

							// NOTE: Technically this should Object.defineProperty at
							//       the next index, as push can be affected by
							//       properties on Object.prototype and Array.prototype.
							//       But that method's new, and collisions should be
							//       rare, so use the more-compatible alternative.
							if (fun.call(thisArg, val, i, t))
								res.push(val);
						}
					}

					return res;
				};
				return function (arr, func) {
					return filter.call(arr, func);
				};
			}
		})(),
		contains : function (haystack, needle) {
			return (this.indexOf(haystack, needle) >= 0);
		}
	};

})(this);