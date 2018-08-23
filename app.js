const express = require('express');
const shell = require('shelljs');
const exec = require('child_process').exec;
// Shortid to create a unique short code 
var shortid = require('shortid');

var cloneProcessorCreator = require('./cloneProcessor');
var app = express();
const MongoClient = require('mongodb').MongoClient;

var serverParameters = {},
    database, cloneProcessor;;
process.argv.slice(2).forEach((val, index) => { serverParameters[val.split("=")[0]] = val.split("=")[1]; });
const mongoServer = "mongodb://" + serverParameters.MUSER + ":" + serverParameters.MPWD + "@ds051740.mlab.com:51740/clone-swarm-repo-records";


// Start the server only once the connection to the database is complete
MongoClient.connect(mongoServer, (err, client) => {

    if (err) return console.log(err);
    database = client.db('clone-swarm-repo-records');
    cloneProcessor = new cloneProcessorCreator(database, serverParameters);

    var server = app.listen(8081, function() {
        console.log("Server Live at http://%s:%s", server.address().address, server.address().port)
    })
});


app.get('/process-repository', function(req, res) {
    // Setting response headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    const repositoryName = req.query.githubLink;
    const requesterEmail = req.query.email;
    const progLanguage = req.query.language;
    const granularity = req.query.granularity;
    const processingState = 'waiting';
    const recordTimestamp = Date.now();
    const uniqueID = shortid.generate();

    if (repositoryName && requesterEmail && progLanguage && granularity) {

        database.collection('repositories').insertOne({
            uniqueID,
            repositoryName,
            requesterEmail,
            progLanguage,
            granularity,
            processingState,
            recordTimestamp
        }, (err, result) => {
            if (err) {
                res.status(404).send("Something went wrong");
                console.log(err);
            } else {
                // Send response
                res.end('Your repository is being processed , You will receive a confirmation once its done');
                cloneProcessor.addToWaitList(uniqueID);
            }
        })
    } else { res.status(404).send("Something went wrong"); }

})