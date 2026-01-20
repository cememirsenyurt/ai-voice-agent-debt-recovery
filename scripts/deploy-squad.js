/**
 * Deploy Squad to Vapi
 * 
 * Creates 3 specialized assistants:
 * 1. Sophie - Welcome Agent
 * 2. Marcus - Debt Recovery Specialist  
 * 3. Emma - Appointment Specialist
 */

require('dotenv').config();
const { sophieConfig, marcusConfig, emmaConfig } = require('../src/config/squad');

const VAPI_API_KEY = process.env.VAPI_PRIVATE_KEY;
const SERVER_URL = process.env.SERVER_URL;

if (!VAPI_API_KEY) {
    console.error('❌ VAPI_PRIVATE_KEY not found in .env');
    process.exit(1);
}

if (!SERVER_URL) {
    console.error('❌ SERVER_URL not found in .env');
    process.exit(1);
}

async function createAssistant(config, name) {
    // Update server URL - remove /vapi/webhook if already present
    const baseUrl = SERVER_URL.replace(/\/vapi\/webhook\/?$/, '');
    config.serverUrl = `${baseUrl}/vapi/webhook`;
    
    const response = await fetch('https://api.vapi.ai/assistant', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create ${name}: ${response.status} - ${error}`);
    }
    
    const assistant = await response.json();
    console.log(`✅ Created ${name}: ${assistant.id}`);
    return assistant;
}

async function deploy() {
    console.log('🚀 Deploying Pawsome Pet Grooming Squad...\n');
    console.log(`📍 Server URL: ${SERVER_URL}\n`);
    
    try {
        // Create all 3 assistants
        console.log('Creating Sophie (Welcome Agent)...');
        const sophie = await createAssistant(sophieConfig, 'Sophie');
        
        console.log('Creating Marcus (Debt Specialist)...');
        const marcus = await createAssistant(marcusConfig, 'Marcus');
        
        console.log('Creating Emma (Appointment Agent)...');
        const emma = await createAssistant(emmaConfig, 'Emma');
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 Squad Deployed Successfully!');
        console.log('='.repeat(60));
        console.log('\nAssistant IDs:');
        console.log(`  SOPHIE_ID=${sophie.id}`);
        console.log(`  MARCUS_ID=${marcus.id}`);
        console.log(`  EMMA_ID=${emma.id}`);
        console.log('\n📝 Add these to your .env file:');
        console.log(`SOPHIE_ASSISTANT_ID=${sophie.id}`);
        console.log(`MARCUS_ASSISTANT_ID=${marcus.id}`);
        console.log(`EMMA_ASSISTANT_ID=${emma.id}`);
        console.log(`VAPI_ASSISTANT_ID=${sophie.id}  # Sophie is the entry point`);
        console.log('\n💡 Sophie is the entry point - she routes to Marcus or Emma');
        console.log('='.repeat(60));
        
        return { sophie, marcus, emma };
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

deploy();
