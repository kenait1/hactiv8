import 'dotenv/config';
import express from 'express';
import multer from 'multer'
import fs from 'fs/promises';
import { GoogleGenAI } from "@google/genai";

const app = express();
const upload = multer();
const ai = new GoogleGenAI ({ apiKey: process.env.GEMINI_API_KEY });

// **Set your default Gemini model here"**
const GEMINI_MODEL = "gemini-3.5-flash-lite";

app.use(express.json());

app.post('/generate-text', upload.none(), async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });

    res.status(200).json({ result: response.text });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message });
  }
});

app.post("/generate-from-image", upload.single("image"), async (req, res) => {
  const { prompt } = req.body;
  const base64Image = req.file.buffer.toString("base64");

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt },
        { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
      ],
    });

    res.status(200).json({ result: response.text });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));