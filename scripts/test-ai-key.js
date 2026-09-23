const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testKey() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

    if (!apiKey) {
        console.error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
        process.exitCode = 1;
        return;
    }

    try {
        if (!GoogleGenerativeAI) {
            throw new Error("GoogleGenerativeAI module not found");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent("Say hello to Amrit Milk!");
        const response = result.response;
        const text = response.text();
        console.log("Success! Response:", text);
    } catch (error) {
        console.error("Error:", error.message);
        if (error.status) console.error("Status:", error.status);
    }
}

testKey();
