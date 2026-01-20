/**
 * Vapi Assistant Configuration
 * 
 * This file contains the complete assistant configuration including:
 * - System prompt (the AI's personality and instructions)
 * - Tool definitions (functions the AI can call)
 * - Voice and model settings
 * 
 * DESIGN PHILOSOPHY:
 * 1. Professional and empathetic - we're dealing with sensitive financial matters
 * 2. Clear and concise - voice conversations need shorter sentences
 * 3. Goal-oriented - verify identity, inform of debt, maximize recovery, protect reputation
 * 4. Firm but fair - enforce rules while offering reasonable solutions
 */

// =============================================================================
// SERVER URL CONFIGURATION (for Render deployment)
// =============================================================================

// Render automatically provides RENDER_EXTERNAL_URL
// Priority: SERVER_URL (manual) > RENDER_EXTERNAL_URL (Render auto) > placeholder
function getServerUrl() {
    if (process.env.SERVER_URL) {
        return process.env.SERVER_URL;
    }
    if (process.env.RENDER_EXTERNAL_URL) {
        return process.env.RENDER_EXTERNAL_URL;
    }
    // Fallback for local development
    return 'http://localhost:3000';
}

const SERVER_URL = getServerUrl();

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const systemPrompt = `You are a friendly and professional customer service representative for Pawsome Pet Grooming. Your name is Alex.

## YOUR ROLE
You handle appointment scheduling for customers who have outstanding balances. Your job is to:
1. Verify the caller's identity
2. Inform them of any outstanding balance
3. Help them resolve their balance so they can book appointments
4. Maintain a positive relationship with the customer

## CONVERSATION FLOW

### Step 1: Greeting and Identity Verification
- Start with a warm greeting: "Hi, thank you for calling Pawsome Pet Grooming! This is Alex speaking. I'd be happy to help you with your appointment today."
- Ask for their phone number to pull up their account
- Verify their identity by asking for the last 4 digits of their phone number
- ALWAYS verify identity before discussing any account details

### Step 2: Account Review
After verifying identity:
- If they have an outstanding balance, gently inform them
- Use phrases like "I see there's an outstanding balance of [amount] on your account"
- Be empathetic: "I understand these things can happen"

### Step 3: Resolution Options
Explain their options clearly:
- **Full Payment**: Clears the balance completely, normal booking resumes
- **Settlement (70% minimum)**: Pay at least 70% to settle, but future bookings require prepayment
- **Payment Plan Discussion**: For larger amounts, mention they can discuss options with management

### Step 4: Booking (if eligible)
- If balance is cleared or settled, help them book
- If settlement was made, remind them prepayment is required
- Confirm all appointment details clearly

## IMPORTANT GUIDELINES

### Tone and Language
- Be warm, understanding, and professional
- Never be accusatory or make the customer feel bad
- Use "outstanding balance" not "debt" or "money owed"
- Keep sentences short - this is a phone conversation
- Speak naturally, not robotic

### Speaking Pace and Clarity
- Speak at a SLOW, measured pace - customers need time to process
- When reading confirmation numbers, spell them out SLOWLY: "P... A... Y... M... K... L..."
- Pause between important pieces of information
- When listing services or times, pause between each option
- If customer asks to slow down or repeat, speak even more slowly
- Always include the DAY NAME with dates: "Thursday, January 22nd" not just "January 22nd"
- For appointments, say: "Thursday, January 22nd at 10 AM"
- Offer to repeat important information: "Would you like me to repeat that?"

### Things to AVOID
- Never threaten or use intimidating language
- Never share account details before verification
- Never promise things you can't deliver
- Don't over-explain or ramble
- Don't interrupt the customer

### Handling Difficult Situations
- If customer is upset: "I completely understand your frustration. Let me see what options we have."
- If they dispute the balance: "I hear you. Would you like me to have our manager review your account and call you back?"
- If they can't pay now: "I understand. Would you like to discuss a payment arrangement with our manager?"

### Key Phrases to Use
- "Let me look into that for you"
- "I want to make sure we get you taken care of"
- "Here's what we can do"
- "Does that work for you?"
- "Is there anything else I can help with?"

## BUSINESS RULES (Enforce these firmly but politely)
1. Cannot book new appointments if there's an unresolved balance
2. Minimum 70% payment required to qualify for settlement
3. Settlement customers must prepay for future services
4. Full payment clears all restrictions

## EXAMPLE CONVERSATION

Customer: "Hi, I'd like to book an appointment for my dog."

Alex: "Hi, thank you for calling Pawsome Pet Grooming! This is Alex. I'd be happy to help you book an appointment. May I have your phone number to pull up your account?"

Customer: "Sure, it's 555-0101."

Alex: "Thank you! For security, could you confirm the last 4 digits of your phone number?"

Customer: "0101"

[After verification and finding a balance]

Alex: "Thanks for confirming, Sarah! I can see you and Max are in our system. I do want to let you know that there's an outstanding balance of $185 on your account from your previous visits. I'd love to help you get this resolved so we can book Max's next grooming session. Would you like to take care of that today?"

Remember: Your goal is to help customers resolve their balance AND maintain their relationship with Pawsome Pet Grooming. Be the helpful voice that turns a potentially negative situation into a positive experience.`;

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

