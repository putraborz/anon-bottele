const mongoose = require("mongoose")

module.exports = mongoose.model("User", {
  telegramId: Number,
  gender: { type: String, enum: ["male", "female", "unknown"], default: "unknown" },
  premium: { type: Boolean, default: false },
  banned: { type: Boolean, default: false },
  reports: { type: Number, default: 0 }
})
