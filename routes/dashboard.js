var express = require('express');
const fs = require('fs')
var router = express.Router();
const passport = require('passport');
let list = require("../modules/listManager.js")
let status = require("../modules/statusManager.js")
let sql = require("../modules/sql.js")
let utils = require("../modules/utils.js")
const fetch = require('node-fetch');
const unzip = require('node-unzip-2');
var rimraf = require("rimraf");

let config = require("../config.json")
let debug = config.debug

var request = require('request');
var progress = require('request-progress');



router.get('/', function(req, res) {

    if (req.session.passport == undefined) {
        res.redirect("/login")
    } else
        sql.getTodayStats((err, results) => {

            let ignoredItemNumber = list.getIgnoreList().size
            let deletedItemNumber = list.getDeleteList().size

            let calc_times = results.map(result => result.calc_time); // extract times from query results

            let timeAverage = numAverage(calc_times); // get the average
            timeAverage = timeAverage / 1000; // ms to s
            timeAverage = timeAverage.toFixed(3) // round
            res.render("dashboard", { user: req.session.passport, message: "", messageType: "success", todayStats: results, timeAverage: timeAverage, ignoredItemNumber: ignoredItemNumber, deletedItemNumber: deletedItemNumber })
        })



})



/* ######################################### Begin installer ######################################### */
router.get('/installer', async function(req, res) {

    if (req.session.passport == undefined) {
        res.redirect("/login")
    } else {

        function checkStatus(response) {
            if (response.ok) { // res.status >= 200 && res.status < 300
                return response;
            } else {
                return res.render("install", { dllist: "", message: "Can't load the remote json", messageType: "error" })
            }
        }

        function toJson(response) {

            let json

            json = response.json().catch(err => {
                if (debug) utils.logDebug("Can't parse the json")
                return res.render("install", { dllist: "", message: "Can't parse the remote json", messageType: "error" })
            })


            return json
        }

        fetch('https://packs.chaun14.fr/trxyy/packs.json')
            .then(checkStatus)
            .then(toJson)
            .then(json => {
                console.log(json)

                if (!json) return
                res.render("install", { dllist: json, message: "", messageType: "success" })
            })




    }
})

router.post('/install', async function(req, res) {
    if (req.session.passport == undefined) {
        res.redirect("/login")
    } else {


        let main = require("../app.js")

        let response = req.body.content
        if (!response || response == "") return res.render("install", { dllist: "", message: "Something went wrong while processing your request", messageType: "error" })
        response = JSON.parse(response)
        console.log(response)
        res.render("download", { message: "", messageType: "error", files: response.install })

        var dir = './files';
        setTimeout(function() {

            if (fs.existsSync(dir)) {
                rimraf(dir, function() {

                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir);
                    }

                    // res.redirect("download")


                    response.install.forEach(file => {

                        progress(request(file.link), {
                                throttle: 400, // Throttle the progress event to 2000ms, defaults to 1000ms
                                // Only start to emit after 1000ms delay, defaults to 0ms
                                // lengthHeader: 'x-transfer-length'  // Length header to use, defaults to content-length
                            })
                            .on('progress', function(state) {

                                // console.log('progress', state);
                                main.socketProgressEmit('downloadprogress', state, file.name, file.id)
                                    // io.emit('downloadprogress', { state: state });
                            })
                            .on('error', function(err) {
                                main.socketDownloadEmit('downloadAction', "postMessage", "" + err.name, file.name, file.id)
                            })
                            .on('end', async function() {
                                main.socketDownloadEmit('downloadAction', "postMessage", "Download of " + file.name + " Finished", file.name, file.id);
                                console.log(file.name + "finished with id " + file.id)

                                if (file.type == "zip") {
                                    main.socketDownloadEmit('downloadAction', "postMessage", "Extracting " + file.name, file.name, file.id)

                                    fs.createReadStream("./" + file.path + "/" + file.name).pipe(unzip.Extract({ path: "./" + file.path }))
                                    main.socketDownloadEmit('downloadAction', "postMessage", "Deleting  " + file.name, file.name, file.id)

                                    fs.unlink("./" + file.path + "/" + file.name, function(err) {
                                        if (err) throw err;
                                        // if no error, file has been deleted successfully
                                        if (debug) console.log(file.name + ' File deleted!');

                                    });

                                    return main.socketDownloadEmit('downloadAction', "finished", "Finished  " + file.name, file.name, file.id)


                                }
                                //     main.socketDownloadEmit('downloadAction', "postMessage", "Finished  " + file.name, file.name, file.id)
                                main.socketDownloadEmit('downloadAction', "finished", "Finished  " + file.name, file.name, file.id)

                            })
                            .pipe(fs.createWriteStream("./" + file.path + "/" + file.name));
                    })
                    main.socketBroadcast("Installation finished", "success")
                })
            }
        }, 5000);
    };
});

