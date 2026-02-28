const OPENCLAW_API_KEY = process.env.EXPO_PUBLIC_OPENCLAW_API_KEY ?? "";
const OPENCLAW_PHONE_ID = process.env.EXPO_PUBLIC_OPENCLAW_PHONE_ID ?? "";

export async function sendWhatsAppAlert(
  toPhoneNumber: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch("https://api.openclaw.com/v1/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENCLAW_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_id: OPENCLAW_PHONE_ID,
        to: toPhoneNumber,
        message,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("OpenClaw error:", error);
    return false;
  }
}
