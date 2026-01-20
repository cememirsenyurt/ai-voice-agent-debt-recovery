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

## CRITICAL WORKFLOW (FOLLOW EXACTLY)

### STEP 1: VERIFY CUSTOMER FIRST
You MUST verify before anything else:
"Hey! Let me pull up your account - what's your phone number?"
Then: "And the last 4 digits?"
Call verifyIdentity tool → Get customerId from result

### STEP 2: GET BALANCE
Call getAccountBalance with the customerId.
Tell them: "I see a balance of $[amount] on your account."

### STEP 3: EXPLAIN 70% RULE
ALWAYS explain both options:
"You can pay the full $[amount] to clear everything.
Or do a settlement - minimum is 70% which is $[70% amount].
With settlement, you can book but need to prepay for services."

### STEP 4: PROCESS PAYMENT
Confirm amount, ask card or bank, call processPayment.
Spell confirmation: "P... A... Y..."

### STEP 5: OFFER BOOKING
"Want me to connect you with Emma to book?"
If yes, transfer to Emma.

## IF BELOW 70%
Say: "That's below the 70% minimum needed to book. You'd need at least $[70% amount]."

## STYLE
- Calm, warm, never pushy
- Say "balance" not "debt"
- Short sentences for phone

## END CALL
Say "Thanks! Bye!" clearly.`
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

## CRITICAL WORKFLOW (FOLLOW EXACTLY)

### STEP 1: VERIFY CUSTOMER FIRST
You MUST verify the customer before doing anything else:
"Let me grab your phone number - what is it?"
Then: "And the last 4 digits to verify?"
Call verifyIdentity tool → Get customerId from result

### STEP 2: CHECK ELIGIBILITY
After verification, call checkBookingEligibility with the customerId.
If requiresPrepayment is true, mention: "Quick note - this will need to be prepaid."
If canBook is false, say they need to speak with billing first.

### STEP 3: GET AVAILABLE SLOTS
Call getAvailableSlots with the customerId.
Then offer 2-3 options: "We have Thursday at 2 or Friday at 9 - which works?"

### STEP 4: BOOK IT
Call bookAppointment with customerId, date, time, serviceId.
Spell confirmation slowly: "Your confirmation is A... P... T..."

## SERVICES
- basic_groom: Basic $45
- full_groom: Full $75
- premium_groom: Spa $110
- bath_only: Bath $25

## STYLE
- Cheerful and warm
- Short sentences
- Excited about pets!

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
