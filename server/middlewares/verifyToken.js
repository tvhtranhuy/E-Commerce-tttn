const  jwt = require('jsonwebtoken')
const asyncHandler = require ('express-async-handler')

const verifyAccessToken = asyncHandler(async(req,res,next)=>{
    //Bearer token
    // headers: { authorization: Bearer token }
    if(req?.headers?.authorization?.startsWith('Bearer')){
        const token = req.headers.authorization.split(' ')[1]
        jwt.verify(token, process.env.JWT_SECRET, (err, decode) =>{
            if (err) return res.status(401).json({
                success: false,
                mes: 'Invalid access token'
            })
            // console.log(decode);
            req.user = decode
            next()
        })
    }else{
        return res.status(401).json({
            success: false,
            mes: 'require authentication!!!'
        })
    }

})

// Check apiAdmin role là 1945 nếu vượt thì là false 1979 là User
const isAdmin = asyncHandler((req, res, next) => {
    const { role } = req.user
    if (role !== 'admin')
        return res.status(401).json({
            success: false,
            mes: ' REQUIRE ADMIN ROLE'
        })
    next()
})

module.exports = {
    verifyAccessToken,
    isAdmin
}