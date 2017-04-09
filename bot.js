'use strict';

// Weather Example
// See https://wit.ai/sungkim/weather/stories and https://wit.ai/docs/quickstart
const { Wit, interactive } = require('node-wit');
const FB = require('./facebook.js');
const Config = require('./const.js');
const WordApi = {};
const readline = require('readline');
const API = require('./api.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const accessToken = '';

const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};

const fbTextSend = (text, context) => {
  return fbSend({ text }, context);
}

const fbSend = (msg, context) => {
  console.log('Try sending msg to facebook.', JSON.stringify(msg));

  const recipientId = context._fbid_;
  if (recipientId) {
    return FB.fbMessage(recipientId, msg);
  }

  return Promise.resolve();
}

const getWit = () => {
  // return new Wit({ accessToken, actions });
};

const buildCard = (title, subtitle) => {
  return {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [{
          "title": title,
          "subtitle": subtitle,
        }]
      }
    }
  }
}

const buildList = (elements) => {
  return {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "list",
        "top_element_style": "compact",
        "elements": elements
      }
    }
  }
}

const buildAudio = (url) => {
  return {
    "attachment": {
      "type": "audio",
      "payload": {
        "url": url
      }
    }
  }
}

const formatDefs = (defs) => {
  return defs.map(d => ` - ${d}`).join('\n');
}

const buildWordList = (word) => {
  let fbList = [];
  let defMap = word.definitions;

  for (var key in defMap) {
    if (defMap.hasOwnProperty(key)) {
      let defs = defMap[key];

      fbList.push({title: key, subtitle: formatDefs(defs)});
    }
  }

  return buildList(fbList);
}

const findIntent = (msg) => {
  var greetingList = ["สวัสดี", "hello", "hi", "หวัดดี" ];
  var intent;
  for (var i = 0; i < greetingList.length; i++) { 
    if (msg.toLowerCase().startsWith(greetingList[i])) {
      return "greeting";
    }
  }

  if (msg.includes("อยากกิน") && !msg.includes("ไม่อยากกิน")) {
    return "food";
  }

  return "unknown";
}

const estaurantMessage = (msg, context) => {
  
  API.callSentenceAi(msg).then(function(body){
    fbTextSend("รอสักครู่นะครับ Kinda กำลังค้นหาร้านอาหาร", context);

    var aiResult = JSON.parse(body);
    var aiIntent = aiResult[0];
    var aiKeyword = aiResult[1];

    console.log("aiIntent="+aiIntent);
    console.log("aiKeyword="+aiKeyword);

    if (aiIntent.toLowerCase()==='eat') {

    } else if (aiIntent.toLowerCase()==='eat_negative') {

    } else if (aiIntent.toLowerCase()==='greeting') {
      
    }

    var intent = findIntent(msg);
    var keyword;
    console.log("ai result="+aiResult);
  }).catch(function (err) {
      console.log("error while call Sentence Ai "+err);
  });

  if (intent === 'food') {
    
    var matchStr = msg.match(/อยากกิน(.*)/);
    keyword = matchStr[1];

    API.callRestaurantApi(keyword).then(
      function(body){
        var restaurants = body;
        var message = "หาไม่เจออ่ะ";
        var restaurant = restaurants[0];
        if (restaurant) {


          // message = "ลอง "+restaurant._source.name+" ไหมเธอ";
          // var geo = restaurant._source.geo;
          // if (geo && geo.location) {
          //   message += "ให้ google พาไปเลย http://maps.google.com/maps?q=loc:"+geo.location[1]+","+geo.location[0];
          // }
          fbSend(buildGenericTemplate(body), context);
        } else {
          fbTextSend(message, context);
        }
        
      }, function (error) {
        console.log("handle error while calling restaurant api "+error);
        fbTextSend("api error", context);
      }
    ).catch(function (err) {
        console.log("error while call restaurant api "+err);
    });
  } else if (intent === 'greeting') {
    onGreeting(context);
  } else if (intent === 'unknown') {
    fbTextSend("... งง", context);
    fbTextSend("เราช่วยหาร้านอาหารให้เธอได้นะ พิมพ์อยากกิน... ", context);
  }

  return Promise.resolve(true);
}

const onGreeting = (context) => {
  return fbTextSend("สวัสดีค่ะ ยินดีต้อนรับเข้าสู่บริการค้นหาร้านอาหาร estaurant พิมพ์ อยากกิน... ให้เราช่วยหาร้านอาหารได้เลยจ้า", context);
}

const onMessage = (msg, context) => {
  return estaurantMessage(msg, context);
}

module.exports = {
  getWit: getWit,
  onMessage: onMessage
}

const rlInteractive = (client) => {
  rl.setPrompt('> ');
  const prompt = () => {
    rl.prompt();
    rl.write([], { ctrl: true, name: 'e' });
  };
  prompt();
  rl.on('line', (line) => {
    line = line.trim();
    if (!line) {
      return prompt();
    }
    console.log("Executing sentence: ", line);
    return witMessage(client, line, {})
    .then(() => {
      return prompt();
    });
  });
}

// bot testing mode
// http://stackoverflow.com/questions/6398196
if (require.main === module) {
  console.log("Bot testing mode.");
  const client = getWit();
  // interactive(client);
  rlInteractive(client);
}

const buildGenericTemplate =(result) => {
  var restaurant = result[0];
  var geo = restaurant._source.geo;
  var url = "https://www.wongnai.com/"+restaurant._source.original_id;
  var locationUrl = "http://maps.google.com/maps?q=loc:"+geo.location[1]+","+geo.location[0];
  var imageUrl = restaurant._source.image;
  console.log("url="+url);
  console.log("imageUrl="+imageUrl);
  return {
    "attachment":{
      "type":"template",
      "payload":{
        "template_type":"generic",
        "elements":[
           {
            "title":"Kinda พบร้านที่คุณอยากทานแล้วครับ",
            "image_url":imageUrl,
            "subtitle":restaurant._source.name,
            "default_action": {
              "type": "web_url",
              "url": url,
            },
            "buttons":[
              {
                "type":"web_url",
                "url":url,
                "title":"Wongnai"
              },{
                "type":"web_url",
                "url":locationUrl,
                "title":"Map"
              }              
            ]      
          }
        ]
      }
    }
  };
}