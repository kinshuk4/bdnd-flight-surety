var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');

contract('Flight Surety Passenger Tests', async (accounts) => {

    var config;
    let passenger_choose = 0;
    const passenger = accounts[30];
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
        await config.flightSuretyApp.registerFlight(0, "Flight1")
        await config.flightSuretyApp.registerFlight(0, "Flight2")
        await config.flightSuretyApp.registerFlight(0, "Flight3")
    });

    it('Passengers can choose from a fixed list of flight numbers and departure that are defined in the Dapp client', async function () {

        const flight1 = await config.flightSuretyApp.getFlight(passenger_choose);
        assert.equal(flight1.name, "Flight1", "Chosen flight doesn't match.")
    });

    it('Passengers may pay up to 1 ether for purchasing flight insurance', async function () {

        const flight1 = await config.flightSuretyApp.getFlight(passenger_choose);
        const amount = await config.flightSuretyApp.MAX_INSURANCE_PREMIUM.call();

        const INSURANCE_PAYOUT = 1.5;
        const expectedPayoutAmount = parseFloat(amount) * INSURANCE_PAYOUT;

        await config.flightSuretyApp.buyInsurance(
            flight1.airline,
            flight1.name,
            flight1.timestamp,
            { from: passenger, value: amount }
        );

        const insurance = await config.flightSuretyApp.getInsurance(flight1.name, { from: passenger });

        assert.equal(parseFloat(insurance.payoutAmount), expectedPayoutAmount, "Insurance payout amount doesn't match.");
    });


    it('Passengers cannot buy insurance more than 1 ether.', async function () {

        const flight1 = await config.flightSuretyApp.getFlight(0);
        let amount = await config.flightSuretyApp.MAX_INSURANCE_PREMIUM.call();
        amount = amount + amount;

        let failed = false;

        try {
            await config.flightSuretyApp.purchaseInsurance(
                flight1.airline,
                flight1.flight,
                flight1.timestamp,
                { from: passenger, value: amount }
            );
        } catch(err) {
            failed = true;
        }

        assert.equal(failed, true, "Passenger was able to purchase insurance of more than 1 ether");
    });

    it('Passenger can check status of the flight', async function () {

        const flight1 = await config.flightSuretyApp.getFlight(0);

        const fetchFlightStatus = await config.flightSuretyApp.fetchFlightStatus(
            flight1.airline,
            flight1.name,
            flight1.timestamp,
        );

        truffleAssert.eventEmitted(fetchFlightStatus, 'OracleRequest', (ev) => {
            return ev.airline === flight1.airline;
        });
    });

});
