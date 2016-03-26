/*jshint node:true */

"use strict";

var _ = require("underscore"),

    // Dump Array or Dataview
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

module.exports = {

    // Expect actual to be a DataView with given elements. `expected` can be a DataView or Array
    asDataViewToEqual: function (expected) {
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

        if (this.actual.byteLength !== getExpectedLength()) {
            this.message = function () {
                return "Expected " + dumpCollection(this.actual) + " to be a DataView of length " +
                    getExpectedLength();
            };
            return false;
        }

        for (i = 0; i < this.actual.byteLength; ++i) {
            if (this.actual.getUint8(i) !== getExpectedValue(i)) {
                this.message = buildFailMessage(expected, this.actual, i);
                return false;
            }
        }

        return true;
    }
};
