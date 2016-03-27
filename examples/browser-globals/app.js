/* jshint browser: true , jquery:true */
/* global $, mp3Parser:false */
(function () {
    "use strict";

    $(".fileFormInput").on("change", function () {

        var mp3File = $(".fileFormInput").get(0).files[0];

        var reader = new FileReader();
        reader.onload = function () {
            var tags = mp3Parser.readTags(new DataView(reader.result));
            $(".report").text(JSON.stringify(tags, undefined, 2));
        };

        reader.readAsArrayBuffer(mp3File);
    });

}());
