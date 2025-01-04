const mongoose = require('mongoose');

const jwt = require('jsonwebtoken');
const channel = new mongoose.Schema({
    id: {
        type: mongoose.Schema.Types.ObjectId,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    name: { type: String, lowercase: true, unique: true },
    owner: {
        type: String,
        ref: 'Admin',
        required: true,
    },
    users: [{
        id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        isVerify: {
            type: Boolean,
            default: false,
        },
        timeago: { type: String , default:Date.now()},
    }],
    roomId: { type: String, default: Date.now() },
    is_Private: {
        type: Boolean,
        default: false
    },
    is_Trading: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'Admin',
        required: true
    },
},
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Channel', channel);