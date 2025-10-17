'use server';

/**
 * @fileOverview Generates restock suggestions based on minimum stock levels and consumption data.
 *
 * - generateRestockSuggestions - A function that generates restock suggestions.
 * - GenerateRestockSuggestionsInput - The input type for the generateRestockSuggestions function.
 * - GenerateRestockSuggestionsOutput - The return type for the generateRestockSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRestockSuggestionsInputSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe('The name of the item.'),
      itemId: z.string().describe('Unique identifier for the item.'),
      description: z.string().describe('A description of the item.'),
      location: z.string().describe('The storage location of the item.'),
      currentStock: z.number().describe('The current stock level of the item.'),
      minimumStock: z.number().describe('The minimum stock level of the item.'),
      consumptionRate: z
        .number()
        .describe('The rate at which the item is consumed (e.g., units per week).'),
      unit: z.string().describe('The unit of measure for the item (e.g., kg, box, item).'),
    })
  ).describe('A list of items to generate restock suggestions for.'),
});
export type GenerateRestockSuggestionsInput = z.infer<typeof GenerateRestockSuggestionsInputSchema>;

const GenerateRestockSuggestionsOutputSchema = z.object({
  restockSuggestions: z.array(
    z.object({
      itemId: z.string().describe('The ID of the item to restock.'),
      itemName: z.string().describe('The name of the item to restock.'),
      quantityToOrder: z
        .number()
        .describe('The suggested quantity to order to reach optimal stock level.'),
      reason: z.string().describe('The reasoning behind the restock suggestion.'),
      unit: z.string().describe('The unit of measure for the item (e.g., kg, box, item).'),
    })
  ).describe('A list of restock suggestions.'),
});
export type GenerateRestockSuggestionsOutput = z.infer<typeof GenerateRestockSuggestionsOutputSchema>;

export async function generateRestockSuggestions(input: GenerateRestockSuggestionsInput): Promise<GenerateRestockSuggestionsOutput> {
  return generateRestockSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRestockSuggestionsPrompt',
  input: {schema: GenerateRestockSuggestionsInputSchema},
  output: {schema: GenerateRestockSuggestionsOutputSchema},
  prompt: `You are a warehouse management expert. Analyze the current stock levels, minimum stock levels, and consumption rates of the following items to generate restock suggestions. Provide a quantity to order and a brief reason for each suggestion. Make sure the quantity is in the same unit as the item.

Items:
{{#each items}}
- Item ID: {{itemId}}
  Name: {{name}}
  Description: {{description}}
  Location: {{location}}
  Current Stock: {{currentStock}} {{unit}}
  Minimum Stock: {{minimumStock}} {{unit}}
  Consumption Rate: {{consumptionRate}} {{unit}} per week
{{/each}}

Restock Suggestions (JSON format):
`,
});

const generateRestockSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateRestockSuggestionsFlow',
    inputSchema: GenerateRestockSuggestionsInputSchema,
    outputSchema: GenerateRestockSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
