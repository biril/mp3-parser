/*jshint node:true, esversion:6 */
"use strict";

const fs = require("fs");
const util = require("util");
const mp3Parser = require(__dirname + "/../../main");
const pathToMp3 = process.argv[2];
const toArrayBuffer = buffer => {
    const bufferLength = buffer.length;
    const uint8Array = new Uint8Array(new ArrayBuffer(bufferLength));

    for (let i = 0; i < bufferLength; ++i) { uint8Array[i] = buffer[i]; }
    return uint8Array.buffer;
};

if (!pathToMp3) {
    console.log("please provide a path to an mp3 file, i.e. 'node parse.js <file>'");
    process.exit(0);
}

fs.readFile(pathToMp3, (error, buffer) => {
    if (error) {
        console.log("Oops: " + error);
        process.exit(1);
    }

    buffer = new DataView(toArrayBuffer(buffer));

    const lastFrame = mp3Parser.readLastFrame(buffer);
    const tags = mp3Parser.readTags(buffer);

    util.puts("\nTags:\n-----\n" + util.inspect(tags, { depth: 5, colors: true }));
    util.puts("\nLast frame:\n-----------\n" + util.inspect(lastFrame, { depth: 3, colors: true }));
});
