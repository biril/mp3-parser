/*jshint node:true, esversion:6 */
"use strict";

const fs = require("fs");
const util = require("util");
const mp3Parser = require("mp3-parser");

const pathToMp3 = process.argv[2];
const toArrayBuffer = buffer => {
    const bufferLength = buffer.length;
    const uint8Array = new Uint8Array(new ArrayBuffer(bufferLength));

    for (let i = 0; i < bufferLength; ++i) { uint8Array[i] = buffer[i]; }
    return uint8Array.buffer;
};

if (!pathToMp3) {
    console.log("please invoke with path to MPEG audio file, i.e. 'node parse.js <file>'");
    process.exit(0);
}

fs.readFile(pathToMp3, (error, buffer) => {
    if (error) {
        console.error("" + error);
        process.exit(1);
    }

    buffer = new DataView(toArrayBuffer(buffer));

    const tags = mp3Parser.readTags(buffer);
    console.log("\nTags:\n-----");
    console.log(util.inspect(tags, { depth: 5, colors: true }));

    const lastFrame = mp3Parser.readLastFrame(buffer);
    console.log("\nLast frame:\n-----------\n");
    console.log(util.inspect(lastFrame, { depth: 3, colors: true }));
});
