const { msg } = require('../../../../config/message');
const asyncHandler = require('../../../middleware/async');
const ErrorResponse = require('../../../helper/errorResponse');
const UserFeedback = require('../models/feedback.model');

// @desc    Post Send Feedback by user
// @route   POST/api/v1/user/feedback
// access   Private
exports.postfeedback = asyncHandler(async (req, res, next) => {
    const { description } = req.body;
    const feedback = await UserFeedback.create({
        description: description,
        user_id: req.user._id,
    });
    res.status(200).json({
        success: true,
        status: "Send Feedback!"
    });
})

// @desc    GET Send Feedback by user
// @route   GET/api/v1/user/feedback
// access   Private
exports.getfeedback = asyncHandler(async (req, res, next) => {
    let user = await User.findById(req.user._id);
    let feedback;
    if (user.role == "Admin") {
        feedback = await UserFeedback.find({});
    }
    if (user.role == "User") {
        feedback = await UserFeedback.find({ user_id: user._id });
    }

    res.status(200).json({
        success: true,
        feedback: feedback,
    });
})