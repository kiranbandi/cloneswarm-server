    const AWS = require('aws-sdk');
    const Promise = require('promise');
    const config = require('./config');

    var S3 = {};

    // Configure AWS with your credentials set in environmental variables
    AWS.config.update({ accessKeyId: config.ACCESS_KEY_ID, secretAccessKey: config.SECRET_ACCESS_KEY });
    // Create an s3 instance
    const s3configuration = new AWS.S3();


    S3.saveFileToS3Bucket = function(filename, filetype, base64FileData) {

        const params = {
            Bucket: 'cloneswarm-store/clone-data/clone-xml-info',
            Key: `${filename}.${filetype}`,
            Body: base64FileData,
            ACL: 'public-read',
            ContentType: 'text/xml'
        }

        return new Promise((resolve, reject) => {
            s3configuration.upload(params, (err, data) => {
                if (err) { reject(err); } else { resolve(data) };
            })
        });
    }

    module.exports = S3;