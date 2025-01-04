const { msg } = require('../../../../config/message');
const asyncHandler = require('../../../middleware/async');
const ErrorResponse = require('../../../helper/errorResponse');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const fs = require("fs");
var io = require('../../../../socket').getio();
const {
    pickRegistrationRequest,
    pickRegistrationResponse,
    pickLoginResponse
} = require('../../../helper/pickReqRes.helper');

const {
    timeSince,
} = require('../../../helper/timeago')
const { sendVerificationOtpOnPhone, verifyOtpOnPhone } = require('../../../helper/twilio');
generateRandomCode = () => Math.floor(100000 + Math.random() * 900000);

module.exports.test = function (req, res) {
    res.status(200).json({
        success: true,
        data: "Welcome to Gsocial"
    })
}

// @desc    Register User
// @route   POST/api/v1/user/register
// access    Public
exports.postregister = asyncHandler(async (req, res, next) => {
    let { firstName, lastName, gender, phone, role, email, password, about, deviceId, fca_token } = req.body;
    var avatarUrl = req.file;
    let url;
    if (avatarUrl != null) {

        url = `${avatarUrl.key}`;
    }
    if (!/^[A-Za-z]+/.test(firstName)) throw { type: "firstName", error: "invalid name" };
    if (!password) throw { type: "password", error: "password cannot be empty" };
    await sendVerificationOtpOnPhone(phone);
    const salt = await bcrypt.genSalt(10);
    let pass = password.toString();
    const hashedPassord = await bcrypt.hash(pass, salt);
    let userExist = await User.findOne({ $or: [{ email: email }, { phone: phone }] });

    if (userExist) {
        return next(new ErrorResponse(msg.duplicatePhoneOrEmail, 409));
    }
    let response = await User.create({
        firstName: firstName,
        lastName: lastName,
        gender: gender,
        phone: phone,
        email: email,
        password: hashedPassord,
        avatarUrl: url,
        about: about,
        deviceId: deviceId,
        fca_token: fca_token,
        role: role,
        isOtpVerified: true,
    });
    const token = response.getSignedJwtToken();//create token
    res.status(200).json({
        success: true,
        data: pickRegistrationResponse(response),
        token
    });
});

// @desc    Resend Otp
// @route   POST/api/v1/user/resendotp
// access    Public
exports.resendOtp = asyncHandler(async (req, res, next) => {
    let { phone } = req.body;
    if (!phone) {   //validate phone 
        return next(new ErrorResponse(msg.noPhoneOrPassword, 400));
    }
    const user = await User.findOne({ phone: phone });//check for user
    if (!user) {
        return next(new ErrorResponse(msg.unauthorizedUser, 401));
    }
    await sendVerificationOtpOnPhone(phone);
    res.status(200).json({
        success: true,
        status: "Otp Sent"
    });
});

// @desc    Login User
// @route   POST/api/v1/user/login
//access    Public
exports.login = asyncHandler(async (req, res, next) => {
    const { phone, password, fca_token } = req.body;
    let pass = password;
    if (!phone || !password) {//validate phone and password
        return next(new ErrorResponse(msg.noPhoneOrPassword, 400));
    }
    const user = await User.findOne({ phone }).select('+password');//check for user
    if (!user) {
        return next(new ErrorResponse(msg.unauthorizedLogin, 401));
    }
    const isMatch = await user.matchPassword(pass);//model method to match the hashed password with the password user has provided
    if (!isMatch) {
        return next(new ErrorResponse(msg.unauthorizedLogin, 401));
    }
    let user1 = await User.findByIdAndUpdate(user._id, { fca_token: fca_token });

    const token = user.getSignedJwtToken();
    res.status(200).json({
        success: true,
        data: pickLoginResponse(user),
        token
    });
});

// @desc    Forgot Password user
// @route   GET/api/v1/user/forgotpassword
//access    Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const { otp, phone, newPassword, ConfirmPassword } = req.body;
    if (!otp) throw { type: "otp", error: "otp cannot be empty" };
    if (!phone) throw { type: "phone", error: "phone cannot be empty" };
    let user = await User.findOne({ phone: phone });
    if (!user) {
        return next(new ErrorResponse(msg.unauthorizedUser, 401));
    }
    let ack = await verifyOtpOnPhone(otp, phone);
    if (ack.status == "approved") {
        if (!newPassword) throw { type: "password", error: "password cannot be empty" };
        if (!ConfirmPassword) throw { type: "password", error: "password cannot be empty" };
        if (newPassword === ConfirmPassword) {
            const salt = await bcrypt.genSalt(10);
            let pass = newPassword.toString();
            const hashedPassord = await bcrypt.hash(pass, salt);
            const updateduser = await User.findByIdAndUpdate(user._id, {
                password: hashedPassord,
            });
        }
        else {
            res.status(400).json({
                error: "password not matched",
            })
        }
    }
    else {
        res.status(400).json({
            error: "otp not approved",
        })
    }
    res.status(200).json({
        success: true,
        status: "password updated successfully",
    });
});

// @desc    Get current logged in user
// @route   GET/api/v1/user/me
//access    Private
exports.getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user._id);

    res.status(200).json({
        success: true,
        data: pickLoginResponse(user)
    });
});

// @desc    Put Update Profile
// @route   POST/api/v1/user/me
// access   Private
exports.postUpdateProfile = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user._id);
    //let { firstName, lastName, gender, email, about } = req.body;
    const updateduser = await User.findByIdAndUpdate(req.user._id, req.body, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({
        success: true,
        status: "user updated successfully",
    });
});

