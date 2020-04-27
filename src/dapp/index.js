import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async () => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error, result);
            display('Operational Status', 'Check if contract is operational', [{
                label: 'Operational Status',
                error: error,
                value: result
            }]);
        });

        //setup contract
        contract.authotizeOwner((error, result) => {
            display('Authorization Status', 'Set owner as authorized', [{
                label: 'Authorization Status',
                error: error,
                value: result
            }]);
        })

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                displayInContainer("oracle-wrapper",
                    [{
                        label: 'Fetch Flight Status',
                        error: error,
                        value: result.flight + ' ' + result.timestamp + ' ' + result.statusCode
                    }]);
            });
        })
        const flights = [];
        contract.getAllFlights((error, results) => {
            const purchaseInsuranceSelect = DOM.elid('buy-insurance-flights');
            let i = 0;
            results.forEach((flight) => {
                const option = document.createElement('option');
                option.value = `${i}-${flight.airline}-${flight.name}-${flight.timestamp}`;
                const prettyDate = new Date(flight.timestamp * 1000).toDateString();
                option.textContent = `${flight.name} on ${prettyDate}`;
                purchaseInsuranceSelect.appendChild(option);
                flights.push(flight)
                i++;
            });
        })

        DOM.elid('submit-buy-insurance').addEventListener('click', () => {
            let flight = DOM.elid('buy-insurance-flights').value.split('-')[0];
            let fee = DOM.elid('buy-insurance-amount').value;
            contract.buyInsurance(Number(flight), fee, (error, result) => {
                console.log(error, result)
                displayInContainer("buy-insurance-wrapper",
                    [{
                        label: 'Purchase insurance for a flight',
                        error: error,
                        value: result.flight + ' ' + result.timestamp + ' ' + result.statusCode + ' price: ' + result.amount + 'ETH -  payout-price: ' + result.payoutAmount + ' ETH'
                    }]);
            })

            contract.getAllPassengerInsurances(flights).then(insurances => {
                displayInContainer("bought-insurance-wrapper", [{
                    label: 'Insurances Bought',
                    value: JSON.stringify(insurances)
                }])
            })
        })

        DOM.elid('flight-status-refresh').addEventListener('click', () => {
            contract.getAllFlights((error, results) => {
                displayInContainer("flight-status-wrapper", [{
                    label: 'Flight Statuses',
                    value: JSON.stringify(results)
                }])
            })
        })

        DOM.elid('submit-claim').addEventListener('click', () => {
            let flight = DOM.elid('flight-number-claim').value;
            // Write transaction
            contract.claimInsurance(Number(flight), (error, result) => {
                displayInContainer("claim-insurance-wrapper",
                    [{
                        label: 'Claim Insurance Result',
                        error: error,
                        value: result
                    }]);

            });

            contract.getBalance((error, balance) =>{
                    displayInContainer("claim-insurance-wrapper",
                        [{
                            label: 'Amount Balance',
                            error: error,
                            value: balance
                        }]);
                }
            );
        })

        DOM.elid('submit-withdraw').addEventListener('click', () => {
            contract.withdrawBalance((error, result) => {
                displayInContainer("withdraw-wrapper",
                    [{
                        label: 'Claim Insurance Result',
                        error: error,
                        value: result
                    }]);

            });

            contract.getBalance((error, balance) =>{
                    displayInContainer("claim-insurance-wrapper",
                        [{
                            label: 'Amount Balance',
                            error: error,
                            value: balance
                        }]);
                }
            );
        })

    });





})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    appendResultsToDivSection(results, section, displayDiv)
}

function appendResultsToDivSection(results, section, displayDiv) {
    results.map((result) => {
        let row = section.appendChild(DOM.div({className: 'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);
}

function displayInContainer(containerId, results) {
    let displayDiv = DOM.elid(containerId);
    let section = DOM.section();
    appendResultsToDivSection(results, section, displayDiv);

}








