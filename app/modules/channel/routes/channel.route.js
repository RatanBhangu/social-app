const express = require('express');
const router = express.Router({ mergeParams: true });
const channelController = require('../controllers/channel.controller');
const { protect, authorize } = require('../../../middleware/auth');

const { createChannel, users, findUsersofChannel, deleteUser, getroom, updateChannel, getChannel, addUsers, getSingleChannel, deleteChannel, addUser } = channelController;

// router.get('/:brandId/products/',protect,authorize('InventoryHead','Admin'),getBrandsProducts);
router.get('/room', getroom);

router.route('/')
    .get(protect, getChannel)  //Every logged in user  Can Access this Route 
    .post(protect, authorize('Admin'), createChannel) // Only logged in InventoryHead and admin can access this route

router.route('/:id')
    .get(protect, getSingleChannel)  // Every logged in user can acccess this route       
    .put(protect, authorize('Admin'), updateChannel)  // Only Logged in Admin and InventoryHead can access this route 
    .delete(protect, authorize('Admin'), deleteChannel); // Only Logged in Admin and Inventory head can acccess this route 

router.post('/adduser/:id', protect, addUser);
router.post('/deleteuser/:id', protect, deleteUser);

router.get('/findusers/:id', protect, findUsersofChannel);
router.post('/users', protect, users);


module.exports = router;