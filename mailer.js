const nodemailer = require('nodemailer');
const serverParameters = require('./serverParams');
// Configure Mail Client 

var mailer = {};

const transporter = nodemailer.createTransport({
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

mailer.sendMail = function(toMailAddress, mailMessage) {

    const mailOptions = {
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

module.exports = mailer;