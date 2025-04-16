const express = require('express');
const router = express.Router();
const Bill = require('../models/bill');

// POST route to save bill data
router.post('/billdata', async (req, res) => {
  try {
    const billData = req.body;
    
    // Validate required fields
    if (!billData.buyerName || !billData.billNo || !billData.billDate || !billData.products || !billData.gst || !billData.totalAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate product count
    if (billData.products.length === 0) {
      return res.status(400).json({ error: 'At least one product is required' });
    }
    if (billData.products.length > 4) {
      return res.status(400).json({ error: 'Maximum of 4 products allowed' });
    }

    // Create and save the bill
    const newBill = new Bill(billData);
    await newBill.save();
    
    res.status(201).json({ message: 'Bill data saved successfully' });
  } catch (error) {
    console.error('Error saving bill data:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Bill number already exists' });
    } else if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to save bill data' });
    }
  }
});

// GET route to fetch bill data
router.get('/billdata', async (req, res) => {
  try {
    const { 
      billNo, 
      buyerName, 
      billDate, 
      currentDate, 
      minAmount, 
      maxAmount, 
      productCount, 
      all, 
      page = 1, 
      limit = 10 
    } = req.query;

    // Build query object
    const query = {};

    // Filter by billNo
    if (billNo) query.billNo = billNo;

    // Filter by buyerName (case-insensitive partial match)
    if (buyerName) query.buyerName = { $regex: buyerName, $options: 'i' };

    // Filter by specific billDate (DD-MM-YYYY)
    if (billDate) query.billDate = billDate;

    // Filter by current date (based on createdAt)
    if (currentDate === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.createdAt = { $gte: today, $lt: tomorrow };
    }

    // Filter by amount range
    if (minAmount || maxAmount) {
      query.totalAmount = {};
      if (minAmount) query.totalAmount.$gte = parseFloat(minAmount);
      if (maxAmount) query.totalAmount.$lte = parseFloat(maxAmount);
    }

    // Filter by product count
    if (productCount) {
      const count = parseInt(productCount, 10);
      if (!isNaN(count) && count >= 1 && count <= 4) {
        query['products.length'] = count;
      } else {
        return res.status(400).json({ error: 'Product count must be between 1 and 4' });
      }
    }

    // Handle pagination or fetch all
    if (all === 'true') {
      // Fetch all bills without pagination
      const bills = await Bill.find(query).sort({ createdAt: -1 });
      return res.status(200).json({ bills, total: bills.length });
    }

    // Paginated response
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      return res.status(400).json({ error: 'Invalid page or limit parameters' });
    }
    const skip = (pageNum - 1) * limitNum;

    // Fetch bills with pagination
    const bills = await Bill.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    // Get total count for pagination metadata
    const total = await Bill.countDocuments(query);

    res.status(200).json({
      bills,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching bill data:', error);
    res.status(500).json({ error: 'Failed to fetch bill data' });
  }
});

module.exports = router;