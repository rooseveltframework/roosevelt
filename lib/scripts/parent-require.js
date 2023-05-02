module.exports = function(id) {
  console.log("*** id")
  console.log(id)
  var parent = module.parent;
  for (; parent; parent = parent.parent) {
    try {
      return parent.require(id);
    } catch(ex) {}
  }
  throw new Error("Cannot find module '" + id + "' from parent");
};