/*

router.get('/download', async function(req, res) {

    if (req.session.passport == undefined) {
        res.redirect("/login")
    } else {

        res.render("download", { message: "", messageType: "error" })
    }
})


*/
/* ######################################### End installer ######################################### */






/* ######################################### Begin statusManager ######################################### */
router.get('/manage/status', async function(req, res) {
    let actualStatus = status.getStatus()


    if (req.session.passport == undefined) {
        res.redirect("/login")
    } else {
        console.log(actualStatus)


        res.render("status", { status: actualStatus, message: "", messageType: "success" })
    }
})

router.post('/manage/status/edit', async function(req, res) {
        let actualStatus = status.getStatus()
        let newStatus = req.body.reason
        console.log(req.body)
        if (req.session.passport == undefined) {
            res.redirect("/login")
        } else {
            if (req.body.checkbox == "ok") {

                console.log("Activation de la maintenance")
                if (newStatus == undefined || newStatus == "") {
                    newStatus = "Launcher under maintenance, please retry again later"
                }


                status.setStatus(newStatus)

                res.render("status", { status: status.getStatus(), message: "Launcher maintenance sucessfully activated", messageType: "success" })
            } else {
                console.log("Désactivation de la maintenance")
                status.setActive()

                res.render("status", { status: status.getStatus(), message: "Launcher maintenance sucessfully stopped", messageType: "success" })


            }
        }
    })
    /* ######################################### End statusManager ######################################### */





/* ######################################### Begin ignorelist ######################################### */

router.get('/manage/ignorelist', async function(req, res) {
    let ignorelist = list.getIgnoreList()

    console.log(ignorelist)
    if (req.session.passport == undefined) {
        res.redirect("/login")
    } else {

        console.log(list.getIgnoreList())

        //   res.send()
        res.render("list", { list: ignorelist, type: "ignore", message: "", messageType: "success" })
    }
})

router.post('/manage/ignorelist/delete', async function(req, res) {
    let ignorelist = list.getIgnoreList()

    if (req.session.passport == undefined) {
        res.redirect("/login")

    } else {
        if (req.body.file == undefined || req.body.file == "") {
            return res.render("list", { list: ignorelist, type: "ignore", message: "Impossible de traiter votre requête", messageType: "error" })
        }
        let item = req.body.file
        if (list.hasIgnoredItem(item)) {


            list.deleteIgnoredItem(item)

            res.render("list", { list: ignorelist, type: "ignore", message: "Supression réussie", messageType: "success" })


        } else {
            return res.render("list", { list: ignorelist, type: "ignore", message: "Élément à suppprimer introuvable", messageType: "error" })
        }


    }

})

router.post('/manage/ignorelist/add', async function(req, res) {


    let ignorelist = list.getIgnoreList()

    if (req.session.passport == undefined) {
        res.redirect("/login")

    } else {
        if (req.body.file == undefined || req.body.file == "") {
            return res.render("list", { list: ignorelist, type: "ignore", message: "Impossible de traiter votre requête", messageType: "error" })
        }
        let item = req.body.file
        if (list.hasIgnoredItem(item)) {

            return res.render("list", { list: ignorelist, type: "ignore", message: "This file is already in the list", messageType: "error" })
        } else {

            list.addIgnoredItem(item)

            res.render("list", { list: ignorelist, type: "ignore", message: "File successfully added to the ignoreList", messageType: "success" })

        }


    }


})

