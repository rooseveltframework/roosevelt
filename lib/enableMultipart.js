// middleware to handle forms with formidable
'use strict';

var fs = require('fs'),
    formidable = require('formidable');

module.exports = function(app) {
  app.set('formidable', formidable);

  app.use(function(req, res, next) {
    var form,
        contentType = req.headers['content-type'];

    if (typeof contentType === 'string' && contentType.indexOf('multipart/form-data') > -1) {
      form = new formidable.IncomingForm(app.get('params').multipart);
      form.parse(req, function(err, fields, files) {
        if (err) {
          console.error(((app.get('appName') || 'Roosevelt') + ' failed to parse multipart form at ' + req.url).red);
          console.error(err);
          next(err);
          return;
        }
        req.body = fields; // pass along form fields
        req.files = files; // pass along files

        // remove tmp files after request finishes
        var cleanup = function() {
          Object.keys(files).forEach(function(file) {
            var filePath = files[file].path;
            if (typeof filePath === 'string') {
              fs.exists(filePath, function(exists) {
                fs.unlink(filePath, function(err) {
                  if (err) {
                    if (err.errno === 34 && err.code === 'ENOENT') {
                      return; // ignore file not found error
                    }
                    else {
                      console.error(((app.get('appName') || 'Roosevelt') + ' failed to remove tmp file: ' + filePath).red);
                      console.error(err);
                    }
                  }
                });
              });
            }
          });
        };
        res.once('finish', cleanup);
        res.once('close', cleanup);
        next();
      });
    }
    else {
      next();
    }
  });

  return app;
};