const express = require('express');
const router = express.Router();

const md5File = require('md5-file')
const recursiveReadSync = require('recursive-readdir-sync')
const fs = require('fs')
const chokidar = require('chokidar');

const utils = require("../modules/utils.js")
const list = require("../modules/listManager.js")
const status = require("../modules/statusManager.js")
const sql = require("../modules/sql.js")

const config = require('../config.json')
const debug = config.debug;

let fileList = new Map()

/* ================================================== files watcher ==================================================*/

const watcher = chokidar.watch('./files/', {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
});
watcher
// action when a new file is detected
    .on('add', async path => {
        const hash = md5File.sync(path)
        const stats = fs.statSync(path);

        fileList.set(path, { "hash": hash, "size": stats.size });
        if (debug) console.log(`File ${path} (${hash}) has been added ${stats.size}`)
    })
    // action when a file is changed
    .on('change', async path => {
        const hash = md5File.sync(path)
        const stats = fs.statSync(path);

        fileList.set(path, { "hash": hash, "size": stats.size });
        if (debug) console.log(`File ${path} has been changed`)
    })
    // action when a file is deleted
    .on('unlink', async path => {
        fileList.delete(path)
        if (debug) console.log(`File ${path} has been removed`)
    });



/* ================================================== Routes ==================================================*/



// quand un launcher get la liste de téléchargement
router.get('/files', function(req, res) {

    const initialTime = Date.now()
    let xml = "";

    // list all Map elements
    for (var [path, values] of fileList) {

        // builder
        xml = xml + "<Contents>" +
            "<Key>" + path.slice(6).replace(/\\/g, "/") + "</Key>" +
            "<Size>" + values.size + "</Size>" +
            "<ETag>" + values.hash + "</ETag>" +
            "</Contents>"

    }

    // so that the browser and the launcher see that it's xml
    res.set('Content-Type', 'text/xml');

    // we finalize our tags and send our generated xml object
    const finalTime = Date.now()

    // info log
    console.log("[INFO] ".brightBlue + `Listing of `.yellow + `${fileList.size}`.rainbow + ` files in `.yellow + (finalTime - initialTime) + "ms for ".yellow + (req.connection.remoteAddress).magenta)

    // send list to launcher
    res.send('<?xml version="1.0"?>' + "<xml>" + "<ListBucketResult>" + xml + "</ListBucketResult>" + "</xml>")

});
// pour ne pas afficher une page vide moche
router.get('/', function(req, res) {
    res.send(`Trxyy's alternative lib download server by <a href="https://chaun14.fr/">chaun14</a><br><a href="/login">Login</a>`)
});

// gestion de l'activation du launcher
router.get('/status.cfg', function(req, res) {
    res.set('Content-Type', 'text/cfg');
    res.send(status.getStatus())
});


router.get('/ignore.cfg', function(req, res) {
    ignoreList = list.getIgnoreList()
    let builder;
    for (let item of ignoreList) {
        if (debug) utils.logDebug("ignoreList item: " + item)
        if (builder) {
            builder = item + "\n" + builder
        } else {
            builder = item + "\n"
        }
    }
    res.set('Content-Type', 'text/cfg');
    res.send(builder)
});


router.get('/delete.cfg', function(req, res) {
    deleteList = list.getDeleteList()
    let builder;
    for (let item of deleteList) {
        if (debug) utils.logDebug("deletelist item: " + item)
        if (builder) {
            builder = item + "\n" + builder
        } else {
            builder = item + "\n"
        }
    }
    res.set('Content-Type', 'text/cfg');
    res.send(builder)
});

module.exports = router;