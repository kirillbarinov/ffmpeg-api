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
    console.log("📥 Скачиваем видео по ссылке:", videoUrl);
    const response = await axios({ url: videoUrl, responseType: 'stream' });
    const videoStream = fs.createWriteStream(videoPath);
    response.data.pipe(videoStream);
    await new Promise(resolve => videoStream.on('finish', resolve));

    console.log("🎬 Запускаем ffmpeg для объединения");
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest'
      ])
      .on('start', (cmdLine) => {
        console.log("🚀 FFmpeg команда:", cmdLine);
      })
      .on('end', () => {
        console.log("✅ Готово! Отправляем видео.");
        res.download(outputPath, () => {
          fs.unlinkSync(videoPath);
          fs.unlinkSync(audioPath);
          fs.unlinkSync(outputPath);
        });
      })
      .on('error', (err, stdout, stderr) => {
        console.error("❌ FFmpeg ошибка:", err.message);
        console.error("STDERR:", stderr);
        res.status(500).send(`ffmpeg exited with code 1:\n${stderr}`);
      })
      .save(outputPath);

  } catch (err) {
    console.error("❌ Ошибка обработки:", err.message);
    res.status(500).send("Ошибка при обработке запроса: " + err.message);
  }
});

app.listen(3000, () => console.log('🚀 Сервер запущен на http://localhost:3000'));
