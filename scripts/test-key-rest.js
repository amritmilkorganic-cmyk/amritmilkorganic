const https = require("https");

const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
const MODEL = "gemini-1.5-flash";

if (!API_KEY) {
    console.error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
    process.exit(1);
}

const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const data = JSON.stringify({
    contents: [
        {
            parts: [{ text: "Hello, are you working?" }],
        },
    ],
});

const options = {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
    },
};

console.log("Testing API Key via REST...");

const req = https.request(URL, options, (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
        console.log(`Status Code: ${res.statusCode}`);
        if (res.statusCode === 200) {
            console.log("Success! Response:", body);
        } else {
            console.error("Error Response:", body);
        }
    });
});

req.on("error", (error) => {
    console.error("Request Error:", error);
});

req.write(data);
req.end();
