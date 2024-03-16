// Import necessary modules
const axios = require('axios');
const he = require('he');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Initialize global variables
let timerExpired = false; // Flag to track timer expiration
let collector; // Collector for button interactions
let buttonPressCount = {}; // Object to track button press counts

//Function to fetch a trivia question for the API
const fetchTriviaQuestion = async (triviaApiUrl, categoryOption, difficultyOption, typeOption) => {
    //Construct API URL with parameters
    let apiUrlWithParams = `${triviaApiUrl}?amount=1`;
    if (categoryOption) apiUrlWithParams += `&category=${categoryOption}`;
    if (difficultyOption) apiUrlWithParams += `&difficulty=${difficultyOption}`;
    if (typeOption) apiUrlWithParams += `&type=${typeOption}`;

    //Send GET request to the API and return the first question from the response 
    const response = await axios.get(apiUrlWithParams);
    return response.data.results[0];
};

//Function to shuffle an array
const shuffleArray = (array) => {
    //Loop through the array and shuffle its elements
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements at indices i and j
    }
    return array; // Return the shuffled array
};

//Function to build the action row for the trivia question
const buildActionRow = (question, shuffledOptions) => {
    const isBooleanQuestion = question.type === 'boolean'; // Check if the question is boolean

    // If question is boolean, replace options with True and False
    if (isBooleanQuestion) {
        shuffledOptions = ['True', 'False'];
    }
    const correctIndex = shuffledOptions.indexOf(question.correct_answer); // Get the index of the correct answer

    const emojis = ['🇦', '🇧', '🇨', '🇩']; // Emojis for options

    const buttons = shuffledOptions.map((answer, index) => {
        const emoji = emojis[index];
        const customId = index === correctIndex ? 'correct_option' : `option_${index + 1}`; // Set custom ID for buttons
        return new ButtonBuilder()
            .setCustomId(customId)
            .setEmoji(emoji)
            .setStyle(ButtonStyle.Primary);
    });


    return new ActionRowBuilder().addComponents(buttons); // Return the action row with buttons 
};

// Function to build the embed for the trivia question
const buildEmbed = (question, shuffledOptions, remainingTime) => {
    const isBooleanQuestion = question.type === 'boolean'; 

    if (isBooleanQuestion) {
        shuffledOptions = ['True', 'False'];
    }

    const emojis = ['🇦', '🇧', '🇨', '🇩']; 

    const optionsField = shuffledOptions.map((answer, index) => {
        return `${emojis[index]} ${answer}`;
    }).join('\n\n\n'); // Create the options field with emojis
    
    return new EmbedBuilder()
        .setTitle(question.question) // Set title of embed as the question
        .addFields(
            { name: 'Options', value: optionsField }, // Add options field to the embed
            { name: 'Time Remaining', value: remainingTime ? `${Math.ceil(remainingTime / 1000)} seconds` : 'N/A' }, // Add time remaining field to embed
            )
        .setColor('#008080');
};

// Function to update the timer field in the embed
const updateTimerField = async (interaction, embed, remainingTime) => {
    try {
        // Update the value of time remaining field in embed to count down
        embed.data.fields.find(field => field.name === 'Time Remaining').value =
            remainingTime ? `${Math.ceil(remainingTime / 1000)} seconds` : 'N/A';
        await interaction.editReply({ embeds: [embed] }); // Edit the interaction reply with the updated embed
    } catch (error) {
        console.error('Error updating timer field:', error);
    }
};

