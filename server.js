const tmi = require('tmi.js');
var fs = require('fs');

var { twitch_username, twitch_token, twitch_channels, admin_username, admin_password } = require('./config');
//console.log(admin_password);
var round_ongoing = false;
var block_guesses = false;
var current_item_type = "";
var admin_message = "";

var corruption_detection_output = "";
var detected_slam_code = "";
const express = require('express');
const { config } = require('process');
const app = express();
var bodyparser = require('body-parser');
var urlencodedparser = bodyparser.urlencoded({extended:false})


if (typeof twitch_username === 'undefined'
	|| typeof twitch_token === 'undefined'
	|| typeof twitch_channels === 'undefined'
	|| typeof admin_username === 'undefined'
	|| typeof admin_password === 'undefined'
) {
	console.log("config.js was not found/loaded!!! Please edit is a config.js.sample and rename it to config.js")
}

// Define configuration options
const opts = {
	identity: {
		username: twitch_username,
		password: twitch_token
	},
	channels: twitch_channels
};

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on("roomstate", (channel, state) => {
	// Do your stuff.
	client.say(channel, "Slamfest_Bot joined the channel.");
});

// Connect to Twitch:
client.connect();

var currentRoundGuesses;

const timer = ms => new Promise(res => setTimeout(res, ms));

// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
	if (self) { return; } // Ignore messages from the bot

	// Remove whitespace from chat message and change to lower case
	const commandName = msg.trim().toLowerCase();

	if (commandName.charAt(0) === "!") {
		const command = commandName.split(" ")[0];
		const displayName = context['display-name'];
		// Handle command
		switch (command) {
			case "!points":
				//supported_commands.set(supported_commands.size, command);
				if (winners.size > 0) {
					var the_points = 0;
					var total_wins = 0;
					var the_user = displayName;
					if (commandName.split(" ").length > 1) {
						the_user = commandName.split(" ")[1];
					}
					wins_text = "";
					for (let [key, value] of winners) {
						if (value.winner.toLowerCase() == the_user) {
							the_points += value.points;
							total_wins++;
							if (wins_text == "") {
								wins_text = ". So far you won on " + value.winning_choice_text;
							} else {
								wins_text += ", " + value.winning_choice_text;
							}
						}
					}
					if (the_points > 0) {
						var points_text = the_user + " you have " + total_wins + " wins and " + the_points + " points";
						client.say(target, points_text + wins_text + ".");
					} else {
						client.say(target, the_user + " was not found in the recorded winners.");
					}
				} else {
					client.say(target, "No winners recorded yet.");
				}
				break;
			case "!standings":
				//supported_commands.set(supported_commands.size, command);
				var stadings_text = "No winners recorded yet.";
				if (winners.size > 0) {
					stadings_text = "Current standings are:";
					for (let [key, value] of get_sorted_leaderboard()) {
						stadings_text += " " + key + "=" + value;
					}
				}
				console.log(stadings_text);
				client.say(target, stadings_text);
				break;
			case "!end_round":
				//supported_commands.set(supported_commands.size, command);
				if (!has_access(context, target)) {
					client.say(target, displayName + " you can't do that.");
					break;
				}
				console.log("Forced round end.");
				client.say(target, "Forced round end.");
				finishRound();
				break;
			case "!go_away":
				//supported_commands.set(supported_commands.size, command);
				if (!has_access(context, target)) {
					client.say(target, displayName + " you can't do that.");
					break;
				}
				//console.log("Slamfest_Bot is now leaving.");
				//client.say(target, "Slamfest_Bot is now leaving.");
				//client.disconnect();
				leaveChannel(target);
				break;
			case "!slam_log":
				//supported_commands.set(supported_commands.size, command);
				var slamlog_text = "No winners recorded yet.";
				if (winners.size > 0) {
					slamlog_text = "";
					for (let [key, value] of winners) {
						slamlog_text += " (slam#:" + key + " item_type:" + value.item_type + " winning_choice:" + value.winning_choice + " winning_choice_text:" + value.winning_choice_text + " bonus:" + value.bonus + " winner: " + value.winner + " points:" + value.points + ")";
					}
				}
				console.log(slamlog_text);
				client.say(target, slamlog_text);
				break;
			case "!reset_standings":
				//supported_commands.set(supported_commands.size, command);
				if (!has_access(context, target)) {
					client.say(target, displayName + " you can't do that.");
					break;
				}
				var stadings_text = "No winners recorded yet.";
				if (winners.size > 0) {
					reset_standings();
					stadings_text = "Standings have been cleared.";
				}
				console.log(stadings_text);
				client.say(target, stadings_text);
				break;
			case "!add_winner":
				//supported_commands.set(supported_commands.size, command);
				if (!has_access(context, target)) {
					client.say(target, displayName + " you can't do that.");
					break;
				}
				if (commandName.split(" ").length < 5) {
					client.say(target, displayName + " that didn't work. Here's an example: !add_winner [item_type] [winner_name] [winning_choice] [bonus_choice]");
				} else {
					if (options.has(commandName.split(" ")[1])) {
						if (options.get(commandName.split(" ")[1]).has(commandName.split(" ")[3])) {
							var the_points = point_setup.get(get_winning_choice_type(commandName.split(" ")[3]));
							if (commandName.split(" ")[3] == commandName.split(" ")[4]) {
								the_points = the_points * 2;
							}
							winners.set(winners.size + 1, { item_type: commandName.split(" ")[1], winner: commandName.split(" ")[2], winning_choice: commandName.split(" ")[3], winning_choice_text: options.get(commandName.split(" ")[1]).get(commandName.split(" ")[3]), bonus: commandName.split(" ")[4], points: the_points });
							client.say(target, "added winner, please check your work with !slamlog and !standings");
							save_to_disk();
						} else {
							client.say(target, "That is not a valid option for item type " + commandName.split(" ")[1] + ".");
						}
					} else {
						client.say(target, "That is not a valid item type.");
					}
				}
				break;
			case "!delete_last_winner":
				//supported_commands.set(supported_commands.size, command);
				if (!has_access(context, target)) {
					client.say(target, displayName + " you can't do that.");
					break;
				}
				if (winners.size > 0) {
					client.say(target, "deleting last winner " + winners.get(winners.size).winner);
					winners.delete(winners.size);
					save_to_disk();
				} else {
					client.say(target, "No winners recorded yet.");
				}
				break;
			case "!finish":
				//supported_commands.set(supported_commands.size, command);
				if (!has_access(context, target)) {
					client.say(target, displayName + " you can't do that.");
					break;
				}
				finish_round_command(commandName, target);
				break;
			case "!bonus":
				//supported_commands.set(supported_commands.size, command);
				if (current_item_type === '') {
					client.say(target, "Item type is not yet specified. Please use !prep command.");
				} else {
					const choice = commandName.split(" ")[1];
					//console.log(choice);
					if (choice === undefined) {
						if (current_bonus === "") {
							client.say(target, "Bonus not yet specified. Please use !bonus to manually set it.");
						} else {
							client.say(target, "Current bonus option is " + current_bonus + " " + options.get(current_item_type).get(current_bonus) + ".");
						}
					} else {
						if (!has_access(context, target)) {
							client.say(target, displayName + " you can't do that.");
							break;
						}
						if (round_ongoing) {
							client.say(target, "Round is already ongoing, you can't change the bonus now.");
						} else {
							if (options.get(current_item_type).has(choice)) {
								current_bonus = choice;
								client.say(target, "Bonus is choice " + current_bonus + ", " + options.get(current_item_type).get(current_bonus) + ". " + displayName + " please use !start for the round to begin.");
							} else {
								client.say(target, "That is not a valid option.");
							}
						}
					}
				}
				break;
			case "!prep":
				//console.log(commandName);
				//supported_commands.set(supported_commands.size, command);
				if (!has_access(context, target)) {
					client.say(target, displayName + " you can't do that.");
					break;
				}
				prep(commandName, target);
				break;
			case "!show":
				//supported_commands.set(supported_commands.size, command);
				if (round_ongoing && !has_access(context, target)) {
					client.say(target, "A round is ongoing. Please use command !available to see currently available options.");
				} else {
					const item_type = commandName.split(" ")[1];
					if (commandName.split(" ").length < 2 && round_ongoing) {
						available_options(target, current_item_type, false, true);
					} else if (options.has(item_type)) {
						available_options(target, item_type, false, true);
					} else {
						var supported = "";
						for (let [key, value] of options) {
							if (supported === '') {
								supported = key;
							} else {
								supported = supported + ", " + key;
							}
						}
						client.say(target, "Invalid option. Currently supported options: " + supported);
					}
				}
				break;
			case "!start":
				//supported_commands.set(supported_commands.size, command);
				if (!has_access(context, target)) {
					client.say(target, displayName + " you can't do that.");
					break;
				}
				start_round(target);
				break;
			case "!g":
			case "!guess":
				//supported_commands.set(supported_commands.size, "!guess or just !g");
				if (round_ongoing) {
					//if (block_guesses) {
					//	client.say(target, displayName + " sorry, no more guesses are accepted.");
					//} else {
						const choice = commandName.split(" ")[1];
						if (options.get(current_item_type).has(choice)) {
							// check if this user has won with this option before
							if (winners.size > 0) {
								var won_on_that_choice = false;
								for (let [key, value] of winners) {
									if (value.winner == displayName && value.winning_choice_text == options.get(current_item_type).get(choice)) {
										client.say(target, displayName + " you have already won with the " + value.winning_choice_text + " choice. Please guess something else.");
										won_on_that_choice = true;
									}
								}
								if (won_on_that_choice) {
									break;
								}
							}

							if (guesses.has(choice)) {
								if (guesses.get(choice) == displayName) {
									client.say(target, displayName + " you already have that choice.");
								} else {
									client.say(target, displayName + " " + choice + " is taken by " + guesses.get(choice));
								}
							} else {
								if (Array.from(guesses.values()).includes(displayName)) {
									for (let [key, value] of guesses) {
										if (value == displayName) {
											if (block_guesses) {
												client.say(target, displayName + " sorry, no more guesses are accepted, you can't change your choice now.");
											} else {
												client.say(target, displayName + " changed their choice from " + key + " (" + options.get(current_item_type).get(key) + ") to " + choice + " (" + options.get(current_item_type).get(choice) + ")");
												guesses.delete(key);
												guesses.set(choice, displayName);
											}
											//log_status();
											break;
										}
									}
								} else {
									if (block_guesses) {
										client.say(target, displayName + " sorry, no more guesses are accepted.");
										if (blocked_guesses.has(choice)) {
											// choice is already occupied within the blocked_guesses so we do nothing.
										} else {
											// check if the user is already in the blocked_guesses and remove them as they now changed their choice
											if (Array.from(blocked_guesses.values()).includes(displayName)) {
												blocked_guesses.delete(key);
											} 
											blocked_guesses.set(choice, displayName);
										}
									} else {
										guesses.set(choice, displayName);
										//log_status();
										client.say(target, displayName + " guessed " + choice + " " + options.get(current_item_type).get(choice));
									}
								}
							}
						} else {
							client.say(target, displayName + " your guess is not a valid option.");
						}
					//}
				} else {
					client.say(target, displayName + " round not started.");
				}
				break;
			case "!block":
				//supported_commands.set(supported_commands.size, command);
				if (!has_access(context, target)) {
					client.say(target, displayName + " you can't do that.");
					break;
				}
				block_guessing(target);
				break;
			case "!allow":
				//supported_commands.set(supported_commands.size, command);
				if (!has_access(context, target)) {
					client.say(target, displayName + " you can't do that.");
					break;
				}
				allow_guessing(target);
				break;
			case "!available":
				//supported_commands.set(supported_commands.size, command);
				if (round_ongoing) {
					if (block_guesses) {
						client.say(target, "No more guessing! Time to slam!");
					} else {
						available_options(target, current_item_type, true, true);
					}
				} else {
					client.say(target, "Round not started.");
				}
				break;
			case "!taken":
				//supported_commands.set(supported_commands.size, command);
				if (round_ongoing) {
					//log_status();
					show_taken(target, true);
				} else {
					client.say(target, "Round not started.");
				}
				break;
			case "!commands":
				client.say(target, displayName + " a list of all supported slamfest commands can be found here: https://slamfest.jnodes.net/");
				//supported_commands.set(supported_commands.size, command);
				break;
			case "!verbose":
				if (!has_access(context, target)) {
					client.say(target, displayName + " you can't do that.");
					break;
				}
				verbose = true;
				client.say(target, displayName + " verbose set to true.");
				break;
			case "!laconic":
				if (!has_access(context, target)) {
					client.say(target, displayName + " you can't do that.");
					break;
				}
				verbose = false;
				client.say(target, displayName + " verbose set to false.");
				break;
			case "!stats":
                client.say(target, "Total slams: " + winners.size + " (" + get_total_bricks() + " bricks, " + get_total_no_winner_rounds() + " rounds had no winner)." + get_last_winner());
                break;
			case "!accept_blocked":
				//supported_commands.set(supported_commands.size, command);
				if (!has_access(context, target)) {
					client.say(target, displayName + " you can't do that.");
					break;
				}
				accept_blocked_guesses(target);
				break;
			default:
				console.log(`* Unknown command ${commandName}`);
		}
	}
}
function show_taken(target, verbose) {
	var status = "Total guesses are " + guesses.size + ".";
	if (verbose)
		if (guesses.size > 0) {
			status = status + " Details are:";
			var counter = 0;
			for (let [key, value] of guesses) {
				if (counter > 0) {
					status = status + ", " + key + '-' + options.get(current_item_type).get(key) + ' = ' + value;
				} else {
					status = status + " " + key + '-' + options.get(current_item_type).get(key) + ' = ' + value;
				}
				counter++;
			}
		}
	client.say(target, status);
}
function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
function mapToJson(map) {
	return JSON.stringify([...map]);
}
function jsonToMap(jsonStr) {
	return new Map(JSON.parse(jsonStr));
}
function reset_standings() {
	winners = new Map();
	save_to_disk();
}
function get_winning_choice_type(the_winning_choice) {
	var win_choice_type = the_winning_choice.substring(0, 1);
	if (the_winning_choice == "s1") { // special case where s1 is only 1 point
		win_choice_type = "s1";
	}
	return win_choice_type;
}
function has_access(context, target) {
	let isMod = context.mod || context['user-type'] === 'mod';
	let isBroadcaster = target.slice(1) === context.username;
	let isModUp = isMod || isBroadcaster;
	// we can enable admin rights for a non mod user with the following line:
	//if (context['display-name'] == 'n1ckblame' ) isModUp = true;
	return isModUp;
}
function get_total_bricks() {
        let total = 0;
        for (let [key, value] of winners) {
                if ( value.winning_choice === 'b' ) {
			total++;
                }
        }
        return total;
}
function get_total_no_winner_rounds() {
        let total = 0;
        for (let [key, value] of winners) {
                if ( value.points == 0 ) {
                        total++;
                }
        }
        return total;
}
function get_last_winner() {
        let last_winner = "";
        for (let [key, value] of winners) {
                if ( value.points > 0 ) {
                        last_winner = " Last winner was " + value.winner + "!";
                }
        }
        return last_winner;
}
function get_sorted_leaderboard() {
	let leaderboard = new Map();
	for (let [key, value] of winners) {
		if ( value.points > 0 ) {
			if (leaderboard.has(value.winner)) {
				leaderboard.set(value.winner, leaderboard.get(value.winner) + value.points);
			} else {
				leaderboard.set(value.winner, value.points);
			}
		}
	}
	const sortStringValues = (a, b) => (a[1] < b[1] && 1) || (a[1] === b[1] ? 0 : -1)
	var sorted_leaderboard = new Map([...leaderboard].sort(sortStringValues));
	//console.log('By values:', sorted_leaderboard);
	return sorted_leaderboard;
}
function save_to_disk() {
	try {
		if (fs.existsSync('standings/standings.json')) {
			//file exists, make a backup
			fs.rename('standings/standings.json', "standings/standings_" + Date.now() + ".json", function (err) {
				if (err) throw err
				console.log('file exists, a backup was made')
			})
		}
	} catch (err) {
		console.error(err)
	}
	fs.writeFile('standings/standings.json', mapToJson(winners), function (err) {
		if (err) throw err;
		console.log('Saved!');
	});
}
function load_from_disk() {
	fs.readFile('standings/standings.json', function (err, data) {
		if (err) {
			//throw err;
			console.log("no file found.");
		} else {
			winners = jsonToMap(data);
			console.log('loaded winner log from disk.');
		}
	});
}
let verbose = true;
let guesses = new Map();
let blocked_guesses = new Map();
//let supported_commands = new Map();
let winners = new Map();
let point_setup = new Map();
var current_bonus = "";
point_setup.set('b', 1);
point_setup.set('c', 1);
point_setup.set('m', 1.5);
point_setup.set('r', 2);
point_setup.set('s1', 1);
point_setup.set('s', 1.5);
point_setup.set('bonus_x', 2);

