
import readlineSync from "readline-sync";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI
const ai = new GoogleGenAI({
  apiKey: "your key",
});

const History = [];
// 1. Sum function
function sum(num1, num2) {
  return num1 + num2;
}

// 2. Prime number function
function prime(num) {
  if (num < 2) {
    return false;
  }

  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) {
      return false;
    }
  }

  return true;
}

// 3. Crypto price function
async function getCryptoprice(coin) {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      coin
    )}&vs_currencies=usd`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch crypto price");
  }

  const data = await response.json();

  return data;
}

// Function declarations for Gemini
const sumDeclaration = {
  type: "function",
  name: "sum",
  description: "Calculate the sum of two numbers.",
  parameters: {
    type: "object",
    properties: {
      num1: {
        type: "number",
        description: "The first number.",
      },
      num2: {
        type: "number",
        description: "The second number.",
      },
    },
    required: ["num1", "num2"],
  },
};

const primeDeclaration = {
  type: "function",
  name: "prime",
  description: "Check whether a number is prime.",
  parameters: {
    type: "object",
    properties: {
      num: {
        type: "number",
        description: "The number to check.",
      },
    },
    required: ["num"],
  },
};

const cryptoDeclaration = {
  type: "function",
  name: "getCryptoprice",
  description: "Get the current cryptocurrency price in USD.",
  parameters: {
    type: "object",
    properties: {
      coin: {
        type: "string",
        description:
          "The CoinGecko coin ID, such as bitcoin or ethereum.",
      },
    },
    required: ["coin"],
  },
};

// Available functions
const availableFunctions = {
  sum: ({ num1, num2 }) => sum(num1, num2),

  prime: ({ num }) => prime(num),

  getCryptoprice: ({ coin }) => getCryptoprice(coin),
};

// Run AI Agent

async function runAgent(userProblem) {

  // Push user message into history
  History.push({
    role: "user",
    content: userProblem,
  });

  let interaction = await ai.interactions.create({
    model: "gemini-3.6-flash",
    input: userProblem,
    tools: [
      sumDeclaration,
      primeDeclaration,
      cryptoDeclaration,
    ],
  });

  while (true) {
    const functionCalls = (interaction.steps ?? []).filter(
      (step) => step.type === "function_call"
    );

    if (functionCalls.length === 0) {
      const responseText = interaction.output_text;

      // Push AI response into history
      History.push({
        role: "assistant",
        content: responseText,
      });

      return responseText;
    }

    const functionResults = await Promise.all(
      functionCalls.map(async (call) => {

        const result = await availableFunctions[call.name](
          call.arguments
        );

        // Push function result into history
        History.push({
          role: "tool",
          name: call.name,
          content: JSON.stringify(result),
        });

        return {
          type: "function_result",
          name: call.name,
          call_id: call.id,
          result: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      })
    );

    interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      previous_interaction_id: interaction.id,
      input: functionResults,
      tools: [
        sumDeclaration,
        primeDeclaration,
        cryptoDeclaration,
      ],
    });
  }
}


// Main function

async function main() {
  console.log("🤖 Gemini AI Agent Started!");
  console.log("Type 'exit' to stop the agent.\n");

  while (true) {
    try {
      const userProblem = readlineSync.question(
        "You: "
      );

      // Exit condition
      if (userProblem.toLowerCase() === "exit") {
        console.log("AI Agent Stopped. Goodbye!");
        break;
      }

      // Run AI Agent
      const response = await runAgent(userProblem);

      console.log("\nAI:", response);
      console.log("\n----------------------------\n");

    } catch (error) {
      console.error("Error:", error.message);
    }
  }
}

main();
