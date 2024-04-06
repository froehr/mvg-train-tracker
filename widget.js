// Variables used by Scriptable.
// jshint -W119

const globalMaxLengthPlaceName = 10;
const gloablMaxNumberTrainChange = 2;
const globalBackgroundColor = new Color('#364c90');
const globalMaxNumberOfShownConnections = 4;
const globalMaxNumberOfShownDepartures = 12;

const globalMvgApiBaseUrl = 'https://www.mvg.de/api/fib/v2';

const globalHeadingTextStyle = {
    'color': Color.white(),
    'font': Font.semiboldMonospacedSystemFont(12),
    'lineLimit': 1,
    'alignment': 'LEFT'
}

const globalRegularTextStyle = {
    'color': Color.white(),
    'font': Font.regularMonospacedSystemFont(8),
    'lineLimit': 2,
    'alignment': 'CENTER'
}

async function main(parameterJson) {
    const functionKey = parameterJson.functionKey;
    if (typeof functionKey === "undefined") {
        console.log("Please specify the functionKey.")
        return;
    }

    // Create empty widget
    let widget = new ListWidget();
    widget.backgroundColor = globalBackgroundColor;

    const currentDateTime = new Date();

    switch(functionKey) {
        case 'CON_SINGLE':
            await buildConnectionsWidget(parameterJson.connections[0].originId, parameterJson.connections[0].destinationId, currentDateTime, widget);
            break;
        case 'CON_DOUBLE':
            console.log('Not implemented yet.')
            break;
        case 'DEP_SINGLE':
            await buildDepartureWidget(parameterJson.departureIds[0], widget);
            break;
        case 'DEP_DOUBLE':
            console.log('Not implemented yet.')
            break;
        case 'DEP_QUADRUPLE':
            console.log('Not implemented yet.')
            break;
        case 'MES_LINE':
            console.log('Not implemented yet.')
            break;
        default:
            console.log('Please provide a valid functionKey.')
    }
    
    return;
}

async function buildConnectionsWidget(originId, destinationId, currentDateTime, widget) {
    // Load origin and destination station from MVG API to show name in heading
    const originStation = await loadStation(originId);
    const destinationStation = await loadStation(destinationId);
    
    // Add headline for Widget
    const headingStack = widget.addStack()
    let headingText = headingStack.addText('Verbindungen ' + sanitizeStationNames(originStation.name) + ' → ' + sanitizeStationNames(destinationStation.name));
    setTextStyle(headingText, globalHeadingTextStyle);
    widget.addSpacer(4);
    
    // Build container stack for connections data
    const connectionsContainerStack = widget.addStack();
    connectionsContainerStack.layoutVertically();
    connectionsContainerStack.spacing = 7;

    // Load connections from MVG API
    const currentConnections = await loadConnections(originId, destinationId, currentDateTime);
    let addedConnectionsCounter = 0;

    // Iterate through all connections
    currentConnections.forEach(connection => {
        
        // Limit the number of connections to fit on screen
        if (addedConnectionsCounter >= globalMaxNumberOfShownConnections) {
            return;
        }

        // Exclude conncetions with too many train changes
        if(connection.parts.length > gloablMaxNumberTrainChange) {
            return;
        }

        var stack = connectionsContainerStack.addStack();
        stack.spacing = 2;
        
        // Prepare connections so that it can be displayed easily
        const preparedConnection = prepareConnection(connection);

        // Iterate through the parts of this connections
        preparedConnection.forEach(function(part, idx){
            let stationText;
            let lineText;

            // Present the first part of the connection
            if (idx === 0) {
                stationText = stack.addText(part.place + ' ' + part.departurePlatform + '\n' + part.departureTime + part.departureDelay);
                stack.addSpacer(5);
                lineText = stack.addText(part.departureLineLabel + '\n' + part.departureLineDestination);
                stack.addSpacer(5);
            }

            // Present intermediate parts of the connection
            if (idx > 0 && idx !== preparedConnection.length - 1) {
                stationText = stack.addText(part.arrivalPlatform + ' ' + part.place + ' ' + part.departurePlatform + '\n' + part.arrivalTime + part.arrivalDelay + ' → ' + part.departureTime + part.departureDelay);
                stack.addSpacer(5);
                lineText = stack.addText(part.departureLineLabel + '\n' + part.departureLineDestination);
                stack.addSpacer(5);
            }

            // Present the last part of the connection
            if (idx === preparedConnection.length - 1){
                stationText = stack.addText(part.arrivalPlatform + ' ' + part.place + '\n' + part.arrivalTime + part.arrivalDelay);
            }

            // Set styles for the texts that were created
            setTextStyle(stationText, globalRegularTextStyle);
            setTextStyle(lineText, globalRegularTextStyle);
        });

        addedConnectionsCounter++;
    });

    let value = (config.runsInWidget) ? Script.setWidget(widget) : await widget.presentMedium();
    Script.complete();
}

