const express = require('express');
const fs = require('fs');
const https = require('https');
var shortid = require('shortid');
var app = express();
const MongoClient = require('mongodb').MongoClient;
const config = require('./config');
const cloneProcessorCreator = require('./cloneProcessor');
var morgan = require('morgan');
var winston = require('./winston');

// Use morgan for logging Requests , combined along with log outputs from winston
app.use(morgan('combined', { stream: winston.stream }));

const mongoServer = "mongodb://" + config.MUSER + ":" + config.MPWD + "@ds051740.mlab.com:51740/clone-swarm-repo-records";

// Link keys
const options = {
    cert: fs.readFileSync('./key/fullchain.pem'),
    key: fs.readFileSync('./key/privkey.pem')
}


// Start the server only once the connection to the database is complete
MongoClient.connect(mongoServer, (err, client) => {

    if (err) return winston.error(err);

    database = client.db('clone-swarm-repo-records');
    cloneProcessor = new cloneProcessorCreator(database, config);

    https.createServer(options, app).listen(8443, function() { winston.info("Server Live on Port 8443") })
});


app.get('/process-repository', function(req, res) {
    // Setting response headers
    res.setHeader('Access-Control-Allow-Origin', 'https://clone-swarm.usask.ca');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET');
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
                winston.error(err);
            } else {
                // Send response
                res.end('Your repository is being processed , You will receive a confirmation once its done');
                cloneProcessor.addToWaitList(uniqueID);
            }
        })
    } else { res.status(404).send("Something went wrong"); }

})