// Function to handle timer expiration
const handleTimerExpiration = async (interaction, embed, actionRow) => {
    try{
        timerExpired = true; 

        const timeRemainingField = embed.data.fields.find(field => field.name === 'Time Remaining');
        if (timeRemainingField) {
            timeRemainingField.name = "Time's Up!"; 
            timeRemainingField.value = ''; 
        }

        const winners = [];
        //Check if there are winners for the correct option
        if (buttonPressCount.correct_option) {
            // Loop through the winners and add their tags
            for (const userId in buttonPressCount.correct_option) {
                const user = await interaction.guild.members.fetch(userId);
                if (user) {
                    winners.push(`<@${userId}>`);
                }
            }
        }
        // Add winner tags or 'No Winners' to the embed
        if (winners.length > 0) {
            const winnerTags = winners.join('\n');
            embed.addFields({ name: 'Winner(s):', value: winnerTags });
        } else {
            embed.addFields({ name: 'No Winners...', value: '\u200B' });
        }
        
        //Update button labels and styles for action row componenets
        actionRow.components.forEach(button => {
            const buttonCustomId = button.data.custom_id;
            const pressCount = buttonPressCount[buttonCustomId] ? Object.values(buttonPressCount[buttonCustomId]).reduce((acc, val) => acc + val, 0) : 0;
            button.setLabel(`${pressCount}`);
            if (button.data.custom_id === 'correct_option') {
                button.setStyle(ButtonStyle.Success);
            } else {
                button.setStyle(ButtonStyle.Secondary);
            }
            button.setDisabled(true);
        });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    } catch (error) {
        console.error("Error handling timer expiration:", error);
    }
};

//Function to handle trivia interaction
const handleTriviaInteraction = async (interaction, triviaApiUrl, categoryIds) => {
    console.log('Handling trivia interaction...');
    if (!interaction.isCommand() || interaction.commandName !== 'trivia') return;

    if (collector && !collector.ended) {
        collector.stop(); // Stop the collector if it's active
    }


    timerExpired = false; // Reset timer expiration flag
    buttonPressCount = {}; // Reset button press count object
    
    const difficultyOption = interaction.options.getString('difficulty');
    const categoryOption = interaction.options.getString('category');
    const typeOption = interaction.options.getString('type');

    try {
        const question = await fetchTriviaQuestion(triviaApiUrl, categoryOption, difficultyOption, typeOption);
        question.question = he.decode(question.question); 
        question.correct_answer = he.decode(question.correct_answer);
        question.incorrect_answers = question.incorrect_answers.map(answer => he.decode(answer));
        const shuffledOptions = shuffleArray([...question.incorrect_answers, question.correct_answer]);
        const actionRow = buildActionRow(question, shuffledOptions);
        let remainingTime =  25 * 1000; // Set initial remaining time 
        const embed = buildEmbed(question, shuffledOptions, remainingTime);
        const reply = await interaction.reply({ embeds: [embed], components: [actionRow] });

        collector = interaction.channel.createMessageComponentCollector({ type: 'BUTTON', time: 60000 });

        const userClicks = {};

        const timerInterval = setInterval(() => {
            remainingTime -= 1000;
            if (remainingTime <= 0) {
                clearInterval(timerInterval); // Clear timer interval if time is up
                handleTimerExpiration(interaction, embed, actionRow);
            } else {
                updateTimerField(interaction, embed, remainingTime);
            }
        }, 1000); // Run every second

        // Event listener for button click
        collector.on('collect', async (buttonInteraction) => {
            console.log('Interaction collected:', buttonInteraction.customId, buttonInteraction.message.id);
            
            const chosenOption = buttonInteraction.customId;
            const userId = buttonInteraction.user.id;

            if (userClicks[userId]) {
                await buttonInteraction.reply({ content: 'You have already selected an option for this question.', ephemeral: true });
                return;
            };

            userClicks[userId] = true; // Mark user as clicked

            buttonPressCount[chosenOption] = buttonPressCount[chosenOption] || {};
            buttonPressCount[chosenOption][userId] = (buttonPressCount[chosenOption][userId] || 0) + 1;

            let totalParticipants = 0;
            let participantTags = '';
            for (const option in buttonPressCount) {
                for (const userId in buttonPressCount[option]) {
                    const user = await buttonInteraction.guild.members.fetch(userId);
                    if (user) {
                        participantTags += `<@${userId}>\n`; // Add participant tag to list
                        totalParticipants++;
                    }
                }
            }
    
            const description = `**Total Participants:** ${totalParticipants}\n\n${participantTags}`;
            embed.setDescription(description);
    
            await buttonInteraction.update({
                embeds: [embed],
                components: [actionRow],
            });
        });

        collector.on('end', () => {
        });
    } catch (error) {
        console.error('Error fetching trivia questions:', error);
        await interaction.reply('Oops! Something went wrong while fetching the trivia question.');
    }
};

// Export handleTriviaInteraction function for external use
module.exports = { handleTriviaInteraction };
