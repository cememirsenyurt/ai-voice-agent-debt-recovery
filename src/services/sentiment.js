/**
 * Sentiment Analysis Service
 * 
 * Analyzes call transcripts using Anthropic Claude to evaluate customer sentiment,
 * satisfaction, and call quality - server-side from Vapi webhook data.
 */

const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

const SENTIMENT_PROMPT = `You are an expert customer care quality analyst at a pet grooming business called Pawsome Pet Grooming. Your job is to review phone call transcripts and evaluate the customer's experience.

Analyze the following call transcript between our AI agent (Alex) and a customer. You must provide detailed reasoning for EVERY score and tag you assign.

Evaluate and provide reasoning for:

1. **Overall Sentiment** (1-10): How positive/negative was the customer throughout the call?
   - 1-3: Negative (frustrated, angry, upset)
   - 4-6: Neutral (indifferent, matter-of-fact)
   - 7-10: Positive (happy, satisfied, appreciative)

2. **Customer Satisfaction** (1-10): Based on the conversation, how satisfied is the customer likely to be?

3. **Pain Points**: What issues or frustrations did the customer express?

4. **Positive Moments**: What went well in the call?

5. **Resolution Status**: Was the customer's issue resolved?
   - "resolved" - Customer got what they needed
   - "partial" - Some progress but not fully resolved
   - "unresolved" - Customer left without resolution

6. **Call Outcome Tags**: Select all that apply:
   - "payment_made" - Customer made a payment
   - "booking_made" - Customer booked an appointment
   - "callback_requested" - Customer wants a callback
   - "complaint" - Customer expressed a complaint
   - "price_concern" - Customer had pricing concerns
   - "satisfied_customer" - Customer seemed happy
   - "frustrated_customer" - Customer showed frustration
   - "confused_customer" - Customer seemed confused
   - "returning_customer" - Customer mentioned previous visits

7. **Agent Performance Notes**: Brief feedback on how the AI agent handled the call.

8. **One-Line Summary**: A single sentence summarizing the call sentiment.

CRITICAL: For EVERY score, tag, and point you provide, you MUST include specific evidence from the transcript. Quote the customer's exact words in quotation marks.

ALSO IMPORTANT: Extract customer information if mentioned in the call:
- If the customer states their name, extract it
- If the customer provides their phone number, extract it (format as XXX-XXXX or XXX-XXX-XXXX)

Respond with valid JSON in this exact format:
{
    "extractedCustomerName": "<customer name if mentioned, otherwise null>",
    "extractedCustomerPhone": "<phone number if mentioned, otherwise null>",
    "overallSentiment": <number 1-10>,
    "customerSatisfaction": <number 1-10>,
    "painPoints": ["point1", "point2"],
    "positivePoints": ["point1", "point2"],
    "resolutionStatus": "<resolved|partial|unresolved>",
    "tags": ["tag1", "tag2"],
    "agentNotes": "<brief note>",
    "summary": "<one line summary>",
    "reasoning": {
        "sentimentReasoning": "<detailed explanation with direct quotes from customer, e.g., 'Customer started frustrated saying \"this is taking forever\" but tone improved after agent explained the balance, ending with \"okay that makes sense\"'>",
        "satisfactionReasoning": "<explain with quotes why this satisfaction score>",
        "resolutionReasoning": "<explain with quotes why this resolution status>",
        "tagReasons": {
            "<tag_name>": "<specific quote or moment that caused this tag, e.g., 'Customer said \"I want to pay the full amount\" indicating willingness to clear debt'>"
        },
        "painPointEvidence": {
            "<pain_point>": "<exact quote demonstrating this pain point>"
        },
        "positiveEvidence": {
            "<positive_point>": "<exact quote demonstrating this positive moment>"
        },
        "agentPerformanceEvidence": "<specific examples of good/bad agent behavior with quotes>"
    }
}`;

