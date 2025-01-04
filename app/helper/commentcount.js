const Comment = require('../modules/post/models/post.comment');
const asyncHandler = require('../middleware/async');

const commentCount = asyncHandler(async (id) => {
    console.log("Id :" ,id);
    let comments = await Comment.find({ postid: id });
    console.log("comments : ", comments);
    let commentcount = 0;
    comments.map(result => {
        commentcount += 1;
    })
    return commentcount;
})
module.exports = {
    commentCount
  };
