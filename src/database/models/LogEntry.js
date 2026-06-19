const mongoose = require('mongoose');

const logEntrySchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LogEntry', logEntrySchema);
