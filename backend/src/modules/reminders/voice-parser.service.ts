import { VoiceMedicationLlmOutput, VoiceMedicationLlmOutputSchema } from "@companion/shared";

/**
 * Service that transforms spoken transcripts from senior citizens into strict, validated JSON
 * using Groq's ultra-low-latency LLM inference engine (Llama 3.3 70B Versatile).
 */
export class VoiceMedicineParserService {
  /**
   * Parse natural speech input into structured medication schedule.
   */
  public static async parseSpokenInstruction(
    spokenTranscript: string,
    seniorName: string = "Sir/Ma'am"
  ): Promise<VoiceMedicationLlmOutput> {
    const groqKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    if (groqKey) {
      try {
        console.log(`[Groq] Parsing voice instruction using model ${model}...`);
        return await this.callGroqApi(spokenTranscript, seniorName, groqKey, model);
      } catch (err) {
        console.warn("[Groq] API call failed, falling back to smart heuristic parser:", err);
      }
    }

    // Smart heuristic fallback
    return this.fallbackHeuristicParser(spokenTranscript, seniorName);
  }

  private static async callGroqApi(
    transcript: string,
    seniorName: string,
    apiKey: string,
    model: string
  ): Promise<VoiceMedicationLlmOutput> {
    const systemPrompt = `You are an empathetic medical assistant for an elderly support platform.
Your task is to parse spoken voice instructions from senior citizens about their medicines into strict JSON.

Output JSON MUST strictly follow this structure:
{
  "medicationName": "Exact name of the medication or description if unnamed (e.g. Paracetamol, Metformin, Blood Pressure Tablet)",
  "dosage": "Specific dosage or count (e.g. 500mg, 1 tablet, 10ml, 1 dose). If not mentioned, ALWAYS default to '1 tablet' or '1 dose'. NEVER leave empty!",
  "scheduleType": "daily" | "weekly" | "as_needed",
  "targetTimes": ["HH:MM"], // In 24-hour format, e.g. ["17:00"] for 5 PM, ["09:00"] for 9 AM.
  "mealRelation": "BEFORE_MEAL" | "AFTER_MEAL" | "WITH_MEAL" | "INDEPENDENT",
  "mealName": ["breakfast" | "lunch" | "dinner"],
  "instructions": "Any extra notes like 'take with water' or 'after food'",
  "seniorConfirmationPhrase": "A warm, respectful spoken sentence addressed to the senior in second person confirming the exact schedule and asking for their confirmation."
}

CRITICAL TIME EXTRACTION RULES:
- If senior mentions '5 pm', '5:00 pm', '5pm', 'evening 5', 'sham ko 5 baje', 'shaam 5 baje', targetTimes MUST be ["17:00"].
- ALWAYS convert 12-hour spoken times to 24-hour HH:MM format:
  * 1 PM / 1 baje dophar -> "13:00"
  * 2 PM / 2 baje -> "14:00"
  * 3 PM / 3 baje -> "15:00"
  * 4 PM / 4 baje -> "16:00"
  * 5 PM / 5 baje shaam -> "17:00"
  * 6 PM / 6 baje shaam -> "18:00"
  * 7 PM / 7 baje shaam -> "19:00"
  * 8 PM / 8 baje raat -> "20:00"
  * 9 PM / 9 baje raat -> "21:00"
  * 10 PM / 10 baje raat -> "22:00"
  * 6 AM / 6 baje subah -> "06:00"
  * 7 AM / 7 baje subah -> "07:00"
  * 8 AM / 8 baje subah -> "08:00"
  * 9 AM / 9 baje subah -> "09:00"
  * 10 AM / 10 baje subah -> "10:00"
- ONLY default to "09:00" if the senior explicitly says "morning" or "breakfast" / "nashta" without specifying another hour.
- ONLY default to "21:00" if the senior explicitly says "night" or "dinner" / "raat ka khana" without specifying another hour.
- If senior omits dosage (e.g. just says 'take Paracetamol at 5 pm' or '5 baje goli leni hai'), ALWAYS set dosage to "1 tablet" or "1 dose". NEVER leave it blank!
- Extract clean medicine names (e.g. if spoken 'Paracetamol 500mg at 5 pm', medicationName is 'Paracetamol').
- Output MUST be valid JSON only.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Senior Citizen: ${seniorName}\nSpoken request: "${transcript}"` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content returned from Groq");
    }

    const parsed = JSON.parse(content);

    // Sanitize before validation to prevent unnecessary schema rejections
    if (!parsed.dosage || typeof parsed.dosage !== "string" || parsed.dosage.trim() === "") {
      parsed.dosage = "1 dose";
    }
    if (!parsed.medicationName || typeof parsed.medicationName !== "string" || parsed.medicationName.trim() === "") {
      parsed.medicationName = "Prescribed Medicine";
    }
    if (!Array.isArray(parsed.targetTimes) || parsed.targetTimes.length === 0) {
      parsed.targetTimes = ["09:00"];
    }

