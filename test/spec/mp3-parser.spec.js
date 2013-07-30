/*jshint node:true */
/*global describe, beforeEach, it, expect  */
"use strict";

describe("mp3 parser", function () {

    var mp3Parser = require(__dirname + "/../../mp3-parser.js");

    beforeEach(function () { });

    // Preliminary sanity tests

    it("should be exported", function() {
        expect(mp3Parser).toBeDefined();
    });

    it("should report its version", function() {
        expect(mp3Parser.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

});