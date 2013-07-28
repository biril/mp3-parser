//     mp3-parser v0.1.8

//     https://github.com/biril/mp3-parser
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013 Alex Lambiris

/*jshint browser:true */
/*global exports, define */
(function (root, createModule) {
    "use strict";

    // Expose as a module or global depending on the detected environment:

    // Global `define` method with `amd` property signifies an AMD loader (require.js, curl.js, ..)
    if (typeof define === "function" && define.amd) {
        return define(["exports"], function (exports) { return createModule(exports); });
    }

    // Global `exports` object signifies CommonJS enviroments with `module.exports`, e.g. Node
    if (typeof exports === "object") { return createModule(exports); }

    // If none of the above, then assume a browser, without AMD
    root.mp3Parser = createModule({});

    // Attach a `noConflict` method onto the `mp3Parser` global
    root.mp3Parser.noConflict = (function () {

        // Save a reference to the previous value of 'mp3Parser', so that it can be restored later
        //  on, if 'noConflict' is used
        var previousMp3Parser = root.mp3Parser;

        // Run in no-conflict mode, setting the `mp3Parser` global to to its previous value.
        //  Returns `mp3Parser`
        return function () {
            var mp3Parser = root.mp3Parser;
            root.mp3Parser = previousMp3Parser;
            mp3Parser.noConflict = function () { return mp3Parser; };
            return mp3Parser;
        };
    }());
}(this, function (mp3Parser) {
    "use strict";

    var
        // A handy no-op to reuse
        noOp = function () {},

        // Produce octet's binary representation as a string
        octetToBinRep = (function () {
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
        }()),

        // Decode a [synchsafe](http://en.wikipedia.org/wiki/Synchsafe) value. Synchsafes are used
        //  in ID3 tags, instead of regular ints, to avoid the unintended introduction of bogus
        //  frame-syncs
        unsynchsafe = function (value) {
            var out = 0,
                mask = 0x7F000000;

            while (mask) {
                out >>= 1;
                out |= value & mask;
                mask >>= 8;
            }

            return out;
        },

        // Get a value indicating whether given DataView `buffer` contains the `seq` sequence (array
        //  of octets) at `offset` index. Note that no check is performed for the adequate length of
        //  given buffer as this should be carried out by the caller
        isSeq = function (seq, buffer, offset) {
            for (var i = seq.length - 1; i >= 0; i--) {
                if (seq[i] !== buffer.getUint8(offset + i)) { return false; }
            }
            return true;
        },

        // Convert the `str` string to an array of octets. The string is parsed as an array
        //  of 8bit single-byte coded characters (i.e. ISO/IEC 8859-1, _non_ Unicode).
        seqFromStr = function (str) {
            for (var i = str.length - 1, seq = []; i >= 0; i--) {
                seq[i] = str.charCodeAt(i);
            }
            return seq;
        },

        // Get a value indicating whether given DataView `buffer` contains the `str` string
        //  at `offset` index. The buffer is parsed as an array of 8bit single-byte coded characters
        //  (i.e. ISO/IEC 8859-1, _non_ Unicode). Will return the string itself if it does, false
        //  otherwise. Note that no check is performed for the adequate length of given buffer as
        //  this should be carried out be the caller as part of the section-parsing process
        /*
        isStr = function (str, buffer, offset) {
            return isSeq(seqFromStr(str), buffer, offset) ? str : false;
        },
        */

        // Locate `seq` sequence (an array of octets) in DataView `buffer`. Search starts at given
        //  `offset` and ends after `length` octets. Will return the offset of sequence if found,
        //  -1 otherwise
        locateSeq = function (seq, buffer, offset, length) {
            for (var i = 0, l = length - seq.length; i < l; ++i) {
                if (isSeq(seq, buffer, offset + i)) { return offset + i; }
            }
            return -1;
        },

        // Parse DataView `buffer` begining at `offset` index and return a string built from
        //  `length` octets. The buffer is parsed as an array of 8bit single-byte coded characters
        //  (i.e. ISO/IEC 8859-1, _non_ Unicode). Will essentially return the string comprised of
        //  octets [offset, offset + length). Note that no check is performed for the adequate
        //  length of given buffer as this should be carried out be the caller as part of the
        //  section-parsing process
        readStr = function (buffer, offset, length) {
            return String.fromCharCode.apply(null, new Uint8Array(buffer.buffer, offset, length));
        },

        // UCS-2 version of `readStr`. UCS-2 is the fixed-width two-byte subset of
        //  Unicode that can only express values inside the 'Basic Multilingual Plane' (BMP). Note
        //  that this method is generally unsuitable for parsing non-trivial UTF-16 strings. This
        //  of course is only marginally related as, according to ID3v2, all Unicode strings are
        //  UCS-2. Further info:
        //
        //  * [How to convert ArrayBuffer to and from String](http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String)
        //  * [The encoding spec](http://encoding.spec.whatwg.org/)
        //  * [stringencoding shim](https://code.google.com/p/stringencoding/)
        readStrUcs2 = function (buffer, offset, length) {
            buffer = buffer.buffer;
            // When offset happens to be an even number of octets, the array-buffer may be wrapped
            //  in a Uint16Array. In the event that it's _not_, an actual copy has to be made
            if (offset % 2 === 1) {
                buffer = buffer.slice(offset, offset + length);
                offset = 0;
            }
            return String.fromCharCode.apply(null, new Uint16Array(buffer, offset, length / 2));
        },

        // Get the number of bytes in a frame given its `bitrate`, `samplingRate` and `padding`.
        //  Based on [a magic formula](http://mpgedit.org/mpgedit/mpeg_format/mpeghdr.htm)
        getFrameByteLength = function (bitrate, samplingRate, padding) {
            return Math.floor((144000 * bitrate / samplingRate) + padding);
        },

        //
        v1l3Bitrates = {
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
        },

        //
        v1l3SamplingRates = {
            "00": 44100,
            "01": 48000,
            "10": 32000,
            "11": "reserved"
        },

        //
        v1l3ChannelModes = {
            "00": "Stereo",
            "01": "Joint stereo (Stereo)",
            "10": "Dual channel (Stereo)",
            "11": "Single channel (Mono)"
        },

        //
        id3v2TagFrameNames = {
            AENC: "Audio encryption",
            APIC: "Attached picture",
            COMM: "Comments",
            COMR: "Commercial frame",
            ENCR: "Encryption method registration",
            EQUA: "Equalization",
            ETCO: "Event timing codes",
            GEOB: "General encapsulated object",
            GRID: "Group identification registration",
            IPLS: "Involved people list",
            LINK: "Linked information",
            MCDI: "Music CD identifier",
            MLLT: "MPEG location lookup table",
            OWNE: "Ownership frame",
            PRIV: "Private frame",
            PCNT: "Play counter",
            POPM: "Popularimeter",
            POSS: "Position synchronisation frame",
            RBUF: "Recommended buffer size",
            RVAD: "Relative volume adjustment",
            RVRB: "Reverb",
            SYLT: "Synchronized lyric/text",
            SYTC: "Synchronized tempo codes",
            TALB: "Album/Movie/Show title",
            TBPM: "BPM (beats per minute)",
            TCOM: "Composer",
            TCON: "Content type",
            TCOP: "Copyright message",
            TDAT: "Date",
            TDLY: "Playlist delay",
            TENC: "Encoded by",
            TEXT: "Lyricist/Text writer",
            TFLT: "File type",
            TIME: "Time",
            TIT1: "Content group description",
            TIT2: "Title/songname/content description",
            TIT3: "Subtitle/Description refinement",
            TKEY: "Initial key",
            TLAN: "Language(s)",
            TLEN: "Length",
            TMED: "Media type",
            TOAL: "Original album/movie/show title",
            TOFN: "Original filename",
            TOLY: "Original lyricist(s)/text writer(s)",
            TOPE: "Original artist(s)/performer(s)",
            TORY: "Original release year",
            TOWN: "File owner/licensee",
            TPE1: "Lead performer(s)/Soloist(s)",
            TPE2: "Band/orchestra/accompaniment",
            TPE3: "Conductor/performer refinement",
            TPE4: "Interpreted, remixed, or otherwise modified by",
            TPOS: "Part of a set",
            TPUB: "Publisher",
            TRCK: "Track number/Position in set",
            TRDA: "Recording dates",
            TRSN: "Internet radio station name",
            TRSO: "Internet radio station owner",
            TSIZ: "Size",
            TSRC: "ISRC (international standard recording code)",
            TSSE: "Software/Hardware and settings used for encoding",
            TYER: "Year",
            TXXX: "User defined text information frame",
            UFID: "Unique file identifier",
            USER: "Terms of use",
            USLT: "Unsychronized lyric/text transcription",
            WCOM: "Commercial information",
            WCOP: "Copyright/Legal information",
            WOAF: "Official audio file webpage",
            WOAR: "Official artist/performer webpage",
            WOAS: "Official audio source webpage",
            WORS: "Official internet radio station homepage",
            WPAY: "Payment",
            WPUB: "Publishers official webpage",
            WXXX: "User defined URL link frame"
        },

        // Common character sequences converted to byte arrays
        seq = {
            id3: seqFromStr("ID3"),
            xing: seqFromStr("Xing"),
            info: seqFromStr("Info")
        },

        // Read the content of a text-information ID3v2 tag frame. These are common and contain
        //  info such as artist and album. There may only be one text info frame of its kind in a
        //  tag. If the textstring is followed by a termination (00) all the following information
        //  should be ignored and not be displayed. All text frame identifiers begin with "T". Only
        //  text frame identifiers begin with "T", with the exception of the "TXXX" frame
        //
        // * Encoding:    xx (0: ISO-8859-1, 1: 16-bit unicode 2.0 (ISO/IEC 10646-1:1993, UCS-2))
        // * Information: <text string according to encoding>
        readId3v2TagFrameContentT = function (buffer, offset, length) {
            var content = { encoding: buffer.getUint8(offset) };
            content.text = (content.encoding === 0 ? readStr :
                readStrUcs2)(buffer, offset + 1, length - 1);
            return content;
        },

        // Read the content of user-defined text-information ID3v2 tag frame. Intended for
        //  one-string text information concerning the audiofile in a similar way to the other
        //  "T"-frames. The frame body consists of a description of the string, represented as a
        //  terminated string, followed by the actual string. There may be more than one "TXXX"
        //  frame in each tag, but only one with the same description
        //
        // * Encoding:    xx (0: ISO-8859-1, 1: 16-bit unicode 2.0 (ISO/IEC 10646-1:1993, UCS-2))
        // * Description: <text string according to encoding> 00 (00)
        // * Value:       <text string according to encoding>
        readId3v2TagFrameContentTxxx = function  (buffer, offset, length) {
            var content = { encoding: buffer.getUint8(offset) },
                termIndex = offset + length - 1,
                readS = content.encoding === 0 ? readStr : readStrUcs2;
            for (; termIndex >= offset; --termIndex) {
                if (buffer.getUint8(termIndex) === 0) { break; }
            }
            if (termIndex === offset) { return content; }

            content.description = readS(buffer, offset + 1, termIndex - offset - 1);
            content.value = readS(buffer, termIndex + 1, length - (termIndex - offset) - 1);

            return content;
        },

        // Read the content of a URL-link ID3v2 tag frame. There may only be one URL link frame of
        //  its kind in a tag, except when stated otherwise in the frame description. If the
        //  textstring is followed by a termination (00) all the following information should be
        //  ignored and not be displayed. All URL link frame identifiers begins with "W". Only URL
        //  link frame identifiers begins with "W"
        //
        // * URL: <text string>
        readId3v2TagFrameContentW = function (buffer, offset, length) {
            return { url: readStr(buffer, offset, length) };
        },

        // Read the content of a user-defined URL-link ID3v2 tag frame. Intended for URL links
        //  concerning the audiofile in a similar way to the other "W"-frames. The frame body
        //  consists of a description of the string, represented as a terminated string, followed
        //  by the actual URL. The URL is always encoded with ISO-8859-1. There may be more than
        //  one "WXXX" frame in each tag, but only one with the same description
        //
        // * Encoding:    xx (0: ISO-8859-1, 1: 16-bit unicode 2.0 (ISO/IEC 10646-1:1993, UCS-2))
        // * Description: <text string according to encoding> 00 (00)
        // * URL:         <text string>
        readId3v2TagFrameContentWxxx = function (buffer, offset, length) {
            var content = { encoding: buffer.getUint8(offset) },
                termIndex = offset + length - 1,
                readS = content.encoding === 0 ? readStr : readStrUcs2;
            for (; termIndex >= offset; --termIndex) {
                if (buffer.getUint8(termIndex) === 0) { break; }
            }
            if (termIndex === offset) { return content; }

            content.description = readS(buffer, offset + 1, termIndex - offset - 1);
            content.url = readS(buffer, termIndex + 1, length - (termIndex - offset) - 1);

            return content;
        },

        // Read the content of an ID3v2 tag comment frame. Indended for any kind of full text
        //  information that does not fit in any other frame. Consists of a frame header followed
        //  by encoding, language and content descriptors and ends with the actual comment as a
        //  text string. Newline characters are allowed in the comment text string. There may be
        //  more than one comment frame in each tag, but only one with the same language and
        //  content descriptor
        //
        // * Encoding:    xx (0: ISO-8859-1, 1: 16-bit unicode 2.0 (ISO/IEC 10646-1:1993, UCS-2))
        // * Language:    xx xx xx
        // * Short descr: <text string according to encoding> 00 (00)
        // * Actual text: <full text string according to encoding>
        readId3v2TagFrameContentComm = function (buffer, offset, length) {
            var content = { encoding: buffer.getUint8(offset) },
                offsetBeg = offset + 4,     // offset of content beginning (descriptor field)
                offsetTrm = offsetBeg,      // offset of content null-termination (seperates fields)
                offsetEnd = offset + length,// offset of (1 octet past) content end
                readS = content.encoding === 0 ? readStr : readStrUcs2;
            if (length < 5) { return content; }
            content.language = readS(buffer, offset + 1, 3);
            for (; offsetTrm < offsetEnd && buffer.getUint8(offsetTrm) !== 0; ++offsetTrm) {}
            if (offsetTrm === offsetEnd) { return content; }
            if (content.encoding !== 0) { ++offsetTrm; } // UCS-2 terminates with _2_ null bytes
            content.description = readS(buffer, offsetBeg, offsetTrm - offsetBeg);
            content.text = readS(buffer, offsetTrm + 1, offsetEnd - offsetTrm - 1);
            return content;
        };


    // ### Notes
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
    mp3Parser;


    // ### Read a Frame Header
    //
    // Read header of frame located at `offset` of DataView `buffer`. Returns null in the event
    //  that no frame header is found at `offset`
    mp3Parser.readFrameHeader = function (buffer, offset) {
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
        header.bitrate = v1l3Bitrates[header.bitrateBits];
        if (header.bitrate === "bad") { return null; }

        header.samplingRateBits = b3.substr(4, 2);
        header.samplingRate = v1l3SamplingRates[header.samplingRateBits];
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
        header.channelMode = v1l3ChannelModes[header.channelModeBits];

        return header;
    };


    // ### Read a Frame
    //
    // Read frame located at `offset` of DataView `buffer`. Will acquire the frame header (see
    //  `readFrameHeader`) plus some basic information about the frame - notably the length if the
    //  frame in bytes. If `requireNextFrame` is set, the presence of a next valid frame will be
    //  required for _this_ frame to be regarded as valid. Returns null in the event that no frame
    //  is found at `offset`
    mp3Parser.readFrame = function (buffer, offset, requireNextFrame) {
        offset || (offset = 0);

        var frame = {
                _section: {
                    type: "frame",
                    offset: offset
                },
                header: mp3Parser.readFrameHeader(buffer, offset)
            };

        // Frame should always begin with a valid header
        if (!frame.header) { return null; }

        // The num of samples per v1l3 frame is constant - always 1152
        frame._section.sampleLength = 1152;

        //
        frame._section.byteLength = getFrameByteLength(frame.header.bitrate, frame.header.samplingRate, frame.header.framePadding);
        frame._section.nextFrameIndex = offset + frame._section.byteLength;

        // No "Xing" or "Info" identifier should reside at octet 36 - this would indicate that this
        //  is in fact a Xing tag masquerading as a frame
        if (isSeq(seq.xing, buffer, offset + 36) || isSeq(seq.info, buffer, offset + 36)) {
            return null;
        }

        // If a next frame is required then the data at `frame._section.nextFrameIndex` should be
        //  a valid frame header
        if (requireNextFrame && !mp3Parser.readFrameHeader(buffer, frame._section.nextFrameIndex)) {
            return null;
        }

        return frame;
    };


    // ### Read the Last Frame
    //
    // Locate and read the very last valid frame in given DataView `buffer`. The search is carried
    //  out in reverse, from given `offset` (or the very last octet if `offset` is ommitted) to the
    //  first octet in the buffer. If `requireNextFrame` is set, the presence of a next valid frame
    //  will be required for any found frame to be regarded as valid (causing the method to
    //  essentially return the next-to-last frame on success). Returns null in the event that no
    //  frame is found at `offset`
    mp3Parser.readLastFrame = function (buffer, offset, requireNextFrame) {
        offset || (offset = buffer.byteLength - 1);

        var lastFrame = null;

        for (; offset >= 0; --offset) {
            if (buffer.getUint8(offset) === 255) {
                // Located a candidate frame as 255 is a possible frame-sync byte
                lastFrame = mp3Parser.readFrame(buffer, offset, requireNextFrame);
                if (lastFrame) { return lastFrame; }
            }
        }

        return null;
    };


    // ### Read an ID3v2 Tag Frame
    //
    // Read a specific [ID3v2 Tag](http://id3.org/id3v2.3.0) frame located at `offset` of DataView
    //  `buffer`. Returns null in the event that no tag-frame is found at `offset`
    mp3Parser.readId3v2TagFrame = function (buffer, offset) {
        // All frames consist of a frame header followed by one or more fields containing the
        //  actual information. The layout of the frame header:
        //
        // * Frame ID: xx xx xx xx (four characters)
        // * Size:     xx xx xx xx (frame size excluding frame header (frame size - 10))
        // * Flags:    xx xx
        var frame = {
                header: {
                    id: readStr(buffer, offset, 4),
                    size: buffer.getUint32(offset + 4),
                    flagsOctet1: buffer.getUint8(offset + 8),
                    flagsOctet2: buffer.getUint8(offset + 9)
                }
            };

        // Frame's friendly name
        frame.name = id3v2TagFrameNames[frame.header.id];

        // An ID3v2 tag frame must have a length of at least 1 octet, excluding the header
        if (frame.size < 1) { return frame; }

        // Read frame's content
        frame.content = (function (id, offset, length) {
            // User-defined text-information frames
            if (id === "TXXX") { return readId3v2TagFrameContentTxxx; }
            // Text-information frames
            if (id.charAt(0) === "T") { return readId3v2TagFrameContentT; }
            // User-defined URL-link frames
            if (id === "WXXX") { return readId3v2TagFrameContentWxxx; }
            // URL-link frames
            if (id.charAt(0) === "W") { return readId3v2TagFrameContentW; }
            // Comment frames
            if (id === "COMM") { return readId3v2TagFrameContentComm; }
            // Unknown frame - 'parse it' using a no-op returning `undefined` content
            return noOp;
        }(frame.header.id))(buffer, offset + 10, frame.header.size);

        return frame;
    };


    // ### Read the ID3v2 Tag
    //
    // Read [ID3v2 Tag](http://id3.org/id3v2.3.0) located at `offset` of DataView `buffer`. Returns
    //  null in the event that no tag is found at `offset`
    mp3Parser.readId3v2Tag = function (buffer, offset) {
        offset || (offset = 0);

        // The ID3v2 tag header, which should be the first information in the file, is 10 bytes:
        //
        // * identifier: 3 octets: always "ID3" (0x49/73, 0x44/68, 0x33/51)
        // * version:    2 octets: major version + revision number
        // * flags:      1 octet : abc00000. a:unsynchronisation, b:extended header, c:experimental
        // * size:       4 octets: tag size as a synchsafe integer

        // There should be at least 10 bytes ahead
        if (buffer.byteLength - offset < 10) { return null; }

        // The 'ID3' identifier is expected at given offset
        if (!isSeq(seq.id3, buffer, offset)) { return null; }

        var
            //
            flagsOctet = buffer.getUint8(offset + 5),

            //
            tag = {
                _section: {
                    type: "ID3v2",
                    offset: offset
                },
                header: {
                    majorVersion: buffer.getUint8(offset + 3),
                    minorRevision: buffer.getUint8(offset + 4),
                    flagsOctet: flagsOctet,
                    unsynchronisationFlag: (flagsOctet & 128) === 128,
                    extendedHeaderFlag: (flagsOctet & 64) === 64,
                    experimentalIndicatorFlag: (flagsOctet & 32) === 32,
                    size: unsynchsafe(buffer.getUint32(offset + 6))
                },
                frames: []
            },

            // Index of octet following tag's last octet: The tag spans [offset, tagEnd)
            //  (including the first 10 header octets)
            tagEnd,

            // To store frames as they're discovered while paring the tag
            frame;

        // The size as expressed in the header is the size of the complete tag after
        //  unsychronisation, including padding, excluding the header but not excluding the
        //  extended header (total tag size - 10)
        tag._section.byteLength = tag.header.size + 10;
        tagEnd = offset + tag._section.byteLength;

        // TODO: Process extended header if present. The presence of an extended header will affect
        //  the offset. Currently, it is asummed that no extended header is present so the offset
        //  is fixed at 10 octets
        if (tag.header.extendedHeaderFlag) {}

        // Go on to read individual frames but only if the tag version is v2.3. This is the only
        //  version currently supported
        if (tag.header.majorVersion !== 3) { return tag; }

        // Move offset past the end of the tag header to start reading tag frames
        offset += 10;
        while (offset < tagEnd) {

            // Locating a frame with a zeroed out id indicates that all valid frames have already
            //  been parsed. It's all dead space hereon so practically we're done
            if (buffer.getUint32(offset) === 0) { break; }

            frame = mp3Parser.readId3v2TagFrame(buffer, offset);

            // Couldn't parse this frame so bail out
            if (!frame) { break; }

            tag.frames.push(frame);
            offset += frame.header.size + 10;
        }

        return tag;
    };


    // ### Read the Xing Tag
    //
    // Read [Xing / Lame Tag](http://gabriel.mp3-tech.org/mp3infotag.html) located at `offset` of
    //  DataView `buffer`. Returns null in the event that no frame is found at `offset`
    mp3Parser.readXingTag = function (buffer, offset) {
        offset || (offset = 0);

        var tag = {
                _section: {
                    type: "Xing",
                    offset: offset
                },
                header: mp3Parser.readFrameHeader(buffer, offset)
            };

        // The Xing header should begin with a valid frame header
        if (!tag.header) { return null; }

        // There should be at least 36 + 4 = 40 bytes ahead
        if (buffer.byteLength < offset + 40) { return null; }

        // A "Xing" or "Info" identifier should reside at octet 36
        (tag.identifier = isSeq(seq.xing, buffer, offset + 36)) ||
        (tag.identifier = isSeq(seq.info, buffer, offset + 36));
        if (!tag.identifier) { return null; }

        //
        tag._section.byteLength = getFrameByteLength(tag.header.bitrate, tag.header.samplingRate, tag.header.framePadding);
        tag._section.nextFrameIndex = offset + tag._section.byteLength;

        return tag;
    };


    // ### Read all Tags up to First Frame
    //
    // http://www.rengels.de/computer/mp3tags.html
    // http://stackoverflow.com/q/5005476/612262
    mp3Parser.readTags = function (buffer, offset) {
        offset || (offset = 0);

        var sections = [],
            section = null,
            readers = [mp3Parser.readId3v2Tag, mp3Parser.readXingTag, mp3Parser.readFrame],
            foundFirstFrame = false,
            i = 0,
            numOfReaders = readers.length,
            bufferLength = buffer.byteLength;

        // While we haven't located the first frame, pick the next offset ..
        for (; offset < bufferLength && !foundFirstFrame; ++offset) {

            // .. and try out each of the 'readers' on it
            for (i = 0; i < numOfReaders; ++i) {
                section = readers[i](buffer, offset);

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
                    //  foundFirstFrame (so that we also exit the outer loop)
                    if (section._section.type === "frame") {
                        foundFirstFrame = true;
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

    // Attach the `version` property to mp3 Parser and return it
    Object.defineProperties(mp3Parser, {

        // Get current version of mp3-parser
        version: { get: function () { return "0.1.8"; } }
    });

    return mp3Parser;
}));
