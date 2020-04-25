# bdnd-flight-surety

FlightSurety is a sample application project for Udacity's Blockchain course.

Project rubric can be found [here](https://review.udacity.com/#!/rubrics/1711/view).

## Install

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

`npm install`
`truffle compile`

Start ganache. If you're running ganache-cli and using the mnemonic in class, it would look something like:

```bash
ganache-cli -a 50 -l 99999999 -m "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"
```

If you are running the Ganache GUI, just do quick start and change number of accounts to 50. 

Truffle config already points to port 8545 in case of ganache cli, change it to 7545.

To migrate:
`truffle migrate`
if you are migratng again:
```bash
truffle migrate --reset
```


## Develop Client

To run truffle tests:

`truffle test ./test/flightSurety.js`
`truffle test ./test/oracles.js`

To use the dapp:

`truffle migrate`
`npm run dapp`

if You are facing issue with the run, change to latest version of webpack. Also change ports in the generated config as per ganache cli or GUI.

To view dapp:

`http://localhost:8000`

## Develop Server

`npm run server`
`truffle test ./test/oracles.js`

## Deploy

To build dapp for prod:
`npm run dapp:prod`

Deploy the contents of the ./dapp folder


## Resources

* [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
* [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
* [Truffle Framework](http://truffleframework.com/)
* [Ganache Local Blockchain](http://truffleframework.com/ganache/)
* [Remix Solidity IDE](https://remix.ethereum.org/)
* [Solidity Language Reference](http://solidity.readthedocs.io/en/v0.4.24/)
* [Ethereum Blockchain Explorer](https://etherscan.io/)
* [Web3Js Reference](https://github.com/ethereum/wiki/wiki/JavaScript-API)
* [Knowledge](https://knowledge.udacity.com/questions/125065)