async function buildDepartureWidget(originId, widget) {
    // Load origin station from MVG API to show name in heading
    const originStation = await loadStation(originId);
    
    // Add headline for Widget
    const headingStack = widget.addStack()
    let headingText = headingStack.addText('Abfahrten ' + originStation.name);
    setTextStyle(headingText, globalHeadingTextStyle);
    widget.addSpacer(10);

    // Build container stack with two sub containers next to each other
    const departuresContainerStack = widget.addStack();
    const departuresStackLeft = departuresContainerStack.addStack();
    departuresStackLeft.layoutVertically();
    departuresStackLeft.spacing = 10;
    departuresContainerStack.addSpacer(20);
    const departuresStackRight = departuresContainerStack.addStack();
    departuresStackRight.layoutVertically();
    departuresStackRight.spacing = 10;

    // Load departures from MVG API
    const currentDepartures = await loadDepartures(originId, 10);

    let departuresCounter = 0;
    currentDepartures.forEach(departure => {
        // Limit the number of departures to fit on screen
        if (departuresCounter >= globalMaxNumberOfShownDepartures) {
            return;
        }

        // Create new departure Stack on left or right side of the widget
        let stack;
        if (departuresCounter < globalMaxNumberOfShownDepartures / 2) {
            stack = departuresStackLeft.addStack();
        } else {
            stack = departuresStackRight.addStack();
        }

        // Add departureText to show the sanitized data
        const time = sanitizeDate(departure.realtimeDepartureTime);
        const platform = sanitizePlatform(departure.platform, departure.transportType);
        const line = sanitizeLine(departure.label, departure.transportType);
        const destination = departure.destination;
        let departureText = stack.addText(time + ' ' + platform + ' ' + line + ' → ' + destination);
        setTextStyle(departureText, globalRegularTextStyle);

        // Count departure so that max number is not exceeded
        departuresCounter++;
    });

    widget.addSpacer();

    let value = (config.runsInWidget) ? Script.setWidget(widget) : await widget.presentMedium();
    Script.complete();
}

function sanitizeStationNames(stationName) {
    let sanitizedStationName = stationName;

    sanitizedStationName = sanitizedStationName.replace(/München,/g,'MUC');
    sanitizedStationName = sanitizedStationName.replace(/München/g,'MUC');
    sanitizedStationName = sanitizedStationName.replace(/Bahnhof/g,'B.');
    sanitizedStationName = sanitizedStationName.replace(/bahnhof/g,'b.');
    sanitizedStationName = sanitizedStationName.substring(0, globalMaxLengthPlaceName);
    sanitizedStationName.trim();

    return sanitizedStationName;
}

function sanitizeDelay(delay) {
    if (typeof delay !== 'undefined' && delay != 0) {
        if (delay < 0) {
            return ' ' + delay;
        }
        return ' +' + delay;
    }
    return '';
}

