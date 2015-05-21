var defaultSettings	= {
	leagueInstallDir: "C:\\Riot Games",
	garenaInstallDir: "C:\\Program Files (x86)\\GarenaLoL",
	syncMode: false,
	showFrequent: false,
	showHighWin: true,
	showStarters: true,
	showConsumables: true,
	showSkillOrder: true,
	removeOldSets: true,
	starterSkillsToShow: 5,
	leagueItemsetDir: "\\League of Legends\\Config\\Champions\\",
	garenaItemsetDir: "\\GameData\\Apps\\LoL\\Game\\Config\\Champions\\",
	garenaRegion: false
};
var settings = settings || defaultSettings;
var App = {
	count: {started: 0, finished: 0},
	patch: "",
	errorData: {flag: false, msg: false},
	queue: [],
	garenaDirValid: false,
	leagueDirValid: false,
	mode: "",
	ini: function () {
        "use strict";
		// App.rmdir("locales");
		App.applySettings();
		App.writeSettings();
		GUI.ini();
	},
	applySettings: function () {
        "use strict";
		document.getElementById("frequent").checked = settings.showFrequent;
		document.getElementById("winrate").checked = settings.showHighWin;
		document.getElementById("starters").checked = settings.showStarters;
		document.getElementById("consumables").checked = settings.showConsumables;
		document.getElementById("remove_old").checked = settings.removeOldSets;
		document.getElementById("garena").checked = settings.garenaRegion;
		document.getElementById("slowmode").checked = settings.syncMode;
	},
	syncSettings: function () {
        "use strict";
		settings.showFrequent = document.getElementById("frequent").checked;
		settings.showHighWin = document.getElementById("winrate").checked;
		settings.showStarters = document.getElementById("starters").checked;
		settings.showConsumables = document.getElementById("consumables").checked;
		settings.removeOldSets = document.getElementById("remove_old").checked;
		settings.garenaRegion = document.getElementById("garena").checked;
		settings.syncMode = document.getElementById("slowmode").checked;
	},
	writeSettings: function () {
        "use strict";
		var data = "var settings = " + JSON.stringify(settings, null, "\t");
		App.writeFile("app/settings.js", data);
	},
	isValidDir: function (mode) {
        "use strict";
		var path = settings[mode + "InstallDir"] + settings[mode + "ItemsetDir"];
		App[mode + "DirValid"] = App.folderExists(path);
		return App[mode + "DirValid"];
	},
	getSaveLocation: function (mode, log) {
        "use strict";
		var dir = settings[mode + "InstallDir"] + settings[mode + "ItemsetDir"];
		if (App[mode + "DirValid"]) {
			return dir;
		} else {
			if (log) {
				App.log("Invalid save location:", "$ff0000");
				App.log(dir + "<br>", "#ff0000");
				App.log("Saving to the champGG directory instead<br>", "#ff0000");
			}
			return "ItemSets/" + App.betterDate() + " - ";
		}
	},
	iniDownload: function () {
        "use strict";
		App.syncSettings();
		App.writeSettings();
		App.mode = (settings.garenaRegion) ? "garena" : "league";
		App.isValidDir(App.mode);
		// Remove old patch settings. Does not effect any custom sets made in the league client
		if (settings.removeOldSets && App.isValidDir(App.mode)) {
			App.rmdir(App.getSaveLocation(App.mode));
			App.mkdir(App.getSaveLocation(App.mode));
			if (App.errorData.flag) {
				App.log(App.errorData.msg + "<br>", "red");
			}
		}
		App.getAllSets();
		// App.getOneSet("Fizz", "Top");
		// App.getOneSet("Fizz", "Middle");
		// App.getOneSet("Fizz", "Jungle");
		// App.getOneSet("Kayle", "Top");
		// App.getOneSet("Kayle", "ADC");
		// App.getOneSet("Kayle", "Jungle");
		// Middle, ADC, Top, Jungle, Support
		document.getElementById("ui1").style.display = "none";
		document.getElementById("output").style.display = "block";
		document.getElementById("champImgs").style.display = "block";
	},
	getAllSets: function () {
        "use strict";
		App.getPage("http://champion.gg/", function (data) {App.getAllSetsCB(data);
                                                         });
	},
	getAllSetsCB: function (data) {
        "use strict";
		if (data) {
			if (settings.syncMode) {
				App.log("Single Request mode enabled. ", "#0000ee");
			}
			App.log("Creating item sets for all champions...<br> ", "#c0c0c0");
			var list = data.match(/<a href="([^"]*)" style="display:block">/g),
                saveFolder = App.getSaveLocation(App.mode, true);
			App.patch = App.getBetween(data, "<small>Patch <strong>", "</strong></small>");
			App.log("Champion.gg item set data is for patch " + App.patch + "<br>", "#c0c0c0");
			App.queue = [];
			App.log("ItemSet Save Location: ", "#0000ee");
			if (App.isValidDir(App.mode)) {
				App.log(saveFolder + "<br>", "#0000ee");
			} else {
				App.log("champGG/ItemSets/<br>", "#0000ee");
			}
			for (var champPage in list) {
				App.updateCount(true);
                data = list[champPage].split("/");
				var champ = data[2],
				    role = data[3].split('"')[0],
				    url = "http://champion.gg/champion/" + champ + "/" + role,
				    passon = {champ: champ, role: role, saveFolder: saveFolder};
				if (settings.syncMode) {
					App.queue.push({passon: passon, url: url});
				} else {
					App.getPage(url, function (data, passon) {App.getOneSetCB(data, passon);
                                                           }, passon);
				}
			}
			if (settings.syncMode) {
				App.getAllSetsSync_Next();
			}
		} else {
			App.log("Error: No data returned from champion.gg<br>", "#ff0000");
		}
	},
	getAllSetsSync_Next: function () {
		if (App.queue.length > 0) {
			var obj = App.queue.shift();
			App.getPage(obj.url, function (data, passon) {App.getOneSetCB(data, passon);
                                                       }, obj.passon);
		}
	},
	getOneSet: function (champ, role) {
		var saveFolder = "ItemSets/" + App.betterDate() + " - SINGLES - ",
            url = "http://champion.gg/champion/" + champ + "/" + role,
            passon = {champ:champ, role:role, saveFolder: saveFolder};
		App.getPage(url, function (data, passon) {App.getOneSetCB(data, passon);
                                               }, passon);
	},
	getOneSetCB: function (page, passon) {
		var champ = passon.champ,
            role = passon.role,
            saveFolder = passon.saveFolder,
            data = App.getBetween(page, "matchupData.championData = ", "matchupData.patchHistory");
        data = data.trim();
        data = data.substring(0, data.length - 1); // Remove last ; so the JSON will parse
		try {
			var champJSON = JSON.parse(data);
		} catch (err) {
			App.log("No data is available for " + champ + " in " + role + " role<br>", "#cc0000");
			return;
		}
		
		var currentPatch = App.getBetween(page, "<small>Patch <strong>", "</strong></small>"),
            firstMG = champJSON.firstItems.mostGames,
            firstHWP = champJSON.firstItems.highestWinPercent,
            fullMG = champJSON.items.mostGames,
            fullHWP = champJSON.items.highestWinPercent,
            skillsHWP = champJSON.skills.highestWinPercent.order,
            skillsMG = champJSON.skills.mostGames.order;
		if (!firstMG.games || !firstHWP.games || !fullMG.games || !fullHWP.games) {
			App.log("Full data is unavailable for " + champ + " in " + role + " role<br>", "#cc0000");
			App.updateCount();
			return;
		}
		var consumeItems = [2003, 2004, 2044, 2043, 2041, 2138, 2137, 2139, 2140],
            trinketItems = [3340, 3341, 3342],
            firstMGBlock = {
			"items": App.array_merge(App.getItems(firstMG, false, true), App.getItems(trinketItems, true)),
			"type": "Frequent Starters (" + firstMG.winPercent.toString().slice(0, 2) + "% win/" + firstMG.games + " games)"
		},
            firstHWPBlock = {
			"items": App.array_merge(App.getItems(firstHWP, false, true), App.getItems(trinketItems, true)),
			"type": "Highest Win Rate Starters (" + firstHWP.winPercent.toString().slice(0, 2) + "% win/" + firstHWP.games + " games)"
		},
            fullMGBlock = {
			"items": App.getItems(fullMG),
			"type": "Frequent:" + App.getSkillData(skillsMG) + " (" + fullMG.winPercent.toString().slice(0, 2) + "% win/" + fullMG.games + " games)"
		},
            fullHWPBlock = {
			"items": App.getItems(fullHWP),
			"type": "High Win:" + App.getSkillData(skillsHWP) + " (" + fullHWP.winPercent.toString().slice(0, 2) + "% win/" + fullHWP.games + " games)"
		},
		// If the string length is too long the getSkillData method adds length
		// if (fullHWPBlock.type.length > 50 || fullMGBlock.type.length > 50) {
		// 	console.log(fullHWPBlock.type.length, fullMGBlock.type.length);
		// }
            consumeBlock = {
			"items": App.getItems(consumeItems, true),
			"type": "Consumables"
		},
            roleFormatted = champJSON.role.substring(0, 1) + champJSON.role.toLowerCase().substring(1),
            blocks = [];
		if (settings.showStarters) {
			if (settings.showFrequent) {
				blocks.push(firstMGBlock);
			}
			if (settings.showHighWin) {
				blocks.push(firstHWPBlock);
			}
		}
		if (settings.showFrequent) {
			blocks.push(fullMGBlock);
		}
		if (settings.showHighWin) {
			blocks.push(fullHWPBlock);
		}
		if (settings.showConsumables) {
			blocks.push(consumeBlock);
		}
		var itemSetArr = {
			"map": "any",
			"isGlobalForChampions": false,
			"blocks": blocks,
			"associatedChampions": [],
			"title": roleFormatted + " " + currentPatch,
			"priority": false,
			"mode": "any",
			"isGlobalForMaps": true,
			"associatedMaps": [],
			"type": "custom",
			"sortrank": 1,
			"champion": champJSON.key
		};
		if (!App.isValidDir(App.mode)) {
			saveFolder += "PATCH " + currentPatch.replace('.','_');
		}
		if (saveFolder === null) {
			saveFolder = champJSON.key + "/Recommended";
		} else {
			saveFolder = saveFolder + "/" + champJSON.key + "/Recommended";
		}
		if (!App.folderExists(saveFolder)) {
			App.mkdir(saveFolder);
		}
		var fileName = currentPatch.replace('.','_') + "_" + roleFormatted + ".json";
		fileName = saveFolder + "/" + fileName;
		var itemSetJSON = JSON.stringify(itemSetArr, null, '\t');
		App.writeFile(fileName, itemSetJSON);
		GUI.processChamp(champJSON.key, roleFormatted.toLowerCase());
		App.updateCount();
		//App.log("Saved set for " + champ + " in " + role + " role<br>", "#00cc00");
	},
	updateCount: function (starting) {
		starting = starting || false;
		if (starting) {
			App.count.started++;
		} else {
			App.count.finished++;
			App.count.finished = (App.count.finished >= App.count.started) ? App.count.started : App.count.finished;
			if (settings.syncMode) {
				App.getAllSetsSync_Next();
			}
		}
		document.getElementById('status').innerHTML = "Patch: " + App.patch + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Set: " + App.count.finished + "/" + App.count.started;
	},
	getSkillData: function (arr) {
		var decode = ["Q", "W", "E", "R"],
            totals = [0, 0, 0, 0],
            results = [];
		for (var skill in arr) {
			var index = parseInt(arr[skill]) - 1;
			totals[index]++;
			if (totals[index] >= 5){
				results.push(index);
			}
		}
		var decoded = [];
		for (skill in results) {
			decoded.push(decode[results[skill]]);
		}
		var fulllist = [];
		for (skill in arr) {
			fulllist.push(decode[arr[skill] - 1]);
		}
		var data = "" + fulllist.join("").slice(0, settings.starterSkillsToShow) + " | " + decoded.join(">");
		if (App.isChecked("skills")) {
			return " " + data;
		} else {
			return "";
		}
	},
	isChecked: function (id) {
		return document.getElementById(id).checked;
	},
	array_merge: function (arr1, arr2) {
		var result = [];
		return result.concat(arr1, arr2);
	},
	getPage: function (url, callback, passon) {
		var http = require("http");
		http.get(url, function (res) {
			var data = "";
			res.on('data', function (chunk) {
				data += chunk;
			});
			res.on("end", function (res) {
				callback(data, passon);
			});
		}).on("error", function (error) {
			App.log("Error: Unable to get " + url, "#ff0000");
			App.log(error + "<br>", "#ff0000");
			App.updateCount();
			callback(null);
		});
	},
	getBetween: function (content, start, end) {
		var result = content.split(start);
		if (result[1]) {
			result = result[1].split(end);
			return result[0];
		}
		return '';
	},
	getItems: function (input, fromPreset, starters) {
		fromPreset = fromPreset || false;
        starters = starters || false;
        var items = [];
		if (fromPreset) {
			for (var item in input) {
				items.push({
					"count" : 1,
					"id" : input[item] + ""
				});
			}
		} else {
			var itemIDs = {};
			for (item in input.items) {
				var id = input.items.item.id;
				id = (id == 2010) ? 2003 : id; // Convert total biscuit to health pot. If they have the mastery the pots will be biscuits.
				
				if (starters){
					if (itemIDs[id]){
						itemIDs[id]++;
					} else {
						itemIDs[id] = 1;
					}
				} else {
					items.push({
						"count": 1,
						"id": id + ""
					});
				}
			}
			if (starters) {
				var count = 0;
				for (var itemID in itemIDs) {
					items.push({
						"count": itemIDs.itemID,
						"id": itemID + ""
					});
				}
			}
		}
		return items;
	},
	writeFile: function (path, data) {
		try {
			var fs = require('fs');
			fs.writeFileSync(path, data);
		} catch (e) {
			if (e.message.indexOf("not permitted") > -1){
				App.errorData.flag = true;
				App.errorData.msg = "A permission error occured writing the item sets. Running the program as administrator may fix this. The program will now close.";
				alert(App.errorData.msg);
				window.close();
			}
			console.log("Error writing file [" + path + "]");
		}
	},
	readFile: function (path) {
		try {
			var fs = require('fs');
			return fs.readFileSync(path, 'utf8');
		} catch (e) {
			console.log("Error reading file [" + path + "]");
		}
	},
	folderExists: function (path) {
		var fs = require('fs');
		try {
			var stats = fs.lstatSync(path);
			// console.log(stats)
			if (stats.isDirectory()) {
				return true;
			}
		} catch (e){
			return false;
		}
	},
	rmdir: function (path) {
		try{
			var fs = require('fs');
			if (fs.existsSync(path)) {
				fs.readdirSync(path).forEach(function (file, index) {
					var curPath = path + "/" + file;
					if (fs.lstatSync(curPath).isDirectory()) { // recurse
						App.rmdir(curPath);
					} else { // delete file
						fs.unlinkSync(curPath);
					}
				});
				fs.rmdirSync(path);
			}
		} catch(e) {
			if (e.message.indexOf("not permitted") > -1) {
				App.errorData.flag = true;
				App.errorData.msg = "A permission error occured removing the old item sets. Running the program as administrator may fix this. The program can safely continue.";
			}
		}
	},
	mkdir: function (path, root) {
		var fs = require('fs'),
            dirs = path.split('/'), 
            dir = dirs.shift();
        root = (root || '') + dir + '/';
		try { fs.mkdirSync(root); }
		catch (e) {
			if (e.message.indexOf("not permitted") > -1) {
				App.errorData.flag = true;
				App.errorData.msg = "A permission error occured writing the item sets. Running the program as administrator may fix this. The program will now close.";
				alert(App.errorData.msg);
				window.close();
			}
			// dir wasn't made, something went wrong
			if(!fs.statSync(root).isDirectory()) throw new Error(e);
		}
		return !dirs.length||App.mkdir(dirs.join('/'), root);
	},
	log: function (data, color) {
		var ele = document.getElementById("output");
		ele.innerHTML += '<font color="' + color + '">' + data + "</font>";
		ele.scrollTop = ele.scrollHeight;
	},
	betterDate: function () {
		var months= ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
            today = new Date(),
            year = today.getFullYear(),
            month = today.getMonth(),
            day = today.getDate();
		day = (day < 10) ? "0" + day : day;
		
		var date = day + " " + months[month] + " " + year;
		return 	date;
	},
	toggleConfig: function () {
		var ele1 = document.getElementById('ui1'),
            ele2 = document.getElementById('ui2');
		ele2.style.display = (ele2.style.display == "block") ? "none" : "block";
		ele1.style.display = (ele2.style.display == "block") ? "none" : "block";
	},
	setConfig: function (mode) {
		var dir = settings[mode + "InstallDir"] || "",
        data = prompt("Please enter the path for " + mode, dir);
		if (!data){
			return;
		}
		var path = data.replace(/"/g, "");
		if (App.folderExists(path)){
			settings[mode + "InstallDir"] = path;
		} else {
			alert("The path: " + path + " does not exist.");
		}
	},
	openURL: function (url) {
		window.open(url);
	},
	fileExist: function (filename) {
		var fs = require('fs');
		return fs.existsSync(filename);
	},
	getFile: function (uri, filename, callback) {
		var http = require('http'),
            fs = require('fs');
		if (!App.fileExist(filename)) {
			var file = fs.createWriteStream(filename),
                request = http.get(uri, function (response) {
			  response.pipe(file);
			  setTimeout(callback, 500);
			});			
		} else {
			callback();
		}
	}	
};