//     mp3-parser/id3v2 v0.3.0

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
    var previousMp3Id3v2Parser = globalObject.mp3Id3v2Parser;
    createModule(globalObject.mp3Id3v2Parser = {
        noConflict: function () {
            var mp3Id3v2Parser = globalObject.mp3Id3v2Parser;
            globalObject.mp3Id3v2Parser = previousMp3Id3v2Parser;
            return (this.noConflict = function () { return mp3Id3v2Parser; }).call();
        }
    }, globalObject.mp3ParserLib);
}(this, function (mp3Id3v2Parser, lib) {
    "use strict";

    //
    var id3v2TagFrameNames = {
        AENC: "Audio encryption",
        APIC: "Attached picture",
        CHAP: "Chapter",
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
    };

    //
    var readFrameContent = {};

    // Read the content of a
    //  [text-information frame](http://id3.org/id3v2.3.0#Text_information_frames). These are
    //  common and contain info such as artist and album. There may only be one text info frame
    //  of its kind in a tag. If the textstring is followed by a termination (00) all the
    //  following information should be ignored and not be displayed. All text frame
    //  identifiers begin with "T". Only text frame identifiers begin with "T", with the
    //  exception of the "TXXX" frame
    //
    // * Encoding:    a single octet where 0 = ISO-8859-1, 1 = UCS-2
    // * Information: a text string according to encoding
    readFrameContent.T = function (view, offset, length) {
        var content = { encoding: view.getUint8(offset) };
        content.value = lib.readStr[content.encoding === 0 ? "iso" : "ucs"](
            view, offset + 1, length - 1);
        return content;
    };

    // Read the content of a
    //  [user-defined text-information frame](http://id3.org/id3v2.3.0#User_defined_text_information_frame).
    //  Intended for one-string text information concerning the audiofile in a similar way to
    //  the other "T"-frames. The frame body consists of a description of the string,
    //  represented as a terminated string, followed by the actual string. There may be more
    //  than one "TXXX" frame in each tag, but only one with the same description
    //
    // * Encoding:    a single octet where 0 = ISO-8859-1, 1 = UCS-2
    // * Description: a text string according to encoding (followed by 00 (00))
    // * Value:       a text string according to encoding
    readFrameContent.TXXX = function  (view, offset, length) {
        // The content to be returned
        var content = { encoding: view.getUint8(offset) };

        // Encoding + null term. = at least 2 octets
        if (length < 2) {
            return content; // Inadequate length!
        }

        // Encoding and content beginning (description field)
        var enc = content.encoding === 0 ? "iso" : "ucs";
        var offsetBeg = offset + 1;

        // Locate the the null terminator seperating description and URL
        var offsetTrm = lib.locateStrTrm[enc](view, offsetBeg, length - 4);
        if (offsetTrm === -1) {
            return content; // Not found!
        }

        // Read description and value data into content
        content.description = lib.readStr[enc](view, offsetBeg, offsetTrm - offsetBeg);
        offsetTrm += enc === "ucs" ? 2 : 1; // Move past terminating sequence
        content.value = lib.readStr[enc](view, offsetTrm, offset + length - offsetTrm);

        return content;
    };

    // Read the content of a
    //  [URL-link frame](http://id3.org/id3v2.3.0#URL_link_frames). There may only be one
    //  URL link frame of its kind in a tag, except when stated otherwise in the frame
    //  description. If the textstring is followed by a termination (00) all the following
    //  information should be ignored and not be displayed. All URL link frame identifiers
    //  begins with "W". Only URL link frame identifiers begins with "W"
    //
    // * URL: a text string
    readFrameContent.W = function (view, offset, length) {
        return { value: lib.readStr.iso(view, offset, length) };
    };

    // Read the content of a
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
    readFrameContent.WXXX = function (view, offset, length) {
        // The content to be returned
        var content = { encoding: view.getUint8(offset) };

        // Encoding + null term. = at least 2 octets
        if (length < 2) {
            return content; // Inadequate length!
        }

        // Encoding and content beginning (description field)
        var enc = content.encoding === 0 ? "iso" : "ucs";
        var offsetBeg = offset + 1;

        // Locate the the null terminator seperating description and URL
        var offsetTrm = lib.locateStrTrm[enc](view, offsetBeg, length - 4);
        if (offsetTrm === -1) {
            return content; // Not found!
        }

        // Read description and value data into content
        content.description = lib.readStr[enc](view, offsetBeg, offsetTrm - offsetBeg);
        offsetTrm += enc === "ucs" ? 2 : 1; // Move past terminating sequence
        content.value = lib.readStr.iso(view, offsetTrm, offset + length - offsetTrm);

        return content;
    };

    // Read the content of a [comment frame](http://id3.org/id3v2.3.0#Comments).
    //  Intended for any kind of full text information that does not fit in any other frame.
    //  Consists of a frame header followed by encoding, language and content descriptors and
    //  ends with the actual comment as a text string. Newline characters are allowed in the
    //  comment text string. There may be more than one comment frame in each tag, but only one
    //  with the same language and content descriptor. [Note that the structure of comment
    //  frames is identical to that of USLT frames - `readFrameContentComm` will handle both.]
    //
    // * Encoding:    a single octet where 0 = ISO-8859-1, 1 = UCS-2
    // * Language:    3 digit (octet) lang-code (ISO-639-2)
    // * Short descr: a text string according to encoding (followed by 00 (00))
    // * Actual text: a text string according to encoding
    readFrameContent.COMM = function (view, offset, length) {
        // The content to be returned
        var content = { encoding: view.getUint8(offset) };

        // Encoding + language + null term. = at least 5 octets
        if (length < 5) {
            return content; // Inadequate length!
        }

        // Encoding and content beggining (short description field)
        var enc = content.encoding === 0 ? "iso" : "ucs";
        var offsetBeg = offset + 4;

        // Read the language field - 3 octets at most
        content.language = lib.readTrmStr.iso(view, offset + 1, 3);

        // Locate the the null terminator seperating description and text
        var offsetTrm = lib.locateStrTrm[enc](view, offsetBeg, length - 4);
        if (offsetTrm === -1) {
            return content; // Not found!
        }

        // Read short description and text data into content
        content.description = lib.readStr[enc](view, offsetBeg, offsetTrm - offsetBeg);
        offsetTrm += enc === "ucs" ? 2 : 1; // Move past terminating sequence
        content.text = lib.readStr[enc](view, offsetTrm, offset + length - offsetTrm);

        return content;
    };

    // Read the content of a
    //  [unique file identifier frame](http://id3.org/id3v2.3.0#Unique_file_identifier). Allows
    //  identification of the audio file by means of some database that may contain more
    //  information relevant to the content. Begins with a URL containing an email address, or
    //  a link to a location where an email address can be found that belongs to the
    //  organisation responsible for this specific database implementation. The 'Owner
    //  identifier' must be non-empty (more than just a termination) and is followed by the
    //  actual identifier, which may be up to 64 bytes. There may be more than one "UFID" frame
    //  in a tag, but only one with the same 'Owner identifier'. Note that this frame is very
    //  similar to the "PRIV" frame
    //
    // * Owner identifier: a text string (followed by 00)
    // * Identifier:       up to 64 bytes of binary data
    readFrameContent.UFID = function (view, offset, length) {
        // Read up to the first null terminator to get the owner-identifier
        var ownerIdentifier = lib.readTrmStr.iso(view, offset, length);

        // Figure out the identifier based on frame length vs owner-identifier length
        var identifier = new DataView(view.buffer, offset + ownerIdentifier.length + 1,
            length - ownerIdentifier.length - 1);

        return { ownerIdentifier: ownerIdentifier, identifier: identifier };
    };

    // Read the content of an
    //  [involved people list frame](http://id3.org/id3v2.3.0#Involved_people_list). Contains
    //  names of those involved - those contributing to the audio file - and how they were
    //  involved. The body simply contains the first 'involvement' as a terminated string, directly
    //  followed by the first 'involvee' as a terminated string, followed by a second terminated
    //  involvement string and so on. However, in the current implementation the frame's content is
    //  parsed as a collection of strings without any semantics attached. There may only be one
    //  "IPLS" frame in each tag
    //
    // * Encoding:            a single octet where 0 = ISO-8859-1, 1 = UCS-2
    // * People list strings: a series of strings, e.g. string 00 (00) string 00 (00) ..
    readFrameContent.IPLS = function (view, offset, length) {
        // The content to be returned
        var content = { encoding: view.getUint8(offset), values: [] };

        // Encoding and content beginning (people list - specifically, first 'involvement' string)
        var enc = content.encoding === 0 ? "iso" : "ucs";
        var offsetBeg = offset + 1;

        // Index of null-terminator found within people list (seperates involvement / involvee)
        var offsetNextStrTrm;

        while (offsetBeg < offset + length) {
            // We expect all strings within the people list to be null terminated ..
            offsetNextStrTrm = lib.locateStrTrm[enc](view, offsetBeg, length - (offsetBeg - offset));

            // .. except _perhaps_ the last one. In this case fix the offset at the frame's end
            if (offsetNextStrTrm === -1) {
                offsetNextStrTrm = offset + length;
            }

            content.values.push(lib.readStr[enc](view, offsetBeg, offsetNextStrTrm - offsetBeg));
            offsetBeg = offsetNextStrTrm + (enc === "ucs" ? 2 : 1);
        }

        return content;
    };

    // Read the content of a [terms of use frame](http://id3.org/id3v2.3.0#Terms_of_use_frame).
    //  Contains a description of the terms of use and ownership of the file. Newlines are
    //  allowed in the text. There may only be one "USER" frame in a tag.
    //
    // * Encoding:    a single octet where 0 = ISO-8859-1, 1 = UCS-2
    // * Language:    3 digit (octet) lang-code (ISO-639-2)
    // * Actual text: a text string according to encoding
    readFrameContent.USER = function (view, offset, length) {
        // The content to be returned
        var content = { encoding: view.getUint8(offset) };

        // Encoding + language + null term. = at least 5 octets
        if (length < 5) {
            return content; // Inadequate length!
        }

        // Read the language field - 3 octets at most
        content.language = lib.readTrmStr.iso(view, offset + 1, 3);

        // Read the text field
        var offsetBeg = offset + 4;
        var enc = content.encoding === 0 ? "iso" : "ucs";
        content.text = lib.readStr[enc](view, offsetBeg, offset + length - offsetBeg);

        return content;
    };

    // Read the content of a
    //  [private frame](http://id3.org/id3v2.3.0#Private_frame). Contains binary data that does
    //  no fit into the other frames. Begins with a URL containing an email address, or
    //  a link to a location where an email address can be found. The 'Owner identifier' must
    //  be non-empty (more than just a termination) and is followed by the actual data. There
    //  may be more than one "PRIV" frame in a tag, but only with different contents. Note that
    //  this frame is very similar to the "UFID" frame
    //
    // * Owner identifier: a text string (followed by 00)
    // * private data:     binary data (of unbounded length)
    readFrameContent.PRIV = function (view, offset, length) {
        // Read up to the first null terminator to get the owner-identifier
        var ownerIdentifier = lib.readTrmStr.iso(view, offset, length);

        // Figure out the private data based on frame length vs owner-identifier length
        var privateData = new DataView(view.buffer, offset + ownerIdentifier.length + 1,
            length - ownerIdentifier.length - 1);

        return { ownerIdentifier: ownerIdentifier, privateData: privateData };
    };

    // Read the content of a [play counter](http://id3.org/id3v2.3.0#Play_counter). A counter
    //  of the number of times a file has been played. There may only be one "PCNT" frame in a
    //  tag. [According to the standard, "When the counter reaches all one's, one byte is
    //  inserted in front of the counter thus making the counter eight bits bigger." This is
    //  not currently taken into account]
    //
    // * Counter: 4 octets (at least ..)
    readFrameContent.PCNT = function (view, offset, length) {
        // The counter must be at least 4 octets long to begin with
        if (length < 4) {
            return {}; // Inadequate length!
        }

        // Assume the counter is always exactly 4 octets ..
        return { counter: view.getUint32(offset) };
    };

    // Read the content of a [popularimeter](http://id3.org/id3v2.3.0#Popularimeter). Intended
    //  as a measure for the file's popularity, it contains a user's email address, one rating
    //  octet and a four octer play counter, intended to be increased with one for every time
    //  the file is played. If no personal counter is wanted it may be omitted. [As is the case
    //  for the "PCNT" frame, according to the standard, "When the counter reaches all one's,
    //  one byte is inserted in front of the counter thus making the counter eight bits
    //  bigger." This is not currently taken into account]. There may be more than one "POPM"
    //  frame in each tag, but only one with the same email address
    //
    // * Email to user: a text string (followed by 00)
    // * Rating:        a single octet, values in 0-255 (0 = unknown, 1 = worst, 255 = best)
    // * Counter:       4 octets (at least ..)
    readFrameContent.POPM = function (view, offset, length) {
        var content = {
                email: lib.readTrmStr.iso(view, offset, length)
            };

        // rating offset
        offset += content.email.length + 1;

        // email str term + rating + counter = at least 6 octets
        if (length < 6) {
            return content; // Inadequate length!
        }

        content.rating = view.getUint8(offset);

        // Assume the counter is always exactly 4 octets ..
        content.counter = view.getUint32(offset + 1);

        return content;
    };

    // Read the content of an [attached picture](http://id3.org/id3v2.3.0#Attached_picture).
    //  Contains a picture directly related to the audio file. In the event that the MIME media
    //  type name is omitted, "image/" will be implied. The description has a maximum length of
    //  64 characters, but may be empty. There may be several pictures attached to one file,
    //  each in their individual "APIC" frame, but only one with the same content descriptor.
    //  There may only be one picture with the picture type declared as picture type $01 and
    //  $02 respectively.
    //
    // * Encoding:     a single octet where 0 = ISO-8859-1, 1 = UCS-2
    // * MIME Type:    a text string (followed by 00) - MIME type and subtype of image
    // * Picture type: a single octet, values in 0-255: a type-id as given by the standard
    // * Description:  a text string according to encoding (followed by 00 (00))
    // * Picture data: binary data (of unbounded length)
    readFrameContent.APIC = function (view, offset, length) {
        // The content to be returned
        var content = { encoding: view.getUint8(offset) };

        // Encoding + MIME type string term + pic type octet + descr. string term = min 4 octets
        if (length < 4) {
            return content; // Inadequate length!
        }

        // Encoding and offsets of content beginning / null-terminator
        var enc = content.encoding === 0 ? "iso" : "ucs";
        var offsetBeg, offsetTrm;

        // Locate the the null terminator seperating MIME type and picture type
        offsetBeg = offset + 1; // After the encoding octet
        offsetTrm = lib.locateStrTrm.iso(view, offsetBeg, length - 1);
        if (offsetTrm === -1) {
            return content; // Not found!
        }

        // Read MIME type
        content.mimeType = lib.readStr.iso(view, offsetBeg, offsetTrm - offsetBeg);

        // Read picture type
        offsetBeg = offsetTrm + 1;
        content.pictureType = view.getUint8(offsetBeg);

        // Locate the the null terminator seperating description and picture data
        offsetBeg += 1;
        offsetTrm = lib.locateStrTrm[enc](view, offsetBeg, offset + length - offsetBeg);
        if (offsetTrm === -1) {
            return content; // Not found!
        }

        // Read description
        content.description = lib.readStr[enc](view, offsetBeg, offsetTrm - offsetBeg);

        // Read picture data
        offsetBeg = offsetTrm + (enc === "ucs" ? 2 : 1);
        content.pictureData = new DataView(view.buffer, offsetBeg, offset + length - offsetBeg);

        return content;
    };

    // Read the chapter tag according to the ID3v2 Chapter Frame Addendum (http://id3.org/id3v2-chapters-1.0)
    //  The frame contains subframes, typically TIT2, and possibly additional frames
    //
    // * Id:            string identifier of the chapter
    // * Start time:    4 octets specifying the start of the chapter in milliseconds
    // * End time:      4 octets specifying the end of the chapter in milliseconds
    // * Start offset:  4 octets specifying the start of the chapter in bytes
    // * End offset:    4 octets specifying the end of the chapter in bytes
    // * Frames:        nested id3v2 frames
    readFrameContent.CHAP = function (view, offset, length) {
        // The content to be returned
        var content = { encoding: view.getUint8(offset) };

        // Locate the the null terminator between id and start time
        var offsetTrm = lib.locateStrTrm.iso(view, offset, length - 1);

        if (offsetTrm === -1) {
            return content; // Not found!
        }

        // Read id
        content.id = lib.readStr.iso(view, offset, offsetTrm - offset);

        // Read start time
        content.startTime = view.getUint32(offsetTrm + 1);

        // Read end time
        content.endTime = view.getUint32(offsetTrm + 5);

        // Read start offset
        content.startOffset = view.getUint32(offsetTrm + 9);

        // Read end offset
        content.endOffset = view.getUint32(offsetTrm + 13);

        var offsetSubFrames = offsetTrm + 17;
        content.frames = [];
        while (offsetSubFrames < offset + length) {
            var subFrame = mp3Id3v2Parser.readId3v2TagFrame(view, offsetSubFrames);
            content.frames.push(subFrame);
            offsetSubFrames += subFrame.header.size + 10;
        }

        return content;
    };

    // ### Read an ID3v2 Tag Frame
    //
    // Read [ID3v2 Tag frame](http://id3.org/id3v2.3.0#Declared_ID3v2_frames) located at `offset`
    //  of DataView `view`. Returns null in the event that no tag-frame is found at `offset`
    mp3Id3v2Parser.readId3v2TagFrame = function (view, offset) {
        // All frames consist of a frame header followed by one or more fields containing the actual
        // information. The frame header is 10 octets long and laid out as `IIIISSSSFF`, where
        //
        // * `IIII......`: Frame id (four characters)
        // * `....SSSS..`: Size (frame size excluding frame header = frame size - 10)
        // * `........FF`: Flags
        var frame = {
            header: {
                id: lib.readStr.iso(view, offset, 4),
                size: view.getUint32(offset + 4),
                flagsOctet1: view.getUint8(offset + 8),
                flagsOctet2: view.getUint8(offset + 9)
            }
        };

        // An ID3v2 tag frame must have a length of at least 1 octet, excluding the header
        if (frame.header.size < 1) { return frame; }

        // A function to read the frame's content
        var readContent = (function (read, id) { // jscs:disable requirePaddingNewLinesBeforeLineComments
            // User-defined text-information frames
            if (id === "TXXX") { return read.TXXX; }
            // Text-information frames
            if (id.charAt(0) === "T") { return read.T; }
            // User-defined URL-link frames
            if (id === "WXXX") { return read.WXXX; }
            // URL-link frames
            if (id.charAt(0) === "W") { return read.W; }
            // Comment frames or Unsychronised lyrics/text transcription frames
            if (id === "COMM" || id === "USLT") { return read.COMM; }
            // For any other frame such as UFID, IPLS, USER, etc, return the reader function
            //  that's named after the frame. Return a 'no-op reader' (which just returns
            //  `undefined` as the frame's content) if no implementation found for given frame
            return read[id] || lib.noOp;
        }(readFrameContent, frame.header.id)); // jscs-enable requirePaddingNewLinesBeforeLineComments

        // Store frame's friendly name
        frame.name = id3v2TagFrameNames[frame.header.id];

        // Read frame's content
        frame.content = readContent(view, offset + 10, frame.header.size);

        return frame;
    };

    // ### Read the ID3v2 Tag
    //
    // Read [ID3v2 Tag](http://id3.org/id3v2.3.0) located at `offset` of DataView `view`. Returns
    //  null in the event that no tag is found at `offset`
    mp3Id3v2Parser.readId3v2Tag = function (view, offset) {
        offset || (offset = 0);

        // The ID3v2 tag header, which should be the first information in the file, is 10 octets
        //  long and laid out as `IIIVVFSSSS`, where
        //
        // * `III.......`: id, always "ID3" (0x49/73, 0x44/68, 0x33/51)
        // * `...VV.....`: version (major version + revision number)
        // * `.....F....`: flags: abc00000. a:unsynchronisation, b:extended header, c:experimental
        // * `......SSSS`: tag's size as a synchsafe integer

        // There should be at least 10 bytes ahead
        if (view.byteLength - offset < 10) { return null; }

        // The 'ID3' identifier is expected at given offset
        if (!lib.isSeq(lib.seq.id3, view, offset)) { return null; }

        //
        var flagsOctet = view.getUint8(offset + 5);

        //
        var tag = {
            _section: { type: "ID3v2", offset: offset },
            header: {
                majorVersion: view.getUint8(offset + 3),
                minorRevision: view.getUint8(offset + 4),
                flagsOctet: flagsOctet,
                unsynchronisationFlag: (flagsOctet & 128) === 128,
                extendedHeaderFlag: (flagsOctet & 64) === 64,
                experimentalIndicatorFlag: (flagsOctet & 32) === 32,
                size: lib.unsynchsafe(view.getUint32(offset + 6))
            },
            frames: []
        };

        // The size as expressed in the header is the size of the complete tag after
        //  unsychronisation, including padding, excluding the header but not excluding the
        //  extended header (total tag size - 10)
        tag._section.byteLength = tag.header.size + 10;

        // Index of octet following tag's last octet: The tag spans [offset, tagEnd)
        //  (including the first 10 header octets)
        var tagEnd = offset + tag._section.byteLength;

        // TODO: Process extended header if present. The presence of an extended header will affect
        //  the offset. Currently, it is asummed that no extended header is present so the offset
        //  is fixed at 10 octets
        // if (tag.header.extendedHeaderFlag) { /* TODO */ }

        // Go on to read individual frames but only if the tag version is v2.3. This is the only
        //  version currently supported
        if (tag.header.majorVersion !== 3) { return tag; }

        // To store frames as they're discovered while paring the tag
        var frame;

        // Move offset past the end of the tag header to start reading tag frames
        offset += 10;
        while (offset < tagEnd) {
            // Locating a frame with a zeroed out id indicates that all valid frames have already
            //  been parsed. It's all dead space hereon so practically we're done
            if (view.getUint32(offset) === 0) { break; }

            frame = mp3Id3v2Parser.readId3v2TagFrame(view, offset);

            // Couldn't parse this frame so bail out
            if (!frame) { break; }

            tag.frames.push(frame);
            offset += frame.header.size + 10;
        }

        return tag;
    };
}));
