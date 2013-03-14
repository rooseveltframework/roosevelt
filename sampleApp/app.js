/**
 * Roosevelt MVC web framework sample app
 * @author Eric Newport (kethinov)
 * @license Creative Commons Attribution 3.0 Unported License http://creativecommons.org/licenses/by/3.0/deed.en_US
 */

/*! @source https://github.com/kethinov/roosevelt */
/*jshint camelcase: true, curly: true, eqeqeq: false, forin: false, strict: false, trailing: true, evil: true, devel: true, node: true */

GLOBAL.app = require('roosevelt');
app({
  /**
   * params:
   * 
   * param name:      default value
   * name:            'Roosevelt Express'
   * port:            43711
   * modelsPath:      'mvc/models/'
   * viewsPath:       'mvc/views/'
   * controllersPath: 'mvc/controllers/'
   * imagesPath:      'statics/i/'
   * cssPath:         'statics/css/'
   * jsPath:          'statics/js/'
   * statics:         { something: 'statics/something', something_else: 'statics/something_else' }
   * customConfigs:   function() { put custom Express config code here }
   */
});