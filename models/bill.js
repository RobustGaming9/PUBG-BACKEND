const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: String,
    required: true,
  },
  rate: {
    type: String,
    required: true,
  },
});

const gstSchema = new mongoose.Schema({
  sgst: {
    type: Number,
    required: function() {
      return !this.igst; // SGST is required if IGST is not provided
    },
  },
  cgst: {
    type: Number,
    required: function() {
      return !this.igst; // CGST is required if IGST is not provided
    },
  },
  igst: {
    type: Number,
    required: function() {
      return !this.sgst && !this.cgst; // IGST is required if SGST and CGST are not provided
    },
  },
});

const billSchema = new mongoose.Schema({
  buyerName: {
    type: String,
    required: true,
    trim: true,
  },
  billNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  billDate: {
    type: String,
    required: true,
  },
  products: {
    type: [productSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one product is required',
    },
  },
  gst: {
    type: gstSchema,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  gstPercentage: {
    type: Number,
    required: true,
    enum: [5, 12, 18, 28], // Restrict to standard GST rates
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Bill', billSchema);