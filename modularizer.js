/**
 * @name Modularizer.js
 * @author Gidi Meir Morris, 2014
 * @version 0.1
 *
 */
(function (window,undefined) {
    'use strict';

    var Modularizer;
    /**
     * @namespace The Modularizer component which encapsulates basic modularization using the AMD API but in a self contained package rather than on the global object
     *
     * Initialization of the Resource manager's configuration
     * @constructs
     * @param {object} config A configuration object for the YUI Loader
     * @example
     <code><pre>
     var package = new Modularizer({
        debug : true
     });
     </pre></code>
     */
    Modularizer = window.Modularizer = function(config){
        if (typeof config == 'object') {
            this.config = config;
        } else{
            this.config = Modularizer.config;
        }
		
		// merge config with default values
		for(var prop in Modularizer.config){
			if(Modularizer.config.hasOwnProperty(prop) && typeof this.config[prop] == "undefined") {
				this.config[prop] = Modularizer.config[prop];
			}
		}
		
		if(!this.config.loader) {
			if(this.config.detectJQuery && typeof $ == 'function' && typeof $.getScript == 'function') {
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
            definitions : {},
            // Container of modules which have been instanciated
            instances : {}
        };
		
		// Event holder which allows an callback to be specified for all (*) events or specific events on a namespaced module
		this.events = {};

        return this;
    };

    // Current version of the library.
    Modularizer.VERSION = '0.0.1';

    // default config
    Modularizer.config = {
		/* should use console log messages */
        debug:false,
		/* cachbuster */
		cb:(new Date()).getTime(),
		loader:false,
		detectJQuery:true,
		base: ''
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
		'~' : function(){
			return this;
		}
	};
	
	/***
	* RESOURCE MANAGEMENT & FETCHING USING YUILOADER
	*/
	
	Modularizer.Resource = function(pckg,filePath){
		
		this.filePath = filePath;
		this.package = pckg;
		
		var definitions=false;
        // A method for specifying a module definition inside the package
        // @ module: The name of a module which is known to reside inside the package
		// @ definedBy: If we wish to specify a definition function which will actually define this module we can do so here
        this.defines= function (module,prerequisites,defineBy) {
            this.package.modules.definitions[module] = this;
			
			if(typeof prerequisites == "function") {
				defineBy = prerequisites;
				prerequisites = [];
			}
			
			if(typeof defineBy == 'function' && prerequisites instanceof Array) {
				definitions = definitions || {};
				definitions[module] = {
					def : defineBy,
					req : prerequisites
				};
			}

            //return this for chaining capabilities
            return this;
        };

		var loaded = false;
		this.loaded = function(val){
			// if a value is being set
			if(val) {
				loaded = val;
				
				// now that this resource is loaded - see if it has any definition overrides and if 
				// so execute them and notify that this module is has been loaded
				if(definitions) {
					for(var module in definitions) {
						if(definitions.hasOwnProperty(module)) {
							// call the definition at package context
							this.package.define(module,definitions[module].req,definitions[module].def);
						}
					}
				}
			}
			return loaded;
		};
		
		return this;        
	};

    /**
     * Get the value of the "data-modularizer" attribute on the modularizer script tag
     <code><pre>
     var src = Modularizer.getTagBase();
     </pre></code>
     */
    Modularizer.prototype.getTagBase = function () {
        var allScriptElements = document.getElementsByTagName('script');
		var attr;
        for (var index = allScriptElements.length-1; index >= 0; index--) {
			attr = allScriptElements[index].getAttribute("data-modularizer");
            if (attr) {
				return attr;
            }
        }
		return false;
    };
	
	// set default Base config based on attribute on script tag
	Modularizer.config.base = (function(tagAttribute){
		if(tagAttribute) {
			return tagAttribute;
		}
		return '';
	})(Modularizer.prototype.getTagBase());

    /**
     * Register a new file to be added into the manager as a package
     * The method will add the package to the registeredPackages array and return the package's instance for additional details, such as module definitions and dependency definitions
     * @param {string} filePath A path, relative to the base URL in the config, to the package's source JS or CSS file
     * @example
     <code><pre>
     Modularizer.register('scripts/Libraries/jquery/jquery.js');
     </pre></code>
     */
    Modularizer.prototype.register = function (filePath) {

        // Add the package into the Resource manager's registeredPackages list
		var res = new Modularizer.Resource(this,filePath);
        this.packages.push(res);

        // return the package for chaining capabilities
        return res;
    }

    /**
     */
    Modularizer.prototype.load = function (modules, postLoadCallback,context) {
		if(!this.config.loader) {

	        this.log({
	            evt: 'Modularizer.load: No loader specified, can\'t load resources.',
	            params: {
	                module: modules
	            }
	        });
			return false;
		}		
		var _loader = this.config.loader;
		
		if(typeof modules == 'string') {
			modules = [modules];
		} else if(!(modules instanceof Array)) {
			throw new Error("Modularizer.load: Invalid resources specified for the load function");
		}
		
		
		// A resource doesn't necceserily correlate to a single module, as sometimes multiple modules are defined in the same file
		var resourcesToLoad = [];
		var modulesToWaitFor = [];
        for (var index = 0; index < modules.length; index++) {
			var currModule = modules[index];
			//not yet instanciated
			if(!this.modules.instances.hasOwnProperty(currModule)) {
				if(!this.modules.definitions.hasOwnProperty(currModule) && !this.fn.hasOwnProperty(currModule)) {
					// not defined!
			        this.log({
			            evt: 'Modularizer.load: No resource defined for module.',
			            params: {
			                module: currModule
			            }
			        });
					return false;
				} 
				
				var res = this.modules.definitions[currModule];
				if(res instanceof Modularizer.Resource) {
					// this module is still a resource, which means it hasn't had a definition call yet
					// so we need to fetch it
					modulesToWaitFor.push(currModule);
					resourcesToLoad.push(res);			
				}
			}					
		}		
		
		//register to module load events
		var moduleReadyContext = {
			countDown : modulesToWaitFor.length,
			callback: postLoadCallback,
			context : context || window
		};
		for(var index = 0; index < modulesToWaitFor.length;index++) {
			this.on(modulesToWaitFor[index] + ":ready",moduleReadyCallback,moduleReadyContext);
		}
		
		// now that we have added hooks for the load events - fetch the files
		for(index = 0; index < resourcesToLoad.length;index++) {
			_loader(this.config.base + resourcesToLoad[index].filePath,(function(res,pckg){
				return function(){
					res.loaded(true);
					// trigger global package loaded event
					pckg.trigger("PACKAGE:loaded");
				};
			})(resourcesToLoad[index],this));
		}		
    };
	
	/***
	* An internal use function which creates a closure which is called whenever a module reports readyness.
	* We call it with a context which contains a list of modules to wait for. Once they are all loaded - we can continue
	*/
	function moduleReadyCallback(){
		// reduce dountdown by one module
		// when this reaches zero, we know we can execute the final callback
		this.countDown--;
		if(this.countDown === 0) {
			this.callback.call(this.context);
		}
	};

	/***
	* MODULE MANAGEMENT
	*/

    /**
     * A method which instanciates a module and retrieves it for usage out side of the manager
     * @param {string} module The name of the module whose instance you wish to fetch
     * @example
     <code><pre>
     Modularizer.fetchResource('Lib.Monkey');
     });
     </pre></code>
     */
    Modularizer.prototype.fetchResource = function (module) {
        this.log({
            evt: 'Modularizer.fetchResource: begin.',
            params: {
                module: module
            }
        });

        // Check to see if a definition for this module exists.
        // If, in fact, one does exist, this means we have not yet instanciated it.
        // So we request the module's dependnecies' instances and pass them as parameters to the module's callback.
        // The callback is expected to return an instance of the module to be stored for future retrieval
        if (this.modules.definitions.hasOwnProperty(module)) {
            this.log('Modularizer.fetchResource: retreive and call module definition.');

            // retireve definition
            var definition = this.modules.definitions[module];
			
            // Make sure we have the needed details (callback and dependancies)
            if (!definition.dependancies) {
                definition.dependancies = [];
            }

            // If there is no callback, then we return undefined.
            // In such a case, presumably, the module is external and loading the JS file was enough in the first place
            if (definition.callback) {
                // Fetch each one of the dependency instances
                for (var index = 0; index < definition.dependancies.length; index++) {
                    definition.dependancies[index] = this.fetchResource(definition.dependancies[index]);
                }

                // Call the callback, with the dependancies and then store as a loaded module
				try {
					this.modules.instances[module] = definition.callback.apply(this, definition.dependancies);					
				} catch(o_O) {
					this.log({
						evt: 'Modularizer.fetchResource: The definition callback for the following moduel threw an exception.',
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
     <code><pre>
     Modularizer.knows('Router.Items');
     </pre></code>
     */
    Modularizer.prototype.knows = function (dependancies) {

        // make sure the requested module (resource) is inside an array
        if (typeof(dependancies) == 'string') {
            // replace the single string inside 'dependancies' with an array whose first cell is the resource
            dependancies = [dependancies];
        } else if (!dependancies || !(dependancies.length)) {
            // invalid module sent to be checked, return false
            return false;
        }

        for (var index = 0; index < dependancies.length; index++) {
            if (!(this.modules.instances.hasOwnProperty(dependancies[index]) || this.modules.definitions.hasOwnProperty(dependancies[index])|| this.fn.hasOwnProperty(dependancies[index])) ||
				(this.modules.definitions[dependancies[index]] instanceof Modularizer.Resource)) {
                // if we haven't instanciated or defined even one of these modules, then the answer is - no! We do not know them all!
                return false;
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
     <code><pre>
     Modularizer.require('Router.Items', function(itemsRouter) {
     itemsRouter.route('!');
     });
     </pre></code>
     */
    Modularizer.prototype.requireSynchronously = function (dependancies, callback, context) {
        return this.require(dependancies, callback, context, true);
    };


    /**
     * A method for actually requesting an instance(s) of a module(s) and a callback for calling after it has been retireved
     * @param {string} resources An array of resources the inner callback is expecting to recieve. The order of resources in the array is the order by which they will be sent as parameters
     * @param {function} callback A callback function to call with the required resources sent as parameters
     * @example
     <code><pre>
     Modularizer.require('Router.Items', function(itemsRouter) {
     itemsRouter.route('!');
     });
     </pre></code>
     */
    Modularizer.prototype.require = function (dependancies, callback, context, synchronous) {
		if(!(dependancies instanceof Array)) {
			if(typeof dependancies == 'string') {
				dependancies = [dependancies];
			} else {
				throw new Error('Modularizer.require: A non array argument has been specified as the list of dependancies.');							
			}
		}
		if(typeof callback != "function") {
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
        if (typeof(dependancies) == 'string') {
            // replace the single string inside 'resources' with an array whose first cell is the resource
            dependancies = [dependancies];
        } else if (!dependancies || !(dependancies.length)) {
            // invalid module sent to be required, simply call the callback
            throw new Error('An invalid dependancy has been specified for requirment, must be either a module name (string) or an array of module names.');
        }

        // This function fetched the actual resoucres and calls the callback.
        // We will either send it to YUI to call after loading what we need or call it directly
        // if there is no need to actually lao anything
        var deliverPayload = function () {
			for (var index = 0; index < dependancies.length; index++) {
                // get the instances of each dependnecy
                dependancies[index] = this.fetchResource(dependancies[index]);
            }
			if(callback) {
				callback.apply(context,dependancies);
			}
			return dependancies;
        };

        if (!this.knows(dependancies)) {

            if (synchronous) {
                // If the request was demanded as synchronous
                throw new Error('A dependancy has been requested synchronously but has not yet been loaded.');
            }

            this.load(dependancies, deliverPayload,this);
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
     <code><pre>
     Modularizer.define('Router.Items', ['Engine.MVC'], function(MVCEngine) {
     ItemsRouter = MVCEngine.Instanciate('Router.Items');

     return ItemsRouter;
     });
     </pre></code>
     */
    Modularizer.prototype.define = function (module, dependancies, callback) {

      	//as the dependancies are optional, check to see if perhaps the callback was sent second and is now inside the 'dependancies' variable
      	if (typeof(dependancies) == 'function') {
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
        if (typeof(callback) == 'function') {
            this.modules.definitions[module] = {
                callback: callback,
                dependancies: dependancies
            };
        }
		
		if(dependancies.length && !this.knows(dependancies)) {
			// if this definition actually requires any resources to be executed, then we might as well fetch them
			// as we will definitely need them - otherwise this definition wouldn't have been fetch from the server
            this.load(dependancies,function(){
				//notify all that this module definition is ready to be used (all it's resources are loaded)
            	this.trigger(module+":ready");
            },this);			
		} else {
			// no dependancies? Ready to go!
			this.trigger(module+":ready");
		}
    };

    Modularizer.prototype.log = function (dbg) {
        if (this.config.debug) {
            try { //for ie8
                console.log(dbg);
            } catch (e) {
            }
        }
    };
	
	
	/**
		INTERNAL EVENT MANGEMENT
	**/
	Modularizer.prototype.on = function(event,callback,context){
		if(typeof event != 'string') {
	        this.log({
	            evt: 'Modularizer.on: An invalid (non string) event name has been specified.',
	            params: {
	                event: event
	            }
	        });
		} else if(typeof callback != 'function') {
	        this.log({
	            evt: 'Modularizer.on: An invalid (non function) event callback has been specified.',
	            params: {
	                callback: callback
	            }
	        });
		}
		event = event.trim().split(":");
		if(event.length) {
			if(event.length == 1) {
				// if no specific event has type has been specified but just the namespace, then
				// link to the "all" event selector which is *
				event.push("*");
			}			
			
			var moduleName = event[0];
			var eventName = event[1];
			
			this.events[moduleName] = this.events[moduleName] || {};
			this.events[moduleName][eventName] = this.events[moduleName][eventName] || [];
			
			this.events[moduleName][eventName].push([callback,context || window]);
		}
	};
	
	Modularizer.prototype.trigger = function(event){
		if(typeof event != 'string') {
	        this.log({
	            evt: 'Modularizer.trigger: An invalid (non string) event name has been specified.',
	            params: {
	                event: event
	            }
	        });
		}
		event = event.trim().split(":");
		if(event.length) {
			
			var moduleName = event[0];
			var eventName = event[1];

			if(this.events.hasOwnProperty(moduleName)) {
				if(event.length == 2) {
					executeEventCallbacks.call(this,moduleName,event[1]);
				}						
				executeEventCallbacks.call(this,moduleName,'*');
				
				// check module and see if it has any more callbacks attached to it - if not, remove it from the events object all together
				var foundEvents = false;
				for(var prop in this.events[moduleName]) {
					if(this.events[moduleName].hasOwnProperty(prop)) {
						// found an event callback still on it - do nothing
						foundEvents = true;
					}
				}
				if(!foundEvents) {
					// no events bound to this module - remove it from the events object for cleanliness
					delete this.events[moduleName];
				}
			}
			
		}		
	};
	
	function executeEventCallbacks(moduleName,eventName){
		// cycle registered callbacks for event and remove from events object
		if(this.events.hasOwnProperty(moduleName)) {
			if(this.events[moduleName].hasOwnProperty(eventName)) {
				var callbacks = this.events[moduleName][eventName];
				delete this.events[moduleName][eventName];
				for(var index = 0; index < callbacks.length;index++) {
					callbacks[index][0].call(callbacks[index][1]);
				}					
			}					
		}
	};
	
	/**
	* File Handling
	**/
	var lastScriptOnPage;
	function loadFile(filePath, fileType,callback){
		
		// get las tscript tag on page or use the last one created as a reference
		lastScriptOnPage = lastScriptOnPage || (function(){
			var scripts = document.getElementsByTagName("script");
			return scripts[scripts.length-1];
		})();
		
		if(typeof fileType == "function") {
			callback = fileType;
			fileType = null;
		}
		if(typeof callback != 'function') {
			callback = false;
		}
		
		var fileTag;		
		switch(fileType) {
			case 'css':
				var fileref=document.createElement("link")
				fileTag.setAttribute("rel", "stylesheet")
				fileTag.setAttribute("type", "text/css")
				fileTag.setAttribute("href", filePath)
				break;
			default:
			case 'js':
				fileTag = document.createElement('script');
				fileTag.setAttribute("type","text/javascript");
				fileTag.setAttribute("src", filePath);
			break;
		}
		
		if(callback) {
		    if (fileTag.readyState){  //IE
		        fileTag.onreadystatechange = function(){
		            if (fileTag.readyState == "loaded" || fileTag.readyState == "complete"){
		                fileTag.onreadystatechange = null;
		                callback();
		            }
		        };
		    } else {  //Others
		        fileTag.onload = function(){
		            callback();
		        };
		    }
		}
		
		if(fileTag) {
			lastScriptOnPage.parentNode.insertBefore(fileTag, lastScriptOnPage.nextSibling);			
			lastScriptOnPage = fileTag;
		}
	}

})(this);