load_from_disk();

let options = new Map();

options.set('amulet', new Map());
options.get('amulet').set('b', 'Brick');
options.get('amulet').set('c1', 'Strength');
options.get('amulet').set('c2', 'Dexterity');
options.get('amulet').set('c3', 'Energy');
options.get('amulet').set('c4', 'Vitality');
options.get('amulet').set('c5', 'Cold Resist');
options.get('amulet').set('c6', 'Poison Resist');
options.get('amulet').set('c7', 'Light Resist');
options.get('amulet').set('c8', 'Fire Resist');
options.get('amulet').set('m1', 'Thorns');
options.get('amulet').set('m2', 'Gold Find');
options.get('amulet').set('m3', 'Pierce');
options.get('amulet').set('m4', 'Replenish Life');
options.get('amulet').set('m5', 'Block Chance');
options.get('amulet').set('m6', 'Faster Hit Recovery');
options.get('amulet').set('m7', 'Mana Per Kill');
options.get('amulet').set('m8', 'Life Per Kill');
options.get('amulet').set('r1', 'Magic Find');
options.get('amulet').set('r2', 'Max All Resistances');
options.get('amulet').set('r3', 'All Attributes');
options.get('amulet').set('r4', 'Enhanced Damage');
options.get('amulet').set('r5', 'Faster Run Walk');
options.get('amulet').set('r6', 'Faster Cast Rate');
options.get('amulet').set('r7', '+1 Skill');
options.get('amulet').set('r8', 'All Resistances');
options.set('ring', new Map());
options.get('ring').set('b', 'Brick');
options.get('ring').set('c1', 'Strength');
options.get('ring').set('c2', 'Dexterity');
options.get('ring').set('c3', 'Energy');
options.get('ring').set('c4', 'Vitality');
options.get('ring').set('c5', 'Cold Resist');
options.get('ring').set('c6', 'Poison Resist');
options.get('ring').set('c7', 'Light Resist');
options.get('ring').set('c8', 'Fire Resist');
options.get('ring').set('m1', 'Thorns');
options.get('ring').set('m2', 'Magic Find');
options.get('ring').set('m3', 'Gold Find');
options.get('ring').set('m4', 'Attack Rating');
options.get('ring').set('m5', 'Flat Physical Damage Reduced');
options.get('ring').set('m6', 'Flat Magic Damage Reduced');
options.get('ring').set('m7', 'Mana Per Kill');
options.get('ring').set('m8', 'Life Per Kill');
options.get('ring').set('r1', 'Mana Leech');
options.get('ring').set('r2', 'Life Leech');
options.get('ring').set('r3', 'All Attributes');
options.get('ring').set('r4', 'All Resistances');
options.get('ring').set('r5', 'Faster Run Walk');
options.get('ring').set('r6', 'Faster Cast Rate');
options.get('ring').set('r7', '-Curse Duration');
options.get('ring').set('r8', 'Cannot Be Frozen');
options.set('belt', new Map());
options.get('belt').set('b', 'Brick');
options.get('belt').set('c1', 'Strength');
options.get('belt').set('c2', 'Dexterity');
options.get('belt').set('c3', 'Energy');
options.get('belt').set('c4', 'Vitality');
options.get('belt').set('c5', 'Cold Resist');
options.get('belt').set('c6', 'Poison Resist');
options.get('belt').set('c7', 'Light Resist');
options.get('belt').set('c8', 'Fire Resist');
options.get('belt').set('m1', 'Thorns');
options.get('belt').set('m2', 'Magic Find');
options.get('belt').set('m3', 'Pierce');
options.get('belt').set('m4', 'Replenish Life');
options.get('belt').set('m5', 'Gold Find');
options.get('belt').set('m6', 'Faster Hit Recovery');
options.get('belt').set('m7', 'All Attributes');
options.get('belt').set('m8', 'Replenish Mana');
options.get('belt').set('r1', '% Physical Damage Reduced');
options.get('belt').set('r2', 'Increased Attack Speed');
options.get('belt').set('r3', 'All Resistances');
options.get('belt').set('r4', 'Faster Run Walk');
options.get('belt').set('r5', 'Block Chance');
options.get('belt').set('r6', 'Max All Resistances');
options.get('belt').set('r7', 'Faster Cast Rate');
options.get('belt').set('r8', '-Curse Duration');
options.set('gloves', new Map());
options.get('gloves').set('b', 'Brick');
options.get('gloves').set('c1', 'Enhanced Defense');
options.get('gloves').set('c2', 'Magic Find');
options.get('gloves').set('c3', 'Gold Find');
options.get('gloves').set('c4', 'Replenish Mana');
options.get('gloves').set('c5', 'Cold Resist');
options.get('gloves').set('c6', 'Poison Resist');
options.get('gloves').set('c7', 'Light Resist');
options.get('gloves').set('c8', 'Fire Resist');
options.get('gloves').set('m1', 'Attack Rating');
options.get('gloves').set('m2', 'Pierce');
options.get('gloves').set('m3', 'Replenish Life');
options.get('gloves').set('m4', 'Life Leech');
options.get('gloves').set('m5', 'Mana Leech');
options.get('gloves').set('m6', 'Block Speed');
options.get('gloves').set('m7', 'All Attributes');
options.get('gloves').set('m8', 'Max Life');
options.get('gloves').set('r1', 'Deadly Strike');
options.get('gloves').set('r2', 'Increased Attack Speed');
options.get('gloves').set('r3', 'Enhanced Damage');
options.get('gloves').set('r4', '-Target Defense');
options.get('gloves').set('r5', 'All Resistances');
options.get('gloves').set('r6', 'Block Chance');
options.get('gloves').set('r7', 'Faster Cast Rate');
options.get('gloves').set('r8', 'Mana Per Kill');
options.set('boots', new Map());
options.get('boots').set('b', 'Brick');
options.get('boots').set('c1', 'Enhanced Defense');
options.get('boots').set('c2', 'Magic Find');
options.get('boots').set('c3', 'Gold Find');
options.get('boots').set('c4', 'Mana Regeneration');
options.get('boots').set('c5', 'Cold Resist');
options.get('boots').set('c6', 'Poison Resist');
options.get('boots').set('c7', 'Light Resist');
options.get('boots').set('c8', 'Fire Resist');
options.get('boots').set('m1', 'Block Speed');
options.get('boots').set('m2', 'Max Life');
options.get('boots').set('m3', 'Life Per Kill');
options.get('boots').set('m4', 'Mana Per Kill');
options.get('boots').set('m5', 'Indestructible + Enhanced Defense');
options.get('boots').set('m6', 'All Resistances');
options.get('boots').set('m7', 'Faster Hit Recovery');
options.get('boots').set('m8', 'Replenish Life');
options.get('boots').set('r1', '-Curse Duration');
options.get('boots').set('r2', 'Faster Run Walk');
options.get('boots').set('r3', 'Cannot Be Frozen');
options.get('boots').set('r4', '% Physical Damage Reduced');
options.get('boots').set('r5', 'Max Cold Resist + Cold Resist');
options.get('boots').set('r6', 'Max Poison Resist + Poison Resist');
options.get('boots').set('r7', 'Max Light Resist + Light Resist');
options.get('boots').set('r8', 'Max Fire Resist + Fire Resist');
options.set('armor', new Map());
options.get('armor').set('b', 'Brick');
options.get('armor').set('c1', 'Enhanced Defense');
options.get('armor').set('c2', 'Replenish Life');
options.get('armor').set('c3', 'Faster Hit Recovery');
options.get('armor').set('c4', 'Mana Regeneration');
options.get('armor').set('c5', 'Cold Resist');
options.get('armor').set('c6', 'Poison Resist');
options.get('armor').set('c7', 'Light Resist');
options.get('armor').set('c8', 'Fire Resist');
options.get('armor').set('m1', 'Thorns');
options.get('armor').set('m2', 'Faster Cast Rate');
options.get('armor').set('m3', 'Max Life %');
options.get('armor').set('m4', 'Faster Run Walk');
options.get('armor').set('m5', 'Flat Physical Damage Reduced');
options.get('armor').set('m6', 'Flat Magic Damage Reduced');
options.get('armor').set('m7', 'Cannot Be Frozen');
options.get('armor').set('m8', 'Indestructible + Enhanced Defense');
options.get('armor').set('r1', '-Curse Duration');
options.get('armor').set('r2', '+1 Skill');
options.get('armor').set('r3', 'All Resistances');
options.get('armor').set('r4', '% Physical Damage Reduced');
options.get('armor').set('r5', 'Max Cold Resist + Cold Resist');
options.get('armor').set('r6', 'Max Poison Resist + Poison Resist');
options.get('armor').set('r7', 'Max Light Resist + Light Resist');
options.get('armor').set('r8', 'Max Fire Resist + Fire Resist');
options.set('helm', new Map());
options.get('helm').set('b', 'Brick');
options.get('helm').set('c1', 'Enhanced Defense');
options.get('helm').set('c2', 'Replenish Life');
options.get('helm').set('c3', 'Faster Hit Recovery');
options.get('helm').set('c4', 'Mana Regeneration');
options.get('helm').set('c5', 'Cold Resist');
options.get('helm').set('c6', 'Poison Resist');
options.get('helm').set('c7', 'Light Resist');
options.get('helm').set('c8', 'Fire Resist');
options.get('helm').set('m1', 'Indestructible + Enhanced Defense');
options.get('helm').set('m2', 'Life Leech');
options.get('helm').set('m3', 'Mana Leech');
options.get('helm').set('m4', 'Max Life %');
options.get('helm').set('m5', 'Cannot Be Frozen');
options.get('helm').set('m6', 'Life Per Kill');
options.get('helm').set('m7', 'Mana Per Kill');
options.get('helm').set('m8', 'Attack Rating + Light Radius');
options.get('helm').set('r1', '-Curse Duration');
options.get('helm').set('r2', '+1 Skill');
options.get('helm').set('r3', 'All Resistances');
options.get('helm').set('r4', '% Physical Damage Reduced');
options.get('helm').set('r5', 'Max Cold Resist + Cold Resist');
options.get('helm').set('r6', 'Max Poison Resist + Poison Resist');
options.get('helm').set('r7', 'Max Light Resist + Light Resist');
options.get('helm').set('r8', 'Max Fire Resist + Fire Resist');
options.set('shield', new Map());
options.get('shield').set('b', 'Brick');
options.get('shield').set('c1', 'Enhanced Defense');
options.get('shield').set('c2', 'Replenish Life');
options.get('shield').set('c3', 'Faster Hit Recovery');
options.get('shield').set('c4', 'Mana Regeneration');
options.get('shield').set('c5', 'Cold Resist');
options.get('shield').set('c6', 'Poison Resist');
options.get('shield').set('c7', 'Light Resist');
options.get('shield').set('c8', 'Fire Resist');
options.get('shield').set('m1', 'Thorns');
options.get('shield').set('m2', 'Faster Cast Rate');
options.get('shield').set('m3', 'Max Life %');
options.get('shield').set('m4', 'Block Chance + Increased Block Speed');
options.get('shield').set('m5', 'Flat Physical Damage Reduced');
options.get('shield').set('m6', 'Flat Magic Damage Reduced');
options.get('shield').set('m7', 'Cannot Be Frozen');
options.get('shield').set('m8', 'Indestructible + Enhanced Defense');
options.get('shield').set('r1', '-Curse Duration');
options.get('shield').set('r2', '+1 Skill');
options.get('shield').set('r3', 'All Resistances');
options.get('shield').set('r4', '% Physical Damage Reduced');
options.get('shield').set('r5', 'Max Cold Resist + Cold Resist');
options.get('shield').set('r6', 'Max Poison Resist + Poison Resist');
options.get('shield').set('r7', 'Max Light Resist + Light Resist');
options.get('shield').set('r8', 'Max Fire Resist + Fire Resist');
options.set('weapon', new Map());
options.get('weapon').set('b', 'Brick');
options.get('weapon').set('c1', 'Enhanced Damage');
options.get('weapon').set('c2', 'Life on Hit');
options.get('weapon').set('c3', 'Demon Damage + Attack Rating');
options.get('weapon').set('c4', '-Requirements');
options.get('weapon').set('c5', 'Magic Find');
options.get('weapon').set('c6', 'Life Per Kill');
options.get('weapon').set('c7', 'Mana Per Kill');
options.get('weapon').set('c8', 'Mana');
options.get('weapon').set('c9', 'Faster Hit Recovery');
options.get('weapon').set('c10', 'Attack Rating');
options.get('weapon').set('m1', 'Attack Rating 200+'); // was Thorns
options.get('weapon').set('m2', 'Light Pierce');
options.get('weapon').set('m3', 'Cold Pierce');
options.get('weapon').set('m4', 'Poison Pierce');
options.get('weapon').set('m5', 'Fire Pierce');
options.get('weapon').set('m6', 'Faster Cast Rate');
options.get('weapon').set('m7', 'Life Leech + Enhanced Damage');
options.get('weapon').set('m8', 'Deadly Strike');
options.get('weapon').set('m9', 'Increased Attack Speed');
options.get('weapon').set('m10', 'Crushing Blow');
options.get('weapon').set('r1', 'Increased Attack Speed + Enhanced Damage');
options.get('weapon').set('r2', 'Increased Attack Speed + Crushing Blow');
options.get('weapon').set('r3', 'Ignore Target Defense + Enhanced Damage');
options.get('weapon').set('r4', 'Deadly Strike + Enhanced Damage');
options.get('weapon').set('r5', 'Attack Rating + Enhanced Damage');
options.get('weapon').set('r6', '+1 Skill');
options.get('weapon').set('r7', 'Fire Damage + Faster Cast Rate');
options.get('weapon').set('r8', 'Cold Damage + Faster Cast Rate');
options.get('weapon').set('r9', 'Light Damage + Faster Cast Rate');
options.get('weapon').set('r10', 'Poison Damage + Faster Cast Rate');

