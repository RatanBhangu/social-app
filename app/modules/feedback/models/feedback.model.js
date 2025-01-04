const mongoose=require('mongoose');
const jwt=require('jsonwebtoken');

const UserFeedback=new mongoose.Schema({
    id:{
        type: mongoose.Schema.Types.ObjectId,
        autoIncrement:true,
        primaryKey:true,
        allowNull:false,
    },
    user_id: {type:  mongoose.Schema.Types.ObjectId,},
    description: {
       type: String,
       allowNull:false,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});


module.exports = mongoose.model('userfeedback', UserFeedback);

