'use strict';

// Wit.ai parameters
// const WIT_TOKEN = process.env.WIT_TOKEN;
// if (!WIT_TOKEN) {
//   throw new Error('missing WIT_TOKEN');
// }

//API information
var SENTENCE_AI_URL = process.env.SENTENCE_AI_URL;
var RESTAURANT_API_URL = process.env.RESTAURANT_API_URL;

if(!SENTENCE_AI_URL) {
  SENTENCE_AI_URL = "http://localhost:8445/sentenceAi";
}

if(!RESTAURANT_API_URL) {
  RESTAURANT_API_URL = "http://localhost:8445/restaurantApi";
}

// Messenger API parameters
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;

var FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
if (!FB_VERIFY_TOKEN) {
  FB_VERIFY_TOKEN = "just_do_it";
}

var WORD_API_URL = process.env.WORD_API_URL;
if(!WORD_API_URL){
  WORD_API_URL = 'https://a7f465682d.execute-api.ap-southeast-1.amazonaws.com/prod';
}

module.exports = {
  // WIT_TOKEN: WIT_TOKEN,
  FB_PAGE_TOKEN: FB_PAGE_TOKEN,
  FB_VERIFY_TOKEN: FB_VERIFY_TOKEN,
  WORD_API_URL: WORD_API_URL,
  SENTENCE_AI_URL: SENTENCE_AI_URL,
  RESTAURANT_API_URL: RESTAURANT_API_URL
};