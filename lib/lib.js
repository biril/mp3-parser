//     mp3-parser/lib v0.2.4

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
        return define(["exports"], createModule);
    }

    // Global `exports` object signifies CommonJS enviroments with `module.exports`, e.g. Node
    if (typeof exports === "object") { return createModule(exports); }

    // If none of the above, then assume a browser sans AMD (also attach a `noConflict`)
    var previousMp3ParserLib = globalObject.mp3Parserlib;
    createModule(globalObject.mp3Parserlib = {
        noConflict: function () {
            var lib = globalObject.mp3Parserlib;
            globalObject.mp3Parserlib = previousMp3ParserLib;
            return (this.noConflict = function () { return lib; }).call();
        }
    });

}(this, function (lib) {
    "use strict";

    // Produce octet's binary representation as a string
    var octetToBinRep = (function () {
            var b = []; // The binary representation
            return function (octet) {
                b[0] = ((octet & 128) === 128 ? "1" : "0");
                b[1] = ((octet & 64)  === 64  ? "1" : "0");
                b[2] = ((octet & 32)  === 32  ? "1" : "0");
                b[3] = ((octet & 16)  === 16  ? "1" : "0");
                b[4] = ((octet & 8)   === 8   ? "1" : "0");
                b[5] = ((octet & 4)   === 4   ? "1" : "0");
                b[6] = ((octet & 2)   === 2   ? "1" : "0");
                b[7] = ((octet & 1)   === 1   ? "1" : "0");
                return b.join("");
            };
        }());

    // Get the number of bytes in a frame given its `bitrate`, `samplingRate` and `padding`.
    //  Based on [magic formula](http://mpgedit.org/mpgedit/mpeg_format/mpeghdr.htm)
    lib.getFrameByteLength = function (bitrate, samplingRate, padding) {
        return Math.floor((144000 * bitrate / samplingRate) + padding);
    };

    //
    lib.v1l3Bitrates = {
        "0000": "free",
        "0001": 32,
        "0010": 40,
        "0011": 48,
        "0100": 56,
        "0101": 64,
        "0110": 80,
        "0111": 96,
        "1000": 112,
        "1001": 128,
        "1010": 160,
        "1011": 192,
        "1100": 224,
        "1101": 256,
        "1110": 320,
        "1111": "bad"
    };

    //
    lib.v1l3SamplingRates = {
        "00": 44100,
        "01": 48000,
        "10": 32000,
        "11": "reserved"
    };

    //
    lib.v1l3ChannelModes = {
        "00": "Stereo",
        "01": "Joint stereo (Stereo)",
        "10": "Dual channel (Stereo)",
        "11": "Single channel (Mono)"
    };

    // Convert the `str` string to an array of octets. The string is parsed as an array
    //  of 8bit single-byte coded characters (i.e. ISO/IEC 8859-1, _non_ Unicode).
    lib.seqFromStr = function (str) {
        for (var i = str.length - 1, seq = []; i >= 0; i--) {
            seq[i] = str.charCodeAt(i);
        }
        return seq;
    };

    // Common character sequences converted to byte arrays
    lib.seq = {
        id3: lib.seqFromStr("ID3"),
        xing: lib.seqFromStr("Xing"),
        info: lib.seqFromStr("Info")
    };

    // A handy no-op to reuse
    lib.noOp = function () {};

    // Decode a [synchsafe](http://en.wikipedia.org/wiki/Synchsafe) value. Synchsafes are used
    //  in ID3 tags, instead of regular ints, to avoid the unintended introduction of bogus
    //  frame-syncs
    lib.unsynchsafe = function (value) {
        var out = 0,
            mask = 0x7F000000;

        while (mask) {
            out >>= 1;
            out |= value & mask;
            mask >>= 8;
        }

        return out;
    };

    // Get a value indicating whether given DataView `buffer` contains the `seq` sequence (array
    //  of octets) at `offset` index. Note that no check is performed for the adequate length of
    //  given buffer as this should be carried out by the caller
    lib.isSeq = function (seq, buffer, offset) {
        for (var i = seq.length - 1; i >= 0; i--) {
            if (seq[i] !== buffer.getUint8(offset + i)) { return false; }
        }
        return true;
    };

    // Get a value indicating whether given DataView `buffer` contains the `str` string
    //  at `offset` index. The buffer is parsed as an array of 8bit single-byte coded characters
    //  (i.e. ISO/IEC 8859-1, _non_ Unicode). Will return the string itself if it does, false
    //  otherwise. Note that no check is performed for the adequate length of given buffer as
    //  this should be carried out be the caller as part of the section-parsing process
    /*
    isStr = function (str, buffer, offset) {
        return isSeq(lib.seqFromStr(str), buffer, offset) ? str : false;
    };
    */

    // Locate first occurrence of sequence `seq` (an array of octets) in DataView `buffer`.
    //  Search starts at given `offset` and ends after `length` octets. Will return the
    //  absolute offset of sequence if found, -1 otherwise
    lib.locateSeq = function (seq, buffer, offset, length) {
        for (var i = 0, l = length - seq.length + 1; i < l; ++i) {
            if (lib.isSeq(seq, buffer, offset + i)) { return offset + i; }
        }
        return -1;
    };

    lib.locateStrTrm = {
        // Locate the first occurrence of non-Unicode null-terminator (i.e. a single zeroed-out
        //  octet) in DataView `buffer`. Search starts at given `offset` and ends after `length`
        //  octets. Will return the absolute offset of sequence if found, -1 otherwise
        iso: function (buffer, offset, length) {
            return lib.locateSeq([0], buffer, offset, length);
        },

        // Locate the first occurrence of Unicode null-terminator (i.e. a sequence of two
        //  zeroed-out octets) in DataView `buffer`. Search starts at given `offset` and ends after
        //  `length` octets. Will return the absolute offset of sequence if found, -1 otherwise
        ucs: function (buffer, offset, length) {
            var trmOffset = lib.locateSeq([0, 0], buffer, offset, length);
            if (trmOffset === -1) { return -1; }
            if ((trmOffset - offset) % 2 !== 0) { ++trmOffset; }
            return trmOffset;
        }
    },

    lib.readStr = {
        // Parse DataView `buffer` begining at `offset` index and return a string built from
        //  `length` octets. The buffer is parsed as an array of 8bit single-byte coded characters
        //  (i.e. ISO/IEC 8859-1, _non_ Unicode). Will essentially return the string comprised of
        //  octets [offset, offset + length). Note that no check is performed for the adequate
        //  length of given buffer as this should be carried out be the caller as part of the
        //  section-parsing process
        iso: function (buffer, offset, length) {
            return String.fromCharCode.apply(null, new Uint8Array(buffer.buffer, offset, length));
        },

        // UCS-2 (ISO/IEC 10646-1:1993, UCS-2) version of `readStr`. UCS-2 is the fixed-width
        //  two-byte subset of Unicode that can only express values inside the Basic Multilingual
        //  Plane (BMP). Note that this method is generally unsuitable for parsing non-trivial
        //  UTF-16 strings which may contain surrogate pairs. [This is only marginally related
        //  though as, according to ID3v2, all Unicode strings should be UCS-2.] Further info:
        //
        //  * [How to convert ArrayBuffer to and from String](http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String)
        //  * [The encoding spec](http://encoding.spec.whatwg.org/)
        //  * [stringencoding shim](https://code.google.com/p/stringencoding/)
        //
        // About the BOM: The current implementation removes the leading BOM from given buffer to
        //  avoid invisible characters that mess up the resulting strings. Tests performed with
        //  UCS-2 LE encoded frames indicate that String.fromCharCode correctly converts byte array
        //  to string but no tests have been made for UCS-2 BE. (Kid3, the ID3v2 Tag generator used
        //  for tests at the time of this writing, goes totally weird when switched to BE)
        ucs: function (buffer, offset, length) {
            // Tweak offset to remove the BOM (LE: FF FE / BE: FE FF)
            if (buffer.getUint16(offset) === 0xFFFE || buffer.getUint16(offset) === 0xFEFF) {
                offset += 2;
                length -= 2;
            }

            buffer = buffer.buffer;

            // When offset happens to be an even number of octets, the array-buffer may be wrapped
            //  in a Uint16Array. In the event that it's _not_, an actual copy has to be made
            // (Note that Node <= 0.8 as well as IE <= 10 lack an ArrayBuffer#slice. TODO: shim it)
            if (offset % 2 === 1) {
                buffer = buffer.slice(offset, offset + length);
                offset = 0;
            }

            return String.fromCharCode.apply(null, new Uint16Array(buffer, offset, length / 2));
        },
    },

    lib.readTrmStr = {
        // Similar to `readStr.iso` but will check for a null-terminator determining the end of the
        //  string. The returned string will be of _at most_ `length` octets
        iso: function (buffer, offset, length) {
            var trmOffset = lib.locateStrTrm.iso(buffer, offset, length);
            if (trmOffset !== -1) { length = trmOffset - offset; }
            return lib.readStr.iso(buffer, offset, length);
        },

        // Similar to `readStr.ucs` but will check for a null-terminator determining the end of the
        //  string. The returned string will be of _at most_ `length` octets
        ucs: function (buffer, offset, length) {
            var trmOffset = lib.locateStrTrm.ucs(buffer, offset, length);
            if (trmOffset !== -1) { length = trmOffset - offset; }
            return lib.readStr.ucs(buffer, offset, length);
        }
    },

    // ### Read a Frame Header
    //
    // Read header of frame located at `offset` of DataView `buffer`. Returns null in the event
    //  that no frame header is found at `offset`
    lib.readFrameHeader = function (buffer, offset) {
        offset || (offset = 0);

        var
            // The header's four bytes
            b1, b2, b3, b4,

            //
            header = {
                _section: {
                    type: "frameHeader",
                    byteLength: 4,
                    offset: offset
                }
            };

        // There should be more than 4bytes ahead
        if (buffer.byteLength - offset <= 4) { return null; }

        b1 = buffer.getUint8(offset);
        b2 = buffer.getUint8(offset + 1);
        b3 = buffer.getUint8(offset + 2);
        b4 = buffer.getUint8(offset + 3);

        // First octet: `11111111`: Frame sync (all bits must be set)
        if (b1 !== 255) { return null; }

        // Second octet: `11111011` or `11111010`
        //
        // * `111.....`: Rest of frame sync (all bits must be set)
        // * `...11...`: MPEG Audio version ID (11 -> MPEG Version 1 (ISO/IEC 11172-3))
        // * `.....01.`: Layer description (01 -> Layer III)
        // * `.......1`: Protection bit (1 = Not protected)

        // Require the seven most significant bits to be `1111101` (>= 250)
        if (b2 < 250) { return null; }

        header.mpegAudioVersionBits = "11";
        header.mpegAudioVersion = "MPEG Version 1 (ISO/IEC 11172-3)";
        header.layerDescriptionBits = "01";
        header.layerDescription = "Layer III";
        header.isProtected = b2 & 1; // Just check if last bit is set
        header.protectionBit = header.isProtected ? "1" : "0";

        // Third octet: `EEEEFFGH`
        //
        // * `EEEE....`: Bitrate index. 1111 is invalid, everything else is accepted
        // * `....FF..`: Sampling rate, 00=44100, 01=48000, 10=32000, 11=reserved
        // * `......G.`: Padding bit, 0=frame not padded, 1=frame padded
        // * `.......H`: Private bit. This is informative
        b3 = octetToBinRep(b3);
        header.bitrateBits = b3.substr(0, 4);
        header.bitrate = lib.v1l3Bitrates[header.bitrateBits];
        if (header.bitrate === "bad") { return null; }

        header.samplingRateBits = b3.substr(4, 2);
        header.samplingRate = lib.v1l3SamplingRates[header.samplingRateBits];
        if (header.samplingRate === "reserved") { return null; }

        header.frameIsPaddedBit = b3.substr(6, 1);
        header.frameIsPadded = header.frameIsPaddedBit === "1";
        header.framePadding = header.frameIsPadded ? 1 : 0;

        header.privateBit = b3.substr(7, 1);

        // Fourth octet: `IIJJKLMM`
        //
        // * `II......`: Channel mode
        // * `..JJ....`: Mode extension (only if joint stereo)
        // * `....K...`: Copyright
        // * `.....L..`: Original
        // * `......MM`: Emphasis
        b4 = octetToBinRep(b4);
        header.channelModeBits = b4.substr(0, 2);
        header.channelMode = lib.v1l3ChannelModes[header.channelModeBits];

        return header;
    };


    // ### Read a Frame
    //
    // Read frame located at `offset` of DataView `buffer`. Will acquire the frame header (see
    //  `readFrameHeader`) plus some basic information about the frame - notably the frame's length
    //  in bytes. If `requireNextFrame` is set, the presence of a _next_ valid frame will be
    //  required for _this_ frame to be regarded as valid. Returns null in the event that no frame
    //  is found at `offset`
    lib.readFrame = function (buffer, offset, requireNextFrame) {
        offset || (offset = 0);

        var frame = {
                _section: {
                    type: "frame",
                    offset: offset
                },
                header: lib.readFrameHeader(buffer, offset)
            };

        // Frame should always begin with a valid header
        if (!frame.header) { return null; }

        // The num of samples per v1l3 frame is constant - always 1152
        frame._section.sampleLength = 1152;

        //
        frame._section.byteLength = lib.getFrameByteLength(frame.header.bitrate, frame.header.samplingRate, frame.header.framePadding);
        frame._section.nextFrameIndex = offset + frame._section.byteLength;

        // No "Xing" or "Info" identifier should reside at octet 36 - this would indicate that this
        //  is in fact a Xing tag masquerading as a frame
        if (lib.isSeq(lib.seq.xing, buffer, offset + 36) || lib.isSeq(lib.seq.info, buffer, offset + 36)) {
            return null;
        }

        // If a next frame is required then the data at `frame._section.nextFrameIndex` should be
        //  a valid frame header
        if (requireNextFrame && !lib.readFrameHeader(buffer, frame._section.nextFrameIndex)) {
            return null;
        }

        return frame;
    };
}));
