var fs = require('fs');
var nodemailer = require('nodemailer');

module.exports = function cloneProcessor(database) {

    var instance = this;
    instance.waitList = [];
    instance.isCurrentlyProcessing = false;


    // Configure Mail Client 
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'cloneswarm.usask@gmail.com',
            pass: serverParameters.PASSWORD
        },
        secure: false,
        tls: {
            rejectUnauthorized: false
        }
    });

    var UILink = "https://kiranbandi.github.io/clone-swarm-ui";

    // Configure AWS with your credentials set in environmental variables
    AWS.config.update({ accessKeyId: serverParameters.ACCESS_KEY_ID, secretAccessKey: serverParameters.SECRET_ACCESS_KEY });
    // Create an s3 instance
    const s3 = new AWS.S3();


    this.addToWaitList = function(uniqueID) {
        instance.waitList.push(uniqueID);
        instance.triggerProcessing();
    };

    this.triggerProcessing = function() {
        // if processing flag is false ,only then start it again
        if (!instance.isCurrentlyProcessing) {
            // get record at the top of the stack 
            var uniqueID = instance.waitList[0];
            instance.isCurrentlyProcessing = true;
            console.log("Switching into processing mode...");
            instance.processRecord(uniqueID);
        }
    };

    this.processRecord = function(uniqueID) {
        setTimeout(() => {
            console.log("processing complete for ", uniqueID);
            database.collection('repositories').findOneAndUpdate({ uniqueID }, { $set: { "processingState": 'complete' } },
                (err, result) => {
                    if (err) console.log(err);
                    // remove the element at the top of the waitlist , change its status in the DB
                    instance.waitList = instance.waitList.slice(1);
                    // if there elements in the instance waitlist call itself again with the next uniqueID
                    if (instance.waitList.length > 0) {
                        var nextUniqueID = instance.waitList[0];
                        instance.processRecord(nextUniqueID);
                    } else {
                        //  turn processing indicator to false
                        instance.isCurrentlyProcessing = false;
                        console.log("Switching into standy mode...");
                    }
                })
        }, 2000);
    }

    return {
        addToWaitList: this.addToWaitList
    };
}


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

function sendMail(transporter, toMailAddress, mailMessage) {

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

function saveFileToS3Bucket(s3, filename, filetype, base64FileData) {

    const params = {
        Bucket: 'cloneswarm-store/clone-data/clone-xml-info',
        Key: `${filename}.${filetype}`,
        Body: base64FileData,
        ACL: 'public-read',
        ContentType: 'text/xml'
    }

    return new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
            if (err) { return reject(err); } else { resolve(data) };
        })
    });
}

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
                console.log('error in reading local file and uploading files to s3 for uniqueID -', uniqueID, err);
            })
            .finally(() => {
                shell.exec("rm -rf workspace/sandbox-" + uniqueID);
            })
    });
}