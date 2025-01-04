var io = require('../../socket');
const asyncHandler = require('../middleware/async');
const User = require('../modules/user/models/user.model');


exports.changeStatusSocket = async (socketData, senderId) => {

    let socket = await io.getio().emit(`chatMessage/receiver'sAck/${senderId}`, { socketData});
    return socket;
}

