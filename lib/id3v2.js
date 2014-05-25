//     mp3-parser/id3v2 v0.1.14

//     https://github.com/biril/mp3-parser
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013-2014 Alex Lambiris

/*jshint browser:true */
/*global exports:false, define:false, require:false */
(function (globalObject, createModule) {
    "use strict";

    // Export as a module or global depending on environment:

    // Global `define` method with `amd` property signifies an AMD loader (require.js, curl.js, ..)
    if (typeof define === "function" && define.amd) {
        return define(["exports"], function (exports) {
            return createModule(exports, require("./lib"));
        });
    }

    // Global `exports` object signifies CommonJS enviroments with `module.exports`, e.g. Node
    if (typeof exports === "object") {
        return createModule(exports, require("./lib"));
    }

    // If none of the above, then assume a browser sans AMD (also attach a `noConflict`)
    var previousMp3Id3v2Parser = globalObject.mp3Id3v2Parser;
    createModule(globalObject.mp3Id3v2Parser = {
        noConflict: function () {
            var mp3Id3v2Parser = globalObject.mp3Id3v2Parser;
            globalObject.mp3Id3v2Parser = previousMp3Id3v2Parser;
            return (this.noConflict = function () { return mp3Id3v2Parser; }).call();
        }
    }, globalObject.lib);

}(this, function (mp3Id3v2Parser, lib) {
    "use strict";

    //
    var id3v2TagFrameNames = {
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

        // 'ID3' character sequence converted to a handy byte array
        id3Seq = lib.seqFromStr("ID3"),

        // Read the content of an ID3v2
        //  [text-information frame](http://id3.org/id3v2.3.0#Text_information_frames). These are
        //  common and contain info such as artist and album. There may only be one text info frame
        //  of its kind in a tag. If the textstring is followed by a termination (00) all the
        //  following information should be ignored and not be displayed. All text frame
        //  identifiers begin with "T". Only text frame identifiers begin with "T", with the
        //  exception of the "TXXX" frame
        //
        // * Encoding:    a single octet where 0 = ISO-8859-1, 1 = UCS-2
        // * Information: a text string according to encoding
        readId3v2TagFrameContentT = function (buffer, offset, length) {
            var content = { encoding: buffer.getUint8(offset) };
            content.value = (content.encoding === 0 ? lib.readStr :
                lib.readStrUcs2)(buffer, offset + 1, length - 1);
            return content;
        },

        // Read the content of an ID3v2
        //  (user-defined text-information frame)[http://id3.org/id3v2.3.0#User_defined_text_information_frame].
        //  Intended for one-string text information concerning the audiofile in a similar way to
        //  the other "T"-frames. The frame body consists of a description of the string,
        //  represented as a terminated string, followed by the actual string. There may be more
        //  than one "TXXX" frame in each tag, but only one with the same description
        //
        // * Encoding:    a single octet where 0 = ISO-8859-1, 1 = UCS-2
        // * Description: a text string according to encoding (followed by 00 (00))
        // * Value:       a text string according to encoding
        readId3v2TagFrameContentTxxx = function  (buffer, offset, length) {
            var
                // The content to be returned
                content = { encoding: buffer.getUint8(offset) },

                // Offsets
                offsetBeg = offset + 1, // content beginning (description field)
                offsetTrm,              // content null-terminator (seperates descr / value fields)

                //
                isEncodingUcs2 = content.encoding === 1,

                // Choose appropriate string-reader depending on encoding
                readS = isEncodingUcs2 ? lib.readStrUcs2 : lib.readStr;

            // Encoding + null term. = at least 2 octets
            if (length < 2) {
                return content; // Inadequate length!
            }

            // Locate the the null terminator seperating description and URL
            offsetTrm = (isEncodingUcs2 ? lib.locateStrTrmUcs2 :
                lib.locateStrTrm)(buffer, offsetBeg, length - 4);
            if (offsetTrm === -1) {
                return content; // Not found!
            }

            // Read data
            content.description = readS(buffer, offsetBeg, offsetTrm - offsetBeg);
            offsetTrm += isEncodingUcs2 ? 2 : 1; // Move past terminating sequence
            content.value = readS(buffer, offsetTrm, offset + length - offsetTrm);

            return content;
        },

        // Read the content of an ID3v2
        //  [URL-link frame](http://id3.org/id3v2.3.0#URL_link_frames). There may only be one
        //  URL link frame of its kind in a tag, except when stated otherwise in the frame
        //  description. If the textstring is followed by a termination (00) all the following
        //  information should be ignored and not be displayed. All URL link frame identifiers
        //  begins with "W". Only URL link frame identifiers begins with "W"
        //
        // * URL: a text string
        readId3v2TagFrameContentW = function (buffer, offset, length) {
            return { value: lib.readStr(buffer, offset, length) };
        },

        // Read the content of an ID3v2
        //  [user-defined URL-link frame](http://id3.org/id3v2.3.0#User_defined_URL_link_frame).
        //  Intended for URL links concerning the audiofile in a similar way to the other
        //  "W"-frames. The frame body consists of a description of the string, represented as a
        //  terminated string, followed by the actual URL. The URL is always encoded with
        //  ISO-8859-1. There may be more than one "WXXX" frame in each tag, but only one with the
        //  same description
        //
        // * Encoding:    a single octet where 0 = ISO-8859-1, 1 = UCS-2
        // * Description: a text string according to encoding (followed by 00 (00))
        // * URL:         a text string
        readId3v2TagFrameContentWxxx = function (buffer, offset, length) {
            var
                // The content to be returned
                content = { encoding: buffer.getUint8(offset) },

                // Offsets
                offsetBeg = offset + 1, // content beginning (description field)
                offsetTrm,              // content null-terminator (seperates descr / URL fields)

                //
                isEncodingUcs2 = content.encoding === 1,

                // Choose appropriate string-reader depending on encoding
                readS = isEncodingUcs2 ? lib.readStrUcs2 : lib.readStr;

            // Encoding + null term. = at least 2 octets
            if (length < 2) {
                return content; // Inadequate length!
            }

            // Locate the the null terminator seperating description and URL
            offsetTrm = (isEncodingUcs2 ? lib.locateStrTrmUcs2 :
                lib.locateStrTrm)(buffer, offsetBeg, length - 4);
            if (offsetTrm === -1) {
                return content; // Not found!
            }

            // Read data
            content.description = readS(buffer, offsetBeg, offsetTrm - offsetBeg);
            offsetTrm += isEncodingUcs2 ? 2 : 1; // Move past terminating sequence
            content.value = lib.readStr(buffer, offsetTrm, offset + length - offsetTrm);

            return content;
        },

        // Read the content of an ID3v2 [comment frame](http://id3.org/id3v2.3.0#Comments).
        //  Intended for any kind of full text information that does not fit in any other frame.
        //  Consists of a frame header followed by encoding, language and content descriptors and
        //  ends with the actual comment as a text string. Newline characters are allowed in the
        //  comment text string. There may be more than one comment frame in each tag, but only one
        //  with the same language and content descriptor
        //
        // * Encoding:    a single octet where 0 = ISO-8859-1, 1 = UCS-2
        // * Language:    3 digit (octet) lang-code (ISO-639-2)
        // * Short descr: a text string according to encoding (followed by 00 (00))
        // * Actual text: a text string according to encoding
        readId3v2TagFrameContentComm = function (buffer, offset, length) {
            var
                // The content to be returned
                content = { encoding: buffer.getUint8(offset) },

                // Offsets
                offsetBeg = offset + 4, // content beginning (description field)
                offsetTrm,              // content null-terminator (seperates descr / text fields)

                //
                isEncodingUcs2 = content.encoding === 1,

                // Choose appropriate string-reader depending on encoding
                readS = isEncodingUcs2 ? lib.readStrUcs2 : lib.readStr;

            // Encoding + language + null term. = at least 5 octets
            if (length < 5) {
                return content; // Inadequate length!
            }

            // Read the language field - 3 octets at most
            content.language = lib.readTrmStr(buffer, offset + 1, 3);

            // Locate the the null terminator seperating description and text
            offsetTrm = (isEncodingUcs2 ? lib.locateStrTrmUcs2 :
                lib.locateStrTrm)(buffer, offsetBeg, length - 4);
            if (offsetTrm === -1) {
                return content; // Not found!
            }

            // Read data
            content.description = readS(buffer, offsetBeg, offsetTrm - offsetBeg);
            offsetTrm += isEncodingUcs2 ? 2 : 1; // Move past terminating sequence
            content.text = readS(buffer, offsetTrm, offset + length - offsetTrm);

            return content;
        },

        // Read the content of an ID3v2
        //  [unique file identifier frame](http://id3.org/id3v2.3.0#Unique_file_identifier). Allows
        //  identification of the audio file by means of some database that may contain more
        //  information relevant to the content. All frames begin with a null-terminated string - a
        //  URL containing an email address, or a link to a location where an email address can be
        //  found - that belongs to the organisation responsible for this specific database
        //  implementation. The 'Owner identifier' must be non-empty (more than just a termination)
        //  and is followed by the actual identifier, which may be up to 64 bytes. There may be
        //  more than one "UFID" frame in a tag, but only one with the same 'Owner identifier'.
        //
        // * Owner identifier: a text string (followed by 00)
        // * Identifier:       up to 64 bytes of binary data
        readId3v2TagFrameContentUfid = function (buffer, offset, length) {
            var
                // Read up to the first null terminator to get the owner-identifier
                ownerIdentifier = lib.readTrmStr(buffer, offset, length),

                // Figure out the identifier based on frame length vs owner-identifier length
                identifier = new DataView(buffer.buffer, offset + ownerIdentifier.length + 1,
                    length - ownerIdentifier.length - 1);

            return { ownerIdentifier: ownerIdentifier, identifier: identifier };
        };

    // ### Read an ID3v2 Tag Frame
    //
    // Read [ID3v2 Tag frame](http://id3.org/id3v2.3.0#Declared_ID3v2_frames) located at `offset`
    //  of DataView `buffer`. Returns null in the event that no tag-frame is found at `offset`
    mp3Id3v2Parser.readId3v2TagFrame = function (buffer, offset) {
        // All frames consist of a frame header followed by one or more fields containing the actual
        // information. The frame header is 10 octets long and laid out as `IIIISSSSFF`, where
        //
        // * `IIII......`: Frame id (four characters)
        // * `....SSSS..`: Size (frame size excluding frame header = frame size - 10)
        // * `........FF`: Flags
        var frame = {
                header: {
                    id: lib.readStr(buffer, offset, 4),
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
        frame.content = (function (id) {
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
            // Unique-file-identifier frames
            if (id === "UFID") { return readId3v2TagFrameContentUfid; }
            // Unknown frame - 'parse it' using a no-op returning `undefined` content
            return lib.noOp;
        }(frame.header.id))(buffer, offset + 10, frame.header.size);

        return frame;
    };


    // ### Read the ID3v2 Tag
    //
    // Read [ID3v2 Tag](http://id3.org/id3v2.3.0) located at `offset` of DataView `buffer`. Returns
    //  null in the event that no tag is found at `offset`
    mp3Id3v2Parser.readId3v2Tag = function (buffer, offset) {
        offset || (offset = 0);

        // The ID3v2 tag header, which should be the first information in the file, is 10 octets
        //  long and laid out as `IIIVVFSSSS`, where
        //
        // * `III.......`: id, always "ID3" (0x49/73, 0x44/68, 0x33/51)
        // * `...VV.....`: version (major version + revision number)
        // * `.....F....`: flags: abc00000. a:unsynchronisation, b:extended header, c:experimental
        // * `......SSSS`: tag's size as a synchsafe integer

        // There should be at least 10 bytes ahead
        if (buffer.byteLength - offset < 10) { return null; }

        // The 'ID3' identifier is expected at given offset
        if (!lib.isSeq(id3Seq, buffer, offset)) { return null; }

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
                    size: lib.unsynchsafe(buffer.getUint32(offset + 6))
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

            frame = mp3Id3v2Parser.readId3v2TagFrame(buffer, offset);

            // Couldn't parse this frame so bail out
            if (!frame) { break; }

            tag.frames.push(frame);
            offset += frame.header.size + 10;
        }

        return tag;
    };

}));