function log_status() {
	if (guesses.size > 0) {
		console.log("current status of guesses:");
		for (let [key, value] of guesses) {
			console.log(key + ' = ' + value);
		}
	}
}
function available_options(target, item_type, still, verbose) {
	var remaining_options = 0;
	var intro = "Available options: ";
	if (still) {
		intro = "[" + item_type + "] Still available options: ";
	}
	var avail = "";
	for (let [key, value] of options.get(item_type)) {
		if (!guesses.has(key) || !still) {
			if (avail === "") {
				avail = key + ": " + value;
			} else {
				avail += ", " + key + ": " + value;
			}
			remaining_options++;
		}
	}
	if (verbose) {
		if (still && avail === "") {
			client.say(target, "[" + item_type + "] All options are taken.");
		} else {
			//console.log(intro + avail);
			client.say(target, intro + avail);
		}
	}
	return remaining_options;
}
function getRandomItem(set) {
	let items = Array.from(set);
	return items[Math.floor(Math.random() * items.length)];
}
function finishRound() {
	current_item_type = "";
	detected_slam_code = "";
	admin_message = "";
	current_bonus = "";
	round_ongoing = false;
	block_guesses = false;
	guesses = new Map();
	blocked_guesses = new Map();
}
function initRound(target) {
	guesses = new Map();
	blocked_guesses = new Map();
	client.say(target, "******** You can now start guessing!!! GO GO GO !!!! **********");
	admin_message = "round started";
	round_ongoing = true;
	block_guesses = false;
}

