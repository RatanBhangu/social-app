const express = require('express');
const router = express.Router();

const {productSupport,addProduct,getProduct}= require('../controllers/productsupport.controller');
const { protect } = require('../../../middleware/auth');

router.post('/productsupport', protect, productSupport);


module.exports = router;