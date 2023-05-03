/**
 * Author:    Jared Hanson
 * github repo: https://github.com/jaredhanson/node-parent-require
 * license type: MIT License
 * license link: https://opensource.org/license/mit/
 **/

module.exports = function (id) {
  let parent = module.parent

  for (; parent; parent = parent.parent) {
    try {
      return parent.require(id)
    } catch (ex) {}
  }
  throw new Error("Cannot find module '" + id + "' from parent")
}
