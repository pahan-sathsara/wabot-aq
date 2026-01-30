const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const { MongoClient } = require("mongodb");
const P = require("pino");

async function useMongoAuthState(session) {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db("wa_sessions");
  const col = db.collection(session);

  const readData = async () => {
    const data = await col.findOne({ _id: "auth" });
    return data?.value || {};
  };

  const writeData = async (value) => {
    await col.updateOne(
      { _id: "auth" },
      { $set: { value } },
      { upsert: true }
    );
  };

  const state = await readData();

  return {
    state,
    saveCreds: async () => writeData(state)
  };
}

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();

  let auth;
  if (process.env.AUTH_TYPE === "mongo") {
    auth = await useMongoAuthState(process.env.SESSION_NAME);
  } else {
    auth = await useMultiFileAuthState("./auth");
  }

  const sock = makeWASocket({
    version,
    auth: auth.state,
    logger: P({ level: "silent" }),
    printQRInTerminal: !process.env.USE_PAIRING
  });

  if (process.env.USE_PAIRING === "true" && !sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(process.env.PAIRING_NUMBER);
    console.log("📲 Pairing Code:", code);
  }

  sock.ev.on("creds.update", auth.saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ WhatsApp connected");
    }
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        startBot();
      }
    }
  });
}

startBot();
