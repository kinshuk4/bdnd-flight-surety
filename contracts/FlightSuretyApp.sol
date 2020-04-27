pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codes
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;
    uint8 private constant MIN_AIRLINE_FOR_CONSENSUS_VOTING = 4;

    address private contractOwner;          // Account used to deploy contract
    address dataContractAddress;
    bool private operational = true; // Check if contract is operational

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
        string name;
    }

    mapping(bytes32 => Flight) private flights;
    bytes32[] private flightKeyList;

    FlightSuretyData flightSuretyData;

    // Setup oracles
    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant ORACLE_REGISTRATION_FEE = 1 ether;
    uint256 public constant AIRLINE_REGISTRATION_FEE = 10 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
        // submit
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Passengers may pay up to 1 ether for purchasing flight insurance.
    uint public constant MAX_INSURANCE_PREMIUM = 1 ether;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event AirlineApplied(address airline);
    event AirlineRegistered(address airline);
    event AirlinePaid(address airline);
    event FlightStatusProcessed(address airline, string flight, uint8 statusCode);
    event PassengerInsuranceBought(address passenger, bytes32 flightKey);
    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);
    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);
    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);
    event OracleRegistered(uint8[3] idx, string message);
    event ContractOperationalStatus(bool status);


    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
        // Modify to call data contract's status
        require(operational, "Contract is currently not operational");
        _;
        // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier onlyRegisteredAirlines() {
        require(flightSuretyData.getAirlineState(msg.sender) == 1, "Airline is not registered.");
        _;
    }

    modifier onlyPaidAirlines() {
        require(flightSuretyData.getAirlineState(msg.sender) == 2, "Airline is not active, as no activation fee paid.");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
    (
        address _dataContractAddress
    )
    public
    {
        contractOwner = msg.sender;
        dataContractAddress = _dataContractAddress;
        flightSuretyData = FlightSuretyData(dataContractAddress);

        _registerFlight(STATUS_CODE_UNKNOWN, "FLT1", now, contractOwner);
        _registerFlight(STATUS_CODE_UNKNOWN, "FLT2", now + 1 days, contractOwner);
        _registerFlight(STATUS_CODE_UNKNOWN, "FLT3", now + 2 days, contractOwner);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational()
    public
    view
    returns (bool)
    {
        return operational;
        // Modify to call data contract's status
    }

    function setOperatingStatus
    (
        bool mode
    )
    external
    requireContractOwner
    {
        operational = mode;
        emit ContractOperationalStatus(operational);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/


    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerAirline
    (
        string airlineName
    )
    external
    returns (bool success, uint256 votes)
    {
        flightSuretyData.registerAirline(msg.sender, 0, airlineName);
        emit AirlineApplied(msg.sender);
        return (success, 0);
    }

    function approveAirlineRegistration
    (
        address airline
    )
    external
    onlyPaidAirlines
    returns (bool success, uint256 votes)
    {
        require(flightSuretyData.getAirlineState(airline) == 0, "Airline has not registered.");

        bool approved = false;
        uint256 approvedAirlineCount = flightSuretyData.getNumPaidAirlines();

        if (approvedAirlineCount < MIN_AIRLINE_FOR_CONSENSUS_VOTING) {
            //No consensus needed
            approved = true;
        } else {
            // Consensus needed
            votes = flightSuretyData.approveAirlineRegistration(airline, msg.sender);
            if (votes >= approvedAirlineCount / 2) {
                approved = true;
            }
        }

        if (approved) {
            flightSuretyData.updateAirlineState(airline, 1);
            emit AirlineRegistered(airline);
        }

        return (approved, votes);

    }

    function payAirlineDues() external payable onlyRegisteredAirlines
    {
        require(msg.value == AIRLINE_REGISTRATION_FEE, "Payment of 10 ether is required to complete registration.");

        dataContractAddress.transfer(msg.value);
        flightSuretyData.updateAirlineState(msg.sender, 2);

        emit AirlinePaid(msg.sender);
    }


    function _registerFlight
    (
        uint8 status, string flight, uint256 flightTime, address airline
    )
    private
    {
        bytes32 flightKey = getFlightKey(airline, flight, flightTime);
        flights[flightKey] = Flight(true, status, flightTime, airline, flight);
        flightKeyList.push(flightKey);
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight
    (
        uint8 status, string flight
    )
    external
    onlyPaidAirlines
    {
        _registerFlight(status, flight, now, msg.sender);
    }


    function getFlight(uint256 index) external view
    returns (address airline, string memory name, uint256 timestamp, uint8 statusCode)
    {
        airline = flights[flightKeyList[index]].airline;
        name = flights[flightKeyList[index]].name;
        timestamp = flights[flightKeyList[index]].updatedTimestamp;
        statusCode = flights[flightKeyList[index]].statusCode;
    }

    function getNumFlights() external view returns (uint256 count)
    {
        return flightKeyList.length;
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus
    (
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    )
    private
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        flights[flightKey].statusCode = statusCode;

        emit FlightStatusProcessed(airline, flight, statusCode);
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
    (
        address airline,
        string flight,
        uint256 timestamp
    )
    external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
            requester : msg.sender,
            isOpen : true
            });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    /**  Passengers */
    function buyInsurance(address airline, string flight, uint256 timestamp)
    external payable
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        require(bytes(flights[flightKey].name).length > 0, "Flight doesn't exist");
        require(msg.value <= MAX_INSURANCE_PREMIUM, "Passengers can pay a maximum premium of 1 ether");

        dataContractAddress.transfer(msg.value);

        uint256 payoutAmount = msg.value + msg.value / 2;

        flightSuretyData.buyInsurance(msg.sender, flight, msg.value, payoutAmount);

        emit PassengerInsuranceBought(msg.sender, flightKey);
    }

    function claimInsurance(address airline, string flight, uint256 timestamp) external
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        require(flights[flightKey].statusCode == STATUS_CODE_LATE_AIRLINE, "Flight was not late");

        flightSuretyData.creditInsuredPassenger(msg.sender, flight);
    }

    function getInsurance(string flight)
    external view
    returns (uint256 amount, uint256 payoutAmount, uint256 state)
    {
        return flightSuretyData.getInsurance(msg.sender, flight);
    }

    function getBalance()
    external view returns (uint256 balance)
    {
        balance = flightSuretyData.getInsureeBalance(msg.sender);
    }

    function withdrawBalance() external
    {
        flightSuretyData.payInsuredPassenger(msg.sender);
    }

    /** ORACLES */
    // Register an oracle with the contract
    function registerOracle
    (
    )
    external
    payable
    {
        // Require registration fee
        require(msg.value >= ORACLE_REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
            isRegistered : true,
            indexes : indexes
            });
        emit OracleRegistered(indexes, "Oracle has been registered.");
    }

    function getMyIndexes
    (
    )
    view
    external
    returns (uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
    (
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    )
    external
    {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
            (oracles[msg.sender].indexes[1] == index) ||
            (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }


    function getFlightKey
    (
        address airline,
        string flight,
        uint256 timestamp
    )
    pure
    internal
    returns (bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
    (
        address account
    )
    internal
    returns (uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
    (
        address account
    )
    internal
    returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;
            // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion

}

/************************************************** */
/* FlightSurety Data Smart Contract Interface       */
/************************************************** */

contract FlightSuretyData {
    function getAirlineState(address airline) external returns (uint);

    function registerAirline(address airlineAddress, uint8 state, string name) external;

    function updateAirlineState(address airlineAddress, uint8 state) external;

    function getNumPaidAirlines() external view returns (uint);

    function approveAirlineRegistration(address airline, address approver) external returns (uint8);

    function buyInsurance(address passenger, string flight, uint256 amount, uint256 payoutAmount) external;

    function creditInsuredPassenger(address insuree, string flight) external;

    function getInsureeBalance(address passenger) external view returns (uint256);

    function payInsuredPassenger(address passenger) external;

    function getInsurance(address passenger, string flight) external view returns (uint256 amount, uint256 payoutAmount, uint8 state);
}