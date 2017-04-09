'use strict';

// Messenger API integration example
// We assume you have:
// * a Wit.ai bot setup (https://wit.ai/docs/quickstart)
// * a Messenger Platform setup (https://developers.facebook.com/docs/messenger-platform/quickstart)
// You need to `npm install` the following dependencies: body-parser, express, request.
//
const bodyParser = require('body-parser');
const express = require('express');

// get Bot, const, and Facebook API
const {getWit, onMessage} = require('./bot.js');
const Config = require('./const.js');
const FB = require('./facebook.js');
const API = require('./api.js');

var http = require('http');
var request = require('request');

// Setting up our bot
const wit = getWit();

// Webserver parameter
const PORT = process.env.PORT || 8445;

// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });

  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {
      fbid: fbid,
      context: {
        _fbid_: fbid
      }
    }; // set context, _fid_
  }
  return sessionId;
};

// Starting our webserver and putting it all together
const app = express();
app.set('port', PORT);
app.listen(app.get('port'));
app.use(bodyParser.json());
console.log("I'm wating for you @" + PORT);

// index. Let's say something fun
app.get('/', function(req, res) {
  res.send('"Only those who will risk going too far can possibly find out how far one can go." - T.S. Eliot');
});

// Webhook verify setup using FB_VERIFY_TOKEN
app.get('/webhook', (req, res) => {
  if (!Config.FB_VERIFY_TOKEN) {
    throw new Error('missing FB_VERIFY_TOKEN');
  }
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === Config.FB_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

// The main message handler
app.post('/webhook', (req, res) => {
  // Parsing the Messenger API response
  const messaging = FB.getFirstMessagingEntry(req.body);
  // console.log("Receive facebook message: ", messaging);

  if (messaging && messaging.message && !messaging.message.is_echo) {

    // Yay! We got a new message!

    // We retrieve the Facebook user ID of the sender
    const sender = messaging.sender.id;

    // We retrieve the user's current session, or create one if it doesn't exist
    // This is needed for our bot to figure out the conversation history
    const sessionId = findOrCreateSession(sender);

    // We retrieve the message content
    const msg = messaging.message.text;
    const atts = messaging.message.attachments;

    if (atts) {
      // We received an attachment

      // Let's reply with an automatic message
      FB.fbMessage(
        sender,
        {text:'Sorry I can only process text messages for now.'}
      );
    } else if (msg) {
      // We received a text message
      // Let's forward the message to the Wit.ai Bot Engine
      // This will run all actions until our bot has nothing left to do
      var context = sessions[sessionId].context;
      onMessage(msg, context);
      
      
    }
  }
  res.sendStatus(200);
});

app.post('/sentenceAi', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ "intent": "intent", "word" : "ข้าว" }));  
});

app.post('/restaurantApi', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify([{"_index":"estaurant","_type":"restaurant","_id":"AVsrIIAkLJ3pRDtn-qh_","_score":1,"_source":{"name":"แป้งพิมพ์","original_id":"restaurants/70347HL-%E0%B9%81%E0%B8%9B%E0%B9%89%E0%B8%87%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%9E%E0%B9%8C","image":"https://img-wongnai.cdn.byteark.com/p/l/2015/06/23/028ce9a461834f6dbf44e7f69171b2f2.jpg","geo":{"location":[100.56142,13.740457]},"address":{"streetAddress":"สุขุมวิท 21 ซอย 1","addressLocality":"ซอยสุขุมวิท21แยก1 เข้ามานิดเดียวอยู่ซ้ายมือ","addressRegion":"กรุงเทพมหานคร"},"times":{"sun":[{"open":9,"close":19}],"mon":[{"open":9,"close":19}],"tue":[{"open":9,"close":19}],"wed":[{"open":9,"close":19}],"thr":[{"open":9,"close":19}],"fri":[{"open":9,"close":19}],"sat":[{"open":9,"close":19}]},"rating":{"ratingValue":3.7,"ratingCount":2,"reviewCount":2},"priceRange":{"low":0,"high":"100"},"cuisine":"อาหารไทย","menus":["ยำปลาดุกฟู","ส้มตำปูม้า"],"created_at":"2017-04-01T20:06:40.780Z","updated_at":"2017-04-01T20:06:40.780Z"}}]));  
});

app.post('/webhooktest', (req, res) => {
    var msg = "อยากกินส้มตำ";
    var context = {};
    onMessage(msg, context);
    res.sendStatus(200);
});
app.post('/setGreetingMsg', (req, res) => {
  console.log(req.body.text);
  var options = {
      uri: "https://graph.facebook.com/v2.6/"+Config.FB_PAGE_ID+"/thread_settings?access_token="+Config.FB_PAGE_TOKEN,
      method: 'POST',
      headers: {
          "content-type": "application/json",
      },
      json: {
        "setting_type":"greeting",
        "greeting": {
          "text": "สวัสดีค่ะ ยินดีต้อนรับเข้าสู่บริการค้นหาร้านอาหาร estaurant"
        }
      }
  };
  res.sendStatus(200);  
});