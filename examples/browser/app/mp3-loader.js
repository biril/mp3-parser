/*jshint browser:true */
/*global define:false */

define(["underscore", "jquery"], function (_, $) {
    "use strict";

    // Return the mp3-loader module
    return {

        // Load mp3 of given URL
        load: function (url, onLoaded) {
            onLoaded || (onLoaded = function () {});

            // Load mp3
            var request = new window.XMLHttpRequest();
            request.responseType = "arraybuffer";
            request.open("GET", url, true);

            request.onload = function (event) {

                if (request.readyState !== 4 || request.status !== 200) {
                    return onLoaded(request.status + ", " + request.statusText);
                }

                onLoaded(null, new DataView(request.response));
            };

            request.send(null);
        }
    };
});