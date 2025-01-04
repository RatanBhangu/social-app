const mongoose = require("mongoose");
const softDelete = require("mongoosejs-soft-delete");

const postSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    postid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    comment: {
      type: String,
    },
    multimedia: [
      {
          type: { type: String},
          path : {  type: String},
      }
  ],
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reply: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment Reply",
      },
    ],
    timeago: { type: String, default: Date.now() },
  },
  {
    timestamps: true,
  }
);

postSchema.plugin(softDelete);
module.exports = mongoose.model("Comment", postSchema);
