const User = require('../modules/user/models/user.model');
const Userchat = require('../modules/chat/models/chat.model');
const asyncHandler = require('../middleware/async');
const { timeSince } = require('./timeago');

exports.lastKnownMessage = asyncHandler(async function (id) {
  
  let chat = await Userchat.findOne({ $or: [{ recieverId: id }, { createdBy: id }] }).sort({ createdAt: -1 });
 
  return chat;
});


