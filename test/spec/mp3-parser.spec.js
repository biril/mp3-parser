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

describe("mp3 parser", () => {
    var mp3Parser = require(__dirname + "/../../main.js");

    it(`should be exported, with expected API ${methodNames.join(", ")}`, () => {
        expect(mp3Parser).toBeObject();
        _.each(methodNames, methodName => expect(mp3Parser).toHaveMethod(methodName));
    });
});
