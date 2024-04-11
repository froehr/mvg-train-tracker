// jshint -W119
// Variables used by Scriptable.

const globalMaxLengthPlaceName = 10;
const gloablMaxNumberTrainChange = 2;
const globalBackgroundColor = new Color('#364c90');

const globalHeadlineSpacerSize = 4;
const globalColumnSpacerSize = 10;
const globalRowSpacerSize = 8;

const globalMaxLines1x1Departures = 12;
const globalMaxLines2x1Departures = 24;
const globalMaxLines1x2Connections = 12;
const globalMaxLines2x2Connections = 8;

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

    // Check in what size the widget will be presented to adjust the content to it
    let widgetSize = (config.runsInWidget) ? config.widgetFamily : 'medium';

    // Create empty widget
    let widget = new ListWidget();
    widget.backgroundColor = globalBackgroundColor;

    let stackRaster;
    const currentDateTime = new Date();

    switch(functionKey) {
        case 'CONNECTION':
            stackRaster = buildStackRaster(widget, widgetSize, functionKey, parameterJson.connections.length, stackRaster);
            await buildConnectionsWidget(parameterJson.connections, widget, currentDateTime, stackRaster);
            break;
        case 'DEPARTURE':
            stackRaster = buildStackRaster(widget, widgetSize, functionKey, parameterJson.departures.length);
            await buildDepartureWidget(parameterJson.departures, widget, stackRaster);
            break;
        case 'MESSAGE':
            console.log('Not implemented yet.');
            break;
        default:
            console.log('Please provide a valid functionKey.');
    }
    return;
}

async function buildConnectionsWidget(connections, widget, currentDateTime, stackRaster) {
    for (let [index, connection] of connections.entries()) {
        const rasterPart = stackRaster[index];
        const originId = connection.originId;
        const destinationId = connection.destinationId;
        const transportationTypeFilter = destinationId.transportationTypeFilter;
        
        // Load origin and destination station from MVG API to show name in heading
        const originStation = await loadStation(originId);
        const destinationStation = await loadStation(destinationId);
        
        // Add headline for Widget
        const headingStack = rasterPart.headline;
        let headingText = headingStack.addText('Verbindungen ' + sanitizeStationName(originStation.name) + ' → ' + sanitizeStationName(destinationStation.name));
        setTextStyle(headingText, globalHeadingTextStyle);

        // Load connections from MVG API
        const connections = await loadConnections(originId, destinationId, currentDateTime, transportationTypeFilter);
        const preparedConnections = [];

        connections.forEach(connection => {
            // Exclude conncetions with too many train changes
            if(connection.parts.length > gloablMaxNumberTrainChange) {
                return;
            }
            preparedConnections.push(prepareConnection(connection))
        })

        rasterPart.content.forEach(contentStack => {
            const connectionsSubset = preparedConnections.splice(0, rasterPart.maxLines);
            addConnectionsToStack(contentStack, connectionsSubset);
        });
    }

    let value = (config.runsInWidget) ? Script.setWidget(widget) : await widget.presentMedium();
    Script.complete();
}

async function buildDepartureWidget(departures, widget, stackRaster) {
    for (let [index, departure] of departures.entries()) {
        const rasterPart = stackRaster[index];
        const originId = departure.originId;
        const transportationTypeFilter = departure.transportationTypeFilter;
        
        // Load origin station from MVG API to show name in heading
        const originStation = await loadStation(originId);

        // Add headline for Widget
        const headingStack = rasterPart.headline;
        let headingText = headingStack.addText(originStation.name);
        setTextStyle(headingText, globalHeadingTextStyle);

        // Load departures from MVG API
        const currentDepartures = await loadDepartures(originId, transportationTypeFilter);

        rasterPart.content.forEach(contentStack => {
            const departuresSubset = currentDepartures.splice(0, rasterPart.maxLines);
            addDeparturesToStack(contentStack, departuresSubset);
        });
    }

    widget.addSpacer();

    let value = (config.runsInWidget) ? Script.setWidget(widget) : await widget.presentMedium();
    Script.complete();
}

function addDeparturesToStack(stack, departures){
    departures.forEach(departure => {
        // Add departureText to show the sanitized data
        const time = sanitizeDate(departure.realtimeDepartureTime);
        const platform = sanitizePlatform(departure.platform, departure.transportType);
        const line = sanitizeLine(departure.label, departure.transportType);
        const destination = sanitizeStationName(departure.destination, 12);
        let departureText = stack.addText(time + ' ' + platform + ' ' + line + ' → ' + destination);
        setTextStyle(departureText, globalRegularTextStyle);
    });
}

