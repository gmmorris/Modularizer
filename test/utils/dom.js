
var jsdom = require("jsdom"), mocjsdom = require('mocha-jsdom');

exports.init = function(withConsole){
  var config = {
    features : {
      FetchExternalResources: ["script","link"],
      ProcessExternalResources: ["script","link"],
      SkipExternalResources: false
    }
  };
  if(withConsole){
    var virtualConsole = jsdom.createVirtualConsole();
    virtualConsole.on("jsdomError", function (error) {
      console.error(error.stack, error.detail);
    });
    config.virtualConsole = virtualConsole;
  }

  mocjsdom(config);
};

exports.inject = function(src,attrs,callback){
  var scriptEl = window.document.createElement("script");
  scriptEl.src = src;
  if(attrs) {
    for(var attr in attrs){
      if(attrs.hasOwnProperty(attr)){
        scriptEl.setAttribute(attr,attrs[attr]);
      }
    }
  }
  if(callback){
    scriptEl.onload = callback;
  }
  window.document.body.appendChild(scriptEl);
  // return this for chaning
  return this;
};

exports.clear = function(){
  window.document.body.innerHTML = '';
  // return this for chaning
  return this;
};