import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

// __dirname replacement for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files (like index.html and client.js)
app.use(express.static(path.join(__dirname, 'public')));

const serverHTTP = http.createServer(app);
const PORT = 3300;
serverHTTP.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

app.post('/test', async (request, response) => {
    console.log('Received a POST request on /test');
    console.log('Request body:', request.body);

    const { prompt } = request.body; // Extract the custom prompt
    console.log('Prompt:', prompt);

    const genAI = new GoogleGenerativeAI("AIzaSyCStV0Frm5aKwUeMzwwS7AODZS64Se3xvQ");

    try {
        // Use the Gemini model to generate content based on the prompt
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();

        console.log('AI Response:', responseText);
        response.json({ aiResponse: responseText }); // Return the response to the client
    } catch (error) {
        console.error('Error during AI generation:', error);
        response.status(500).json({ error: 'Failed to generate AI content' });
    }
});

