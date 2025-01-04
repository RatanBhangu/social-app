const mongoose=require('mongoose');

const jwt=require('jsonwebtoken');

const Product=new mongoose.Schema({
    id:{
        type: mongoose.Schema.Types.ObjectId,
        autoIncrement:true,
        primaryKey:true,
        allowNull:false
    },
    Product:{
        type: String,
        allowNull:false,   
    },   
},
{
    timestamps: true
},);

module.exports = mongoose.model('Product', Product);