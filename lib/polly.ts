/**
 * AWS Polly TTS for AuraMax.
 *
 * Uses the Polly SynthesizeSpeech REST API with SigV4 signing.
 * Streams MP3 audio and plays it via expo-av.
 *
 * Voice: "Matthew" (Neural) — natural-sounding male US-English voice.
 */

import { Audio } from "expo-av";
import { File as ExpoFile, Paths } from "expo-file-system";
import { signRequest } from "./awsSigner";

const AWS_REGION = process.env.EXPO_PUBLIC_AWS_REGION ?? "us-east-1";

// Neural voices sound significantly better than standard ones.
const POLLY_VOICE_ID = "Matthew";
const POLLY_ENGINE = "neural";

let currentSound: Audio.Sound | null = null;

/**
 * Speak text aloud using AWS Polly.
 * Automatically stops any previously playing speech.
 */
export async function speak(text: string): Promise<void> {
  // Stop any currently playing audio
  await stopSpeaking();

  const endpoint = `https://polly.${AWS_REGION}.amazonaws.com/v1/speech`;

  const requestBody = JSON.stringify({
    Engine: POLLY_ENGINE,
    LanguageCode: "en-US",
    OutputFormat: "mp3",
    Text: text,
    TextType: "text",
    VoiceId: POLLY_VOICE_ID,
  });

  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const signedHeaders = signRequest(
    "POST",
    endpoint,
    baseHeaders,
    requestBody,
    "polly"
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: signedHeaders,
      body: requestBody,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Polly] Error:", response.status, errText);
      return;
    }

    // Get audio as ArrayBuffer → Uint8Array → write to temp file
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const fileName = `polly_tts_${Date.now()}.mp3`;
    const file = new ExpoFile(Paths.cache, fileName);
    file.create({ overwrite: true });
    file.write(bytes);

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: file.uri },
      { shouldPlay: true, volume: 1.0 }
    );
    currentSound = sound;

    // Clean up when playback finishes
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        currentSound = null;
        // Clean up temp file
        try { file.delete(); } catch { }
      }
    });
  } catch (err) {
    console.error("[Polly] TTS error:", err);
  }
}

/**
 * Stop any currently playing Polly speech.
 */
export async function stopSpeaking(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {
      // Already unloaded
    }
    currentSound = null;
  }
}

/**
 * Check if Polly audio is currently playing.
 */
export function isSpeaking(): boolean {
  return currentSound !== null;
}