function addConnectionsToStack(connectionsStack, connections) {
    // Iterate through all connections
    connections.forEach(connection => {
        // Iterate through all parts of each connection
        const stack = connectionsStack.addStack();
        connection.forEach(function(part, idx){
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
            if (idx > 0 && idx !== connection.length - 1) {
                stationText = stack.addText(part.arrivalPlatform + ' ' + part.place + ' ' + part.departurePlatform + '\n' + part.arrivalTime + part.arrivalDelay + ' → ' + part.departureTime + part.departureDelay);
                stack.addSpacer(5);
                lineText = stack.addText(part.departureLineLabel + '\n' + part.departureLineDestination);
                stack.addSpacer(5);
            }
    
            // Present the last part of the connection
            if (idx === connection.length - 1){
                stationText = stack.addText(part.arrivalPlatform + ' ' + part.place + '\n' + part.arrivalTime + part.arrivalDelay);
            }
    
            // Set styles for the texts that were created
            setTextStyle(stationText, globalRegularTextStyle);
            setTextStyle(lineText, globalRegularTextStyle);
        });
    })
    
}

function buildStackRaster(widget, widgetSize, functionKey, numberOfElements) {
    const mainStack = widget.addStack();
    let headline, content, contentLeft, contentRight;

    if (widgetSize == 'small' && functionKey == 'DEPARTURE' && numberOfElements == 1) {
        ({headline, content} = addHeadlineAndElementStacks(mainStack));
        return [{headline, 'content': [content], 'maxLines': globalMaxLines1x1Departures}]
    }    
    
    if (widgetSize == 'medium' && functionKey == 'DEPARTURE' && numberOfElements == 1) {
        ({headline, contentLeft, contentRight} = addHeadlineAndTwoElementStacks(mainStack));
        return [{headline, 'content': [contentLeft, contentRight], 'maxLines': globalMaxLines1x1Departures}]
    }

    if (widgetSize == 'medium' && functionKey == 'DEPARTURE' && numberOfElements == 2) {
        let result = [];
        for (let i = 0; i < numberOfElements; i++) {
            ({headline, content} = addHeadlineAndElementStacks(mainStack));
            result.push({headline, 'content': [content], 'maxLines': globalMaxLines1x1Departures});
        }
        return result;
    }    

    if (widgetSize == 'medium' && functionKey == 'CONNECTION' && numberOfElements == 1) {
        ({headline, content} = addHeadlineAndElementStacks(mainStack));
        return [{headline, 'content': [content], 'maxLines': globalMaxLines1x2Connections}]
    }

    if (widgetSize == 'large' && functionKey == 'DEPARTURE' && numberOfElements == 1) {
        ({headline, contentLeft, contentRight} = addHeadlineAndTwoElementStacks(mainStack));
        return [{headline, 'content': [contentLeft, contentRight], 'maxLines': globalMaxLines2x1Departures}]
    }

    if (widgetSize == 'large' && functionKey == 'DEPARTURE' && numberOfElements == 2) {
        let result = [];
        for (let i = 0; i < numberOfElements; i++) {
            ({headline, content} = addHeadlineAndElementStacks(mainStack));
            result.push({headline, 'content': [content], 'maxLines': globalMaxLines2x1Departures});
        }
        return result;
    }

    if (widgetSize == 'large' && functionKey == 'DEPARTURE' && numberOfElements == 3) {
        const leftStack = mainStack.addStack();
        leftStack.layoutVertically();
        mainStack.addSpacer(globalRowSpacerSize);
        const rightStack = mainStack.addStack();
        rightStack.layoutVertically();
        let result = [];
        ({headline, content} = addHeadlineAndElementStacks(leftStack));
        result.push({headline, 'content': [content], 'maxLines': globalMaxLines2x1Departures});
        for (let i = 0; i < 2; i++) {
            ({headline, content} = addHeadlineAndElementStacks(rightStack));
            result.push({headline, 'content': [content], 'maxLines': globalMaxLines1x1Departures});
        }
        return result;
    }

    if (widgetSize == 'large' && functionKey == 'DEPARTURE' && numberOfElements == 4) {
        const leftStack = mainStack.addStack();
        leftStack.layoutVertically();
        mainStack.addSpacer(globalColumnSpacerSize);
        const rightStack = mainStack.addStack();
        rightStack.layoutVertically();
        let result = [];
        for (let i = 0; i < 2; i++) {
            ({headline, content} = addHeadlineAndElementStacks(leftStack));
            result.push({headline, 'content': [content], 'maxLines': globalMaxLines1x1Departures});
        }
        for (let i = 0; i < 2; i++) {
            ({headline, content} = addHeadlineAndElementStacks(rightStack));
            result.push({headline, 'content': [content], 'maxLines': globalMaxLines1x1Departures});
        }
        return result;
    }

    if (widgetSize == 'large' && functionKey == 'CONNECTION' && numberOfElements == 1) {
        ({headline, content} = addHeadlineAndElementStacks(mainStack));
        return [{headline, 'content': [content], 'maxLines': globalMaxLines2x2Connections}]
    }

    if (widgetSize == 'large' && functionKey == 'CONNECTION' && numberOfElements == 2) {
        let result = [];
        for (let i = 0; i < numberOfElements; i++) {
            ({headline, content} = addHeadlineAndElementStacks(mainStack));
            result.push({headline, 'content': [content]});
        }
        return result;
    }
}

