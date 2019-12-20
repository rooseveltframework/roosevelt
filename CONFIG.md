```
"rooseveltConfig": {
    "port": 43711,
    "enableCLIFlags": true,
    "generateFolderStructure": true,
    "localhostOnly": true,
    "logging": {
      "methods": {
        "http": true,
        "info": true,
        "warn": true,
        "error": true,
        "verbose": false
      }
    },
    "minify": true,
    "htmlValidator": {
      "enable": true,
      "separateProcess": {
        "enable": true,
        "autoKiller": true,
        "autoKillerTimeout": 3600000
      },
      "port": 48888,
      "showWarnings": true,
      "exceptions": {
        "requestHeader": "Partial",
        "modelValue": "_disableValidator"
      }
    },
    "multipart": {
      "multiples": true
    },
    "toobusy": {
      "maxLagPerRequest": 70,
      "lagCheckInterval": 500
    },
    "bodyParser": {
      "urlEncoded": {
        "extended": true
      },
      "json": {}
    },
    "frontendReload": {
      "enable": true,
      "port": 9856,
      "httpsPort": 9857,
      "verbose": false
    },
    "checkDependencies": true,
    "cores": 1,
    "shutdownTimeout": 30000,
    "cleanTimer": 604800000,
    "https": false,
    "modelsPath": "mvc/models",
    "viewsPath": "mvc/views",
    "viewEngine": "none",
    "controllersPath": "mvc/controllers",
    "errorPages": {
      "notFound": "404.js",
      "internalServerError": "5xx.js",
      "serviceUnavailable": "503.js"
    },
    "staticsRoot": "statics",
    "htmlMinifier": {
      "enable": true,
      "exceptionRoutes": false,
      "options": {
        "collapseWhitespace": true,
        "collapseBooleanAttributes": true,
        "removeAttributeQuotes": true,
        "removeEmptyAttributes": true
      }
    },
    "css": {
      "sourcePath": "css",
      "compiler": "none",
      "whitelist": null,
      "output": ".build/css",
      "symlinkToPublic": true,
      "versionFile": null
    },
    "js": {
      "sourcePath": "js",
      "compiler": "none",
      "whitelist": null,
      "blacklist": null,
      "output": ".build/js",
      "symlinkToPublic": true,
      "bundler": {
        "bundles": [],
        "output": ".bundled",
        "expose": true
      }
    },
    "publicFolder": "public",
    "favicon": "none",
    "staticsSymlinksToPublic": [
      "images"
    ],
    "versionedPublic": false,
    "alwaysHostPublic": false,
    "routers": false
  }
  ```