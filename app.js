const express = require('express');
const bodyParser = require('body-parser');
const shell = require('shelljs');
const exec = require('child_process').exec;
const dirTree = require('directory-tree');
const AWS = require('aws-sdk');
var fs = require('fs');
var Promise = require('promise');
// Shortid to create a unique short code 
var shortid = require('shortid');
var app = express();

// Configure AWS with your credentials set in environmental variables
AWS.config.update({ accessKeyId: process.env.ACCESS_KEY_ID, secretAccessKey: process.env.SECRET_ACCESS_KEY });
// Create an s3 instance
const s3 = new AWS.S3();


//body parser used to extract params sent from client side
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/processRepository', function(req, res) {

    res.end('Your repository is being processed , You will receive a confirmation once its done');
    const repository_name = "https://github.com/alibaba/Sentinel.git";
    const project_name = repository_name.split("/").pop().slice(0, -4);
    const uniqueID = shortid.generate();

    var script = exec('sh process.sh' + " " + uniqueID + " " + repository_name + " " + project_name,
        (error, stdout, stderr) => {
            // Fills up the console screen so temporarily commenting out 
            // but should be logged eventually onto a different file to keep track
            // console.log(`${stdout}`);
            console.log(`${stderr}`);
            if (error !== null) {
                console.log(`exec error: ${error}`);
            }
        });

    script.on('close', (code) => {
        console.log(`child process exited with code ${code}`);

        const filteredTree = dirTree('workspace/sandbox-' + uniqueID + "/" + project_name);

        // saveFileToS3Bucket(uniqueID + "-json", "json", JSON.stringify(filteredTree))
        //     .then(data => {
        //         console.log(data);
        //     })
        //     .catch(err => {
        //         console.log('error in uploading files to s3', err);
        //     })
        //     .finally(() => {
        //         shell.exec("rm -rf workspace/sandbox-" + uniqueID);
        //     })
    });
})

function saveFileToS3Bucket(filename, filetype, base64FileData) {

    const params = {
        Bucket: 'cloneswarm-store/clone-data',
        Key: `${filename}.${filetype}`,
        Body: base64FileData,
        ACL: 'public-read',
        ContentType: 'application/json' // required
    }

    return new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
            if (err) { return reject(err); } else { resolve(data) };
        })
    });

}

var server = app.listen(8080, function() {
    var host = server.address().address
    var port = server.address().port
    console.log("Server Live at http://%s:%s", host, port)
})