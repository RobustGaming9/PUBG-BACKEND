const express = require('express');
const router = express.Router();
const { Tournament, Team } = require('../models/tournaments');
const mongoose = require('mongoose');

// Create a new tournament
router.post('/', async (req, res) => {
  try {
    const { tournamentName, startDate, endDate, numberOfTeams } = req.body;

    if (!tournamentName || !startDate || !endDate || typeof numberOfTeams !== 'number') {
      return res.status(400).send({ error: 'All tournament fields are required' });
    }

    const tournament = new Tournament({ tournamentName, startDate, endDate, numberOfTeams });
    await tournament.save();
    res.status(201).send(tournament);
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(400).send({ error: error.message || 'Failed to create tournament' });
  }
});

// Get all tournaments
router.get("/", async (req, res) => {
  console.log("➡️ /api/tournaments GET called");
  try {
    const tournaments = await Tournament.find();
    console.log("✅ DB returned tournaments:", tournaments.length);
    res.send(tournaments);
  } catch (error) {
    console.error("❌ Error fetching tournaments:", error);
    res.status(500).send({ error: error.message || 'Failed to fetch tournaments' });
  }
});

// Get a specific tournament
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).send('Tournament not found');
    res.send(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).send({ error: error.message || 'Failed to fetch tournament' });
  }
});

// Delete a tournament and its teams
router.delete('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndDelete(req.params.id);
    if (!tournament) return res.status(404).send('Tournament not found');

    await Team.deleteMany({ tournamentId: req.params.id });

    res.send({ message: 'Tournament and related teams deleted successfully' });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).send({ error: error.message || 'Failed to delete tournament' });
  }
});

// Add all teams at once to a tournament
router.post('/:id/teams', async (req, res) => {
  try {
    const teamsToAdd = req.body;
    console.log('Received teamsToAdd:', JSON.stringify(teamsToAdd, null, 2));

    if (!Array.isArray(teamsToAdd) || teamsToAdd.length === 0) {
      return res.status(400).send({ error: 'Provide a non-empty array of teams' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).send('Tournament not found');

    if (teamsToAdd.length !== tournament.numberOfTeams) {
      return res.status(400).send({
        error: `Exactly ${tournament.numberOfTeams} teams required, but received ${teamsToAdd.length}`
      });
    }

    const formattedTeams = [];
    const existingTeams = await Team.find({ tournamentId: req.params.id }).select('teamName');

    for (const team of teamsToAdd) {
      if (!team.teamName || typeof team.teamName !== 'string' || !team.teamName.trim()) {
        console.error(`Validation failed for team: ${JSON.stringify(team)} - Invalid teamName`);
        return res.status(400).send({ error: 'Each team must have a valid teamName' });
      }

      if (existingTeams.some(existing => existing.teamName === team.teamName.trim())) {
        console.error(`Duplicate team name: ${team.teamName}`);
        return res.status(400).send({ error: `Team name '${team.teamName}' already exists in this tournament` });
      }

      formattedTeams.push({
        _id: new mongoose.Types.ObjectId(),
        tournamentId: req.params.id,
        teamName: team.teamName.trim(),
        kills: typeof team.kills === 'number' ? team.kills : 0,
        points: typeof team.points === 'number' ? team.points : 0,
        eliminated: typeof team.eliminated === 'boolean' ? team.eliminated : false
      });
    }

    console.log('Attempting to save teams:', JSON.stringify(formattedTeams, null, 2));
    const savedTeams = await Team.insertMany(formattedTeams, { runValidators: true });
    res.status(201).send(savedTeams);
  } catch (error) {
    console.error('Error saving teams:', error, 'Request body:', JSON.stringify(req.body, null, 2));
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).send({ error: `Validation failed: ${messages}` });
    }
    if (error.code === 11000) {
      return res.status(400).send({ error: `Duplicate team name in tournament` });
    }
    res.status(400).send({ error: error.message || 'Failed to add teams' });
  }
});

// Get all teams of a specific tournament
router.get('/:id/teams', async (req, res) => {
  try {
    const teams = await Team.find({ tournamentId: req.params.id });

    if (!teams || teams.length === 0) {
      return res.status(404).send('No teams found for this tournament');
    }

    const result = teams.map(team => ({
      _id: team._id,
      teamName: team.teamName,
      kills: team.kills,
      points: team.points,
      totalPoints: team.kills + team.points,
      eliminated: team.eliminated
    }));

    res.send(result);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).send({ error: error.message || 'Failed to fetch teams' });
  }
});

