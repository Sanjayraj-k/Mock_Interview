const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// 🔑 Replace with your credentials
const VERIFY_TOKEN = "sanjay"; // you choose
const WHATSAPP_TOKEN = "EAATCYRPgyw4BPum83zwJANfif90mxaYevZAxyKd0ZCDW7cmjOi1TfEKST1TT6YQEYhjDBSZBLBZATnk2CVCY1ipkFuS0Mju9BxWkEolOCOA4RasG5gPEZCR3iebTZBA8R3lAjOwc2lg8ZC2tw8WCs8c4bZBBovxmRPaBDvf5o4Rs1rFwMeRtoJkkKOO3uz4S7A096uKFZA1tt8oc1NH5lBbZBl7Q1zGbpdtbuBH7pbMWhqMAZDZD";
const PHONE_NUMBER_ID = "842332982291402";

// ✅ Step 3: Webhook verification (WhatsApp → your server)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ Step 4: Handle incoming messages
app.post("/webhook", async (req, res) => {
  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0]?.value?.messages?.[0];

  if (changes && changes.text) {
    const from = changes.from; // User's WhatsApp number
    const msgBody = changes.text.body;

    console.log("📩 User said:", msgBody);

    // Send back reply using WhatsApp Cloud API
    await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: "🤖 You said: " + msgBody },
      },
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
  }

  res.sendStatus(200);
});

// ✅ Start server
app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
