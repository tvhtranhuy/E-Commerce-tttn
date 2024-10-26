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

    // Execute query
    // Số lượng sp thỏa mãn điều kiện !== số lượng sp trả về 1 lần gọi API
    try {
        const response = await queryCommand; 
        const counts = await Product.countDocuments(formatedQueries);
        return res.status(200).json({
            success: !!response,
            products: response || "Cannot get products",
            counts
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


  module.exports = {
    createProduct,
    getProduct,
    getProducts,
    updateProduct,
    deleteProduct
    // ratings,
    // uploadImagesProduct,
    // addVarriant,
  }