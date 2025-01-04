const mongoose = require("mongoose");
const softDelete = require("mongoosejs-soft-delete");

const commentSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    commentid:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    multimedia: [
      {
          type: { type: String},
          path : {  type: String},
      }
  ],
    postid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    comment: {
      type: String,
    },
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    timeago: { type: String, default: Date.now() },
  },
  {
    timestamps: true,
  }
);

commentSchema.plugin(softDelete);
module.exports = mongoose.model("Comment Reply", commentSchema);
