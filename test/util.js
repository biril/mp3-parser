/*jshint node:true, esversion:6 */

// Various test helpers

"use strict";

const fs = require('fs');
const _ = require("underscore");

// Concat given arrays into new one. Just a shorthand
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

// Get a DataView instance containing elements of given array. Array elements of index < `offset`
//  will be ignored
const dataViewFromArray = (array, offset) => {
    const dataView = new DataView(new ArrayBuffer(offset + array.length));
    for (let i = array.length - 1; i >= 0; --i) {
        dataView.setUint8(offset + i, array[i]);
    }
    return dataView;
};

// Get an array of 4 octets by splitting given dword (a 32bit value, in this context)
const octetsFromDword = (dword, endianness) => {
    const dwView = new DataView(new ArrayBuffer(4));
    dwView.setUint32(0, dword, endianness === 'le'); // BE by default, may be forced to LE
    return [dwView.getUint8(0), dwView.getUint8(1), dwView.getUint8(2), dwView.getUint8(3)];
};

// Get an array of 2 octets by splitting given word (a 16bit value, in this context)
const octetsFromWord = (word, endianness) => {
    const wView = new DataView(new ArrayBuffer(2));
    wView.setUint16(0, word, endianness === 'le'); // BE by default, may be forced to LE
    return [wView.getUint8(0), wView.getUint8(1)];
};

// Convert the given array of words (octet pairs) into an array of octets
const octetsFromWordSeq = (wordSeq, endianness) =>
    concat.apply(null, _.map(wordSeq, word => octetsFromWord(word, endianness)));

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

// Convert the given string `str` to an array of octets. The given string's encoding, `strEncoding`
//  may be set to 'iso' for ISO-8859-1 or to 'ucs' for UCS-2
//
// Not meant to be used with UTF-16 strings that contain chars outside the BMP. See
//  [charCodeAt on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt)
const octetsFromStr = (str, strEncoding, endianness) => {
    const wordSeq = wordSeqFromStr(str);
    switch (strEncoding) {
        case 'iso': return wordSeq; // Already an octet sequence, as the encoding of given string was 'iso'
        case 'ucs': return octetsFromWordSeq(wordSeq, endianness);
        default: throw new Error(`unexpected encoding "${strEncoding}"`);
    }
};

// Get octet array for frame's header, given frame's id and content size
const buildFrameHeaderOctets = (frameId, frameContentSize) => {
    // The frame header is 10 octets long and laid out as `IIIISSSSFF`, where
    // * `IIII......`: Frame id (four characters)
    // * `....SSSS..`: Size (frame size excluding frame header = frame size - 10)
    // * `........FF`: Flags
    const frameIdOctets = wordSeqFromStr(frameId);
    const frameContentSizeOctets = octetsFromDword(frameContentSize); // TODO: This is wrong! Encode as syncsafe!
    return concat(frameIdOctets, frameContentSizeOctets, [0, 0]);
};

// Get octet array for frame's content. Given `content` should be an array of numbers and strings
const buildFrameContentOctets = (content, contentEncoding, endianness) =>
    _.flatten(_.map(content, c => _.isString(c) ? octetsFromStr(c, contentEncoding, endianness) : c));

// Get octet array for frame of given `id` and `content` - an array of numbers and strings. The
//  content will be flattened by copying all numbers one to one and converting strings to octets
//  according to the given 'iso' or 'ucs' `contentEncoding`. The byte-order will be determined by
//  given `endianness`
const buildFrameOctets = (id, content, contentEncoding, endianness) => {
    // All frames consist of a header followed by the actual data
    var frameContentOctets = buildFrameContentOctets(content, contentEncoding, endianness);
    var frameHeaderOctets = buildFrameHeaderOctets(id, frameContentOctets.length);
    return concat(frameHeaderOctets, frameContentOctets);
};

// Get frame's octets wrapped in a DataView instance, given a frame descriptor hash `frameDescr`
//  that descibes the frame. This should have properties
//  * id: The frame's id, e.g. "IPLS"
//  * content: The frame's content as an array of numbers and strings. This will be flattened to an
//     array of octets, where numbers will be copied one to one while strings will be converted to
//     octets according to the given (or default) `contentEncoding`
//  * contentEncoding: Optionally, the content's encoding. Either 'iso' for ISO-8859-1 (the default)
//     or 'ucs' for UCS-2. This affects the way in which strings present in the `content` array
//     are converted to octet arrays
//  * endianness: Optionally, the octet representation's endianness. Either 'le' for Little Endian
//     (the default) or 'be' for Big Endian
//  * offset: The frame's offset within the returned view. This is useful in emulating a frame
//     that appears in some arbitrary position of the bitstream, rather than 0 which obviously
//     isn't the general case
const buildFrameView = frameDescr => {
    frameDescr = _.extend({ content: [], contentEncoding: 'iso', endianness: 'le' }, frameDescr);
    const frameOctets = buildFrameOctets(frameDescr.id, frameDescr.content,
        frameDescr.contentEncoding, frameDescr.endianness);
    return dataViewFromArray(frameOctets, frameDescr.offset);
}

//
module.exports = { buildFrameView, dataViewFromFilePath };
