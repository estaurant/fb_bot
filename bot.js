'use strict';

// Weather Example
// See https://wit.ai/sungkim/weather/stories and https://wit.ai/docs/quickstart
const { Wit, interactive } = require('node-wit');
const FB = require('./facebook.js');
const Config = require('./const.js');
const WordApi = {};
const readline = require('readline');
const API = require('./api.js');

const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    console.log("k="+k);
    console.log("sessions[k]="+sessions[k]);
    console.log("fbid="+fbid);
    if (!sessions[k]) {
      delete sessions[k];
    }
    if (sessions[k] && sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });

  var FIFTEEN_MIN = 15*60*1000;
  if (sessionId) {
    if (((new Date) - Date.parse(sessionId)) < FIFTEEN_MIN) {
      delete sessions[sessionId];
      sessionId = undefined;
    }
  }

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

const estaurantMessage = (msg, context) => {
  var sessionId = findOrCreateSession(context._fbid_);
  var session = sessions[sessionId];
  var conversation = false;
  if (msg.includes("เมนู") || msg.toLowerCase().includes("menu")) {
    console.log("findMenu");
    var menu = findMenu(context._fbid_);
    if (menu) {
      console.log("found menu");
      conversation = true;
      fbTextSend(menu, context);
    } else {
      console.log("not found menu");
    }
    
  } else if (msg.includes("ไม่เอา") || msg.toLowerCase().includes("เปลี่ยน")) {
    updateLastResultRejectList(context._fbid_);
    conversation = true;
  } else if (msg==='clear') {
    delete session['lastQuery'];
    console.log('clear data in session');
    conversation = true;
  }

  if (!conversation) {
    API.callSentenceAi(msg).then(function(body){
    
      console.log("ai response body="+body);
      var aiResult = JSON.parse(body);
      var aiIntent = aiResult.intent?aiResult.intent:"";
      var aiKeyword = aiResult.keyword?aiResult.keyword:"";

      console.log("aiIntent="+aiIntent);
      console.log("aiKeyword="+aiKeyword);

      if (aiIntent.toLowerCase()==='eat' || aiIntent.toLowerCase()==='recommend') {
        fbTextSend("รอสักครู่นะครับ Kinda กำลังค้นหาร้านอาหาร", context);
        var query = getRestaurantApiQuery(context._fbid_, aiIntent, aiKeyword);
        updateLastQuery(context._fbid_, query);
        API.callRestaurantApi(query).then(
          function(body){
            var restaurants = body;
            restaurants = filterReject(context._fbid_, restaurants);
            var message = "ขอโทษครับ Kinda หาร้านที่คุณอยากทานไม่เจอ";
            var restaurant = restaurants[0];
            if (restaurant) {
              updateLastResult(context._fbid_, restaurant);
              fbSend(buildGenericTemplate(body), context);
            } else {
              fbTextSend(message, context);
            }
            
          }, function (error) {
            console.log("handle error while calling restaurant api "+error);
            fbTextSend("api error", context);
          }
        )
        ;
        // .catch(function (err) {
        //     console.log("error while call restaurant api "+err);
        // });
      } else if (aiIntent.toLowerCase()==='eat_negative') {

      } else if (aiIntent.toLowerCase()==='greeting') {
        onGreeting(context);
      } else {
        fbTextSend("Kinda ไม่เข้าใจครับ อยากกินอะไรช่วยบอก Kinda หน่อยนะครับ", context);
      }

    })
    ;
    // .catch(function (err) {
    //     console.log("error while call Sentence Ai "+err);
    // });
  }
  

  return Promise.resolve(true);
}

const findMenu = (fbid) => {
  var sessionId = findOrCreateSession(fbid);
  var session = sessions[sessionId];
  if (session.lastResult) {
    return "Kinda ขอแนะนำเมนู "+lastResult._source.menus.join(",") + "นะครับ";
  } else {
    return;
  }
}

