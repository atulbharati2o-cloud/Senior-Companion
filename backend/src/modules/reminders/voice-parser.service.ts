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
  "medicationName": "Exact name of the medication or description if unnamed (e.g. Metformin, Blood Pressure Tablet)",
  "dosage": "Specific dosage or count (e.g. 500mg, 1 tablet, 10ml)",
  "scheduleType": "daily" | "weekly" | "as_needed",
  "targetTimes": ["HH:MM"], // In 24-hour format, e.g. ["09:00"] or ["09:00", "21:00"]
  "mealRelation": "BEFORE_MEAL" | "AFTER_MEAL" | "WITH_MEAL" | "INDEPENDENT",
  "mealName": ["breakfast" | "lunch" | "dinner"],
  "instructions": "Any extra notes like 'take with water' or 'after food'",
  "seniorConfirmationPhrase": "A warm, respectful spoken sentence addressed to the senior in second person confirming the exact schedule and asking for their confirmation."
}

Default rules:
- If senior says 'after breakfast' or 'nashte ke baad' / 'nashta ke baad', set mealRelation to 'AFTER_MEAL', mealName to ['breakfast'], and targetTimes default to ['09:00'].
- If senior says 'after dinner' or 'raat ke khane ke baad' / 'dinner ke baad', set mealRelation to 'AFTER_MEAL', mealName to ['dinner'], and targetTimes default to ['21:00'].
- If senior mentions specific times like '8 am', targetTimes is ['08:00'].
- Extract clean medicine names (e.g. if spoken 'ek Telmisartan 40mg', medicationName is 'Telmisartan').
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
    if (lower.includes("metformin")) medName = "Metformin";
    else if (lower.includes("telmisartan")) medName = "Telmisartan";
    else if (lower.includes("bp") || lower.includes("blood pressure")) medName = "Blood Pressure Tablet";
    else if (lower.includes("sugar") || lower.includes("diabetes")) medName = "Diabetes Medicine";
    else if (lower.includes("aspirin")) medName = "Aspirin";
    else if (lower.includes("atorvastatin")) medName = "Atorvastatin";
    else {
      const words = transcript.split(/\s+/);
      medName = words.slice(0, 3).join(" ");
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
    const timeMatch = lower.match(/(\d{1,2})\s*(am|pm)/);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const isPm = timeMatch[2] === "pm";
      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
      targetTimes.push(`${hour.toString().padStart(2, "0")}:00`);
    } else if (mealName.includes("breakfast")) {
      targetTimes.push("09:00");
    } else if (mealName.includes("dinner")) {
      targetTimes.push("21:00");
    } else {
      targetTimes.push("09:00");
    }

    const spokenConfirmation = `Hello ${seniorName}, I have noted your ${medName} (${dosage}) at ${targetTimes.join(" and ")}. Please confirm to save this reminder.`;

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
