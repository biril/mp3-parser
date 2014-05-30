/*jshint browser:true */
/*global define:false */

define(["underscore", "jquery"], function (_, $) {
    "use strict";

    var buildErrorMsg = function (status, statusText) {
            var msg = "Status: " + status;
            if (statusText) { msg += ", " + statusText; }
            return msg;
        };

    // Return the mp3-loader module
    return {

        // Load mp3 of given URL
        load: function (url, onLoaded) {
            onLoaded || (onLoaded = function () {});

            // Load mp3
            var request = new window.XMLHttpRequest();
            request.responseType = "arraybuffer";
            request.open("GET", url, true);

            request.onerror = function (event) {
                onLoaded(buildErrorMsg(request.status, request.statusText));
            };

            request.onload = function (event) {

                if (request.readyState !== 4 || request.status !== 200) {
                    return onLoaded(buildErrorMsg(request.status, request.statusText));
                }

                onLoaded(null, new DataView(request.response));
            };

            request.send(null);
        }
    };
});