    return VoiceMedicationLlmOutputSchema.parse(parsed);
  }

  /**
   * Deterministic parser for testing when API is unavailable.
   */
  private static fallbackHeuristicParser(
    transcript: string,
    seniorName: string
  ): VoiceMedicationLlmOutput {
    const lower = transcript.toLowerCase();

    const dosageMatch = lower.match(/(\d+\s*(mg|ml|tablets?|capsules?|pills?))/);
    const dosage = dosageMatch ? dosageMatch[0] : "1 dose";

    let medName = "Prescribed Medicine";
    if (lower.includes("paracetamol")) medName = "Paracetamol";
    else if (lower.includes("metformin")) medName = "Metformin";
    else if (lower.includes("telmisartan")) medName = "Telmisartan";
    else if (lower.includes("bp") || lower.includes("blood pressure")) medName = "Blood Pressure Tablet";
    else if (lower.includes("sugar") || lower.includes("diabetes")) medName = "Diabetes Medicine";
    else if (lower.includes("aspirin")) medName = "Aspirin";
    else if (lower.includes("atorvastatin")) medName = "Atorvastatin";
    else {
      const cleaned = transcript
        .replace(/remind me to take|take|lena hai|leni hai|at|baje|subah|shaam|sham|raat|pm|am/gi, "")
        .trim();
      const words = cleaned.split(/\s+/).filter(Boolean);
      medName = words.length > 0 ? words.slice(0, 3).join(" ") : "Prescribed Medicine";
    }

    let mealRelation: "BEFORE_MEAL" | "AFTER_MEAL" | "WITH_MEAL" | "INDEPENDENT" = "INDEPENDENT";
    let mealName: string[] = [];
    if (lower.includes("after breakfast") || lower.includes("nashte ke baad") || lower.includes("nashta ke baad")) {
      mealRelation = "AFTER_MEAL";
      mealName = ["breakfast"];
    } else if (lower.includes("before breakfast") || lower.includes("nashte se pehle")) {
      mealRelation = "BEFORE_MEAL";
      mealName = ["breakfast"];
    } else if (lower.includes("after dinner") || lower.includes("after food") || lower.includes("khane ke baad")) {
      mealRelation = "AFTER_MEAL";
      mealName = ["dinner"];
    }

    const targetTimes: string[] = [];
    const timeMatch = lower.match(/(\d{1,2})\s*(am|pm|p\.m\.|a\.m\.)/i);
    const bajeMatch = lower.match(/(\d{1,2})\s*(?:baje|o'?clock)/i);
    const bareNumMatch = lower.match(/(?:at|around)\s*(\d{1,2})/i);

    const isEveningOrNight =
      lower.includes("pm") ||
      lower.includes("shaam") ||
      lower.includes("sham") ||
      lower.includes("evening") ||
      lower.includes("raat") ||
      lower.includes("night");

    const isMorning =
      lower.includes("am") ||
      lower.includes("subah") ||
      lower.includes("morning") ||
      lower.includes("breakfast") ||
      lower.includes("nashta");

    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const isPm = timeMatch[2].toLowerCase().includes("pm");
      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
      targetTimes.push(`${hour.toString().padStart(2, "0")}:00`);
    } else if (bajeMatch) {
      let hour = parseInt(bajeMatch[1], 10);
      if (isEveningOrNight && hour < 12) hour += 12;
      else if (!isMorning && hour >= 1 && hour <= 6) hour += 12; // e.g. 5 baje -> 17:00
      targetTimes.push(`${hour.toString().padStart(2, "0")}:00`);
    } else if (bareNumMatch) {
      let hour = parseInt(bareNumMatch[1], 10);
      if (isEveningOrNight && hour < 12) hour += 12;
      else if (!isMorning && hour >= 1 && hour <= 6) hour += 12;
      targetTimes.push(`${hour.toString().padStart(2, "0")}:00`);
    } else if (mealName.includes("breakfast") || isMorning) {
      targetTimes.push("09:00");
    } else if (mealName.includes("dinner") || isEveningOrNight) {
      targetTimes.push("21:00");
    } else {
      targetTimes.push("09:00");
    }

    const displayTime = targetTimes[0] || "09:00";
    const spokenConfirmation = `Hello ${seniorName}, I have noted your ${medName} (${dosage}) at ${displayTime}. Would you like to confirm and save this reminder?`;

    return VoiceMedicationLlmOutputSchema.parse({
      medicationName: medName,
      dosage,
      scheduleType: "daily",
      targetTimes,
      mealRelation,
      mealName: mealName.length > 0 ? mealName : undefined,
      instructions: "Take with water as directed.",
      seniorConfirmationPhrase: spokenConfirmation
    });
  }
}
