/**
 * Activity Tracking
 * 
 * This module tracks all activity (calls, payments, bookings) 
 * so both phone and web interface share the same data.
 */

// In-memory activity log (shared between phone calls and web)
const activityLog = [];

// In-memory call history
const callHistory = [];

// In-memory payment history  
const paymentHistory = [];

// In-memory booking history
const bookingHistory = [];

// =============================================================================
// ACTIVITY FUNCTIONS
// =============================================================================

function addActivity(type, icon, message, details = {}) {
    const activity = {
        id: `ACT${Date.now()}`,
        type, // 'call', 'payment', 'booking', 'verification'
        icon,
        message,
        details,
        timestamp: new Date().toISOString()
    };
    activityLog.unshift(activity); // Add to beginning
    
    // Keep only last 50 activities
    if (activityLog.length > 50) {
        activityLog.pop();
    }
    
    return activity;
}

function getActivities(limit = 20) {
    return activityLog.slice(0, limit);
}

// =============================================================================
// CALL TRACKING
// =============================================================================

function logCall(callData) {
    const call = {
        id: `CALL${Date.now()}`,
        customerPhone: callData.phone || 'Unknown',
        customerName: callData.customerName || 'Unknown',
        duration: callData.duration || 0,
        status: callData.status || 'completed', // 'completed', 'missed', 'in-progress'
        outcome: callData.outcome || 'none', // 'payment', 'booking', 'callback', 'none'
        timestamp: new Date().toISOString(),
        notes: callData.notes || ''
    };
    
    callHistory.unshift(call);
    
    // Add to activity log
    addActivity('call', '📞', `Call ${call.status} with ${call.customerName}`, call);
    
    return call;
}

function getCallHistory(limit = 20) {
    return callHistory.slice(0, limit);
}

function updateCallStatus(callId, status, outcome, notes) {
    const call = callHistory.find(c => c.id === callId);
    if (call) {
        call.status = status;
        call.outcome = outcome;
        call.notes = notes;
    }
    return call;
}

// =============================================================================
// PAYMENT TRACKING
// =============================================================================

function logPayment(paymentData) {
    const payment = {
        id: paymentData.confirmationNumber || `PAY${Date.now()}`,
        customerPhone: paymentData.phone,
        customerName: paymentData.customerName,
        amount: paymentData.amount,
        type: paymentData.type || 'full', // 'full', 'partial', 'settlement'
        previousBalance: paymentData.previousBalance,
        newBalance: paymentData.newBalance,
        timestamp: new Date().toISOString()
    };
    
    paymentHistory.unshift(payment);
    
    // Add to activity log
    addActivity('payment', '💰', `Payment of $${payment.amount.toFixed(2)} received from ${payment.customerName}`, payment);
    
    return payment;
}

function getPaymentHistory(limit = 20) {
    return paymentHistory.slice(0, limit);
}

// =============================================================================
// BOOKING TRACKING
// =============================================================================

function logBooking(bookingData) {
    const booking = {
        id: bookingData.appointmentId || `BOOK${Date.now()}`,
        customerPhone: bookingData.phone,
        customerName: bookingData.customerName,
        petName: bookingData.petName,
        service: bookingData.service,
        date: bookingData.date,
        time: bookingData.time,
        prepaymentRequired: bookingData.prepaymentRequired || false,
        prepaymentAmount: bookingData.prepaymentAmount || 0,
        timestamp: new Date().toISOString()
    };
    
    bookingHistory.unshift(booking);
    
    // Add to activity log
    addActivity('booking', '📅', `Appointment booked for ${booking.customerName} on ${booking.date}`, booking);
    
    return booking;
}

function getBookingHistory(limit = 20) {
    return bookingHistory.slice(0, limit);
}

// =============================================================================
// STATS
// =============================================================================

function getStats() {
    const today = new Date().toISOString().split('T')[0];
    
    const callsToday = callHistory.filter(c => c.timestamp.startsWith(today)).length;
    const successfulCalls = callHistory.filter(c => c.outcome === 'payment' || c.outcome === 'booking').length;
    const totalPaymentsToday = paymentHistory
        .filter(p => p.timestamp.startsWith(today))
        .reduce((sum, p) => sum + p.amount, 0);
    
    return {
        callsToday,
        successfulCalls,
        totalPaymentsToday,
        totalCalls: callHistory.length,
        totalPayments: paymentHistory.length,
        totalBookings: bookingHistory.length
    };
}

module.exports = {
    addActivity,
    getActivities,
    logCall,
    getCallHistory,
    updateCallStatus,
    logPayment,
    getPaymentHistory,
    logBooking,
    getBookingHistory,
    getStats
};
