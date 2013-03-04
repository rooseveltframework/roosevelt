/**
 * Roosevelt MVC web framework sample app
 * @author Eric Newport (kethinov)
 * @license Creative Commons Attribution 3.0 Unported License http://creativecommons.org/licenses/by/3.0/deed.en_US
 */

/*! @source https://github.com/kethinov/roosevelt */
/*jshint camelcase: true, curly: true, eqeqeq: false, forin: false, strict: false, trailing: true, evil: true, devel: true, node: true */

var app = require('roosevelt')({
  /**
   * params:
   * 
   * param name:      default value
   * name:            'Roosevelt Express'
   * port:            43711
   * controllersPath: 'mvc/controllers/'
   * viewsPath:       'mvc/views/'
   * imagesPath:      'statics/i/'
   * cssPath:         'statics/css/'
   * jsPath:          'statics/js/'
   * customConfigs:   function() { put custom Express config code here }
   */
});