const { msg } = require("../../../../config/message");
const asyncHandler = require("../../../middleware/async");
const ErrorResponse = require("../../../helper/errorResponse");
const User = require("../../user/models/user.model");
const Userchat = require("../models/chat.model");
var io = require("../../../../socket");
const { timeSince } = require("../../../helper/timeago");
const { lastKnownMessage } = require("../../../helper/users");

var FCM = require("fcm-node");
const { userList } = require("../../user/controllers/user.controller");
var serverKey =process.env.FCMSERVERKEY; //put your server key here
var fcm = new FCM(serverKey);

exports.getchat = asyncHandler(async (req, res, next) => {
  res.render("chat");
});

// @desc    Get request for chat
// @route   GET/api/v1/chat
// @access  Private
exports.getAllchat = asyncHandler(async (req, res, next) => {
  let page = parseInt(req.query.page) >= 1 ? parseInt(req.query.page) : 1,
    limit = parseInt(req.query.limit) ? parseInt(req.query.limit) : 10;

  let userid = req.params.id;
  if (userid == "admin") {
    let user_id = await User.findOne({ role: "Admin" });
    userid = user_id._id;
  }
  let chat = await Userchat.find({
    $or: [
      { $and: [{ recieverId: req.user._id }, { createdBy: userid }] },
      { $and: [{ recieverId: userid }, { createdBy: req.user._id }] },
    ],
  }).sort({ createdAt: -1 })
    .skip(limit * page - limit)
    .limit(limit);

  let data = [];
  for (let i = 0; i < chat.length; i++) {
    let recievers = await User.findById(chat[i].recieverId);
    let recieverfullname = `${recievers.firstName} ${recievers.lastName}`;
    let users = await User.findById(chat[i].createdBy);
    let userfullname = `${users.firstName} ${users.lastName}`;
    let chat2 = chat[i]._doc;

    const updatechat = await Userchat.findOneAndUpdate({ _id: chat[i]._id, recieverId: req.user._id }, {
      received: true,
    });
    io.getio().emit("recievedmsg", updatechat);
    let reciever = {
      uid: chat[i].recieverId,
      name: recieverfullname,
    };
    let user = {
      user: {
        _id: chat[i].createdBy,
        name: userfullname,
      },
    };
    let obj = Object.assign(user, reciever, chat2);
    data.push(obj);
  }

  res.status(200).json({
    success: true,
    messages: data,
  });
});

// @desc    Get all unrecieved messages
// @route   POST/api/v1/chat/getusers
// @access  Private
exports.getallUnRecievedMessages = asyncHandler(async (req, res, next) => {
  let allchat = await Userchat.aggregate([
    {
      $match: { recieverId: req.user._id, received: false }
    },
    {
      $lookup:
      {
        from: "User",
        localField: "createdBy",
        foreignField: "_id",
        as: "user"
      }
    },
    {
      $group: {
        _id: "$createdBy",
        count: { $sum: 1 },
      }
    },
  ])

  res.status(200).json({
    success: true,
    users: allchat,
  });
});

// exports.getalluser = asyncHandler(async (req, res, next) => {
//   let count = 0;
//   let user = await User.findById(req.user._id);
//   let userslist = [];
//   let activeuser = [];
//   if (user.role == "Admin") {
//     let chat = await Userchat.find({
//       $or: [{ recieverId: req.user._id }, { createdBy: req.user._id }],
//     }).populate({ path: "user", select: "_id firstName lastName avatarUrl" }).sort({createdAt:-1});


//     console.log("chat : ",chat[0])
//     let arr = [];
//     let uniqueArray = [];
//     for (i = 0; i < chat.length; i++) {
//       let user1 = await User.findById(chat[i].recieverId);
//       let user2 = await User.findById(chat[i].createdBy);
//       let timer = Date.now() - chat[i].timenow;
//       let time1 = Math.floor(timer / 1000);
//       let time2 = await timeSince(chat[i].timenow);
//       if (chat[i].received == false) {
//         count++;
//       }
//       let time = {
//         time: time1,
//         time2: time2,
//       };

//       let obj = Object.assign(time, user2._doc, user1._doc);
//       arr.push(obj);
//     }

// //  console.log("Array : " ,arr)

