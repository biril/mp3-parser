//     mp3-parser test suite: ID3v2.3 tag / ISO-8859-1 encoded frames. Tests run against
//     id3v2.3-iso-8859-1.mp3 (maintained with [Kid3 ID3 Tagger](http://kid3.sourceforge.net/))

//     https://github.com/biril/mp3-parser
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013 Alex Lambiris

/*jshint node:true */
/*global describe, beforeEach, it, expect, Uint8Array, ArrayBuffer */
"use strict";

describe("ID3v2.3 reader run on ID3v2.3 tag with ISO-8859-1 encoded frames", function () {

    var util = require("util"),

        _ = require("underscore"),

        matchers = require(__dirname + "/../matchers.js"),

        mp3Parser = require(__dirname + "/../../mp3-parser.js"),

        filePath = __dirname + "/../id3v2.3-iso-8859-1.mp3",

        // Read the file into a DataView-wrapped ArrayBuffer
        buffer = (function (b) {
            if (!b) {
                util.error("Oops: Failed to load " + filePath);
                process.exit(1);
            }

            var i = 0, bufferLength = b.length,
                uint8Array = new Uint8Array(new ArrayBuffer(bufferLength));

            for (; i < bufferLength; ++i) { uint8Array[i] = b[i]; }

            return new DataView(uint8Array.buffer);
        }(require("fs").readFileSync(filePath))),

        // Read the ID3v2 tag. This is done once, here, and all tests run on `capturedId3v2Tag`
        capturedId3v2Tag = mp3Parser.readId3v2Tag(buffer),

        // Helper to get (an array of) all captured ID3v2 tag frames of given `id`
        getCapturedFrames = function (id) {
            return _(capturedId3v2Tag.frames).filter(function (frame) {
                return frame.header.id === id;
            });
        },

        // All [ID3v2 tag frames](http://id3.org/id3v2.3.0#Declared_ID3v2_frames) along with their
        //  'friendly names' as defined in the spec and, in certain cases, an `expected` hash which
        //  defines values to test against
        id3v2TagFrames = {
            AENC: {
                name: "Audio encryption",
                expected: { } },
            APIC: {
                name: "Attached picture",
                expected: { } },

            COMM: {
                name: "Comments",
                expected: {
                    withoutLang: {
                        description: "commentWithoutLang",
                        text: "This comment has an empty language field",
                        language: ""
                    },
                    withLang: {
                        description: "commentWithLang",
                        text: "This comment has a language field of value 'eng'",
                        language: "eng"
                    },
                    withHalfLang: {
                        description: "commentWithHalfLang",
                        text: "This comment has a language field of value 'en' (inadequate length)",
                        language: "en"
                    }
                }
            },

            COMR: {
                name: "Commercial frame",
                expected: { } },
            ENCR: {
                name: "Encryption method registration",
                expected: { } },
            EQUA: {
                name: "Equalization",
                expected: { } },
            ETCO: {
                name: "Event timing codes",
                expected: { } },
            GEOB: {
                name: "General encapsulated object",
                expected: { } },
            GRID: {
                name: "Group identification registration",
                expected: { } },
            IPLS: {
                name: "Involved people list",
                expected: { } },
            LINK: {
                name: "Linked information",
                expected: { } },
            MCDI: {
                name: "Music CD identifier",
                expected: { } },
            MLLT: {
                name: "MPEG location lookup table",
                expected: { } },
            OWNE: {
                name: "Ownership frame",
                expected: { } },
            PRIV: {
                name: "Private frame",
                expected: { } },
            PCNT: {
                name: "Play counter",
                expected: { } },
            POPM: {
                name: "Popularimeter",
                expected: { } },
            POSS: {
                name: "Position synchronisation frame",
                expected: { } },
            RBUF: {
                name: "Recommended buffer size",
                expected: { } },
            RVAD: {
                name: "Relative volume adjustment",
                expected: { } },
            RVRB: {
                name: "Reverb",
                expected: { } },
            SYLT: {
                name: "Synchronized lyric/text",
                expected: { } },
            SYTC: {
                name: "Synchronized tempo codes",
                expected: { } },

            // Text information frames. For some of these (which are commented below), the standard
            //  contains specific formatting instructions. They are however T-frames and as such
            //  their content is of variable length and encoding. As a result the formatting
            //  constraints cannot be practically enforced. So we test all of them as if they could
            //  contain _any_ text in _any_ encoding. This is one of the standard's (many) weird
            //  points - why would TSIZ which is supposed to contain the "size of file in bytes,
            //  excluding ID3v2 tag" be encoded as a T-frame?? ..
            TALB: { name: "Album/Movie/Show title" },
            TBPM: { name: "BPM (beats per minute)"}, // Integer represented as a numeric string
            TCOM: { name: "Composer" },
            TCON: { name: "Content type" },
            TCOP: { name: "Copyright message" }, // Begins with a year followed by space character
            TDAT: { name: "Date" }, // Numeric string in DDMM format
            TDLY: { name: "Playlist delay" }, // Numeric string - number of ms
            TENC: { name: "Encoded by" },
            TEXT: { name: "Lyricist/Text writer" },
            TFLT: { name: "File type" },
            TIME: { name: "Time" }, // Numeric string in HHMM format
            TIT1: { name: "Content group description" },
            TIT2: { name: "Title/songname/content description" },
            TIT3: { name: "Subtitle/Description refinement" },
            TKEY: { name: "Initial key" }, // 3 chars max. A/Ab/A#/Abm/A#m
            TLAN: { name: "Language(s)" }, // Multiple ISO-639-2 lang codes
            TLEN: { name: "Length" }, // Numeric string - number of ms
            TMED: { name: "Media type" },
            TOAL: { name: "Original album/movie/show title" },
            TOFN: { name: "Original filename" },
            TOLY: { name: "Original lyricist(s)/text writer(s)" },
            TOPE: { name: "Original artist(s)/performer(s)" },
            TORY: { name: "Original release year" }, // Numeric string in YYYY format
            TOWN: { name: "File owner/licensee" },
            TPE1: { name: "Lead performer(s)/Soloist(s)" },
            TPE2: { name: "Band/orchestra/accompaniment" },
            TPE3: { name: "Conductor/performer refinement" },
            TPE4: { name: "Interpreted, remixed, or otherwise modified by" },
            TPOS: { name: "Part of a set" }, // Numeric string, with optional with '/' (e.g. 01/02)
            TPUB: { name: "Publisher" },
            TRCK: { name: "Track number/Position in set" }, // Numeric string, with optional '/'
            TRDA: { name: "Recording dates" },
            TRSN: { name: "Internet radio station name" },
            TRSO: { name: "Internet radio station owner" },
            TSIZ: { name: "Size" }, // Numeric string - Size of file in bytes, excluding ID3v2 tag
            TSRC: { name: "ISRC (international standard recording code)" }, // 12 chars
            TSSE: { name: "Software/Hardware and settings used for encoding" },
            TYER: { name: "Year" }, // Numeric string in YYYY format

            TXXX: { name: "User defined text information frame" },

            UFID: {
                name: "Unique file identifier",
                expected: {
                    shortish: {
                        ownerIdentifier: "http://ufid/owner/for32ByteIdentifier",
                        identifier: _.range(32)
                    },
                    longish: {
                        ownerIdentifier: "http://ufid/owner/for64ByteIdentifier",
                        identifier: _.range(64)
                    }
                } },
            USER: {
                name: "Terms of use",
                expected: { } },
            USLT: {
                name: "Unsychronized lyric/text transcription",
                expected: { } },

            WCOM: { name: "Commercial information" },
            WCOP: { name: "Copyright/Legal information" },
            WOAF: { name: "Official audio file webpage" },
            WOAR: { name: "Official artist/performer webpage" },
            WOAS: { name: "Official audio source webpage" },
            WORS: { name: "Official internet radio station homepage" },
            WPAY: { name: "Payment" },
            WPUB: { name: "Publishers official webpage" },

            WXXX: { name: "User defined URL link frame" }
        };

    beforeEach(function () { this.addMatchers(matchers); });

    it("should read UFID: Unique file identifier (multiple)", function () {
        var capturedFrames = getCapturedFrames("UFID"),

            // Get expected and actual frames for the case of a short UFID
            expectedShortFrame = id3v2TagFrames["UFID"].expected.shortish,
            shortFrame,
            shortFrames = _(capturedFrames).filter(function (frame) {
                return frame.content.ownerIdentifier === expectedShortFrame.ownerIdentifier;
            }),

            // Get expected and actual frames for the case of a long UFID
            expectedLongFrame = id3v2TagFrames["UFID"].expected.longish,
            longFrame,
            longFrames = _(capturedFrames).filter(function (frame) {
                return frame.content.ownerIdentifier === expectedLongFrame.ownerIdentifier;
            });

        expect(shortFrames.length).toBe(1);
        shortFrame = shortFrames[0];
        expect(shortFrame.content.ownerIdentifier).toBe(expectedShortFrame.ownerIdentifier);
        expect(shortFrame.content.identifier).asDataViewToEqual(expectedShortFrame.identifier);

        expect(longFrames.length).toBe(1);
        longFrame = longFrames[0];
        expect(longFrame.content.ownerIdentifier).toBe(expectedLongFrame.ownerIdentifier);
        expect(longFrame.content.identifier).asDataViewToEqual(expectedLongFrame.identifier);

        // TODO: Check (and document) edge cases: What happens for frames of length 0 or >64
        //  (not allowed by the standard)
    });

    it("should read COMM: Comments frame", function () {
        var capturedFrames = getCapturedFrames("COMM"),

            // Get expected and actual comment frames, for the case of no lang-field
            expectedFrameWithoutLang = id3v2TagFrames["COMM"].expected.withoutLang,
            frameWithoutLang = null,
            framesWithoutLang = _(capturedFrames).filter(function (frame) {
                return frame.content.description === expectedFrameWithoutLang.description;
            }),

            // Get expected and actual comment frames, for the case of lang-field present
            expectedFrameWithLang = id3v2TagFrames["COMM"].expected.withLang,
            frameWithLang = null,
            framesWithLang = _(capturedFrames).filter(function (frame) {
                return frame.content.description === expectedFrameWithLang.description;
            }),

            // Get expected and actual comment frames, for the case of lang-field of inadequate
            //  length present
            expectedFrameWithHalfLang = id3v2TagFrames["COMM"].expected.withHalfLang,
            frameWithHalfLang = null,
            framesWithHalfLang = _(capturedFrames).filter(function (frame) {
                return frame.content.description === expectedFrameWithHalfLang.description;
            });

        expect(framesWithoutLang.length).toBe(1);
        frameWithoutLang = framesWithoutLang[0];
        expect(frameWithoutLang.content.language).toBe(expectedFrameWithoutLang.language);
        expect(frameWithoutLang.content.text).toBe(expectedFrameWithoutLang.text);

        expect(framesWithLang.length).toBe(1);
        frameWithLang = framesWithLang[0];
        expect(frameWithLang.content.language).toBe(expectedFrameWithLang.language);
        expect(frameWithLang.content.text).toBe(expectedFrameWithLang.text);

        expect(framesWithHalfLang.length).toBe(1);
        frameWithHalfLang = framesWithHalfLang[0];
        expect(frameWithHalfLang.content.language).toBe(expectedFrameWithHalfLang.language);
        expect(frameWithHalfLang.content.text).toBe(expectedFrameWithHalfLang.text);
    });

    // Pick text-information frames only, preprocess them and test each one. For frames that
    //  don't provide an `expected` hash, their value is checked against '{friendly name}',
    //  (where their 'friendly name' is as defined in the ID3v2 spec). This testing-policy wasn't
    //  initially used for _all of them_ as some require their value to follow certain formatting
    //  rules according to the spec. In these cases the `expected` hash used to contain such a
    //  conforming `value`. _However_ the current implementation uses this testing policy for _all_
    //  of them (see earlier comments regarding how no formatting can reasonably be enforced on
    //  T-frames)
    _.chain(id3v2TagFrames)
        .map(function (frame, id) {
            return { id: id, name: frame.name, expected: frame.expected };
        }).filter(function (frame) {
            return frame.id.charAt(0) === "T" && frame.id !== "TXXX";
        }).each(function (frame) {
            it("should read " + frame.id + ": " + frame.name, function () {
                var capturedFrames = getCapturedFrames(frame.id),
                    f = null;

                expect(capturedFrames.length).toBe(1);
                f = capturedFrames[0];

                expect(f.content.encoding).toBe(0);
                expect(f.content.value).toBe(frame.expected ? frame.expected.value : frame.name);
            });
        });

    //
    it("should read TXXX: User defined text information frame", function () {
        var capturedFrames = getCapturedFrames("TXXX"),
            f = null;

        expect(capturedFrames.length).toBe(1);
        f = capturedFrames[0];

        expect(f.content.encoding).toBe(0);
        expect(f.content.description).toBe(id3v2TagFrames.TXXX.name + " description");
        expect(f.content.value).toBe(id3v2TagFrames.TXXX.name);
    });

    // Pick URL-link frames only, preprocess them and test each one. Frame values are checked
    //  against each frame's 'friendly name', as defined in the ID3v2 spec.
    _.chain(id3v2TagFrames)
        .map(function (frame, id) {
            return { id: id, name: frame.name };
        }).filter(function (frame) {
            return frame.id.charAt(0) === "W" && frame.id !== "WXXX";
        }).each(function (frame) {
            it("should read " + frame.id + ": " + frame.name, function () {
                var capturedFrames = getCapturedFrames(frame.id);

                expect(capturedFrames.length).toBe(1);
                expect(capturedFrames[0].content.value).toBe(frame.name);
            });
        });

    //
    it("should read WXXX: User defined URL link frame", function () {
        var capturedFrames = getCapturedFrames("WXXX"),
            f = null;

        expect(capturedFrames.length).toBe(1);
        f = capturedFrames[0];

        expect(f.content.encoding).toBe(0);
        expect(f.content.description).toBe(id3v2TagFrames.WXXX.name + " description");
        expect(f.content.value).toBe(id3v2TagFrames.WXXX.name);
    });

});