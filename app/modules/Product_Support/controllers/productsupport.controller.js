const { msg } = require("../../../../config/message");
const asyncHandler = require("../../../middleware/async");
const ErrorResponse = require("../../../helper/errorResponse");
const Product = require("../models/productsupport.model");
const Products = require("../models/product");
const { sendEmail } = require("../../../helper/sendgrid");
var validator = require("email-validator");

// @desc    Post Send Request by user
// @route   POST/api/v1/user/request
// access   Private
exports.productSupport = asyncHandler(async (req, res, next) => {
  const { fromEmail, message, toEmail } = req.body;
  let subject = "G-Social";

  let emailValid = validator.validate(toEmail);

  if (emailValid == true || emailValid == "true") {
    console.log("email : ", message, toEmail);
    await sendEmail(toEmail, message, subject);
  } else {
    return next(new ErrorResponse("Email format not valid", 401));
  }

  res.status(200).json({
    success: true,
    data: "message sent",
  });
});

// @desc    Post add product in product table
// @route   POST/api/v1/user/addproduct
// access   Private
exports.addProduct = asyncHandler(async (req, res, next) => {
  const { product } = req.body;
  const products = await Products.create({
    Product: product,
  });

  res.status(200).json({
    success: true,
    status: "Product Created !",
  });
});

// @desc    Post Send Request by user
// @route   POST/api/v1/user/request
// access   Private
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Products.find({});
  res.status(200).json({
    success: true,
    product: product,
  });
});
