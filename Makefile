OUT_BUILD := ./dist/

.PHONY: build
build: clean mkdist
	npx tsc --declaration --emitDeclarationOnly --declarationDir ./dist/types
	npx tsc --project tsconfig.esm.json
	npx tsc --project tsconfig.cjs.json
	sh ./esm_fix.sh

.PHONY: mkdist
mkdist:
	mkdir -p ${OUT_BUILD}

.PHONY: clean
clean:
	rm -rf ./dist

.PHONY: prepub
prepub:
	cp ./package.json ./dist
	cp ./LICENSE ./dist
	cp ./README.md ./dist
	cp ./.npmrc.tpl ./dist/.npmrc
	cp ./package.module.json ./dist/esm/package.json

.PHONY: pub
pub: prepub
	cd ./dist && npm publish
