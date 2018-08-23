const fs = require('fs');
const mailer = require('./mailer');
const S3 = require('./configureS3');
const shell = require('shelljs');
const exec = require('child_process').exec;
const Promise = require('promise');
const config = require('./config');

function readFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, contents) => {
            if (err) {
                reject(err);
            } else {
                resolve(contents);
            };
        });
    });
}

function spawnThreadToProcessProject(uniqueID, repositoryName, progLanguage, granularity, requesterEmail) {

    return new Promise((resolve, reject) => {

        // Get project folder from the git repo name
        const projectName = repositoryName.split("/").pop().slice(0, -4);
        // Execute the script 
        var script = exec('sh process.sh' + " " + uniqueID + " " + repositoryName + " " + projectName +
            " " + progLanguage + " " + granularity, (error) => { if (error !== null) { reject(error); } });

        script.on('close', (code) => {
            var xmlPath = 'workspace/sandbox-' + uniqueID + "/" + projectName + "_" + granularity + "-clones";
            xmlPath += "/" + projectName + "_" + granularity + "-clones-0.30-classes-withsource.xml";
            // Read the xml file having the clone data information 
            readFile(xmlPath)
                // Then write the xml file to S3 bucket 
                .then((data) => {
                    return S3.saveFileToS3Bucket(uniqueID + "-clone-info", "xml", data);
                })
                // If all the files are processed properly then send a mail to the person informing that processing is done
                .then(() => {
                    mailer.sendMail(requesterEmail, "Clone Detection Complete for Project: " + projectName + " ,Please check here - " + config.UI + "/?source=" + uniqueID + "&page=dashboard  -Cloneswarm");
                    resolve();
                })
                .catch(err => { reject(err); })
                // Remove the folder from disk once processing is complete
                .finally(() => { shell.exec("rm -rf workspace/sandbox-" + uniqueID); })
        });
    });

}


module.exports = function cloneProcessor(database) {

    var instance = this;
    instance.waitList = [];
    instance.isCurrentlyProcessing = false;

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


    this.lookupRecord = function(uniqueID) {
        return new Promise((resolve, reject) => {
            database.collection('repositories').findOne({ uniqueID }, (err, result) => {
                if (err) {
                    console.log(error);
                    return reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    this.setRecordProcessingState = function(uniqueID, processingState) {
        return new Promise((resolve, reject) => {
            database.collection('repositories').findOneAndUpdate({ uniqueID }, { $set: { processingState } }, (err, result) => {
                if (err) {
                    console.log(error);
                    return reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    this.processRecord = function(uniqueID) {
        // Processing state is set to processing by default
        var processingState = 'processing';
        console.log('Processing Record for - ', uniqueID);

        instance
            .lookupRecord(uniqueID)
            .then(recordData => {
                return spawnThreadToProcessProject(uniqueID, recordData.repositoryName, recordData.progLanguage, recordData.granularity, recordData.requesterEmail);
            })
            .then(() => {
                console.log("processing complete for ", uniqueID);
                processingState = "complete";
            })
            .catch((err) => {
                console.log("There was an error in processing -", uniqueID);
                console.log("Error Details - ", err);
                processingState = "error";
            })
            .finally(() => {
                instance.setRecordProcessingState(uniqueID, processingState);
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
            });
    }

    return {
        addToWaitList: this.addToWaitList
    };
}