//     mp3-parser test suite: ID3v2.3 tag / CHAP frame / ISO-8859-1 encoded subframes.
//     Tests run against id3v2.3-chap-iso-8859-1.mp3
//     (maintained with [Kid3 ID3 Tagger](http://kid3.sourceforge.net/))

//     https://github.com/biril/mp3-parser
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013-2016 Alex Lambiris

/*jshint node:true */
/*global jasmine, describe, beforeEach, it, expect, Uint8Array, ArrayBuffer */
"use strict";

describe("ID3v2.3 reader run on CHAP frames with with ISO-8859-1 encoded subframes", function () {

    var util = require("util"),

        _ = require("underscore"),

        matchers = require(__dirname + "/../matchers.js"),

        mp3Parser = require(__dirname + "/../../main.js"),

        filePath = __dirname + "/../data/id3v2.3-chap-iso-8859-1.mp3",

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

        // Expect that `numOfFrames` of `id` were captured. Returns an array of relevant
        //  captured frames - unless the `numOfFrames` expectation fails
        expectCapturedFrames = function (id, numOfFrames) {
            var capturedFrames = getCapturedFrames(id);
            expect(capturedFrames.length).toBe(numOfFrames);
            return capturedFrames;
        },

        // [ID3v2 CHAP frames](http://id3.org/id3v2.3.0#Declared_ID3v2_frames) along with their
        //  'friendly names' as defined in the spec and, in certain cases, an `expected` hash which
        //  defines values to test against
        id3v2TagFrames = {
            CHAP: {
                name: "Chapter",
                expected: {
                    withoutFrames: {
                        id: "EmptyChapter",
                        startTime: 0,
                        endTime: 1000,
                        startOffset: 0,
                        endOffset: 65535,
                        frames: []
                    },
                    withFrames: {
                        id: "FullChapter",
                        startTime: 1000,
                        endTime: 2000,
                        startOffset: 65535,
                        endOffset: 4294967295,
                        frames: [{
                            header: {
                                id: "TIT2",
                                size: 6,
                                flagsOctet1: 0,
                                flagsOctet2: 0
                            },
                            name: "Title/songname/content description",
                            content: { encoding: 0, value: "Title" }
                        }, {
                            header: {
                                id: "COMM",
                                size: 19,
                                flagsOctet1: 0,
                                flagsOctet2: 0
                            },
                            name: "Comments",
                            content: {
                                encoding: 0,
                                language: "eng",
                                description: "Comment",
                                text: "Comment"
                            }
                        }]
                    }
                }
            }
        };

    beforeEach(function () { jasmine.addMatchers(matchers); });

    it("should read CHAP: Chapters frame", function () {
        var capturedFrames = expectCapturedFrames("CHAP", 2),

            // Get expected and actual chapter frames, for the case of an empty chapter frame
            expectedEmptyChapter = id3v2TagFrames.CHAP.expected.withoutFrames,
            emptyChapter,
            framesWithoutNestedFrames = _.filter(capturedFrames, function(frame) {
                return frame.content.id === expectedEmptyChapter.id;
            }),

            // Get expected and actual chapter frames, for the case of an empty chapter frame
            expectedChapterWithFrames = id3v2TagFrames.CHAP.expected.withFrames,
            chapterWithFrames,
            framesWithNestedFrames = _.filter(capturedFrames, function(frame) {
                return frame.content.id === expectedChapterWithFrames.id;
            }),
            chapterSubFrames,
            titleFrame,
            titleFrames,
            commentFrame,
            commentFrames;

        expect(framesWithoutNestedFrames.length).toBe(1);
        emptyChapter = framesWithoutNestedFrames[0];
        expect(emptyChapter.content.startTime).toBe(expectedEmptyChapter.startTime);
        expect(emptyChapter.content.endTime).toBe(expectedEmptyChapter.endTime);
        expect(emptyChapter.content.startOffset).toBe(expectedEmptyChapter.startOffset);
        expect(emptyChapter.content.endOffset).toBe(expectedEmptyChapter.endOffset);
        expect(emptyChapter.content.frames.length).toBe(expectedEmptyChapter.frames.length);

        expect(framesWithNestedFrames.length).toBe(1);
        chapterWithFrames = framesWithNestedFrames[0];
        expect(chapterWithFrames.content.startTime).toBe(expectedChapterWithFrames.startTime);
        expect(chapterWithFrames.content.endTime).toBe(expectedChapterWithFrames.endTime);
        expect(chapterWithFrames.content.startOffset).toBe(expectedChapterWithFrames.startOffset);
        expect(chapterWithFrames.content.endOffset).toBe(expectedChapterWithFrames.endOffset);
        chapterSubFrames = chapterWithFrames.content.frames;
        expect(chapterSubFrames.length).toBe(expectedChapterWithFrames.frames.length);
        titleFrames = chapterSubFrames.filter(function(frame) {
            return frame.header.id === "TIT2";
        });
        expect(titleFrames.length).toBe(1);
        titleFrame = titleFrames[0];
        expect(titleFrame.content.name).toBe(expectedChapterWithFrames.frames[0].content.name);
        commentFrames = chapterWithFrames.content.frames.filter(function(frame) {
            return frame.header.id === "COMM";
        });
        expect(commentFrames.length).toBe(1);
        commentFrame = commentFrames[0];
        expect(commentFrame.content.name).toBe(expectedChapterWithFrames.frames[1].content.name);
    });
});
