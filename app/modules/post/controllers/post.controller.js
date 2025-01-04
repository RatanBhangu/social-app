const { msg } = require("../../../../config/message");
const asyncHandler = require("../../../middleware/async");
const ErrorResponse = require("../../../helper/errorResponse");
const admin = require("../../../db/firebase");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const Post = require("../models/post.model");
const Comment = require("../models/post.comment");
const CommentReply = require("../models/post.commentreply");
const Channel = require("../../channel/models/channel.model");
const User = require("../../user/models/user.model");
const { pickPostResponse } = require("../../../helper/pickReqRes.helper");
const { commentCount } = require("../../../helper/commentcount");
var io = require("../../../../socket");
const {
  sendVerificationOtpOnPhone,
  verifyOtpOnPhone,
} = require("../../../helper/twilio");
const { timeSince } = require("../../../helper/timeago");

var FCM = require("fcm-node");
var serverKey =process.env.FCMSERVERKEY; //put your server key here
var fcm = new FCM(serverKey);

exports.getcreatePost = asyncHandler(async (req, res, next) => {
  res.render("post");
});

// @desc    post request to upload multiple images
// @route   POST/api/v1/post/uploadmultiple
// @access   Private('Admin')
exports.uploadfiles = asyncHandler(async (req, res, next) => {
  var myFiles = req.files;
  const { content } = req.body;
  const { channel_id } = req.body;
  const channell = await Channel.findById(channel_id);
  if (!channell) {
    return next(new Error("Not found Channel of this Name", 401));
  }
  let arr = [];
  let mimetype;

  if (myFiles != null) {
    myFiles.map((result) => {
      console.log(result)
      let obj = {
        type: result.mimetype.split('/')[0],
        path: `${result.key}`,
      };
      arr.push(obj);
    });
  }

  let socketmessage = {
    content: content,
    multimedia: arr,
    channelId: channell._id,
    user: req.user._id,
  };
  io.getio().emit("post", socketmessage);
  if (channell.is_Trading == true) {
    io.getio().emit("tradingpost", socketmessage);
  }
  var newItem = new Post();
  newItem.content = content;
  if (myFiles != null) {
    newItem.postmultimedia = arr;
  }
  newItem.channelId = channell._id;
  newItem.mimetype = mimetype;
  newItem.user = req.user._id;
  newItem.save();
  let user = await User.findById(req.user._id);
  let msg = `${user.firstName} ${user.lastName} upload a post `;

  let user1 = [];
  if (channell.is_Private == true) {
    let users2 = channell.users;
    for (let k = 0; k < users2.length; k++) {
      let user3 = await User.findById(users2[k]._id);
      user1.push(user3);
    }
  } else {
    user1 = await User.find({ role: "User" });
  }

  for (let i = 0; i < user1.length; i++) {
    let id = user1[i]._id.toString();
    let _id = req.user._id.toString();
    if (id === _id) {
      console.log("same user");
    } else {
      console.log("else");
      let registrationToken = user1[i].fca_token;

      var message = {
        //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: registrationToken,

        notification: {
          title: "Green Hedge Capital",
          body: msg,
        },
      };
      await fcm.send(message, async function (err, response) {
        if (err) {
          console.log("Something has gone wrong!", err);
        } else {
          console.log("Successfully sent with response: ", response);
        }
      });
    }
  }

  let user5 = await User.findById(req.user._id).select(
    "_id firstName lastName"
  );

  newItem._doc.user = user5;
  newItem._doc.likecount = 0;
  newItem._doc.unlikecount = 0;
  newItem._doc.liked = 0;
  newItem._doc.commentcount = 0;

  setTimeout(() => {
    res.status(200).json({
      success: true,
      name: `${req.user.firstName} ${req.user.lastName}`,
      data: newItem,
    });
  }, 5000);
});

// @desc    update post by its id
// @route   PUT/api/v1/post/:id
// @access  Private ('Admin')
exports.updatePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findByIdAndUpdate(req.params.id, req.body, {
    runValidators: true,
    new: true,
  });

  res.status(200).json({
    succes: true,
    data: pickPostResponse(post),
  });
});

// @desc    delete a post by its id
// @route   DELETE/api/v1/post/:id
// @access  Private ('Admin')
exports.destroyPost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  const comment = await Comment.findOneAndDelete({ postid: post._id });
  await Post.findByIdAndDelete(req.params.id);
  res.status(200).json({
    success: true,
    status: "deleted",
  });
});