// @desc    Put Change Password
// @route   POST/api/v1/user/changepassword
// access   Private
exports.putchangePassword = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user._id);
    let { oldPassword, newPassword, ConfirmPassword } = req.body;
    if (!oldPassword) throw { type: "password", error: "oldpassword cannot be empty" };
    let pass = oldPassword;
    if (!newPassword) throw { type: "password", error: "password cannot be empty" };
    if (!ConfirmPassword) throw { type: "password", error: "password cannot be empty" };
    const comparePassword = await bcrypt.compare(oldPassword, user.password);
    if (!comparePassword) {
        throw { type: "password", error: "Incorrect password" };
    }
    if (newPassword === ConfirmPassword) {
        const salt = await bcrypt.genSalt(10);
        let pass = newPassword.toString();
        const hashedPassord = await bcrypt.hash(pass, salt);
        const updateduser = await User.findByIdAndUpdate(req.user._id, {
            password: hashedPassord,
        });
    }
    else {
        res.status(400).json({
            error: "Password not matched",
        })
    }
    res.status(200).json({
        success: true,
        status: "password updated successfully",
    });
});

// @desc    Verify the otp sent on mobile with the otp entered by user
// @route   POST/api/v1/user/verifyotp
// @access  Private
exports.verifyOtp = asyncHandler(async (req, res, next) => {
    const { otp } = req.body;
    const user = await User.findById(req.user._id);
    let phone = user.phone;
    let ack = await verifyOtpOnPhone(otp, phone);
    console.log("ack = ", ack.status);
    if (ack.status == "approved") {
        let otpverify = await User.findByIdAndUpdate(req.user._id, { isOtpVerified: true });
    }
    else {
        res.status(400).json({
            error: error.message,
        })
    }
    res.status(200).json({
        success: true,
        status: "Verified"
    })
});

// @desc    Get all users for admin
// @route   POST/api/v1/user/getusers
// @access  Private
exports.getalluser = asyncHandler(async (req, res, next) => {
    console.log(req.user._id);
    let user = await User.findById(req.user._id);
    console.log(user.role);
    let activeuser;
    if (user.role == "Admin") {
        activeuser = await User.find();
        console.log(activeuser);
    }
    res.status(200).json({
        success: true,
        users: activeuser,
    });
})

exports.getprofilepic = asyncHandler(async (req, res, next) => {
    res.render('profilepic');
});

exports.postProfilepic = asyncHandler(async (req, res, next) => {
    var avatarUrl = req.file;

    //mode : development
    let url = `${avatarUrl.key}`;

    const user1 = await User.findByIdAndUpdate(req.user._id, { avatarUrl: url });
    const user = await User.findById(user1._id);

    res.status(200).json({
        success: true,
        status: 'Profile picture Updated',
        name: `${req.user.firstName} ${req.user.lastName}`,
        data: user,
    });
});

exports.searchUsers = asyncHandler(async (req, res, next) => {
    let { name } = req.body;
    let arr = [];
    let names = [];
    const users = await User.find();
    await users.forEach(user => {
        let fullname = `${user.firstName} ${user.lastName}`;
        names.push(fullname);
    })
    let filtered = names.filter(arr => arr.includes(name));
    console.log(filtered);
    let i = 0;
    for (let j = 0; j < users.length; j++) {
        let fullname = `${users[j].firstName} ${users[j].lastName}`;
        if (filtered[i] == fullname) {
            i++;
            const user = await User.findById(users[j]._id);
            let data = {
                name: `${user.firstName} ${user.lastName}`,
                id: user._id,
                avatarUrl: user.avatarUrl,
            }
            console.log(data);
            arr.push(data);
        }
    }
    res.status(200).json({
        success: true,
        data: arr,
    });
});

// @desc    Admin Details
// @route   POST/api/v1/user/admin
//access    Public
exports.adminDetails = asyncHandler(async (req, res, next) => {
    let user = await User.findOne({ role: "Admin" });
    console.log(user);
    let data = {
        fullName: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        email: user.email,
        about: user.about,
        role: user.role,

    }
    res.status(200).json({
        success: true,
        data: data,
    });
});

// @desc    Admin bolck user
// @route   POST/api/v1/user/block
//access    Public
exports.blockUser = asyncHandler(async (req, res, next) => {
    let user = await User.findById(req.user._id);
    let { blocked } = req.body;
    let user1;
    if (user.role == "Admin") {
        user1 = await User.findByIdAndUpdate(req.body.userId, { blocked: blocked }, {
            new: true,
            runValidators: true
        });
    }

    res.status(200).json({
        success: true,
        data: user1,
    });
})

// @desc    user list
// @route   POST/api/v1/user/list
//access    Public
exports.userList = asyncHandler(async (req, res, next) => {
    let user = await User.findById(req.user._id);
    let user1;
    if (user.role == "Admin") {
        user1 = await User.find({ blocked: false }).select('firstName lastName gender email phone role avatarUrl about isOtpVerified blocked');
    }

    res.status(200).json({
        success: true,
        data: user1,
    });
});

// @desc    user list
// @route   POST/api/v1/user/blocklist
//access    Public
exports.blockUserList = asyncHandler(async (req, res, next) => {
    let user = await User.findById(req.user._id);
    let user1;
    if (user.role == "Admin") {
        user1 = await User.find({ blocked: true }).select('firstName lastName gender email phone role avatarUrl about isOtpVerified blocked');
    }

    res.status(200).json({
        success: true,
        data: user1,
    });
});