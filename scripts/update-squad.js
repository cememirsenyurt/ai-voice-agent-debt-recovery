/**
 * Update Squad Assistants with Transfer Tools
 * 
 * Patches existing assistants to enable transfers between agents
 */

require('dotenv').config();
const { sophieConfig, marcusConfig, emmaConfig } = require('../src/config/squad');

const VAPI_API_KEY = process.env.VAPI_PRIVATE_KEY;
const SERVER_URL = process.env.SERVER_URL;

const SOPHIE_ID = process.env.SOPHIE_ASSISTANT_ID;
const MARCUS_ID = process.env.MARCUS_ASSISTANT_ID;
const EMMA_ID = process.env.EMMA_ASSISTANT_ID;

if (!VAPI_API_KEY || !SOPHIE_ID || !MARCUS_ID || !EMMA_ID) {
    console.error('❌ Missing required environment variables');
    console.error('Required: VAPI_PRIVATE_KEY, SOPHIE_ASSISTANT_ID, MARCUS_ASSISTANT_ID, EMMA_ASSISTANT_ID');
    process.exit(1);
}

async function updateAssistant(assistantId, config, name) {
    // Update server URL
    const baseUrl = SERVER_URL.replace(/\/vapi\/webhook\/?$/, '');
    config.serverUrl = `${baseUrl}/vapi/webhook`;
    
    const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: config.model,
            serverUrl: config.serverUrl
        })
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to update ${name}: ${response.status} - ${error}`);
    }
    
    console.log(`✅ Updated ${name}`);
    return await response.json();
}

async function update() {
    console.log('🔄 Updating Squad with Transfer Tools...\n');
    
    try {
        await updateAssistant(SOPHIE_ID, sophieConfig, 'Sophie');
        await updateAssistant(MARCUS_ID, marcusConfig, 'Marcus');
        await updateAssistant(EMMA_ID, emmaConfig, 'Emma');
        
        console.log('\n🎉 Squad Updated Successfully!');
        console.log('\nTransfer capabilities:');
        console.log('  Sophie → Marcus (debt) or Emma (booking)');
        console.log('  Marcus → Emma (after payment)');
        console.log('  Emma → Marcus (if not eligible)');
        
    } catch (error) {
        console.error('❌ Update failed:', error.message);
        process.exit(1);
    }
}

update();
