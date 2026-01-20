# 🐕 Pawsome Pet Grooming - AI Voice Agent

> A multi-agent AI voice system for customer service, debt recovery, and appointment booking.

---

## 🎯 Live Demo

### 📞 Phone Number
**+1 (650) 666-3505**

Call to experience the full Squad flow:
- **Sophie** answers and verifies your identity
- **Marcus** handles payments (if you have a balance)
- **Emma** books your appointment

### 🌐 Web Dashboard
Run locally: `http://localhost:3000`

### 🧪 Test Credentials

| Customer | Phone | Verify Code | Balance | Pet |
|----------|-------|-------------|---------|-----|
| Sarah Johnson | 555-0101 | 0101 | $185.00 | Max |
| Michael Chen | 555-0102 | 0102 | $95.50 | Bella, Charlie |
| Emily Rodriguez | 555-0103 | 0103 | $0.00 ✓ | Luna |
| David Thompson | 555-0104 | 0104 | $320.00 | Rocky, Duke |

---

## 🏗️ Architecture

### Multi-Agent Squad (Phone)

```
Customer Call (+1 650-666-3505)
         │
         ▼
┌─────────────────┐
│     SOPHIE      │ ← Welcome Agent
│  Greets & IDs   │
└────────┬────────┘
         │
    Has debt? ──Yes──▶ ┌─────────────────┐
         │             │     MARCUS      │ ← Debt Specialist
         No            │ Handles Payment │
         │             └────────┬────────┘
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│      EMMA       │◀───│   Payment OK    │
│ Books Appointment│    └─────────────────┘
└─────────────────┘
```

### Single Agent (Web)

```
Web Dashboard (localhost:3000)
         │
         ▼
┌─────────────────┐
│      ALEX       │ ← All-in-one Agent
│  Full Service   │
│ Verify→Pay→Book │
└─────────────────┘
```

### Shared Backend

```
┌─────────────────────────────────────────────────────────────┐
│                     NODE.JS SERVER                           │
├─────────────────────────────────────────────────────────────┤
│  Tools:                                                      │
│  • verifyIdentity    • processPayment    • bookAppointment  │
│  • getAccountBalance • checkEligibility  • getAvailableSlots│
├─────────────────────────────────────────────────────────────┤
│  In-Memory Database (shared between phone & web)            │
│  Customers │ Payments │ Bookings │ Activity Log              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Install
```bash
git clone https://github.com/cememirsenyurt/ai-voice-agent-debt-recovery.git
cd ai-voice-agent-debt-recovery
npm install
```

### 2. Configure
```bash
cp env.example .env
# Edit .env with your Vapi keys
```

### 3. Start Server
```bash
npm start
```

### 4. Start Tunnel (for phone calls)
```bash
cloudflared tunnel --url http://localhost:3000
# Copy the URL and update Vapi dashboard
```

### 5. Deploy Agents
```bash
npm run deploy          # Deploy Alex (web agent)
npm run deploy:squad    # Deploy Sophie, Marcus, Emma
npm run update:squad    # Update Squad prompts
```

---

## 📁 Project Structure

```
├── src/
│   ├── server.js              # Express server + API endpoints
│   ├── config/
│   │   ├── assistant.js       # Alex configuration (web)
│   │   └── squad.js           # Squad configuration (phone)
│   ├── routes/
│   │   └── vapi.js            # Vapi webhook handlers
│   ├── tools/
│   │   └── handlers.js        # Business logic (verify, pay, book)
│   └── data/
│       ├── customers.js       # Mock customer database
│       └── activity.js        # Activity & call history
├── public/
│   └── index.html             # Web dashboard UI
├── scripts/
│   ├── deploy-assistant.js    # Deploy Alex
│   ├── deploy-squad.js        # Deploy Squad
│   └── update-squad.js        # Update Squad
└── package.json
```

---

## 🎭 The Agents

### Sophie - Welcome Agent
- **Voice:** Bella (ElevenLabs) - Friendly, upbeat
- **Role:** First contact, identity verification, routing
- **Transfers to:** Marcus (debt) or Emma (no debt)

### Marcus - Debt Specialist  
- **Voice:** Adam (ElevenLabs) - Professional, calm
- **Role:** Payment collection, settlement negotiation
- **Strategy:** Always recommend full payment first (better for customer)
- **Transfers to:** Emma (after payment)

### Emma - Appointment Agent
- **Voice:** Charlotte (ElevenLabs) - Warm, enthusiastic
- **Role:** Service selection, booking, confirmation
- **Ends call:** After booking with proper goodbye

### Alex - All-in-One (Web)
- **Voice:** Paula (ElevenLabs) - Professional
- **Role:** Handles complete flow without transfers
- **Used for:** Web calls (SDK limitation - no Squad transfers)

---

## 💼 Business Rules

| Rule | Implementation |
|------|----------------|
| Identity verification required | Must verify before account access |
| No booking with outstanding balance | Enforced in checkEligibility |
| 70% minimum settlement | Calculated in processPayment |
| Full payment = best deal | No restrictions, no prepayment |
| Settlement = prepayment required | Future bookings need upfront payment |

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/config` | GET | Vapi configuration |
| `/api/customers` | GET | Customer list |
| `/api/stats` | GET | Dashboard statistics |
| `/api/activity` | GET | Activity feed |
| `/api/calls` | GET | Call history |
| `/api/payments` | GET | Payment history |
| `/api/bookings` | GET | Booking history |
| `/api/services` | GET | Available services |
| `/api/slots` | GET | Available time slots |
| `/vapi/webhook` | POST | Vapi webhook handler |

