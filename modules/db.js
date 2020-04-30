const mysql = require('mysql');
const config = require("../config.json")

//async function mysqlConnect() {
function mysqlConnect() {
    console.log("Connexion à la bdd")
    connection = /*await */ mysql.createConnection(config.database); // Recreate the connection, since the old one cannot be reused.
    /*await*/
    connection.connect(function onConnect(err) { // The server is either down

        if (err) { // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(mysqlConnect, 10000); // We introduce a delay before attempting to reconnect,
        }
        console.log('connected as id ' + connection.threadId);
        // to avoid a hot loop, and to allow our node script to
    }); // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    connection.on('error', function onError(err) {
        console.log('db error', err);
        if (err.code == 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            mysqlConnect(); // lost due to either server restart, or a
        } else { // connnection idle timeout (the wait_timeout
            throw new Error("Connection idle timeout... Error -> " + err); // server variable configures this)
        }
    });
}
mysqlConnect()
    /*
    If async implementation
        .then(() => {
            console.log('connection achieved successfully')

        })
        .catch(error => {
            console.log('connection refused. Reason : ' + error);
        });
    */

module.exports = connection