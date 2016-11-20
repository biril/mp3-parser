//     mp3-parser v0.3.0

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
        return define(["exports", "./lib/lib", "./lib/id3v2", "./lib/xing"], createModule);
    }

    // Global `exports` object signifies CommonJS enviroments with `module.exports`, e.g. Node
    if (typeof exports === "object") {
        return createModule(exports, require("./lib/lib"), require("./lib/id3v2"),
            require("./lib/xing"));
    }

    // If none of the above, then assume a browser sans AMD (also attach a `noConflict`)
    var previousMp3Parser = globalObject.mp3Parser;
    createModule(globalObject.mp3Parser = {
        noConflict: function () {
            var mp3Parser = globalObject.mp3Parser;
            globalObject.mp3Parser = previousMp3Parser;
            return (this.noConflict = function () { return mp3Parser; }).call();
        }
    }, globalObject.mp3ParserLib, globalObject.mp3Id3v2Parser, globalObject.mp3XingParser);
}(this, function (mp3Parser, lib, id3v2Parser, xingParser) {
    "use strict";

    // ### TL;DR
    //
    // The parser exposes a collection of `read____` methods, each dedicated to reading a specific
    //  section of the mp3 file. The current implementation includes `readFrameHeader`, `readFrame`,
    //  `readId3v2Tag` and `readXingTag`. Each of these accepts a DataView-wrapped ArrayBuffer,
    //  which should contain the actual mp3 data, and optionally an offset into the buffer.
    //
    // All methods return a description of the section read in the form of a hash containing
    //  key-value pairs relevant to the section. For example the hash returned from
    //  `readFrameHeader` always contains an `mpegAudioVersion` key of value "MPEG Version 1
    //  (ISO/IEC 11172-3)" and a `layerDescription` key of value "Layer III". A description will
    //  always have a `_section` hash with `type`, `byteLength` and `offset` keys:
    //
    //  * `type`: "frame", "frameHeader", "Xing" or "ID3"
    //  * `byteLenfth`: Size of the section in bytes
    //  * `offset`: Buffer offset at which this section resides

    // ----

    // ### Read a Frame Header
    //
    // Read and return description of header of frame located at `offset` of DataView `view`.
    //  Returns `null` in the event that no frame header is found at `offset`
    mp3Parser.readFrameHeader = function (view, offset) {
        return lib.readFrameHeader(view, offset);
    };

    // ### Read a Frame
    //
    // Read and return description of frame located at `offset` of DataView `view`. Includes the
    //  frame header description (see `readFrameHeader`) plus some basic information about the
    //  frame - notably the frame's length in bytes. If `requireNextFrame` is set, the presence of
    //  a _next_ valid frame will be required for _this_ frame to be regarded as valid. Returns
    //  null in the event that no frame is found at `offset`
    mp3Parser.readFrame = function (view, offset, requireNextFrame) {
        return lib.readFrame(view, offset, requireNextFrame);
    };

    // ### Read the Last Frame
    //
    // Locate and return description of the very last valid frame in given DataView `view`. The
    //  search is carried out in reverse, from given `offset` (or the very last octet if `offset`
    //  is ommitted) to the first octet in the view. If `requireNextFrame` is set, the presence
    //  of a next valid frame will be required for any found frame to be regarded as valid (causing
    //  the method to essentially return the next-to-last frame on success). Returns `null` in the
    //  event that no frame is found at `offset`
    mp3Parser.readLastFrame = function (view, offset, requireNextFrame) {
        offset || (offset = view.byteLength - 1);

        var lastFrame = null;

        for (; offset >= 0; --offset) {
            if (view.getUint8(offset) === 255) {
                // Located a candidate frame as 255 is a possible frame-sync byte
                lastFrame = mp3Parser.readFrame(view, offset, requireNextFrame);
                if (lastFrame) { return lastFrame; }
            }
        }

        return null;
    };

    // ### Read the ID3v2 Tag
    //
    // Read and return description of [ID3v2 Tag](http://id3.org/id3v2.3.0) located at `offset` of
    //  DataView `view`. (This will include any and all
    //  [currently supported ID3v2 frames](https://github.com/biril/mp3-parser/wiki) located within
    //  the tag). Returns `null` in the event that no tag is found at `offset`
    mp3Parser.readId3v2Tag = function (view, offset) {
        return id3v2Parser.readId3v2Tag(view, offset);
    };

    // ### Read the Xing Tag
    //
    // Read and return description of
    //  [Xing / Lame Tag](http://gabriel.mp3-tech.org/mp3infotag.html) located at `offset` of
    //  DataView `view`. Returns `null` in the event that no frame is found at `offset`
    mp3Parser.readXingTag = function (view, offset) {
        return xingParser.readXingTag(view, offset);
    };

    // ### Read all Tags up to First Frame
    // Read and return descriptions of all tags found up to (and including) the very first frame.
    //  Returns an array of sections which may include a description of a located ID3V2 tag, a
    //  description of located Xing / Lame tag and a description of the a located first frame
    //  ( See [this](http://www.rengels.de/computer/mp3tags.html) and
    //  [this](http://stackoverflow.com/a/5013505) )
    mp3Parser.readTags = function (view, offset) {
        offset || (offset = 0);

        var sections = [];
        var section = null;
        var isFirstFrameFound = false;
        var bufferLength = view.byteLength;

        var readers = [mp3Parser.readId3v2Tag, mp3Parser.readXingTag, mp3Parser.readFrame];
        var numOfReaders = readers.length;

        // While we haven't located the first frame, pick the next offset ..
        for (; offset < bufferLength && !isFirstFrameFound; ++offset) {
            // .. and try out each of the 'readers' on it
            for (var i = 0; i < numOfReaders; ++i) {
                section = readers[i](view, offset);

                // If one of the readers successfully parses a section ..
                if (section) {
                    // .. store it ..
                    sections.push(section);

                    // .. and push the offset to the very end of end of that section. This way,
                    //  we avoid iterating over offsets which definately aren't the begining of
                    //  some section (they're part of the located section)
                    offset += section._section.byteLength;

                    // If the section we just parsed is a frame then we've actually located the
                    //  first frame. Break out of the readers-loop making sure to set
                    //  isFirstFrameFound (so that we also exit the outer loop)
                    if (section._section.type === "frame") {
                        isFirstFrameFound = true;
                        break;
                    }

                    // The section is _not_ the first frame. So, having pushed the offset
                    //  appropriately, retry all readers
                    i = -1;
                }
            }
        }

        return sections;
    };
}));
