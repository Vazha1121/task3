const crypto = require('crypto');
const readline = require('readline');

class FairRandom {
    static generateKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    static generateHMAC(key, value) {
        return crypto.createHmac('sha3-256', key).update(value.toString()).digest('hex');
    }

    static getFairRandom(range, key) {
        const randomValue = crypto.randomInt(range);
        return { value: randomValue, hmac: this.generateHMAC(key, randomValue) };
    }
}

class Dice {
    constructor(sides) {
        if (!Array.isArray(sides) || sides.length !== 6 || sides.some(x => !Number.isInteger(x) || x < 1)) {
            throw new Error("Each dice must have exactly 6 integer sides greater than 0.");
        }
        this.sides = sides;
    }

    roll(index) {
        return this.sides[index % this.sides.length];
    }
}

class DiceGame {
    constructor(args) {
        if (args.length < 3) throw new Error("At least 3 dice configurations must be provided.");
        this.diceOptions = args.map(arg => new Dice(arg.split(',').map(Number)));
        this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        this.scores = { user: 0, computer: 0 };
    }

    async getUserInput(prompt) {
        return new Promise(resolve => this.rl.question(prompt, resolve));
    }

    async determineFirstMove() {
        const key = FairRandom.generateKey();
        const { value, hmac } = FairRandom.getFairRandom(2, key);
        console.log(`I selected a random value in the range 0..1 (HMAC=${hmac}).`);
        let userGuess = await this.getUserInput("Try to guess my selection (0 or 1): ");
        userGuess = parseInt(userGuess);
        console.log(`My selection: ${value} (KEY=${key}).`);
        return userGuess === value ? 'user' : 'computer';
    }

    async chooseDice(player) {
        console.log(`Choose your dice:`);
        this.diceOptions.forEach((dice, index) => console.log(`${index} - [${dice.sides.join(',')}]`));
        let choice;
        do {
            choice = await this.getUserInput("Your selection: ");
            choice = parseInt(choice);
        } while (isNaN(choice) || choice < 0 || choice >= this.diceOptions.length);
        console.log(`${player} chose dice: [${this.diceOptions[choice].sides.join(',')}]`);
        return this.diceOptions[choice];
    }

    async playRound(playerDice, computerDice) {
        const key = FairRandom.generateKey();
        const { value, hmac } = FairRandom.getFairRandom(6, key);
        console.log(`I selected a random value in the range 0..5 (HMAC=${hmac}).`);
        let userNumber;
        do {
            userNumber = await this.getUserInput("Add your number modulo 6 (0-5): ");
            userNumber = parseInt(userNumber);
        } while (isNaN(userNumber) || userNumber < 0 || userNumber > 5);
        console.log(`My number is ${value} (KEY=${key}).`);
        const finalIndex = (userNumber + value) % 6;
        console.log(`The result is ${userNumber} + ${value} = ${finalIndex} (mod 6).`);

        const userRoll = playerDice.roll(finalIndex);
        const computerRoll = computerDice.roll(finalIndex);
        console.log(`Your throw is ${userRoll}, my throw is ${computerRoll}.`);
        if (userRoll > computerRoll) {
            console.log("You win this round!");
            this.scores.user++;
        } else if (userRoll < computerRoll) {
            console.log("I win this round!");
            this.scores.computer++;
        } else {
            console.log("It's a tie!");
        }
    }

    async playGame() {
        console.log("Starting Non-Transitive Dice Game...");
        let rounds = parseInt(await this.getUserInput("Enter the number of rounds: "));
        for (let i = 0; i < rounds; i++) {
            console.log(`\n--- Round ${i + 1} ---`);
            let firstPlayer = await this.determineFirstMove();
            let userDice, computerDice;
            if (firstPlayer === 'user') {
                userDice = await this.chooseDice("You");
                computerDice = this.diceOptions.find(d => d !== userDice);
            } else {
                computerDice = await this.chooseDice("Computer");
                userDice = this.diceOptions.find(d => d !== computerDice);
            }
            await this.playRound(userDice, computerDice);
        }
        console.log(`Final Scores - You: ${this.scores.user}, Computer: ${this.scores.computer}`);
        console.log(this.scores.user > this.scores.computer ? "Congratulations, you win!" : "I win the game!");
        this.rl.close();
    }
}

try {
    const diceConfigurations = process.argv.slice(2);
    const game = new DiceGame(diceConfigurations);
    game.playGame();
} catch (error) {
    console.error("Error:", error.message);
}
