// Variables used by Scriptable.
// jshint -W119

async function main(widgetParams) {
	const currentDateTime = new Date();
	const currentConnections = await loadConnections(widgetParams.originId, widgetParams.destinationId, currentDateTime);

	let widget = new ListWidget();
	widget.setPadding(10, 0, 0, 0);
	widget.backgroundColor = new Color('#364c90'); 

	let addedConnectionsCounter = 0;
	currentConnections.forEach(connection => {
		if(connection.parts.length > 2) {
			return;
		}

		if (addedConnectionsCounter >= 4) {
			return;
		} else {
			addedConnectionsCounter++;
		}

		sanitizedConnection = prepareConnection(connection);
		var stack = widget.addStack();
		stack.spacing = 10;

		sanitizedConnection.forEach(function(part, idx){
			let stationText;
			let lineText;

			if (idx === 0) {
				stationText = stack.addText(part.arrivalPlatform + ' ' + part.place + ' ' + part.departurePlatform + '\n' + part.departureTime + part.departureDelay);
				lineText = stack.addText(part.departureLineLabel + '\n' + part.departureLineDestination);	
			}

			if (idx > 0 && idx !== sanitizedConnection.length - 1) {
				stationText = stack.addText(part.arrivalPlatform + ' ' + part.place + ' ' + part.departurePlatform + '\n' + part.arrivalTime + part.arrivalDelay + ' → ' + part.departureTime + part.departureDelay);
				lineText = stack.addText(part.departureLineLabel + '\n' + part.departureLineDestination);
			}

			if (idx === sanitizedConnection.length - 1){ 
				stationText = stack.addText(part.arrivalPlatform + ' ' + part.place + '\n' + part.arrivalTime + part.arrivalDelay);				
			}

			setTextStyle(stationText);
			setTextStyle(lineText);
		 });

		widget.addSpacer(15);
	});
	
	let value = (config.runsInWidget) ? Script.setWidget(widget) : await widget.presentMedium();
	Script.complete();
}

function sanitizeStationNames(stationName) {
	let sanitizedStationName = stationName;

	sanitizedStationName = sanitizedStationName.replace(/München,/g,'MUC');
	sanitizedStationName = sanitizedStationName.replace(/München/g,'MUC');
	sanitizedStationName = sanitizedStationName.replace(/Bahnhof/g,'B.');
	sanitizedStationName = sanitizedStationName.replace(/bahnhof/g,'b.');
	sanitizedStationName = sanitizedStationName.substring(0, 10);
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
		return '？';
	}

	if (transportationType == "UBAHN") {
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
		if (typeof currentPart !== 'undefined') {
			part.place = sanitizeStationNames(currentPart.from.name);
			part.departurePlatform = sanitizePlatform(currentPart.from.platform, currentPart.line.transportType);
			part.departureTime = sanitizeDate(currentPart.from.plannedDeparture);
			part.departureDelay = sanitizeDelay(currentPart.from.departureDelayInMinutes);
			part.departureLineLabel = currentPart.line.label;
			part.departureLineDestination = sanitizeStationNames(currentPart.line.destination);
		} else {
			part.place = sanitizeStationNames(previousPart.to.name);
		}

		result.push(part)
    }
	return result;
}

function setTextStyle(text) {
	const widgetFont = Font.regularMonospacedSystemFont(8);
	if (typeof text !== 'undefined') {
		text.lineLimit = 2;
		text.font = widgetFont;
		text.centerAlignText();
		text.textColor = Color.white();
	}
}

async function loadConnections(origin, destination, currentDateTime) {
    const url = 'https://www.mvg.de/api/fib/v2/connection?originStationGlobalId=' + origin + '&destinationStationGlobalId=' + destination + '&routingDateTime=' + currentDateTime.toISOString() + '&routingDateTimeIsArrival=false&transportTypes=BAHN,UBAHN,TRAM,SBAHN,BUS,REGIONAL_BUS'
    const req = new Request(url);
    return await req.loadJSON();
}

module.exports = {
	main
};
