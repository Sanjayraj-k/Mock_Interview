// File: app.js

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// 🔑 =========================================================================
// 🔑 IMPORTANT: Replace with your credentials.
// 🔑 Your token from the Meta App Dashboard EXPIRES EVERY 23 HOURS.
// 🔑 If messages stop sending, this is the first thing to replace.
// 🔑 =========================================================================
const VERIFY_TOKEN = "sanjay"; // This must match the one in your Meta App Dashboard
const WHATSAPP_TOKEN = "EAATCYRPgyw4BPmSpwBh3MmocakqZBWwI0khOwtZBnDDsK5bL3KXDbeQefmsESECN0mHB8nlgKFSHH7xDS3U3jv23WJvzlZBZAHwyZCYAAufBZCP8TMDwDqcRIYgoa18jp2324codgntlXa53RiDU9J3MR9ig5HSHyyAZBrxES2HSV7lb5ZBaksO5I3aX6lYOJ7etrNbs6yfeCDVgZCfYiPjZCD3M2DUqpXSOFUqivD21ukdwZDZD";
const PHONE_NUMBER_ID = "842332982291402"; // Your WhatsApp Business Phone Number ID

// 🤖 Your Python Chatbot Backend URL
const PYTHON_API_URL = "http://localhost:5000/ask";

// ✅ Webhook verification (for setup in Meta App Dashboard)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Webhook verification failed. Make sure your VERIFY_TOKEN matches the one in your Meta App Dashboard.");
    res.sendStatus(403);
  }
});

// ✅ Handle incoming messages and forward to Python backend
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0]?.value?.messages?.[0];

    // Ensure it's a valid text message from a user
    if (changes && changes.type === "text") {
      const from = changes.from; // User's WhatsApp number
      const msgBody = changes.text.body;

      console.log(`[IN] Message from ${from}: "${msgBody}"`);

      // 🚀 FORWARD THE MESSAGE TO THE PYTHON BACKEND
      let botResponse = "Sorry, I'm having a little trouble right now. Please try again in a moment.";

      try {
        const pythonResponse = await axios.post(PYTHON_API_URL, {
          question: msgBody,
          session_id: from, // Use the user's phone number as the unique session ID
        });

        if (pythonResponse.data && pythonResponse.data.answer) {
          botResponse = pythonResponse.data.answer;
        } else {
            console.warn("⚠️ Python API responded but had no 'answer' field.");
        }
      } catch (error) {
        console.error("❌ Error calling Python API:", error.response ? error.response.data : error.message);
        // The default error message will be used
      }
      
      console.log(`[OUT] Preparing to send to ${from}: "${botResponse}"`);

      // 📤 SEND THE PYTHON SERVER'S RESPONSE BACK TO THE USER VIA WHATSAPP
      try {
        await axios.post(
          `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: from,
            text: { body: botResponse },
          },
          { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
        );
        console.log(`✅ Message sent successfully to ${from}!`);

      } catch (error) {
        // 🔥 THIS IS THE CRITICAL DEBUGGING BLOCK 🔥
        // It will print the exact error from the WhatsApp API
        console.error("❌ FAILED TO SEND WHATSAPP MESSAGE ❌");
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error("Error Data:", JSON.stringify(error.response.data, null, 2));
          console.error("Error Status:", error.response.status);
          console.error("Error Headers:", error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          console.error("Error Request:", error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error("Error Message:", error.message);
        }
      }
    }
  } catch (error) {
    console.error("❌ An error occurred in the webhook handler:", error);
  }

  // Always send a 200 OK to WhatsApp to acknowledge receipt of the event
  res.sendStatus(200);
});

// ✅ Start the gateway server
app.listen(3000, () => {
  console.log("🚀 Node.js Gateway Server is running on port 3000");
  console.log("Make sure ngrok is running and your webhook is configured.");
  console.log("Waiting for messages from WhatsApp...");
});