BIN=node_modules/.bin
MOCHA_ARGS=--compilers js:babel-core/register 'app/test/test*.@(js|jsx)'

deploy:
	$(BIN)/gulp deploy

test:
	$(BIN)/mocha $(MOCHA_ARGS)

test-watch:
	$(BIN)/mocha $(MOCHA_ARGS) --watch

PHONY: deploy test test-watch