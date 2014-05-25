var _ = require('lodash');
module.exports = function(data) {
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
__p += '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>' +
((__t = ( data.pageHeadline )) == null ? '' : __t) +
' - ' +
__e( data.pageTitle ) +
'</title>\n\n  <link rel="stylesheet" href="' +
__e( data.relativeRoot ) +
'assets/style.css">\n\n  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0"/>\n  <meta name="groc-relative-root" content="' +
__e( data.relativeRoot ) +
'"/>\n  <meta name="groc-document-path" content="' +
__e( data.targetPath ) +
'"/>\n  ';
 if (data.repositoryUrl) { ;
__p += '\n  <meta name="groc-repository-url" content="' +
__e( data.repositoryUrl ) +
'"/>\n  ';
 } ;
__p += '\n</head>\n<body>\n  <div id="file-area">\n    <div id="meta">\n      <code class="file-path">\n      ';
 if (data.publicURL) { ;
__p += '\n        <a href="' +
__e( data.publicURL ) +
'">' +
((__t = ( data.targetPath )) == null ? '' : __t) +
'</a>\n      ';
 } else { ;
__p += '\n        ' +
((__t = ( data.targetPath )) == null ? '' : __t) +
'\n      ';
 } ;
__p += '\n      </code>\n    </div>\n    <div id="document">\n    ';
 data.segments.forEach(function(segment) { ;
__p += '\n      <div class="segment">\n      ';
 if (segment.comments != '') { ;
__p += '\n        <div class="comments ' +
__e( segment.accessClasses ) +
'">\n          <div class="wrapper">' +
((__t = ( segment.comments )) == null ? '' : __t) +
'</div>\n        </div>\n      ';
 } ;
__p += '\n      ';
 if (segment.code != '') { ;
__p += '\n        <div class="code"><div class="wrapper">' +
((__t = ( segment.code )) == null ? '' : __t) +
'</div></div>\n      ';
 } ;
__p += '\n      </div>\n    ';
 }) ;
__p += '\n    </div>\n  </div>\n\n  <script src="' +
__e( data.relativeRoot ) +
'toc.js"></script>\n  <script src="' +
__e( data.relativeRoot ) +
'assets/libs.js"></script>\n  <script src="' +
__e( data.relativeRoot ) +
'assets/behavior.js"></script>\n</body>\n</html>';
return __p
};