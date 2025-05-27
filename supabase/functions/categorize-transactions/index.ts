
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

    console.log('Processing', transactions.length, 'transactions');
    
    // Batch all transactions into a single API call to avoid rate limits
    const transactionDescriptions = transactions.map((t: any) => 
      `- ${t.description} ($${Math.abs(t.amount)}) at ${t.merchant || 'Unknown'}`
    ).join('\n');

    const prompt = `Categorize these financial transactions into one of these categories: 
    "Food & Dining", "Transportation", "Shopping", "Entertainment", "Bills & Utilities", "Healthcare", "Income", "Transfer", "Other".
    
    Transactions:
    ${transactionDescriptions}
    
    Respond with ONLY a JSON array where each object has "description" and "category" fields. Match the description exactly as provided. Do not include any markdown formatting or code blocks.
    
    Example format:
    [
      {"description": "Metro Grocery Store", "category": "Food & Dining"},
      {"description": "Uber Trip Downtown", "category": "Transportation"}
    ]`;

    console.log('Making single batch API call to OpenAI');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a financial transaction categorization expert. Always respond with valid JSON only, no markdown formatting.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, response.statusText, errorText);
      
      // Fallback to simple rule-based categorization if OpenAI fails
      console.log('Falling back to rule-based categorization');
      const categorizedTransactions = transactions.map((transaction: any) => {
        const description = transaction.description.toLowerCase();
        const merchant = (transaction.merchant || '').toLowerCase();
        
        let category = 'Other';
        
        if (description.includes('grocery') || description.includes('food') || merchant.includes('restaurant') || merchant.includes('tim hortons') || merchant.includes('mcdonald') || description.includes('metro')) {
          category = 'Food & Dining';
        } else if (description.includes('uber') || description.includes('taxi') || description.includes('transit') || description.includes('gas') || merchant.includes('shell') || description.includes('ttc')) {
          category = 'Transportation';
        } else if (description.includes('amazon') || description.includes('shop') || merchant.includes('canadian tire') || description.includes('target')) {
          category = 'Shopping';
        } else if (description.includes('netflix') || description.includes('spotify') || description.includes('entertainment')) {
          category = 'Entertainment';
        } else if (description.includes('hydro') || description.includes('bell') || description.includes('rogers') || description.includes('utility') || description.includes('bill')) {
          category = 'Bills & Utilities';
        } else if (description.includes('pharmacy') || description.includes('drug mart') || description.includes('medical')) {
          category = 'Healthcare';
        } else if (description.includes('deposit') || description.includes('salary') || description.includes('payroll') || transaction.amount > 0) {
          category = 'Income';
        }
        
        return {
          ...transaction,
          category: category
        };
      });

      return new Response(
        JSON.stringify({ categorizedTransactions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('OpenAI response received successfully');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    let responseContent = data.choices[0].message.content.trim();
    console.log('OpenAI response content:', responseContent);

    // Clean up markdown formatting if present
    if (responseContent.startsWith('```json')) {
      responseContent = responseContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (responseContent.startsWith('```')) {
      responseContent = responseContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let categorizations;
    try {
      // Try to parse the cleaned JSON response
      categorizations = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Response content was:', responseContent);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Match categorizations with original transactions
    const categorizedTransactions = transactions.map((transaction: any) => {
      const match = categorizations.find((cat: any) => 
        cat.description === transaction.description
      );
      
      return {
        ...transaction,
        category: match ? match.category : 'Other'
      };
    });

    console.log('Successfully categorized', categorizedTransactions.length, 'transactions');

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
