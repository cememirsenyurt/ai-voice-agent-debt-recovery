/**
 * Vapi Squad Configuration
 * 
 * Three specialized agents that work together:
 * 1. Sophie - Welcome Agent (initial greeter, verifies identity)
 * 2. Marcus - Billing Specialist (handles payments, explains 70% rule)
 * 3. Emma - Appointment Specialist (handles bookings, enforces prepayment)
 * 
 * BUSINESS RULES:
 * - Must verify identity before any account access
 * - 70% minimum settlement required to book
 * - Settlement customers must prepay for services
 * - Calls end on "bye bye", "goodbye", etc.
 */

// =============================================================================
// SERVER URL CONFIGURATION
// =============================================================================

function getServerUrl() {
    if (process.env.SERVER_URL) return process.env.SERVER_URL;
    if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
    return 'http://localhost:3000';
}

const SERVER_URL = getServerUrl();

// =============================================================================
// SHARED TOOLS
// =============================================================================

const verifyIdentityTool = {
    type: 'function',
    function: {
        name: 'verifyIdentity',
        description: 'Verify customer with phone and last 4 digits',
        parameters: {
            type: 'object',
            properties: {
                phoneNumber: { type: 'string', description: 'Customer phone number' },
                lastFourDigits: { type: 'string', description: 'Last 4 digits for verification' }
            },
            required: ['phoneNumber', 'lastFourDigits']
        }
    }
};

const getBalanceTool = {
    type: 'function',
    function: {
        name: 'getAccountBalance',
        description: 'Get customer balance. Returns outstandingBalance and minimumSettlementAmount (70%)',
        parameters: {
            type: 'object',
            properties: {
                customerId: { type: 'string', description: 'Customer ID' }
            },
            required: ['customerId']
        }
    }
};

const processPaymentTool = {
    type: 'function',
    function: {
        name: 'processPayment',
        description: 'Process payment. Returns meetsMinimumSettlement (true if >=70%)',
        parameters: {
            type: 'object',
            properties: {
                customerId: { type: 'string', description: 'Customer ID' },
                amount: { type: 'number', description: 'Payment amount' },
                paymentMethod: { type: 'string', enum: ['card', 'bank_transfer'] }
            },
            required: ['customerId', 'amount']
        }
    }
};

const checkEligibilityTool = {
    type: 'function',
    function: {
        name: 'checkBookingEligibility',
        description: 'Check if can book. Returns requiresPrepayment if settlement',
        parameters: {
            type: 'object',
            properties: {
                customerId: { type: 'string', description: 'Customer ID' }
            },
            required: ['customerId']
        }
    }
};

const getSlotsTool = {
    type: 'function',
    function: {
        name: 'getAvailableSlots',
        description: 'Get available appointment slots',
        parameters: {
            type: 'object',
            properties: {
                customerId: { type: 'string', description: 'Customer ID' }
            },
            required: ['customerId']
        }
    }
};

const bookAppointmentTool = {
    type: 'function',
    function: {
        name: 'bookAppointment',
        description: 'Book an appointment',
        parameters: {
            type: 'object',
            properties: {
                customerId: { type: 'string', description: 'Customer ID' },
                date: { type: 'string', description: 'Date YYYY-MM-DD' },
                time: { type: 'string', description: 'Time' },
                serviceId: { type: 'string', enum: ['basic_groom', 'full_groom', 'premium_groom', 'bath_only'] },
                prepaid: { type: 'boolean' }
            },
            required: ['customerId', 'date', 'time', 'serviceId']
        }
    }
};

// =============================================================================
// AGENT 1: SOPHIE - Welcome Agent
// =============================================================================

const sophieConfig = {
    name: 'Sophie - Welcome Agent',
    
    model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        messages: [{
            role: 'system',
            content: `You are Sophie, the friendly Welcome Agent at Pawsome Pet Grooming.

## YOUR JOB
1. Greet warmly
2. Get phone number
3. Verify identity (last 4 digits)
4. Check balance
5. Route to Marcus (has balance) or Emma (no balance)

## CONVERSATION
"What's your phone number?"
"And the last 4 digits to verify?"
After verification, call getAccountBalance.

If balance > 0:
"I see there's a balance. Let me connect you with Marcus to sort that out!"
→ Transfer to Marcus

If no balance:
"Your account looks great! Let me get Emma to book you in!"
→ Transfer to Emma

## STYLE
- Warm, quick, efficient
- Short sentences for phone
- Never discuss payment details

## END CALL
Say "Bye!" clearly when done.`
        }],
        tools: [verifyIdentityTool, getBalanceTool]
    },
    
    voice: {
        provider: '11labs',
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        stability: 0.45,
        similarityBoost: 0.85,
        speed: 1.0
    },
    
    transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en'
    },
    
    firstMessage: "Hi there! Thanks for calling Pawsome Pet Grooming! This is Sophie. Are you looking to book an appointment for your fur baby today?",
    
    serverUrl: `${SERVER_URL}/vapi/webhook`,
    silenceTimeoutSeconds: 20,
    maxDurationSeconds: 300,
    
    endCallPhrases: ['goodbye', 'bye bye', 'bye', 'have a great day', 'talk to you later', 'thanks bye'],
    endCallMessage: 'Thanks for calling Pawsome Pet Grooming!',
    
    metadata: { agentType: 'welcome', agentName: 'Sophie' }
};

// =============================================================================
// AGENT 2: MARCUS - Billing Specialist (70% Rule)
// =============================================================================

