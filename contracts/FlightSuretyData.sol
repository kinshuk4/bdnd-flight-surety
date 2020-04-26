pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    struct Airline {
        string name;
        address airlineAddress;
        AirlineState state;

        mapping(address => bool) approvals;
        uint8 approvalCount;
    }

    enum AirlineState {
        Applied,
        Registered,
        Paid
    }

    struct Insurance {
        string flight;
        uint256 amount;
        uint256 payoutAmount;
        InsuranceState state;
    }

    enum InsuranceState {
        Bought,
        Credited
    }

    mapping(address => bool) private authorizedAppContracts;
//    address[]  authorizedAppContractList;
    mapping(address => Airline) internal airlines;
    mapping(address => mapping(string => Insurance)) private insurances;
    mapping(address => uint256) private insureeBalances;
    uint256 internal paidAirlinesCount = 0;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
    (
    )
    public
    {
        contractOwner = msg.sender;
        authorizedAppContracts[msg.sender] = true;
//        authorizedAppContractList.push(msg.sender);
        airlines[contractOwner] = Airline("First Airline", contractOwner, AirlineState.Paid, 0);
        paidAirlinesCount = 1;
    }

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

    modifier requireAuthorizedCaller()
    {
        require(authorizedAppContracts[msg.sender] || (msg.sender == contractOwner), "Caller is not authorised");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational()
    public
    view
    returns (bool)
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus
    (
        bool mode
    )
    external
    requireContractOwner
    {
        operational = mode;
    }

    function setAppContractAuthorizationStatus(address appContract, bool status) external requireContractOwner
    {
        authorizedAppContracts[appContract] = status;
    }

    function getAppContractAuthorizationStatus(address caller) public view requireContractOwner returns (bool)
    {
        return authorizedAppContracts[caller];
    }

    function authorizeCaller(address appContract) external requireContractOwner
    {
        authorizedAppContracts[appContract] = true;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    // CRUD operations for airline
    function registerAirline
    (
        address airlineAddress, uint8 state, string name
    )
    external
    requireAuthorizedCaller
    {
        airlines[airlineAddress] = Airline(name, airlineAddress, AirlineState(state), 0);
    }

    function updateAirlineState(address airlineAddress, uint8 state)
    external requireAuthorizedCaller
    {
        airlines[airlineAddress].state = AirlineState(state);
        if (state == 2) {
            paidAirlinesCount++;
        }
    }

    function getAirlineState(address airline)
    external view
    requireAuthorizedCaller
    returns (AirlineState)
    {
        return airlines[airline].state;
    }

    function getNumPaidAirlines()
    external view
    requireAuthorizedCaller
    returns (uint256)
    {
        return paidAirlinesCount;
    }

    //approving to-be-registered airline by existing airline.
    function approveAirlineRegistration
    (
        address registeringAirline, address approvingAirline
    )
    external
    requireAuthorizedCaller
    returns (uint8)

    {
        require(!airlines[registeringAirline].approvals[approvingAirline], "Airline is already approved by the caller.");

        airlines[registeringAirline].approvals[approvingAirline] = true;
        //incrementing number of approvals for the registration.
        airlines[registeringAirline].approvalCount++;

        return airlines[registeringAirline].approvalCount;
    }



    /**
     * @dev Buy insurance for a flight
     *
     */
    function buyInsurance
    (
        address insuree, string flight, uint256 amount, uint256 payoutAmount
    )
    external
    requireAuthorizedCaller
    {
        require(insurances[insuree][flight].amount != amount, "Insuree already insured");
        insurances[insuree][flight] = Insurance(flight, amount, payoutAmount, InsuranceState.Bought);
    }

    function getInsurance(address insuree, string flight)
    external view requireAuthorizedCaller
    returns (uint256 amount, uint256 payoutAmount, InsuranceState state)
    {
        amount = insurances[insuree][flight].amount;
        payoutAmount = insurances[insuree][flight].payoutAmount;
        state = insurances[insuree][flight].state;
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsuredPassenger
    (
        address insuree, string flight
    )
    external
    requireAuthorizedCaller
    {
        //Checks
        require(insurances[insuree][flight].state == InsuranceState.Bought);
        //Effects
        insurances[insuree][flight].state = InsuranceState.Credited;
        //Interaction
        insureeBalances[insuree] = insureeBalances[insuree] + insurances[insuree][flight].payoutAmount;
    }


    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function payInsuredPassenger
    (
        address insuree
    )
    external
    requireAuthorizedCaller
    {
        //Checks
        require(insureeBalances[insuree] > 0, "Insuree doesn't have enough funds");
        //Effects
        insureeBalances[insuree] = 0;
        //Interaction
        insuree.transfer(insureeBalances[insuree]);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund
    (
    )
    public
    payable
    {
    }

    function getFlightKey
    (
        address airline,
        string memory flight,
        uint256 timestamp
    )
    pure
    internal
    returns (bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function()
    external
    payable
    {
        fund();
    }


}

