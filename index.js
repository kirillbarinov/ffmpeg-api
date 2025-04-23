const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.urlencoded({ extended: true }));

app.post('/merge', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("❌ Ошибка: аудиофайл не был передан как 'audio'");
  }

  const videoUrl = req.body.video_url;
  const audioPath = req.file.path;
  const videoPath = `video_${Date.now()}.mp4`;
  const outputPath = `output_${Date.now()}.mp4`;

  try {
    const response = await axios({ url: videoUrl, responseType: 'stream' });
    const videoStream = fs.createWriteStream(videoPath);
    response.data.pipe(videoStream);
    await new Promise(resolve => videoStream.on('finish', resolve));

    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions('-c:v copy', '-c:a aac', '-shortest')
      .save(outputPath)
      .on('end', () => {
        res.download(outputPath);
      })
      .on('error', err => {
        res.status(500).send(err.message);
      });

  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(3000, () => console.log('🚀 Сервер запущен на http://localhost:3000'));