function finish_round_command(commandName, target){
	if (round_ongoing) {
		const the_winning_choice = commandName.split(" ")[1];
		if (options.get(current_item_type).has(the_winning_choice)) {
			var conclusion = "Round finished. winning choice was " + the_winning_choice + " " + options.get(current_item_type).get(the_winning_choice) + ".";
			client.say(target, prep_finish(the_winning_choice));
			finishRound();
		} else {
			client.say(target, "please specify a valid winning choice");
		}
	} else {
		client.say(target, "Round not started.");
	}
}

function prep(commandName, target){
	if (round_ongoing) {
		client.say(target, "Round is already ongoing.");
	} else {
		var item_type = commandName.split(" ")[1];
		
		//normilize plural item types
		if (
			item_type == "belts" ||
			item_type == "amulets" ||
			item_type == "rings" ||
			item_type == "armors" ||
			item_type == "helms" ||
			item_type == "shields" ||
			item_type == "weapons"
		) {
			item_type = item_type.slice(0, -1);
		}
		
		console.log(item_type);
		if (options.has(item_type)) {
			current_item_type = item_type;
			var sock_explanation = "";
			// check sockets if the item supports it
			if (current_item_type == "armor" || current_item_type == "helm" || current_item_type == "shield" || current_item_type == "weapon") {
				const num_of_socks = commandName.split(" ")[2];
	
				if (commandName.split(" ").length < 3) {
					client.say(target, "Please specify number of sockets e.g. !prep " + current_item_type + " 2 for 2 sockets max or !prep " + current_item_type + " 0 to disable sockets for this item");
					current_item_type = "";
					//break;
					return;
				} else if (num_of_socks == "0" || num_of_socks == "1" || num_of_socks == "2" || num_of_socks == "3" || num_of_socks == "4" || num_of_socks == "5" || num_of_socks == "6") {
					options.get(current_item_type).delete("s1");
					options.get(current_item_type).delete("s2");
					options.get(current_item_type).delete("s3");
					options.get(current_item_type).delete("s4");
					options.get(current_item_type).delete("s5");
					options.get(current_item_type).delete("s6");
	
					for (i = 1; i <= parseInt(num_of_socks); i++) {
						if (i == 1) {
							options.get(current_item_type).set("s" + i, i + " free socket");
							sock_explanation = " / socket s1 (points:" + point_setup.get('s1') + ")";
						} else {
							options.get(current_item_type).set("s" + i, i + " free sockets");
							sock_explanation += " / sockets s2-s6 (points:" + point_setup.get('s') + ")";
						}
					}
					//choice_explanation_text += sock_explanation;
				} else {
					client.say(target, "Invalid option for number of sockets, please choose from 0 to 6.");
					current_item_type = "";
					//break;
					return;
				}
			}
			//console.log(getRandomItem(options.get(current_item_type)));
			var randomAttr = getRandomItem(options.get(current_item_type));
			//console.log(randomAttr[0]);
			//console.log(randomAttr[1]);
			current_bonus = randomAttr[0];
	
	
			var choice_explanation_text = "[" + current_item_type + "] brick b (points:" + point_setup.get('b') + ") / commons c (points:" + point_setup.get('c') + ") / mid_rare m (points:" + point_setup.get('m') + ") / rare r (points:" + point_setup.get('r') + ")" + sock_explanation + ", bonus is x" + point_setup.get('bonus_x');
			client.say(target, choice_explanation_text);
			(async function () {
				available_options(target, current_item_type, false, verbose);
				await timer(1700);
				client.say(target, "Item type " + item_type + " was set, e.g. to guess brick type: !g b");
				client.say(target, "Bonus is " + randomAttr[0] + " " + randomAttr[1] + ".");
			})();
		} else {
			var supported = "";
			for (let [key, value] of options) {
				if (supported === '') {
					supported = key;
				} else {
					supported = supported + ", " + key;
				}
			}
			client.say(target, "Invalid option. Currently supported options: " + supported);
		}
	
	}
}

function start_round(target){
	if (round_ongoing) {
		client.say(target, "Round is already ongoing.");
	} else {
		if (current_item_type === '') {
			client.say(target, "You didn't specify the item type. Please use !prep command.");
		} else if (current_bonus === "") {
			client.say(target, "You didn't specify which guess has bonus. Please use !bonus command.");
		} else {
			(async function () {
				admin_message = "start round countdown in progress..";
				client.say(target, "Heads up!! Starting round in ...");
				for (i = 5; i > 0; i--) {
					//console.log(i);
					client.say(target, "" + i);
					await timer(1000);
				}
				//console.log("done");
				if(current_item_type !== ''){
					initRound(target);
				} else {
					client.say(target, "You didn't specify the item type. Please use !prep command.");
				}
			})();
		}
	}
}

function block_guessing(target){
	if (round_ongoing) {
		if (block_guesses) {
			client.say(target, "Guessed are already blocked for this round!");
		} else {
			var remaining_options = available_options(target, current_item_type, true, verbose);
			//console.log("remaining_options=" + remaining_options);
			const timer = ms => new Promise(res => setTimeout(res, ms));
			(async function () {
				await timer(1700);
				if (remaining_options > 0) {
					var countdown = 10;
					admin_message = "blocking guesses countdown in progress..";
					client.say(target, "Blocking guess after countdown! Quick guess something!!!");
					for (i = 10; i > 0; i--) {
						//console.log(i);
						if (i == 10 || i < 6) {
							client.say(target, "" + i);
						}
						await timer(1000);
					}
					//console.log("done");
				}
				block_guesses = true;
				detected_slam_code = "";
				admin_message = "*** No more guessing! Time to slam! ***";
				client.say(target, "*** No more guessing! Time to slam! ***");
				await timer(7000);
				show_taken(target, verbose);
			})();
		}
	} else {
		client.say(target, "Round not started.");
	}
}

function allow_guessing(target){
	if (round_ongoing) {
		admin_message = "Guesses are allowed again.";
		blocked_guesses = new Map();
		block_guesses = false;
		client.say(target, "Okay you still have time to guess. Quick!");
	} else {
		client.say(target, "Round not started.");
	}
}

function accept_blocked_guesses(target){
	if(blocked_guesses.size > 0){
		for (let [key, value] of blocked_guesses) {
			guesses.set(key, value);
			client.say(target, "Added choice " +  key + " to " + value);
		}
	} else {
		client.say(target, "There are no blocked guesses right now.");
	}
	blocked_guesses = new Map();
}


// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
	console.log(`* Connected to ${addr}:${port}`);

}

function leaveChannel(the_channel) {
	//console.log(client.getChannels());
	if (client.getChannels().includes(the_channel)) {
		client.say(the_channel, "Slamfest_Bot is now leaving.");
		client.part(the_channel).then((data) => {
			// data returns [channel]
		}).catch((err) => {
			//
		});
	} else {
		console.log("the bot is not currently in channel " + the_channel);
	}
}

function joinChannel(the_channel) {
	//console.log(client.getChannels());
	if (client.getChannels().includes(the_channel)) {
		console.log("the bot is already in channel " + the_channel);

	} else {
		console.log("joining channel " + the_channel);
		//client.say(the_channel, "Slamfest_Bot is now leaving.");
		client.join(the_channel).then((data) => {
			// data returns [channel]
		}).catch((err) => {
			//
		});
	}
}

function prep_finish(input_the_winning_choice) {
	var conclusion = "Round finished. winning choice was " + input_the_winning_choice + " " + options.get(current_item_type).get(input_the_winning_choice) + ".";
	if (guesses.has(input_the_winning_choice)) {

		var the_points = point_setup.get(get_winning_choice_type(input_the_winning_choice));
		if (input_the_winning_choice == current_bonus) {
			the_points = the_points * 2;
		}
		conclusion = conclusion + " The winner is " + guesses.get(input_the_winning_choice) + " !!! (winning " + the_points + " points)";
		winners.set(winners.size + 1, { item_type: current_item_type, winner: guesses.get(input_the_winning_choice), winning_choice: input_the_winning_choice, winning_choice_text: options.get(current_item_type).get(input_the_winning_choice), bonus: current_bonus, points: the_points });

		save_to_disk();
	} else {
		conclusion = conclusion + " The round had no winner.";
		winners.set(winners.size + 1, { item_type: current_item_type, winner: "no winner", winning_choice: input_the_winning_choice, winning_choice_text: options.get(current_item_type).get(input_the_winning_choice), bonus: current_bonus, points: 0 });
		save_to_disk();
	}
	console.log(conclusion);
	return conclusion;
}

