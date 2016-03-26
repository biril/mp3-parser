//     mp3-parser/xing v0.2.6

//     https://github.com/biril/mp3-parser
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013-2015 Alex Lambiris

// ----

/*jshint browser:true */
/*global exports:false, define:false, require:false */
(function (globalObject, createModule) {
    "use strict";

    // Export as a module or global depending on environment:

    // Global `define` method with `amd` property signifies an AMD loader (require.js, curl.js, ..)
    if (typeof define === "function" && define.amd) {
        return define(["exports", "./lib"], createModule);
    }

    // Global `exports` object signifies CommonJS enviroments with `module.exports`, e.g. Node
    if (typeof exports === "object") {
        return createModule(exports, require("./lib"));
    }

    // If none of the above, then assume a browser sans AMD (also attach a `noConflict`)
    var previousMp3XingParser = globalObject.mp3XingParser;
    createModule(globalObject.mp3XingParser = {
        noConflict: function () {
            var mp3XingParser = globalObject.mp3XingParser;
            globalObject.mp3XingParser = previousMp3XingParser;
            return (this.noConflict = function () { return mp3XingParser; }).call();
        }
    }, globalObject.mp3ParserLib);

}(this, function (xingParser, lib) {
    "use strict";

    // ### Read the Xing Tag
    //
    // Read [Xing / Lame Tag](http://gabriel.mp3-tech.org/mp3infotag.html) located at `offset` of
    //  DataView `view`. Returns null in the event that no frame is found at `offset`
    xingParser.readXingTag = function (view, offset) {
        offset || (offset = 0);

        var tag = {
                _section: {
                    type: "Xing",
                    offset: offset
                },
                header: lib.readFrameHeader(view, offset)
            };

        // The Xing header should begin with a valid frame header
        if (!tag.header) { return null; }

        // There should be at least 36 (header) + 4 ("Xing"/"Info") = 40 octets ahead
        if (view.byteLength < offset + 40) { return null; }

        // A "Xing" or "Info" identifier should reside at octet 36
        tag.identifier = (lib.isSeq(lib.seq.xing, view, offset + 36) && "Xing") ||
            (lib.isSeq(lib.seq.info, view, offset + 36) && "Info");
        if (!tag.identifier) { return null; }

        //
        tag._section.byteLength = lib.getFrameByteLength(tag.header.bitrate,
            tag.header.samplingRate, tag.header.framePadding);
        tag._section.nextFrameIndex = offset + tag._section.byteLength;

        return tag;
    };
}));
