/**
 * Local Tool Testing Script
 * 
 * This script allows you to test the tool handlers locally
 * without needing a Vapi connection.
 * 
 * Usage:
 *   node scripts/test-tools.js
 */

const handlers = require('../src/tools/handlers');

console.log('='.repeat(60));
console.log('🧪 Testing Debt Recovery Tools Locally');
console.log('='.repeat(60));
console.log('');

// =============================================================================
// TEST SCENARIOS
// =============================================================================

async function runTests() {
    
    // -------------------------------------------------------------------------
    // Test 1: Identity Verification
    // -------------------------------------------------------------------------
    console.log('📋 TEST 1: Identity Verification');
    console.log('-'.repeat(40));
    
    // Successful verification
    const verifyResult = handlers.verifyIdentity({
        phoneNumber: '555-0101',
        lastFourDigits: '0101'
    });
    console.log('✓ Valid verification:', verifyResult);
    console.log('');
    
    // Failed verification (wrong digits)
    const verifyFail = handlers.verifyIdentity({
        phoneNumber: '555-0101',
        lastFourDigits: '9999'
    });
    console.log('✗ Invalid verification:', verifyFail);
    console.log('');

    // -------------------------------------------------------------------------
    // Test 2: Account Balance Lookup
    // -------------------------------------------------------------------------
    console.log('📋 TEST 2: Account Balance Lookup');
    console.log('-'.repeat(40));
    
    const balanceResult = handlers.getAccountBalance({
        customerId: 'CUST001'
    });
    console.log('Sarah\'s balance:', balanceResult);
    console.log('');

    // Customer with no debt
    const noDebtBalance = handlers.getAccountBalance({
        customerId: 'CUST003'
    });
    console.log('Emily\'s balance (no debt):', noDebtBalance);
    console.log('');

    // -------------------------------------------------------------------------
    // Test 3: Booking Eligibility
    // -------------------------------------------------------------------------
    console.log('📋 TEST 3: Booking Eligibility');
    console.log('-'.repeat(40));
    
    // Customer with debt (should be blocked)
    const eligibility1 = handlers.checkBookingEligibility({
        customerId: 'CUST001'
    });
    console.log('Sarah (has debt):', eligibility1);
    console.log('');

    // Customer without debt (should be allowed)
    const eligibility2 = handlers.checkBookingEligibility({
        customerId: 'CUST003'
    });
    console.log('Emily (no debt):', eligibility2);
    console.log('');

    // -------------------------------------------------------------------------
    // Test 4: Payment Processing
    // -------------------------------------------------------------------------
    console.log('📋 TEST 4: Payment Processing');
    console.log('-'.repeat(40));
    
    // Full payment scenario
    console.log('Scenario: Michael pays full $95.50 balance');
    const fullPayment = handlers.processPayment({
        customerId: 'CUST002',
        amount: 95.50,
        paymentMethod: 'card'
    });
    console.log('Result:', fullPayment);
    console.log('');

    // Partial payment (70% settlement) - need to reset data first
    // Let's test with David ($320 balance, 70% = $224)
    console.log('Scenario: David pays $224 (70% of $320)');
    const settlementPayment = handlers.processPayment({
        customerId: 'CUST004',
        amount: 224,
        paymentMethod: 'card'
    });
    console.log('Result:', settlementPayment);
    console.log('');

    // -------------------------------------------------------------------------
    // Test 5: Available Slots
    // -------------------------------------------------------------------------
    console.log('📋 TEST 5: Get Available Slots');
    console.log('-'.repeat(40));
    
    // For customer who can book (Emily)
    const slots = handlers.getAvailableSlots({
        customerId: 'CUST003'
    });
    console.log('Available slots:', slots);
    console.log('');

    // -------------------------------------------------------------------------
    // Test 6: Book Appointment
    // -------------------------------------------------------------------------
    console.log('📋 TEST 6: Book Appointment');
    console.log('-'.repeat(40));
    
    // Book for Emily (no debt)
    const booking = handlers.bookAppointment({
        customerId: 'CUST003',
        date: '2026-01-22',
        time: '10:00 AM',
        serviceId: 'full_groom',
        prepaid: false
    });
    console.log('Booking result:', booking);
    console.log('');

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('='.repeat(60));
}

// Run tests
runTests().catch(console.error);
