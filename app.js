const express = require('express');
const shell = require('shelljs');
const exec = require('child_process').exec;
const AWS = require('aws-sdk');
var fs = require('fs');
var Promise = require('promise');
// Shortid to create a unique short code 
var shortid = require('shortid');
var nodemailer = require('nodemailer');
var app = express();


var UILink = "https://kiranbandi.github.io/clone-swarm-ui";

// Configure AWS with your credentials set in environmental variables
AWS.config.update({ accessKeyId: process.env.ACCESS_KEY_ID, secretAccessKey: process.env.SECRET_ACCESS_KEY });
// Create an s3 instance
const s3 = new AWS.S3();

// Configure Mail Client 
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'cloneswarm.usask@gmail.com',
        pass: process.env.PASSWORD
    },
    secure: false,
    tls: {
        rejectUnauthorized: false
    }
});

function spawnThreadToProcessProject(repository_name, progLanguage, granularity, requesterEmail) {

    const uniqueID = shortid.generate();
    console.log("processing request for UID - " + uniqueID);
    const project_name = repository_name.split("/").pop().slice(0, -4);

    var script = exec('sh process.sh' + " " + uniqueID + " " + repository_name + " " + project_name + " " + progLanguage + " " + granularity,
        (error, stdout, stderr) => {
            // Fills up the console screen so temporarily commenting out 
            // but should be logged eventually onto a different file to keep track of requests being processed
            console.log(`${stdout}`);
            console.log(`${stderr}`);
            if (error !== null) {
                console.log(`exec error: ${error}`);
            }
        });

    script.on('close', (code) => {

        var xmlPath = 'workspace/sandbox-' + uniqueID + "/" + project_name + "_" + granularity + "-clones";
        xmlPath += "/" + project_name + "_" + granularity + "-clones-0.30-classes-withsource.xml";

        // Read the xml file having the clone data information 
        readFile(xmlPath)
            // Then write the xml file to S3 bucket 
            .then(data => {
                return saveFileToS3Bucket(uniqueID + "-clone-info", "xml", data);
            })
            //  If all the files are processed properly then send a mail to the person informing that processing is done 
            .then(data => {
                console.log("Processing complete for UID-" + uniqueID);
                sendMail(requesterEmail, "Clone Detection Complete for Project: " + project_name + " ,Please check here - " + UILink + "/?source=" + uniqueID + "  -Cloneswarm");
            })
            .catch(err => {
                console.log('error in uploading files to s3', err);
            })
            .finally(() => {
                shell.exec("rm -rf workspace/sandbox-" + uniqueID);
            })
    });
}


app.get('/processRepository', function(req, res) {

    // Setting response headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    const repository_name = req.query.githubLink;
    const requesterEmail = req.query.email;
    const progLanguage = req.query.language;
    const granularity = req.query.granularity;

    if (repository_name && requesterEmail && progLanguage && granularity) {
        // Send response
        res.end('Your repository is being processed , You will receive a confirmation once its done');
        spawnThreadToProcessProject(repository_name, progLanguage, granularity, requesterEmail)
    } else {
        res.status(404).send("Something went wrong");
    }
})

function readFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, contents) => {
            if (err) {
                return reject(err);
            } else {
                resolve(contents)
            };
        });
    });
}

function sendMail(toMailAddress, mailMessage) {

    var mailOptions = {
        from: 'cloneswarm.usask@gmail.com',
        to: toMailAddress,
        subject: 'Cloneswarm Project Report',
        text: mailMessage
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent to ' + toMailAddress);
        }
    });
}

function saveFileToS3Bucket(filename, filetype, base64FileData) {

    var bucketSubFolder, contentTypeInfo;

    switch (filetype) {
        case 'json':
            bucketSubFolder = 'json';
            contentTypeInfo = 'application/json';
            break;
        case 'xml':
            bucketSubFolder = 'clone-xml-info';
            contentTypeInfo = 'text/xml';
            break;
        case 'html':
            bucketSubFolder = 'complete-report';
            contentTypeInfo = 'text/html';
            break;
    }

    const params = {
        Bucket: 'cloneswarm-store/clone-data/' + bucketSubFolder,
        Key: `${filename}.${filetype}`,
        Body: base64FileData,
        ACL: 'public-read',
        ContentType: contentTypeInfo // required
    }

    return new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
            if (err) { return reject(err); } else { resolve(data) };
        })
    });

}

var server = app.listen(8081, function() {
    var host = server.address().address
    var port = server.address().port
    console.log("Server Live at http://%s:%s", host, port)
})