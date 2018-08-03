var express = require('express');
var bodyParser = require('body-parser');
var shell = require('shelljs');
var exec = require('child_process').exec;
// File I/O is provided by simple wrappers around standard 
// POSIX functions by this fs package 
var shortid = require('shortid');
var app = express();
//body parser used to extract params sent from client side
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/processRepository', function(req, res) {
    res.end('Your repository is being processed , You will receive a confirmation once its done');

    var repository_name = "https://github.com/alibaba/Sentinel.git";
    var project_name = "Sentinel";
    var uniqueID = shortid.generate();

    var script = exec('sh process.sh' + " " + uniqueID + " " + repository_name + " " + project_name,
        (error, stdout, stderr) => {
            console.log(`${stdout}`);
            console.log(`${stderr}`);
            if (error !== null) {
                console.log(`exec error: ${error}`);
            }
        });

    script.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        shell.exec("rm -rf workspace/sandbox-" + uniqueID);
    });

})

var server = app.listen(8080, function() {
    var host = server.address().address
    var port = server.address().port
    console.log("Server Live at http://%s:%s", host, port)
})