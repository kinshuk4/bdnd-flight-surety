compile:
	truffle compile

init:
	npm i -g truffle@nodeLTSe
	npm install

clean:
	truffle networks --clean
	rm -rf ./build

reset: clean
	truffle migrate --reset

migrate:
	truffle migrate --network development

migrate-rinkeby:
	truffle migrate --network rinkeby

migrate-ropsten:
	truffle migrate --network ropsten

migrate-live:
	truffle migrate --network live

rpc:
	testrpc --port 7545 -u 0 --gas 9712388

test: migrate
	truffle test --network development

console:
	truffle console --network development

run_dapp: migrate
	npm run dapp

run_server: migrate
	npm run server

all:
	make migrate
	make test
	make -j 2 run_dapp run_server


