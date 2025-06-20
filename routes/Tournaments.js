const express = require('express');
const router = express.Router();
const Tournament = require('../models/tournaments');
const Team = require('../models/team');
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
    res.status(400).send(error);
  }
});

// Get all tournaments
router.get('/', async (req, res) => {
  try {
    const tournaments = await Tournament.find();
    res.send(tournaments);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Get a specific tournament
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).send('Tournament not found');
    res.send(tournament);
  } catch (error) {
    res.status(500).send(error);
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
    res.status(500).send(error);
  }
});

// Add all teams at once to a tournament
router.post('/:id/teams', async (req, res) => {
  try {
    const teamsToAdd = req.body;

    if (!Array.isArray(teamsToAdd) || teamsToAdd.length === 0) {
      return res.status(400).send({ error: 'Provide an array of teams' });
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
        return res.status(400).send({ error: 'Each team must have a valid teamName' });
      }

      if (existingTeams.some(existing => existing.teamName === team.teamName.trim())) {
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

    const savedTeams = await Team.insertMany(formattedTeams);
    res.status(201).send(savedTeams);
  } catch (error) {
    res.status(500).send({ error: error.message || 'Failed to add teams' });
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
    res.status(500).send(error);
  }
});

// Bulk update teams
router.put('/:tournamentId/teams/bulk-update', async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    const updates = req.body;

    // Validate that the request body is a non-empty array
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Request body must be a non-empty array of team updates' });
    }

    // Fetch team IDs and names to validate
    const teams = await Team.find({ tournamentId }).select('_id teamName');
    const validTeamIds = teams.map(team => team._id.toString());
    const teamIdToNameMap = new Map(teams.map(team => [team._id.toString(), team.teamName]));

    // Check for invalid team IDs
    const teamIds = updates.map(update => update.teamId);
    const invalidIds = teamIds.filter(id => !validTeamIds.includes(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `Invalid team IDs: ${invalidIds.join(', ')}` });
    }

    // Check for duplicate team names only when teamName is being changed
    const nameChangeUpdates = updates.filter(update => update.changes.teamName && 
      update.changes.teamName.trim() !== teamIdToNameMap.get(update.teamId));
    
    if (nameChangeUpdates.length > 0) {
      // Check for duplicates among the updates themselves
      const nameToTeams = new Map();
      for (const update of nameChangeUpdates) {
        const newName = update.changes.teamName.trim();
        if (!nameToTeams.has(newName)) {
          nameToTeams.set(newName, []);
        }
        nameToTeams.get(newName).push(update.teamId);
      }
      const internalDuplicates = [...nameToTeams.entries()]
        .filter(([_, teamIds]) => teamIds.length > 1)
        .map(([name]) => name);
      if (internalDuplicates.length > 0) {
        return res.status(400).json({ error: `Duplicate team names within updates: ${internalDuplicates.join(', ')}` });
      }

      // Check for conflicts with existing teams (excluding the team itself)
      const orConditions = nameChangeUpdates.map(update => ({
        teamName: update.changes.teamName.trim(),
        _id: { $ne: update.teamId },
        tournamentId
      }));
      const conflictingTeams = await Team.find({ $or: orConditions }).select('teamName');
      if (conflictingTeams.length > 0) {
        const duplicateNames = conflictingTeams.map(team => team.teamName);
        return res.status(400).json({ error: `Duplicate team names: ${duplicateNames.join(', ')}` });
      }
    }

    // Prepare bulk operations
    const bulkOps = updates.map(update => {
      const { teamId, changes } = update;
      const setFields = {};

      // Handle fields with $set
      if (typeof changes.kills === 'number') setFields.kills = changes.kills;
      if (typeof changes.points === 'number') setFields.points = changes.points;
      if (changes.teamName && 
          typeof changes.teamName === 'string' && 
          changes.teamName.trim() !== teamIdToNameMap.get(teamId)) {
        setFields.teamName = changes.teamName.trim();
      }
      if (typeof changes.eliminated === 'boolean') setFields.eliminated = changes.eliminated;

      // Ensure there's something to update
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

    // Execute bulk write operation
    await Team.bulkWrite(bulkOps);

    // Return updated teams
    const updatedTeams = await Team.find({ tournamentId });
    res.json(updatedTeams);
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update teams' });
  }
});

// Update a specific team
router.put('/:id/teams/:teamId', async (req, res) => {
  try {
    const { teamName, kills, points, eliminated } = req.body;

    // Check for duplicate team name if teamName is being updated
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

    const team = await Team.findOneAndUpdate(
      { _id: req.params.teamId, tournamentId: req.params.id },
      {
        ...(teamName && typeof teamName === 'string' && teamName.trim() && { teamName: teamName.trim() }),
        ...(kills !== undefined && { kills }),
        ...(points !== undefined && { points }),
        ...(eliminated !== undefined && { eliminated })
      },
      { new: true }
    );

    if (!team) return res.status(404).send('Team not found in this tournament');

    res.send(team);
  } catch (error) {
    res.status(400).send(error);
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
    res.status(500).send(error);
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
        if (
          !acc[team.teamName] ||
          totalPoints > (acc[team.teamName].kills + acc[team.teamName].points)
        ) {
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
    res.status(500).send(error);
  }
});

module.exports = router;