const marcusConfig = {
    name: 'Marcus - Debt Specialist',
    
    model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        messages: [{
            role: 'system',
            content: `You are Marcus, the billing specialist at Pawsome Pet Grooming.

## CRITICAL: GETTING CUSTOMER INFO
When transferred, ask for phone to verify:
"Can I get your phone number to pull up your account?"
Then verify and call getAccountBalance.

## THE 70% SETTLEMENT RULE (MUST EXPLAIN!)
Two options for customers:
1. FULL PAYMENT: Pay 100% → Account cleared, book anytime
2. SETTLEMENT (70% min): Pay at least 70% → Can book BUT must prepay

ALWAYS explain:
"You can pay the full $X to clear everything. Or settle for at least 70% which is $Y. With settlement, you can book but need to prepay for services."

## PAYMENT FLOW
1. Verify identity first
2. Get balance: "Let me check... you have a balance of $X"
3. Explain: "Full payment is $X. Minimum settlement is $Y (70%)."
4. If they pay below 70%: "That's below the 70% minimum to book. Need at least $Y."
5. Process payment, spell confirmation: "P... A... Y..."
6. After: "Want me to connect you with Emma to book?"

## STYLE
- Warm, calm, never pushy
- Say "balance" not "debt"
- Keep it short for phone

## END CALL
Say "Thanks! Bye!" clearly when done.`
        }],
        tools: [verifyIdentityTool, getBalanceTool, processPaymentTool, checkEligibilityTool]
    },
    
    voice: {
        provider: '11labs',
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        stability: 0.5,
        similarityBoost: 0.8,
        speed: 0.95
    },
    
    transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en'
    },
    
    firstMessage: "Hey! This is Marcus from billing. Let me pull up your account - can I get your phone number?",
    
    serverUrl: `${SERVER_URL}/vapi/webhook`,
    silenceTimeoutSeconds: 20,
    maxDurationSeconds: 600,
    
    endCallPhrases: ['goodbye', 'bye bye', 'bye', 'have a great day', 'talk to you later', 'thanks bye', 'no thanks bye'],
    endCallMessage: 'Thanks for calling! Have a great day!',
    
    metadata: { agentType: 'billing', agentName: 'Marcus' }
};

// =============================================================================
// AGENT 3: EMMA - Appointment Specialist (Prepayment Rule)
// =============================================================================

const emmaConfig = {
    name: 'Emma - Appointment Agent',
    
    model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        messages: [{
            role: 'system',
            content: `You are Emma, the appointment specialist at Pawsome Pet Grooming.

## CRITICAL: GETTING CUSTOMER INFO
Ask for phone to verify:
"Let me grab your phone number to pull up your account."
Verify, then check eligibility with checkBookingEligibility.

## PREPAYMENT RULE
If customer did settlement (not full payment), they MUST prepay:
"Quick heads up - since you did a settlement, this appointment needs to be prepaid. Is that okay?"

## BOOKING FLOW
1. Verify identity
2. Check eligibility
3. Ask service: "Basic is $45, full groom $75, or spa $110?"
4. Get slots, offer 2-3: "Thursday at 2 or Friday at 9?"
5. Confirm: "[Service] for [pet] on [day] at [time]?"
6. Book it, spell confirmation: "A... P... T..."
7. Wrap up: "Can't wait to see [pet]! Bye!"

## SERVICES
- Basic: $45 (bath, brush, nails)
- Full: $75 (plus haircut)
- Spa: $110 (everything plus teeth)
- Bath only: $25

## STYLE
- Cheerful, excited about pets
- Short sentences for phone
- Genuine warmth

## END CALL
Say "See you soon! Bye!" clearly.`
        }],
        tools: [verifyIdentityTool, checkEligibilityTool, getSlotsTool, bookAppointmentTool]
    },
    
    voice: {
        provider: '11labs',
        voiceId: 'XB0fDUnXU5powFXDhCwa',
        stability: 0.45,
        similarityBoost: 0.85,
        speed: 1.0
    },
    
    transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en'
    },
    
    firstMessage: "Hey! Emma here - so excited to help book your pup! Let me grab your phone number real quick.",
    
    serverUrl: `${SERVER_URL}/vapi/webhook`,
    silenceTimeoutSeconds: 20,
    maxDurationSeconds: 600,
    
    endCallPhrases: ['goodbye', 'bye bye', 'bye', 'have a great day', 'talk to you later', 'thanks bye', 'see you then', 'see you soon'],
    endCallMessage: 'Thanks for calling Pawsome! See you soon!',
    
    metadata: { agentType: 'booking', agentName: 'Emma' }
};

// =============================================================================
// SQUAD CONFIGURATION
// =============================================================================

const squadConfig = {
    name: 'Pawsome Pet Grooming Team',
    
    members: [
        {
            assistant: sophieConfig,
            assistantDestinations: [
                { type: 'assistant', assistantName: 'Marcus - Debt Specialist', message: 'Connecting you to Marcus...' },
                { type: 'assistant', assistantName: 'Emma - Appointment Agent', message: 'Getting Emma for you...' }
            ]
        },
        {
            assistant: marcusConfig,
            assistantDestinations: [
                { type: 'assistant', assistantName: 'Emma - Appointment Agent', message: 'Connecting you to Emma...' }
            ]
        },
        {
            assistant: emmaConfig,
            assistantDestinations: [
                { type: 'assistant', assistantName: 'Marcus - Debt Specialist', message: 'Let me get Marcus...' }
            ]
        }
    ],
    
    firstAssistantId: null
};

// =============================================================================
// EXPORT
// =============================================================================

module.exports = {
    sophieConfig,
    marcusConfig,
    emmaConfig,
    squadConfig,
    tools: {
        verifyIdentityTool,
        getBalanceTool,
        processPaymentTool,
        checkEligibilityTool,
        getSlotsTool,
        bookAppointmentTool
    }
};
