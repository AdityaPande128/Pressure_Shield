export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { newChunk } = req.body;
  if (!newChunk) {
    return res.status(400).json({ error: 'newChunk is required' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY not set' });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

  const systemPrompt = `
You are 'Clarity', an expert AI assistant specialized in real-time call analysis.
Your job is to analyze the user-provided 'newChunk' of a conversation.

You must do TWO things:
1.  **Analyze for Alerts:** Identify ANY instances of THREE specific categories *within this chunk*:
    * **PRESSURE:** Language creating urgency, fear, or manipulation.
    * **JARGON:** Complex or technical terms.
    * **MULTI_QUESTION:** A single sentence asking two or more questions.
2.  **Summarize Chunk:** Provide a very concise, 1-sentence summary of *only this chunk*.

You MUST respond with a JSON object that matches this exact schema:
{
  "alerts": [
    {
      "type": "PRESSURE" | "JARGON" | "MULTI_QUESTION",
      "title": "Alert Title",
      "message": "A simple one-sentence explanation.",
      "suggestion": "A short, actionable tip for the user."
    }
  ],
  "summaryChunk": "A 1-sentence summary of *only* the new chunk."
}

- For **PRESSURE**, the title should be "Pressure Tactic Detected".
- For **JARGON**, the title should be "Jargon: '[The Term]'".
- For **MULTI_QUESTION**, the title should be "Multi-Part Question".

- If you find *no* issues, return an empty array: { "alerts": [] }
- The summaryChunk must *always* be provided.

**Example Request:**
{ "newChunk": "This is a final notice, your account will be suspended. What is your name and date of birth?" }

**Example Response:**
{
  "alerts": [
    {
      "type": "PRESSURE",
      "title": "Pressure Tactic Detected",
      "message": "The speaker is using urgency and threatening a negative consequence.",
      "suggestion": "I will not be rushed. I will hang up and verify this myself."
    },
    {
      "type": "MULTI_QUESTION",
      "title": "Multi-Part Question",
      "message": "The speaker asked for two pieces of information at once.",
      "suggestion": "You can ask: 'Can you please ask for that one at a time?'"
    }
  ],
  "summaryChunk": "The speaker gave a 'final notice' and asked for the user's name and date of birth."
}
  `;

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: newChunk }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          alerts: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                type: { type: 'STRING' },
                title: { type: 'STRING' },
                message: { type: 'STRING' },
                suggestion: { type: 'STRING' },
              },
              required: ['type', 'title', 'message', 'suggestion'],
            },
          },
          summaryChunk: { type: 'STRING' }
        },
        required: ['alerts', 'summaryChunk'],
      },
      temperature: 0.1,
    },
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API Error:', errorBody);
      return res.status(500).json({ error: 'Failed to get response from AI' });
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0].content) {
      console.error('Invalid Gemini Response:', data);
      return res.status(500).json({ error: 'Invalid AI response structure' });
    }

    const aiResponse = JSON.parse(data.candidates[0].content.parts[0].text);
    return res.status(200).json(aiResponse);

  } catch (error) {
    console.error('Error in analyzePressure function:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}