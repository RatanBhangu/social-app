const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const Userchat = new mongoose.Schema({
    id: {
        type: mongoose.Schema.Types.ObjectId,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
    },
    recieverId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    timenow: {
        type: String,
        default: Date.now(),
        allowNull: false
    },
    text: {
        type: String,
        allowNull: false
    },
    videoPaused: {
        type: Boolean,
        default: false
    },
    sent: {
        type: Boolean,
        default: false
    },
    pending: {
        type: Boolean,
        default: false
    },
    received: {
        type: Boolean,
        default: false
    },
    document: {
        type: String,
        default:''
    },
    image: {
        type: String,
        default:''
    },
    video: {
        type: String,
        default:''
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
},
    {
        timestamps: true
    },
);

module.exports = mongoose.model('userchat', Userchat);