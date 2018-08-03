var express = require('express');
var bodyParser = require('body-parser');
// File I/O is provided by simple wrappers around standard 
// POSIX functions by this fs package 
var fs = require("fs");
var app = express();
//body parser used to extract params sent from client side
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/processRepo', function(req, res) {
    res.end('Hello');
})

var server = app.listen(8080, function() {
    var host = server.address().address
    var port = server.address().port
    console.log("Server Live at http://%s:%s", host, port)
})