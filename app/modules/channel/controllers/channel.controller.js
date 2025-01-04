const { msg } = require("../../../../config/message");
const Channel = require("../models/channel.model");
const asyncHandler = require("../../../middleware/async");
const ErrorResponse = require("../../../helper/errorResponse");
const User = require("../../user/models/user.model");
var io = require("../../../../socket").getio();
const Post = require("../../post/models/post.model");

exports.getroom = asyncHandler(async (req, res, next) => {
  res.render("index");
});

//@desc Create new  Channel by Admin only
//@routes POST/api/v1/channel/
//@access Private
exports.createChannel = asyncHandler(async (req, res, next) => {
  const { channel_name, is_Private, is_Trading } = req.body;
  if (req.user.role === "Admin") {
    const channel = await Channel.create({
      name: channel_name,
      owner: req.user.firstName,
      is_Private: is_Private,
      is_Trading: is_Trading,
      roomId: Date.now(),
      createdBy: req.user._id,
    });
    res.status(200).json({
      success: true,
      channel: channel,
    });
  }
});

//@desc Update channel
//@routes PUT/api/V1/channel/:id
//@access Private
exports.updateChannel = asyncHandler(async (req, res, next) => {
  let channel = await Channel.findById(req.params.id);
  console.log(channel);
  if (!channel) {
    return next(
      new ErrorResponse(`Channel is not Found With id ${req.params.id}`, 404)
    );
  }
  if (req.user.role !== "Admin") {
    // console.log(req.user);
    return next(
      new ErrorResponse(
        ` User ${req.params.id} is not authorized to update this Channel `,
        401
      )
    );
  }
  channel = await Channel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: channel,
  });
});

//@desc Get All Channels
//@routes GET/api/V1/channels
//@access Public
exports.getChannel = asyncHandler(async (req, res, next) => {
  const channels = await Channel.find({});

  for (let i = 0; i < channels.length; i++) {
    const posts = await Post.find({ channelId: channels[i]._id, "createdAt": { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }).populate({
      path: "user",
      select: "firstName lastName avatarUrl",
    });
    channels[i]._doc.posts = posts.length;
  }

  res.status(200).json({
    success: true,
    count: channels.length,
    data: channels,
  });
});

//@desc Get Single Channel
//@routes GET/api/V1/channel/:id
//@access Public
exports.getSingleChannel = asyncHandler(async (req, res, next) => {
  console.log("req Id :", req.params.id);
  const channel = await Channel.findById(req.params.id);
  // .populate({ path: 'createdBy', select: 'name ' })
  // .populate({ path: 'name', select: 'name ' })

  if (!channel) {
    return next(
      new ErrorResponse(`Channel is not Found With id ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: channel,
  });
});

//@desc Delete a Channel
//@routes DELETE/api/V1/channel/:id
//@access Private
exports.deleteChannel = asyncHandler(async (req, res, next) => {
  const channel = await Channel.findById(req.params.id);
  if (!channel) {
    return next(
      new ErrorResponse(`Channel is not Found With id ${req.params.id}`, 404)
    );
  }
  if (req.user.role !== "Admin") {
    return next(
      new ErrorResponse(
        ` User ${req.params.id} is not authorized to delete this channel `,
        401
      )
    );
  }
  const post = Post.find({ channelId: channel._id });
  let comment;
  if (post) {
    for (let i = 0; i < post.length; i++) {
      comment = Comment.find({ postid: post[i]._id });
    }
    if (comment) {
      for (let i = 0; i < comment.length; i++) {
        comment = Comment.findByIdAndDelete(comment[i]._id);
      }
    }
    for (let i = 0; i < post.length; i++) {
      post = Post.findByIdAndDelete(post[i]._id);
    }
  }
  await Channel.findByIdAndDelete(req.params.id);
  res.status(200).json({
    success: true,
    status: "channel deleted successfully",
  });
});

//@desc Add User to a channel
//@routes POST /api/V1/adduser
//@access Private/Admin
exports.addUser = asyncHandler(async (req, res, next) => {
  const { channel_id } = req.body;
  const channel = await Channel.findById(channel_id);
  if (!channel) {
    return next(new ErrorResponse("There is no such Channel", 404));
  }
  const user = await User.findById(req.params.id);
  await channel.users.forEach((result) => {
    result = result._id.toString();
    if (result == user._id) {
      return next(new ErrorResponse(msg.UserAlreadyExist, 409));
    }
  });

  channel.users.push((id = user._id));
  channel.save();

  let obj = {
    channel: channel,
    userName: `${user.firstName} ${user.lastName}`,
    userPhoneNo: user.phone,
    userProfilePic: user.avatarUrl,
  };

  res.status(200).json({
    success: true,
    data: obj,
  });
});

//@desc Delete User to a channel
//@routes POST /api/V1/deleteuser
//@access Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  let { channel_id } = req.body;
  let channel = await Channel.findById(channel_id);
  if (!channel) {
    return next(new ErrorResponse("There is no such Channel", 404));
  }
  let user = await User.findById(req.params.id);

  let users = channel.users;

  for (let i = 0; i < users.length; i++) {
    if (users[i]._id.toString() == user._id.toString()) {
      console.log("ghgs");
      await channel.users.splice(i, 1);
    }
  }
  await channel.save();

  res.status(200).json({
    success: true,
    data: channel,
  });
});

//@desc Add Users of a channel
//@routes POST /api/v1/channel/findusers
//@access Private/Admin
exports.findUsersofChannel = asyncHandler(async (req, res, next) => {
  const channel = await Channel.findById(req.params.id);
  if (!channel) {
    return next(new ErrorResponse("There is no such Channel", 404));
  }
  let data = [];
  let arr = [];
  for (let i = 0; i < channel.users.length; i++) {
    let userid = channel.users[i]._id.toString();
    data.push(userid);
  }
  uniqueArray = Array.from(new Set(data));
  for (let i = 0; i < uniqueArray.length; i++) {
    const user = await User.findById(uniqueArray[i]);
    arr.push(user);
  }

  res.status(200).json({
    success: true,
    data: arr,
  });
});

//@desc Add Users to a channel
//@routes POST /api/V1/adduser
//@access Private/Admin
// exports.addUser = asyncHandler(async (req, res, next) => {
//     const { channel_name } = req.body;
//     const channel = await Channel.findOne({ name: channel_name });
//     console.log(channel);
//     if (!channel) {
//         return next(new ErrorResponse('There is no such Channel', 404));
//     }
//     // console.log(req.body);
//  io.on('join',(data,err)=>{

//  })
//     const users = await User.find();
//     users.map(result => {
//         console.log(result);
//         console.log("user id", result._id);
//         //push users inside channel
//         channel.users.push(result._id);
//     })
//     channel.save();
//     res.status(200).json({
//         success: true,
//         data: channel
//     });
// });

exports.users = asyncHandler(async (req, res, next) => {
  let { channel_id } = req.body;
  const channel = await Channel.findById(channel_id);

  let users = await User.find();
  users = JSON.stringify(users);
  users = JSON.parse(users);
  let channelUsers = channel.users;

  if (users.length != 0) {
    for (let i = 0; i < users.length; i++) {
      if (channelUsers.length != 0) {
        for (let j = 0; j < channelUsers.length; j++) {
          if (users[i]._id == channelUsers[j]._id) {
            users.splice(i, 1);
          }
        }
      }
    }
  }

  res.status(200).json({
    success: true,
    data: users,
  });
});
