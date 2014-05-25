mp3 Parser
==========

[![Build Status](https://travis-ci.org/biril/mp3-parser.png)](https://travis-ci.org/biril/mp3-parser)
[![NPM version](https://badge.fury.io/js/mp3-parser.png)](http://badge.fury.io/js/mp3-parser)
[![Bower version](https://badge.fury.io/bo/mp3-parser.png)](http://badge.fury.io/bo/mp3-parser)

Locate and read mp3 sections: Individual mp3 frames as well as ID3v2 and Xing/Lame tags. For each of
these sections present within a given mp3 file, mp3 Parser will provide data indicating their
presence, their boundaries within the file, as well as any available informative data. In the
current implementation, the latter is strictly true only for frames as thorough parsing and
data-extraction from ID3v2 and Xing/Lame tags is work in progress. The primary use case (and raison
d'etre) for this initial revision is performing precise cuts at frame / tag boundaries.


Set up
------

To use mp3 Parser

* install with bower, `bower install mp3-parser` or
* install with npm, `npm install mp3-parser` or
* just include the relevant files (see below), in case you're targeting a browser and don't want to
    go over npm or bower.

mp3 Parser may be used as a CommonJS module on Node or in a browser, either as an AMD module or
through plain `<script>` tags. It's automatically exported in the appropriate format depending on
the current environment:

* When working _with CommonJS_ (e.g. Node), assuming mp3 Parser is `npm install`ed:

    ```javascript
    var mp3Parser = require("mp3-parser");
    var mp3Tags = mp3Parser.readTags(someMp3DataView);
    ```

* When working _with an AMD loader_ (e.g. require.js):

    ```javascript
    // Your module
    define(["mp3-parser"], function (mp3Parser) {
        var mp3Tags = mp3Parser.readTags(someMp3DataView);
    });
    ```

* Setting up mp3 Parser in projects targetting _browsers, without an AMD module loader_, is
    unfortunately quite verbose as a number of files need to be included (in specific order). This
    should be mitigated in the future, but for now you would need:

    ```html
    ...
    <script type="text/javascript" src="path/to/mp3-parser/lib/lib.js"></script>
    <script type="text/javascript" src="path/to/mp3-parser/lib/xing.js"></script>
    <script type="text/javascript" src="path/to/mp3-parser/lib/id3v2.js"></script>
    <script type="text/javascript" src="path/to/mp3-parser/mp3-parser.js"></script>
    ...
    ```

    which would export the `mp3Parser` global:

    ```javascript
    var mp3Tags = mp3Parser.readTags(someMp3DataView);
    ```


Usage
-----

The parser exposes a collection of `read____` methods, each dedicated to reading a specific section
of the mp3 file. The current implementation includes `readFrameHeader`, `readFrame`, `readId3v2Tag`
and `readXingTag`. Each of these accepts a DataView-wrapped ArrayBuffer, which should contain the
actual mp3 data, and optionally an offset into the buffer.

All methods return a description of the section read in the form of a hash containing key-value
pairs relevant to the section. For example the hash returned by `readFrameHeader` always contains
an `mpegAudioVersion` key of value "MPEG Version 1 (ISO/IEC 11172-3)" and a `layerDescription` key
of value "Layer III". A description will always have a `_section` hash with `type`, `byteLength`
and `offset` keys:

* `type`: "frame", "frameHeader", "Xing" or "ID3v2"
* `byteLenfth`: Size of the section in bytes
* `offset`: Buffer offset at which this section resides

Further documentation is forthcoming. You can also

* View the [annotated version](http://biril.github.io/mp3-parser/) of the source.
* Try the example script `examples/node/parse.js`. Run it with `node parse.js <mp3-file>`


License
-------

Licensed and freely distributed under the MIT License (LICENSE.txt).

Copyright (c) 2013-2014 Alex Lambiris
