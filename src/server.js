/**
 * AI Voice Agent Server for Debt Recovery
 * 
 * This server handles Vapi webhook requests for the debt recovery voice agent.
 * It provides tools for identity verification, balance lookup, and payment processing.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import route handlers
const vapiRoutes = require('./routes/vapi');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

// Enable CORS for Vapi webhook requests
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Request logging middleware (helpful for debugging)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'debt-recovery-voice-agent',
        timestamp: new Date().toISOString()
    });
});

// Client config endpoint (serves public key and assistant ID to frontend)
app.get('/api/config', (req, res) => {
    res.json({
        vapiPublicKey: process.env.VAPI_PUBLIC_KEY,
        assistantId: process.env.VAPI_ASSISTANT_ID
    });
});

// Vapi webhook routes
app.use('/vapi', vapiRoutes);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🐕 Pawsome Pet Grooming - Debt Recovery Voice Agent');
    console.log('='.repeat(60));
    console.log(`Server running on port ${PORT}`);
    console.log('');
    console.log('📍 Endpoints:');
    console.log(`   Web Interface:  http://localhost:${PORT}`);
    console.log(`   Health Check:   http://localhost:${PORT}/health`);
    console.log(`   Vapi Webhook:   http://localhost:${PORT}/vapi/webhook`);
    console.log('='.repeat(60));
});

module.exports = app;
