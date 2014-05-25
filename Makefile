test:
	./node_modules/.bin/jasmine-node --verbose --color --captureExceptions ./test/spec/

lint:
	./node_modules/.bin/jshint --show-non-errors mp3-parser.js test/spec/

.PHONY: test lint