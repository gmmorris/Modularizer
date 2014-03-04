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


        this.modules = {
            // Container of module definitions. A Module definition is a key in the container with the name of the module and inside it is
            // another object which holds a callback to be called after the module is requested and an array of resources (modules) that the
            // callback expects to recieve as parameters
            definitions : {},
            // Container of modules which have been instanciated
            instances : {}
        };

        return this;
    };

    // Current version of the library.
    Modularizer.VERSION = '0.0.1';

    // default config
    Modularizer.config = {
        debug:false
    };

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

            // Make sure we have the needed details (callback and resources)
            if (!definition.resources) {
                definition.resources = [];
            }

            // If there is no callback, then we return undefined.
            // In such a case, presumably, the module is external and loading the JS file was enough in the first place
            if (definition.callback) {
                // Fetch each one of the dependency instances
                for (var index = 0; index < definition.resources.length; index++) {
                    definition.resources[index] = this.fetchResource(definition.resources[index]);
                }

                // Call the callback, with the resources and then store as a loaded module
                this.modules.instances[module] = definition.callback.apply(this, definition.resources);
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
     * @param {Array} resources An array of module names which you wish to make sure have been defined
     * @example
     <code><pre>
     Modularizer.knows('Router.Items');
     </pre></code>
     */
    Modularizer.prototype.knows = function (resources) {

        // make sure the requested module (resource) is inside an array
        if (typeof(resources) == 'string') {
            // replace the single string inside 'resources' with an array whose first cell is the resource
            resources = [resources];
        } else if (!resources || !(resources.length)) {
            // invalid module sent to be checked, return false
            return false;
        }

        for (var index = 0; index < resources.length; index++) {
            if (!(this.modules.instances.hasOwnProperty(resources[index]) || this.modules.definitions.hasOwnProperty(resources[index]))) {
                // if we haven't instanciated or defined even one of these modules, then the answer is - no! We do not know them all!
                return false;
            }
        }

        // if we reached this point, then we knew them all
        return true;
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
    Modularizer.prototype.requireSynchronously = function (resources, callback, context) {
        return this.require(resources, callback, context, true);
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
    Modularizer.prototype.require = function (resources, callback, context, synchronous) {

        this.log({
            evt: 'Modularizer.require: Require resources.',
            params: {
                resources: resources
            }
        });

        context = context || (context = {});

        // make sure the requested module (resource) is inside an array
        if (typeof(resources) == 'string') {
            // replace the single string inside 'resources' with an array whose first cell is the resource
            resources = [resources];
        } else if (!resources || !(resources.length)) {
            // invalid module sent to be required, simply call the callback
            throw new Error('An invalid resource has been specified for requirment, must be either a module name (string) or an array of module names.');
        }

        // This function fetched the actual resoucres and calls the callback.
        // We will either send it to YUI to call after loading what we need or call it directly
        // if there is no need to actually lao anything
        var deliverPayload = function () {
            for (var index = 0; index < resources.length; index++) {
                // get the instances of each dependnecy
                resources[index] = this.fetchResource(resources[index]);
            }

            // call the callback with the dependency payload
            callback.apply(context, resources);
        };

        if (!this.knows(resources)) {

            if (synchronous) {
                // If the request was demanded as synchronous
                throw new Error('A resource has been requested synchronously but has not yet been loaded.');
            }

            // Call load, as YUI hasn't yet actually called this module and it's dependancies
            this.load(resources, deliverPayload);
        } else {
            // call the resouce delivery function, as all the modules have already been defined or instanciated anyway
            deliverPayload.call(this);
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
    Modularizer.prototype.define = function (module, resources, callback) {

      //as the resources are optional, check to see if perhaps the callback was sent second and is now inside the 'resources' variable
      if (typeof(resources) == 'function') {
				callback = resources;
        resources = [];
     	} else if (!resources || !(resources.length)) {
            // if an invalid resources array has been sent simply replace it with an empty array. hopefully the callback will manage to stomach the lack of parameters
            // TODO: Warning?
            resources = [];
        }

        // Only add the module definition if there is a callback, otherwise it is pointless as no definition will become an object without a callback to define it, anyway.
        // We will probably have this kind of behaviour if for some reason the YUI loader configuration isn't possible for preventing a file from being loaded twice.
        // Hopefully we will never see this sort of behaviour.
        if (typeof(callback) == 'function') {
            this.modules.definitions[module] = {
                callback: callback,
                resources: resources
            };
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

})(this);