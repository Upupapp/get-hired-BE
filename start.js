// Shim: strip node: URL prefix from require() so packages like sharp (>=0.32)
// work under esm v3.2.25 which predates the node: protocol.
const _Module = require("module");
const _origLoad = _Module._load.bind(_Module);
_Module._load = function(request, parent, isMain) {
  if (typeof request === "string" && request.startsWith("node:")) {
    return _origLoad(request.slice(5), parent, isMain);
  }
  return _origLoad(request, parent, isMain);
};

require = require("esm")(module);
module.exports = require("./server.js");