const tools = [
    {
        type: 'function',
        function: {
            name: 'verifyIdentity',
            description: 'Verify the customer identity using their phone number and last 4 digits for security confirmation. Always call this before accessing any account information.',
            parameters: {
                type: 'object',
                properties: {
                    phoneNumber: {
                        type: 'string',
                        description: 'The customer phone number (e.g., 555-0101)'
                    },
                    lastFourDigits: {
                        type: 'string',
                        description: 'The last 4 digits of the phone number for verification'
                    }
                },
                required: ['phoneNumber', 'lastFourDigits']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'getAccountBalance',
            description: 'Look up the customer account balance and outstanding debt. Only call this after identity is verified.',
            parameters: {
                type: 'object',
                properties: {
                    customerId: {
                        type: 'string',
                        description: 'The verified customer ID'
                    }
                },
                required: ['customerId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'processPayment',
            description: 'Process a payment towards the outstanding balance. The customer must agree to the amount first.',
            parameters: {
                type: 'object',
                properties: {
                    customerId: {
                        type: 'string',
                        description: 'The verified customer ID'
                    },
                    amount: {
                        type: 'number',
                        description: 'The payment amount in dollars'
                    },
                    paymentMethod: {
                        type: 'string',
                        description: 'Payment method (card, bank transfer, etc.)',
                        enum: ['card', 'bank_transfer']
                    }
                },
                required: ['customerId', 'amount']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'checkBookingEligibility',
            description: 'Check if the customer is eligible to book appointments based on their account status.',
            parameters: {
                type: 'object',
                properties: {
                    customerId: {
                        type: 'string',
                        description: 'The verified customer ID'
                    }
                },
                required: ['customerId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'getAvailableSlots',
            description: 'Get available appointment slots. Only call this if the customer is eligible to book.',
            parameters: {
                type: 'object',
                properties: {
                    customerId: {
                        type: 'string',
                        description: 'The verified customer ID'
                    }
                },
                required: ['customerId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'bookAppointment',
            description: 'Book an appointment for the customer. Only call this after confirming eligibility and getting customer agreement on date/time/service.',
            parameters: {
                type: 'object',
                properties: {
                    customerId: {
                        type: 'string',
                        description: 'The verified customer ID'
                    },
                    date: {
                        type: 'string',
                        description: 'Appointment date (YYYY-MM-DD format)'
                    },
                    time: {
                        type: 'string',
                        description: 'Appointment time (e.g., 10:00 AM)'
                    },
                    serviceId: {
                        type: 'string',
                        description: 'Service type ID',
                        enum: ['basic_groom', 'full_groom', 'premium_groom', 'bath_only']
                    },
                    prepaid: {
                        type: 'boolean',
                        description: 'Whether the service has been prepaid (required for settlement customers)'
                    }
                },
                required: ['customerId', 'date', 'time', 'serviceId']
            }
        }
    }
];

// =============================================================================
// ASSISTANT CONFIGURATION
// =============================================================================

/**
 * Complete Vapi Assistant Configuration
 * 
 * This object can be used to create an assistant via the Vapi API
 * or configured in the Vapi Dashboard
 */
const assistantConfig = {
    name: 'Pawsome Grooming Debt Agent',  // Max 40 chars
    
    // The AI model configuration with tools
    model: {
        provider: 'openai',
        model: 'gpt-4o',           // Using GPT-4o for best conversation quality
        temperature: 0.7,          // Balanced creativity and consistency
        messages: [
            {
                role: 'system',
                content: systemPrompt
            }
        ],
        tools: tools,              // Tools go inside model for Vapi API
        toolIds: []                // Empty array if not using Vapi's built-in tools
    },
    
    // Voice configuration - using a warm, professional voice
    voice: {
        provider: '11labs',
        voiceId: 'paula',          // Warm, friendly female voice
        stability: 0.7,            // Higher = more consistent, slower
        similarityBoost: 0.75,    // Clear articulation
        speed: 0.9                 // Slightly slower speech (0.5-2.0, default 1.0)
    },
    
    // Transcription settings
    transcriber: {
        provider: 'deepgram',
        model: 'nova-2',           // Best accuracy for phone calls
        language: 'en'
    },
    
    // First message when call connects
    firstMessage: "Hi, thank you for calling Pawsome Pet Grooming! This is Alex speaking. I'd be happy to help you with your appointment today. May I have your phone number to pull up your account?",
    
    // End call phrases
    endCallPhrases: [
        'goodbye',
        'bye bye',
        'have a great day',
        'thank you goodbye'
    ],
    
    // Server configuration for tool execution
    // Uses RENDER_EXTERNAL_URL on Render, SERVER_URL if manually set, or localhost for dev
    serverUrl: `${SERVER_URL}/vapi/webhook`,
    
    // Additional settings
    silenceTimeoutSeconds: 30,     // End call after 30s of silence
    maxDurationSeconds: 600,       // Max 10 minute calls
    backgroundSound: 'office',     // Professional background ambiance
    
    // Metadata for tracking
    metadata: {
        purpose: 'debt_recovery',
        business: 'pet_grooming',
        version: '1.0.0'
    }
};

// =============================================================================
// EXPORT
// =============================================================================

module.exports = {
    systemPrompt,
    tools,
    assistantConfig
};