---

## 🎨 Web Dashboard Features

- **Real-time stats:** Outstanding balance, active accounts, recovery rate
- **Customer table:** View all customers, balances, status
- **Live transcript:** See conversation in real-time
- **Activity feed:** Track payments, bookings, calls
- **Call history:** Review past calls
- **Schedule view:** See available slots and bookings

---

## ⚙️ Environment Variables

```env
# Server
PORT=3000

# Vapi Keys
VAPI_PRIVATE_KEY=your_private_key
VAPI_PUBLIC_KEY=your_public_key

# Assistant IDs
VAPI_ASSISTANT_ID=sophie_id
ALEX_ASSISTANT_ID=alex_id
SOPHIE_ASSISTANT_ID=sophie_id
MARCUS_ASSISTANT_ID=marcus_id
EMMA_ASSISTANT_ID=emma_id
VAPI_SQUAD_ID=squad_id

# Server URL (your tunnel URL)
SERVER_URL=https://your-tunnel.trycloudflare.com/vapi/webhook
```

---

## 🚧 Limitations

| Limitation | Reason |
|------------|--------|
| Web calls don't support Squad transfers | Vapi Web SDK limitation |
| In-memory database | Demo only - resets on restart |
| Mock payments | No real payment processing |
| Single location | No multi-branch support |
| English only | No multi-language support |

---

## 🔮 Future Improvements (1 Month)

- [ ] **Week 1:** PostgreSQL database, Stripe payments, proper hosting
- [ ] **Week 2:** Sentiment analysis, smart escalation, multi-language
- [ ] **Week 3:** SMS/email confirmations, calendar sync, CRM integration
- [ ] **Week 4:** A/B testing prompts, predictive analytics, outbound campaigns

---

## 📚 Tech Stack

- **Voice AI:** [Vapi](https://vapi.ai)
- **LLM:** GPT-4o
- **Voice:** ElevenLabs
- **Transcription:** Deepgram Nova-2
- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JS
- **Tunnel:** Cloudflare Tunnel

---

## 📝 Scripts

```bash
npm start           # Start server
npm run deploy      # Deploy Alex to Vapi
npm run deploy:squad # Deploy Squad (Sophie, Marcus, Emma)
npm run update:squad # Update Squad prompts
```

---

## 👤 Author

**Cem Emir Senyurt**

---

## 📄 License

MIT
