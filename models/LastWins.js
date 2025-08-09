// models/LastWins.js
const mongoose = require('mongoose');

const lastWinsSchema = new mongoose.Schema(
  {
    wins: [
      {
        round: { type: Number, required: true },
        choice: { type: String, required: true }
      }
    ]
  },
  { timestamps: true, collection: 'lastwins' } // ensure collection name fixed
);

// single-doc usage, but index helps if it grows
lastWinsSchema.index({ 'wins.round': -1 });

module.exports = mongoose.model('LastWins', lastWinsSchema);
