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

// Import data modules
const { customers, services, availableSlots } = require('./data/customers');
const activity = require('./data/activity');

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

// Client config endpoint (serves public key and assistant IDs to frontend)
app.get('/api/config', (req, res) => {
    res.json({
        vapiPublicKey: process.env.VAPI_PUBLIC_KEY,
        assistantId: process.env.VAPI_ASSISTANT_ID,  // Default (Sophie)
        // Squad assistant IDs
        assistantIds: {
            sophie: process.env.SOPHIE_ASSISTANT_ID || process.env.VAPI_ASSISTANT_ID,
            marcus: process.env.MARCUS_ASSISTANT_ID,
            emma: process.env.EMMA_ASSISTANT_ID
        }
    });
});

// =============================================================================
// DATA API ENDPOINTS (for frontend dashboard)
// =============================================================================

// Get all customers
app.get('/api/customers', (req, res) => {
    const customerList = Object.values(customers).map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        phone: c.phone,
        email: c.email,
        pets: c.pets,
        balance: c.outstandingBalance,
        originalDebt: c.originalDebt,
        lastPayment: c.lastPaymentDate,
        status: c.outstandingBalance === 0 ? 'clear' : 
                c.outstandingBalance === c.originalDebt ? 'pending' : 'partial',
        notes: c.notes
    }));
    res.json(customerList);
});

// Get single customer
app.get('/api/customers/:phone', (req, res) => {
    const phone = req.params.phone;
    const customer = customers[phone] || customers[`555-${phone}`] || customers[phone.replace(/-/g, '')];
    
    if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        phone: customer.phone,
        email: customer.email,
        pets: customer.pets,
        balance: customer.outstandingBalance,
        originalDebt: customer.originalDebt,
        lastPayment: customer.lastPaymentDate,
        status: customer.outstandingBalance === 0 ? 'clear' : 
                customer.outstandingBalance === customer.originalDebt ? 'pending' : 'partial',
        notes: customer.notes
    });
});

// Get dashboard stats
app.get('/api/stats', (req, res) => {
    // Calculate totals from actual customer data
    let totalOutstanding = 0;
    let accountsWithDebt = 0;
    let totalAccounts = 0;
    
    Object.values(customers).forEach(c => {
        totalOutstanding += c.outstandingBalance;
        totalAccounts++;
        if (c.outstandingBalance > 0) accountsWithDebt++;
    });
    
    // Get activity stats
    const activityStats = activity.getStats();
    
    res.json({
        totalOutstanding,
        totalAccounts,
        accountsWithDebt,
        callsToday: activityStats.callsToday || 0,
        successfulCalls: activityStats.successfulCalls || 0,
        recoveryRate: totalAccounts > 0 ? 
            Math.round(((totalAccounts - accountsWithDebt) / totalAccounts) * 100) : 0,
        totalPaymentsToday: activityStats.totalPaymentsToday || 0
    });
});

// Get activity feed
app.get('/api/activity', (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    res.json(activity.getActivities(limit));
});

// Get call history
app.get('/api/calls', (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    res.json(activity.getCallHistory(limit));
});

// Get payment history
app.get('/api/payments', (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    res.json(activity.getPaymentHistory(limit));
});

// Get booking history
app.get('/api/bookings', (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    res.json(activity.getBookingHistory(limit));
});

// Get services list
app.get('/api/services', (req, res) => {
    res.json(Object.values(services));
});

// Get available slots
app.get('/api/slots', (req, res) => {
    res.json(availableSlots.filter(s => s.available));
});

// =============================================================================
// Vapi webhook routes
// =============================================================================

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
    console.log(`   API:            http://localhost:${PORT}/api/*`);
    console.log('='.repeat(60));
});

module.exports = app;
