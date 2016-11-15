//     mp3-parser test suite: ID3v2 IPLS frame.

//     https://github.com/biril/mp3-parser
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2016 Alex Lambiris

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
// * People list strings: a series of strings, e.g. string 00 (00) string 00 (00) ...

/* jshint node:true, esversion:6 */
/* global describe, it, expect  */
"use strict";

const util = require("../util");

// Make-believe offset of frame bytes, within containing ID3v2 tag
const frameOffset = 7;

// The module under test
const parser = require("../../lib/id3v2");

describe("ID3v2.3 parser, reading IPLS frame", () => {

    // TODO: Add header tests before content tests

    it("should read IPLS frame with content: 0first0second0", () => {
        const frameView = util.buildFrameView({
            id: "IPLS",
            content: [0, "first", 0, "second", 0],
            offset: frameOffset
        });

        const frame = parser.readId3v2TagFrame(frameView, frameOffset, frameView.byteLength);

        expect(frame.content.encoding).toBe(0);
        expect(frame.content.values[0]).toBe("first");
        expect(frame.content.values[1]).toBe("second");
    });

    it("should read IPLS frame with content: 0first0second", () => {
        const frameView = util.buildFrameView({
            id: "IPLS",
            content: [0, "first", 0, "second"],
            offset: frameOffset
        });

        const frame = parser.readId3v2TagFrame(frameView, frameOffset, frameView.byteLength);

        expect(frame.content.encoding).toBe(0);
        expect(frame.content.values[0]).toBe("first");
        expect(frame.content.values[1]).toBe("second");
    });

    it("should read IPLS frame with content: 0first0second0third0", () => {
        const frameView = util.buildFrameView({
            id: "IPLS",
            content: [0, "first", 0, "second", 0, "third", 0],
            offset: frameOffset
        });

        const frame = parser.readId3v2TagFrame(frameView, frameOffset, frameView.byteLength);

        expect(frame.content.encoding).toBe(0);
        expect(frame.content.values[0]).toBe("first");
        expect(frame.content.values[1]).toBe("second");
        expect(frame.content.values[2]).toBe("third");
    });

    it("should read IPLS frame with content: 0first0second0third", () => {
        const frameView = util.buildFrameView({
            id: "IPLS",
            content: [0, "first", 0, "second", 0, "third"],
            offset: frameOffset
        });

        const frame = parser.readId3v2TagFrame(frameView, frameOffset, frameView.byteLength);

        expect(frame.content.encoding).toBe(0);
        expect(frame.content.values[0]).toBe("first");
        expect(frame.content.values[1]).toBe("second");
        expect(frame.content.values[2]).toBe("third");
    });
});