function corruption_code_to_slam_code(the_code) {
	if (the_code === 32) {
		return "s";
	} else if (current_item_type === 'amulet') {
		switch (the_code) {
			case 1: return "b"; // brick
			case 2: return "r4"; // enhanced damage
			case 3: return ""; // AR
			case 4: return ""; // life after each hit "item_healafterhit"
			case 5: return ""; // demon damage and AR
			case 6: return ""; // -requirements
			case 7: return "r1"; // mf
			case 8: return "m8"; // life after each kill
			case 9: return "m7"; // mana after each kill
			case 10: return ""; // mana (maxmana)
			case 11: return ""; // FHR (weapon)
			case 12: return ""; // -enemy fire res
			case 13: return ""; // -enemy light res
			case 14: return ""; // -enemy cold res
			case 15: return ""; // -enemy poison res
			case 16: return ""; // FCR (weapon)
			case 17: return ""; // Life Leech + Enhanced Damage
			case 18: return "m1"; // attacker takes damage based on char lvl
			case 19: return ""; // deadly strike
			case 20: return ""; // IAS
			case 21: return ""; // Crushing Blow
			case 22: return ""; // enhanced damage + IAS
			case 23: return ""; // Increased Attack Speed + Crushing Blow
			case 24: return ""; // enhanced damage + Ignore Target Defense
			case 25: return ""; // Deadly Strike + enhanced damage
			case 26: return ""; // enhanced damage + AR
			case 27: return "r7"; // +1 skill (weapon?)
			case 28: return ""; // Fire Damage + Faster Cast Rate
			case 29: return ""; // Cold Damage + Faster Cast Rate
			case 30: return ""; // light Damage + Faster Cast Rate
			case 31: return ""; // Poison Damage + Faster Cast Rate
			case 33: return ""; // enhanced defense "item_armor_percent"
			case 34: return "m4"; // regenerate / replenish life
			case 35: return "m6"; // FHR
			case 36: return "c8"; // fire res
			case 37: return "c5"; // cold res
			case 38: return "c7"; // light res
			case 39: return "c6"; // poison res
			case 40: return ""; // regenerate / replenish mana
			case 41: return "m1"; // attacker takes damage based on char lvl
			case 42: return "r6"; // FCR
			case 43: return ""; // increase max life
			case 44: return "r5"; // FRW
			case 45: return ""; // CBF
			case 46: return ""; // flat PDR
			case 47: return ""; // flat MDR
			case 48: return ""; // indestructible
			case 49: return ""; // indestructible + enhanced defense
			case 50: return "r7"; // +1 skill (shield?)
			case 51: return "r8"; // all res
			case 52: return ""; // PDR %
			case 53: return ""; // max fire + fire res
			case 54: return ""; // max cold + cold res
			case 55: return ""; // max light + light res
			case 56: return ""; // max poison + poison res
			case 57: return ""; // life leech
			case 58: return ""; // mana leech
			case 59: return ""; // AR + light radius
			case 60: return "m2"; // GF
			case 61: return ""; // increase max life
			case 62: return ""; // reduced curse duration
			case 63: return "m3"; // chance to pierce
			case 64: return ""; // faster block rate (item_fasterblockrate)
			case 65: return "r3"; // all attributes
			case 66: return ""; // -target defense (item_fractionaltargetac)
			case 67: return "m5"; // icreased chance of blocking
			case 68: return "c1"; // str
			case 69: return "c2"; // dex
			case 70: return "c4"; // vitality
			case 71: return "c3"; // energy
			case 72: return "r2"; // max all res
			case 73: return ""; // block chance + block speed
			default:
		}
	} else if (current_item_type === 'ring') {
		switch (the_code) {
			case 1: return "b"; // brick
			case 2: return ""; // enhanced damage
			case 3: return "m4"; // AR
			case 4: return ""; // life after each hit "item_healafterhit"
			case 5: return ""; // demon damage and AR
			case 6: return ""; // -requirements
			case 7: return "m2"; // mf
			case 8: return "m8"; // life after each kill
			case 9: return "m7"; // mana after each kill
			case 10: return ""; // mana (maxmana)
			case 11: return ""; // FHR (weapon)
			case 12: return ""; // -enemy fire res
			case 13: return ""; // -enemy light res
			case 14: return ""; // -enemy cold res
			case 15: return ""; // -enemy poison res
			case 16: return ""; // FCR (weapon)
			case 17: return ""; // Life Leech + Enhanced Damage
			case 18: return "m1"; // attacker takes damage based on char lvl
			case 19: return ""; // deadly strike
			case 20: return ""; // IAS
			case 21: return ""; // Crushing Blow
			case 22: return ""; // enhanced damage + IAS
			case 23: return ""; // Increased Attack Speed + Crushing Blow
			case 24: return ""; // enhanced damage + Ignore Target Defense
			case 25: return ""; // Deadly Strike + enhanced damage
			case 26: return ""; // enhanced damage + AR
			case 27: return "r4"; // +1 skill (weapon?)
			case 28: return ""; // Fire Damage + Faster Cast Rate
			case 29: return ""; // Cold Damage + Faster Cast Rate
			case 30: return ""; // light Damage + Faster Cast Rate
			case 31: return ""; // Poison Damage + Faster Cast Rate
			case 33: return ""; // enhanced defense "item_armor_percent"
			case 34: return ""; // regenerate / replenish life
			case 35: return ""; // FHR
			case 36: return "c8"; // fire res
			case 37: return "c5"; // cold res
			case 38: return "c7"; // light res
			case 39: return "c6"; // poison res
			case 40: return ""; // regenerate / replenish mana
			case 41: return "m1"; // attacker takes damage based on char lvl
			case 42: return "r6"; // FCR
			case 43: return ""; // increase max life
			case 44: return "r5"; // FRW
			case 45: return "r8"; // CBF
			case 46: return "m5"; // flat PDR
			case 47: return "m6"; // flat MDR
			case 48: return ""; // indestructible
			case 49: return ""; // indestructible + enhanced defense
			case 50: return ""; // +1 skill (shield?)
			case 51: return "r4"; // all res
			case 52: return ""; // PDR %
			case 53: return ""; // max fire + fire res
			case 54: return ""; // max cold + cold res
			case 55: return ""; // max light + light res
			case 56: return ""; // max poison + poison res
			case 57: return "r2"; // life leech
			case 58: return "r1"; // mana leech
			case 59: return ""; // AR + light radius
			case 60: return "m3"; // GF
			case 61: return ""; // increase max life
			case 62: return "r7"; // reduced curse duration
			case 63: return ""; // chance to pierce
			case 64: return ""; // faster block rate (item_fasterblockrate)
			case 65: return "r3"; // all attributes
			case 66: return ""; // -target defense (item_fractionaltargetac)
			case 67: return ""; // icreased chance of blocking
			case 68: return "c1"; // str
			case 69: return "c2"; // dex
			case 70: return "c4"; // vitality
			case 71: return "c3"; // energy
			case 72: return ""; // max all res
			case 73: return ""; // block chance + block speed
			default:
		}
	} else if (current_item_type === 'gloves') {
		switch (the_code) {
			case 1: return "b"; // brick
			case 2: return "r3"; // enhanced damage
			case 3: return "m1"; // AR
			case 4: return ""; // life after each hit "item_healafterhit"
			case 5: return ""; // demon damage and AR
			case 6: return ""; // -requirements
			case 7: return "c2"; // mf
			case 8: return ""; // life after each kill
			case 9: return "r8"; // mana after each kill
			case 10: return ""; // mana (maxmana)
			case 11: return ""; // FHR (weapon)
			case 12: return ""; // -enemy fire res
			case 13: return ""; // -enemy light res
			case 14: return ""; // -enemy cold res
			case 15: return ""; // -enemy poison res
			case 16: return ""; // FCR (weapon)
			case 17: return ""; // Life Leech + Enhanced Damage
			case 18: return "m1"; // AR (was attacker takes damage based on char lvl)
			case 19: return "r1"; // deadly strike
			case 20: return "r2"; // IAS
			case 21: return ""; // Crushing Blow
			case 22: return ""; // enhanced damage + IAS
			case 23: return ""; // Increased Attack Speed + Crushing Blow
			case 24: return ""; // enhanced damage + Ignore Target Defense
			case 25: return ""; // Deadly Strike + enhanced damage
			case 26: return ""; // enhanced damage + AR
			case 27: return ""; // +1 skill (weapon?)
			case 28: return ""; // Fire Damage + Faster Cast Rate
			case 29: return ""; // Cold Damage + Faster Cast Rate
			case 30: return ""; // light Damage + Faster Cast Rate
			case 31: return ""; // Poison Damage + Faster Cast Rate
			case 33: return "c1"; // enhanced defense "item_armor_percent"
			case 34: return "m3"; // regenerate / replenish life
			case 35: return ""; // FHR
			case 36: return "c8"; // fire res
			case 37: return "c5"; // cold res
			case 38: return "c7"; // light res
			case 39: return "c6"; // poison res
			case 40: return "c4"; // regenerate / replenish mana
			case 41: return "m1"; // AR (was attacker takes damage based on char lvl)
			case 42: return "r7"; // FCR
			case 43: return "m8"; // increase max life
			case 44: return ""; // FRW
			case 45: return ""; // CBF
			case 46: return ""; // flat PDR
			case 47: return ""; // flat MDR
			case 48: return ""; // indestructible
			case 49: return ""; // indestructible + enhanced defense
			case 50: return ""; // +1 skill (shield?)
			case 51: return "r5"; // all res
			case 52: return ""; // PDR %
			case 53: return ""; // max fire + fire res
			case 54: return ""; // max cold + cold res
			case 55: return ""; // max light + light res
			case 56: return ""; // max poison + poison res
			case 57: return "m4"; // life leech
			case 58: return "m5"; // mana leech
			case 59: return ""; // AR + light radius
			case 60: return "c3"; // GF
			case 61: return "m8"; // increase max life
			case 62: return ""; // reduced curse duration
			case 63: return "m2"; // chance to pierce
			case 64: return "m6"; // faster block rate (item_fasterblockrate)
			case 65: return "m7"; // all attributes
			case 66: return "r4"; // -target defense (item_fractionaltargetac)
			case 67: return "r6"; // icreased chance of blocking
			case 68: return ""; // str
			case 69: return ""; // dex
			case 70: return ""; // vitality
			case 71: return ""; // energy
			case 72: return ""; // max all res
			case 73: return ""; // block chance + block speed
			default:
		}
	} else if (current_item_type === 'belt') {
		switch (the_code) {
			case 1: return "b"; // brick
			case 2: return ""; // enhanced damage
			case 3: return ""; // AR
			case 4: return ""; // life after each hit "item_healafterhit"
			case 5: return ""; // demon damage and AR
			case 6: return ""; // -requirements
			case 7: return "m2"; // mf
			case 8: return ""; // life after each kill
			case 9: return ""; // mana after each kill
			case 10: return ""; // mana (maxmana)
			case 11: return ""; // FHR (weapon)
			case 12: return ""; // -enemy fire res
			case 13: return ""; // -enemy light res
			case 14: return ""; // -enemy cold res
			case 15: return ""; // -enemy poison res
			case 16: return ""; // FCR (weapon)
			case 17: return ""; // Life Leech + Enhanced Damage
			case 18: return "m1"; // attacker takes damage based on char lvl
			case 19: return ""; // deadly strike
			case 20: return "r2"; // IAS
			case 21: return ""; // Crushing Blow
			case 22: return ""; // enhanced damage + IAS
			case 23: return ""; // Increased Attack Speed + Crushing Blow
			case 24: return ""; // enhanced damage + Ignore Target Defense
			case 25: return ""; // Deadly Strike + enhanced damage
			case 26: return ""; // enhanced damage + AR
			case 27: return ""; // +1 skill (weapon?)
			case 28: return ""; // Fire Damage + Faster Cast Rate
			case 29: return ""; // Cold Damage + Faster Cast Rate
			case 30: return ""; // light Damage + Faster Cast Rate
			case 31: return ""; // Poison Damage + Faster Cast Rate
			case 33: return ""; // enhanced defense "item_armor_percent"
			case 34: return "m4"; // regenerate / replenish life
			case 35: return "m6"; // FHR
			case 36: return "c8"; // fire res
			case 37: return "c5"; // cold res
			case 38: return "c7"; // light res
			case 39: return "c6"; // poison res
			case 40: return "m8"; // regenerate / replenish mana
			case 41: return "m1"; // attacker takes damage based on char lvl
			case 42: return "r7"; // FCR
			case 43: return ""; // increase max life
			case 44: return "r4"; // FRW
			case 45: return ""; // CBF
			case 46: return ""; // flat PDR
			case 47: return ""; // flat MDR
			case 48: return ""; // indestructible
			case 49: return ""; // indestructible + enhanced defense
			case 50: return ""; // +1 skill (shield?)
			case 51: return "r3"; // all res
			case 52: return "r1"; // PDR %
			case 53: return ""; // max fire + fire res
			case 54: return ""; // max cold + cold res
			case 55: return ""; // max light + light res
			case 56: return ""; // max poison + poison res
			case 57: return ""; // life leech
			case 58: return ""; // mana leech
			case 59: return ""; // AR + light radius
			case 60: return "m5"; // GF
			case 61: return ""; // increase max life
			case 62: return "r8"; // reduced curse duration
			case 63: return "m3"; // chance to pierce
			case 64: return ""; // faster block rate (item_fasterblockrate)
			case 65: return "m7"; // all attributes
			case 66: return ""; // -target defense (item_fractionaltargetac)
			case 67: return "r5"; // icreased chance of blocking
			case 68: return "c1"; // str
			case 69: return "c2"; // dex
			case 70: return "c4"; // vitality
			case 71: return "c3"; // energy
			case 72: return "r6"; // max all res
			case 73: return ""; // block chance + block speed
			default:
		}
	} else if (current_item_type === 'boots') {
		switch (the_code) {
			case 1: return "b"; // brick
			case 2: return ""; // enhanced damage
			case 3: return ""; // AR
			case 4: return ""; // life after each hit "item_healafterhit"
			case 5: return ""; // demon damage and AR
			case 6: return ""; // -requirements
			case 7: return "c2"; // mf
			case 8: return "m3"; // life after each kill
			case 9: return "m4"; // mana after each kill
			case 10: return ""; // mana (maxmana)
			case 11: return "m7"; // FHR (weapon)
			case 12: return ""; // -enemy fire res
			case 13: return ""; // -enemy light res
			case 14: return ""; // -enemy cold res
			case 15: return ""; // -enemy poison res
			case 16: return ""; // FCR (weapon)
			case 17: return ""; // Life Leech + Enhanced Damage
			case 18: return "m1"; // block Speed (was attacker takes damage based on char lvl)
			case 19: return ""; // deadly strike
			case 20: return ""; // IAS
			case 21: return ""; // Crushing Blow
			case 22: return ""; // enhanced damage + IAS
			case 23: return ""; // Increased Attack Speed + Crushing Blow
			case 24: return ""; // enhanced damage + Ignore Target Defense
			case 25: return ""; // Deadly Strike + enhanced damage
			case 26: return ""; // enhanced damage + AR
			case 27: return ""; // +1 skill (weapon?)
			case 28: return ""; // Fire Damage + Faster Cast Rate
			case 29: return ""; // Cold Damage + Faster Cast Rate
			case 30: return ""; // light Damage + Faster Cast Rate
			case 31: return ""; // Poison Damage + Faster Cast Rate
			case 33: return "c1"; // enhanced defense "item_armor_percent"
			case 34: return "m8"; // regenerate / replenish life
			case 35: return "m7"; // FHR
			case 36: return "c8"; // fire res
			case 37: return "c5"; // cold res
			case 38: return "c7"; // light res
			case 39: return "c6"; // poison res
			case 40: return "c4"; // regenerate / replenish mana
			case 41: return "m1"; // block Speed (was attacker takes damage based on char lvl)
			case 42: return ""; // FCR
			case 43: return "m2"; // increase max life
			case 44: return "r2"; // FRW
			case 45: return "r3"; // CBF
			case 46: return ""; // flat PDR
			case 47: return ""; // flat MDR
			case 48: return ""; // indestructible
			case 49: return "m5"; // indestructible + enhanced defense
			case 50: return ""; // +1 skill (shield?)
			case 51: return "m6"; // all res
			case 52: return "r4"; // PDR %
			case 53: return "r8"; // max fire + fire res
			case 54: return "r5"; // max cold + cold res
			case 55: return "r7"; // max light + light res
			case 56: return "r6"; // max poison + poison res
			case 57: return ""; // life leech
			case 58: return ""; // mana leech
			case 59: return ""; // AR + light radius
			case 60: return "c3"; // GF
			case 61: return "m2"; // increase max life
			case 62: return "r1"; // reduced curse duration
			case 63: return ""; // chance to pierce
			case 64: return "m1"; // faster block rate (item_fasterblockrate)
			case 65: return ""; // all attributes
			case 66: return ""; // -target defense (item_fractionaltargetac)
			case 67: return ""; // icreased chance of blocking
			case 68: return ""; // str
			case 69: return ""; // dex
			case 70: return ""; // vitality
			case 71: return ""; // energy
			case 72: return ""; // max all res
			case 73: return ""; // block chance + block speed
			default:
		}
	} else if (current_item_type === 'helm') {
		switch (the_code) {
			case 1: return "b"; // brick
			case 2: return ""; // enhanced damage
			case 3: return ""; // AR
			case 4: return ""; // life after each hit "item_healafterhit"
			case 5: return ""; // demon damage and AR
			case 6: return ""; // -requirements
			case 7: return ""; // mf
			case 8: return "m6"; // life after each kill
			case 9: return "m7"; // mana after each kill
			case 10: return ""; // mana (maxmana)
			case 11: return ""; // FHR (weapon)
			case 12: return ""; // -enemy fire res
			case 13: return ""; // -enemy light res
			case 14: return ""; // -enemy cold res
			case 15: return ""; // -enemy poison res
			case 16: return ""; // FCR (weapon)
			case 17: return ""; // Life Leech + Enhanced Damage
			case 18: return "m1"; // indestructible + enhanced defense (was attacker takes damage based on char lvl)
			case 19: return ""; // deadly strike
			case 20: return ""; // IAS
			case 21: return ""; // Crushing Blow
			case 22: return ""; // enhanced damage + IAS
			case 23: return ""; // Increased Attack Speed + Crushing Blow
			case 24: return ""; // enhanced damage + Ignore Target Defense
			case 25: return ""; // Deadly Strike + enhanced damage
			case 26: return ""; // enhanced damage + AR
			case 27: return "r2"; // +1 skill (weapon?)
			case 28: return ""; // Fire Damage + Faster Cast Rate
			case 29: return ""; // Cold Damage + Faster Cast Rate
			case 30: return ""; // light Damage + Faster Cast Rate
			case 31: return ""; // Poison Damage + Faster Cast Rate
			case 33: return "c1"; // enhanced defense "item_armor_percent"
			case 34: return "c2"; // regenerate / replenish life
			case 35: return "c3"; // FHR
			case 36: return "c8"; // fire res
			case 37: return "c5"; // cold res
			case 38: return "c7"; // light res
			case 39: return "c6"; // poison res
			case 40: return "c4"; // regenerate / replenish mana
			case 41: return "m1"; // indestructible + enhanced defense (was attacker takes damage based on char lvl)
			case 42: return ""; // FCR
			case 43: return "m4"; // increase max life
			case 44: return ""; // FRW
			case 45: return "m5"; // CBF
			case 46: return ""; // flat PDR
			case 47: return ""; // flat MDR
			case 48: return ""; // indestructible
			case 49: return "r1"; // reduced curse duration (was indestructible + enhanced defense)
			case 50: return "r2"; // +1 skill (shield?)
			case 51: return "r3"; // all res
			case 52: return "r4"; // PDR %
			case 53: return "r8"; // max fire + fire res
			case 54: return "r5"; // max cold + cold res
			case 55: return "r7"; // max light + light res
			case 56: return "r6"; // max poison + poison res
			case 57: return "m2"; // life leech
			case 58: return "m3"; // mana leech
			case 59: return "m8"; // AR + light radius
			case 60: return ""; // GF
			case 61: return ""; // increase max life
			case 62: return ""; // reduced curse duration
			case 63: return ""; // chance to pierce
			case 64: return ""; // faster block rate (item_fasterblockrate)
			case 65: return ""; // all attributes
			case 66: return ""; // -target defense (item_fractionaltargetac)
			case 67: return ""; // icreased chance of blocking
			case 68: return ""; // str
			case 69: return ""; // dex
			case 70: return ""; // vitality
			case 71: return ""; // energy
			case 72: return ""; // max all res
			case 73: return ""; // block chance + block speed
			default:
		}
	} else if (current_item_type === 'shield') {
		switch (the_code) {
			case 1: return "b"; // brick
			case 2: return ""; // enhanced damage
			case 3: return ""; // AR
			case 4: return ""; // life after each hit "item_healafterhit"
			case 5: return ""; // demon damage and AR
			case 6: return ""; // -requirements
			case 7: return ""; // mf
			case 8: return ""; // life after each kill
			case 9: return ""; // mana after each kill
			case 10: return ""; // mana (maxmana)
			case 11: return ""; // FHR (weapon)
			case 12: return ""; // -enemy fire res
			case 13: return ""; // -enemy light res
			case 14: return ""; // -enemy cold res
			case 15: return ""; // -enemy poison res
			case 16: return ""; // FCR (weapon)
			case 17: return ""; // Life Leech + Enhanced Damage
			case 18: return "m1"; // attacker takes damage based on char lvl
			case 19: return ""; // deadly strike
			case 20: return ""; // IAS
			case 21: return ""; // Crushing Blow
			case 22: return ""; // enhanced damage + IAS
			case 23: return ""; // Increased Attack Speed + Crushing Blow
			case 24: return ""; // enhanced damage + Ignore Target Defense
			case 25: return ""; // Deadly Strike + enhanced damage
			case 26: return ""; // enhanced damage + AR
			case 27: return "r2"; // +1 skill (weapon?)
			case 28: return ""; // Fire Damage + Faster Cast Rate
			case 29: return ""; // Cold Damage + Faster Cast Rate
			case 30: return ""; // light Damage + Faster Cast Rate
			case 31: return ""; // Poison Damage + Faster Cast Rate
			case 33: return "c1"; // enhanced defense "item_armor_percent"
			case 34: return "c2"; // regenerate / replenish life
			case 35: return "c3"; // FHR
			case 36: return "c8"; // fire res
			case 37: return "c5"; // cold res
			case 38: return "c7"; // light res
			case 39: return "c6"; // poison res
			case 40: return "c4"; // regenerate / replenish mana
			case 41: return "m1"; // attacker takes damage based on char lvl
			case 42: return "m2"; // FCR
			case 43: return "m3"; // increase max life
			case 44: return ""; // FRW
			case 45: return "m7"; // CBF
			case 46: return "m5"; // flat PDR
			case 47: return "m6"; // flat MDR
			case 48: return "m8"; // indestructible + enhanced defense (was indestructible)
			case 49: return "r1"; // reduced curse duration (was indestructible + enhanced defense)
			case 50: return "r2"; // +1 skill (shield?)
			case 51: return "r3"; // all res
			case 52: return "r4"; // PDR %
			case 53: return "r8"; // max fire + fire res
			case 54: return "r5"; // max cold + cold res
			case 55: return "r7"; // max light + light res
			case 56: return "r6"; // max poison + poison res
			case 57: return ""; // life leech
			case 58: return ""; // mana leech
			case 59: return ""; // AR + light radius
			case 60: return ""; // GF
			case 61: return ""; // increase max life
			case 62: return ""; // reduced curse duration
			case 63: return ""; // chance to pierce
			case 64: return ""; // faster block rate (item_fasterblockrate)
			case 65: return ""; // all attributes
			case 66: return ""; // -target defense (item_fractionaltargetac)
			case 67: return ""; // icreased chance of blocking
			case 68: return ""; // str
			case 69: return ""; // dex
			case 70: return ""; // vitality
			case 71: return ""; // energy
			case 72: return ""; // max all res
			case 73: return "m4"; // block chance + block speed
			default:
		}
	} else if (current_item_type === 'armor') {
		switch (the_code) {
			case 1: return "b"; // brick
			case 2: return ""; // enhanced damage
			case 3: return ""; // AR
			case 4: return ""; // life after each hit "item_healafterhit"
			case 5: return ""; // demon damage and AR
			case 6: return ""; // -requirements
			case 7: return ""; // mf
			case 8: return ""; // life after each kill
			case 9: return ""; // mana after each kill
			case 10: return ""; // mana (maxmana)
			case 11: return ""; // FHR (weapon)
			case 12: return ""; // -enemy fire res
			case 13: return ""; // -enemy light res
			case 14: return ""; // -enemy cold res
			case 15: return ""; // -enemy poison res
			case 16: return ""; // FCR (weapon)
			case 17: return ""; // Life Leech + Enhanced Damage
			case 18: return "m1"; // attacker takes damage based on char lvl
			case 19: return ""; // deadly strike
			case 20: return ""; // IAS
			case 21: return ""; // Crushing Blow
			case 22: return ""; // enhanced damage + IAS
			case 23: return ""; // Increased Attack Speed + Crushing Blow
			case 24: return ""; // enhanced damage + Ignore Target Defense
			case 25: return ""; // Deadly Strike + enhanced damage
			case 26: return ""; // enhanced damage + AR
			case 27: return "r2"; // +1 skill (weapon?)
			case 28: return ""; // Fire Damage + Faster Cast Rate
			case 29: return ""; // Cold Damage + Faster Cast Rate
			case 30: return ""; // light Damage + Faster Cast Rate
			case 31: return ""; // Poison Damage + Faster Cast Rate
			case 33: return "c1"; // enhanced defense "item_armor_percent"
			case 34: return "c2"; // regenerate / replenish life
			case 35: return "c3"; // FHR
			case 36: return "c8"; // fire res
			case 37: return "c5"; // cold res
			case 38: return "c7"; // light res
			case 39: return "c6"; // poison res
			case 40: return "c4"; // regenerate / replenish mana
			case 41: return "m1"; // attacker takes damage based on char lvl
			case 42: return "m2"; // FCR
			case 43: return "m3"; // increase max life
			case 44: return "m4"; // FRW
			case 45: return "m7"; // CBF
			case 46: return "m5"; // flat PDR
			case 47: return "m6"; // flat MDR
			case 48: return "m8"; // indestructible + enhanced defense (was indestructible)
			case 49: return "r1"; // reduced curse duration (was indestructible + enhanced defense)
			case 50: return "r2"; // +1 skill (shield?)
			case 51: return "r3"; // all res
			case 52: return "r4"; // PDR %
			case 53: return "r8"; // max fire + fire res
			case 54: return "r5"; // max cold + cold res
			case 55: return "r7"; // max light + light res
			case 56: return "r6"; // max poison + poison res
			case 57: return ""; // life leech
			case 58: return ""; // mana leech
			case 59: return ""; // AR + light radius
			case 60: return ""; // GF
			case 61: return ""; // increase max life
			case 62: return ""; // reduced curse duration
			case 63: return ""; // chance to pierce
			case 64: return ""; // faster block rate (item_fasterblockrate)
			case 65: return ""; // all attributes
			case 66: return ""; // -target defense (item_fractionaltargetac)
			case 67: return ""; // icreased chance of blocking
			case 68: return ""; // str
			case 69: return ""; // dex
			case 70: return ""; // vitality
			case 71: return ""; // energy
			case 72: return ""; // max all res
			case 73: return ""; // block chance + block speed
			default:
		}
	} else if (current_item_type === 'weapon') {
		switch (the_code) {
			case 1: return "b"; // brick
			case 2: return "c1"; // enhanced damage
			case 3: return "c10"; // AR
			case 4: return "c2"; // life after each hit "item_healafterhit"
			case 5: return "c3"; // demon damage and AR
			case 6: return "c4"; // -requirements
			case 7: return "c5"; // mf
			case 8: return "c6"; // life after each kill
			case 9: return "c7"; // mana after each kill
			case 10: return "c8"; // mana (maxmana)
			case 11: return "c9"; // FHR (weapon)
			case 12: return "m5"; // -enemy fire res
			case 13: return "m2"; // -enemy light res
			case 14: return "m3"; // -enemy cold res
			case 15: return "m4"; // -enemy poison res
			case 16: return "m6"; // FCR (weapon)
			case 17: return "m7"; // Life Leech + Enhanced Damage
			case 18: return "m1"; // AR 200+ (old was attacker takes damage based on char lvl)
			case 19: return "m8"; // deadly strike
			case 20: return "m9"; // IAS
			case 21: return "m10"; // Crushing Blow
			case 22: return "r1"; // enhanced damage + IAS
			case 23: return "r2"; // Increased Attack Speed + Crushing Blow
			case 24: return "r3"; // enhanced damage + Ignore Target Defense
			case 25: return "r4"; // Deadly Strike + enhanced damage
			case 26: return "r5"; // enhanced damage + AR
			case 27: return "r6"; // +1 skill (weapon?)
			case 28: return "r7"; // Fire Damage + Faster Cast Rate
			case 29: return "r8"; // Cold Damage + Faster Cast Rate
			case 30: return "r9"; // light Damage + Faster Cast Rate
			case 31: return "r10"; // Poison Damage + Faster Cast Rate
			case 33: return "c1"; // enhanced defense "item_armor_percent"
			case 34: return ""; // regenerate / replenish life
			case 35: return "c9"; // FHR
			case 36: return ""; // fire res
			case 37: return ""; // cold res
			case 38: return ""; // light res
			case 39: return ""; // poison res
			case 40: return ""; // regenerate / replenish mana
			case 41: return "m1"; // AR 200+ (old was attacker takes damage based on char lvl) ?unconfirmed?
			case 42: return "m6"; // FCR
			case 43: return ""; // increase max life
			case 44: return ""; // FRW
			case 45: return ""; // CBF
			case 46: return ""; // flat PDR
			case 47: return ""; // flat MDR
			case 48: return ""; // indestructible
			case 49: return ""; // indestructible + enhanced defense
			case 50: return "r6"; // +1 skill (shield?)
			case 51: return ""; // all res
			case 52: return ""; // PDR %
			case 53: return ""; // max fire + fire res
			case 54: return ""; // max cold + cold res
			case 55: return ""; // max light + light res
			case 56: return ""; // max poison + poison res
			case 57: return ""; // life leech
			case 58: return ""; // mana leech
			case 59: return ""; // AR + light radius
			case 60: return ""; // GF
			case 61: return ""; // increase max life
			case 62: return ""; // reduced curse duration
			case 63: return ""; // chance to pierce
			case 64: return ""; // faster block rate (item_fasterblockrate)
			case 65: return ""; // all attributes
			case 66: return ""; // -target defense (item_fractionaltargetac)
			case 67: return ""; // icreased chance of blocking
			case 68: return ""; // str
			case 69: return ""; // dex
			case 70: return ""; // vitality
			case 71: return ""; // energy
			case 72: return ""; // max all res
			case 73: return ""; // block chance + block speed
			default:
		}
	}
	return null;
}


