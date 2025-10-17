"use server"

import { generateRestockSuggestions, type GenerateRestockSuggestionsInput, type GenerateRestockSuggestionsOutput } from "@/ai/flows/generate-restock-suggestions"

export async function getRestockSuggestionsAction(
  input: GenerateRestockSuggestionsInput
): Promise<GenerateRestockSuggestionsOutput> {
  try {
    const suggestions = await generateRestockSuggestions(input)
    return suggestions
  } catch (error) {
    console.error("Error in getRestockSuggestionsAction:", error)
    throw new Error("Failed to generate restock suggestions.")
  }
}
