const { ApplicationCommandOptionType } = require('discord.js');

const registerTriviaCommand = async (client, categoryIds) => {
    try {
        const command = await client.application.commands.create({
            name: 'trivia',
            description: 'Get a trivia question.',
            options: [
                {
                    name: 'difficulty',
                    description: 'The difficulty level of the trivia question.',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                    choices: [
                        { name: 'Easy', value: 'easy' },
                        { name: 'Medium', value: 'medium' },
                        { name: 'Hard', value: 'hard' },
                    ],
                },
                {
                    name: 'category',
                    description: 'The category of the trivia question.',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                    choices: Object.entries(categoryIds).map(([name, value]) => ({ name, value: value.toString() }))
                },
                {
                    name: 'type',
                    description: 'The type of the trivia question.',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                    choices: [
                        { name: 'Multiple Choice', value: 'multiple' },
                        { name: 'True/False', value: 'boolean' },
                    ]
                }
            ]
        });
        console.log(`Created command: ${command.name}`);
    } catch (error) {
        console.error('Error creating command:', error);
    }
};

module.exports = { registerTriviaCommand };