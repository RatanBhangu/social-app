const express = require('express');
const router = express.Router();

const {postfeedback,getfeedback}= require('../controllers/feedback.controller');
const { protect } = require('../../../middleware/auth');

router.post('/feedback', protect, postfeedback);
router.get('/feedback',protect,getfeedback);


module.exports = router;