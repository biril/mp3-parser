//     mp3-parser/lib v0.3.0

//     https://github.com/biril/mp3-parser
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013-2016 Alex Lambiris

// ----

/* jshint browser:true */
/* global exports:false, define:false */
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
    var previousMp3ParserLib = globalObject.mp3ParserLib;
    createModule(globalObject.mp3ParserLib = {
        noConflict: function () {
            var lib = globalObject.mp3ParserLib;
            globalObject.mp3ParserLib = previousMp3ParserLib;
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
    lib.getFrameByteLength = function (kbitrate, samplingRate, padding, mpegVersion, layerVersion) {
        var sampleLength = lib.sampleLengthMap[mpegVersion][layerVersion];
        var paddingSize = padding ? (layerVersion === "11" ? 4 : 1) : 0;
        var byteRate = kbitrate * 1000 / 8;
        return Math.floor((sampleLength * byteRate / samplingRate) + paddingSize);
    };

    lib.getXingOffset = function (mpegVersion, channelMode) {
        var mono = channelMode === "11";
        if (mpegVersion === "11") { // mpeg1
            return mono ? 21 : 36;
        } else {
            return mono ? 13 : 21;
        }
    };

    //
    lib.v1l1Bitrates = {
        "0000": "free",
        "0001": 32,
        "0010": 64,
        "0011": 96,
        "0100": 128,
        "0101": 160,
        "0110": 192,
        "0111": 224,
        "1000": 256,
        "1001": 288,
        "1010": 320,
        "1011": 352,
        "1100": 384,
        "1101": 416,
        "1110": 448,
        "1111": "bad"
    };

    //
    lib.v1l2Bitrates = {
        "0000": "free",
        "0001": 32,
        "0010": 48,
        "0011": 56,
        "0100": 64,
        "0101": 80,
        "0110": 96,
        "0111": 112,
        "1000": 128,
        "1001": 160,
        "1010": 192,
        "1011": 224,
        "1100": 256,
        "1101": 320,
        "1110": 384,
        "1111": "bad"
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
    lib.v2l1Bitrates = {
        "0000": "free",
        "0001": 32,
        "0010": 48,
        "0011": 56,
        "0100": 64,
        "0101": 80,
        "0110": 96,
        "0111": 112,
        "1000": 128,
        "1001": 144,
        "1010": 160,
        "1011": 176,
        "1100": 192,
        "1101": 224,
        "1110": 256,
        "1111": "bad"
    };

    //
    lib.v2l2Bitrates = {
        "0000": "free",
        "0001": 8,
        "0010": 16,
        "0011": 24,
        "0100": 32,
        "0101": 40,
        "0110": 48,
        "0111": 56,
        "1000": 64,
        "1001": 80,
        "1010": 96,
        "1011": 112,
        "1100": 128,
        "1101": 144,
        "1110": 160,
        "1111": "bad"
    };
    lib.v2l3Bitrates = lib.v2l2Bitrates;

    //
    lib.v1SamplingRates = {
        "00": 44100,
        "01": 48000,
        "10": 32000,
        "11": "reserved"
    };

    //
    lib.v2SamplingRates = {
        "00": 22050,
        "01": 24000,
        "10": 16000,
        "11": "reserved"
    };

    //
    lib.v25SamplingRates = {
        "00": 11025,
        "01": 12000,
        "10": 8000,
        "11": "reserved"
    };

    //
    lib.channelModes = {
        "00": "Stereo",
        "01": "Joint stereo (Stereo)",
        "10": "Dual channel (Stereo)",
        "11": "Single channel (Mono)"
    };

    //
    lib.mpegVersionDescription = {
        "00": "MPEG Version 2.5 (unofficial)",
        "01": "reserved",
        "10": "MPEG Version 2 (ISO/IEC 13818-3)",
        "11": "MPEG Version 1 (ISO/IEC 11172-3)"
    };

    //
    lib.layerDescription = {
        "00": "reserved",
        "01": "Layer III",
        "10": "Layer II",
        "11": "Layer I"
    };

    //
    lib.bitrateMap = {
        "11": {
            "01": lib.v1l3Bitrates,
            "10": lib.v1l2Bitrates,
            "11": lib.v1l1Bitrates
        },
        "10": {
            "01": lib.v2l3Bitrates,
            "10": lib.v2l2Bitrates,
            "11": lib.v2l1Bitrates
        }
    };

    //
    lib.samplingRateMap = {
        "00": lib.v25SamplingRates,
        "10": lib.v2SamplingRates,
        "11": lib.v1SamplingRates
    };

    //
    lib.v1SampleLengths = {
        "01": 1152,
        "10": 1152,
        "11": 384
    };

    //
    lib.v2SampleLengths = {
        "01": 576,
        "10": 1152,
        "11": 384
    };

    //
    lib.sampleLengthMap = {
        "01": lib.v2SampleLengths,
        "10": lib.v2SampleLengths,
        "11": lib.v1SampleLengths
    };

    // Convert the given string `str` to an array of words (octet pairs). If all characters in the
    //  given string are within the ISO/IEC 8859-1 subset then the returned array may safely be
    //  interpreted as an array of values in the [0, 255] range, where each value requires a single
    //  octet to be represented. Otherwise it should be interpreted as an array of values in the
    //  [0, 65.535] range, where each value requires a word (octet pair) to be represented.
    //
    // Not meant to be used with UTF-16 strings that contain chars outside the BMP. See
    //  [charCodeAt on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt)
    lib.wordSeqFromStr = function (str) {
        for (var i = str.length - 1, seq = []; i >= 0; --i) {
            seq[i] = str.charCodeAt(i);
        }
        return seq;
    };

    // Common character sequences converted to byte arrays
    lib.seq = {
        id3: lib.wordSeqFromStr("ID3"),
        xing: lib.wordSeqFromStr("Xing"),
        info: lib.wordSeqFromStr("Info")
    };

    // A handy no-op to reuse
    lib.noOp = function () {};

    // Decode a [synchsafe](http://en.wikipedia.org/wiki/Synchsafe) value. Synchsafes are used in
    //  ID3 tags, instead of regular ints, to avoid the unintended introduction of bogus
    //  frame-syncs. Note that the spec requires that syncsafe be always stored in big-endian order
    //  (Implementation shamefully lifted from relevant wikipedia article)
    lib.unsynchsafe = function (value) {
        var out = 0;
        var mask = 0x7F000000;

        while (mask) {
            out >>= 1;
            out |= value & mask;
            mask >>= 8;
        }

        return out;
    };

    // Get a value indicating whether given DataView `view` contains the `seq` sequence (array
    //  of octets) at `offset` index. Note that no check is performed for the adequate length of
    //  given view as this should be carried out by the caller
    lib.isSeq = function (seq, view, offset) {
        for (var i = seq.length - 1; i >= 0; i--) {
            if (seq[i] !== view.getUint8(offset + i)) { return false; }
        }
        return true;
    };

    // Get a value indicating whether given DataView `view` contains the `str` string
    //  at `offset` index. The view is parsed as an array of 8bit single-byte coded characters
    //  (i.e. ISO/IEC 8859-1, _non_ Unicode). Will return the string itself if it does, false
    //  otherwise. Note that no check is performed for the adequate length of given view as
    //  this should be carried out be the caller as part of the section-parsing process
    /*
    isStr = function (str, view, offset) {
        return isSeq(lib.wordSeqFromStr(str), view, offset) ? str : false;
    };
    */

    // Locate first occurrence of sequence `seq` (an array of octets) in DataView `view`.
    //  Search starts at given `offset` and ends after `length` octets. Will return the
    //  absolute offset of sequence if found, -1 otherwise
    lib.locateSeq = function (seq, view, offset, length) {
        for (var i = 0, l = length - seq.length + 1; i < l; ++i) {
            if (lib.isSeq(seq, view, offset + i)) { return offset + i; }
        }
        return -1;
    };

    lib.locateStrTrm = {
        // Locate the first occurrence of non-Unicode null-terminator (i.e. a single zeroed-out
        //  octet) in DataView `view`. Search starts at given `offset` and ends after `length`
        //  octets. Will return the absolute offset of sequence if found, -1 otherwise
        iso: function (view, offset, length) {
            return lib.locateSeq([0], view, offset, length);
        },

        // Locate the first occurrence of Unicode null-terminator (i.e. a sequence of two
        //  zeroed-out octets) in DataView `view`. Search starts at given `offset` and ends after
        //  `length` octets. Will return the absolute offset of sequence if found, -1 otherwise
        ucs: function (view, offset, length) {
            var trmOffset = lib.locateSeq([0, 0], view, offset, length);
            if (trmOffset === -1) { return -1; }
            if ((trmOffset - offset) % 2 !== 0) { ++trmOffset; }
            return trmOffset;
        }
    };

    lib.readStr = {
        // Parse DataView `view` begining at `offset` index and return a string built from
        //  `length` octets. The view is parsed as an array of 8bit single-byte coded characters
        //  (i.e. ISO/IEC 8859-1, _non_ Unicode). Will essentially return the string comprised of
        //  octets [offset, offset + length). Note that no check is performed for the adequate
        //  length of given view as this should be carried out be the caller as part of the
        //  section-parsing process
        iso: function (view, offset, length) {
            return String.fromCharCode.apply(null, new Uint8Array(view.buffer, offset, length));
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
        // About the BOM: The current implementation will check for and remove the leading BOM from
        //  the given view to avoid invisible characters that mess up the resulting strings. MDN's
        //  documentation for [fromCharCode](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/fromCharCode)
        //  suggests that it can correctly convert UCS-2 buffers to strings. And indeed, tests
        //  performed with UCS-2 LE encoded frames indicate that it does. However, no tests have
        //  been made for UCS-2 BE. (Kid3, the ID3v2 Tag generator used for tests at the time of
        //  this writing, goes totally weird when switched to BE)
        ucs: function (view, offset, length) {
            // Tweak offset to remove the BOM (LE: FF FE / BE: FE FF)
            if (view.getUint16(offset) === 0xFFFE || view.getUint16(offset) === 0xFEFF) {
                offset += 2;
                length -= 2;
            }

            var buffer = view.buffer;

            // When offset happens to be an even number of octets, the array-buffer may be wrapped
            //  in a Uint16Array. In the event that it's _not_, an actual copy has to be made
            // (Note that Node <= 0.8 as well as IE <= 10 lack an ArrayBuffer#slice. TODO: shim it)
            if (offset % 2 === 1) {
                buffer = buffer.slice(offset, offset + length);
                offset = 0;
            }

            return String.fromCharCode.apply(null, new Uint16Array(buffer, offset, length / 2));
        }
    };

    lib.readTrmStr = {
        // Similar to `readStr.iso` but will check for a null-terminator determining the end of the
        //  string. The returned string will be of _at most_ `length` octets
        iso: function (view, offset, length) {
            var trmOffset = lib.locateStrTrm.iso(view, offset, length);
            if (trmOffset !== -1) { length = trmOffset - offset; }
            return lib.readStr.iso(view, offset, length);
        },

        // Similar to `readStr.ucs` but will check for a null-terminator determining the end of the
        //  string. The returned string will be of _at most_ `length` octets
        ucs: function (view, offset, length) {
            var trmOffset = lib.locateStrTrm.ucs(view, offset, length);
            if (trmOffset !== -1) { length = trmOffset - offset; }
            return lib.readStr.ucs(view, offset, length);
        }
    };

    // ### Read a Frame Header
    //
    // Read header of frame located at `offset` of DataView `view`. Returns null in the event
    //  that no frame header is found at `offset`
    lib.readFrameHeader = function (view, offset) {
        offset || (offset = 0);

        // There should be more than 4 octets ahead
        if (view.byteLength - offset <= 4) { return null; }

        // Header's first (out of four) octet: `11111111`: Frame sync (all bits must be set)
        var b1 = view.getUint8(offset);
        if (b1 !== 255) { return null; }

        // Header's second (out of four) octet: `111xxxxx`
        //
        // * `111.....`: Rest of frame sync (all bits must be set)
        // * `...BB...`: MPEG Audio version ID (11 -> MPEG Version 1 (ISO/IEC 11172-3))
        // * `.....CC.`: Layer description (01 -> Layer III)
        // * `.......1`: Protection bit (1 = Not protected)

        // Require the three most significant bits to be `111` (>= 224)
        var b2 = view.getUint8(offset + 1);
        if (b2 < 224) { return null; }

        var mpegVersion = octetToBinRep(b2).substr(3, 2);
        var layerVersion = octetToBinRep(b2).substr(5, 2);

        //
        var header = {
            _section: { type: "frameHeader", byteLength: 4, offset: offset },
            mpegAudioVersionBits: mpegVersion,
            mpegAudioVersion: lib.mpegVersionDescription[mpegVersion],
            layerDescriptionBits: layerVersion,
            layerDescription: lib.layerDescription[layerVersion],
            isProtected: b2 & 1, // Just check if last bit is set
        };
        header.protectionBit = header.isProtected ? "1" : "0";

        if (header.mpegAudioVersion === "reserved") { return null; }
        if (header.layerDescription === "reserved") { return null; }

        // Header's third (out of four) octet: `EEEEFFGH`
        //
        // * `EEEE....`: Bitrate index. 1111 is invalid, everything else is accepted
        // * `....FF..`: Sampling rate, 00=44100, 01=48000, 10=32000, 11=reserved
        // * `......G.`: Padding bit, 0=frame not padded, 1=frame padded
        // * `.......H`: Private bit. This is informative
        var b3 = view.getUint8(offset + 2);
        b3 = octetToBinRep(b3);
        header.bitrateBits = b3.substr(0, 4);
        header.bitrate = lib.bitrateMap[mpegVersion][layerVersion][header.bitrateBits];
        if (header.bitrate === "bad") { return null; }

        header.samplingRateBits = b3.substr(4, 2);
        header.samplingRate = lib.samplingRateMap[mpegVersion][header.samplingRateBits];
        if (header.samplingRate === "reserved") { return null; }

        header.frameIsPaddedBit = b3.substr(6, 1);
        header.frameIsPadded = header.frameIsPaddedBit === "1";
        header.framePadding = header.frameIsPadded ? 1 : 0;

        header.privateBit = b3.substr(7, 1);

        // Header's fourth (out of four) octet: `IIJJKLMM`
        //
        // * `II......`: Channel mode
        // * `..JJ....`: Mode extension (only if joint stereo)
        // * `....K...`: Copyright
        // * `.....L..`: Original
        // * `......MM`: Emphasis
        var b4 = view.getUint8(offset + 3);
        header.channelModeBits = octetToBinRep(b4).substr(0, 2);
        header.channelMode = lib.channelModes[header.channelModeBits];

        return header;
    };

    // ### Read a Frame
    //
    // Read frame located at `offset` of DataView `view`. Will acquire the frame header (see
    //  `readFrameHeader`) plus some basic information about the frame - notably the frame's length
    //  in bytes. If `requireNextFrame` is set, the presence of a _next_ valid frame will be
    //  required for _this_ frame to be regarded as valid. Returns null in the event that no frame
    //  is found at `offset`
    lib.readFrame = function (view, offset, requireNextFrame) {
        offset || (offset = 0);

        var frame = {
            _section: { type: "frame", offset: offset },
            header: lib.readFrameHeader(view, offset)
        };

        var head = frame.header; // Convenience shortcut

        // Frame should always begin with a valid header
        if (!head) { return null; }

        frame._section.sampleLength =
            lib.sampleLengthMap[head.mpegAudioVersionBits][head.layerDescriptionBits];

        //
        frame._section.byteLength = lib.getFrameByteLength(head.bitrate, head.samplingRate,
            head.framePadding, head.mpegAudioVersionBits, head.layerDescriptionBits);
        frame._section.nextFrameIndex = offset + frame._section.byteLength;

        // No "Xing" or "Info" identifier should be present - this would indicate that this
        //  is in fact a Xing tag masquerading as a frame
        var xingOffset = lib.getXingOffset(head.mpegAudioVersionBits, head.channelModeBits);
        if (lib.isSeq(lib.seq.xing, view, offset + xingOffset) ||
            lib.isSeq(lib.seq.info, view, offset + xingOffset)) {
            return null;
        }

        // If a next frame is required then the data at `frame._section.nextFrameIndex` should be
        //  a valid frame header
        if (requireNextFrame && !lib.readFrameHeader(view, frame._section.nextFrameIndex)) {
            return null;
        }

        return frame;
    };
}));
