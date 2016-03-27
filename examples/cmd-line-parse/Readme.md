mp3Parser example: Cmd line parse
=================================

Parses given mp3 file, invoking `mp3Parser.readTags` / `mp3Parser.readLastFrame` to output
information about ID3v2 or Xing/Lame tags as well as the last mp3 frame found. Run with
`node parse.js <mp3-file>`.

In this example, mp3Parser is loaded as a CommonJS module.
