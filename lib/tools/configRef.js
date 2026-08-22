// marks a config value that cannot be written down until roosevelt has worked out the params it depends on
//
// most params can be written directly in a config file, but a few are rewritten by roosevelt before your app sees them:
//   publicFolder gains the app version when versionedPublic is on
//   css.sourcePath and js.sourcePath move into the preprocessed statics folder when minifyHtmlAttributes is on, which also depends on the mode the app is running in
//   the output paths for clientViews and clientControllers are rooted in the build folder
//   every path is made absolute against the app directory
// writing those out by hand would go stale the moment one of those params changed, so a ref is handed the finished params instead
const REF = Symbol('rooseveltConfigRef')

function ref (resolver) {
  if (typeof resolver !== 'function') throw new Error('roosevelt.ref takes a function that receives the resolved params and returns the value you want')
  return { [REF]: resolver }
}

// a ref is an object rather than a bare function, because several params are legitimately functions themselves, such as onServerStart and customBundlerFunction
ref.isRef = value => !!value && typeof value === 'object' && typeof value[REF] === 'function'
ref.resolve = (value, params) => value[REF](params)

module.exports = ref