//     for (let i = 0; i < arr.length; i++) {
//       let id = arr[i]._id.toString();
//       let userid = req.user._id.toString();
//       if (id !== userid) {
//         activeuser.push(id);
//       }
//     }
//     console.log("Active user", activeuser);
//     uniqueArray = Array.from(new Set(activeuser));
//     console.log("unique", uniqueArray);
//     for (let i = 0; i < uniqueArray.length; i++) {
//       console.log(i, "+", uniqueArray[i]);
//       let msg = await lastKnownMessage(uniqueArray[i]);
//       // console.log("Message",msg)
//       msg.time2 = await timeSince(msg.timenow);
//       // msg.time2=await timeSince(msg.timenow);
//       let users = await User.findById(uniqueArray[i]);
//       let obj = {
//         lastMessage: msg,
//         user: users,
//         unreceived: count,
//       };
//       userslist.push(obj);
//     }
//   }
//   res.status(200).json({
//     success: true,
//     users: userslist,
//   });
// })

// @desc    Get all users for admin
// @route   POST/api/v1/chat/getusers
// @access  Private
exports.getalluser = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.user._id);
  let userslist = [];
  let activeuser = [];

  if (user.role == "Admin") {
  
    let chat = await Userchat.find({
      $or: [{ recieverId: req.user._id }, { createdBy: req.user._id }],
    }).select('recieverId createdBy').sort({ createdAt: -1 });
    let uniqueArray = [];

    for (let i = 0; i < chat.length; i++) {
      if(chat[i].createdBy.toString() !== req.user._id.toString()){
        activeuser.push(chat[i].createdBy.toString());
      }
      if(chat[i].recieverId.toString() !== req.user._id.toString()){
        activeuser.push(chat[i].recieverId.toString());
      }
    }
    uniqueArray = Array.from(new Set(activeuser));

    for (let i = 0; i < uniqueArray.length; i++) {
      let msg = await lastKnownMessage(uniqueArray[i]);
      msg.time2 = await timeSince(msg.timenow);
      let users = await User.findById(uniqueArray[i]);
      let obj = {
        createdTime: msg.timenow,
        lastMessage: msg,
        user: users,
      };
      userslist.push(obj);
    }
  } else {
    return next(new ErrorResponse("Only Admin can access this route", 400));
  }

  res.status(200).json({
    success: true,
    users: userslist,
  });
});

// @desc    Post request for send douments
// @route   GET/api/v1/chat
// @access  Private
exports.sendDocuments = asyncHandler(async (req, res, next) => {
  const { messagess } = req.body;
  let arr1 = [];
  let user3 = await User.findById(req.user._id);
  if (user3.blocked == true) {
    return next(new ErrorResponse(msg.block, 400));
  }

  let { user_id } = req.body;
  if (user_id == "admin") {
    let userId = await User.findOne({ role: "Admin" });
    user_id = userId._id;
  }
  var link = req.files;
  let url;
  if (link != null) {
    for (let i = 0; i < link.length; i++) {
      url = `${link[i].key}`;

      let user = await User.findById(user_id);
      if (!user) {
        return next(new ErrorResponse(msg.UserNotExist, 409));
      }
      var newItem = new Userchat();
      let socketmessage = {
        text: url,
        file: url,
      };

      newItem.pending = false;
      (newItem.sent = true);
      (newItem.received = false);


      io.getio().on("reconnection", function (lastKnownMessage) {
        // you may want to make sure you resend them in order, or one at a time, etc.
        for (
          messagess = lastKnownMessage;
          messagess <= pendingMessagesForSocket.length;
          messagess++
        ) {
          io.getio().emit("message", messagess, function () {
            newItem.pending = false;
            newItem.sent = true;
            newItem.received = false;
            pendingMessagesForSocket.pop(messagess);
          });
        }
      });

      newItem.text = url;
      newItem.document = url;
      (newItem.createdBy = req.user._id);
      (newItem.recieverId = user._id);
      await newItem.save();

      let chat = await Userchat.findById(newItem._id);
      let recievers = await User.findById(chat.recieverId);
      let recieverfullname = `${recievers.firstName} ${recievers.lastName}`;
      let users = await User.findById(chat.createdBy);
      let userfullname = `${users.firstName} ${users.lastName}`;
      let chat2 = chat._doc;

      let reciever = {
        uid: chat.recieverId,
        name: recieverfullname,
      };
      let user4 = {
        user: {
          _id: chat.createdBy,
          name: userfullname,
        },
      };
      let obj = Object.assign(user4, reciever, chat2);

      arr1.push(obj);
      console.log("obj : ", obj);
      var pendingMessagesForSocket = [];
      await sendMessage(socketmessage);
      function sendMessage(messagess) {
        pendingMessagesForSocket.push(messagess);
        newItem.pending = false;
        io.getio().emit(`multimedia/${recievers._id}`, obj);

        pendingMessagesForSocket.pop(messagess);
      }

      let msg = `${user3.firstName} sent you a  message`;
      const registrationToken = user.fca_token;
      let messages = msg;

      var message = {
        //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: registrationToken,

        notification: {
          title: "Green Hedge Capital",
          body: messages,
        },
      };

      await fcm.send(message, function (err, response) {
        if (err) {
          console.log("Something has gone wrong!", err);
        } else {
          console.log("Successfully sent with response: ", response);
        }
      });
    }
  }
  res.status(200).json({
    success: true,
    status: "Message Sent",
    data: arr1,
  });
});

