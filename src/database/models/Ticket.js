const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    claimedById: { type: String, default: null },
    closedById: { type: String, default: null },
    transcriptUrl: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
