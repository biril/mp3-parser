//     mp3-parser test suite: lib.

//     https://github.com/biril/mp3-parser
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013-2016 Alex Lambiris

/* jshint node:true, esversion:6 */
/* global describe, it, expect  */
"use strict";

const util = require("../util");

// The module under test
const lib = require("../../lib/lib");

// Helper to load MPEG test files
var dataViewFromTestFilePath = testFilePath =>
    util.dataViewFromFilePath(`${__dirname}/../../node_modules/audio-test-data/${testFilePath}`);

describe("lib", () => {

    // For ASCII - ISO/IEC 8859-1, see [ASCII code table](http://www.asciitable.com/)
    // For UCS-2 - ISO/IEC 10646-1, see [UCS-2 code table](http://www.columbia.edu/kermit/ucs2.html)
    describe("wordSeqFromStr", () => {
        it("should convert empty string to empty array", () => {
            const seq = lib.wordSeqFromStr("");
            expect(seq).toBeEmptyArray();
        });

        it("should convert given ISO/IEC 8859-1 string to array of char codes", () => {
            const str = "This is a test.";
            const strOctets = [
                84, 104, 105, 115, 32,  // This_
                105, 115, 32,           // is_
                97, 32,                 // a_
                116, 101, 115, 116, 46  // test.
            ];

            const seq = lib.wordSeqFromStr(str);

            expect(seq).toEqual(strOctets);
        });

        it("should convert given ISO/IEC 10646-1, UCS-2 string to array of char codes", () => {
            const str = "Αυτό είναι ένα test.";
            const strOctets = [
                913, 965, 964, 972, 32,         // Αυτό_
                949, 943, 957, 945, 953, 32,    // είναι_
                941, 957, 945, 32,              // ένα_
                116, 101, 115, 116, 46          // test.
            ];

            const seq = lib.wordSeqFromStr(str);

            expect(seq).toEqual(strOctets);
        });
    });

    describe("readFrame", () => {
        const layerDescriptions = {2: 'Layer II', 3: 'Layer III' };
        const mpegAudioVersions = {1: 'MPEG Version 1 (ISO/IEC 11172-3)', 2: 'MPEG Version 2 (ISO/IEC 13818-3)'};

        // Run typical expectations for a frame of given `layer` & `version`
        const expectFrameLV = (frame, layer, version) => {
            expect(frame._section.type).toEqual("frame");
            expect(frame._section.offset).toEqual(0);

            expect(frame.header._section.type).toEqual("frameHeader");
            expect(frame.header.layerDescription).toEqual(layerDescriptions[layer]);
            expect(frame.header.mpegAudioVersion).toEqual(mpegAudioVersions[version]);
        };

        it("should read frame of MPEG layer2 v1 32KHz 32kbps mono file", () => {
            const fileView = dataViewFromTestFilePath("layer2/v1/32000_032_m.mp2");

            const frame = lib.readFrame(fileView);

            expectFrameLV(frame, 2, 1);
            expect(frame.header.bitrate).toEqual(32);
            expect(frame.header.samplingRate).toEqual(32000);
            expect(frame.header.channelMode).toEqual("Single channel (Mono)");
        });

        it("should read frame of MPEG layer2 v1 48KHz 320kbps stereo file", () => {
            const fileView = dataViewFromTestFilePath("layer2/v1/48000_320_s.mp2");

            const frame = lib.readFrame(fileView);

            expectFrameLV(frame, 2, 1);
            expect(frame.header.bitrate).toEqual(320);
            expect(frame.header.samplingRate).toEqual(48000);
            expect(frame.header.channelMode).toEqual("Stereo");
        });

        it("should read frame of MPEG layer2 v2 16KHz 32kbps mono file", () => {
            const fileView = dataViewFromTestFilePath("layer2/v2/16000_032_m.mp2");

            const frame = lib.readFrame(fileView);

            expectFrameLV(frame, 2, 2);
            expect(frame.header.bitrate).toEqual(32);
            expect(frame.header.samplingRate).toEqual(16000);
            expect(frame.header.channelMode).toEqual("Single channel (Mono)");
        });

        it("should read frame of MPEG layer2 v2 22.05Hz 160kbps stereo file", () => {
            const fileView = dataViewFromTestFilePath("layer2/v2/22050_160_s.mp2");

            const frame = lib.readFrame(fileView);

            expectFrameLV(frame, 2, 2);
            expect(frame.header.bitrate).toEqual(160);
            expect(frame.header.samplingRate).toEqual(22050);
            expect(frame.header.channelMode).toEqual("Stereo");
        });
    });
});
