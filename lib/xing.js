//     mp3-parser/xing v0.2.1

//     https://github.com/biril/mp3-parser
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013-2014 Alex Lambiris

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
    }, globalObject.lib);

}(this, function (xingParser, lib) {
    "use strict";

    // Common character sequences converted to handy byte arrays
    var xingSeq = lib.seqFromStr("Xing"),
        infoSeq = lib.seqFromStr("Info");

    // ### Read the Xing Tag
    //
    // Read [Xing / Lame Tag](http://gabriel.mp3-tech.org/mp3infotag.html) located at `offset` of
    //  DataView `buffer`. Returns null in the event that no frame is found at `offset`
    xingParser.readXingTag = function (buffer, offset) {
        offset || (offset = 0);

        var tag = {
                _section: {
                    type: "Xing",
                    offset: offset
                },
                header: lib.readFrameHeader(buffer, offset)
            };

        // The Xing header should begin with a valid frame header
        if (!tag.header) { return null; }

        // There should be at least 36 + 4 = 40 bytes ahead
        if (buffer.byteLength < offset + 40) { return null; }

        // A "Xing" or "Info" identifier should reside at octet 36
        (tag.identifier = lib.isSeq(xingSeq, buffer, offset + 36)) ||
        (tag.identifier = lib.isSeq(infoSeq, buffer, offset + 36));
        if (!tag.identifier) { return null; }

        //
        tag._section.byteLength = lib.getFrameByteLength(tag.header.bitrate, tag.header.samplingRate, tag.header.framePadding);
        tag._section.nextFrameIndex = offset + tag._section.byteLength;

        return tag;
    };
}));
