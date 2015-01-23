mp3 Parser, browser example
===========================

Uses `XMLHttpRequest` level 2 to load a remote mp3 into a `DataView` and subsequently invokes
`mp3Parser.readTags` to read and dump any ID3v2 or Xing/Lame tags found therein. It'll work with
any given URL to an mp3 file as long as the remote server supports CORS. SoundCloud can be a handy
source for such URLs and special handling is built in so that SC's track URLs (such as
[https://soundcloud.com/sonokinetic/capriccio-demo-kaleidoscope](https://soundcloud.com/sonokinetic/capriccio-demo-kaleidoscope))
are automatically resolved to a remote mp3 and subsequently loaded. (Note that the SC API permits
this sort of thing for _some_ but not _all_ tracks.)


Set up
------

In the example folder, `bower install` to get all dependencies. You can user Grunt's connect plugin
to serve the example application: `npm install` to get dev-dependencies and then
`grunt connect:server:keepalive` to run a local connect server listening on `localhost:3333`.
