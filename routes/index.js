var express = require('express');
var router = express.Router();

const md5File = require('md5-file')
const recursiveReadSync = require('recursive-readdir-sync')
const fs = require('fs')

let utils = require("../modules/utils.js")
let list = require("../modules/listManager.js")
let status = require("../modules/statusManager.js")
let sql = require("../modules/sql.js")

const config = require('../config.json')
let debug = config.debug;



// quand un launcher get la liste de téléchargement
router.get('/files', function(req, res) {

    // déclare quelques variables de fonctionnement
    let files;
    let xml;
    let initialTime = Date.now()

    // log informatif dans la console
    console.log("[INFO] ".brightBlue + "Ip ".yellow + (req.connection.remoteAddress).magenta + (" à " + req.method + " la liste des fichiers à download").yellow)

    try {
        items = recursiveReadSync('files'); // listage des fichiers


    } catch (err) { // on le laisse pas passer les erreur méchantes
        if (err.errno === 34) {
            res.send('Veuillez créer un dossier nommé files');
        } else {
            //something unrelated went wrong, rethrow
            throw err;
        }
    }

    files = items // truc un chouilla inutile mais bon


    // on énumère les fichiers
    for (var i = 0; i < items.length; i++) {

        // on récup le hash md5 du fichier
        const hash = md5File.sync("./" + items[i])

        // on récup sa taille
        const stats = fs.statSync("./" + items[i]);

        // on build l'objet xml (si c'est le premier)
        if (xml == undefined) {
            xml = "<Contents>" +
                "<Key>" + items[i].slice(6).replace(/\\/g, "/") + "</Key>" +
                "<Size>" + stats.size + "</Size>" +
                "<ETag>" + hash + "</ETag>" +
                "</Contents>"
        } else { // on build l'objet xml (si c'est pas le premier)
            xml = xml + "<Contents>" +
                "<Key>" + items[i].slice(6).replace(/\\/g, "/") + "</Key>" +
                "<Size>" + stats.size + "</Size>" +
                "<ETag>" + hash + "</ETag>" +
                "</Contents>"
        }

    }
    // on get le timestamp final
    let finalTime = Date.now()
        // second log informatif
    console.log("[INFO] ".brightBlue + `Listage de `.yellow + `${files.length}`.rainbow + ` fichiers en `.yellow + (finalTime - initialTime) + "ms pour ".yellow + (req.connection.remoteAddress).magenta)

    // debug only
    // console.log("le xml est : "+xml)



    // pour que les navigateur et le launcher voient que c'est du xml
    res.set('Content-Type', 'text/xml');

    // on finalise nos balise et on envoie notre objet xml généré
    res.send('<?xml version="1.0"?>' + "<xml>" + "<ListBucketResult>" + xml + "</ListBucketResult>" + "</xml>")
    sql.newRequest("getfiles", finalTime - initialTime, (err, result) => {})
})

// pour ne pas afficher une page vide moche
router.get('/', function(req, res) {

    res.send(`Trxyy's alternative lib download server by <a href="https://chaun14.fr/">chaun14</a><br><a href="/login">Login</a>`)
})

// gestion de l'activation du launcher
router.get('/status.cfg', function(req, res) {
    res.set('Content-Type', 'text/cfg');
    res.send(status.getStatus())
})


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
})


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
})

module.exports = router;