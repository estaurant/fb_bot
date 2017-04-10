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
    conversation = true;
    var menu = findMenu(context._fbid_);
    if (menu) {
      console.log("found menu");
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
      var localIntent = findFoodSubIntent(msg);

      console.log("aiIntent="+aiIntent);
      console.log("aiKeyword="+aiKeyword);

      console.log("localIntent="+localIntent.intent);
      console.log("localKeyword="+localIntent.keyword);

      if (aiIntent.toLowerCase()==='eat' || aiIntent.toLowerCase()==='recommend' || localIntent.intent.toLowerCase()==='recommend') {
        fbTextSend("รอสักครู่นะครับ คินดะ กำลังค้นหาร้านอาหาร", context);
        var query;
        if (aiIntent.toLowerCase() === 'default') {
          console.log("call getRestaurantApiQuery use localIntent");
          query = getRestaurantApiQuery(context._fbid_, localIntent.intent, localIntent.keyword);
        } else {
          console.log("call getRestaurantApiQuery use AI");
          query = getRestaurantApiQuery(context._fbid_, aiIntent, aiKeyword);
        }
        
        updateLastQuery(context._fbid_, query);
        API.callRestaurantApi(query).then(
          function(body){
            var restaurants = body;
            restaurants = filterReject(context._fbid_, restaurants);
            var message = "ขอโทษครับ คินดะ หาร้านที่คุณอยากทานไม่เจอ";
            var restaurant = restaurants[0];
            if (restaurant) {
              if (query.random) {
                fbTextSend("คินดะงง แต่ลองร้านนี้ดูไหม", context);
              } else {
                fbTextSend("คินดะเจอร้านแล้วครับ", context);
              }
              fbSend(buildGenericTemplate(body), context);
              updateLastResult(context._fbid_, restaurant);
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
        fbTextSend("คินดะ ไม่เข้าใจครับ อยากกินอะไรช่วยบอก คินดะ หน่อยนะครับ", context);
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
  console.log("findMenu sessionId="+sessionId);
  var session = sessions[sessionId];
  console.log("findMenu session="+session);
  if (session.lastResult) {
    console.log("found lastResult");
    return "คินดะ ขอแนะนำเมนู "+session.lastResult._source.menus.join(",") + "นะครับ";
  } else {
    console.log("not found lastResult");
    return;
  }
}

const onGreeting = (context) => {
  return fbTextSend("สวัสดีครับ ยินดีต้อนรับเข้าสู่บริการค้นหาร้านอาหาร estaurant ให้ คินดะ ช่วยหาร้านอาหารได้เลยครับ", context);
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
  console.log("update last result");
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

const buildItemList = (item) => {
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
      }
  };
}

const buildListTemplate = (result) => {
  var list = [];
  for (var i=0; i<result.length || i<2; ++i) {
    list.push(buildItemList(result[i]));
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
            "title":restaurant._source.name,
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
                "title":"Link"
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
  console.log("getRestaurantApiQuery intent="+intent+", keyword="+keyword);
  var sessionId = findOrCreateSession(fbid);
  var session = sessions[sessionId];
  var distance;
  var price;
  var random = false;

  if (intent.toLowerCase() === 'recommend') {
    
    if (keyword.toLowerCase() === 'cheap')  {
      console.log("set price = 100");
      price = 100;
    } else if (keyword.toLowerCase() === 'expensive')  {
      console.log("set price = 1000");
      price = 1000;
    } else if (keyword.toLowerCase() === 'near') {
      distance = '300m';
    } else if (keyword.toLowerCase() === 'far') {
      distance = '5km';
    }
    keyword = '';
  }

  if (keyword === '' && session.lastQuery) {
    keyword = session.lastQuery.keyword
  } 

  if (!distance && session.lastQuery) {
    distance = session.lastQuery.distance
  } 
  if (!price && session.lastQuery) {
    price = session.lastQuery.price
  }

  if (keyword === '') {
    random = true;
  }

  var query = { 
      keyword: keyword ,
      distance: distance?distance:'2km',
      price: price?price:500,
      random: random
  };

    console.log("return from getRestaurantApiQuery with distance="+query.distance);
    console.log("return from getRestaurantApiQuery with price="+query.price);
    console.log("return from getRestaurantApiQuery  with keyword="+query.keyword);
    console.log("return from getRestaurantApiQuery  with random="+query.random);

  return query;
}

const findFoodSubIntent = (msg) => {
    
    var intent = "default";
    var keyword = "default";

    var distanceLessThan100m = ["หิว", "เร็ว", "รีบ"];
    var inverseDistanceLessThan100m = ["ไม่หิว", "ไม่เร็ว", "ไม่รีบ"];

    var isDistanceLessThan100m = isMatchIntent(distanceLessThan100m, inverseDistanceLessThan100m, msg);

    var priceLessThan100 = ["จน", "ไม่มีเงิน", "ไม่แพง", "กระเป๋าแบน", "ถูก", "แพงไป"];
    var inversePriceLessThan100 = ["ไม่จน"];
    var isPriceLessThan100 = isMatchIntent(priceLessThan100, inversePriceLessThan100, msg);
    
    var priceMoreThan100 = ["รวย", "เงินเดือนออก", "ถูกหวย", "ไฮโซ", "หรู", "ถูกไป", "แพง"]
    var inversePriceMoreThan100 = ["ไม่รวย","ถูกหวยกิน", "ถูกหวยแดก", "ไม่แพง"]

    var isPriceMoreThan100 = isMatchIntent(priceMoreThan100, inversePriceMoreThan100, msg);

    if (isDistanceLessThan100m) {
        intent = "recommend"
        keyword = "near"
    } else if (isPriceLessThan100) {
        intent = "recommend"
        keyword = "cheap";
    } else if (isPriceMoreThan100) {
        intent = "recommend"
        keyword = "expensive";
    }
    console.log("local findIntent="+intent+", keyword="+keyword);
    return {"intent":intent,"keyword":keyword}
}

const isMatchIntent = (intentList, inverseIntentList, keyword) => {
    var matchIntent = false;
    var matchInverseIntent = false;

    for (var i = 0; i < intentList.length; i++) { 
        if (keyword.includes(intentList[i])) {
            matchIntent = true;
        }
    }

    for (var i = 0; i < matchInverseIntent.length; i++) { 
        if (keyword.includes(intentList[i])) {
            matchInverseIntent = true;
        }
    }
    
    return matchIntent && !matchInverseIntent
}
