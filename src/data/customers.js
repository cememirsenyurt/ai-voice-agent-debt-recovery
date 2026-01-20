/**
 * Mock Customer Database
 * 
 * This simulates a customer database for the pet grooming business.
 * In production, this would connect to an actual database.
 * 
 * Each customer has:
 * - Personal information (name, phone, email)
 * - Pet information
 * - Outstanding balance (debt)
 * - Payment history
 */

const customers = {
    // Customer with significant outstanding debt
    '555-0101': {
        id: 'CUST001',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '555-0101',
        email: 'sarah.johnson@email.com',
        // Security verification - last 4 digits of phone used for identity
        verificationCode: '0101',
        pets: [
            { name: 'Max', type: 'Golden Retriever', lastVisit: '2025-11-15' }
        ],
        outstandingBalance: 185.00,
        originalDebt: 185.00,
        lastPaymentDate: '2025-10-01',
        notes: 'Regular customer. Two missed payments.',
        status: 'active'
    },

    // Customer with smaller debt
    '555-0102': {
        id: 'CUST002',
        firstName: 'Michael',
        lastName: 'Chen',
        phone: '555-0102',
        email: 'michael.chen@email.com',
        verificationCode: '0102',
        pets: [
            { name: 'Bella', type: 'Poodle', lastVisit: '2025-12-01' },
            { name: 'Charlie', type: 'Poodle', lastVisit: '2025-12-01' }
        ],
        outstandingBalance: 95.50,
        originalDebt: 95.50,
        lastPaymentDate: '2025-11-15',
        notes: 'Has two poodles. One missed payment.',
        status: 'active'
    },

    // Customer with no debt (for testing edge cases)
    '555-0103': {
        id: 'CUST003',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        phone: '555-0103',
        email: 'emily.r@email.com',
        verificationCode: '0103',
        pets: [
            { name: 'Luna', type: 'Shih Tzu', lastVisit: '2026-01-10' }
        ],
        outstandingBalance: 0,
        originalDebt: 0,
        lastPaymentDate: '2026-01-10',
        notes: 'Good standing customer.',
        status: 'active'
    },

    // Customer with large debt
    '555-0104': {
        id: 'CUST004',
        firstName: 'David',
        lastName: 'Thompson',
        phone: '555-0104',
        email: 'david.t@email.com',
        verificationCode: '0104',
        pets: [
            { name: 'Rocky', type: 'German Shepherd', lastVisit: '2025-09-20' },
            { name: 'Duke', type: 'Husky', lastVisit: '2025-09-20' }
        ],
        outstandingBalance: 320.00,
        originalDebt: 320.00,
        lastPaymentDate: '2025-08-15',
        notes: 'Large dogs, premium grooming. Three missed payments.',
        status: 'active'
    },

    // Customer who already made partial payment
    '555-0105': {
        id: 'CUST005',
        firstName: 'Jessica',
        lastName: 'Williams',
        phone: '555-0105',
        email: 'jessica.w@email.com',
        verificationCode: '0105',
        pets: [
            { name: 'Coco', type: 'French Bulldog', lastVisit: '2025-12-20' }
        ],
        outstandingBalance: 45.00,
        originalDebt: 150.00,
        lastPaymentDate: '2026-01-05',
        notes: 'Made partial payment of $105. Remaining balance.',
        status: 'active'
    }
};

// =============================================================================
// GROOMING SERVICES (for booking context)
// =============================================================================

const services = {
    'basic_groom': {
        name: 'Basic Grooming',
        description: 'Bath, brush, nail trim, ear cleaning',
        price: 45.00,
        duration: 60
    },
    'full_groom': {
        name: 'Full Grooming',
        description: 'Basic grooming plus haircut and styling',
        price: 75.00,
        duration: 90
    },
    'premium_groom': {
        name: 'Premium Spa Package',
        description: 'Full grooming plus teeth brushing, paw treatment, cologne',
        price: 110.00,
        duration: 120
    },
    'bath_only': {
        name: 'Bath Only',
        description: 'Quick bath and towel dry',
        price: 25.00,
        duration: 30
    }
};

// =============================================================================
// AVAILABLE APPOINTMENT SLOTS (dynamically generated)
// =============================================================================

// Generate available slots for the next 7 days
function generateAvailableSlots() {
    const slots = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const times = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];
    
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Skip Sundays (closed)
        if (date.getDay() === 0) continue;
        
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const dayName = dayNames[date.getDay()];
        
        // Add 2-3 slots per day
        const dayTimes = times.filter((_, idx) => idx % 2 === (i % 2)); // Alternate times
        for (const time of dayTimes) {
            slots.push({ date: dateStr, dayName, time, available: true });
        }
    }
    
    return slots;
}

const availableSlots = generateAvailableSlots();

module.exports = {
    customers,
    services,
    availableSlots
};
