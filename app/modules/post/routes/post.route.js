const express = require('express');
const router = express.Router();
const { upload3 } = require('../../../helper/multer');

const { getTradingChannelPosts, uploadfiles, getPrivatePublicChannelPosts, updatePost, destroyPost, uploadphoto,
    verifyOtp, sendOtp, getSingleChannelPostsById, getcreatePost, postLikePost, postcomment,
    commentDelete, getcomment, getCommentsOfPost, postcommentreply, commentReplyDelete } = require('../controllers/post.controller');
const { protect } = require('../../../middleware/auth');

router.get('/createpost', protect, getcreatePost);
router.post('/uploadfiles', upload3("posts").array('myFiles'), protect, uploadfiles);
router.post('/sendotp', protect, sendOtp);
router.post('/verifyotp', protect, verifyOtp);
router.get('/trading', protect, getTradingChannelPosts);
router.get('/:id', protect, getPrivatePublicChannelPosts);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, destroyPost);
router.delete('/commentdelete/:id', protect, commentDelete);
router.delete('/commentreplydelete/:id', protect, commentReplyDelete);

router.post('/likes/:id', protect, postLikePost);
router.post('/comment/:id', upload3("posts").array('myFiles'), protect, postcomment);
router.get('/getcomment/:id', protect, getCommentsOfPost);
router.post('/postcommentreply/:id', upload3("posts").array('myFiles'), protect, postcommentreply);
router.get('/posts/:id', protect, getSingleChannelPostsById);


module.exports = router;