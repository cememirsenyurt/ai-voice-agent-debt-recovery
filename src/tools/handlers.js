/**
 * Tool Handlers for Vapi Assistant
 * 
 * These functions are called when the AI assistant needs to perform actions:
 * - Verify customer identity
 * - Look up account balance
 * - Process payments
 * - Book appointments
 * 
 * BUSINESS RULES:
 * 1. Identity must be verified before any account access
 * 2. Customers with debt cannot book unless:
 *    a. Debt is paid in full, OR
 *    b. At least 70% is settled
 * 3. Partial settlement requires prepayment for next booking
 */

const { customers, services, availableSlots } = require('../data/customers');

// Configuration
const MINIMUM_SETTLEMENT_PERCENTAGE = process.env.MINIMUM_SETTLEMENT_PERCENTAGE || 70;
const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Pawsome Pet Grooming';

// =============================================================================
// IDENTITY VERIFICATION
// =============================================================================

/**
 * Verify customer identity using phone number and last 4 digits
 * 
 * @param {Object} args - { phoneNumber: string, lastFourDigits: string }
 * @returns {Object} - Verification result with customer name if successful
 */
function verifyIdentity({ phoneNumber, lastFourDigits }) {
    console.log('[verifyIdentity] Input:', { phoneNumber, lastFourDigits });
    
    // Normalize phone number (remove any formatting, keep only digits)
    const normalizedPhone = (phoneNumber || '').replace(/\D/g, '');
    const normalizedInput = (lastFourDigits || '').replace(/\D/g, '');
    
    console.log('[verifyIdentity] Normalized:', { normalizedPhone, normalizedInput });

    // Look up customer by phone - try multiple matching strategies
    let customer = null;
    
    for (const c of Object.values(customers)) {
        const customerPhone = c.phone.replace(/\D/g, '');
        
        // Strategy 1: Exact match
        if (customerPhone === normalizedPhone) {
            customer = c;
            break;
        }
        
        // Strategy 2: Input ends with customer phone (e.g., "15550101" matches "5550101")
        if (normalizedPhone.endsWith(customerPhone)) {
            customer = c;
            break;
        }
        
        // Strategy 3: Customer phone ends with input (e.g., "5550101" matches "0101")
        if (customerPhone.endsWith(normalizedPhone) && normalizedPhone.length >= 4) {
            customer = c;
            break;
        }
        
        // Strategy 4: Last 4-7 digits match (for spoken numbers)
        const inputLast7 = normalizedPhone.slice(-7);
        const customerLast7 = customerPhone.slice(-7);
        if (inputLast7 === customerLast7 && inputLast7.length >= 4) {
            customer = c;
            break;
        }
    }
    
    console.log('[verifyIdentity] Found customer:', customer ? customer.firstName : 'NONE');

    if (!customer) {
        return {
            success: false,
            verified: false,
            message: `No account found with phone number ${phoneNumber}. Please check the number or contact us directly.`
        };
    }

    // Verify using last 4 digits - also be flexible here
    const customerLast4 = customer.verificationCode;
    const inputLast4 = normalizedInput.slice(-4);
    
    console.log('[verifyIdentity] Verification check:', { customerLast4, inputLast4 });
    
    if (customerLast4 !== inputLast4 && customerLast4 !== normalizedInput) {
        return {
            success: false,
            verified: false,
            message: 'Verification failed. The digits provided do not match our records.'
        };
    }

    // Successful verification
    console.log('[verifyIdentity] SUCCESS for', customer.firstName);
    return {
        success: true,
        verified: true,
        customerId: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        message: `Identity verified for ${customer.firstName} ${customer.lastName}.`
    };
}

// =============================================================================
// BALANCE LOOKUP
// =============================================================================

/**
 * Look up customer's outstanding balance
 * 
 * @param {Object} args - { customerId: string }
 * @returns {Object} - Balance information
 */
function getAccountBalance({ customerId }) {
    const customer = Object.values(customers).find(c => c.id === customerId);

    if (!customer) {
        return {
            success: false,
            message: 'Customer not found. Please verify identity first.'
        };
    }

    const hasDebt = customer.outstandingBalance > 0;
    const minimumSettlement = (customer.outstandingBalance * MINIMUM_SETTLEMENT_PERCENTAGE) / 100;

    return {
        success: true,
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        outstandingBalance: customer.outstandingBalance,
        originalDebt: customer.originalDebt,
        hasDebt: hasDebt,
        minimumSettlementAmount: Math.ceil(minimumSettlement * 100) / 100, // Round up to cents
        minimumSettlementPercentage: MINIMUM_SETTLEMENT_PERCENTAGE,
        lastPaymentDate: customer.lastPaymentDate,
        pets: customer.pets.map(p => ({ name: p.name, type: p.type })),
        message: hasDebt 
            ? `Outstanding balance of $${customer.outstandingBalance.toFixed(2)}. Minimum settlement: $${minimumSettlement.toFixed(2)} (${MINIMUM_SETTLEMENT_PERCENTAGE}%).`
            : 'No outstanding balance. Account in good standing.'
    };
}

