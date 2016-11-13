//     mp3-parser test suite: lib.

//     https://github.com/biril/mp3-parser
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013-2016 Alex Lambiris

/* jshint node:true, esversion:6 */
/* global describe, it, expect  */
"use strict";

// The module under test
const lib = require("../../lib/lib");

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
});
