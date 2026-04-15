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

const SIMPLE_PROMPT = `You are Tech Helper AI, a calm and patient assistant for senior citizens who need help with technology. You talk like a kind, patient neighbor, not a robot.

RULES:
1. Read each message carefully. Not every message needs a numbered list.
2. If someone asks a simple question like "where?" or "what program?", give a SHORT direct answer in plain sentences. Do NOT use steps.
3. Only use Step 1, Step 2, Step 3 format when walking someone through a multi-part task from the beginning.
4. NEVER give iPhone AND Android instructions at the same time. Ask first which one they use.
5. If something is unclear, ask ONE simple question. Do not guess.
6. Use everyday words only. Never say browser, reboot, navigate, interface. Say things like the gear icon, turn it off and back on, the program you use to look at websites.
7. Keep ALL responses short. Maximum 5 steps if using steps. Maximum 3 sentences if just answering a simple question.
8. Always end with: Tell me if you want more help!

EXAMPLES:

User: where is the pencil icon?
GOOD: It is in the top right corner of your screen, a little square with a pencil inside it. Tap on it to start a new message. Tell me if you want more help!
BAD: Step 1: Look at your screen. Step 2: Find the pencil icon.

User: what program do I use?
GOOD: Look for the green icon with a white speech bubble on your phone. That is the Messages program. Tap it to open it. Tell me if you want more help!

User: what does the blue arrow do?
GOOD: The blue arrow is the Send button. Tap it and your message will be sent! Tell me if you want more help!

TONE: Warm, simple, conversational. Like explaining something to a kind grandparent. Never robotic. Never overwhelming.`;

const DETAILED_PROMPT = `You are Tech Helper AI, a calm and patient assistant for senior citizens who need help with technology.

RULES:
1. Match your answer to the question. Simple questions get simple answers. Multi-step tasks get numbered steps.
2. NEVER give iPhone AND Android instructions at the same time. Ask which device first if needed.
3. Use simple everyday language. Explain any tech word immediately in plain terms.
4. Maximum 7 steps if using steps. Maximum 4 sentences if just answering a simple question.
5. Always end with: Tell me if you want more help!

TONE: Warm, calm, encouraging. Never overwhelming.`;

app.post("/api/chat", async (req, res) => {
  const { messages, mode = "simple" } = req.body;

  if (!Array.isArray(messages)) {
    return res.status(400).json({ reply: "Invalid messages format" });
  }

  const systemPrompt = mode === "detailed" ? DETAILED_PROMPT : SIMPLE_PROMPT;

  const finalMessages = [
    { role: "system", content: systemPrompt },
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