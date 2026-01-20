#!/bin/bash
# test-all.sh - Comprehensive test suite for Pawsome Voice Agent
# Run: chmod +x scripts/test-all.sh && ./scripts/test-all.sh

URL="${SERVER_URL:-https://pawsome-voice-agent.onrender.com}/vapi/webhook"
API_URL="${SERVER_URL:-https://pawsome-voice-agent.onrender.com}"

call_tool() {
    local name=$1
    local args=$2
    curl -s -X POST "$URL" \
        -H "Content-Type: application/json" \
        -d "{\"message\":{\"type\":\"tool-calls\",\"toolCalls\":[{\"id\":\"test\",\"function\":{\"name\":\"$name\",\"arguments\":\"$args\"}}]}}" \
        | jq -r '.results[0].result | fromjson'
}

echo "========================================"
echo "🐕 PAWSOME PET GROOMING - TEST SUITE"
echo "========================================"
echo "Server: $API_URL"
echo ""

# Health check
echo "📋 Health Check"
curl -s "$API_URL/health" | jq -r '.status'
echo ""

echo "========================================"
echo "🔐 IDENTITY VERIFICATION"
echo "========================================"

echo -e "\n✅ Valid verification (Sarah 555-0101)"
call_tool "verifyIdentity" '{"phoneNumber":"555-0101","lastFourDigits":"0101"}' | jq '{success, verified, customerId, firstName}'

echo -e "\n✅ Valid verification (David 555-0104)"
call_tool "verifyIdentity" '{"phoneNumber":"555-0104","lastFourDigits":"0104"}' | jq '{success, verified, customerId, firstName}'

echo -e "\n❌ Wrong digits"
call_tool "verifyIdentity" '{"phoneNumber":"555-0101","lastFourDigits":"9999"}' | jq '{success, message}'

echo -e "\n❌ Non-existent phone"
call_tool "verifyIdentity" '{"phoneNumber":"555-9999","lastFourDigits":"9999"}' | jq '{success, message}'

echo "========================================"
echo "💰 BALANCE LOOKUP"
echo "========================================"

echo -e "\n✅ Customer with debt (David $320)"
call_tool "getAccountBalance" '{"customerId":"CUST004"}' | jq '{success, customerName, outstandingBalance, minimumSettlementAmount, hasDebt}'

echo -e "\n✅ Customer no debt (Emily)"
call_tool "getAccountBalance" '{"customerId":"CUST003"}' | jq '{success, customerName, outstandingBalance, hasDebt}'

echo -e "\n❌ Invalid customer"
call_tool "getAccountBalance" '{"customerId":"INVALID"}' | jq '{success, message}'

echo "========================================"
echo "📅 BOOKING ELIGIBILITY"
echo "========================================"

echo -e "\n✅ Eligible (Emily - no debt)"
call_tool "checkBookingEligibility" '{"customerId":"CUST003"}' | jq '{success, canBook, requiresPrepayment}'

echo -e "\n❌ Not eligible (David - has debt)"
call_tool "checkBookingEligibility" '{"customerId":"CUST004"}' | jq '{success, canBook, message}'

echo "========================================"
echo "💳 PAYMENT & 70% RULE"
echo "========================================"

echo -e "\n❌ Below 70% payment ($100 of $320 = 31%)"
call_tool "processPayment" '{"customerId":"CUST004","amount":100}' | jq '{success, paymentAmount, newBalance, meetsMinimumSettlement, settlementPercentage, bookingStatus, message}'

echo -e "\n✅ Check eligibility (should still be blocked)"
call_tool "checkBookingEligibility" '{"customerId":"CUST004"}' | jq '{success, canBook, message}'

echo -e "\n✅ Pay remaining to reach 70% ($124 more)"
call_tool "processPayment" '{"customerId":"CUST004","amount":124}' | jq '{success, paymentAmount, newBalance, meetsMinimumSettlement, bookingStatus, message}'

echo -e "\n✅ Check eligibility (should allow with prepayment)"
call_tool "checkBookingEligibility" '{"customerId":"CUST004"}' | jq '{success, canBook, requiresPrepayment}'

echo "========================================"
echo "🗓️ SLOTS & BOOKING"
echo "========================================"

echo -e "\n✅ Get slots (David - now eligible)"
call_tool "getAvailableSlots" '{"customerId":"CUST004"}' | jq '{success, slots: (.slots | length), requiresPrepayment}'

echo -e "\n✅ Book appointment"
call_tool "bookAppointment" '{"customerId":"CUST004","date":"2026-01-24","time":"3:00 PM","serviceId":"full_groom"}' | jq '{success, confirmationNumber, service, date, time}'

echo "========================================"
echo "📊 FINAL STATE"
echo "========================================"

echo -e "\n📋 Customers:"
curl -s "$API_URL/api/customers" | jq '.[] | {name, balance, status}'

echo -e "\n📋 Payments:"
curl -s "$API_URL/api/payments" | jq '.[] | {customerName, amount, type, newBalance}'

echo -e "\n📋 Bookings:"
curl -s "$API_URL/api/bookings" | jq '.[] | {customerName, service, date, time}'

echo ""
echo "========================================"
echo "✅ TEST SUITE COMPLETE"
echo "========================================"