// @desc    delete a comment by its id
// @route   DELETE/api/v1/post/commentdelete/:id
// @access  Private ('Admin')
exports.commentDelete = asyncHandler(async (req, res, next) => {
  let comment = await Comment.findById(req.params.id);
  console.log("Comment : ", comment);
  io.getio().emit(`comment_delete_socket/${comment.postid}`, {
    data: comment,
    commentId: comment._id,
    postId: comment.postid,
    userId: req.user._id,
    reply: false,
  });

  await Comment.findByIdAndDelete(req.params.id);
  res.status(200).json({
    success: true,
    status: "comment deleted",
  });
});

// @desc    delete a comment by its id
// @route   DELETE/api/v1/post/commentdelete/:id
// @access  Private ('Admin')
exports.commentReplyDelete = asyncHandler(async (req, res, next) => {
  let comment = await CommentReply.findById(req.params.id);

  let coment1 = await Comment.findByIdAndUpdate(comment.commentid, {
    $pull: {
      reply: comment._id,
    },
  });

  io.getio().emit(`comment_delete_socket/${comment.postid}`, {
    data: comment,
    commentId: comment._id,
    postId: comment.postid,
    userId: req.user._id,
    reply: true,
  });
  comment = await CommentReply.findByIdAndDelete(comment._id);

  res.status(200).json({
    success: true,
    status: "comment deleted",
  });
});

// @desc    post request to like a post
// @route   POST/api/v1/post/likes/:id
// @access  Public
exports.postLikePost = asyncHandler(async (req, res, next) => {
  let { temp } = req.body;
  let post = await Post.findById(req.params.id);
  if (temp == true) {
    const alreadyLike = post.likes.map((result) => {
      result = result.toString();
      if (result == req.user._id) {
        return next(new ErrorResponse("You already like this post"));
      }
    });
    await Post.findByIdAndUpdate(req.params.id, {
      $push: { likes: req.user._id },
      $pull: { unlikes: req.user._id },
    });

    let user = await User.findById(req.user._id);
    let msg = `${user.firstName} ${user.lastName} like a post `;
    let user1 = await User.find({ role: "Admin" });

    const registrationToken = user1[0].fca_token;
    const message1 = msg;

    var message = {
      //this may vary according to the message type (single recipient, multicast, topic, et cetera)
      to: registrationToken,

      notification: {
        title: "Green Hedge Capital",
        body: message1,
      },
    };

    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Something has gone wrong!");
      } else {
        console.log("Successfully sent with response: ", response);
      }
    });

    io.getio().emit("likes", { userid: req.user._id });
  } else {
    const alreadyUnLike = post.unlikes.map((result) => {
      result = result.toString();
      if (result == req.user._id) {
        return next(new ErrorResponse("You already unlike this post"));
      }
    });
    await Post.findByIdAndUpdate(req.params.id, {
      $push: { unlikes: req.user._id },
      $pull: { likes: req.user._id },
    });

    let user = await User.findById(req.user._id);
    let msg = `${user.firstName} ${user.lastName} unlike a post `;
    let user1 = await User.find({ role: "Admin" });

    const registrationToken = user1[0].fca_token;
    const message1 = msg;

    var message = {
      //this may vary according to the message type (single recipient, multicast, topic, et cetera)
      to: registrationToken,

      notification: {
        title: "Green Hedge Capital",
        body: message1,
      },
    };

    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Something has gone wrong!");
      } else {
        console.log("Successfully sent with response: ", response);
      }
    });
    io.getio().emit("unlikes", { userid: req.user._id });
  }
  res.status(200).json({
    success: true,
  });
});

// @desc    post request to comment on a post
// @route   POST/api/v1/post/comment/:id
// @access  Public
exports.postcomment = asyncHandler(async (req, res, next) => {
  const { comments } = req.body;
  var myFiles = req.files;
  let arr = [];

  if (myFiles.length != 0) {
    myFiles.map((result) => {
      let obj = {
        type: result.mimetype.split('/')[0],
        path: `${result.key}`,
      };
      arr.push(obj);
    });
  }

  let coment = await Comment.create({
    postid: req.params.id,
    comment: comments,
    multimedia: arr,
    userid: req.user._id,
  });

  coment = await Comment.findById(coment._id)
    .populate("userid", "firstName lastName email phone blocked")
    .populate(
      "reply",
      "comment multimedia commentid userid postid createdAt updatedAt"
    );

  console.log("comment : ", coment);
  let user = await User.findById(req.user._id);
  let msg = `${user.firstName} ${user.lastName} commented on your post `;
  let user1 = await User.find({ role: "Admin" });

  const registrationToken = user1[0].fca_token;
  const message1 = msg;
  var message = {
    //this may vary according to the message type (single recipient, multicast, topic, et cetera)
    to: registrationToken,

    notification: {
      title: "post",
      body: message1,
    },
  };

  fcm.send(message, function (err, response) {
    if (err) {
      console.log("Something has gone wrong!");
    } else {
      console.log("Successfully sent with response: ", response);
    }
  });

  io.getio().emit(`comment_reply_socket/${coment.postid}`, {
    data: coment,
    userId: req.user._id,
    reply: false,
  });
  res.status(200).json({
    success: true,
    status: "Send Comment!",
    data: coment,
  });
});

