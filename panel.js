const express = require("express")
const mongoose = require("mongoose")
const User = require("./models/User")
const config = require("./config")

mongoose.connect(config.MONGO_URI)
const app = express()

app.use((req, res, next) => {
  if (req.headers["x-owner-key"] !== String(config.OWNER_ID))
    return res.status(403).send("FORBIDDEN")
  next()
})

app.get("/stats", async (req, res) => {
  res.json({
    users: await User.countDocuments(),
    premium: await User.countDocuments({ premium: true }),
    banned: await User.countDocuments({ banned: true })
  })
})

app.listen(3000, () =>
  console.log("PANEL OWNER http://localhost:3000")
)
