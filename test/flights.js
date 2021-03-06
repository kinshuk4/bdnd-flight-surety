var Test = require('../config/testConfig.js');

contract('Flight Surety Flight Tests', async (accounts) => {

    var config;
    let passenger_choose = 0;
    const passenger = accounts[30];
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.setAppContractAuthorizationStatus(config.flightSuretyApp.address, true);
    });

    it('Can register flights', async function () {
        await config.flightSuretyApp.registerFlight(0, "FLT4")
        const count = await config.flightSuretyApp.getNumFlights();
        assert.equal(count, 4, "Flight Count check was successful.");
    });

});