app.use(express.urlencoded({
	extended: true
}))
app.use(express.static('public'));

const server = app.listen(7000, () => {
	console.log(`Express running → PORT ${server.address().port}`);
});

//app.get('/', (req, res) => {
	//  res.send('Hello World!');
//	res.render('index');
//});

app.get('/', function (req, res) {
	res.sendFile('views/index.html', {root: __dirname })
});

//app.set('view engine', 'pug');

app.get('/api/options', function(req, res) {
	var Cs = [], Rs = [], Ms = [], Ss = [], b = "";
	let the_break = {
		text: "",
		style: "",
		code: ""
	}
	let all_opts = {
		break: the_break,
		c_opts: [],
		m_opts: [],
		r_opts: [],
		s_opts: []
	}

	if (current_item_type !== '') {
		all_opts.break = {
			text: "b: brick",
			style: "",
			code: "b"
		}

		if (current_bonus === 'b') {
			all_opts.break.style = "bonus_entry";
		}

		if (guesses.has('b')) {
			all_opts.break.text = "<span class=\"my_span\">" + guesses.get('b') + "</span> b: brick";
			if (current_bonus === 'b') {
				all_opts.break.style = "taken_entry bonus_entry";
			} else {
				all_opts.break.style = "taken_entry";
			}
		}

		for (let [key, value] of options.get(current_item_type)) {
			var entry = {
				text: key + ": " + value,
				style: "",
				code: key
			}

			if (current_bonus === key) {
				entry.style = "bonus_entry";
			}

			if (guesses.has(key)) {
				entry.text = "<span class=\"my_span\">" + guesses.get(key) + "</span> " + key + ": " + value;
				if (current_bonus === key) {
					entry.style = "taken_entry bonus_entry";
				} else {
					entry.style = "taken_entry";
				}
			}



			if (key.startsWith('c')) {
				Cs.push(entry);
			} else if (key.startsWith('m')) {
				Ms.push(entry);
			} else if (key.startsWith('r')) {
				Rs.push(entry);
			} else if (key.startsWith('s')) {
				Ss.push(entry);
			}
		}
		all_opts.c_opts = Cs;
		all_opts.m_opts = Ms;
		all_opts.r_opts = Rs;
		all_opts.s_opts = Ss;

		if (block_guesses) {

		} else {
			//console.log("Guesses are still open, please !block first!");
		}
	}
	res.json(all_opts);
});

