const mongoose = require("mongoose");

// Tournament Schema
const TournamentSchema = new mongoose.Schema({
  tournamentName: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  numberOfTeams: { type: Number, required: true }
});

// Team Schema
const TeamSchema = new mongoose.Schema({
  tournamentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Tournament", 
    required: true 
  },
  teamName: { type: String, required: true, trim: true },
  kills: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  eliminated: { type: Boolean, default: false }
});

// Ensure unique team names per tournament
TeamSchema.index({ tournamentId: 1, teamName: 1 }, { unique: true });

const Tournament = mongoose.model("Tournament", TournamentSchema);
const Team = mongoose.model("Team", TeamSchema);

module.exports = { Tournament, Team };
