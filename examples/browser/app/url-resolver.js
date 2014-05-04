/*global define:false */

// url-resolver: Resolves given URL to the URL of an mp3 to be loaded. For the general case this is
//  just a pass-through which returns the given URL unchanged. At the time of this writing, the
//  only specific case is that of Soundcloud track URLs: These are fed to SC's `/resolve` API and
//  the returned representation is queried for the URL of the track's streamable version. This is
//  then returned in place of the original
define(["underscore", "jquery"], function (_, $) {
    "use strict";

    var
        // Id of this app, as a Soundcloud client - for the purposes of querying the SC API
        scClientId = "1c3a1ee9f6d9e1086f5ed3c282ddba56",

        // Format of a SC track URL. Matched URLs are are fed to SC's /resolve API
        scTrackUrlFormat = /https?:\/\/(www\.|m\.)?soundcloud.com\/[^\/]+\/[^\/]+/i,

        // Build the URL of SC track resource, representing the track that lives on given `url`
        buildScTrackResourceUrl = function (url) {
            return "http://api.soundcloud.com/resolve.json?url=" + url + "&client_id=" + scClientId;
        };

    // Return the url-resolver module
    return {

        // Resolve given `url`. The `onResolved` handler's signature should be
        // `function (error, resolvedUrl) {..}` where `error` is null on success or  a descriptive
        //  message on failure. Note that the handler may run synchronously or asynchronously
        //  depending on given URL
        resolve: function (url, onResolved) {
            onResolved || (onResolved = function () {});

            // Pass-through if there's no resolution to carry out
            if(!_.isString(url) || !scTrackUrlFormat.test(url)) { return onResolved(null, url); }

            // Resolve using SC's /resolve API
            $.ajax({
                url: buildScTrackResourceUrl(url),
                dataType: "json"
            }).done(function (trackResource, textStatus) {
                if (textStatus !== "success") {
                    onResolved(textStatus);
                    return;
                }

                if (trackResource.kind !== "track") {
                    onResolved("URL is of non-track SC resource '" + trackResource.kind + "'");
                    return;
                }

                var srcUrl = trackResource.download_url || trackResource.stream_url;
                onResolved(null, srcUrl + "?client_id=" + scClientId);

            }).fail(function (jqXHR, textStatus, errorThrown) {
                onResolved(textStatus + (errorThrown ? " (" + errorThrown + ")" : ""));
            });
        }
    };
});