function addHeadlineAndElementStacks(parentStack) {
    const elementStack = parentStack.addStack();
    elementStack.layoutVertically();
    
    const headline = elementStack.addStack();
    elementStack.addSpacer(globalHeadlineSpacerSize);
    
    const content = elementStack.addStack();
    content.layoutVertically();
    elementStack.addSpacer(globalRowSpacerSize);

    return {headline, content};
}

function addHeadlineAndTwoElementStacks(parentStack) {
    const elementStack = parentStack.addStack();
    elementStack.layoutVertically();
    
    const headline = elementStack.addStack();
    elementStack.addSpacer(globalHeadlineSpacerSize);
    
    const contentContainer = elementStack.addStack();
    const contentLeft = contentContainer.addStack();
    contentLeft.layoutVertically();
    contentContainer.addSpacer(globalColumnSpacerSize);
    
    const contentRight = contentContainer.addStack();
    contentRight.layoutVertically();

    return {headline, contentLeft, contentRight};
}

function sanitizeStationName(stationName, maxLength) {
    let sanitizedStationName = stationName;

    sanitizedStationName = sanitizedStationName.replace(/München,/g,'MUC');
    sanitizedStationName = sanitizedStationName.replace(/München/g,'MUC');
    sanitizedStationName = sanitizedStationName.replace(/Bahnhof/g,'B.');
    sanitizedStationName = sanitizedStationName.replace(/bahnhof/g,'b.');
    sanitizedStationName = sanitizedStationName.replace(/via Am Harras U/g,'');

    if(typeof maxLength !== 'undefined') {
        sanitizedStationName = sanitizedStationName.substring(0, maxLength);
    } else {
        sanitizedStationName = sanitizedStationName.substring(0, globalMaxLengthPlaceName);
    }
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
            part.place = sanitizeStationName(currentPart.from.name);
            part.departurePlatform = sanitizePlatform(currentPart.from.platform, currentPart.line.transportType);
            part.departureTime = sanitizeDate(currentPart.from.plannedDeparture);
            part.departureDelay = sanitizeDelay(currentPart.from.departureDelayInMinutes);
            part.departureLineLabel = currentPart.line.label;
            part.departureLineDestination = sanitizeStationName(currentPart.line.destination);
        
            // When currentPart == undefined -> iteration is one step outside of array and can only look at the previous element
        } else {
            part.place = sanitizeStationName(previousPart.to.name);
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

async function loadConnections(origin, destination, currentDateTime, transportationTypeFilter) {
    if (typeof transportationTypeFilter === 'undefined' || transportationTypeFilter === '') {
        transportationTypeFilter = 'BAHN,UBAHN,TRAM,SBAHN,BUS,REGIONAL_BUS';
    }
    const url = globalMvgApiBaseUrl + '/connection?originStationGlobalId=' + origin + '&destinationStationGlobalId=' + destination + '&routingDateTime=' + currentDateTime.toISOString() + '&routingDateTimeIsArrival=false&transportTypes=' + transportationTypeFilter;
    const req = new Request(url);
    return await req.loadJSON();
}

async function loadDepartures(origin, transportationTypeFilter) {
    if (typeof transportationTypeFilter === 'undefined' || transportationTypeFilter === '') {
        transportationTypeFilter = 'BAHN,UBAHN,TRAM,SBAHN,BUS,REGIONAL_BUS';
    }
    const url = globalMvgApiBaseUrl + '/departure?globalId=' + origin + '&transportTypes=' + transportationTypeFilter;
    const req = new Request(url);
    return await req.loadJSON();
}

async function loadStation(stationId) {
    const url = globalMvgApiBaseUrl + '/station/' + stationId;
    const req = new Request(url);
    return await req.loadJSON();
}

module.exports = {
    main
};
