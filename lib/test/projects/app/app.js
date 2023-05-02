var framework = require('framework')
  , foo = require('foo-plugin')
  , baz = require('../baz-plugin');

framework.use(foo);
framework.use(baz);


function listPlugins() {
  return framework.pluginInfo();
}

//console.log(listPlugins());

if (process.send) {
  process.send({ plugins: listPlugins() });
}
