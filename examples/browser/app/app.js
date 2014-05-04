/*jshint browser:true */
/*global define:false */
define([ "jquery", "url-resolver", "mp3-loader", "mp3-parser"],
function ($,        urlResolver,    mp3Loader,    mp3Parser) {

    "use strict";

    var log = function (message, isError) {
            $(".log").text(message).toggleClass("error", !!isError);
        };

    return {
        run: function () {

            $(".urlForm").submit(function (event) {
                event.preventDefault();

                var url = $(".urlFormInput").val();

                // Resolve ..
                urlResolver.resolve(url, function (error, resolvedUrl) {
                    if (error) {
                        log("Oops, error resolving URL '" + url + "': " + error, true);
                        return;
                    }

                    log(resolvedUrl + ": loading...");

                    // .. Load ..
                    mp3Loader.load(resolvedUrl, function (error, loadedMp3) {
                        if (error) {
                            log("Oops, error loading URL '" + url + "': " + error, true);
                            return;
                        }

                        log(resolvedUrl + ": loaded!");

                        // .. Read tags
                        var tags = mp3Parser.readTags(loadedMp3);

                        $(".report").text(JSON.stringify(tags, undefined, 2));
                    });
                });
            });
        }
    };
});
