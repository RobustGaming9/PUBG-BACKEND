const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  tournamentName: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  numberOfTeams: { type: Number, required: true } // ✅ Added
});

module.exports = mongoose.model('Tournament', tournamentSchema);

const teamSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  teamName: { type: String, required: true },
  kills: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  eliminated: { type: Boolean, default: false }
});

// Ensure unique team names within a tournament
teamSchema.index({ tournamentId: 1, teamName: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);