import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await genai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: [text],
      config: {
        outputDimensionality: 768,
      }
    });
    
    if (!response.embeddings || response.embeddings.length === 0) {
      throw new Error('No embedding returned from Gemini API');
    }
    
    const values = response.embeddings[0].values;
    if (!values) {
      throw new Error('Gemini embedding response did not include values');
    }

    return values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}
