/*jshint node:true */

"use strict";

var _ = require("underscore"),

    // Helper to dump the contents of Array or Dataview
    dumpCollection = function (collection, n) {
        var dump = [],
            i = 0,
            l = _.isArray(collection) ? collection.length : collection.byteLength,
            getCollectionValue = _.isArray(collection) ?
                function (i) { return collection[i]; } :
                function (i) { return collection.getUint8(i); };

        if ((n || (n = 3)) >= l / 2) { n = l + 1; }

        while (true) {
            if (i === l) { break; }

            dump.push(getCollectionValue(i++));

            if (i === n) {
                dump.push("...");
                i = l - n;
            }
        }

        return l + ":[" + dump.join(", ") + "]";
    };

var asDataViewToEqualMatcher = function (util) {
    var compare = function (actual, expected) {
        var getExpectedValue = _.isArray(expected) ?
                function (i) { return expected[i]; } :
                function (i) { return expected.getUint8(i);
            },
            getExpectedLength = _.isArray(expected) ?
                function () { return expected.length; } :
                function () { return expected.byteLength;
            },
            buildFailMessage = function (expected, actual, index) {
                return "Expected " + dumpCollection(actual) + " to be a DataView with elements " +
                    dumpCollection(expected) + ". (Expected " + getExpectedValue(index) +
                    " at index " + index + ", got " + actual.getUint8(index) + ")";
            },
            i;

        if (actual.byteLength !== getExpectedLength()) {
            return {pass: false, message: "Expected " + dumpCollection(this.actual) +
                    " to be a DataView of length " + getExpectedLength()};
        }

        for (i = 0; i < actual.byteLength; ++i) {
            if (actual.getUint8(i) !== getExpectedValue(i)) {
                return {pass: false, message: buildFailMessage(expected, this.actual, i)};
            }
        }

        return {pass: true};
    };

    return {compare: compare};
};

var matchers = {asDataViewToEqual: asDataViewToEqualMatcher};

module.exports = matchers;
