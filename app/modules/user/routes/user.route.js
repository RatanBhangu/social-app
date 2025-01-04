const express = require('express');
const router = express.Router();
const { upload3 } = require('../../../helper/multer');

const { test, postregister, forgotPassword, resendOtp, putchangePassword, login, getMe, verifyOtp, blockUser,
    getprofilepic, postProfilepic, userList, blockUserList, adminDetails, postUpdateProfile, getalluser, searchUsers } = require('../controllers/user.controller');
const { protect } = require('../../../middleware/auth');

router.get('/list', protect, userList);
router.get('/blocklist', protect, blockUserList);
router.post('/blockuser', protect, blockUser);
router.get('/', protect, test);
router.post('/register', upload3("profileImages").single('avatarUrl'), postregister);
router.post('/login', login);
router.post('/verifyotp', protect, verifyOtp);
router.get('/getusers', protect, getalluser);
router.get('/me', protect, getMe);
router.put('/me', protect, postUpdateProfile);
router.post('/resendotp', resendOtp);
router.post('/forgotpassword', forgotPassword);
router.get('/profilepic', protect, getprofilepic);
router.post('/profilepic', upload3("profileImages").single('avatarUrl'), protect, postProfilepic);
router.put('/changepassword', protect, putchangePassword);
router.post('/search', protect, searchUsers);
router.get('/admin', protect, adminDetails);


module.exports = router;