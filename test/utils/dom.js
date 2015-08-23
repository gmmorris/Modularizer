
var jsdom = require("jsdom"), mocjsdom = require('mocha-jsdom');

exports.init = function(){
  //var virtualConsole = jsdom.createVirtualConsole();
  //virtualConsole.on("jsdomError", function (error) {
  //  console.error(error.stack, error.detail);
  //});

  mocjsdom({
    //virtualConsole : virtualConsole,
    features : {
      FetchExternalResources: ["script","link"],
      ProcessExternalResources: ["script","link"],
      SkipExternalResources: false
    }
  });
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
};
//
//exports.clear = function(){
//  document.body.innerHTML = dom;
//};