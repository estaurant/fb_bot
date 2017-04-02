
var request = require('request');
const Config = require('./const.js');

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
}

module.exports = {
  callSentenceAi: callSentenceAi
};
