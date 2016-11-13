//     mp3-parser test suite: Preliminary sanity checks & misc.

//     https://github.com/biril/mp3-parser
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013-2016 Alex Lambiris

/* jshint node:true, esversion:6 */
/* global describe, it, expect  */
"use strict";

const _ = require("underscore");

const methodNames = [
    "readFrameHeader",
    "readFrame",
    "readLastFrame",
    "readId3v2Tag",
    "readXingTag",
    "readTags"
];

// The module under test
const parser = require("../../main");

describe("mp3 parser", () => {
    it(`should be exported, with expected API ${methodNames.join(", ")}`, () => {
        expect(parser).toBeObject();
        _.each(methodNames, methodName => expect(parser).toHaveMethod(methodName));
    });
});
