global.app = require('roosevelt');
app({
  /**
   * params:
   *
   * param name:      default value
   *
   * name:            'Roosevelt Express',
   * port:            43711,
   * modelsPath:      'mvc/models',
   * viewsPath:       'mvc/views',
   * controllersPath: 'mvc/controllers',
   * staticsRoot:     'statics',
   * imagesPath:      'statics/i',
   * cssPath:         'statics/css',
   * lessPath:        'statics/less',
   * jsPath:          'statics/js',
   * staticsPrefix:   '', // useful to place a version number in here
   * customConfigs:   function() { put custom Express config code here }
   */
});