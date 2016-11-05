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

describe("ID3v2.3 parser", () => {

    const parser = require(`${__dirname}/../../lib/id3v2.js`);

    it(`should be exported, with expected API ${methodNames.join(", ")}`, () => {
        expect(parser).toBeObject();
        _.each(methodNames, methodName => expect(parser).toHaveMethod(methodName));
    });

});
