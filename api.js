
const request = require('request-promise');
const Config = require('./const.js');

const callSentenceAi = (sentence) => {
    console.log("Config.SENTENCE_AI_URL="+Config.SENTENCE_AI_URL);

    var url = Config.SENTENCE_AI_URL+"/intents/"+encodeURIComponent(sentence);
    
    console.log("send="+url);
    
    return request.get(url);
}

const callRestaurantApi = (keyword) => {
    var intent = findFoodSubIntent(keyword);
    console.log("intent="+intent);
    var queryString = { 
        keyword: keyword,
        distance: '500m',
        price: 300,
        random: false
    };

    if (intent === 'near') {
        queryString.distance = '100m';
    } else if (intent === 'cheap') {
        queryString.price = 100;
    } else if (intent === 'expensive') {
        queryString.price = 1000;
    }
    
    if (intent === '') {
        queryString.random = true;
    } else {
        //TODO can't extract keyword
        queryString.keyword = '';
    }

    var options = {
        uri: Config.RESTAURANT_API_URL,
        qs: queryString,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: true
    };

    console.log("call restaurant with distance="+queryString.distance);
    console.log("call restaurant with price="+queryString.price);
    console.log("call restaurant with keyword="+queryString.keyword);
    console.log("call restaurant with random="+queryString.random);

    return request(options);
}

const findFoodSubIntent = (keyword) => {
    var distanceLessThan100m = ["หิว", "เร็ว", "รีบ"];
    var inverseDistanceLessThan100m = ["ไม่หิว", "ไม่เร็ว", "ไม่รีบ"];

    var isDistanceLessThan100m = isMatchIntent(distanceLessThan100m, inverseDistanceLessThan100m, keyword);

    var priceLessThan100 = ["จน", "ไม่มีเงิน", "ไม่แพง", "กระเป๋าแบน", "ถูก"];
    var inversePriceLessThan100 = ["ไม่จน"];
    var isPriceLessThan100 = isMatchIntent(priceLessThan100, inversePriceLessThan100, keyword);
    
    var priceMoreThan100 = ["รวย", "เงินเดือนออก", "ถูกหวย", "ไฮโซ"]
    var inversePriceMoreThan100 = ["ไม่รวย","ถูกหวยกิน", "ถูกหวยแดก"]

    var isPriceMoreThan100 = isMatchIntent(priceMoreThan100, inversePriceMoreThan100, keyword);

    if (isDistanceLessThan100m) {
        return "near";
    } else if (isPriceLessThan100) {
        return "cheap";
    } else if (isPriceMoreThan100) {
        return "expensive";
    } else {
        return "";
    }
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

// const callSentenceAi = (sentence) => {
//     var options = {
//         uri: Config.SENTENCE_AI_URL,
//         method: 'POST',
//         headers: {
//             "content-type": "application/json",
//         },
//         json: {
//             "sentence": sentence
//         }
//     };

//     var callback = function (error, response, body) {
//         var intentAndWord = {};
//         if (!error && response.statusCode == 200) {
//             intentAndWord = {
//                 "intent" : response.body.intent,
//                 "word"   : response.body.word
//             };
//         } 
//         return intentAndWord;
//     }
    
//     return request(options, callback);

//     var onMessage = function () {
//         //TODO call sentence_ai
//       var sentence = "xxx";
//       var options = {
//           uri: Config.SENTENCE_AI_URL,
//           method: 'POST',
//           headers: {
//               "content-type": "application/json",
//           },
//           json: {
//               "sentence": sentence
//           }
//       };
      
//       request(options, function (error, response, body) {
//         var intentAndWord = {};
//         if (!error && response.statusCode == 200) {
//             intentAndWord = {
//                 "intent" : response.body.intent,
//                 "word"   : response.body.word
//             };
//         } 

//         var queryString = { 
//           keyword: response.body.word,
//           distance: '1km',
//           price: 100
//         };

//         request({url:Config.RESTAURANT_API_URL, qs:queryString}, function(err, response, body) {
//             if(err) { console.log(err); return; }
//             var restaurants = JSON.parse(response.body);
//             var result = "ไก่แป้ง";
//             if (restaurants[0]) {
//               result = restaurants[0]._source.name;
//             }
//             FB.fbMessage(
//               sender,
//               {text:'ตะมุตะมิ ลองดูไหมเธอ ร้าน' + result}
//             );
//             res.sendStatus(200);
//           }
//         );

        
//       });
//     }
// }

module.exports = {
  callRestaurantApi: callRestaurantApi,
  callSentenceAi: callSentenceAi
};
