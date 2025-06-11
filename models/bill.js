const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true,
    match: [/^[^<>"'`]*$/, 'Product name contains invalid characters'],
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
  },
  rate: {
    type: Number,
    required: true,
    min: [0, 'Rate cannot be negative'],
  },
});

const gstSchema = new mongoose.Schema({
  sgst: {
    type: Number,
    required: function () {
      return !this.igst;
    },
    min: [0, 'SGST cannot be negative'],
  },
  cgst: {
    type: Number,
    required: function () {
      return !this.igst;
    },
    min: [0, 'CGST cannot be negative'],
  },
  igst: {
    type: Number,
    required: function () {
      return !this.sgst && !this.cgst;
    },
    min: [0, 'IGST cannot be negative'],
  },
});

const billSchema = new mongoose.Schema({
  buyerName: {
    type: String,
    required: true,
    trim: true,
    match: [/^[^<>"'`]*$/, 'Buyer name contains invalid characters'],
  },
  billNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[^<>"'`]*$/, 'Bill number contains invalid characters'],
  },
  billDate: {
    type: String,
    required: true,
    match: [/^\d{2}-\d{2}-\d{4}$/, 'Bill date must be in DD-MM-YYYY format'],
  },
  products: {
    type: [productSchema],
    required: true,
    validate: {
      validator: (products) => products.length > 0,
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
    min: [0, 'Total amount cannot be negative'],
  },
  gstPercentage: {
    type: Number,
    required: true,
    enum: [5, 12, 18, 28],
  },
  pdfFileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
  status: {
    type: String,
    required: true,
    enum: ['Paid', 'Unpaid'],
    default: 'Unpaid',
  },
  address: {
    type: String,
    trim: true,
    match: [/^[^<>"'`]*$/, 'Address contains invalid characters'],
  },
  pincode: {
    type: String,
    trim: true,
    match: [/^\d{6}$/, 'Pincode must be a 6-digit number'],
  },
  gstin: {
    type: String,
    trim: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format'],
  },
  phones: {
    type: [String],
    validate: {
      validator: (phones) => phones.every(phone => /^[+]?[\d\s-]+$/.test(phone)),
      message: 'Invalid phone number format',
    },
  },
  challanNo: {
    type: String,
    trim: true,
    match: [/^[^<>"'`]*$/, 'Challan number contains invalid characters'],
  },
  orderNo: {
    type: String,
    trim: true,
    match: [/^[^<>"'`]*$/, 'Order number contains invalid characters'],
  },
  placeOfSupply: {
    type: String,
    trim: true,
    match: [/^[^<>"'`]*$/, 'Place of supply contains invalid characters'],
  },
  hsn: {
    type: String,
    trim: true,
    match: [/^[^<>"'`]*$/, 'HSN contains invalid characters'],
  },
  transportName: {
    type: String,
    trim: true,
    match: [/^[^<>"'`]*$/, 'Transport name contains invalid characters'],
  },
  freight: {
    type: String,
    trim: true,
    match: [/^[^<>"'`]*$/, 'Freight contains invalid characters'],
  },
  lrNo: {
    type: String,
    trim: true,
    match: [/^[^<>"'`]*$/, 'L.R. number contains invalid characters'],
  },
  lrDate: {
    type: String,
    match: [/^\d{2}-\d{2}-\d{4}$/, 'L.R. date must be in DD-MM-YYYY format'],
  },
  station: {
    type: String,
    trim: true,
    match: [/^[^<>"'`]*$/, 'Station contains invalid characters'],
  },
  accountNo: {
    type: String,
    trim: true,
    match: [/^[^<>"'`]*$/, 'Account number contains invalid characters'],
  },
  ifscCode: {
    type: String,
    trim: true,
    match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'],
  },
  branch: {
    type: String,
    trim: true,
    match: [/^[^<>"'`]*$/, 'Branch contains invalid characters'],
  },
  remarks: {
    type: String,
    trim: true,
    match: [/^[^<>"'`]*$/, 'Remarks contains invalid characters'],
  },
  collectionAgent: {
    name: {
      type: String,
      trim: true,
      match: [/^[^<>"'`]*$/, 'Agent name contains invalid characters'],
    },
    address: {
      type: String,
      trim: true,
      match: [/^[^<>"'`]*$/, 'Agent address contains invalid characters'],
    },
    phones: {
      type: [String],
      validate: {
        validator: (phones) => phones.every(phone => /^[+]?[\d\s-]+$/.test(phone)),
        message: 'Invalid agent phone number format',
      },
    },
  },
}, {
  timestamps: true,
});

billSchema.pre('validate', function (next) {
  const gst = this.gst;
  if (!gst) {
    return next(new Error('GST details are required'));
  }
  const hasSgstCgst = gst.sgst !== undefined && gst.cgst !== undefined;
  const hasIgst = gst.igst !== undefined;
  if ((hasSgstCgst && hasIgst) || (!hasSgstCgst && !hasIgst)) {
    return next(new Error('Invalid GST structure: Provide either SGST and CGST or IGST'));
  }
  next();
});

module.exports = mongoose.model('Bill', billSchema);