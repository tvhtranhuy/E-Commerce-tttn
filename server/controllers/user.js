const user = require('../models/user')
const User = require('../models/user')
const asyncHandler = require('express-async-handler')
const { generateAccessToken, generateRefreshToken } = require('../middlewares/jwt')
const jwt = require('jsonwebtoken')
const sendMail = require('../ultils/sendMail')
const mongoose = require('mongoose');
const crypto = require('crypto')
// const express = require('express')



const register = asyncHandler(async(req, res)=>{
    const {email, password, firstname, lastname} = req.body
    if (!email||!password||!firstname||!lastname)
        return res.status(400).json({
            sucess: false,
            mes:'Missing inputs'
        })

    const user = await User.findOne({email})
    if (user) throw new Error('User has existed')
    else {
        const newUser = await User.create(req.body)
        return res.status(200).json({
            sucess: newUser ? true : false,
            mes: newUser ? 'Register is successfully. please go login': 'something went wrong'

        })
    }
})

// RefreshToken => cấp mới access token
// Access token => xác thực người dùng , quân quyền người dùng
const login = asyncHandler(async(req, res)=>{
    const {email, password} = req.body
    if (!email||!password)
        return res.status(400).json({
            sucess: false,
            mes:'Missing inputs'
        })
// plain object
    const response = await User.findOne({email})

    if (response && await response.isCorrectPassword(password)){
        // tach password va role ra khoi response
        const {password, role, refreshToken, ...userData} = response.toObject()
        // tao access token
        const accessToken = generateAccessToken(response._id,role)
        // tao refresh token
        const newrefreshToken = generateRefreshToken(response._id)
        //luu refresh token vao database
        await User.findByIdAndUpdate(response._id, { refreshToken: newrefreshToken}, {new:true})
        // luu refresh token vao cookie
        res.cookie('refreshToken', newrefreshToken, {httpOnly: true, maxAge: 7*24*60*60*1000})
        return res.status(200).json({
            sucess: true,
            accessToken,
            userData
        })
    }else{
        throw new Error('invarlid credentials')
    }
})
const getCurrent = asyncHandler(async (req, res) => {
    const{_id} = req.user
    const user = await User.findById(_id).select('-refreshToken -password -role')
    return res.status(200).json({
        success: user ? true: false,
        rs: user ? user : 'User not found'
    })
})
const refreshAccessToken = asyncHandler(async (req, res) => {
    // Lấy token từ cookies
    const cookie = req.cookies
    // Check xem có token hay không
    if (!cookie && !cookie.refreshToken)
      throw new Error("No refresh token in cookies")
    // Check token có hợp lệ hay không
    const rs = await jwt.verify(cookie.refreshToken, process.env.JWT_SECRET)
    const response = await User.findOne({
      _id: rs._id,
      refreshToken: cookie.refreshToken,
    })
    return res.status(200).json({
      success: response ? true : false,
      newAccessToken: response
        ? generateAccessToken(response._id, response.role)
        : "Refresh token not matched",
    })
  })

