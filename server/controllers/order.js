const Order = require("../models/order")
const User = require("../models/user")
const Coupon = require("../models/coupon")
const asyncHandler = require("express-async-handler")

const createOrder = asyncHandler(async (req, res) => {
  const { _id } = req.user
  const userCart = await User.findById(_id).select('cart')
  return res.json({
    success: userCart ? true : false,
    createdOrder: userCart ? userCart : 'Cannot create new Order' 
  })
})
module.exports = {
    createOrder,
}