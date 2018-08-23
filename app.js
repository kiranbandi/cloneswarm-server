const express = require('express');
const fs = require('fs');
const https = require('https');
var shortid = require('shortid');
var app = express();
const MongoClient = require('mongodb').MongoClient;

const config = require('./config');
const cloneProcessorCreator = require('./cloneProcessor');


const mongoServer = "mongodb://" + config.MUSER + ":" + config.MPWD + "@ds051740.mlab.com:51740/clone-swarm-repo-records";

// Link keys
const options = {
    cert: fs.readFileSync('./key/fullchain.pem'),
    key: fs.readFileSync('./key/privkey.pem')
}


// Start the server only once the connection to the database is complete
MongoClient.connect(mongoServer, (err, client) => {

    if (err) return console.log(err);

    database = client.db('clone-swarm-repo-records');
    cloneProcessor = new cloneProcessorCreator(database, config);

    var server = https.createServer(options, app).listen(8443, function() {
        console.log("Server Live on Port 8443")
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