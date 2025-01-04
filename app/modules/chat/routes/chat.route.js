const express = require('express');
const router = express.Router();

const { getAllchat, getchat, getalluser, sendmultimedia,sendDocuments ,getallUnRecievedMessages} = require('../controllers/chat.controller');
const { protect } = require('../../../middleware/auth');
const {upload3} =require('../../../helper/multer');

router.get('/', protect, getchat);
router.get('/unrecieved',protect,getallUnRecievedMessages)
router.post('/mutimedia', upload3("chat").array('myFiles'), protect, sendmultimedia);
router.post('/document', upload3("chatdocuments").array('link'), protect, sendDocuments);

router.get('/getusers', protect, getalluser);
router.get('/messages/:id', protect, getAllchat);


module.exports = router;
