var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');

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
        assert.equal(result.toNumber(), 0, "Airline should not be able to register another airline if it hasn't provided funding");

    });

    it('Airlines can apply for registration', async function () {
        const applyForAirlineRegistration = await config.flightSuretyApp.registerAirline("Second Airline", { from: secondAirline });
        await config.flightSuretyApp.registerAirline("Third Airline", { from: thirdAirline });
        await config.flightSuretyApp.registerAirline("Fourth Airline", { from: fourthAirline });
        await config.flightSuretyApp.registerAirline("Fifth Airline", { from: fifthAirline });

        const appliedState = 0;

        assert.equal(await config.flightSuretyData.getAirlineState(secondAirline), appliedState, "2nd applied airline is of incorrect state");
        assert.equal(await config.flightSuretyData.getAirlineState(thirdAirline), appliedState, "3rd applied airline is of incorrect state");
        assert.equal(await config.flightSuretyData.getAirlineState(fourthAirline), appliedState, "4th applied airline is of incorrect state");
        assert.equal(await config.flightSuretyData.getAirlineState(fifthAirline), appliedState, "5th applied airline is of incorrect state");

        truffleAssert.eventEmitted(applyForAirlineRegistration, 'AirlineApplied', (ev) => {
            return ev.airline === secondAirline;
        });
    });

    it('Paid airline can approve up to 4 applied airlines', async function () {
        const approveAirlineRegistration = await config.flightSuretyApp.approveAirlineRegistration(secondAirline, { from: firstAirline });
        await config.flightSuretyApp.approveAirlineRegistration(thirdAirline, { from: firstAirline });
        await config.flightSuretyApp.approveAirlineRegistration(fourthAirline, { from: firstAirline });

        const registeredState = 1;

        assert.equal(await config.flightSuretyData.getAirlineState(secondAirline), registeredState, "2nd registered airline is of incorrect state");
        assert.equal(await config.flightSuretyData.getAirlineState(thirdAirline), registeredState, "3rd registered airline is of incorrect state");
        assert.equal(await config.flightSuretyData.getAirlineState(fourthAirline), registeredState, "4th registered airline is of incorrect state");

        truffleAssert.eventEmitted(approveAirlineRegistration, 'AirlineRegistered', (ev) => {
            return ev.airline === secondAirline;
        });
    });

    it('Registered airlines can pay dues', async function () {
        const paidAirlineDues = await config.flightSuretyApp.payAirlineDues({ from: secondAirline, value: web3.utils.toWei('10', 'ether') });
        await config.flightSuretyApp.payAirlineDues({ from: thirdAirline, value: web3.utils.toWei('10', 'ether') });
        await config.flightSuretyApp.payAirlineDues({ from: fourthAirline, value: web3.utils.toWei('10', 'ether') });

        const paidState = 2;

        assert.equal(await config.flightSuretyData.getAirlineState(firstAirline), paidState, "1st paid airline is of incorrect state");
        assert.equal(await config.flightSuretyData.getAirlineState(secondAirline), paidState, "2nd paid airline is of incorrect state");
        assert.equal(await config.flightSuretyData.getAirlineState(thirdAirline), paidState, "3rd paid airline is of incorrect state");
        assert.equal(await config.flightSuretyData.getAirlineState(fourthAirline), paidState, "4th paid airline is of incorrect state");

        truffleAssert.eventEmitted(paidAirlineDues, 'AirlinePaid', (ev) => {
            return ev.airline === secondAirline;
        });

        const balance = await web3.eth.getBalance(config.flightSuretyData.address);
        const balanceEther = web3.utils.fromWei(balance, 'ether');

        assert.equal(balanceEther, 30, "Balance wasn't transferred");
    });

    it('Multiparty consensus required to approve fifth airline', async function () {
        // Note: Based on 4 paid airlines
        // let fourPaid = await config.flightSuretyData.getTotalPaidAirlines();
        // console.log('Total Paid Ailines ' + fourPaid);

        // First approval should fail
        try {
            await config.flightSuretyApp.approveAirlineRegistration(fifthAirline, { from: firstAirline });
        } catch (err) {}
        assert.equal(await config.flightSuretyData.getAirlineState(fifthAirline), 0, "Single airline should not be able to approve a fifth airline alone");

        // Second approval should pass
        const approveAirlineRegistration = await config.flightSuretyApp.approveAirlineRegistration(fifthAirline, { from: secondAirline });
        assert.equal(await config.flightSuretyData.getAirlineState(fifthAirline), 1, "5th registered airline is of incorrect state");

        truffleAssert.eventEmitted(approveAirlineRegistration, 'AirlineRegistered', (ev) => {
            return ev.airline === fifthAirline;
        });
    });

});

