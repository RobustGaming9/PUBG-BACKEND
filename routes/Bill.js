const express = require('express');
const router = express.Router();
const Bill = require('../models/bill');
const PDFDocument = require('pdfkit');
const { getGfs } = require('../database/db');
const mongoose = require('mongoose');
const stream = require('stream');

// Helper function to validate GST structure
const validateGST = (gst) => {
  if (!gst) return false;
  const hasSgstCgst = gst.sgst !== undefined && gst.cgst !== undefined;
  const hasIgst = gst.igst !== undefined;
  return (hasSgstCgst && !hasIgst) || (hasIgst && !hasSgstCgst);
};

// Create a new bill
router.post('/billdata', async (req, res) => {
  try {
    const {
      buyerName,
      billNo,
      billDate,
      products,
      gst,
      totalAmount,
      gstPercentage,
      address,
      pincode,
      gstin,
      phones,
      challanNo,
      orderNo,
      placeOfSupply,
      hsn,
      transportName,
      freight,
      lrNo,
      lrDate,
      station,
      accountNo,
      ifscCode,
      branch,
      remarks,
      collectionAgent,
    } = req.body;

    if (!buyerName || !billNo || !billDate || !products || products.length === 0 || !gst || !totalAmount || !gstPercentage) {
      return res.status(400).json({ error: 'All fields are required, including at least one product and valid GST' });
    }

    if (!validateGST(gst)) {
      return res.status(400).json({ error: 'Invalid GST structure: Provide either SGST and CGST or IGST' });
    }

    if (![5, 12, 18, 28].includes(gstPercentage)) {
      return res.status(400).json({ error: 'Invalid GST percentage: Must be 5, 12, 18, or 28' });
    }

    const bill = new Bill({
      buyerName,
      billNo,
      billDate,
      products,
      gst,
      totalAmount,
      gstPercentage,
      address,
      pincode,
      gstin,
      phones,
      challanNo,
      orderNo,
      placeOfSupply,
      hsn,
      transportName,
      freight,
      lrNo,
      lrDate,
      station,
      accountNo,
      ifscCode,
      branch,
      remarks,
      collectionAgent,
    });

    const savedBill = await bill.save();
    res.status(201).json({ message: 'Bill created successfully', bill: savedBill });
  } catch (error) {
    console.error('Error creating bill:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Bill number already exists' });
    } else {
      res.status(400).json({ error: error.message || 'Server error' });
    }
  }
});

// Get all bills or filtered bills
router.get('/billdata', async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate, buyerName, productCount, minAmount, maxAmount, all } = req.query;

    const query = {};

    // Date range filter
    if (startDate || endDate) {
      query.billDate = {};
      if (startDate) {
        query.billDate.$gte = startDate; // Greater than or equal to startDate
      }
      if (endDate) {
        query.billDate.$lte = endDate; // Less than or equal to endDate
      }
    }

    // Company name filter
    if (buyerName) {
      query.buyerName = { $regex: buyerName, $options: 'i' }; // Case-insensitive search
    }

    // Product count filter
    if (productCount) {
      if (productCount === '1') {
        query.products = { $size: 1 };
      } else if (productCount === '2-5') {
        query.products = { $size: { $gte: 2, $lte: 5 } };
      } else if (productCount === '6+') {
        query.products = { $size: { $gte: 6 } };
      } else {
        query['products.0'] = { $exists: true }; // At least one product
      }
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      query.totalAmount = {};
      if (minAmount) query.totalAmount.$gte = Number(minAmount);
      if (maxAmount) query.totalAmount.$lte = Number(maxAmount);
    }

    if (all === 'true') {
      const bills = await Bill.find(query).lean();
      return res.json({ bills });
    }

    const bills = await Bill.find(query)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await Bill.countDocuments(query);
    const pages = Math.ceil(total / Number(limit)) || 1;

    res.json({ bills, total, pages });
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a bill
router.put('/billdata/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      buyerName,
      billNo,
      billDate,
      products,
      gst,
      totalAmount,
      gstPercentage,
      address,
      pincode,
      gstin,
      phones,
      challanNo,
      orderNo,
      placeOfSupply,
      hsn,
      transportName,
      freight,
      lrNo,
      lrDate,
      station,
      accountNo,
      ifscCode,
      branch,
      remarks,
      collectionAgent,
    } = req.body;

    if (!buyerName || !billNo || !billDate || !products || products.length === 0 || !gst || !totalAmount || !gstPercentage) {
      return res.status(400).json({ error: 'All fields are required, including at least one product and valid GST' });
    }

    if (!validateGST(gst)) {
      return res.status(400).json({ error: 'Invalid GST structure: Provide either SGST and CGST or IGST' });
    }

    if (![5, 12, 18, 28].includes(gstPercentage)) {
      return res.status(400).json({ error: 'Invalid GST percentage: Must be 5, 12, 18, or 28' });
    }

    const updatedBill = await Bill.findByIdAndUpdate(
      id,
      {
        buyerName,
        billNo,
        billDate,
        products,
        gst,
        totalAmount,
        gstPercentage,
        address,
        pincode,
        gstin,
        phones,
        challanNo,
        orderNo,
        placeOfSupply,
        hsn,
        transportName,
        freight,
        lrNo,
        lrDate,
        station,
        accountNo,
        ifscCode,
        branch,
        remarks,
        collectionAgent,
      },
      { new: true, runValidators: true }
    );

    if (!updatedBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json({ message: 'Bill updated successfully', bill: updatedBill });
  } catch (error) {
    console.error('Error updating bill:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Bill number already exists' });
    } else {
      res.status(400).json({ error: error.message || 'Server error' });
    }
  }
});

