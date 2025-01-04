const mongoose = require('mongoose');
const postSchema = new mongoose.Schema({
    id: {
        type: mongoose.Schema.Types.ObjectId,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    postmultimedia: [
        {
            type: { type: String},
            path : {  type: String},
        }
    ],
    content: {
        type: String,
    },
    channelId: { type: mongoose.Schema.Types.ObjectId,ref:'Channel' },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    unlikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    timeago: { type: String, default: Date.now() },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;