/*jshint node:true */
"use strict";

var fs = require("fs"),
    util = require("util"),
    mp3Parser = require(__dirname + "/../mp3-parser"),
    pathToMp3 = process.argv[2],
    toArrayBuffer = function (buffer) {
        var bufferLength = buffer.length, i = 0,
            uint8Array = new Uint8Array(new ArrayBuffer(bufferLength));

        for (; i < bufferLength; ++i) { uint8Array[i] = buffer[i]; }
        return uint8Array.buffer;
    };

if (!pathToMp3) {
   console.log("please give a path to an mp3 file, i.e. 'node parse.js <file>'");
   process.exit(0);
 }

fs.readFile(pathToMp3, function (error, buffer) {
    if (error) {
        console.log("Oops: " + error);
        process.exit(1);
    }
    buffer = new DataView(toArrayBuffer(buffer));

    var lastFrame = mp3Parser.readLastFrame(buffer),
        tags = mp3Parser.readTags(buffer);

    util.puts("\nTags:\n-----\n" + util.inspect(tags, { depth: 3, colors: true }));
    util.puts("\nLast frame:\n-----------\n" + util.inspect(lastFrame, { depth: 3, colors: true }));
});