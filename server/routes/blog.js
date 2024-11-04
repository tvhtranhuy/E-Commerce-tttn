const router = require("express").Router()
const { verifyAccessToken, isAdmin } = require("../middlewares/verifyToken")
const ctrls = require("../controllers/blog")
const uploader = require("../config/cloudinary.config")

router.post('/',[verifyAccessToken, isAdmin], ctrls.createNewBlog)

router.put('/:bid',[verifyAccessToken, isAdmin], ctrls.updateBlog)
router.get('/',ctrls.getBlogs)
router.put("/likes/:bid", [verifyAccessToken], ctrls.likeBlog)
router.put("/dislike/:bid", [verifyAccessToken], ctrls.dislikeBlog)
// const uploader = require("../config/cloudinary.config")
router.get('/one/:bid', ctrls.getBlog)
router.delete('/:bid',[verifyAccessToken], ctrls.deleteBlog)

router.put(
  "/image/:bid",
  [verifyAccessToken, isAdmin],
  uploader.single("image"),
  ctrls.uploadImagesBlog
)
module.exports = router