router.post('/manage/ignorelist/edit', async function(req, res) {

    let ignorelist = list.getIgnoreList()

    if (req.session.passport == undefined) {
        res.redirect("/login")

    } else {
        if (req.body.oldItem == undefined || req.body.oldItem == "" || req.body.newItem == undefined || req.body.newItem == "") {
            return res.render("list", { list: ignorelist, type: "ignore", message: "Can't proceed your request", messageType: "error" })
        }

        let oldItem = req.body.oldItem
        let newItem = req.body.newItem
        if (oldItem == newItem) {
            return res.render("list", { list: ignorelist, type: "ignore", message: "The new file is the same than the old", messageType: "error" })
        }
        if (list.hasIgnoredItem(oldItem)) {

            list.deleteIgnoredItem(oldItem)
            list.addIgnoredItem(newItem)
            res.render("list", { list: ignorelist, type: "ignore", message: "File successfully edited", messageType: "success" })

        } else {
            return res.render("list", { list: ignorelist, type: "ignore", message: "This file isn't in the list", messageType: "error" })

        }
    }
})

router.post('/manage/ignorelist/export', function(req, res) {
    let ignoreList = list.getIgnoreList()

    if (req.session.passport == undefined) {
        res.redirect("/login")

    } else {

        let builder = "";
        for (let item of ignoreList) {
            console.log(item)

            builder = item + "\n" + builder



        }
        res.setHeader('Content-disposition', 'attachment; filename=' + "ignore.cfg");
        res.set('Content-Type', 'text/cfg');
        res.send(builder)

    }
})

router.post('/manage/ignorelist/import', function(req, res) {
    if (req.session.passport == undefined) {
        res.redirect("/login")

    } else {

        let ignoreList = list.getIgnoreList();

        if (!req.files || Object.keys(req.files).length === 0) {

        }
        if (req.files.file.name.includes(".cfg") || req.files.file.name.includes(".list")) {

            if (req.files.file.size > 2048) return res.render("list", { list: ignoreList, type: "ignore", message: "Sorry the given file is too big", messageType: "error" });


            fs.readFile(req.files.file.tempFilePath, (err, data) => {
                if (err) {
                    console.error(err);
                    return
                }
                let content = data.toString();

                content = content.split(/\r?\n/)
                console.log(content)
                let entrieCount = 0;


                content.forEach(line => {
                    if (line == "") return
                    if (list.hasIgnoredItem(line)) return
                    entrieCount = entrieCount + 1
                    list.addIgnoredItem(line)

                })
                ignoreList = list.getIgnoreList();
                res.render("list", { list: ignoreList, type: "ignore", message: entrieCount + " Entries added", messageType: "success" });
            })

        } else {
            return res.render("list", { list: ignoreList, type: "ignore", message: "Please upload a file with valid extension", messageType: "error" });
        }






    }
})

/* ######################################### End ignorelist ######################################### */




/* ######################################### Begin deletelist ######################################### */

router.get('/manage/deletelist', async function(req, res) {
    let deletelist = list.getDeleteList()


    if (req.session.passport == undefined) {
        res.redirect("/login")
    } else {


        res.render("list", { list: deletelist, type: "delete", message: "", messageType: "success" })
    }
})

router.post('/manage/deletelist/delete', async function(req, res) {
    let deletelist = list.getDeleteList()

    if (req.session.passport == undefined) {
        res.redirect("/login")

    } else {
        if (req.body.file == undefined || req.body.file == "") {
            return res.render("list", { list: deletelist, type: "delete", message: "Impossible de traiter votre requête", messageType: "error" })
        }
        let item = req.body.file
        if (list.hasDeletedItem(item)) {


            list.deleteDeletedItem(item)

            res.render("list", { list: deletelist, type: "delete", message: "Supression réussie", messageType: "success" })


        } else {
            return res.render("list", { list: deletelist, type: "delete", message: "Élément à suppprimer introuvable", messageType: "error" })
        }


    }

})