// =============================================================================
// PAYMENT PROCESSING
// =============================================================================

/**
 * Process a payment towards the outstanding balance
 * 
 * @param {Object} args - { customerId: string, amount: number, paymentMethod: string }
 * @returns {Object} - Payment result
 */
function processPayment({ customerId, amount, paymentMethod = 'card' }) {
    const customer = Object.values(customers).find(c => c.id === customerId);

    if (!customer) {
        return {
            success: false,
            message: 'Customer not found.'
        };
    }

    // Validate payment amount
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return {
            success: false,
            message: 'Invalid payment amount.'
        };
    }

    const minimumSettlement = (customer.outstandingBalance * MINIMUM_SETTLEMENT_PERCENTAGE) / 100;
    const isFullPayment = paymentAmount >= customer.outstandingBalance;
    const meetsMinimumSettlement = paymentAmount >= minimumSettlement;

    // Calculate new balance
    const newBalance = Math.max(0, customer.outstandingBalance - paymentAmount);
    const settlementPercentage = ((customer.outstandingBalance - newBalance) / customer.originalDebt) * 100;

    // Simulate payment processing (in production, integrate with payment provider)
    // For demo purposes, we'll update the mock data
    customer.outstandingBalance = newBalance;
    customer.lastPaymentDate = new Date().toISOString().split('T')[0];

    // Determine booking eligibility
    let bookingStatus = 'blocked';
    let bookingMessage = '';

    if (newBalance === 0) {
        bookingStatus = 'allowed';
        bookingMessage = 'Full balance cleared. You can book appointments normally.';
    } else if (meetsMinimumSettlement) {
        bookingStatus = 'allowed_with_prepayment';
        bookingMessage = `Settlement accepted. Remaining balance: $${newBalance.toFixed(2)}. Future bookings require prepayment.`;
    } else {
        bookingStatus = 'blocked';
        const stillNeeded = minimumSettlement - paymentAmount;
        bookingMessage = `Payment received, but minimum settlement of $${minimumSettlement.toFixed(2)} not met. Need additional $${stillNeeded.toFixed(2)} to book appointments.`;
    }

    return {
        success: true,
        paymentAmount: paymentAmount,
        previousBalance: customer.outstandingBalance + paymentAmount,
        newBalance: newBalance,
        isFullPayment: isFullPayment,
        meetsMinimumSettlement: meetsMinimumSettlement,
        settlementPercentage: Math.round(settlementPercentage),
        bookingStatus: bookingStatus,
        message: `Payment of $${paymentAmount.toFixed(2)} processed successfully. ${bookingMessage}`,
        confirmationNumber: `PAY-${Date.now().toString(36).toUpperCase()}`
    };
}

// =============================================================================
// BOOKING MANAGEMENT
// =============================================================================

/**
 * Check if customer is eligible to book appointments
 * 
 * @param {Object} args - { customerId: string }
 * @returns {Object} - Booking eligibility status
 */
function checkBookingEligibility({ customerId }) {
    const customer = Object.values(customers).find(c => c.id === customerId);

    if (!customer) {
        return {
            success: false,
            canBook: false,
            message: 'Customer not found.'
        };
    }

    const hasDebt = customer.outstandingBalance > 0;
    const paidPercentage = ((customer.originalDebt - customer.outstandingBalance) / customer.originalDebt) * 100;
    const meetsMinimumSettlement = paidPercentage >= MINIMUM_SETTLEMENT_PERCENTAGE;

    let canBook = false;
    let requiresPrepayment = false;
    let message = '';

    if (!hasDebt) {
        canBook = true;
        requiresPrepayment = false;
        message = 'Account in good standing. Regular booking available.';
    } else if (meetsMinimumSettlement) {
        canBook = true;
        requiresPrepayment = true;
        message = `Settlement arrangement in place. Booking requires full prepayment for services.`;
    } else {
        canBook = false;
        requiresPrepayment = false;
        const minimumNeeded = (customer.originalDebt * MINIMUM_SETTLEMENT_PERCENTAGE / 100) - (customer.originalDebt - customer.outstandingBalance);
        message = `Cannot book appointments. Outstanding balance of $${customer.outstandingBalance.toFixed(2)} must be settled. Minimum payment of $${Math.max(0, minimumNeeded).toFixed(2)} required.`;
    }

    return {
        success: true,
        customerId: customer.id,
        canBook: canBook,
        requiresPrepayment: requiresPrepayment,
        outstandingBalance: customer.outstandingBalance,
        message: message
    };
}

