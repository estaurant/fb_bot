
const request = require('request-promise');
const Config = require('./const.js');

const callRestaurantApi = (mode, intent, keyword) => {

    var queryString = { 
        keyword: keyword,
        distance: '1km',
        price: 200,
        random: true
    };

    var options = {
        uri: Config.RESTAURANT_API_URL,
        qs: queryString,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: true
    };

    return request(options);
}

const callSentenceAi = (sentence) => {
    var options = {
        uri: Config.SENTENCE_AI_URL,
        method: 'POST',
        headers: {
            "content-type": "application/json",
        },
        json: {
            "sentence": sentence
        }
    };

    var callback = function (error, response, body) {
        var intentAndWord = {};
        if (!error && response.statusCode == 200) {
            intentAndWord = {
                "intent" : response.body.intent,
                "word"   : response.body.word
            };
        } 
        return intentAndWord;
    }
    
    return request(options, callback);

    var onMessage = function () {
        //TODO call sentence_ai
      var sentence = "xxx";
      var options = {
          uri: Config.SENTENCE_AI_URL,
          method: 'POST',
          headers: {
              "content-type": "application/json",
          },
          json: {
              "sentence": sentence
          }
      };
      
      request(options, function (error, response, body) {
        var intentAndWord = {};
        if (!error && response.statusCode == 200) {
            intentAndWord = {
                "intent" : response.body.intent,
                "word"   : response.body.word
            };
        } 

        var queryString = { 
          keyword: response.body.word,
          distance: '1km',
          price: 100
        };

        request({url:Config.RESTAURANT_API_URL, qs:queryString}, function(err, response, body) {
            if(err) { console.log(err); return; }
            var restaurants = JSON.parse(response.body);
            var result = "ไก่แป้ง";
            if (restaurants[0]) {
              result = restaurants[0]._source.name;
            }
            FB.fbMessage(
              sender,
              {text:'ตะมุตะมิ ลองดูไหมเธอ ร้าน' + result}
            );
            res.sendStatus(200);
          }
        );

        
      });
    }
}

module.exports = {
  callRestaurantApi: callRestaurantApi
};
