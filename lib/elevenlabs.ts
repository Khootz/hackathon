const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ?? "";
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

export async function textToSpeech(
  text: string,
  voiceId: string = "21m00Tcm4TlvDq8ikWAM" // Rachel voice
): Promise<ArrayBuffer> {
  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs error: ${response.status}`);
  }

  return response.arrayBuffer();
}
