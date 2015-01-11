/*jshint strict:false */
/*globals requirejs:false, _:false */

requirejs.config({
    baseUrl: "app/",
    paths: {
        "underscore": "../bower_components/underscore/underscore",
        "jquery":     "../bower_components/jquery/jquery"
    },
    shim: {
        underscore: {
            init: function () {
                return _.noConflict();
            }
        }
    },
    packages: [{
        name: "mp3-parser",
        location: "../bower_components/mp3-parser"
    }]
});

requirejs(["app"], function (app) {
    app.run();
});
