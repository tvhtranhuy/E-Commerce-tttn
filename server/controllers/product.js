const Product = require('../models/product')
const asyncHandler = require("express-async-handler")
const slugify = require("slugify")
//const makeSKU = require("uniqid")

const createProduct = asyncHandler(async (req, res) => {
    if (Object.keys(req.body).length === 0) throw new Error('Missing imputs')
    if (req.body && req.body.title) req.body.slug = slugify(req.body.title)
    const newProduct = await Product.create(req.body)
    return res.status(200).json({
        success: newProduct ? true : false,
        createdProduct: newProduct ? newProduct : 'cannot create new product'
    })
  })

  const getProduct = asyncHandler(async (req, res) => {
    const { pid} = req.params
    const product = await Product.findById(pid)
    return res.status(200).json({
        success: product ? true : false,
        productData: product ? product : 'Cannot get product'
    })
  })
// Fillterting, sorting & pagination
const getProducts = asyncHandler(async (req, res) => {
    const queries = { ...req.query };
    const excludeFields = ['limit', 'sort', 'page', 'fields'];
    excludeFields.forEach(el => delete queries[el]);

    // Format lại các operators cho đúng cú pháp Mongoose
    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(/\b(gte|gt|lt|lte)\b/g, matchedEl => `$${matchedEl}`);
    const formatedQueries = JSON.parse(queryString);

    // Filtering
    if (queries?.title) formatedQueries.title = { $regex: queries.title, $options: 'i' };
    let queryCommand = Product.find(formatedQueries);

    // Sorting
    if (req.query.sort) {
        const sortBy = req.query.sort.split(",").join(" ")
        queryCommand = queryCommand.sort(sortBy)
    }

    // Fields limiting
    if (req.query.fields) {
        const fields = req.query.fields.split(",").join(" ")
        queryCommand = queryCommand.select(fields)
    }

    // Pagination
    // limit: số object lấy về 1 lần gọi API
    //skip: 2
    // 1 2 3 ... 10
    // +2 => 2
    // +wedfsdf => NaN
    const page = +req.query.page || 1
    const limit = +req.query.limit || process.env.LIMIT_PRODUCTS
    const skip = (page - 1) * limit
    queryCommand.skip(skip).limit(limit)


    // Execute query
    // Số lượng sp thỏa mãn điều kiện !== số lượng sp trả về 1 lần gọi API
    try {
        const response = await queryCommand; 
        const counts = await Product.countDocuments(formatedQueries);
        return res.status(200).json({
            success: !!response,
            counts,
            products: response || "Cannot get products"
            
        });
    } catch (err) {
        throw new Error(err.message || "An error occurred while fetching products");
    }
});


  const updateProduct = asyncHandler(async(req, res )=>{
    const { pid} = req.params
    if (req.body && req.body.title) req.body.slug = slugify(req.body.title)
    const updatedProduct = await Product.findByIdAndUpdate(pid, req.body, {new: true})
    return res.status(200).json({
        success: updatedProduct ? true : false,
        updatedProduct: updatedProduct ? updatedProduct : 'cannot update product'
    })
  })

  const deleteProduct = asyncHandler(async(req, res )=>{
    const { pid} = req.params
    const deletedProduct = await Product.findByIdAndDelete(pid)
    return res.status(200).json({
        success: deletedProduct ? true : false,
       deletedProduct: deletedProduct ? deletedProduct : 'cannot update product'
    })
  })
const ratings = asyncHandler(async (req,res) => {
  const{_id} = req.user
  const {star, comment, pid} = req.body
  if(!star || !pid) throw new Error('Missing imput')
  const ratingProduct = await Product.findById(pid)
  // const alreadyRating = ratingProduct?.ratings?.some(el => el.postedBy.some(uid => uid === _id))
  const alreadyRating = ratingProduct?.ratings?.find(
    (el) => el.postedBy.toString() === _id
  )
  // console.log({alreadyRating})
  if(alreadyRating){
    //update star and comment
    await Product.updateOne(
      {
        ratings: { $elemMatch: alreadyRating },
      },
      {
        $set: {
          "ratings.$.star": star,
          "ratings.$.comment": comment,
          // "ratings.$.updatedAt": updatedAt,
        },
      },
      { new: true }
    )
  }else{
    //add star and comment
    const response = await Product.findByIdAndUpdate(pid, {
      $push: {ratings: {star, comment, postedBy: _id}}
    },{new: true})
    console.log(response);
  }

  // Sum Rating
  const updatedProduct = await Product.findById(pid)
  const ratingCount = updatedProduct.ratings.length
  const sumRatings = updatedProduct.ratings.reduce(
    (sum, el) => sum + +el.star,
    0
  )
  updatedProduct.totalRatings = Math.round((sumRatings * 10) / ratingCount) / 10

  await updatedProduct.save()

  return res.status(200).json({
    status:true
  })
})

const uploadImagesProduct = asyncHandler(async (req, res) => {
  const { pid } = req.params
  if (!req.files) throw new Error("Missing inputs")
  const response = await Product.findByIdAndUpdate(
    pid,
    { $push: { images: { $each: req.files.map((el) => el.path) } } },
    { new: true }
  )
  return res.status(200).json({
    success: response ? true : false,
    updatedProduct: response ? response : "Cannot upload images product",
  })
  // console.log(req.file);
  // return res.json('oke')
})
  module.exports = {
    createProduct,
    getProduct,
    getProducts,
    updateProduct,
    deleteProduct,
    ratings,
    uploadImagesProduct
    // addVarriant,
  }