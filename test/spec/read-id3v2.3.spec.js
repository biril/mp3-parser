/*jshint node:true */
/*global describe, beforeEach, it, expect, Uint8Array, ArrayBuffer */
"use strict";

describe("ID3v2.3 reader", function () {

    var util = require("util"),

        _ = require("underscore"),

        mp3Parser = require(__dirname + "/../../mp3-parser.js"),

        filePath = __dirname + "/../id3v2.3-iso-8859-1.mp3",

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

        capturedId3v2Tag = mp3Parser.readId3v2Tag(buffer),

        getCapturedFrames = function (id) {
            return _(capturedId3v2Tag.frames).filter(function (frame) {
                return frame.header.id === id;
            });
        },

        //
        id3v2TagFrames = {
            AENC: {
                name: "Audio encryption",
                expected: { } },
            APIC: {
                name: "Attached picture",
                expected: { } },
            COMM: {
                name: "Comments",
                expected: { } },
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

            TALB: { name: "Album/Movie/Show title" },
            TBPM: { name: "BPM (beats per minute)", expected: { value: "303" } }, // Integer represented as a numeric string.
            TCOM: { name: "Composer" },
            TCON: { name: "Content type" },
            TCOP: { name: "Copyright message", expected: { value: "2013 whatever" } }, // Begins with a year followed by space character
            TDAT: { name: "Date", expected: { value: "0101" } }, // Numeric string in DDMM format
            TDLY: { name: "Playlist delay", expected: { value: "10" } }, // Numeric string - number of ms
            TENC: { name: "Encoded by" },
            TEXT: { name: "Lyricist/Text writer" },
            TFLT: { name: "File type" },
            TIME: { name: "Time", expected: { value: "1802" } }, // Numeric string in HHMM format
            TIT1: { name: "Content group description" },
            TIT2: { name: "Title/songname/content description" },
            TIT3: { name: "Subtitle/Description refinement" },
            // TKEY: {
            //     name: "Initial key",
            //     expected: { } },
            // TLAN: {
            //     name: "Language(s)",
            //     expected: { } },
            // TLEN: {
            //     name: "Length",
            //     expected: { } },
            // TMED: {
            //     name: "Media type",
            //     expected: { } },
            // TOAL: {
            //     name: "Original album/movie/show title",
            //     expected: { } },
            // TOFN: {
            //     name: "Original filename",
            //     expected: { } },
            // TOLY: {
            //     name: "Original lyricist(s)/text writer(s)",
            //     expected: { } },
            // TOPE: {
            //     name: "Original artist(s)/performer(s)",
            //     expected: { } },
            // TORY: {
            //     name: "Original release year",
            //     expected: { } },
            // TOWN: {
            //     name: "File owner/licensee",
            //     expected: { } },
            TPE1: { name: "Lead performer(s)/Soloist(s)" },
            // TPE2: {
            //     name: "Band/orchestra/accompaniment",
            //     expected: { } },
            // TPE3: {
            //     name: "Conductor/performer refinement",
            //     expected: { } },
            // TPE4: {
            //     name: "Interpreted, remixed, or otherwise modified by",
            //     expected: { } },
            // TPOS: {
            //     name: "Part of a set",
            //     expected: { } },
            // TPUB: {
            //     name: "Publisher",
            //     expected: { } },
            // TRCK: {
            //     name: "Track number/Position in set",
            //     expected: { } },
            // TRDA: {
            //     name: "Recording dates",
            //     expected: { } },
            // TRSN: {
            //     name: "Internet radio station name",
            //     expected: { } },
            // TRSO: {
            //     name: "Internet radio station owner",
            //     expected: { } },
            // TSIZ: {
            //     name: "Size",
            //     expected: { } },
            // TSRC: {
            //     name: "ISRC (international standard recording code)",
            //     expected: { } },
            // TSSE: {
            //     name: "Software/Hardware and settings used for encoding",
            //     expected: { } },
            TYER: { name: "Year", expected: { value: "2013" } }, // Should be a numeric string in YYYY format

            // TXXX: {
            //    name: "User defined text information frame",
            //    expected: { } },
            UFID: {
                name: "Unique file identifier",
                expected: { } },
            USER: {
                name: "Terms of use",
                expected: { } },
            USLT: {
                name: "Unsychronized lyric/text transcription",
                expected: { } },
            WCOM: {
                name: "Commercial information",
                expected: { } },
            WCOP: {
                name: "Copyright/Legal information",
                expected: { } },
            WOAF: {
                name: "Official audio file webpage",
                expected: { } },
            WOAR: {
                name: "Official artist/performer webpage",
                expected: { } },
            WOAS: {
                name: "Official audio source webpage",
                expected: { } },
            WORS: {
                name: "Official internet radio station homepage",
                expected: { } },
            WPAY: {
                name: "Payment",
                expected: { } },
            WPUB: {
                name: "Publishers official webpage",
                expected: { } },
            WXXX: {
                name: "User defined URL link frame",
                expected: { } }
        };

    beforeEach(function () { });

    describe("when reading text-information frames", function () {
        // Pick text-information frames only, preprocess them and test each one. Frames that don't
        //  provide an `expected` hash are expected to be set to their 'friendly name' (as defined
        //  in the ID3v2 spec). This testing-policy can't be used for _all of them_ as some require
        //  their value to follow certain formatting rules.
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
                    expect(f.content.text).toBe(frame.expected ? frame.expected.value : frame.name);
                });
            });
    });

});