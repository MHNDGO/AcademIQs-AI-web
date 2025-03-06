import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.AIzaSyD0PI69ctlCFns2sQGXFOiJdnv5p3Qhr1A)

export async function getEmbedding(text) {
    const model = genAI.getGenerativeModel({ model: "text-embedding-gecko" });
    const result = await model.embedContent({ content: text });
    return result.embedding;  // Returns an array of numbers
}