// @desc    get request to show comments
// @route   POST/api/v1/post/getcomment/:id
// @access  Public
exports.getCommentsOfPost = asyncHandler(async (req, res, next) => {
  let arr = [];
  let comment = await Comment.find({ postid: req.params.id })
    .populate("postid", "content postmultimedia channelId likes unlikes user")
    .populate("userid", "firstName lastName email phone blocked")
    .populate(
      "reply",
      "comment multimedia commentid userid postid createdAt updatedAt"
    );
  let count = 0;
  console.log("comment : ", comment);
  for (let i = 0; i < comment.length; i++) {
    if (comment[i].userid.blocked == false) {
      count += 1;
      if (comment[i].reply.length != 0) {
        for (let j = 0; j < comment[i].reply.length; j++) {
          count += 1;
          let user1 = await User.findById(comment[i].reply[j].userid).select(
            "_id firstName lastName email phone blocked"
          );
          console.log("users : : ", user1);
          if (user1.blocked == false) {
            comment[i].reply[j]._doc.userid = user1;
          }
        }
      }
    }
    arr.push(comment[i]);
  }

  res.status(200).json({
    success: true,
    CommentCount: count,
    Comment: arr,
  });
});

// @desc    post request reply any comment
// @route   POST/api/v1/post/postcommentreply/:id
// @access   Public
exports.postcommentreply = asyncHandler(async (req, res, next) => {
  const { reply } = req.body;
  let user3 = await User.findById(req.user._id);
  if (user3.blocked == true) {
    return next(new ErrorResponse(msg.block, 400));
  }

  var myFiles = req.files;
  let arr = [];

  if (myFiles) {
    if (myFiles.length != 0) {
      myFiles.map((result) => {
        let obj = {
          type: result.mimetype.split('/')[0],
          path: `${result.key}`,
        };
        arr.push(obj);
      });
    }
  }
  let comment2 = await Comment.findById(req.params.id);

  let commentreply1 = await CommentReply.create({
    postid: comment2.postid,
    commentid: comment2._id,
    multimedia: arr,
    comment: reply,
    userid: req.user._id,
  });

  commentreply1 = await CommentReply.findById(commentreply1._id).populate(
    "userid",
    "firstName lastName email phone blocked"
  );

  const coment = await Comment.findByIdAndUpdate(req.params.id, {
    $push: {
      reply: commentreply1._id,
    },
  });
  console.log(coment);

  let user = await User.findById(req.user._id);
  let msg = `${user.firstName} ${user.lastName} replied on your comment `;
  let user1 = await User.find({ role: "Admin" });

  const registrationToken = user1[0].fca_token;
  const message1 = msg;
  var message = {
    to: registrationToken,

    notification: {
      title: "post",
      body: message1,
    },
  };

  fcm.send(message, function (err, response) {
    if (err) {
      console.log("Something has gone wrong!");
    } else {
      console.log("Successfully sent with response: ", response);
    }
  });

  io.getio().emit(`comment_reply_socket/${commentreply1.postid}`, {
    data: commentreply1,
    userId: req.user._id,
    reply: true,
  });

  res.status(200).json({
    success: true,
    status: "Send Reply!",
    data: commentreply1,
  });
});

