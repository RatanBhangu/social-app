require('dotenv').config();
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRIDAPIKEY)

exports.sendEmail = async function (email, message, subject) {
    const msg = {
        to: email, //recipient
        from: process.env.EMAIL_FROM, //sender
        subject: subject,
        text: message,
        html: message,
    }

    await sgMail
        .send(msg)
        .then(() => {
            console.log('Email sent')
        })
        .catch((error) => {
            console.error(error)
        })
}

