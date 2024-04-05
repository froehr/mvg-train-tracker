// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: train;
let params = args.widgetParameter;

	// params = 'de:09162:2';
	// params = 'de:09162:1110,de:09162:2';
	// params = 'de:09187:90024,de:09162:5';
	// params = 'de:09162:5,de:09187:90024';
	// params = 'de:09162:1160,de:09162:470';

if (params == null) {
	console.log('Please set the origin and destination in widget parameter.')
	Script.complete();
	return;
}

const scriptName = 'TrainTracker';
const scriptUrl = 'https://raw.githubusercontent.com/froehr/train-tracker/main/connection.js';

let modulePath = await downloadModule(scriptName, scriptUrl); // jshint ignore:line
if (modulePath != null) {
	let importedModule = importModule(modulePath); // jshint ignore:line
	await importedModule.main(params); // jshint ignore:line
} else {
	console.log('Failed to download new module and could not find any local version.');
}

async function downloadModule(scriptName, scriptUrl) {
	// returns path of latest module version which is accessible
	let fm = FileManager.local();
	let scriptPath = module.filename;
	let moduleDir = scriptPath.replace(fm.fileName(scriptPath, true), scriptName);
	if (fm.fileExists(moduleDir) && !fm.isDirectory(moduleDir)) fm.remove(moduleDir);
	if (!fm.fileExists(moduleDir)) fm.createDirectory(moduleDir);
	let dayNumber = Math.floor(Date.now() / 1000 / 60 / 60 / 24);
	let moduleFilename = dayNumber.toString() + '.js';
	let modulePath = fm.joinPath(moduleDir, moduleFilename);
	if (fm.fileExists(modulePath)) {
		console.log('Module already downloaded ' + moduleFilename); 
		return modulePath;
	} else {
		let [moduleFiles, moduleLatestFile] = getModuleVersions(scriptName);
		console.log('Downloading ' + moduleFilename + ' from URL: ' + scriptUrl);
		let req = new Request(scriptUrl);
		let moduleJs = await req.load().catch(() => {
			return null;
		});
		if (moduleJs) {
			fm.write(modulePath, moduleJs);
			if (moduleFiles != null) {
				moduleFiles.map(x => {
					fm.remove(fm.joinPath(moduleDir, x));
				});
			}
			return modulePath;
		} else {
			console.log('Failed to download new module. Using latest local version: ' + moduleLatestFile);
			return (moduleLatestFile != null) ? fm.joinPath(moduleDir, moduleLatestFile) : null;
		}
	}
}

function getModuleVersions(scriptName) {
	// returns all saved module versions and latest version of them
	let fm = FileManager.local();
	let scriptPath = module.filename;
	let moduleDir = scriptPath.replace(fm.fileName(scriptPath, true), scriptName);
	let dirContents = fm.listContents(moduleDir);
	if (dirContents.length > 0) {
		let versions = dirContents.map(x => {
			if (x.endsWith('.js')) return parseInt(x.replace('.js', ''));
		});
		versions.sort(function(a, b) {
			return b - a;
		});
		versions = versions.filter(Boolean);
		if (versions.length > 0) {
			let moduleFiles = versions.map(x => {
				return x + '.js';
			});
			moduleLatestFile = versions[0] + '.js';
			return [moduleFiles, moduleLatestFile];
		}
	}
	return [null, null];
}