// Delete a bill
router.delete('/billdata/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBill = await Bill.findByIdAndDelete(id);

    if (!deletedBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Delete associated PDF from GridFS
    const gfs = getGfs();
    if (deletedBill.pdfFileId) {
      await gfs.delete(new mongoose.Types.ObjectId(deletedBill.pdfFileId));
    }

    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate and save PDF for a bill
router.post('/billdata/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Create PDF
    const doc = new PDFDocument();
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);

      // Save PDF to GridFS
      const gfs = getGfs();
      const uploadStream = gfs.openUploadStream(`bill_${bill.billNo}.pdf`, {
        contentType: 'application/pdf',
      });
      const bufferStream = new stream.PassThrough();
      bufferStream.end(pdfBuffer);
      bufferStream.pipe(uploadStream);

      uploadStream.on('finish', async () => {
        bill.pdfFileId = uploadStream.id;
        await bill.save();
        res.json({ message: 'PDF generated and saved successfully', pdfFileId: uploadStream.id });
      });

      uploadStream.on('error', (error) => {
        console.error('Error uploading PDF:', error);
        res.status(500).json({ error: 'Error saving PDF' });
      });
    });

    // PDF content
    doc.fontSize(20).text('Tax Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Bill No: ${bill.billNo}`);
    doc.text(`Date: ${bill.billDate}`);
    doc.text(`Buyer: ${bill.buyerName}`);
    if (bill.address) doc.text(`Address: ${bill.address}`);
    if (bill.pincode) doc.text(`Pincode: ${bill.pincode}`);
    if (bill.gstin) doc.text(`GSTIN: ${bill.gstin}`);
    if (bill.phones && bill.phones.length) doc.text(`Phone: ${bill.phones.join(', ')}`);
    if (bill.challanNo) doc.text(`Challan No: ${bill.challanNo}`);
    if (bill.orderNo) doc.text(`Order No: ${bill.orderNo}`);
    if (bill.placeOfSupply) doc.text(`Place of Supply: ${bill.placeOfSupply}`);
    if (bill.hsn) doc.text(`HSN: ${bill.hsn}`);
    doc.moveDown();

    if (bill.collectionAgent && (bill.collectionAgent.name || bill.collectionAgent.address || bill.collectionAgent.phones.length)) {
      doc.text('Collection Agent:', { underline: true });
      if (bill.collectionAgent.name) doc.text(`Name: ${bill.collectionAgent.name}`);
      if (bill.collectionAgent.address) doc.text(`Address: ${bill.collectionAgent.address}`);
      if (bill.collectionAgent.phones.length) doc.text(`Phone: ${bill.collectionAgent.phones.join(', ')}`);
      doc.moveDown();
    }

    if (bill.transportName || bill.freight || bill.lrNo || bill.lrDate || bill.station) {
      doc.text('Transport Details:', { underline: true });
      if (bill.transportName) doc.text(`Transport: ${bill.transportName}`);
      if (bill.freight) doc.text(`Freight: ${bill.freight}`);
      if (bill.lrNo) doc.text(`L.R. No: ${bill.lrNo}`);
      if (bill.lrDate) doc.text(`L.R. Date: ${bill.lrDate}`);
      if (bill.station) doc.text(`Station: ${bill.station}`);
      doc.moveDown();
    }

    doc.text('Products:', { underline: true });
    bill.products.forEach((product, index) => {
      doc.text(`${index + 1}. ${product.productName} - ₹${product.rate} (Qty: ${product.quantity})`);
    });

    if (bill.accountNo || bill.ifscCode || bill.branch) {
      doc.moveDown();
      doc.text('Bank Details:', { underline: true });
      if (bill.accountNo) doc.text(`Account No: ${bill.accountNo}`);
      if (bill.ifscCode) doc.text(`IFSC Code: ${bill.ifscCode}`);
      if (bill.branch) doc.text(`Branch: ${bill.branch}`);
    }

    doc.moveDown();
    doc.text(`GST Percentage: ${bill.gstPercentage}%`);
    if (bill.gst.sgst !== undefined) {
      doc.text(`SGST: ₹${bill.gst.sgst}`);
      doc.text(`CGST: ₹${bill.gst.cgst}`);
    } else {
      doc.text(`IGST: ₹${bill.gst.igst}`);
    }
    doc.moveDown();
    doc.fontSize(14).text(`Total Amount: ₹${bill.totalAmount}`, { align: 'right' });

    if (bill.remarks) {
      doc.moveDown();
      doc.text(`Remarks: ${bill.remarks}`);
    }

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// View PDF for a bill
router.get('/billdata/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findById(id);
    if (!bill || !bill.pdfFileId) {
      return res.status(404).json({ error: 'PDF not found for this bill' });
    }

    const gfs = getGfs();
    const downloadStream = gfs.openDownloadStream(new mongoose.Types.ObjectId(bill.pdfFileId));
    
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `inline; filename="bill_${bill.billNo}.pdf"`);

    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('Error streaming PDF:', error);
      res.status(500).json({ error: 'Error retrieving PDF' });
    });
  } catch (error) {
    console.error('Error fetching PDF:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;