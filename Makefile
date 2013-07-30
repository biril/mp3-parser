test:
	node ./node_modules/.bin/jasmine-node --verbose --color --captureExceptions ./test/spec/

lint:
	jshint --show-non-errors mp3-parser.js test/spec/

.PHONY: test lint