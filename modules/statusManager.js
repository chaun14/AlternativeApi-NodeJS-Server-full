let status = "Ok";

const config = require('../config.json')
const utils = require('./utils.js')
const sql = require('./sql.js')
let debug = config.debug;


function getStatus() {
    return status
}

function isActive() {
    if (status == "Ok") {
        return true
    } else {
        return false
    }
}

function setActive() {
    status = "Ok"
    sql.setNewStatus("Ok", (err, result) => {})
}

async function setStatus(newStatus) {
    if (!newStatus || newStatus == "") throw new console.error("New status can't be empty");
    status = newStatus
    sql.setNewStatus(newStatus, (err, result) => {})
}

module.exports = { getStatus, isActive, setActive, setStatus }