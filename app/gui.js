var folder = "app/res/";
var GUI = {
    CDNVer: "",
    imgTotals: [],
    champions: [],
    cdata: {},
    ini: function () {
        "use strict";
        App.mkdir(folder);
        GUI.getCDNData();
    },
    getCDNData: function () { //Gets the latest Data Dragon Version Number
        "use strict";
        App.getPage("http://ddragon.leagueoflegends.com/api/versions.json", function (data) {
            GUI.getCDNDataCB1(data);
        });
    },
    getCDNDataCB1: function (data) { //Gets the lastest champion list available on Data Dragon
        "use strict";
        GUI.CDNVer = App.getBetween(data, '["', '",');
        console.log("GUI.CDNVer =>", GUI.CDNVer);
        if (App.fileExist(folder + "champData.json")) {
            var champDataRaw = App.readFile(folder + "champData.json"),
                champData = JSON.parse(champDataRaw);
            console.log("Local CDNVer =>", champData.version);
            if (champData.version !== GUI.CDNVer) {
                console.log("CDN Versions mismatch. Updating from internet");
                App.getPage("http://ddragon.leagueoflegends.com/cdn/" + GUI.CDNVer + "/data/en_US/champion.json", function (data) {
                    GUI.getCDNDataCB2(data);
                });
            } else {
                console.log("CDN Versions match! No new champion data to download.");
                GUI.getCDNDataCB2(champDataRaw, true);
            }
        } else {
            console.log("A local CDN Version does not exist. Downloading from internet");
            App.getPage("http://ddragon.leagueoflegends.com/cdn/" + GUI.CDNVer + "/data/en_US/champion.json", function (data) {
                GUI.getCDNDataCB2(data);
            });
        }
    },
    processChamp: function (champ, role) {
        "use strict";
        role = (role === "duo_carry") ? "adc" : role;
        role = (role === "duo_support") ? "support" : role;
        GUI.cdata[champ] = GUI.cdata[champ] || {
            roles: []
        };
        document.getElementById('champ_' + champ).className = "saturate";
        GUI.cdata[champ].roles.push(role);
    },
    showByRole: function (role) {
        "use strict";
        try {
            GUI.resetRoleRow(role);
            for (var item in GUI.cdata) {
                var champ = item,
                    roles = GUI.cdata[champ].roles,
                    hasRole = roles.indexOf(role) > -1;
                document.getElementById('champ_' + champ).className = (hasRole) ? "saturate" : "desaturate";
            }
        } catch (e) {
            return;
        }
    },
    resetShowByRole: function (mode) {
        "use strict";
        for (var item in GUI.cdata) {
            var champ = item;
            document.getElementById('champ_' + champ).className = mode;
        }
        GUI.resetRoleRow();
    },
    resetRoleRow: function (role) {
        "use strict";
        document.getElementById('role_top').className = "desaturate";
        document.getElementById('role_middle').className = "desaturate";
        document.getElementById('role_adc').className = "desaturate";
        document.getElementById('role_support').className = "desaturate";
        document.getElementById('role_jungle').className = "desaturate";
        if (role) {
            document.getElementById('role_' + role).className = "saturate";
        }
    },
    getCDNDataCB2: function (data) { //Parse the champion list
        "use strict";
        var champData = JSON.parse(data).data;
        console.log("ChampData =>", champData);
        for (var champ in champData) {
            GUI.champions.push(champ);
        }
        App.writeFile(folder + "champData.json", data);
        GUI.imgTotals = {
            total: GUI.champions.length + 6,
            count: 0
        }; //+6 for role icons
        //Grab role icons
        for (var i = 657; i < 663; i++) {
            App.getFile("http://ddragon.leagueoflegends.com/cdn/" + GUI.CDNVer + "/img/profileicon/" + i + ".png", folder + i + ".png", function () {
                GUI.countImage();
            });
        }
        for (champ in champData) {
            App.getFile("http://ddragon.leagueoflegends.com/cdn/" + GUI.CDNVer + "/img/champion/" + champ + ".png", folder + champ + ".png", function () {
                GUI.countImage();
            });
        }
        console.log("champions =>", GUI.champions);
    },
    countImage: function () {
        GUI.imgTotals.count++;
        document.getElementById('pbar').innerHTML = 'Updating champion database.... [' + Math.round(GUI.imgTotals.count / GUI.imgTotals.total * 100) + '%]';
        document.getElementById('pbar').style.width = Math.round(GUI.imgTotals.count / GUI.imgTotals.total * 100) + "%";
        if (GUI.imgTotals.count >= GUI.imgTotals.total) {
            GUI.drawChampTable();
            document.getElementById("champImgs").style.display = "none";
            document.getElementById("ui1").style.display = "block";
        }
    },
    drawChampTable: function () {
        var data = '<table class="table table-bordered table-condensed champtable" style="width:320px;">';
        data += '<tr>';
        data += '<td><img src="res/662.png" class="desaturate" id="role_top" onmouseover="GUI.showByRole(\'top\')" onmouseout="GUI.resetShowByRole(\'saturate\')"><br>Top</td>';
        data += '<td><img src="res/659.png" class="desaturate" id="role_middle" onmouseover="GUI.showByRole(\'middle\')" onmouseout="GUI.resetShowByRole(\'saturate\')"><br>Middle</td>';
        data += '<td><img src="res/660.png" class="desaturate" id="role_adc" onmouseover="GUI.showByRole(\'adc\')" onmouseout="GUI.resetShowByRole(\'saturate\')"><br>ADC</td>';
        data += '<td><img src="res/661.png" class="desaturate" id="role_support" onmouseover="GUI.showByRole(\'support\')" onmouseout="GUI.resetShowByRole(\'saturate\')"><br>Support</td>';
        data += '<td><img src="res/657.png" class="desaturate" id="role_jungle" onmouseover="GUI.showByRole(\'jungle\')" onmouseout="GUI.resetShowByRole(\'saturate\')"><br>Jungle</td>';
        data += '</tr>';
        data += '</table>';

        data += '<table class="table table-bordered table-condensed champtable">';
        var count = 0;
        var max = GUI.champions.length;
        for (var row = 0; row < 100 && count < max; row++) {
            data += "<tr>";
            for (var col = 0; col < 15; col++) {
                if (count < max) {
                    data += '<td onmouseover="GUI.showRoles(\'' + GUI.champions[count] + '\');" onmouseout="GUI.resetRoleRow()"><img src="res/' + GUI.champions[count] + '.png" class="desaturate" id="champ_' + GUI.champions[count] + '"><br>' + GUI.champions[count] + '</td>';
                } else {
                    data += '<td></td>';
                }
                count++;
            }
            data += "</tr>";
        }
        data += "</table>";
        document.getElementById('champImgs').innerHTML = data;
    },
    showRoles: function (champ) {
        try {
            var availableRoles = ["top", "middle", "support", "adc", "jungle"];
            var champRoles = GUI.cdata[champ].roles;
            for (var role in availableRoles) {
                document.getElementById("role_" + availableRoles[role]).className = "desaturate";
            }
            for (role in champRoles) {
                document.getElementById("role_" + champRoles[role]).className = "saturate";
            }
        } catch (e) {
            return false;
        }
    }
};