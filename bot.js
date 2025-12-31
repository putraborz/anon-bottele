const { Telegraf } = require("telegraf")
const mongoose = require("mongoose")
const User = require("./models/User")
const config = require("./config")

mongoose.connect(config.MONGO_URI)
const bot = new Telegraf(config.BOT_TOKEN)

let waiting = []
const pairs = new Map()
const cooldown = new Map()

const isOwner = id => id === config.OWNER_ID

async function getUser(id) {
  let u = await User.findOne({ telegramId: id })
  if (!u) u = await User.create({ telegramId: id })
  return u
}

function canSend(id, premium) {
  if (premium) return true
  const now = Date.now()
  const last = cooldown.get(id) || 0
  if (now - last < config.COOLDOWN_MS) return false
  cooldown.set(id, now)
  return true
}

// START
bot.start(async ctx => {
  const u = await getUser(ctx.from.id)
  if (u.banned) return ctx.reply("🚫 Kamu dibanned")

  ctx.reply(
`🤖 ANON CHAT BOT

/search → random
/search male|female → PREMIUM
/stop
/report

Status: ${u.premium ? "💎 PREMIUM" : "FREE"}`
  )
})

// SEARCH
bot.command("search", async ctx => {
  const id = ctx.from.id
  const u = await getUser(id)
  if (u.banned) return

  let pref = ctx.message.text.split(" ")[1]
  if (pref && !u.premium)
    return ctx.reply("💎 Fitur ini khusus PREMIUM")

  waiting.push({ id, pref })
  ctx.reply("🔎 Mencari partner...")
})

// MATCHING LOOP
setInterval(async () => {
  if (waiting.length < 2) return

  for (let i = 0; i < waiting.length; i++) {
    for (let j = i + 1; j < waiting.length; j++) {
      const a = waiting[i]
      const b = waiting[j]

      const ua = await getUser(a.id)
      const ub = await getUser(b.id)

      if (
        (!a.pref || ub.gender === a.pref) &&
        (!b.pref || ua.gender === b.pref)
      ) {
        pairs.set(a.id, b.id)
        pairs.set(b.id, a.id)

        bot.telegram.sendMessage(a.id, "✅ Partner ditemukan")
        bot.telegram.sendMessage(b.id, "✅ Partner ditemukan")

        waiting = waiting.filter(x => x !== a && x !== b)
        return
      }
    }
  }
}, 2000)

// STOP
bot.command("stop", ctx => {
  const p = pairs.get(ctx.from.id)
  if (!p) return

  pairs.delete(ctx.from.id)
  pairs.delete(p)
  bot.telegram.sendMessage(p, "⛔ Partner keluar")
  ctx.reply("⛔ Chat dihentikan")
})

// REPORT
bot.command("report", async ctx => {
  const p = pairs.get(ctx.from.id)
  if (!p) return

  const u = await getUser(p)
  u.reports++
  if (u.reports >= 3) u.banned = true
  await u.save()

  pairs.delete(ctx.from.id)
  pairs.delete(p)

  bot.telegram.sendMessage(config.OWNER_ID,
    `🚨 REPORT\nID: ${p}\nTotal: ${u.reports}`
  )
  ctx.reply("✅ Dilaporkan")
})

// RELAY
bot.on("message", async ctx => {
  const id = ctx.from.id
  const p = pairs.get(id)
  if (!p) return

  const u = await getUser(id)
  if (!canSend(id, u.premium)) return

  ctx.copyMessage(p)
})

// OWNER PREMIUM SELL
bot.command("addprem", async ctx => {
  if (!isOwner(ctx.from.id)) return
  const id = parseInt(ctx.message.text.split(" ")[1])
  const u = await getUser(id)
  u.premium = true
  await u.save()
  ctx.reply(`💎 ${id} jadi PREMIUM`)
  bot.telegram.sendMessage(id, "💎 Premium aktif")
})

bot.launch()
console.log("BOT AKTIF")
