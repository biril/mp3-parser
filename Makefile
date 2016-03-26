test:
	./node_modules/.bin/jasmine-node --verbose --color --captureExceptions ./test/spec/

lint:
	./node_modules/.bin/jshint --show-non-errors main.js lib/ test/spec/ && ./node_modules/.bin/jscs main.js lib/ test/spec/

generate-docs:
	./node_modules/.bin/grock --glob './lib/*.js' --glob './main.js' --glob './README.md' --index 'README.md' --verbose

.PHONY: test lint generate-docs
