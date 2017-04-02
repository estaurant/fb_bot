var http = require('http');

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

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);
            return info;
        } else {
            return {};
        }
    });
}

module.exports = {
  callSentenceAi: callSentenceAi
};
