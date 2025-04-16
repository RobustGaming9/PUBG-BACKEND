const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  quantity: { type: String, required: true },
  rate: { type: String, required: true },
});

const gstSchema = new mongoose.Schema({
  sgst: { type: Number, required: function() { return !this.igst; } },
  cgst: { type: Number, required: function() { return !this.igst; } },
  igst: { type: Number, required: function() { return !this.sgst && !this.cgst; } },
});

const billSchema = new mongoose.Schema({
  buyerName: { type: String, required: true },
  billNo: { type: String, required: true, unique: true },
  billDate: { type: String, required: true },
  products: { 
    type: [productSchema], 
    required: true, 
    validate: [
      { validator: v => v.length > 0, msg: 'At least one product is required' },
      { validator: v => v.length <= 4, msg: 'Maximum of 4 products allowed' }
    ]
  },
  gst: { type: gstSchema, required: true },
  totalAmount: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);