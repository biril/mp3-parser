mp3 Parser
==========

[![Build Status](https://travis-ci.org/biril/mp3-parser.png)](https://travis-ci.org/biril/mp3-parser)
[![NPM version](https://badge.fury.io/js/mp3-parser.png)](http://badge.fury.io/js/mp3-parser)
[![Bower version](https://badge.fury.io/bo/mp3-parser.png)](http://badge.fury.io/bo/mp3-parser)

Locate and read MPEG audio file sections: Individual frames as well as ID3v2 and Xing/Lame tags. For
any of these found within a given buffer, mp3 Parser will provide data indicating their presence,
their position within the buffer, as well as relevant informative data (with varying degrees of
detail).


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

* When working _with an AMD loader_ (e.g. requireJS):

    ```javascript
    // Your module
    define(["path/to/mp3-parser/main"], function (mp3Parser) {
        var mp3Tags = mp3Parser.readTags(someMp3DataView);
    });
    ```

    In the example above, it is assumed that mp3-parser source files live in
    `path/to/mp3-parser` (relative to the root path used for module lookups). When using requireJS
    you may prefer to [treat mp3-parser as a package](http://requirejs.org/docs/api.html#packages):

    ```javascript
    // Configure requireJS for the mp3-parser package ..
    require.config({
        packages: [{
            name: "mp3-parser",
            location: "path/to/mp3-parser"
        }]
    })

    // .. and refer to mp3-parser module by its given package name
    define(["mp3-parser"], function (mp3Parser) {
        var mp3Tags = mp3Parser.readTags(someMp3DataView);
    });
    ```


* Setting up mp3 Parser in projects targetting _browsers, without an AMD module loader_, is
    unfortunately quite verbose as it relies on the (order-specific) inclusion of a number of
    sources. This should be mitigated in the future, but for now you would need:

    ```html
    ...
    <script type="text/javascript" src="path/to/mp3-parser/lib/lib.js"></script>
    <script type="text/javascript" src="path/to/mp3-parser/lib/xing.js"></script>
    <script type="text/javascript" src="path/to/mp3-parser/lib/id3v2.js"></script>
    <script type="text/javascript" src="path/to/mp3-parser/main.js"></script>
    ...
    ```

    which would export the `mp3Parser` global:

    ```javascript
    var mp3Tags = mp3Parser.readTags(someMp3DataView);
    ```


Usage
-----

The parser's API consists of `read____` methods, each dedicated to reading a specific section
of the MPEG audio file. The current implementation includes `readFrameHeader`, `readFrame`,
`readLastFrame`, `readId3v2Tag`, `readXingTag` and `readTags`. Each of these accepts a
[DataView](http://www.khronos.org/registry/typedarray/specs/latest/#8)-wrapped ArrayBuffer
containing the audio data, and optionally an offset into the buffer.

In all cases, a 'description' will be returned - a hash containing key-value pairs relevant to the
specific section being read. For example, the hash returned by `readFrameHeader` for an mp3 file
will include an `mpegAudioVersion` key of value "MPEG Version 1 (ISO/IEC 11172-3)" and a
`layerDescription` key of value "Layer III". A section description will always include a
`_section` attribute - a hash with `type`, `byteLength` and `offset` keys:

* `type`: "frame", "frameHeader", "Xing" or "ID3v2"
* `byteLenfth`: Size of the section in bytes
* `offset`: Buffer offset at which this section resides

In further detail:


### readFrameHeader(view, [offset])

Read and return description of header of frame located at `offset` of DataView `view`. Returns
`null` in the event that no frame header is found at `offset`.

A couple of example descriptions:

* Version 1, Layer III (mp3), 44.1KHz 128Kbs Joint Stereo:

    ```javascript
    {
        _section: {
            type: 'frameHeader',
            offset: 99934,
            byteLength: 4
        },
        mpegAudioVersionBits: '11',
        mpegAudioVersion: 'MPEG Version 1 (ISO/IEC 11172-3)',
        layerDescriptionBits: '01',
        layerDescription: 'Layer III',
        isProtected: 1,
        protectionBit: '1',
        bitrateBits: '1001',
        bitrate: 128,
        samplingRateBits: '00',
        samplingRate: 44100,
        frameIsPaddedBit: '1',
        frameIsPadded: true,
        framePadding: 1,
        privateBit: '0',
        channelModeBits: '01',
        channelMode: 'Joint stereo (Stereo)'
    }
    ```

* Version 2, Layer II, 16KHz 32Kbs Mono:

    ```javascript
    {
        _section: {
            type: 'frameHeader',
            offset: 0,
            byteLength: 4
        },
        mpegAudioVersionBits: '10',
        mpegAudioVersion: 'MPEG Version 2 (ISO/IEC 13818-3)',
        layerDescriptionBits: '10',
        layerDescription: 'Layer II',
        isProtected: 1,
        protectionBit: '1',
        bitrateBits: '0100',
        bitrate: 32,
        samplingRateBits: '10',
        samplingRate: 16000,
        frameIsPaddedBit: '0',
        frameIsPadded: false,
        framePadding: 0,
        privateBit: '0',
        channelModeBits: '11',
        channelMode: 'Single channel (Mono)'
    }
    ```

### readFrame(view, [offset[, requireNextFrame]])

Read and return description of frame located at `offset` of DataView `view`. Includes the frame
header description (see `readFrameHeader`) plus basic information about the frame: The frame's
length in bytes and the index of the next frame _if_ `requireNextFrame` is set. In this case, the
presence of a _next_ valid frame will be required for _this_ frame to be regarded as valid. Returns
`null` in the event that no frame is found at `offset`.

As an example description:

```javascript
{
    _section: {
        type: 'frame',
        offset: 99934,
        byteLength: 418,
        sampleLength: 1152,
        nextFrameIndex: 100352 // Available iff 'requireNextFrame'
    },
    header: { /* .. a frame header description .. */ }
}
```


### readLastFrame(view, [offset[, requireNextFrame]])

Locate and return the description of the very last valid frame in given DataView `view`. The search
is carried out in reverse, from given `offset` (or the very last octet if `offset` is omitted) to
the buffer's beginning. If `requireNextFrame` is set, the presence of a next valid frame will be
required for any found frame to be regarded as valid (causing the method to essentially return the
next-to-last frame on success). Returns `null` in the event that no frame is found at `offset`.


### readId3v2Tag(view[, offset])

Read and return description of [ID3v2 Tag](http://id3.org/id3v2.3.0) located at `offset` of
DataView `view`. (This will include any and all
[currently supported ID3v2 frames](https://github.com/biril/mp3-parser/wiki) located within the
tag). Returns `null` in the event that no tag is found at `offset`.

As an example description:

```javascript
{
    _section: {
        type: 'ID3v2',
        offset: 0,
        byteLength: 2048
    },
    header: {
        majorVersion: 3,
        minorRevision: 0,
        flagsOctet: 0,
        unsynchronisationFlag: false,
        extendedHeaderFlag: false,
        experimentalIndicatorFlag: false,
        size: 2038
    },
    frames: [{
        header: {
            id: 'TIT2',
            size: 12,
            flagsOctet1: 0,
            flagsOctet2: 0
        },
        name: 'Title/songname/content description',
        content: {
            encoding: 0,
            value: 'Flight Path'
        }
    }, {
        header: {
            id: 'TPUB',
            size: 10,
            flagsOctet1: 0,
            flagsOctet2: 0
        },
        name: 'Publisher',
        content: {
            encoding: 0,
            value: 'Planet Mu'
        }
    }, {
        header: {
            id: 'TCON',
            size: 4,
            flagsOctet1: 0,
            flagsOctet2: 0
        },
        name: 'Content type',
        content: {
            encoding: 0,
            value: '(3)'
        }
    }, {
        header: {
            id: 'TALB',
            size: 9,
            flagsOctet1: 0,
            flagsOctet2: 0
        },
        name: 'Album/Movie/Show title',
        content: {
            encoding: 0,
            value: 'Severant'
        }
    }, {
        header: {
            id: 'TRCK',
            size: 3,
            flagsOctet1: 0,
            flagsOctet2: 0
        },
        name: 'Track number/Position in set',
        content: {
            encoding: 0,
            value: '11'
        }
    }, {
        header: {
            id: 'TYER',
            size: 5,
            flagsOctet1: 0,
            flagsOctet2: 0
        },
        name: 'Year',
        content: {
            encoding: 0,
            value: '2011'
        }
    }, {
        /* .. more frames follow .. */
    }]
}
```


### readXingTag(view[, offset])

Read and return description of [Xing / Lame Tag](http://gabriel.mp3-tech.org/mp3infotag.html)
located at `offset` of DataView `view`. Returns `null` in the event that no frame is found at
`offset`.

As an example description:

```javascript
{
    _section: {
        type: 'Xing',
        offset: 2462,
        byteLength: 417,
        nextFrameIndex: 2879
    },
    header: { /* .. a frame header description .. */ },
    identifier: 'Xing' // Or 'Info' if Lame tag
}
```


### readTags(view[, offset])

Read and return descriptions of all tags found up to (and additionally including) the very first
frame. Returns an array of descriptions which may include that of a located ID3V2 tag, of a located
Xing / Lame tag and of a located first frame.


You may also want to
--------------------

* View the [annotated version of the source](http://biril.github.io/mp3-parser/).
* Try out the [load remote](https://github.com/biril/mp3-parser/tree/0.3.0/example/load-remote),
    [read file](https://github.com/biril/mp3-parser/tree/0.3.0/example/read-file)
    & [cmd line parse](https://github.com/biril/mp3-parser/tree/0.3.0/example/cmd-line-parse) examples.
* Take a look at [the project's wiki](https://github.com/biril/mp3-parser/wiki) which contains a
    list of currently (un)supported ID3v2 tag frames.


Contributing
------------

Contibutions are appreciated, naturally. Feel free to submit pull requests against `master`. Please
make sure that `npm run lint` and `npm test` are green before you do so. Pull requests featuring
appropriate unit tests are ideal. However, less than ideal pull requests are also fine, especially
until the test suite gets the documentation it deserves - probably along with some necessary
housekeeping.


Changelog
---------

#### Next — [Diff](https://github.com/biril/mp3-parser/compare/0.3.0...master)

TBD


#### 0.3.0 — _Nov 20, 2016_ — [Diff](https://github.com/biril/mp3-parser/compare/0.2.7...0.3.0)

* Add support for ID3v2 CHAP frames (Thanks [markusahlstrand](https://github.com/markusahlstrand)).
* Add support for MPEG v2 / layers I - III (Thanks [jdelStrother](https://github.com/jdelStrother)).
* Fix ID3v2 IPLS frame parsing defect (fixes [issue #4](https://github.com/biril/mp3-parser/issues/4), probably maybe).
* Improve test-runner (switch to Jasmine). Add tests. Revise and clean-up linter config.
* Lots of minor fixes and housekeeping.


License
-------

Licensed and freely distributed under the MIT License (LICENSE.txt).

Copyright (c) 2013-2016 Alex Lambiris
