const express = require('express');
const router = express.Router();
const User = require("../models/user");
const Bill = require("../models/bill"); // Assuming Bill model exists

// User Routes
router.post('/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).send(user);
  } catch (error) {
    res.status(400).send(error);
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).send(users);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    res.status(200).send({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).send(error);
  }
});

// Bill Routes
router.put('/api/bill/billdata/:id', async (req, res) => {
  try {
    const bill = await Bill.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!bill) {
      return res.status(404).send({ message: 'Bill not found' });
    }
    res.status(200).send(bill);
  } catch (error) {
    res.status(400).send({ message: 'Failed to update bill', error });
  }
});

router.delete('/api/bill/billdata/:id', async (req, res) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) {
      return res.status(404).send({ message: 'Bill not found' });
    }
    res.status(200).send({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).send({ message: 'Failed to delete bill', error });
  }
});

module.exports = router;