router.post('/manage/deletelist/add', async function(req, res) {


    let deletelist = list.getDeleteList()

    if (req.session.passport == undefined) {
        res.redirect("/login")

    } else {
        if (req.body.file == undefined || req.body.file == "") {
            return res.render("list", { list: deletelist, type: "delete", message: "Impossible de traiter votre requête", messageType: "error" })
        }
        let item = req.body.file
        if (list.hasDeletedItem(item)) {

            return res.render("list", { list: deletelist, type: "delete", message: "This file is already in the list", messageType: "error" })
        } else {

            list.addDeletedItem(item)

            res.render("list", { list: deletelist, type: "delete", message: "File successfully added to the deleteList", messageType: "success" })

        }


    }


})

router.post('/manage/deletelist/edit', async function(req, res) {

    let deletelist = list.getDeleteList()

    if (req.session.passport == undefined) {
        res.redirect("/login")

    } else {
        if (req.body.oldItem == undefined || req.body.oldItem == "" || req.body.newItem == undefined || req.body.newItem == "") {
            return res.render("list", { list: deletelist, type: "delete", message: "Can't proceed your request", messageType: "error" })
        }

        let oldItem = req.body.oldItem
        let newItem = req.body.newItem
        if (oldItem == newItem) {
            return res.render("list", { list: deletelist, type: "delete", message: "The new file is the same than the old", messageType: "error" })
        }
        if (list.hasDeletedItem(oldItem)) {

            list.deleteDeletedItem(oldItem)
            list.addDeletedItem(newItem)
            res.render("list", { list: deletelist, type: "delete", message: "File successfully edited", messageType: "success" })

        } else {
            return res.render("list", { list: deletelist, type: "delete", message: "This file isn't in the list", messageType: "error" })

        }
    }
})

router.post('/manage/deletelist/export', function(req, res) {
    let deletelist = list.getDeleteList()

    if (req.session.passport == undefined) {
        res.redirect("/login")

    } else {

        let builder = "";
        for (let item of deletelist) {
            console.log(item)

            builder = item + "\n" + builder



        }
        res.setHeader('Content-disposition', 'attachment; filename=' + "delete.cfg");
        res.set('Content-Type', 'text/cfg');
        res.send(builder)

    }
})

router.post('/manage/deletelist/import', function(req, res) {
    if (req.session.passport == undefined) {
        res.redirect("/login")

    } else {

        let deletelist = list.getDeleteList()

        if (!req.files || Object.keys(req.files).length === 0) {

        }
        if (req.files.file.name.includes(".cfg") || req.files.file.name.includes(".list")) {

            if (req.files.file.size > 2048) return res.render("list", { list: deletelist, type: "delete", message: "Sorry the given file is too big", messageType: "error" });


            fs.readFile(req.files.file.tempFilePath, (err, data) => {
                if (err) {
                    console.error(err);
                    return
                }
                let content = data.toString();

                content = content.split(/\r?\n/)
                console.log(content)
                let entrieCount = 0;


                content.forEach(line => {
                    if (line == "") return
                    if (list.hasDeletedItem(line)) return
                    entrieCount = entrieCount + 1
                    list.addDeletedItem(line)

                })
                deletelist = list.getDeleteList();
                res.render("list", { list: deletelist, type: "delete", message: entrieCount + " Entries added", messageType: "success" });
            })

        } else {
            return res.render("list", { list: deletelist, type: "delete", message: "Please upload a file with valid extension", messageType: "error" });
        }






    }
})

/* ######################################### End deletelist ######################################### */

module.exports = router;

function numAverage(a) {
    var b = a.length,
        c = 0,
        i;
    for (i = 0; i < b; i++) {
        c += Number(a[i]);
    }
    return c / b;
}