app.get('/api/standings', function(req, res) {
     res.json(mapToJson(get_sorted_leaderboard()));
});

app.get('/api/header', function(req, res) {
	var header = "";
	if (current_item_type !== '') {
		if (!round_ongoing) {
			header = "Round not started.";
		}
		header = header + " Current item type is '" + current_item_type + "'";
	} else {
		header = "Round not started. Total slams: " + winners.size + " (" + get_total_bricks() + " bricks, " + get_total_no_winner_rounds() + " rounds had no winner)." + get_last_winner();
	}
	
	res.json({
		message: header
    });
});

app.get('/api/admin_status', function(req, res) {
	res.json({
		current_item_type: current_item_type,
		round_ongoing: round_ongoing,
		message: admin_message,
		block_guesses: block_guesses,
		detected_slam_code: detected_slam_code,
		blocked_guesses: blocked_guesses.size
    });
});

app.get('/api/admin_command_get', function(req, res) {
	const reject = () => {
		res.setHeader('www-authenticate', 'Basic');
		res.sendStatus(401);
	}

	const authorization = req.headers.authorization

	if (!authorization) {
		return reject();
	}

	const [username, password] = Buffer.from(authorization.replace('Basic ', ''), 'base64').toString().split(':')

	if (!(username === admin_username && password === admin_password)) {
		return reject();
	}
	console.log('web command received (get)');
	
	//console.log(req.query.command);
	if(req.query.command){
		//	if(req.query.p1 === 'amulet'){
		//		client.say(twitch_channels[0], req.query.item_type);
		//	}
		if(req.query.command.startsWith("!prep")){
			prep(req.query.command, twitch_channels[0]);
		} else if(req.query.command.startsWith("!end_round")){
			client.say(twitch_channels[0], "Forced round end.");
			finishRound();
		} else if(req.query.command.startsWith("!start")){
			start_round(twitch_channels[0]);
		} else if(req.query.command.startsWith("!block")){
			block_guessing(twitch_channels[0]);
		} else if(req.query.command.startsWith("!allow")){
			allow_guessing(twitch_channels[0]);
		} else if(req.query.command.startsWith("!finish")){
			finish_round_command(req.query.command + " " + detected_slam_code, twitch_channels[0]);
		} else if(req.query.command.startsWith("!accept_blocked")){
			accept_blocked_guesses(twitch_channels[0]);
		}
	}
	console.log(req.query);
	
	res.json({
		command_reply: "ok (get)"
    });
});
/*
app.post('/api/admin_command_post', urlencodedparser, function (req, res) {
	const reject = () => {
		res.setHeader('www-authenticate', 'Basic');
		res.sendStatus(401);
	}

	const authorization = req.headers.authorization

	if (!authorization) {
		return reject();
	}

	const [username, password] = Buffer.from(authorization.replace('Basic ', ''), 'base64').toString().split(':')

	if (!(username === admin_username && password === admin_password)) {
		return reject();
	}
	//if(req.query.cmd === 'prep'){
	//	if(req.query.p1 === 'amulet'){
			client.say(twitch_channels[0], "test2");
	//	}
	//}
	console.log('web command received (post)');
	console.log(req.body);
	res.json({
		command_reply: "ok (post)"
    });
});
*/
app.get('/api/restart', function (req, res) {
	const reject = () => {
		res.setHeader('www-authenticate', 'Basic');
		res.sendStatus(401);
	}
	const authorization = req.headers.authorization

	if (!authorization) {
		return reject();
	}
	const [username, password] = Buffer.from(authorization.replace('Basic ', ''), 'base64').toString().split(':')

	if (!(username === admin_username && password === admin_password)) {
		return reject();
	}
	fs.writeFile('dummy.json', ""+Date.now(), function (err) {
		if (err) throw err;
		console.log('Saved!');
	});
	
	admin_message = "restart was initiated, refreshing page in 5 seconds..";
	
	res.json({
		message: admin_message
    });
	(async function () {
		await timer(1700);
		process.exit();
	})();
	
});

