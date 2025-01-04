require('dotenv').config();
const accountSid = process.env.TWILIOACCOUNTSID;
const authToken = process.env.TWILIOAUTHTOKEN;
const serviceId = process.env.TWILIOSERVICEID;
const client = require('twilio')(accountSid, authToken);
const User = require('../modules/user/models/user.model');
const asyncHandler = require('../middleware/async');

exports.sendVerificationOtpOnPhone = async function (mobile) {
    await client.verify
        .services(serviceId)
        .verifications
        .create({
            from: process.env.TWILIOFROMPHONE,
            to: `+91${mobile}`,
            channel: `sms`,
        })
        .then(message => console.log(message.sid));
}

exports.verifyOtpOnPhone = asyncHandler(async function (otp, mobile, res) {
    let data = await client.verify
        .services(serviceId)
        .verificationChecks
        .create({
            to: `+91${mobile}`,
            code: otp,
        })
    return data;
});