const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema({
  user_id: Number,
  action: String,
  endpoint: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model(
  "ActivityLog",
  ActivityLogSchema
);