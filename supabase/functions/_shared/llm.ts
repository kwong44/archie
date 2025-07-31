import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.12.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

/**
 * A generic function to call the Google Gemini API with a given prompt and schema.
 * It handles the API key, model initialization, content generation, and response parsing.
 *
 * @param prompt The prompt to send to the AI model.
 * @param schema A Zod schema to validate the structure of the AI's JSON response.
 * @returns A promise that resolves with the validated data from the AI's response.
 */
export async function callGemini<T extends z.ZodType<any, any>>(prompt: string, schema: T): Promise<z.infer<T>> {
  // 1. Get the API key from environment variables
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables.");
  }

  // 2. Initialize the Generative AI client
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  // 3. Call the model and get the response
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // 4. Clean and parse the JSON response
  // The Gemini API with JSON mode still sometimes includes markdown backticks
  const cleanedJsonString = responseText.replace(/```json|```/g, '').trim();
  const aiResponse = JSON.parse(cleanedJsonString);

  // 5. Validate the response against the provided schema
  const validatedData = schema.parse(aiResponse);

  return validatedData;
}
