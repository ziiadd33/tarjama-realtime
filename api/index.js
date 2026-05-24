require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer({ dest: '/tmp/' });

app.post('/process-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const filePath = req.file.path;

    // 1. Transcribe audio using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: 'ar',
    });

    const arabicText = transcription.text;

    // 2. Translate Arabic (Darija) to Spanish using GPT
    const translation = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert translator specializing in Moroccan Arabic (Darija) and Spanish. Translate the following text to Spanish, preserving the religious and formal context of the original speech. Output only the translated text.'
        },
        {
          role: 'user',
          content: arabicText
        },
      ],
    });

    const spanishText = translation.choices[0].message.content;

    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    res.json({
      arabic: arabicText,
      spanish: spanishText,
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = app;
