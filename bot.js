'use strict';

// Weather Example
// See https://wit.ai/sungkim/weather/stories and https://wit.ai/docs/quickstart
const { Wit, interactive } = require('node-wit');
const FB = require('./facebook.js');
const Config = require('./const.js');
const WordApi = {};
const readline = require('readline');

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

// Bot actions
const actions = {
  send(request, response) {
    const { sessionId, context, entities } = request;
    const { text, quickreplies } = response;

    console.log('sending...', JSON.stringify(response));

    fbTextSend(text, context);
  },
  getForecast({ context, entities }) {
    var location = firstEntityValue(entities, 'location');
    if (location) {
      context.forecast = 'sunny in ' + location; // we should call a weather API here
      delete context.missingLocation;
    } else {
      context.missingLocation = true;
      delete context.forecast;
    }
    return context;
  },
  getMeaning({ context, entities }) {
    return new Promise((resolve, reject) => {
      var word = firstEntityValue(entities, 'word');

      return WordApi.getWords(word, function (error, words) {
        console.log("Get words is done.", words);
        if (words && words.length) {
          context.meaning = word + ' means ' + words[0].definitions[words[0].groups[0]][0];
          delete context.missingWord;
        } else {
          context.missingWord = true;
          delete context.meaning;
        }
        return resolve(context);
      });
    });

  },

};


const getWit = () => {
  // return new Wit({ accessToken, actions });
};

const testWord = {
  groups: ['noun', 'verb'],
  definitions: {
    noun: [
      'line1',
      'line2'
    ],
    verb: [
      'vline1',
      'vline2',
      'vline3'
    ]
  }
}

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

const onWitMessage = (intent, entities, context) => {
  let entitiesStr = JSON.stringify(entities);

  console.log(`Found intent ${intent} and entities ${entitiesStr}`);

  const { word } = entities;

  if (!word) {
    return fbTextSend("Which word do you mean exactly?", context);
  }

  return WordApi.getWords(word)
    .then(words => {
      if (words && words.length) {
        let w = words[0];

        console.log("Process word: ", w.vocab);

        switch (intent) {
          case 'word_meaning':
            return onMeaning(w, context);
          // let w = testWord;
          // let texts = wordFormat(w);

          // texts.forEach((text) => {
          //   fbTextSend(text, context);
          // });
          // break;
          case 'word_pronounce':
            return onPronounce(w, context);
          // let msg = buildAudio("http://dictionary.cambridge.org/media/english/us_pron/v/vul/vulne/vulnerable.mp3");

          // fbSend(msg, context);
          // break;
        }

        return Promise.resolve();
      }

    });

}

const witMessage = (client, msg, context) => {
  return client.message(msg, { context })
    .then((data) => {
      const { entities } = data;
      const { intent } = entities;

      let intentValue = intent[0].value;
      let word = firstEntityValue(entities, 'word');

      return onWitMessage(intentValue, { word }, context);
    })
    .catch(console.error);
}

const wordFormat = (word) => {
  let texts = [];

  for (var g = 0; g < word.groups.length; g++) {
    let text = '';

    let group = word.groups[g];
    let definitions = word.definitions[group];

    text += group + '\n';

    for (var d = 0; d < definitions.length; d++) {
      let def = definitions[d];

      text += '  - ' + def + '\n';
    }

    texts.push(text);
  }

  return texts;
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

const onMeaning = (word, context) => {
  return fbTextSend(`Here is the meaning of word "${word.vocab}"`, context)
  .then(() => {
    let fbList = buildWordList(word);
    return fbSend(fbList, context);
    // let texts = wordFormat(word);

    // var promises = [];

    // texts.forEach((text) => {
    //   promises.push(fbTextSend(text, context));
    // });

    // return Promise.all(promises);
  });

  
}

const pronounce = (word, context, country) => {
  return fbTextSend(`Here is how to pronounce "${word.vocab}" in ${country}`, context)
  .then(() => {
    let msg = buildAudio(word.pronunciationAudios[country]);

    return fbSend(msg, context);
  });
  
}

const onPronounce = (word, context) => {
  if (word.pronunciationAudios) {
    return pronounce(word, context, "us")
    .then(() => {
      return pronounce(word, context, "uk");
    });
  }

  return fbTextSend("Cannot find pronounciation for this word", context);
}

const onMessage = (client, msg, context) => {
  return witMessage(client, msg, context);
}

module.exports = {
  getWit: getWit,
  onMessage: onMessage
}

const rlInteractive = (client) => {
  rl.setPrompt('> ');
  const prompt = () => {
    rl.prompt();
    rl.write(null, { ctrl: true, name: 'e' });
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