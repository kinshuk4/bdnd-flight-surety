var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');

async function assertAirlineState(config, expectedAirlineState, errorMessage,  ...airlines) {
    for(var i = 0; i < airlines.length; i++) {
        assert.equal(await config.flightSuretyData.getAirlineState(airlines[i]), expectedAirlineState, `Airline ${i+1} ${errorMessage}`);
    }
}

contract('Airline Tests', async (accounts) => {
    const firstAirline = accounts[0];
    const secondAirline = accounts[1];
    const thirdAirline = accounts[2];
    const fourthAirline = accounts[3];
    const fifthAirline = accounts[4];
    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.setAppContractAuthorizationStatus(config.flightSuretyApp.address, true);
    });

    it('Contract owner is created as first airline', async function () {
        assert.equal(await config.flightSuretyData.getAirlineState(firstAirline), 2, "First airline");
        await config.flightSuretyData.totalPaid
    });

    it('Airline cannot register an Airline using registerAirline() if it is not funded', async () => {
        try {
            await config.flightSuretyApp.registerAirline(thirdAirline, {from: secondAirline});
        } catch (e) {

        }
        let result = await config.flightSuretyData.getAirlineState.call(thirdAirline);

        // ASSERT
        assert.equal(result.toNumber(), 0, "Airline has not funded");

    });

    it('Airlines can apply for registration', async function () {
        const applyForAirlineRegistration = await config.flightSuretyApp.registerAirline("Second Airline", { from: secondAirline });
        await config.flightSuretyApp.registerAirline("Third Airline", { from: thirdAirline });
        await config.flightSuretyApp.registerAirline("Fourth Airline", { from: fourthAirline });
        await config.flightSuretyApp.registerAirline("Fifth Airline", { from: fifthAirline });

        const appliedState = 0;

        await assertAirlineState(config, appliedState, "Airline is not in applied state", secondAirline, thirdAirline, fourthAirline, fifthAirline);

        truffleAssert.eventEmitted(applyForAirlineRegistration, 'AirlineApplied', (ev) => {
            return ev.airline === secondAirline;
        });
    });

    it('Paid airline can approve up to 4 applied airlines', async function () {
        const approveAirlineRegistration = await config.flightSuretyApp.approveAirlineRegistration(secondAirline, { from: firstAirline });
        await config.flightSuretyApp.approveAirlineRegistration(thirdAirline, { from: firstAirline });
        await config.flightSuretyApp.approveAirlineRegistration(fourthAirline, { from: firstAirline });

        const registeredState = 1;

        await assertAirlineState(config, registeredState, "Airline is not in registered state", secondAirline, thirdAirline, fourthAirline);

        truffleAssert.eventEmitted(approveAirlineRegistration, 'AirlineRegistered', (ev) => {
            return ev.airline === secondAirline;
        });
    });

    it('Registered airlines can pay dues', async function () {
        const paidAirlineDues = await config.flightSuretyApp.payAirlineDues({ from: secondAirline, value: web3.utils.toWei('10', 'ether') });
        await config.flightSuretyApp.payAirlineDues({ from: thirdAirline, value: web3.utils.toWei('10', 'ether') });
        await config.flightSuretyApp.payAirlineDues({ from: fourthAirline, value: web3.utils.toWei('10', 'ether') });
        const paidState = 2;
        await assertAirlineState(config, paidState, "Airline is not in paid state", firstAirline, secondAirline, thirdAirline, fourthAirline);

        truffleAssert.eventEmitted(paidAirlineDues, 'AirlinePaid', (ev) => {
            return ev.airline === secondAirline;
        });

        const balance = await web3.eth.getBalance(config.flightSuretyData.address);
        const balanceEther = web3.utils.fromWei(balance, 'ether');

        assert.equal(balanceEther, 30, "Balance wasn't transferred");
    });

    it('Multiparty consensus required to approve fifth airline', async function () {
        // First approval should fail
        try {
            await config.flightSuretyApp.approveAirlineRegistration(fifthAirline, { from: firstAirline });
        } catch (err) {}
        assert.equal(await config.flightSuretyData.getAirlineState(fifthAirline), 0, "Single airline should not be able to approve a fifth airline alone");

        // Second approval should pass
        const approveAirlineRegistration = await config.flightSuretyApp.approveAirlineRegistration(fifthAirline, { from: secondAirline });
        assert.equal(await config.flightSuretyData.getAirlineState(fifthAirline), 1, "fifthAirline is in incorrect state");

        truffleAssert.eventEmitted(approveAirlineRegistration, 'AirlineRegistered', (ev) => {
            return ev.airline === fifthAirline;
        });
    });

});

