//     mp3-parser test suite: ID3v2 parser basics & sanity checks.

//     https://github.com/biril/mp3-parser
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2016 Alex Lambiris

/* jshint node:true, esversion:6 */
/* global describe, it, expect  */
"use strict";

const _ = require("underscore");

const methodNames = [
    "readId3v2TagFrame",
    "readId3v2Tag"
];

// The module under test
const parser = require("../../lib/id3v2");

describe("ID3v2.3 parser", () => {
    it(`should be exported, with expected API ${methodNames.join(", ")}`, () => {
        expect(parser).toBeObject();
        _.each(methodNames, methodName => expect(parser).toHaveMethod(methodName));
    });
});
