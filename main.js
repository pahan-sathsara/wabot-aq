require("./config.js")

const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys")

const P = require("pino")
const fs = require("fs")
const path = require("path")
const _ = require("lodash")

// ==============================
// 🔐 AUTH (Mongo or Local)
// ==============================
const { MongoClient } = require("mongodb")

async function useMongoAuthState(session) {
  const client = new MongoClient(process.env.MONGO_URI)
  await client.connect()
  const db = client.db("wa_sessions")
  const col = db.collection(session)

  const read = async () => {
    const d = await col.findOne({ _id: "auth" })
    return d?.value || {}
  }

  const write = async (value) => {
    await col.updateOne(
      { _id: "auth" },
      { $set: { value } },
      { upsert: true }
    )
  }

  const state = await read()
  return { state, saveCreds: async () => write(state) }
}

// ==============================
// 🚀 START BOT
// ==============================
async function startBot() {
  const { version } = await fetchLatestBaileysVersion()

  let auth
  if (process.env.AUTH_TYPE === "mongo") {
    auth = await useMongoAuthState("mainbot")
  } else {
    auth = await useMultiFileAuthState("./auth")
  }

  const conn = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    auth: auth.state,
    printQRInTerminal: process.env.USE_PAIRING !== "true",
    browser: ["Wabot-AQ", "Chrome", "1.0"]
  })

  // ==============================
  // 📲 PAIRING CODE
  // ==============================
  if (process.env.USE_PAIRING === "true" && !conn.authState.creds.registered) {
    const code = await conn.requestPairingCode(process.env.PAIRING_NUMBER)
    console.log("📲 Pairing Code:", code)
  }

  conn.ev.on("creds.update", auth.saveCreds)

  // ==============================
  // 🔁 CONNECTION HANDLER
  // ==============================
  conn.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ WhatsApp Connected")
    }
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) {
        startBot()
      }
    }
  })

  // ==============================
  // 📦 LOAD PLUGINS
  // ==============================
  global.conn = conn
  global.plugins = {}

  const pluginFolder = path.join(__dirname, "plugins")
  for (const file of fs.readdirSync(pluginFolder)) {
    if (file.endsWith(".js")) {
      global.plugins[file] = require(path.join(pluginFolder, file))
    }
  }

  // ==============================
  // 📩 MESSAGE HANDLER
  // ==============================
  conn.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return

    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      ""

    for (const plugin of Object.values(global.plugins)) {
      if (plugin.command && plugin.command.test(text)) {
        try {
          await plugin.run(m, { conn, text })
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

startBot()
