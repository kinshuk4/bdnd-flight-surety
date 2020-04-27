import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {
        let config = Config[network];
        this.config = config
        this.config = config;
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, this.config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            this.owner = accts[0];

            let counter = 1;

            while (this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while (this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({from: self.owner}, callback);
    }

    async authotizeOwner(callback) {
        await this.flightSuretyData.methods.setAppContractAuthorizationStatus(this.config.appAddress, true).send({from: this.owner});
        await this.flightSuretyData.methods.getAppContractAuthorizationStatus(this.config.appAddress).call({from: this.owner}, callback)
    }

    async fetchFlightStatus(flight, callback) {
        let self = this;
        const flightDetails = await self.flightSuretyApp.methods.getFlight(flight).call();
        let payload = {
            airline: flightDetails.airline,
            flight: flightDetails.name,
            timestamp: flightDetails.timestamp,
            statusCode: flightDetails.statusCode
        }

        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    async getAllFlights(callback) {
        let self = this;
        await self.flightSuretyApp.methods
            .getNumFlights()
            .call({from: self.owner}, async (err, flightsCount) => {
                const results = [];
                for (var i = 0; i < flightsCount; i++) {
                    const res = await self.flightSuretyApp.methods.getFlight(i).call({from: self.owner});
                    results.push(res);
                }
                callback(err, results);
            });
    }

    async buyInsurance(flight, amount, callback) {
        let self = this;
        const flightDetails = await self.flightSuretyApp.methods.getFlight(flight).call();
        let payload = {
            airline: flightDetails.airline,
            flight: flightDetails.name,
            timestamp: flightDetails.timestamp,
            statusCode: flightDetails.statusCode
        }
        await self.flightSuretyApp.methods.buyInsurance(payload.airline, payload.flight, payload.timestamp)
            .send({from: self.owner, value: this.web3.utils.toWei(amount.toString(), 'ether'), gas: 3000000},
                async (error, result) => {
                    console.log(error, result)
                    const insurance = await this.flightSuretyApp.methods
                        .getInsurance(payload.flight)
                        .call({from: this.owner});

                    insurance.amount = this.web3.utils.fromWei(insurance.amount.toString(), 'ether')
                    insurance.payoutAmount = this.web3.utils.fromWei(insurance.payoutAmount.toString(), 'ether')
                    insurance.statusCode = payload.statusCode;
                    insurance.airline = payload.airline;
                    insurance.flight = payload.flight;
                    insurance.timestamp = payload.timestamp;
                    callback(error, insurance)
                })
    }

    async getAllPassengerInsurances(flights) {
        let self = this;
        const insurances = [];
        for (const flight of flights) {
            const insurance = await this.flightSuretyApp.methods
                .getInsurance(flight.name)
                .call({from: this.owner});

            if (insurance.amount !== "0") insurances.push({
                amount: this.web3.utils.fromWei(insurance.amount, 'ether'),
                payoutAmount: this.web3.utils.fromWei(insurance.payoutAmount, 'ether'),
                state: insurance.state,
                flight: flight
            });
        }
        return insurances;
    }


    async claimInsurance(flight, callback) {
        let self = this;
        const flightDetails = await self.flightSuretyApp.methods.getFlight(flight).call();
        let payload = {
            airline: flightDetails.airline,
            flight: flightDetails.name,
            timestamp: flightDetails.timestamp,
        }
        await self.flightSuretyApp.methods
            .claimInsurance(payload.airline, payload.flight, payload.timestamp)
            .send({from: self.owner},
            async (error, result) => {
                callback(error, result);
            });
    }

    async getBalance(callback) {
        let self = this;
        await self.flightSuretyApp.methods
            .getBalance()
            .call({ from: this.owner },
                async (error, result) => {
                callback(error, this.web3.utils.fromWei(result, 'ether'))
            });
    }

    async withdrawBalance(callback) {
        let self = this;
        await self.flightSuretyApp.methods
            .withdrawBalance()
            .send(
                { from: this.owner },
                async (error, result) => {
                   callback(error, result)
                }
            );
    }
}