exports.getPrivatePublicChannelPosts = asyncHandler(async (req, res, next) => {
  let page = parseInt(req.query.page) >= 1 ? parseInt(req.query.page) : 1,
    limit = parseInt(req.query.limit) ? parseInt(req.query.limit) : 10;

  const posts = await Post.find({})
    .populate({ path: "user", select: "firstName lastName avatarUrl" })
    .sort({ createdAt: -1 })
    .skip(limit * page - limit)
    .limit(limit);

  let data = [];

  let user3 = await User.findById(req.user._id);
  if (user3.blocked == false) {
    for (let i = 0; i < posts.length; i++) {
      if (req.params.id == "all") {
        let obj = {};
        const channel = await Channel.findOne({ _id: posts[i].channelId });
        // let users = channel.users;
        if (channel != null) {
          if (channel.is_Trading == false) {
            var user = await User.findById(req.user._id);
            if (!user) {
              return next(new ErrorResponse(msg.userNotExist, 401));
            }
            if (user.role == "Admin") {
              let likecount = 0;
              let selflike = 0;
              posts[i].likes.map((result) => {
                result = result.toString();
                likecount += 1;
                if (result == req.user._id) {
                  selflike += 1;
                  likecount -= 1;
                }
              });
              let unlikecount = 0;
              posts[i].unlikes.map((result) => {
                unlikecount += 1;
              });

              let comments = await Comment.find({ postid: posts[i]._id });
              let commentcount = 0;
              comments.map((result) => {
                commentcount += 1;
                result.reply.map((result) => {
                  commentcount += 1;
                });
              });
              let time = timeSince(posts[i].timeago);
              let postdata = {
                likecount: likecount,
                unlikecount: unlikecount,
                liked: selflike,
                commentcount: commentcount,
                time: time,
              };
              obj = Object.assign(posts[i]._doc, postdata);
            
              data.push(obj);
            } else {
              if (channel.is_Private == true) {
                console.log("channel : ", channel);
                for (let k = 0; k < channel.users.length; k++) {
                  let user = channel.users[k]._id.toString();
                  if (user == req.user._id) {
                    console.log("private post user");
                    let likecount = 0;
                    let selflike = 0;
                    posts[i].likes.map((result) => {
                      result = result.toString();
                      likecount += 1;
                      if (result == req.user._id) {
                        selflike += 1;
                        likecount -= 1;
                      }
                    });
                    let unlikecount = 0;
                    posts[i].unlikes.map((result) => {
                      unlikecount += 1;
                    });

                    let comments = await Comment.find({ postid: posts[i]._id });
                    let commentcount = 0;
                    comments.map((result) => {
                      commentcount += 1;
                      result.reply.map((result) => {
                        commentcount += 1;
                      });
                    });
                    let time = timeSince(posts[i].timeago);
                    let postdata = {
                      likecount: likecount,
                      unlikecount: unlikecount,
                      liked: selflike,
                      commentcount: commentcount,
                      time: time,
                    };
                    obj = Object.assign(posts[i]._doc, postdata);

                    data.push(obj);
                  }
                }
              } else {
                let likecount = 0;
                let selflike = 0;
                posts[i].likes.map((result) => {
                  result = result.toString();
                  likecount += 1;
                  if (result == req.user._id) {
                    selflike += 1;
                    likecount -= 1;
                  }
                });
                let unlikecount = 0;
                posts[i].unlikes.map((result) => {
                  unlikecount += 1;
                });

                let comments = await Comment.find({ postid: posts[i]._id });
                let commentcount = 0;
                comments.map((result) => {
                  commentcount += 1;
                  result.reply.map((result) => {
                    commentcount += 1;
                  });
                });
                let time = timeSince(posts[i].timeago);
                let postdata = {
                  likecount: likecount,
                  unlikecount: unlikecount,
                  liked: selflike,
                  commentcount: commentcount,
                  time: time,
                };
                obj = Object.assign(posts[i]._doc, postdata);
                // obj.post = posts[i];
                // obj.postdata = postdata;
                data.push(obj);
              }
            }
          }
        }
      } else {
        let obj = {};
        const channel = await Channel.findById(req.params.id);
        let channelid = channel._id.toString();
        const channel1 = await Channel.findById(posts[i].channelId);
        if (channel1) {
          let channelid1 = channel1._id.toString();
          if (channelid == channelid1) {
            if (channel != null) {
              if (channel.is_Trading == false) {
                var user = await User.findById(req.user._id);
                if (!user) {
                  return next(new ErrorResponse(msg.userNotExist, 401));
                }
                if (user.role == "Admin") {
                  let likecount = 0;
                  let selflike = 0;
                  posts[i].likes.map((result) => {
                    result = result.toString();
                    likecount += 1;
                    if (result == req.user._id) {
                      selflike += 1;
                      likecount -= 1;
                    }
                  });
                  let unlikecount = 0;
                  posts[i].unlikes.map((result) => {
                    unlikecount += 1;
                  });

                  let comments = await Comment.find({ postid: posts[i]._id });
                  let commentcount = 0;
                  comments.map((result) => {
                    commentcount += 1;
                    result.reply.map((result) => {
                      commentcount += 1;
                    });
                  });
                  let time = timeSince(posts[i].timeago);
                  let postdata = {
                    likecount: likecount,
                    unlikecount: unlikecount,
                    liked: selflike,
                    commentcount: commentcount,
                    time: time,
                  };
                  obj = Object.assign(posts[i]._doc, postdata);
                  // obj.post = posts[i];
                  // obj.postdata = postdata;
                  data.push(obj);
                } else {
                  if (channel.is_Private == true) {
                    console.log("channel : ", channel);
                    for (let k = 0; k < channel.users.length; k++) {
                      let user = channel.users[k]._id.toString();
                      if (user == req.user._id) {
                        console.log("private post user");
                        let likecount = 0;
                        let selflike = 0;
                        posts[i].likes.map((result) => {
                          result = result.toString();
                          likecount += 1;
                          if (result == req.user._id) {
                            selflike += 1;
                            likecount -= 1;
                          }
                        });
                        let unlikecount = 0;
                        posts[i].unlikes.map((result) => {
                          unlikecount += 1;
                        });

                        let comments = await Comment.find({
                          postid: posts[i]._id,
                        });
                        let commentcount = 0;
                        comments.map((result) => {
                          commentcount += 1;
                          result.reply.map((result) => {
                            commentcount += 1;
                          });
                        });
                        let time = timeSince(posts[i].timeago);
                        let postdata = {
                          likecount: likecount,
                          unlikecount: unlikecount,
                          liked: selflike,
                          commentcount: commentcount,
                          time: time,
                        };
                        obj = Object.assign(posts[i]._doc, postdata);
                        // obj.postprivate = posts[i];
                        // obj.postdata = postdata;
                        data.push(obj);
                      }
                    }
                  } else {
                    let likecount = 0;
                    let selflike = 0;
                    posts[i].likes.map((result) => {
                      result = result.toString();
                      likecount += 1;
                      if (result == req.user._id) {
                        selflike += 1;
                        likecount -= 1;
                      }
                    });
                    let unlikecount = 0;
                    posts[i].unlikes.map((result) => {
                      unlikecount += 1;
                    });

                    let comments = await Comment.find({ postid: posts[i]._id });
                    let commentcount = 0;
                    comments.map((result) => {
                      commentcount += 1;
                      result.reply.map((result) => {
                        commentcount += 1;
                      });
                    });
                    let time = timeSince(posts[i].timeago);
                    let postdata = {
                      likecount: likecount,
                      unlikecount: unlikecount,
                      liked: selflike,
                      commentcount: commentcount,
                      time: time,
                    };
                    obj = Object.assign(posts[i]._doc, postdata);
                   
                    data.push(obj);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  res.status(200).json({
    success: true,
    count: posts.length,
    data: data,
  });
});

exports.getTradingChannelPosts = asyncHandler(async (req, res, next) => {
 
  const posts = await Post.find({}).populate({
    path: "user",
    select: "firstName lastName avatarUrl",
  });

  let data = [];
  let user3 = await User.findById(req.user._id);

  if (user3.blocked == false) {
    for (let i = 0; i < posts.length; i++) {
      let obj = {};
      const channel = await Channel.findOne({ _id: posts[i].channelId });
      if (channel != null) {
        if (channel.is_Trading == true) {
          var user = await User.findById(req.user._id);
          if (!user) {
            return next(new ErrorResponse(msg.userNotExist, 401));
          }
          if (user.role == "Admin") {
            let likecount = 0;
            let selflike = 0;
            posts[i].likes.map((result) => {
              result = result.toString();
              likecount += 1;
              if (result == req.user._id) {
                selflike += 1;
                likecount -= 1;
              }
            });
            let unlikecount = 0;
            posts[i].unlikes.map((result) => {
              unlikecount += 1;
            });

            let comments = await Comment.find({ postid: posts[i]._id });
            let commentcount = 0;
            comments.map((result) => {
              commentcount += 1;
              result.reply.map((result) => {
                commentcount += 1;
              });
            });
            let time = timeSince(posts[i].timeago);
            let postdata = {
              likecount: likecount,
              unlikecount: unlikecount,
              liked: selflike,
              commentcount: commentcount,
              time: time,
            };
            obj = Object.assign(posts[i]._doc, postdata);
         
            data.push(obj);
          } else {
            for (let j = 0; j < channel.users.length; j++) {
              let user = channel.users[j]._id.toString();
              if (user == req.user._id) {
                let timer = Date.now() - channel.users[j].timeago;
                console.log("time :", timer);
                let time = Math.floor(timer / 1000);
                console.log("Verify time :", time);
                if (time > 86400) {
                  channel.users[j].isVerify = false;
                  return next(new ErrorResponse(msg.notVerified, 401));
                }
                if (channel.users[j].isVerify == true) {
                  console.log("slf user");
                  let likecount = 0;
                  let selflike = 0;
                  posts[i].likes.map((result) => {
                    result = result.toString();
                    likecount += 1;
                    if (result == req.user._id) {
                      selflike += 1;
                      likecount -= 1;
                    }
                  });
                  let unlikecount = 0;
                  posts[i].unlikes.map((result) => {
                    unlikecount += 1;
                  });
                  let comments = await Comment.find({ postid: posts[i]._id });
                  let commentcount = 0;
                  comments.map((result) => {
                    commentcount += 1;
                    result.reply.map((result) => {
                      commentcount += 1;
                    });
                  });
                  let time = timeSince(posts[i].timeago);
                  let postdata = {
                    likecount: likecount,
                    unlikecount: unlikecount,
                    liked: selflike,
                    commentcount: commentcount,
                    time: time,
                  };
                  obj = Object.assign(posts[i]._doc, postdata);
                
                  data.push(obj);
                } else {
                  return next(new ErrorResponse(msg.notVerified, 401));
                }
              }
            }
          }
        }
      }
    }
  }
  res.status(200).json({
    success: true,
    count: posts.length,
    data: data,
  });
});

// @desc    Send Otp
// @route   POST/api/v1/post/sendotp
// access   Public
exports.sendOtp = asyncHandler(async (req, res, next) => {
  let { phone } = req.body;
  if (!phone) {
    //validate phone
    return next(new ErrorResponse(msg.noPhoneOrPassword, 400));
  }
  const user = await User.findOne({ phone: phone }); //check for user
  if (!user) {
    return next(new ErrorResponse(msg.unauthorizedUser, 401));
  }
  await sendVerificationOtpOnPhone(phone);
  res.status(200).json({
    success: true,
    status: "Otp Sent",
  });
});

// @desc    Verify the otp sent on mobile with the otp entered by user
// @route   POST/api/v1/post/verifyotp
// @access  Private
exports.verifyOtp = asyncHandler(async (req, res, next) => {
  const { otp } = req.body;
  const user = await User.findById(req.user._id);
  let phone = user.phone;
  let ack = await verifyOtpOnPhone(otp, phone);
  // console.log("ack = ", ack.status);
  if (ack.status == "approved") {
    let channel = await Channel.find();
    for (let j = 0; j < channel.length; j++) {
      if (channel[j].is_Trading == true) {
        let users = channel[j].users;
        for (let i = 0; i < users.length; i++) {
          // console.log("id = ", channel[j].users[i]._id);
          let userid = channel[j].users[i]._id.toString();
          if (userid == req.user._id) {
            channel[j].users[i].isVerify = true;
            channel[j].users[i].timeago = Date.now();
            channel[j].save();
          }
        }
      }
    }
  } else {
    res.status(400).json({
      error: error.message,
    });
  }
  res.status(200).json({
    success: true,
    status: "Verified",
  });
});

exports.getSingleChannelPostsById = asyncHandler(async (req, res, next) => {
  const posts = Post.find({ channelId: req.params.id });
  let data = [];
  let user3 = await User.findById(req.user._id);
  if (user3.blocked == false) {
    if (posts != null) {
      for (let i = 0; i < posts.length; i++) {
        let likecount = 0;
        let selflike = 0;
        posts[i].likes.map((result) => {
          result = result.toString();
          likecount += 1;
          if (result == req.user._id) {
            selflike += 1;
            likecount -= 1;
          }
        });
        let unlikecount = 0;
        posts[i].unlikes.map((result) => {
          unlikecount += 1;
        });
        let comments = await Comment.find({ postid: posts[i]._id });
        let commentcount = 0;
        comments.map((result) => {
          commentcount += 1;
          result.reply.map((result) => {
            commentcount += 1;
          });
        });
        let time = timeSince(posts[i].timeago);
        let postdata = {
          likecount: likecount,
          unlikecount: unlikecount,
          liked: selflike,
          commentcount: commentcount,
          time: time,
        };
        obj = Object.assign(posts[i]._doc, postdata);

        data.push(obj);
      }
    }
  }
  res.status(200).json({
    success: true,
    count: posts.length,
    data: data,
  });
});

// @desc    Get all posts
// @route   GET/api/v1/post
// @access  Public
// exports.getPosts = asyncHandler(async (req, res, next) => {
//     const posts = await Post.find({}).populate({ path: 'user', select: 'firstName lastName avatarUrl' });
//     var data = [];
//     await posts.forEach(async (result) => {
//         let obj = {};
//         var arr = [];
//         let likecount = 0;
//         let selflike = 0;
//         result.likes.map(result => {
//             result = result.toString();
//             likecount += 1;
//             if (result == req.user._id) {
//                 selflike += 1;
//                 likecount -= 1;
//             }
//         });
//         let unlikecount = 0;
//         result.unlikes.map(result => {
//             unlikecount += 1;
//         });
//         let comments = await Comment.find({ postid: result._id });
//         let commentcount = 0;
//         comments.map(result => {
//             commentcount += 1;
//         });
//         let time = timeSince(result.timeago);
//         let postdata = {
//             likecount: likecount,
//             unlikecount: unlikecount,
//             liked: selflike,
//             commentcount: commentcount,
//             time: time,
//         }
//         obj.post = result;
//         obj.postdata = postdata;
//         data.push(obj);
//     });
//     console.log("Data : ", data);
//     res.status(200).json({
//         success: true,
//         count: posts.length,
//         data: data,
//     });
// });

// exports.postUnlikePost = asyncHandler(async (req, res, next) => {
//     let post = await Post.findById(req.params.id);
//     console.log(post);
//     const alreadyUnLike = post.unlikes.map(result => {
//         result = result.toString();
//         console.log(result);
//         if (result == req.user.id) {
//             return next(new ErrorResponse("You already unlike this post"));
//         }
//     });
//     await Post.findByIdAndUpdate(req.params.id,
//         {
//             $push: { unlikes: req.user._id },
//             $pull: { likes: req.user._id }
//         });
//     io.getio().emit("unlikes", { userid: req.user._id });

//     res.status(200).json({
//         success: true
//     });
// });

// exports.getUnlikePost = asyncHandler(async (req, res, next) => {
//     let post = await Post.findById(req.params.id);
//     let count = 0;
//     post.unlikes.map(result => {
//         count += 1;
//     });
//     console.log("UnLike Count : ", count);
//     res.status(200).json({
//         success: true,
//         status: "UnLikes",
//         count,
//     });
// });

// exports.getLikePost = asyncHandler(async (req, res, next) => {
//     console.log(req.user._id);
//     let post = await Post.findById(req.params.id);
//     let count = 0;
//     let selflike = 0;
//     await post.likes.map(result => {
//         result = result.toString();
//         console.log("Result : ", result);
//         count += 1;
//         if (result == req.user._id) {
//             selflike += 1;
//             console.log("Self Ct : ", selflike);
//             count -= 1;
//         }
//     });
//     console.log("Like Count : ", count);
//     console.log("Self Count : ", selflike);
//     res.status(200).json({
//         success: true,
//         status: "Likes",
//         count,
//         selflike,
//     });
// });

// // @desc    post request to upload image
// // @route   POST/api/v1/post/upload/photo
// // @access   Private('Admin')
// exports.uploadphoto = asyncHandler(async (req, res, next) => {
//     let path = req.file.path;
//     let filename = path.split('/')[1];
//     const { content } = req.body;
//     const { channel_id } = req.body;
//     const channell = await Channel.findById(channel_id);
//     if (!channell) {
//         return next(new Error("Not found Channel of this Name", 401));
//     }
//     //mode : development
//     // let url = req.host + `:${process.env.PORT}/static/${filename}`;
//     let url = `/static/${req.file.filename}`;

//     //mode: production
//     //url = `/static/${filename}`;
//     var newItem = new Post();
//     newItem.postmultimedia = url;
//     newItem.content = content;
//     newItem.channelId = channell._id;
//     newItem.user = req.user._id;
//     newItem.save();
//     res.status(200).json({
//         success: true,
//         name: `${req.user.firstName} ${req.user.lastName}`,
//         data: pickPostResponse(newItem)
//     });
// });

// // @desc    post request to upload video
// // @route   POST/api/v1/post/upload/video
// // @access  Private('Admin')
// exports.postuploadvideo = asyncHandler(async (req, res, next) => {
//     let path = req.file.path;
//     let filename = path.split('/')[1];
//     const { content } = req.body;
//     const { channel_id } = req.body;
//     const channell = await Channel.findById(channel_id);
//     if (!channell) {
//         return next(new Error("Not found Channel of this Name", 401));
//     }

//     //mode : development
//     // let url = req.host + `:${process.env.PORT}/static/${filename}`;
//     let url = `/static/${req.file.filename}`;

//     //mode: production
//     //url = `/static/${filename}`;
//     var newItem = new Post();
//     newItem.postmultimedia = url;
//     newItem.content = content;
//     newItem.channelId = channell._id;
//     newItem.user = req.user._id;
//     newItem.save();
//     res.status(200).json({
//         success: true,
//         name: `${req.user.firstName} ${req.user.lastName}`,
//         data: pickPostResponse(newItem)
//     });
// });

// // @desc    get request to get uploaded image
// // @route   POST/api/v1/get/photos/:id
// // @access  Public
// exports.getuploadphoto = asyncHandler(async (req, res, next) => {
//     console.log(req.params.id);
//     var filename = req.params.id;
//     let post = Post.findOne({ id: req.params.id });
//     res.status(200).json({
//         success: true,
//         data: post.postmultimedia
//     });
// });

// // @desc    Create new post
// // @route   POST/api/v1/post
// // @access   Private('Admin')
// exports.createContentPost = asyncHandler(async (req, res, next) => {
//     let { content } = req.body;
//     const { channel } = req.body;
//     const channell = await Channel.findById(channel);
//     if (!channell) {
//         return next(new Error("Not found Channel of this Name", 401));
//     }
//     const post = await Post.create({
//         content: content,
//         user: req.user._id,
//         channelId: channell._id,
//     });
//     res.status(200).json({
//         success: true,
//         name: `${req.user.firstName} ${req.user.lastName}`,
//         data: pickPostResponse(post)
//     });
// });

// @desc    get request to show comments
// @route   POST/api/v1/post/getcomment/:id
// @access  Public
// exports.getcomment = asyncHandler(async (req, res, next) => {
//     let arr = [];
//     let comment = await Comment.find({ postid: req.params.id });
//     comment = await comment.reverse();
//     let commentdata;
//     var user = await User.findById(req.user._id);
//     if (user.role == "Admin") {
//         for (let i = 0; i < comment.length; i++) {
//             let obj = {};
//             let data = [];
//             obj.comment = comment[i].comment;
//             obj.id = comment[i]._id;
//             obj.postid = comment[i].postid;
//             obj.userid = comment[i].userid;
//             var user1 = await User.findById(comment[i].userid);
//             obj.username = `${user1.firstName} ${user1.lastName}`;
//             obj.avatarUrl = user1.avatarUrl;
//             obj.createdAt = comment[i].createdAt;
//             obj.time = timeSince(comment[i].timeago);
//             for (let j = 0; j < comment[i].reply.length; j++) {
//                 let reply = {};
//                 reply.commentId = comment[i]._id;
//                 reply.commentreply = comment[i].reply[j];
//                 reply.id = comment[i].replyuserid[j];
//                 let user2 = await User.findById(comment[i].replyuserid[j]);
//                 reply.username = `${user2.firstName} ${user2.lastName}`;
//                 reply.avatarUrl = user2.avatarUrl;

//                 data[j] = reply;
//                 obj.reply = data;
//             }
//             arr.push(obj);
//         }
//         commentdata = arr;
//     }
//     else {
//         let admin = await User.findOne({ role: "Admin" });
//         let coment = await Comment.find({
//             $or: [
//                 { $and: [{ postid: req.params.id }, { userid: req.user._id }] },
//                 { $and: [{ postid: req.params.id }, { userid: admin._id }] },
//             ]
//         });
//         for (let i = 0; i < coment.length; i++) {
//             let obj = {};
//             let data = [];
//             obj.comment = coment[i].comment;
//             obj.id = coment[i]._id;
//             obj.postid = coment[i].postid;
//             obj.userid = coment[i].userid;
//             let user1 = await User.findById(coment[i].userid);
//             obj.username = `${user1.firstName} ${user1.lastName}`;
//             obj.avatarUrl = user1.avatarUrl;
//             obj.createdAt = coment[i].createdAt;
//             obj.time = timeSince(coment[i].timeago);
//             for (let j = 0; j < coment[i].reply.length; j++) {
//                 let reply = {};
//                 reply.commentId = coment[i]._id;
//                 reply.commentreply = coment[i].reply[j];
//                 reply.id = coment[i].replyuserid[j];
//                 let user2 = await User.findById(coment[i].replyuserid[j]);
//                 reply.username = `${user2.firstName} ${user2.lastName}`;
//                 reply.avatarUrl = user2.avatarUrl;
//                 data[j] = reply;
//                 obj.reply = data;
//             }
//             arr.push(obj);
//         }
//         commentdata = arr;
//     }
//     res.status(200).json({
//         success: true,
//         Comment: commentdata,
//     });
// });