/**
 * Get available appointment slots
 * 
 * @param {Object} args - { customerId: string }
 * @returns {Object} - Available slots if eligible
 */
function getAvailableSlots({ customerId }) {
    // First check eligibility
    const eligibility = checkBookingEligibility({ customerId });
    
    if (!eligibility.canBook) {
        return {
            success: false,
            slots: [],
            message: eligibility.message
        };
    }

    // Format slots with day names for better voice output
    const formattedSlots = availableSlots
        .filter(s => s.available)
        .map(s => ({
            date: s.date,
            dayName: s.dayName,
            time: s.time,
            // Voice-friendly format: "Thursday, January 22nd at 10:00 AM"
            voiceFormat: `${s.dayName}, January ${parseInt(s.date.split('-')[2])}${getOrdinalSuffix(parseInt(s.date.split('-')[2]))} at ${s.time}`
        }));

    // Format services for voice - just names and prices
    const formattedServices = Object.entries(services).map(([key, service]) => ({
        id: key,
        name: service.name,
        price: service.price,
        voiceFormat: `${service.name} for $${service.price}`
    }));

    return {
        success: true,
        requiresPrepayment: eligibility.requiresPrepayment,
        slots: formattedSlots,
        services: formattedServices,
        message: eligibility.requiresPrepayment 
            ? 'Here are available slots. Remember, prepayment is required for booking. Please speak slowly when listing these to the customer.'
            : 'Here are available appointment slots. Please speak slowly when listing these to the customer.'
    };
}

// Helper function for ordinal suffixes (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

/**
 * Book an appointment
 * 
 * @param {Object} args - { customerId: string, date: string, time: string, serviceId: string, prepaid: boolean }
 * @returns {Object} - Booking confirmation
 */
function bookAppointment({ customerId, date, time, serviceId, prepaid = false }) {
    const customer = Object.values(customers).find(c => c.id === customerId);

    if (!customer) {
        return {
            success: false,
            message: 'Customer not found.'
        };
    }

    // Check eligibility
    const eligibility = checkBookingEligibility({ customerId });
    
    if (!eligibility.canBook) {
        return {
            success: false,
            message: eligibility.message
        };
    }

    // If prepayment is required, verify it's been made
    if (eligibility.requiresPrepayment && !prepaid) {
        const service = services[serviceId];
        const servicePrice = service ? service.price : 0;
        return {
            success: false,
            requiresPrepayment: true,
            prepaymentAmount: servicePrice,
            message: `Prepayment of $${servicePrice.toFixed(2)} required for ${service?.name || 'this service'} before booking can be confirmed.`
        };
    }

    // Verify slot availability
    const slot = availableSlots.find(s => s.date === date && s.time === time && s.available);
    if (!slot) {
        return {
            success: false,
            message: 'This time slot is no longer available. Please choose another.'
        };
    }

    // Get service details
    const service = services[serviceId];
    if (!service) {
        return {
            success: false,
            message: 'Invalid service selected.'
        };
    }

    // Mark slot as taken
    slot.available = false;

    // Generate confirmation
    const confirmationNumber = `APT-${Date.now().toString(36).toUpperCase()}`;

    return {
        success: true,
        confirmationNumber: confirmationNumber,
        customerName: `${customer.firstName} ${customer.lastName}`,
        petNames: customer.pets.map(p => p.name).join(', '),
        service: service.name,
        servicePrice: service.price,
        date: date,
        time: time,
        duration: service.duration,
        prepaid: prepaid || !eligibility.requiresPrepayment,
        message: `Appointment confirmed! ${service.name} for ${customer.pets.map(p => p.name).join(', ')} on ${date} at ${time}. Confirmation: ${confirmationNumber}`
    };
}

// =============================================================================
// EXPORT ALL HANDLERS
// =============================================================================

module.exports = {
    verifyIdentity,
    getAccountBalance,
    processPayment,
    checkBookingEligibility,
    getAvailableSlots,
    bookAppointment
};
