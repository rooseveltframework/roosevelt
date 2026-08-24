// runs every step that turns the app's source files into static files
// this lives in one place so that the watcher can run it again without its sequence drifting from the one used at startup
// `options.pages` is how a rebuild says which static pages the edited files affect: undefined for all of them, or the
// list of pages to render, which may be empty when nothing a page is built from changed
module.exports = async (app, options = {}) => {
  const params = app.get('params')

  // fire user-defined onBeforeStatics event
  // this comes first so that nothing has been written yet when it runs
  // it runs on a rebuild too, because the models it sets up can be derived from the very files that changed
  if (params.onBeforeStatics && typeof params.onBeforeStatics === 'function') await Promise.resolve(params.onBeforeStatics(app))

  require('./generateSymlinks')(app)

  require('./copyFiles')(app)

  await require('./preprocessViewsAndStatics')(app)

  await require('./preprocessStaticPages')(app, options.pages)

  await require('./preprocessCss')(app)

  await require('./controllersBundler')(app)

  await require('./viewsBundler')(app)

  await require('./jsBundler')(app)

  // save what was built so the next run can skip the files that did not change
  app.get('buildCache').save()
}
