const db = require('./db.js');
var SqlString = require('sqlstring');
const config = require('../config.json')
const utils = require('./utils.js')
let debug = config.debug;



/* ################################# Stats ################################# */
async function newRequest(type, time, callback) {
    let newRequest = `INSERT INTO requests(type, calc_time) VALUES(${SqlString.escape(type)}, '${time}');`;

    await db.query(newRequest, function(err, result, fields) {
        if (err) console.log(err.message);

        if (debug) {
            utils.logDebugMysql("newRequest " + newRequest + "\n" + JSON.stringify(result))
        }
        callback(err, result);
    })
}

async function getTodayStats(callback) {
    let getTodayStats = `SELECT * FROM requests WHERE DATE(date) = CURDATE();`;

    await db.query(getTodayStats, function(err, results, fields) {
        if (err) console.log(err.message);

        if (debug) {
            utils.logDebugMysql("getTodayStats " + getTodayStats + "\n" + JSON.stringify(results))
        }
        callback(err, results);
    })
}
/* ################################# End stats ################################# */




/* ################################# Status ################################# */
async function getSettings(callback) {
    let getSettings = `SELECT * FROM settings;`;

    await db.query(getSettings, function(err, settings, fields) {
        if (err) console.log(err.message);

        if (debug) {
            utils.logDebugMysql("guildSetting " + getSettings + "\n" + JSON.stringify(settings))
        }
        callback(err, settings);
    })
}

async function setNewStatus(status, callback) {
    let setNewStatus = `UPDATE settings SET launcher_status = ${SqlString.escape(status)};`;

    await db.query(setNewStatus, function(err, newStatus, fields) {
        if (err) console.log(err.message);

        if (debug) {
            utils.logDebugMysql("setNewStatus " + setNewStatus)
        }
        callback(err, newStatus);
    })
}
/* ################################# End status ################################# */




/* ################################# IgnoreList ################################# */
async function getIgnoreList(callback) {
    let getIgnoreList = `SELECT * FROM ignoreList;`;

    await db.query(getIgnoreList, function(err, ignoreList, fields) {
        if (err) console.log(err.message);

        if (debug) {
            utils.logDebugMysql("getIgnoreList " + getIgnoreList + "\n" + JSON.stringify(ignoreList))
        }
        callback(err, ignoreList);
    })
}

async function addIgnoredItem(item, callback) {
    let addIgnoredItem = `INSERT INTO ignoreList(path) VALUES(${SqlString.escape(item)});`;

    await db.query(addIgnoredItem, function(err, result, fields) {
        if (err) console.log(err.message);

        if (debug) {
            utils.logDebugMysql("addIgnoredItem " + addIgnoredItem + "\n" + JSON.stringify(result))
        }
        callback(err, result);
    })
}

async function removeIgnoredItem(item, callback) {

    let removeIgnoredItem = `DELETE FROM ignoreList WHERE ignoreList.path = ${SqlString.escape(item)};`;

    await db.query(removeIgnoredItem, function(err, result, fields) {
        if (err) console.log(err.message);

        if (debug) {
            utils.logDebugMysql("removeIgnoredItem " + removeIgnoredItem + "\n" + JSON.stringify(result))
        }
        callback(err, result);
    })
}

/* ################################# End IgnoreList ################################# */





/* ################################# deleteList ################################# */

async function getDeleteList(callback) {
    let getDeleteList = `SELECT * FROM deleteList;`;

    await db.query(getDeleteList, function(err, deleteList, fields) {
        if (err) console.log(err.message);

        if (debug) {
            utils.logDebugMysql("getDeleteList " + getDeleteList + "\n" + JSON.stringify(deleteList))
        }
        callback(err, deleteList);
    })
}

async function addDeletedItem(item, callback) {
    let addDeletedItem = `INSERT INTO deleteList(path) VALUES(${SqlString.escape(item)});`;

    await db.query(addDeletedItem, function(err, result, fields) {
        if (err) console.log(err.message);

        if (debug) {
            utils.logDebugMysql("addDeletedItem " + addDeletedItem + "\n" + JSON.stringify(result))
        }
        callback(err, result);
    })
}

async function removeDeletedItem(item, callback) {

    let removeDeletedItem = `DELETE FROM deleteList WHERE deleteList.path = ${SqlString.escape(item)};`;

    await db.query(removeDeletedItem, function(err, result, fields) {
        if (err) console.log(err.message);

        if (debug) {
            utils.logDebugMysql("removeDeletedItem " + removeDeletedItem + "\n" + JSON.stringify(result))
        }
        callback(err, result);
    })
}
/* ################################# End deleteList ################################# */


module.exports = { newRequest, getTodayStats, getSettings, getIgnoreList, addIgnoredItem, removeIgnoredItem, getDeleteList, addDeletedItem, removeDeletedItem, setNewStatus }