// @desc    Post request for send image/video with websockets
// @route   GET/api/v1/chat
// @access  Private
exports.sendmultimedia = asyncHandler(async (req, res, next) => {
  const { messagess } = req.body;
  let arr1 = [];

  let user3 = await User.findById(req.user._id);
  if (user3.blocked == true) {
    return next(new ErrorResponse(msg.block, 400));
  }

  let { user_id } = req.body;
  if (user_id == "admin") {
    let userId = await User.findOne({ role: "Admin" });
    user_id = userId._id;
  }
  var myFiles = req.files;
  let url;

  if (myFiles.length !== 0) {
    for (let i = 0; i < myFiles.length; i++) {

      url = `${myFiles[i].key}`;

      let user = await User.findById(user_id);
      if (!user) {
        return next(new ErrorResponse(msg.UserNotExist, 409));
      }
      var newItem = new Userchat();
      let socketmessage = {
        text: messagess,
        file: url,
      };

      newItem.pending = false;
      newItem.sent = true;
      newItem.received = false;

      io.getio().on("reconnection", function (lastKnownMessage) {
        // you may want to make sure you resend them in order, or one at a time, etc.
        for (
          messagess = lastKnownMessage;
          messagess <= pendingMessagesForSocket.length;
          messagess++
        ) {
          io.getio().emit("message", messagess, function () {
            newItem.pending = false;
            (newItem.sent = true);
            (newItem.received = false);
            pendingMessagesForSocket.pop(messagess);
          });
        }
      });
      newItem.text = messagess;
      if (myFiles != null) {
        var type = myFiles[i].mimetype;
        var typeArray = type.split("/");
        if (typeArray[0] == "video") {
          newItem.video = url;
        }
        if (typeArray[0] == "image") {
          newItem.image = url;
        }
      }
      newItem.createdBy = req.user._id;
      newItem.recieverId = user._id;
      await newItem.save();

      let chat = await Userchat.findById(newItem._id);
      let recievers = await User.findById(chat.recieverId);
      let recieverfullname = `${recievers.firstName} ${recievers.lastName}`;
      let users = await User.findById(chat.createdBy);
      let userfullname = `${users.firstName} ${users.lastName}`;
      let chat2 = chat._doc;

      let reciever = {
        uid: chat.recieverId,
        name: recieverfullname,
      };
      let user5 = {
        user: {
          _id: chat.createdBy,
          name: userfullname,
        },
      };
      let obj = Object.assign(user5, reciever, chat2);

      arr1.push(obj);

      var pendingMessagesForSocket = [];
      await sendMessage(socketmessage);
      function sendMessage(messagess) {
        pendingMessagesForSocket.push(messagess);
        newItem.pending = false;
        io.getio().emit(`multimedia/${recievers._id}`, obj);

        pendingMessagesForSocket.pop(messagess);
      }

      let msg = `${user3.firstName} sent you a  message`;
      const registrationToken = user.fca_token;
      let messages = msg;

      var message = {
        //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: registrationToken,

        notification: {
          title: "Green Hedge Capital",
          body: messages,
        },
      };

      await fcm.send(message, function (err, response) {
        if (err) {
          console.log("Something has gone wrong!", err);
        } else {
          console.log("Successfully sent with response: ", response);
        }
      });
    }
  } else {
    let user = await User.findById(user_id);
    var newItem = new Userchat();
    let socketmessage = {
      text: messagess,
      file: url,
    };
    newItem.pending = false;
    newItem.sent = true;
    newItem.received = false;

    var pendingMessagesForSocket = [];

    io.getio().on("reconnection", function (lastKnownMessage) {
      // you may want to make sure you resend them in order, or one at a time, etc.
      for (
        messagess = lastKnownMessage;
        messagess <= pendingMessagesForSocket.length;
        messagess++
      ) {
        io.getio().emit("message", messagess, function () {
          newItem.pending = false;
          (newItem.sent = true);
          (newItem.received = false);
          pendingMessagesForSocket.pop(messagess);
        });
      }
    });
    newItem.text = messagess;
    (newItem.createdBy = req.user._id);
    (newItem.recieverId = user._id);
    await newItem.save();

    let chat = await Userchat.findById(newItem._id);
    let recievers = await User.findById(chat.recieverId);
    let recieverfullname = `${recievers.firstName} ${recievers.lastName}`;
    let users = await User.findById(chat.createdBy);
    let userfullname = `${users.firstName} ${users.lastName}`;
    let chat2 = chat._doc;

    let reciever = {
      uid: chat.recieverId,
      name: recieverfullname,
    };
    let user6 = {
      user: {
        _id: chat.createdBy,
        name: userfullname,
      },
    };
    let obj = Object.assign(user6, reciever, chat2);

    arr1.push(obj);

    var pendingMessagesForSocket = [];
    await sendMessage(socketmessage);
    function sendMessage(messagess) {
      pendingMessagesForSocket.push(messagess);
      newItem.pending = false;
      io.getio().emit(`multimedia/${recievers._id}`, obj);

      pendingMessagesForSocket.pop(messagess);
    }


    let msg = `${user3.firstName} send you a message`;
    const registrationToken = user.fca_token;

    var message = {
      //this may vary according to the message type (single recipient, multicast, topic, et cetera)
      to: registrationToken,

      notification: {
        title: "Green Hedge Capital",
        body: msg,
      },
    };

    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Something has gone wrong!");
      } else {
        console.log("Successfully sent with response: ", response);
      }
    });
  }
  res.status(200).json({
    success: true,
    status: "Message Sent",
    data: arr1,
  });
});

