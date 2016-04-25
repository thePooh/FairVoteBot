var restify = require('restify');
var builder = require('botbuilder');

// Get secrets from server environment
var botConnectorOptions = {
    appId: process.env.BOTFRAMEWORK_APPID,
    appSecret: process.env.BOTFRAMEWORK_APPSECRET
};

// Create bot
var bot = new builder.BotConnectorBot(botConnectorOptions);
bot.add('/', function (session) {
    if (!session.userData.poll) {
        session.beginDialog('/poll');
    } else {
        session.send("There is a poll going on, it seems.");
    }
});

bot.add('/poll', [
    function(session) {
        builder.Prompts.text(session, 'What are you trying to decide?');
    },
    function(session, results) {
        session.userData.poll = {
            topic: results.response,
            options: [],
            votes: {},
        }
        session.send('Okay, starting your "'+results.response+'" poll.')
        session.endDialog();
    }
]);

bot.add('/option', [
    function(session) {
        builder.Prompts.text(session, 'Please enter option');
    },
    function(session, results) {
        var option = results.response;
        session.userData.poll.options.push(option);
        session.userData.poll.votes[option] = 0;
        session.send('Option added: '+option);
        session.endDialog();
    }
]);

bot.add('/vote', [
    function(session) {
        builder.Prompts.choice(session, session.userData.poll.topic, session.userData.poll.options);
    },
    function(session, results) {
        session.userData.poll.votes[results.response.entity]++;
        session.send('Vote counted');
        session.endDialog();
    }
]);

bot.add('/finish', function(session) {
    var poll = session.userData.poll;
    var response = poll.topic+"\n";
    for (var i = 0; i<poll.options.length; i++) {
        response += i+". "+poll.options[i]+" – "+poll.votes[poll.options[i]];
    }
    session.send(response);
    session.userData.poll = null;
});

// Setup Restify Server
var server = restify.createServer();

// Handle Bot Framework messages
server.post('/api/messages', bot.verifyBotFramework(), bot.listen());

// Serve a static web page
server.get(/.*/, restify.serveStatic({
    'directory': '.',
    'default': 'index.html'
}));

server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
