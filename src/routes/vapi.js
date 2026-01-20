/**
 * Vapi Webhook Routes
 * 
 * Handles all incoming webhook requests from Vapi.
 * These routes process tool calls made by the AI assistant during conversations.
 */

const express = require('express');
const router = express.Router();
const toolHandlers = require('../tools/handlers');

// =============================================================================
// WEBHOOK ENDPOINT
// =============================================================================

/**
 * Main webhook endpoint for Vapi
 * 
 * Vapi sends POST requests here when:
 * - The assistant needs to execute a tool (function call)
 * - Various conversation events occur (status updates, transcripts, etc.)
 */
router.post('/webhook', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Log incoming message type for debugging
        console.log(`[Vapi] Received message type: ${message?.type}`);

        // Handle different message types from Vapi
        switch (message?.type) {
            case 'tool-calls':
                // Process tool/function calls from the assistant
                return await handleToolCalls(req.body, res);

            case 'status-update':
                // Log status changes (call started, ended, etc.)
                console.log(`[Vapi] Status update: ${message.status}`);
                return res.json({ success: true });

            case 'transcript':
                // Log conversation transcripts
                console.log(`[Vapi] Transcript: ${message.transcript}`);
                return res.json({ success: true });

            case 'end-of-call-report':
                // Log call summary when conversation ends
                console.log('[Vapi] Call ended:', message.endedReason);
                return res.json({ success: true });

            default:
                // Acknowledge unknown message types
                return res.json({ success: true });
        }
    } catch (error) {
        console.error('[Vapi] Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// =============================================================================
// TOOL CALL HANDLER
// =============================================================================

/**
 * Processes tool calls from the Vapi assistant
 * 
 * When the AI decides to use a tool (e.g., verify identity, lookup balance),
 * this function routes the call to the appropriate handler and returns results.
 */
async function handleToolCalls(body, res) {
    const { message } = body;
    const toolCalls = message.toolCalls || [];
    
    // Process each tool call and collect results
    const results = await Promise.all(
        toolCalls.map(async (toolCall) => {
            const { id, function: func } = toolCall;
            const toolName = func.name;
            const args = JSON.parse(func.arguments || '{}');

            console.log(`[Tool] Executing: ${toolName}`, args);

            // Route to appropriate handler
            const handler = toolHandlers[toolName];
            
            if (!handler) {
                console.error(`[Tool] Unknown tool: ${toolName}`);
                return {
                    toolCallId: id,
                    result: JSON.stringify({ 
                        success: false, 
                        error: `Unknown tool: ${toolName}` 
                    })
                };
            }

            try {
                const result = await handler(args);
                console.log(`[Tool] Result for ${toolName}:`, result);
                
                return {
                    toolCallId: id,
                    result: JSON.stringify(result)
                };
            } catch (error) {
                console.error(`[Tool] Error in ${toolName}:`, error);
                return {
                    toolCallId: id,
                    result: JSON.stringify({ 
                        success: false, 
                        error: error.message 
                    })
                };
            }
        })
    );

    // Return results in Vapi's expected format
    res.json({ results });
}

module.exports = router;
