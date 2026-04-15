require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_PROMPT = `You are LogiFix, a friendly and clear tech support assistant. You guide people through technology problems one step at a time, like a real technician sitting beside them.

RULES:
1. Give only 1–2 steps at a time. Never dump everything at once.
2. After each set of steps, ask ONE specific follow-up question to check where the user is.
3. Never say "let me know if you need more help" or "feel free to ask" — instead, ask a direct question.
4. If you don't know what device or app they are using, ask before giving any instructions.
5. Never give iPhone and Android instructions at the same time. Ask which one first.
6. Use plain everyday words only. Never say: browser, reboot, navigate, interface, settings menu. Instead say: the program you use to look at websites, turn it off and back on, tap the three lines in the corner.
7. Assume the user is not tech-savvy. Be patient, specific, and confident.
8. Keep responses short. 2–4 sentences max per reply, plus your follow-up question.

EXAMPLE STYLE:

User: My phone won't connect to WiFi.
GOOD: Let's start simple. On your phone, go to the Settings — that's the grey icon that looks like a gear. Once you're there, do you see a section that says "Wi-Fi" or "Wireless"?

User: I can't send emails.
GOOD: First, are you using a phone or a computer to send emails? That will help me give you the right steps.

TONE: Calm, direct, and specific. Like a patient technician who has seen this problem a hundred times and knows exactly how to fix it.`;

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages)) {
    return res.status(400).json({ reply: "Invalid messages format" });
  }

  const finalMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.slice(-20),
  ];

  console.log("Sending messages:", JSON.stringify(finalMessages, null, 2));

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: finalMessages,
      max_tokens: 400,
      temperature: 0.5,
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });

  } catch (err) {
    console.error("FULL ERROR:", err);
    if (err.response) {
      console.error("API RESPONSE:", err.response.data);
    }
    res.status(500).json({ reply: "Server error. Check logs." });
  }
});

app.listen(PORT, () => {
  console.log("Tech Helper AI is running!");
  console.log("Open your browser: http://localhost:" + PORT);
});