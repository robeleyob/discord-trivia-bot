// Import necessary modules
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { registerTriviaCommand } = require('./commands');
const { handleTriviaInteraction } = require('./trivia');

// Create new Discord client with specified intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
 });

 // Bot token for authentication
// URL for fetching trivia questions from the API
const triviaApiUrl = "https://opentdb.com/api.php";

// Object mapping category names to their IDs
const categoryIds = {
    "general knowledge": 9,
    "entertainment: books": 10,
    "entertainment: film": 11,
    "entertainment: music": 12,
    "entertainment: musicals & theatres": 13,
    "entertainment: television": 14,
    "entertainment: video games": 15,
    "entertainment: board games": 16,
    "science & nature": 17,
    "science: computers": 18,
    "science: mathematics": 19,
    "mythology": 20,
    "sports": 21,
    "geography": 22,
    "history": 23,
    "politics": 24,
    "art": 25,
    "celebrities": 26,
    "animals": 27,
    "vehicles": 28,
    "entertainment: comics": 29,
    "science: gadgets": 30,
    "entertainment: japanese anime & manga": 31,
    "entertainment: cartoon & animations": 32
};


client.once('ready', async () => {
    await registerTriviaCommand(client, categoryIds);
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async (interaction) => {
    await handleTriviaInteraction(interaction, triviaApiUrl, categoryIds);
});

client.login(process.env.token);