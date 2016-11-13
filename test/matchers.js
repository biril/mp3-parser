/*jshint node:true */

"use strict";

const _ = require("underscore");

const retPass = () => ({ pass: true });
const retFail = message => ({ pass: false, message });

// Helper to dump the contents of Array or Dataview
const dumpCollection = function (collection, n) {
    const length = _.isArray(collection) ? collection.length : collection.byteLength;
    const getVal = _.isArray(collection) ? x => collection[x] : x => collection.getUint8(x);

    if ((n || (n = 3)) >= length / 2) { n = length + 1; }

    let i = 0;
    const dump = [];
    while (true) {
        if (i === length) { break; }

        dump.push(getVal(i++));

        if (i === n) {
            dump.push("...");
            i = length - n;
        }
    }

    return length + ":[" + dump.join(", ") + "]";
};

// The custom matchers
const matchers = {};

// Expect the actual - which should be a DataView instance - to have the same elements as the
//  expected. Which may be given as a DataView instance or an array
matchers.asDataViewToEqual = util => {
    const compare = (actual, expected) => {
        // Do they have the same length?
        const expectedLength = expected[_.isArray(expected) ? 'length' : 'byteLength'];
        if (actual.byteLength !== expectedLength) {
            return retFail(`Expected ${dumpCollection(actual)} to be a DataView of length
                ${expectedLength}`);
        }

        // Do they have the same elements?
        const getExpectedValue = _.isArray(expected) ? i => expected[i] : i => expected.getUint8(i);
        for (let i = 0; i < actual.byteLength; ++i) {
            if (actual.getUint8(i) !== getExpectedValue(i)) {
                return retFail(`Expected ${dumpCollection(actual)} to be a DataView with elements
                    ${dumpCollection(expected)}. (Expected ${getExpectedValue(i)} at index ${i},
                    got ${actual.getUint8(i)})`);
            }
        }

        return retPass();
    };

    return { compare };
};

// Expect the actual to have expected length
matchers.toHaveLength = util => {
    const compare = (actual, expectedLength) => {
        if (actual.length !== expectedLength) {
            return retFail(`Expected ${dumpCollection(actual)} to have length ${expectedLength}`);
        }

        return retPass();
    };

    return { compare };
};

module.exports = matchers;
