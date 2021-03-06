const express = require("express");
var expressApp = express();
var bot = require("./client");
var io = require("socket.io")(8080);
require("dotenv").config();

const { app, BrowserWindow } = require("electron");

const atMention = /<@!([0-9]{5,})>/g;

bot.login(process.env.TOKEN);

expressApp.get("/", function(req, res) {
  res.sendFile(__dirname + "/public/interface.html");
});

expressApp.get("/css", function(req, res) {
  res.sendFile(__dirname + "/public/main.css");
});

expressApp.get("/js", function(req, res) {
  res.sendFile(__dirname + "/public/main.js");
});

io.on("connection", function(socket) {
  var guilds = bot.init();
  socket.emit("guilds", guilds);
  socket.on("serverChannels", (serverName, serverNumber) => {
    var channels = bot.fetchChannels(serverName);
    socket.emit("sendChannels", channels, serverNumber);
  });

  socket.on("fetchChannelMessages", async function(serverNum, channelName) {
    var fetched = bot.fetchMsgs(guilds[serverNum], channelName);

    if ((await fetched) === "nottext") {
    } else {
      var displayed = [];

      var messageIDs = [];

      var msgCount = 0;

      fetched.then(function(messages) {
        messages.forEach(function(message) {
          msgCount++;

          var parsed;

          if (message.content.match(atMention)) {
            parsed = mentionReplacer(message.content);
          } else {
            parsed = message.content;
          }

          displayed.push(`${message.author.tag}: Said : ${parsed}`);

          messageIDs.push(message.id);

          if (msgCount === messages.array().length) {
            displayed.reverse();
            messageIDs.reverse();
            socket.emit("displayMessages", displayed, messageIDs);
          }
        });
      });
    }
  });

  socket.on("playSound", function(soundFile) {
    bot.playSound(soundFile);
  });

  socket.on("changeStatus", function(status, presence) {
    bot.statusUpdate(status, presence);
  });

  socket.on("sendChannelMessage", function(serverNum, channelName, message) {
    bot.sendChannelMessage(guilds[serverNum], channelName, message);
  });
});

expressApp.listen("3000", function() {});

if (process.env.ELECTRON != "disabled") {
  app.on("ready", function() {
    setTimeout(function() {
      let win = new BrowserWindow({ width: 800, height: 600 });
      win.on("closed", () => {
        win = null;
      });

      win.loadURL("http://localhost:3000");
    }, 3000);
  });
}

function mentionReplacer(str = "") {
  let matches = str.match(atMention);
  matches.forEach(match => {
    str = str.replace(match, "@" + bot.userTagFromID(match.replace(/\D/g, "")));
  });
  return str;
}
