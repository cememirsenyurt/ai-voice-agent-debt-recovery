/**
 * Vapi Webhook Routes
 * 
 * Handles all incoming webhook requests from Vapi.
 * These routes process tool calls made by the AI assistant during conversations.
 */

const express = require('express');
const router = express.Router();
const toolHandlers = require('../tools/handlers');
const activity = require('../data/activity');
const { analyzeCallSentiment } = require('../services/sentiment');

// Track active calls with their transcripts
const activeCalls = new Map();

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
                
                if (message.status === 'in-progress') {
                    // Call started - create tracking entry with transcript array
                    const callId = req.body.call?.id || `call-${Date.now()}`;
                    activeCalls.set(callId, {
                        startTime: Date.now(),
                        customerName: 'Unknown',
                        customerPhone: 'Unknown',
                        transcript: [] // Collect transcript messages here
                    });
                    
                    // Log call start
                    activity.logCall({
                        phone: 'Unknown',
                        customerName: 'Incoming Call',
                        duration: 0,
                        status: 'in-progress',
                        outcome: 'none',
                        notes: 'Call in progress...'
                    });
                }
                
                return res.json({ success: true });

            case 'transcript':
                // Collect transcript for sentiment analysis
                const transcriptCallId = req.body.call?.id;
                if (transcriptCallId && activeCalls.has(transcriptCallId)) {
                    const callData = activeCalls.get(transcriptCallId);
                    const role = message.role === 'assistant' ? 'Alex' : 'Customer';
                    callData.transcript.push(`${role}: ${message.transcript}`);
                    
                    // Update customer name if detected
                    if (message.role === 'user' && callData.customerName === 'Unknown') {
                        // Try to extract name from verification context
                    }
                }
                console.log(`[Vapi] Transcript (${message.role}): ${message.transcript}`);
                return res.json({ success: true });

            case 'end-of-call-report':
                // Log call summary when conversation ends
                console.log('[Vapi] Call ended:', message.endedReason);
                
                // Get call details from the report
                const callSummary = message.summary || '';
                const duration = Math.round((message.durationSeconds || 0));
                const endCallId = req.body.call?.id;
                const customerPhone = message.call?.customer?.number || 'Web Call';
                const customerName = message.call?.customer?.name || 'Customer';
                
                // Determine outcome based on summary
                let outcome = 'none';
                if (callSummary.toLowerCase().includes('payment')) outcome = 'payment';
                else if (callSummary.toLowerCase().includes('book') || callSummary.toLowerCase().includes('appointment')) outcome = 'booking';
                else if (callSummary.toLowerCase().includes('callback')) outcome = 'callback';
                
                // Get transcript from Vapi's end-of-call-report OR from our collected data
                let fullTranscript = '';
                
                // Vapi provides transcript in the report
                if (message.transcript) {
                    fullTranscript = message.transcript;
                } else if (message.messages && Array.isArray(message.messages)) {
                    // Build from messages array
                    fullTranscript = message.messages
                        .filter(m => m.role && m.content)
                        .map(m => `${m.role === 'assistant' ? 'Alex' : 'Customer'}: ${m.content}`)
                        .join('\n');
                } else if (endCallId && activeCalls.has(endCallId)) {
                    // Use our collected transcript
                    fullTranscript = activeCalls.get(endCallId).transcript.join('\n');
                }
                
                // Log the completed call first
                const loggedCall = activity.logCall({
                    phone: customerPhone,
                    customerName: customerName,
                    duration: duration,
                    status: 'completed',
                    outcome: outcome,
                    notes: callSummary.substring(0, 200)
                });
                
                // Run sentiment analysis server-side (async, don't block response)
                if (fullTranscript && fullTranscript.length > 20) {
                    console.log('[Vapi] Running sentiment analysis on transcript...');
                    analyzeCallSentiment(fullTranscript, {
                        duration,
                        customerName,
                        customerPhone,
                        callId: loggedCall.id
                    }).then(sentiment => {
                        // Store sentiment with the call
                        activity.updateCallSentiment(loggedCall.id, sentiment);
                        
                        // Log sentiment activity
                        const emoji = sentiment.overallSentiment >= 7 ? '😊' : 
                                     sentiment.overallSentiment >= 4 ? '😐' : '😟';
                        activity.addActivity('sentiment', emoji,
                            `Sentiment analyzed: ${sentiment.summary}`,
                            {
                                callId: loggedCall.id,
                                customerName,
                                sentiment: sentiment.overallSentiment,
                                satisfaction: sentiment.customerSatisfaction,
                                tags: sentiment.tags
                            }
                        );
                        console.log('[Vapi] Sentiment analysis complete:', sentiment.summary);
                    }).catch(err => {
                        console.error('[Vapi] Sentiment analysis failed:', err.message);
                    });
                }
                
                // Clean up active call tracking
                if (endCallId) {
                    activeCalls.delete(endCallId);
                }
                
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
            
            // Handle arguments - Vapi may send as string OR object
            let args;
            if (typeof func.arguments === 'string') {
                args = JSON.parse(func.arguments || '{}');
            } else {
                args = func.arguments || {};
            }

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