// Bulk update teams
router.put('/:tournamentId/teams/bulk-update', async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    const updates = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Request body must be a non-empty array of team updates' });
    }

    const teams = await Team.find({ tournamentId }).select('_id teamName');
    const validTeamIds = teams.map(team => team._id.toString());

    const teamIds = updates.map(update => update.teamId);
    const invalidIds = teamIds.filter(id => !validTeamIds.includes(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `Invalid team IDs: ${invalidIds.join(', ')}` });
    }

    const bulkOps = updates.map(update => {
      const { teamId, changes } = update;
      const setFields = {};

      if (typeof changes.kills === 'number') setFields.kills = changes.kills;
      if (typeof changes.points === 'number') setFields.points = changes.points;
      if (changes.teamName && typeof changes.teamName === 'string' && changes.teamName.trim()) {
        setFields.teamName = changes.teamName.trim();
      }
      if (typeof changes.eliminated === 'boolean') setFields.eliminated = changes.eliminated;

      if (Object.keys(setFields).length === 0) {
        throw new Error(`No valid fields to update for team ${teamId}`);
      }

      return {
        updateOne: {
          filter: { _id: teamId, tournamentId },
          update: { $set: setFields }
        }
      };
    });

    await Team.bulkWrite(bulkOps);
    const updatedTeams = await Team.find({ tournamentId });
    res.json(updatedTeams);
  } catch (error) {
    console.error('Error bulk updating teams:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).send({ error: `Validation failed: ${messages}` });
    }
    if (error.code === 11000) {
      return res.status(400).send({ error: `Duplicate team name in tournament` });
    }
    res.status(400).json({ error: error.message || 'Failed to update teams' });
  }
});

// Update a specific team
router.put('/:id/teams/:teamId', async (req, res) => {
  try {
    const { teamName, kills, points, eliminated } = req.body;

    if (teamName && typeof teamName === 'string' && teamName.trim()) {
      const existingTeam = await Team.findOne({
        tournamentId: req.params.id,
        teamName: teamName.trim(),
        _id: { $ne: req.params.teamId }
      });
      if (existingTeam) {
        return res.status(400).send({ error: `Team name '${teamName}' already exists in this tournament` });
      }
    }

    const updateFields = {};
    if (teamName && typeof teamName === 'string' && teamName.trim()) {
      updateFields.teamName = teamName.trim();
    }
    if (typeof kills === 'number') updateFields.kills = kills;
    if (typeof points === 'number') updateFields.points = points;
    if (typeof eliminated === 'boolean') updateFields.eliminated = eliminated;

    const team = await Team.findOneAndUpdate(
      { _id: req.params.teamId, tournamentId: req.params.id },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!team) return res.status(404).send('Team not found in this tournament');

    res.send(team);
  } catch (error) {
    console.error('Error updating team:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).send({ error: `Validation failed: ${messages}` });
    }
    if (error.code === 11000) {
      return res.status(400).send({ error: `Duplicate team name in tournament` });
    }
    res.status(400).send({ error: error.message || 'Failed to update team' });
  }
});

// Delete a specific team from a tournament
router.delete('/:id/teams/:teamId', async (req, res) => {
  try {
    const team = await Team.findOneAndDelete({
      _id: req.params.teamId,
      tournamentId: req.params.id
    });

    if (!team) return res.status(404).send('Team not found in this tournament');

    res.send({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).send({ error: error.message || 'Failed to delete team' });
  }
});

// Get sorted points table
router.get('/:id/points', async (req, res) => {
  try {
    const teams = await Team.find({ tournamentId: req.params.id });

    if (!teams || teams.length === 0) {
      return res.status(404).send('No teams found for this tournament');
    }

    const processedTeams = Object.values(
      teams.reduce((acc, team) => {
        const totalPoints = team.kills + team.points;
        if (!acc[team.teamName] || totalPoints > (acc[team.teamName].kills + acc[team.teamName].points)) {
          acc[team.teamName] = {
            _id: team._id,
            teamName: team.teamName,
            kills: team.kills,
            points: team.points,
            totalPoints,
            eliminated: team.eliminated
          };
        }
        return acc;
      }, {})
    )
      .sort((a, b) => b.totalPoints - a.totalPoints || b.kills - a.kills)
      .map((team, index) => ({
        ...team,
        position: index + 1
      }));

    res.send(processedTeams);
  } catch (error) {
    console.error('Error fetching points table:', error);
    res.status(500).send({ error: error.message || 'Failed to fetch points table' });
  }
});

module.exports = router;