/**
 * Analyze a call transcript for sentiment using Claude
 * @param {string} transcript - The full call transcript
 * @param {object} callMeta - Additional call metadata (duration, customer info, etc.)
 * @returns {Promise<object>} Sentiment analysis results with full reasoning
 */
async function analyzeCallSentiment(transcript, callMeta = {}) {
    if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('[Sentiment] Anthropic API key not configured');
        return createErrorResponse('Anthropic API key not configured');
    }

    if (!transcript || transcript.trim().length < 20) {
        return createErrorResponse('Transcript too short to analyze');
    }

    try {
        console.log('[Sentiment] Analyzing transcript with Claude...');
        console.log(`[Sentiment] Transcript length: ${transcript.length} chars`);
        
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            messages: [
                {
                    role: 'user',
                    content: `${SENTIMENT_PROMPT}\n\n---\n\nCALL TRANSCRIPT:\n\n${transcript}\n\n---\n\nCALL METADATA:\n- Duration: ${callMeta.duration || 'Unknown'} seconds\n- Customer: ${callMeta.customerName || 'Unknown'}\n- Phone: ${callMeta.customerPhone || 'Unknown'}`
                }
            ]
        });

        const content = response.content[0].text;
        
        // Parse JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in Claude response');
        }
        
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Add metadata
        analysis.analyzedAt = new Date().toISOString();
        analysis.transcriptLength = transcript.length;
        analysis.model = 'claude-sonnet-4-20250514';
        analysis.callMeta = callMeta;
        
        // Ensure reasoning object exists with all fields
        analysis.reasoning = analysis.reasoning || {};
        analysis.reasoning.sentimentReasoning = analysis.reasoning.sentimentReasoning || 'No reasoning provided';
        analysis.reasoning.satisfactionReasoning = analysis.reasoning.satisfactionReasoning || 'No reasoning provided';
        analysis.reasoning.resolutionReasoning = analysis.reasoning.resolutionReasoning || 'No reasoning provided';
        analysis.reasoning.tagReasons = analysis.reasoning.tagReasons || {};
        analysis.reasoning.painPointEvidence = analysis.reasoning.painPointEvidence || {};
        analysis.reasoning.positiveEvidence = analysis.reasoning.positiveEvidence || {};
        analysis.reasoning.agentPerformanceEvidence = analysis.reasoning.agentPerformanceEvidence || 'No specific evidence noted';
        
        console.log('[Sentiment] Analysis complete:', analysis.summary);
        
        return analysis;
        
    } catch (error) {
        console.error('[Sentiment] Analysis failed:', error.message);
        return createErrorResponse(error.message);
    }
}

/**
 * Create a standardized error response
 */
function createErrorResponse(errorMessage) {
    return {
        error: errorMessage,
        overallSentiment: null,
        customerSatisfaction: null,
        painPoints: [],
        positivePoints: [],
        resolutionStatus: 'unknown',
        tags: [],
        agentNotes: `Analysis unavailable: ${errorMessage}`,
        summary: 'Unable to analyze call',
        reasoning: {
            sentimentReasoning: 'Analysis failed - no reasoning available',
            satisfactionReasoning: 'Analysis failed - no reasoning available',
            resolutionReasoning: 'Analysis failed - no reasoning available',
            tagReasons: {},
            painPointEvidence: {},
            positiveEvidence: {},
            agentPerformanceEvidence: 'Analysis failed - no reasoning available'
        },
        analyzedAt: new Date().toISOString()
    };
}

/**
 * Get sentiment label from score
 */
function getSentimentLabel(score) {
    if (score >= 8) return 'Very Positive';
    if (score >= 6) return 'Positive';
    if (score >= 4) return 'Neutral';
    if (score >= 2) return 'Negative';
    return 'Very Negative';
}

/**
 * Get sentiment color for UI
 */
function getSentimentColor(score) {
    if (score >= 7) return '#22C55E'; // Green
    if (score >= 4) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
}

module.exports = {
    analyzeCallSentiment,
    getSentimentLabel,
    getSentimentColor
};
