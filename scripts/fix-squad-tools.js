/**
 * Fix Squad Tools - Add function tools to each assistant
 */

require('dotenv').config();

const VAPI_API_KEY = process.env.VAPI_PRIVATE_KEY;

if (!VAPI_API_KEY) {
    console.error('❌ VAPI_PRIVATE_KEY not found in .env');
    process.exit(1);
}

// Assistant IDs from your .env
const assistantIds = {
    sophie: process.env.SOPHIE_ASSISTANT_ID,
    marcus: process.env.MARCUS_ASSISTANT_ID,
    emma: process.env.EMMA_ASSISTANT_ID
};

// Tools for each assistant
const sophieTools = [
    {
        type: 'function',
        function: {
            name: 'verifyIdentity',
            description: 'Verify customer identity using phone number and last 4 digits.',
            parameters: {
                type: 'object',
                properties: {
                    phoneNumber: { type: 'string', description: 'Customer phone number (e.g., 555-0101)' },
                    lastFourDigits: { type: 'string', description: 'Last 4 digits of phone number for verification' }
                },
                required: ['phoneNumber', 'lastFourDigits']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'getAccountBalance',
            description: 'Get customer account balance after identity is verified.',
            parameters: {
                type: 'object',
                properties: {
                    customerId: { type: 'string', description: 'Verified customer ID from verifyIdentity result' }
                },
                required: ['customerId']
            }
        }
    }
];

const marcusTools = [
    {
        type: 'function',
        function: {
            name: 'getAccountBalance',
            description: 'Get customer account balance and debt information.',
            parameters: {
                type: 'object',
                properties: {
                    customerId: { type: 'string', description: 'Customer ID' }
                },
                required: ['customerId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'processPayment',
            description: 'Process a payment towards outstanding balance.',
            parameters: {
                type: 'object',
                properties: {
                    customerId: { type: 'string', description: 'Customer ID' },
                    amount: { type: 'number', description: 'Payment amount in dollars' },
                    paymentMethod: { type: 'string', enum: ['card', 'bank_transfer'], description: 'Payment method' }
                },
                required: ['customerId', 'amount']
            }
        }
    }
];

const emmaTools = [
    {
        type: 'function',
        function: {
            name: 'checkBookingEligibility',
            description: 'Check if customer can book appointments.',
            parameters: {
                type: 'object',
                properties: {
                    customerId: { type: 'string', description: 'Customer ID' }
                },
                required: ['customerId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'getAvailableSlots',
            description: 'Get available appointment slots for a service.',
            parameters: {
                type: 'object',
                properties: {
                    service: { 
                        type: 'string', 
                        enum: ['bath', 'full_grooming', 'nail_trim', 'teeth_cleaning'],
                        description: 'Service type' 
                    }
                },
                required: ['service']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'bookAppointment',
            description: 'Book an appointment for a customer.',
            parameters: {
                type: 'object',
                properties: {
                    customerId: { type: 'string', description: 'Customer ID' },
                    petName: { type: 'string', description: 'Name of the pet' },
                    service: { type: 'string', description: 'Service type' },
                    dateTime: { type: 'string', description: 'Appointment date and time' },
                    requiresPrepayment: { type: 'boolean', description: 'Whether prepayment is required' }
                },
                required: ['customerId', 'petName', 'service', 'dateTime']
            }
        }
    }
];

async function updateAssistant(assistantId, name, tools) {
    console.log(`\n📝 Updating ${name} (${assistantId})...`);
    
    try {
        // First, get current assistant config
        const getResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!getResponse.ok) {
            throw new Error(`Failed to get assistant: ${getResponse.status}`);
        }
        
        const currentConfig = await getResponse.json();
        
        // Update the model with tools
        const updatePayload = {
            model: {
                ...currentConfig.model,
                tools: tools
            }
        };
        
        const updateResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatePayload)
        });
        
        if (!updateResponse.ok) {
            const error = await updateResponse.text();
            throw new Error(`Failed to update: ${updateResponse.status} - ${error}`);
        }
        
        console.log(`✅ ${name} updated with ${tools.length} tools`);
        return true;
    } catch (error) {
        console.error(`❌ Error updating ${name}:`, error.message);
        return false;
    }
}

async function main() {
    console.log('🔧 Fixing Squad Tools Configuration\n');
    console.log('='.repeat(50));
    
    // Check IDs exist
    for (const [name, id] of Object.entries(assistantIds)) {
        if (!id) {
            console.error(`❌ Missing ${name.toUpperCase()}_ASSISTANT_ID in .env`);
            process.exit(1);
        }
        console.log(`${name}: ${id}`);
    }
    
    console.log('='.repeat(50));
    
    // Update each assistant
    await updateAssistant(assistantIds.sophie, 'Sophie', sophieTools);
    await updateAssistant(assistantIds.marcus, 'Marcus', marcusTools);
    await updateAssistant(assistantIds.emma, 'Emma', emmaTools);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Done! Tools should now be configured.');
    console.log('\n⚠️  Remember: Each assistant also needs Server URL set to:');
    console.log('   https://pawsome-voice-agent.onrender.com/vapi/webhook');
}

main();
