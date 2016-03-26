/* jshint browser: true , jquery:true */
/* global $, mp3Parser:false */
(function () {
    "use strict";

    var error = false;

    try { mp3Parser.readTags(new DataView(new ArrayBuffer(100))); }
    catch (someError) { error = someError; }

    $(".output").text(error ? "Oops! " + error : "mp3Parser is up and running!");
}());
