'use strict';

const line = require('@line/bot-sdk');
const express = require('express');

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result));
});

function readAllChunks(readableStream) {
  const reader = readableStream.getReader();
  const chunks = [];

  function pump() {
    return reader.read().then(({ value, done }) => {
      if (done) {
        return chunks;
      }
      chunks.push(value);
      return pump();
    });
  }

  return pump();
}

// event handler
function handleEvent(event) {

  if (event.type === 'message' || event.message.type === 'image') {
    const contentStream = client.getMessageContent(event.message.id);

    var uuid = require('uuid');
    const fileName = uuid.v4();

    const fs = require('fs');
    fs.mkdir('tmp', function (err) {});

    var writeStream = fs.createWriteStream('tmp/' + fileName + '.jpg', { flags : 'w' });
    contentStream.pipe(writeStream);

    writeStream.on('close', function () {
      const cloudinary = require('cloudinary');
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_KEY,
        api_secret: process.env.CLOUDINARY_SECRET
      });
      cloudinary.uploader.upload('tmp/' + fileName + '.jpg', function(result) {
        console.log(result)
        const message = { type: 'text', text: result['secure_url'] };
        return client.replyMessage(event.replyToken, message);
      });
    });
  }
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
