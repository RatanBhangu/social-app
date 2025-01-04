const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../helper/errorResponse');
const User = require('../modules/user/models/user.model');
const { msg } = require('../../config/message');

//Protect Routes
exports.protect = asyncHandler(async (req, res, next) => {
    var token ;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return next(new ErrorResponse(msg.unauthorizedRoute, 401));
    }
    try {
        //Verify token
        const decoded = await jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);

        if (req.user === null) {
            return next(new ErrorResponse('Not Authorized To Access this Route ', 401));
        }

        next();
    } catch (err) {
        return next(new ErrorResponse(msg.unauthorizedRoute, 401));
    }
})

//Grant Access To Specefic roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new ErrorResponse(`${req.user.role} is not authorized to access this route`, 403));
        }
        next();
    }
}
