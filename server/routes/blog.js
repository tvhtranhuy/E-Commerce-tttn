const router = require("express").Router()
const { verifyAccessToken, isAdmin } = require("../middlewares/verifyToken")
const ctrls = require("../controllers/blog")

router.post('/',[verifyAccessToken, isAdmin], ctrls.createNewBlog)

router.put('/:bid',[verifyAccessToken, isAdmin], ctrls.updateBlog)
router.get('/',ctrls.getBlogs)
router.put("/likes/:bid", [verifyAccessToken], ctrls.likeBlog)
router.put("/dislike/:bid", [verifyAccessToken], ctrls.dislikeBlog)
// const uploader = require("../config/cloudinary.config")

module.exports = router