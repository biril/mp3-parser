//     mp3-parser/xing v0.3.0

//     https://github.com/biril/mp3-parser
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013-2016 Alex Lambiris

// ----

/* jshint browser:true */
/* global exports:false, define:false, require:false */
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
            _section: { type: "Xing", offset: offset },
            header: lib.readFrameHeader(view, offset)
        };

        var head = tag.header; // Convenience shortcut

        // The Xing tag should begin with a valid frame header
        if (!head) { return null; }

        var xingOffset = offset +
            lib.getXingOffset(head.mpegAudioVersionBits, head.channelModeBits);

        // There should be at least 'offset' (header) + 4 ("Xing"/"Info") octets ahead
        if (view.byteLength < xingOffset + 4) { return null; }

        // A "Xing" or "Info" identifier should be present
        tag.identifier = (lib.isSeq(lib.seq.xing, view, xingOffset) && "Xing") ||
            (lib.isSeq(lib.seq.info, view, xingOffset) && "Info");
        if (!tag.identifier) { return null; }

        //
        tag._section.byteLength = lib.getFrameByteLength(head.bitrate, head.samplingRate,
            head.framePadding, head.mpegAudioVersionBits, head.layerDescriptionBits);
        tag._section.nextFrameIndex = offset + tag._section.byteLength;

        return tag;
    };
}));
