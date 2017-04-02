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
      // onMessage(wit, msg, context);

      //TODO call sentence_ai
      var intentAndWord = API.callSentenceAi(msg);
      //TODO call restaurant_api
      
      FB.fbMessage(
        sender,
        {text:'ตะมุตะมิ'+' '+ sender+' '+intentAndWord.intent + ' ' + intentAndWord.word}
      );
      // wit.runActions(
      //   sessionId, // the user's current session
      //   msg, // the user's message 
      //   sessions[sessionId].context, // the user's current session state
      //   (error, context) => {
      //     if (error) {
      //       console.log('Oops! Got an error from Wit:', error);
      //     } else {
      //       // Our bot did everything it has to do.
      //       // Now it's waiting for further messages to proceed.
      //       console.log('Waiting for futher messages.');

      //       // Based on the session state, you might want to reset the session.
      //       // This depends heavily on the business logic of your bot.
      //       // Example:
      //       // if (context['done']) {
      //       //   delete sessions[sessionId];
      //       // }

      //       // Updating the user's current session state
      //       sessions[sessionId].context = context;
      //     }
      //   }
      // );
    }
  }

  res.sendStatus(200);
  
});

app.post('/sentenceAi', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ intent: "intent", word : "word" }));  
});

app.post('/restaurantApi', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ message: "message" }));  
});