const logout = asyncHandler(async (req, res) => {
    const cookie = req.cookies
    if (!cookie || !cookie.refreshToken)
      throw new Error("No refresh token in cookies")
    // Xóa refresh token ở db
    await User.findOneAndUpdate(
      { refreshToken: cookie.refreshToken },
      { refreshToken: "" },
      { new: true }
    )
    // Xóa refresh token ở cookie trình duyệt
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    })
    return res.status(200).json({
      success: true,
      mes: "Logout is done",
    })
  })

  // Client gửi email
  // Server check email có hợp lệ hay không => Gửi mail + kèm theo link (password change token)
  // Client check mail => click link
  // Client gửi api kèm token
  // Check token có giống với token mà server gửi mail hay không
  // Change password
  const forgotPassword = asyncHandler(async(req, res)=>{
    const {email} = req.query
    if(!email) throw new Error ('Missing email')
    const user = await User.findOne({email})
    if (!user) throw new Error ('User not found')
    const resetToken = user.createPasswordChangedToken()
    await user.save()

    const html = `Xin vui lòng click vào link dưới đây để thay đổi mật khẩu của bạn.Link này sẽ hết hạn sau 15 phút kể từ bây giờ. <a href=${process.env.URL_SERVER}/api/user/reset-password/${resetToken}>Click here</a>`
//'Xin vui long click vao link duoi day de doi mat khau.Link se het hang sau 15p. <a href=${process.env.URL_SERVER}/api/user/reset-password/${resetToken}>click</a>'
    const data = {
      email,
      html
    }
    const rs = await sendMail(data)
    return res.status(200).json({
      success: true,
      rs
    })
  })
  const resetPassword = asyncHandler(async (req, res) => {
    const { password, token } = req.body
    if (!password || !token) throw new Error("Missing imputs")
    const passwordResetToken = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({passwordResetToken, passwordResetExpires: {$gt: Date.now()}})
    if (!user) throw new Error("Invalid reset token")
      user.password = password
      user.passwordResetToken = undefined
      user.passwordChangedAt = Date.now()
      user.passwordResetExpires = undefined
      await user.save()
      return res.status(200).json({
        success: user ? true : false,
        mes: user ? "Updated password" : "Something went wrong",
      })

  })
  const getUsers = asyncHandler(async(req, res)=>{
    const response = await User.find().select('-refreshToken -password -role')
    return res.status(200).json({
      success: response ? true :false,
      users: response
    })
  })

  const deleteUser = asyncHandler(async (req, res) => {
    const { _id } = req.query
    if (!_id) throw new Error('Missing imputs')
    const response = await User.findByIdAndDelete(_id)
    return res.status(200).json({
      success: response ? true : false,
      mes: response
        ? `User with email ${response.email} deleted`
        : "No user delete",
    })
  })

  const updateUser = asyncHandler(async (req, res) => {
    const { _id } = req.user
    // const { firstname, lastname, email, mobile, address } = req.body
    // const data = { firstname, lastname, email, mobile, address }
    // if (req.file) data.avatar = req.file.path
    // if (!_id || Object.keys(req.body).length === 0)
    //   throw new Error("Missing inputs")
    // const response = await User.findByIdAndUpdate(_id, data, {
    //   new: true,
    // }).select("-password -role -refreshToken")
    // return res.status(200).json({
    //   success: response ? true : false,
    //   mes: response ? "Updated." : "Some thing went wrong",
    // })
    if (!_id || Object.keys(req.body).length === 0) throw new Error("Missing inputs")
    const response = await User.findByIdAndUpdate(_id, req.body , {new:true}).select('-password -role -refreshToken')
    return res.status(200).json({
      success: response ? true :false ,
      updateUser: response ? response : 'Some thing went wrong'
    })
  })

  const updateUserByAdmin = asyncHandler(async (req, res) => {
    const { uid } = req.params
    if (Object.keys(req.body).length === 0) throw new Error("Missing inputs")
    const response = await User.findByIdAndUpdate(uid, req.body , {new:true}).select('-password -role -refreshToken')
    return res.status(200).json({
      success: response ? true :false ,
      updateUser: response ? response : 'Some thing went wrong'
    })
  })

  const updateUserAddress = asyncHandler(async (req, res) => {
    const { _id } = req.user
    if (!req.body.address) throw new Error("Missing inputs")
    const response = await User.findByIdAndUpdate(
      _id,
      { $push: { address: req.body.address } },
      { new: true }
    ).select("-password -role -refreshToken")
    return res.status(200).json({
      success: response ? true : false,
      updatedUser: response ? response : "Some thing went wrong",
    })
  })
  const updateCart = asyncHandler(async (req, res) => {
    const { _id } = req.user
    const { pid, quantity, color } = req.body
  
    if (!pid || !quantity || !color) throw new Error("Missing inputs")
  
    // Kiểm tra xem pid có phải là ObjectId hợp lệ không
    if (!mongoose.Types.ObjectId.isValid(pid)) {
      return res.status(400).json({
        success: false,
        mes: "Invalid product ID",
      })
    }
  
    const user = await User.findById(_id).select('cart')
    
    // Tìm sản phẩm trong giỏ hàng
    const alreadyProduct = user?.cart?.find(el => el.product.toString() === pid)
    
    if (alreadyProduct) {
      // Nếu sản phẩm đã có trong giỏ hàng, có thể cập nhật số lượng hoặc hành động khác tại đây
      if (alreadyProduct.color === color){
        const response = await User.updateOne({ cart: { $elemMatch: alreadyProduct } }, { $set: { "cart.$.quantity": quantity } }, { new: true })
        return res.status(200).json({
          success: response ? true : false,
          updatedUser: response ? response : 'Some thing went wrong'
        })
      }else{
        const response = await User. findByIdAndUpdate(_id, { $push: { cart: { product: pid, quantity, color } } }, { new: true })
        return res.status(200).json({
          success: response ? true : false,
          updatedUser: response ? response : 'Some thing went wrong'
        })
      }
    } else {
      // Thêm sản phẩm vào giỏ hàng nếu chưa có
      const response = await User.findByIdAndUpdate(
        _id,
        { $push: { cart: { product: pid, quantity, color } } },
        { new: true }
      )
  
      return res.status(200).json({
        success: response ? true : false,
        mes: response ? response : "Something went wrong",
      })
    }
  })
  
  

module.exports = {
    register,
    login,
    getCurrent,
    refreshAccessToken,
    logout,
    forgotPassword,
    resetPassword,
    getUsers,
    deleteUser,
    updateUser,
    updateUserByAdmin,
    updateUserAddress,
    updateCart,

}