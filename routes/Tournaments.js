const express = require('express');
const router = express.Router();
const { Tournament, Team } = require('../models/tournaments');
const mongoose = require('mongoose');

// ✅ Utility to convert Google Drive link to direct-view URL
function convertDriveLink(link) {
  if (link && link.includes('drive.google.com')) {
    const match = link.match(/\/d\/(.*?)\//);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }
  return link;
}

// ✅ Create a new tournament
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

// ✅ Get all tournaments
router.get("/", async (req, res) => {
  console.log("➡️ /api/tournaments GET called");
  try {
    const tournaments = await Tournament.find();
    console.log("✅ DB returned tournaments:", tournaments.length);
    res.send(tournaments);
  } catch (error) {
    console.error("❌ Error fetching tournaments:", error);
    res.status(500).send(error);
  }
});

// ✅ Get a specific tournament
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).send('Tournament not found');
    res.send(tournament);
  } catch (error) {
    res.status(500).send(error);
  }
});

// ✅ Delete a tournament and its teams
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

// ✅ Add all teams at once to a tournament
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
      if (!team.logo) {
        return res.status(400).send({ error: 'Each team must have a logo link' });
      }

      if (existingTeams.some(existing => existing.teamName === team.teamName.trim())) {
        return res.status(400).send({ error: `Team name '${team.teamName}' already exists in this tournament` });
      }

      formattedTeams.push({
        _id: new mongoose.Types.ObjectId(),
        tournamentId: req.params.id,
        teamName: team.teamName.trim(),
        logo: convertDriveLink(team.logo), // ✅ Convert Google Drive link here
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

// ✅ Get all teams of a specific tournament
router.get('/:id/teams', async (req, res) => {
  try {
    const teams = await Team.find({ tournamentId: req.params.id });

    if (!teams || teams.length === 0) {
      return res.status(404).send('No teams found for this tournament');
    }

    const result = teams.map(team => ({
      _id: team._id,
      teamName: team.teamName,
      logo: convertDriveLink(team.logo), // ✅ Always return converted link
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

// ✅ Bulk update teams
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
      if (changes.logo) setFields.logo = convertDriveLink(changes.logo); // ✅ Convert on update

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
    res.status(500).json({ error: error.message || 'Failed to update teams' });
  }
});

// ✅ Update a specific team
router.put('/:id/teams/:teamId', async (req, res) => {
  try {
    const { teamName, kills, points, eliminated, logo } = req.body;

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
        ...(teamName && { teamName: teamName.trim() }),
        ...(kills !== undefined && { kills }),
        ...(points !== undefined && { points }),
        ...(eliminated !== undefined && { eliminated }),
        ...(logo && { logo: convertDriveLink(logo) }) // ✅ Convert Drive link
      },
      { new: true }
    );

    if (!team) return res.status(404).send('Team not found in this tournament');

    res.send(team);
  } catch (error) {
    res.status(400).send(error);
  }
});

// ✅ Delete a specific team from a tournament
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

// ✅ Get sorted points table
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
            logo: convertDriveLink(team.logo), // ✅ Ensure converted
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
