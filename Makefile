test:
	./node_modules/.bin/jasmine-node --verbose --color --captureExceptions ./test/spec/

lint:
	./node_modules/.bin/jshint --show-non-errors mp3-parser.js test/spec/

generate-docs:
	./node_modules/.bin/grock --glob './lib/*.js' --glob './mp3-parser.js' --glob './README.md' --index 'README.md' --verbose

.PHONY: test lint generate-docs