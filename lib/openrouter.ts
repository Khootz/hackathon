const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? "";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(
  messages: Message[],
  model: string = "deepseek/deepseek-chat"
): Promise<string> {
  const response = await fetch(OPENROUTER_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://auramax.app",
      "X-Title": "AuraMax",
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function generateQuiz(
  subject: string,
  interest: string,
  age: number = 13
) {
  const prompt = `Generate a fun, engaging ${subject} quiz for a ${age}-year-old who loves ${interest}. 
Use metaphors and scenarios from ${interest}. Return JSON only (no markdown): {title: string, questions: [{q: string, options: string[], answer: number, explanation: string}]}`;

  const response = await chatCompletion([
    {
      role: "system",
      content:
        "You are an educational content creator. Always respond with valid JSON only, no markdown formatting.",
    },
    { role: "user", content: prompt },
  ]);

  return JSON.parse(response);
}