function sanitizePlatform(platform, transportationType) {
    if (typeof platform == 'undefined') {
        return '';
    }

    // Don't show anything for these transportation types as they don't have a platform
    if (transportationType == 'UBAHN' || transportationType == 'PEDESTRIAN' || transportationType == 'BUS') {
        return '';
    }

    const digits = String(platform);
    const emojiDigits = {
        '0': '⓪',
        '1': '⓵',
        '2': '⓶',
        '3': '⓷',
        '4': '⓸',
        '5': '⓹',
        '6': '⓺',
        '7': '⓻',
        '8': '⓼',
        '9': '⓽'
    };

    let result = '';
    for (let i = 0; i < digits.length; i++) {
        const digit = digits[i];
        result += emojiDigits[digit];
    }
    return result;
}

function sanitizeDate(date) {
    return new Date(date).toLocaleTimeString().slice(0,5);
}

function sanitizeLine(label, transportType) {
    switch(transportType) {
        case 'BUS':
            return 'B' + label;
        case 'TRAM':
            return 'T' + label;
        default:
            return label;
    }    
}

// This function iterates over the separate parts of a connection so that adjacent parts can be combined. 
// This way it is possible to show arrival and departure platform as on part.
function prepareConnection(connection) {
    let result = [];

    for (let i = 0; i <= connection.parts.length; i++) {
        let part = {};

        part.arrivalPlatform = '';
        part.arrivalTime = '';
        part.arrivalDelay = '';

        let previousPart = 'undefined';
        if(i > 0) {
            previousPart = connection.parts[i-1];
            part.arrivalPlatform = sanitizePlatform(previousPart.to.platform, previousPart.line.transportType);
            part.arrivalTime = sanitizeDate(previousPart.to.plannedDeparture);
            part.arrivalDelay = sanitizeDelay(previousPart.to.arrivalDelayInMinutes);
        }

        const currentPart = connection.parts[i];

        // When currentPart !== undefined -> iteration is still inside array
        if (typeof currentPart !== 'undefined') {
            part.place = sanitizeStationNames(currentPart.from.name);
            part.departurePlatform = sanitizePlatform(currentPart.from.platform, currentPart.line.transportType);
            part.departureTime = sanitizeDate(currentPart.from.plannedDeparture);
            part.departureDelay = sanitizeDelay(currentPart.from.departureDelayInMinutes);
            part.departureLineLabel = currentPart.line.label;
            part.departureLineDestination = sanitizeStationNames(currentPart.line.destination);
        
            // When currentPart == undefined -> iteration is one step outside of array and can only look at the previous element
        } else {
            part.place = sanitizeStationNames(previousPart.to.name);
        }
        result.push(part)
    }

    return result;
}

function setTextStyle(text, style) {
    if (typeof text !== 'undefined') {
        text.lineLimit = style.lineLimit;
        text.font = style.font;
        text.textColor = style.color;

        switch(style.alignment) {
            case 'LEFT':
                text.leftAlignText();
                break;
            case 'CENTER':
                text.centerAlignText();
                break
            case 'RIGHT':
                text.rightAlignText();
                break;
            default:
                text.centerAlignText();
        }
    }
}

async function loadConnections(origin, destination, currentDateTime) {
        const url = globalMvgApiBaseUrl + '/connection?originStationGlobalId=' + origin + '&destinationStationGlobalId=' + destination + '&routingDateTime=' + currentDateTime.toISOString() + '&routingDateTimeIsArrival=false&transportTypes=BAHN,UBAHN,TRAM,SBAHN,BUS,REGIONAL_BUS';
        const req = new Request(url);
        return await req.loadJSON();
}

async function loadDepartures(origin, limit) {
        const url = globalMvgApiBaseUrl + '/departure?globalId=' + origin + '&limit=' + limit;
        const req = new Request(url);
        return await req.loadJSON();
}

async function loadStation(stationId) {
        const url = globalMvgApiBaseUrl + '/station/' + stationId;
        const req = new Request(url);
        return await req.loadJSON();
}

function parseWidgetParams(params) {
    const paramArray = params.split(',');

    if( paramArray.length === 1 ) {
        return {originId: paramArray[0]}
    }

    if( paramArray.length === 2 ) {
        return {originId: paramArray[0], destinationId: paramArray[1]}
    }
}

module.exports = {
    main
};
