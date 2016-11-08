/*jshint node:true, esversion:6 */

// Various test helpers

"use strict";

const fs = require('fs');
const _ = require("underscore");

//
const concat = function (/* ...arrays */) {
    return Array.prototype.concat.apply([], arguments);
};

// Get contents of file at given path, wrapped in a DataView instance. Will perform a blocking read
const dataViewFromFilePath = filePath => {
    var fileBuffer = fs.readFileSync(filePath);
    var fileBufferLength = fileBuffer.length;

    var uint8Array = new Uint8Array(new ArrayBuffer(fileBufferLength));
    for (var i = 0; i < fileBufferLength; ++i) { uint8Array[i] = fileBuffer[i]; }

    return new DataView(uint8Array.buffer);
};

//
const dataViewFromArray = (array, offset) => {
    const dataView = new DataView(new ArrayBuffer(offset + array.length));
    for (let i = array.length - 1; i >= 0; --i) {
        dataView.setUint8(offset + i, array[i]);
    }
    return dataView;
};

// Convert the given string `str` to an array of words (octet pairs). If all characters in the
//  given string are within the ISO/IEC 8859-1 subset then the returned array may safely be
//  interpreted as an array of values in the [0, 255] range, where each value requires a single
//  octet to be represented. Otherwise it should be interpreted as an array of values in the
//  [0, 65.535] range, where each value requires a word (octet pair) to be represented.
//
// Not meant to be used with UTF-16 strings that contain chars outside the BMP. See
//  [charCodeAt on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt)
const wordSeqFromStr = str => {
    const seq = [];
    for (let i = str.length - 1; i >= 0; --i) {
        seq[i] = str.charCodeAt(i);
    }
    return seq;
};

// Helper to split one dword (in this context, a 32bit value) into 4 octets
const octetsFromDword = dword => {
    const dwView = new DataView(new ArrayBuffer(4));
    dwView.setUint32(0, dword);
    return [dwView.getUint8(0), dwView.getUint8(1), dwView.getUint8(2), dwView.getUint8(3)];
};

// Given an id of a frame and the size of its contents, get the frame's header as sequence of octets
const buildFrameHeaderOctets = (frameId, frameContentSize) => {
    // The frame header is 10 octets long and laid out as `IIIISSSSFF`, where
    // * `IIII......`: Frame id (four characters)
    // * `....SSSS..`: Size (frame size excluding frame header = frame size - 10)
    // * `........FF`: Flags
    const frameIdOctets = wordSeqFromStr(frameId);
    const frameContentSizeOctets = octetsFromDword(frameContentSize);
    return concat(frameIdOctets, frameContentSizeOctets, [0, 0]);
};

//
const buildFrameContentOctets = content =>
    _.flatten(_.map(content, c => _.isString(c) ? wordSeqFromStr(c) : c));

//
const buildFrameOctets = (id, content) => {
    // All frames consist of a header followed by the actual data
    var frameContentOctets = buildFrameContentOctets(content);
    var frameHeaderOctets = buildFrameHeaderOctets(id, frameContentOctets.length);
    return concat(frameHeaderOctets, frameContentOctets);
};

// Given a frame descriptor `frameDescr` return the frame's octets wrapped in a DataView instance
//  The given frame descriptor should have properties
//  * id: The frame's id, e.g. "IPLS"
//  * content: The frame's content as an array of numbers and strings
//  * offset: The frame's offset within the returned view. This is useful in emulating a frame
//     that appear in some arbitrary position of the bitstream, rather than 0 which obviously
//     isn't the general case
const buildFrameView = frameDescr =>
    dataViewFromArray(buildFrameOctets(frameDescr.id, frameDescr.content), frameDescr.offset);

//
module.exports = { buildFrameView, dataViewFromFilePath };
