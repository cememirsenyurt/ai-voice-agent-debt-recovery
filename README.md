# 🐕 AI Voice Agent for Small Business Debt Recovery

> An AI-powered voice assistant that helps a pet grooming business recover outstanding payments while maintaining positive customer relationships.

**Note:** This is a hypothetical project designed for demonstration purposes only.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [The Prompt](#the-prompt)
- [Business Logic](#business-logic)
- [Limitations](#limitations)
- [Future Improvements](#future-improvements)
- [Learnings](#learnings)

---

## Overview

### The Problem

A local pet grooming business ("Pawsome Pet Grooming") needs to recover payments from customers with outstanding balances. When a debtor calls to book an appointment, they should be:

1. **Identified** - Verify who they are
2. **Informed** - Tell them about their outstanding balance
3. **Offered Solutions** - Help them resolve the balance
4. **Enabled to Book** - Once resolved, complete their appointment

### The Solution

An AI voice agent built with [Vapi](https://vapi.ai) that:

- Acts as a friendly customer service representative named "Alex"
- Verifies customer identity before discussing account details
- Professionally communicates outstanding balances
- Offers payment options including 70% minimum settlement
- Enforces booking rules while maintaining positive relationships

---

## Live Demo

🔗 **Agent Link:** [To be added after deployment]

### Test Customers

| Phone Number | Name | Balance | Scenario |
|-------------|------|---------|----------|
| 555-0101 | Sarah Johnson | $185.00 | Standard debt case |
| 555-0102 | Michael Chen | $95.50 | Smaller balance |
| 555-0103 | Emily Rodriguez | $0 | No debt (control) |
| 555-0104 | David Thompson | $320.00 | Large balance |
| 555-0105 | Jessica Williams | $45.00 | Partial payment made |

**Verification:** Use the last 4 digits of the phone number (e.g., "0101" for Sarah)

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Customer Call  │────▶│   Vapi Agent    │────▶│  Your Server    │
│                 │     │   (GPT-4o)      │     │  (Express.js)   │
│                 │◀────│                 │◀────│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              │ Tools
                              ▼
                    ┌───────────────────┐
                    │ • verifyIdentity  │
                    │ • getAccountBalance│
                    │ • processPayment  │
                    │ • checkEligibility│
                    │ • getAvailableSlots│
                    │ • bookAppointment │
                    └───────────────────┘
```

### Technology Stack

- **Voice AI Platform:** Vapi
- **LLM:** GPT-4o (via Vapi)
- **Voice:** ElevenLabs (Paula voice)
- **Transcription:** Deepgram Nova-2
- **Backend:** Node.js + Express
- **Deployment:** Any Node.js host (Render, Railway, etc.)

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- Vapi account ([sign up free](https://vapi.ai))
- ngrok or similar for local testing

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/ai-voice-agent-debt-recovery.git
cd ai-voice-agent-debt-recovery
npm install
```

### 2. Configure Environment

```bash
cp env.example .env
```

Edit `.env` with your credentials:

```env
PORT=3000
VAPI_PRIVATE_KEY=your_private_key_here
VAPI_PUBLIC_KEY=your_public_key_here
SERVER_URL=https://your-server-url.com/vapi/webhook
```

### 3. Start the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

### 4. Expose Local Server (for testing)

```bash
ngrok http 3000
```

Copy the ngrok URL and update `SERVER_URL` in your `.env`

### 5. Deploy Assistant to Vapi

```bash
npm run deploy
```

### 6. Test the Agent

1. Go to [Vapi Dashboard](https://dashboard.vapi.ai)
2. Find your assistant
3. Use the web widget to test, or assign a phone number

---

## The Prompt

The complete system prompt is in `src/config/assistant.js`. Here's the core philosophy:

### Conversation Flow

```
1. GREETING          → "Hi, thank you for calling Pawsome Pet Grooming!"
                       ↓
2. IDENTITY CHECK    → Ask for phone number + verify last 4 digits
                       ↓
3. ACCOUNT REVIEW    → Check balance, inform customer professionally
                       ↓
4. RESOLUTION        → Offer payment options (full or 70% settlement)
                       ↓
5. BOOKING           → If eligible, help schedule appointment
```

### Key Prompt Design Decisions

1. **Named Persona (Alex)** - Creates consistency and human connection
2. **Empathetic Language** - "I understand these things can happen"
3. **Avoid Negative Terms** - Say "outstanding balance" not "debt"
4. **Clear Options** - Always give the customer choices
5. **Short Sentences** - Voice conversations need concise speech
6. **Handling Objections** - Scripts for upset customers and disputes

### Example Dialogue

```
Agent: "Hi, thank you for calling Pawsome Pet Grooming! This is Alex. 
        I'd be happy to help you with your appointment. May I have 
        your phone number?"

Customer: "555-0101"

Agent: "Thank you! For security, could you confirm the last 4 digits?"

Customer: "0101"

Agent: "Thanks for confirming, Sarah! I see you and Max are in our 
        system. I do want to let you know there's an outstanding 
        balance of $185 from your previous visits. I'd love to help 
        get this resolved so we can book Max's next grooming. Would 
        you like to take care of that today?"
```

---

## Business Logic

### Rules Implemented

| Rule | Implementation |
|------|----------------|
| Identity required | Must verify before any account access |
| No booking with debt | `checkBookingEligibility` enforces this |
| 70% minimum settlement | Calculated in `processPayment` |
| Prepayment for settlement customers | Tracked in booking flow |

### Payment Flow

```javascript
// Simplified logic from src/tools/handlers.js

if (newBalance === 0) {
    // Full payment - can book normally
    bookingStatus = 'allowed';
} else if (paymentAmount >= balance * 0.70) {
    // Settlement accepted - can book with prepayment
    bookingStatus = 'allowed_with_prepayment';
} else {
    // Not enough paid - cannot book
    bookingStatus = 'blocked';
}
```

---

## Limitations

### Current Limitations

1. **No Real Payment Processing**
   - Uses mock payment flow
   - Production would need Stripe/Square integration

2. **Mock Customer Database**
   - In-memory data resets on server restart
   - Production needs persistent database

3. **Single Language (English)**
   - No multi-language support currently
   - Would need prompt variants for other languages

4. **No Call Recording/Analytics**
   - Basic logging only
   - Production should integrate Vapi's analytics

5. **Limited Edge Case Handling**
   - No voicemail detection
   - No handling of poor audio quality
   - No callback scheduling for managers

6. **No CRM Integration**
   - Doesn't sync with existing business systems
   - Manual reconciliation needed

### Known Edge Cases

- Customer disputes the balance → Escalate to manager
- Customer can't pay any amount → Offer callback
- Multiple accounts same phone → Not handled
- Partial match on names → May cause confusion

---

## Future Improvements

### With 1 Month of Development

1. **Real Payment Integration**
   - Stripe/Square for secure card payments
   - Payment link via SMS for convenience
   - Recurring payment plans

2. **Database & CRM Integration**
   - Connect to existing booking systems (Acuity, Square Appointments)
   - Real-time balance sync
   - Customer history tracking

3. **Enhanced Analytics**
   - Recovery rate tracking
   - Average call duration
   - Conversion metrics
   - A/B testing different prompts

4. **Multi-Channel Support**
   - SMS follow-up after calls
   - Email receipts
   - WhatsApp integration

5. **Improved Conversation**
   - Multi-language support
   - Regional accent handling
   - Sentiment detection for escalation
   - Dynamic pricing/discount authority

6. **Compliance & Security**
   - PCI DSS compliance for payments
   - Call recording with consent
   - TCPA compliance for outbound
   - Data encryption at rest

7. **Manager Dashboard**
   - Real-time call monitoring
   - Manual takeover option
   - Custom script editing
   - Performance analytics

---

## Learnings

### Most Surprising Discoveries

1. **Prompt Engineering is Critical**
   - Small wording changes dramatically affect conversation quality
   - "Outstanding balance" vs "debt" completely changes customer reaction
   - Example dialogues in prompts improve consistency significantly

2. **Voice UX ≠ Chat UX**
   - Short sentences are essential
   - Confirmation phrases matter ("Does that work for you?")
   - Silence handling is important (don't let pauses become awkward)

3. **Empathy Requires Explicitness**
   - AI won't be empathetic by default
   - Must explicitly script empathetic responses
   - Giving specific phrases like "I understand" improves perception

4. **Tool Design Affects Conversation Flow**
   - Well-designed tools guide the AI naturally
   - Tool names and descriptions matter for when AI calls them
   - Returning structured data helps AI communicate clearly

5. **Edge Cases Dominate Complexity**
   - Happy path is 20% of the work
   - Handling disputes, confusion, and anger is 80%
   - Pre-scripting difficult scenarios is essential

---

## File Structure

```
ai-voice-agent-debt-recovery/
├── src/
│   ├── server.js              # Express server entry point
│   ├── config/
│   │   └── assistant.js       # Vapi assistant configuration & prompt
│   ├── routes/
│   │   └── vapi.js            # Webhook route handlers
│   ├── tools/
│   │   └── handlers.js        # Tool function implementations
│   └── data/
│       └── customers.js       # Mock customer database
├── scripts/
│   └── deploy-assistant.js    # Vapi deployment script
├── env.example                # Environment variables template
├── package.json
└── README.md
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/vapi/webhook` | POST | Vapi webhook handler |

---

## License

MIT

---

## Author

Built as a case study for AI voice agent development.
