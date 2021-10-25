#### Twitch chat bot for a guessing game with a web interface for status and admin controls.
You can see it in action in this youtube video: https://youtu.be/noaikj_Qm0Q or even better along with the chat action here: https://www.twitch.tv/videos/1036716034
This was implemented with very specific game rules, the description of which can be found in the above videos.
However it should be easy to modify for your specific guessing game.

#### How to run:
#####This was last tested on node v17.0.1 and npm version 8.1.0.
Assuming you have installed node and npm as well as git:

git clone https://github.com/xtsoler/slamfestBot.git

cd slamfestBot/
cp config.js.sample config.js

######Edit the config.js accordingly
nano config.js
npm i tmi.js --save
npm start

#### The bot should now join the specified twitch chat channel.
The web interface should also work under the urls:
http://localhost:7000/status - This can be an overlay on OBS for the stream to show the status and the still available choices.
http://localhost:7000/admin - A basic console for some shortcuts for the streamer that provides an extra way to control the bot other than the chat commands.
