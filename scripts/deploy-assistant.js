/**
 * Deploy Assistant to Vapi
 * 
 * This script creates or updates the voice assistant on Vapi's platform.
 * 
 * Usage:
 *   node scripts/deploy-assistant.js
 * 
 * Prerequisites:
 *   - VAPI_PRIVATE_KEY environment variable must be set
 *   - SERVER_URL environment variable should point to your webhook server
 */

require('dotenv').config();
const { assistantConfig } = require('../src/config/assistant');

// =============================================================================
// CONFIGURATION
// =============================================================================

const VAPI_API_URL = 'https://api.vapi.ai';
const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;

// Validate required environment variables
if (!VAPI_PRIVATE_KEY) {
    console.error('❌ Error: VAPI_PRIVATE_KEY environment variable is required');
    console.error('   Get your API key from: https://dashboard.vapi.ai');
    process.exit(1);
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Create a new assistant on Vapi
 */
async function createAssistant() {
    console.log('📤 Creating new assistant on Vapi...\n');

    const response = await fetch(`${VAPI_API_URL}/assistant`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(assistantConfig)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create assistant: ${response.status} - ${error}`);
    }

    const assistant = await response.json();
    return assistant;
}

/**
 * List existing assistants to find if one already exists
 */
async function listAssistants() {
    const response = await fetch(`${VAPI_API_URL}/assistant`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to list assistants: ${response.status} - ${error}`);
    }

    return await response.json();
}

/**
 * Update an existing assistant
 */
async function updateAssistant(assistantId) {
    console.log(`📤 Updating assistant ${assistantId}...\n`);

    const response = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(assistantConfig)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to update assistant: ${response.status} - ${error}`);
    }

    return await response.json();
}

// =============================================================================
// MAIN DEPLOYMENT FLOW
// =============================================================================

async function deploy() {
    console.log('='.repeat(60));
    console.log('🐕 Pawsome Pet Grooming - Assistant Deployment');
    console.log('='.repeat(60));
    console.log('');

    try {
        // Check for existing assistant with same name
        console.log('🔍 Checking for existing assistants...');
        const assistants = await listAssistants();
        
        const existingAssistant = assistants.find(
            a => a.name === assistantConfig.name
        );

        let assistant;

        if (existingAssistant) {
            console.log(`   Found existing assistant: ${existingAssistant.id}`);
            assistant = await updateAssistant(existingAssistant.id);
            console.log('✅ Assistant updated successfully!\n');
        } else {
            console.log('   No existing assistant found, creating new one...');
            assistant = await createAssistant();
            console.log('✅ Assistant created successfully!\n');
        }

        // Display results
        console.log('='.repeat(60));
        console.log('📋 ASSISTANT DETAILS');
        console.log('='.repeat(60));
        console.log(`   ID:        ${assistant.id}`);
        console.log(`   Name:      ${assistant.name}`);
        console.log(`   Model:     ${assistant.model?.model || 'N/A'}`);
        console.log(`   Voice:     ${assistant.voice?.voiceId || 'N/A'}`);
        console.log('');
        console.log('='.repeat(60));
        console.log('🔗 TESTING');
        console.log('='.repeat(60));
        console.log(`   Dashboard: https://dashboard.vapi.ai`);
        console.log(`   Test via:  Vapi Web Widget or Phone Number`);
        console.log('');
        console.log('📝 To test with a phone number:');
        console.log('   1. Go to Vapi Dashboard > Phone Numbers');
        console.log('   2. Add a phone number (or use Vapi test number)');
        console.log('   3. Assign this assistant to the number');
        console.log('   4. Call the number to test!');
        console.log('');
        console.log('='.repeat(60));

        return assistant;

    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

// Run deployment
deploy();