// @desc    Post request for send message
// @route   POST/api/v1/chat
// @access  Private
// exports.postchat = asyncHandler(async (req, res, next) => {
//     try {
//         const { message } = req.body;
//         console.log(message);
//         const { user_id } = req.body;
//         console.log(user_id);
//         let user = await User.findById(user_id);
//         if (!message) throw new Error("Message Cannot be Blank");
//         const usermessage = Userchat.create({
//             text: message,
//             createdBy: req.user._id,
//             recieverId: user._id,
//         })
//         io.getio().emit('message', { text: message });
//         res.status(200).json({
//             success: true,
//             message: usermessage,
//         })
//     } catch (error) {
//         res.status(400).json({
//             error: error.message
//         });
//     }
// })

// @desc    Post request for send image/video without websocket
// @route   GET/api/v1/chat
// @access  Private
// exports.sendmultimedia = asyncHandler(async (req, res, next) => {
//     var myFiles = req.file;
//     let path = myFiles.path;
//     let filename = path.split('/')[1];
//     const { message } = req.body;
//     const { user_id } = req.body;
//     let user = await User.findById(user_id);
//     let url = `/static/${filename}`;

//     var newItem = new Userchat();
//     newItem.text = message;
//     var type = myFiles.mimetype;
//     var typeArray = type.split("/");
//     if (typeArray[0] == "video") {
//         newItem.video = url;
//     }
//     if (typeArray[0] == "image") {
//         newItem.image = url;
//     }
//     newItem.createdBy = req.user._id,
//         newItem.recieverId = user._id,
//         newItem.save();
//     res.status(200).json({
//         success: true,
//         status: "Message Sent"
//     })
// });



// let data2 = await Userchat.aggregate([
    //   {
    //     $sort: {
    //       'createdAt': -1
    //     }
    //   },
    //   {
    //     $match: {
    //       $or: [{ recieverId: req.user._id }, { createdBy: req.user._id }],
    //     }
    //   },
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "createdBy",
    //       foreignField: "_id",
    //       as: "UserChatList"
    //     }
    //   },
    //   {
    //     $group: {
    //       '_id': '$createdBy',
    //       'createdAt': {
    //         '$first': '$createdAt'
    //       },
    //       'timenow': {
    //         '$first': '$timenow'
    //       },
    //     }
    //   },

    // ]);