app.get('/api/detect_corruption', function (req, res) {
	const reject = () => {
		res.setHeader('www-authenticate', 'Basic');
		res.sendStatus(401);
	}
	const authorization = req.headers.authorization

	if (!authorization) {
		return reject();
	}
	const [username, password] = Buffer.from(authorization.replace('Basic ', ''), 'base64').toString().split(':')

	if (!(username === admin_username && password === admin_password)) {
		return reject();
	}
	console.log(req.query);
	
	var user_input = req.query.item_json;
	corruption_detection_output = "";

	//var result = num1 + num2;
	//console.log("mple. " + user_input);
	var user_input_corrupted_item;
	var corrupted_value = null;
	//current_item_type = "belt";
	detected_slam_code = "";

	if (round_ongoing) {
		if (block_guesses) {
			if (user_input !== "") {
				try {
					user_input_corrupted_item = JSON.parse(user_input);
					for (var i = 0; i < user_input_corrupted_item.stats.length; i++) {
						if (user_input_corrupted_item.stats[i].name == 'corrupted') {
							//console.log(user_input_corrupted_item.stats[i].value)
							corrupted_value = user_input_corrupted_item.stats[i].value;
						}
					}

					if (corrupted_value !== null) {
						//console.log(corrupted_value);
						//console.log(current_item_type);

						var the_slam_code = corruption_code_to_slam_code(corrupted_value);

						if (the_slam_code === "s") {
							the_slam_code = "s" + user_input_corrupted_item.sockets;
						}

						if (the_slam_code !== null && the_slam_code !== undefined && the_slam_code !== "") {
							corruption_detection_output = "detected slam code: " + the_slam_code + " -> " + options.get(current_item_type).get(the_slam_code);
							console.log(corruption_detection_output);
							detected_slam_code = the_slam_code;

						} else {
							corruption_detection_output = "slam code for " + current_item_type + " could not be determined. (corrupted_value=" + corrupted_value + ")";
							console.log(corruption_detection_output);
							console.log(user_input_corrupted_item);
						}

					} else {
						corruption_detection_output = "corruption not detected.";
						console.log(corruption_detection_output);
					}
				} catch (e) {
					corruption_detection_output = "not a valid item json input";
					console.log(corruption_detection_output);
				}
			} else {
				corruption_detection_output = "item input empty!";
			}
		} else {
			corruption_detection_output = "Guesses are still open, please !block first";
			console.log(corruption_detection_output);
		}

	} else {
		corruption_detection_output = "Round not started.";
		console.log(corruption_detection_output);
	}
	
	
	admin_message = corruption_detection_output;
	
	res.json({
		message: admin_message
    });
});

app.get('/status', function (req, res) {
	res.sendFile('views/status.html', {root: __dirname })
});

app.get('/admin', function (req, res) {
	const reject = () => {
		res.setHeader('www-authenticate', 'Basic');
		res.sendStatus(401);
	}

	const authorization = req.headers.authorization

	if (!authorization) {
		return reject();
	}

	const [username, password] = Buffer.from(authorization.replace('Basic ', ''), 'base64').toString().split(':')

	if (!(username === admin_username && password === admin_password)) {
		return reject();
	}

	res.sendFile('views/admin.html', {root: __dirname })
});