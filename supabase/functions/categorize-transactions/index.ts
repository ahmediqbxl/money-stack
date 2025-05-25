
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions } = await req.json();
    const openAIApiKey = Deno.env.get('open_api_key');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const categorizedTransactions = [];

    for (const transaction of transactions) {
      const prompt = `Categorize this financial transaction into one of these categories: 
      "Food & Dining", "Transportation", "Shopping", "Entertainment", "Bills & Utilities", "Healthcare", "Income", "Transfer", "Other".
      
      Transaction details:
      - Description: ${transaction.description}
      - Amount: $${Math.abs(transaction.amount)}
      - Merchant: ${transaction.merchant || 'Unknown'}
      
      Respond with only the category name, nothing else.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a financial transaction categorization expert. Be precise and consistent.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 50,
        }),
      });

      const data = await response.json();
      const category = data.choices[0].message.content.trim();

      categorizedTransactions.push({
        ...transaction,
        category: category
      });
    }

    return new Response(
      JSON.stringify({ categorizedTransactions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error categorizing transactions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
