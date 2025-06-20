const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  tournamentName: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  numberOfTeams: { type: Number, required: true } // ✅ Added
});

module.exports = mongoose.model('Tournament', tournamentSchema);