const onGreeting = (context) => {
  return fbTextSend("สวัสดีครับ ยินดีต้อนรับเข้าสู่บริการค้นหาร้านอาหาร estaurant ให้ Kinda ช่วยหาร้านอาหารได้เลยครับ", context);
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



const updateLastQuery = (fbid, query) => {
  var sessionId = findOrCreateSession(fbid);
  var session = sessions[sessionId];
  session.lastQuery = query;
  sessions[sessionId] = session;
}

const updateLastResult = (fbid, result) => {
  var sessionId = findOrCreateSession(fbid);
  var session = sessions[sessionId];
  session.lastResult = result;
  sessions[sessionId] = session;
}

const updateLastResultRejectList = (fbid) => {
  var sessionId = findOrCreateSession(fbid);
  var session = sessions[sessionId];
  if (session.lastResult) {
    
    if (session.rejectList) {
      session.rejectList.push(session.lastResult);
    } else {
      session.rejectList = [session.lastResult];
    }
    sessions[sessionId] = session;
  }
}

const buildItem = (item) => {
  var restaurant = item;
  var geo = restaurant._source.geo;
  var url = "https://www.wongnai.com/"+restaurant._source.original_id;
  var locationUrl = "http://maps.google.com/maps?q=loc:"+geo.location[1]+","+geo.location[0];
  var imageUrl = restaurant._source.image;

  return {
      "title":restaurant._source.name,
      "image_url":imageUrl,
      "subtitle":restaurant._source.address.addressLocality,
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
    };
}

const buildListSTemplate = (result) => {
  var list = [];
  for (var i=0; i<result.length; ++i) {
    list.push(buildItem(result[i]));
  }
  return {
    "attachment": {
        "type": "template",
        "payload": {
            "template_type": "list",
            "elements": list
        }
    }
  }
}

const filterReject = (fbid, result) => {
  var sessionId = findOrCreateSession(fbid);
  var session = sessions[sessionId];
  if (session.rejectList) {
    var index = [];
    for (var i=0; i<session.rejectList.length; ++i) {
      var rejectItem = session.rejectList[i];
        for (var j=0; j<result.length; ++j) {
            if (rejectItem._source.original_id === result[j]._source.original_id) {
              index.push(j);
            }
        }
    }

    for (var i=0; i<index.length; ++i) {
      result.splice(index[i], 1);
    }
    return result;
  } else {
    return result;
  }

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

const getRestaurantApiQuery= (fbid, intent, keyword)=> {
  console.log("getRestaurantApiQuery");
  var sessionId = findOrCreateSession(fbid);
  var session = sessions[sessionId];
  var distance;
  var price;

  if (intent.toLowerCase === 'recommend') {
    keyword = '';
    if (keyword.toLowerCase === 'cheap')  {
      price = 100;
    } else if (keyword.toLowerCase === 'expensive')  {
      price = 1000;
    } else if (keyword.toLowerCase === 'near') {
      distance = '300m';
    } else if (keyword.toLowerCase === 'far') {
      distance = '5km';
    }
  }

  if (session.lastQuery) {
    console.log("session.lastQuery if");
  } else {
    console.log("session.lastQuery else");
  }

  if (keyword === '' && session.lastQuery) {
    keyword = session.lastQuery.keyword
    console.log("overide keyword");
  } 

  if (!distance && session.lastQuery) {
    distance = session.lastQuery.distance
    console.log("overide distance");
  } 

  if (!price && session.lastQuery) {
    price = session.lastQuery.price
    console.log("overide price");
  }

  var query = { 
      keyword: keyword ,
      distance: distance?distance:'2km',
      price: price?price:500,
      random: false
  };

    console.log("return from getRestaurantApiQuery with distance="+query.distance);
    console.log("return from getRestaurantApiQuery with price="+query.price);
    console.log("return from getRestaurantApiQuery  with keyword="+query.keyword);
    console.log("return from getRestaurantApiQuery  with random="+query.random);

  return query;
}
