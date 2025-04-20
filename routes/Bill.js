const express = require('express');
const router = express.Router();
const Bill = require('../models/bill');

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
    const { buyerName, billNo, billDate, products, gst, totalAmount, gstPercentage } = req.body;

    // Validate required fields
    if (!buyerName || !billNo || !billDate || !products || products.length === 0 || !gst || !totalAmount || !gstPercentage) {
      return res.status(400).json({ error: 'All fields are required, including at least one product and valid GST' });
    }

    // Validate GST structure
    if (!validateGST(gst)) {
      return res.status(400).json({ error: 'Invalid GST structure: Provide either SGST and CGST or IGST' });
    }

    // Validate GST percentage
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
    });

    const savedBill = await bill.save();
    res.status(201).json({ message: 'Bill created successfully', bill: savedBill });
  } catch (error) {
    console.error('Error creating bill:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Bill number already exists' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// Get all bills or filtered bills
router.get('/billdata', async (req, res) => {
  try {
    const { page = 1, limit = 50, billDate, buyerName, productCount, minAmount, maxAmount, all } = req.query;

    const query = {};
    
    if (billDate) query.billDate = billDate;
    if (buyerName) query.buyerName = { $regex: buyerName, $options: 'i' };
    if (productCount) query['products.0'] = { $exists: true }; // Ensure at least one product
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
    const { buyerName, billNo, billDate, products, gst, totalAmount, gstPercentage } = req.body;

    // Validate required fields
    if (!buyerName || !billNo || !billDate || !products || products.length === 0 || !gst || !totalAmount || !gstPercentage) {
      return res.status(400).json({ error: 'All fields are required, including at least one product and valid GST' });
    }

    // Validate GST structure
    if (!validateGST(gst)) {
      return res.status(400).json({ error: 'Invalid GST structure: Provide either SGST and CGST or IGST' });
    }

    // Validate GST percentage
    if (![5, 12, 18, 28].includes(gstPercentage)) {
      return res.status(400).json({ error: 'Invalid GST percentage: Must be 5, 12, 18, or 28' });
    }

    const updatedBill = await Bill.findByIdAndUpdate(
      id,
      { buyerName, billNo, billDate, products, gst, totalAmount, gstPercentage },
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
      res.status(500).json({ error: 'Server error' });
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

    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;