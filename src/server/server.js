import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
import 'babel-polyfill';
import BigNumber from 'bignumber.js';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
const oracles = [];
init();

async function init() {
    console.log('Initializing the server');
    const NUMBER_OF_ORACLES = 20;
    const accounts = await web3.eth.getAccounts();
    registerOracles(accounts.slice(1, NUMBER_OF_ORACLES + 1));

    flightSuretyApp.events.OracleRequest({fromBlock: 0}, (error, event) => {
        if (error) return console.log(error);
        console.log(event)

        fetchFlightStatus(
            event.returnValues.index,
            event.returnValues.airline,
            event.returnValues.flight,
            event.returnValues.timestamp
        )
    });
}

async function registerOracles(oracleAccounts) {
    const fee = await flightSuretyApp.methods.ORACLE_REGISTRATION_FEE().call();
    const STATUS_CODES = [0, 10, 20, 30, 40, 50];

    for (let i = 0; i < oracleAccounts.length; i++) {

        const address = oracleAccounts[i];
        const statusCode = STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)];

        await flightSuretyApp.methods.registerOracle().send({
            from: address,
            value: fee,
            gas: 3000000
        });

        const indexes = await flightSuretyApp.methods
            .getMyIndexes()
            .call({ from: address });

        oracles.push({ address, indexes, statusCode });
    }

    console.log(`${oracles.length} Oracles Registered`);
}

async function fetchFlightStatus(index, airline, flight, timestamp) {

    if (oracles.length === 0) return;

    console.log("FlightStatus requested.")
    console.log(index, airline, flight, timestamp);

    const selectedOracles = [];

    oracles.forEach((oracle) => {
        if ( BigNumber(oracle.indexes[0]).isEqualTo(index) ) selectedOracles.push( oracle );
        if ( BigNumber(oracle.indexes[1]).isEqualTo(index) ) selectedOracles.push( oracle );
        if ( BigNumber(oracle.indexes[2]).isEqualTo(index) ) selectedOracles.push( oracle );
    });

    console.log(`Selected oracles: ${JSON.stringify(selectedOracles)}`);

    selectedOracles.forEach( (oracle) => {
        flightSuretyApp.methods
            .submitOracleResponse(index, airline, flight, timestamp, oracle.statusCode)
            .send({ from: oracle.address, gas: 5555555 })
            .then(() => {
                console.log(`Oracle ${JSON.stringify(oracle)} fetched flight details.`);
            })
            .catch((err) => console.log(`Oracle ${JSON.stringify(oracle)} rejected`));
    });
}

const app = express();
app.get('/api', (req, res) => {
    res.send({
        message: 'An API for use with your Dapp!'
    })
})

export default app;


