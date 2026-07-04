#!/usr/bin/env bash
# End-to-end smoke test of every /api/v1 endpoint.
# Requires the dev server on :4000 and the seed applied.

BASE="http://localhost:4000/api/v1"
PASS=0
FAIL=0
FAILURES=()
# Use a Windows-native temp path so bash (Git Bash) and node (Windows) agree.
WORKDIR="$(cygpath -m "$PWD" 2>/dev/null || echo "$PWD")"
RESP="$WORKDIR/.test-resp.json"
STATUS="$WORKDIR/.test-status"

blue()  { printf "\033[34m%s\033[0m" "$1"; }
green() { printf "\033[32m%s\033[0m" "$1"; }
red()   { printf "\033[31m%s\033[0m" "$1"; }
grey()  { printf "\033[90m%s\033[0m" "$1"; }

# do METHOD PATH [body-json]
# writes body to $RESP and status to $STATUS
do_req() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-s -X "$method" -o "$RESP" -w "%{http_code}"
              -H "Content-Type: application/json")
  [[ -n "${TOKEN:-}" ]] && args+=(-H "Authorization: Bearer $TOKEN")
  [[ -n "$body" ]] && args+=(-d "$body")
  curl "${args[@]}" "$BASE$path" > "$STATUS" 2>/dev/null
}

json_field() {
  node -e "try{const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));const v=d['$1'];process.stdout.write(v==null?'':String(v))}catch(e){}" "$RESP" 2>/dev/null
}

check() {
  local label="$1" method="$2" path="$3" expect="$4" body="${5:-}"
  do_req "$method" "$path" "$body"
  local got; got=$(cat "$STATUS")
  if [[ "$got" == "$expect" ]]; then
    printf "  %s %s\n" "$(green ✓)" "$label"
    PASS=$((PASS + 1))
  else
    printf "  %s %s $(grey "got %s expected %s")\n" "$(red ✗)" "$label" "$got" "$expect"
    printf "     %s\n" "$(head -c 200 "$RESP" 2>/dev/null)"
    FAIL=$((FAIL + 1))
    FAILURES+=("$label ($got, wanted $expect)")
  fi
}

section() { printf "\n%s\n" "$(blue "─── $1 ───────────────────────────────────")"; }

# ─── AUTH ───────────────────────────────────────────────────
section "Auth"

TOKEN=""
do_req POST /auth/login '{"email":"admin@audithub.local","password":"admin@1234"}'
if [[ "$(cat $STATUS)" == "200" ]]; then
  TOKEN=$(json_field accessToken)
  printf "  %s login (token %s…)\n" "$(green ✓)" "$(green "${TOKEN:0:20}")"
  PASS=$((PASS + 1))
else
  printf "  %s login failed (%s)\n" "$(red ✗)" "$(cat $STATUS)"
  FAIL=$((FAIL + 1))
  head -c 300 "$RESP"; echo
  exit 1
fi

check "login (bad password → 401)"      POST  "/auth/login"       401 '{"email":"admin@audithub.local","password":"wrong"}'
check "me"                              GET   "/auth/me"          200
check "list roles"                      GET   "/settings/roles"   200

# ─── DASHBOARD ──────────────────────────────────────────────
section "Dashboard"
check "GET /dashboard"                  GET   "/dashboard"        200

# ─── CLIENTS ─────────────────────────────────────────────────
section "Clients"
check "list clients"                    GET   "/clients"          200
do_req POST /clients '{"name":"Acme Traders Pvt Ltd","pan":"AACCA1234B","gstin":"22AACCA1234B1Z5","email":"finance@acme.local","mobile":"+91 90000 00000","status":"active"}'
if [[ "$(cat $STATUS)" == "201" ]]; then
  CLIENT_ID=$(json_field id)
  printf "  %s create client (id %s…)\n" "$(green ✓)" "$(green "${CLIENT_ID:0:8}")"
  PASS=$((PASS + 1))
else
  printf "  %s create client\n" "$(red ✗)"; head -c 300 "$RESP"; echo; FAIL=$((FAIL+1)); exit 1
fi

check "get client detail"               GET   "/clients/$CLIENT_ID"    200
check "patch client"                    PATCH "/clients/$CLIENT_ID"    200 '{"notes":"VIP client"}'
check "create validation error (400)"   POST  "/clients"               400 '{"email":"not-an-email"}'

# ─── COMPANIES ──────────────────────────────────────────────
section "Companies"
check "list companies"                  GET   "/clients/$CLIENT_ID/companies" 200
do_req POST "/clients/$CLIENT_ID/companies" '{"legalName":"Acme Holdings Ltd","businessType":"Pvt Ltd","regNo":"U74999MH2020PTC000001"}'
if [[ "$(cat $STATUS)" == "201" ]]; then
  COMPANY_ID=$(json_field id)
  printf "  %s create company\n" "$(green ✓)"; PASS=$((PASS+1))
else
  printf "  %s create company\n" "$(red ✗)"; head -c 300 "$RESP"; echo; FAIL=$((FAIL+1))
fi
check "patch company"                   PATCH "/companies/$COMPANY_ID" 200 '{"businessType":"LLP"}'

# ─── SERVICES ───────────────────────────────────────────────
section "Services"
check "list services"                   GET   "/services"         200
do_req POST /services '{"name":"Statutory Audit FY24-25","defaultFee":75000,"sacCode":"998221"}'
if [[ "$(cat $STATUS)" == "201" ]]; then
  SVC_ID=$(json_field id)
  printf "  %s create service\n" "$(green ✓)"; PASS=$((PASS+1))
else
  printf "  %s create service\n" "$(red ✗)"; head -c 300 "$RESP"; echo; FAIL=$((FAIL+1))
fi
check "patch service"                   PATCH "/services/$SVC_ID"     200 '{"defaultFee":80000}'

# ─── INVOICES ───────────────────────────────────────────────
section "Invoices"
check "list invoices"                   GET   "/invoices"         200
do_req POST /invoices "{\"clientId\":\"$CLIENT_ID\",\"number\":\"INV-2025-TEST-001\",\"kind\":\"invoice\",\"description\":\"Statutory audit FY 2024-25\",\"subtotal\":50000,\"cgst\":4500,\"sgst\":4500,\"tax\":9000,\"total\":59000,\"status\":\"pending\",\"issuedAt\":\"2025-04-01\",\"dueDate\":\"2025-04-30\"}"
if [[ "$(cat $STATUS)" == "201" ]]; then
  INV_ID=$(json_field id)
  printf "  %s create invoice\n" "$(green ✓)"; PASS=$((PASS+1))
else
  printf "  %s create invoice\n" "$(red ✗)"; head -c 400 "$RESP"; echo; FAIL=$((FAIL+1))
fi
check "get invoice detail"              GET   "/invoices/$INV_ID"        200
check "invoice PDF stream"              GET   "/invoices/$INV_ID/pdf"    200
check "email invoice"                   POST  "/invoices/$INV_ID/send"   200

# ─── PAYMENTS ───────────────────────────────────────────────
section "Payments"
check "list payments"                   GET   "/payments"         200
do_req POST /payments "{\"invoiceId\":\"$INV_ID\",\"amount\":30000,\"method\":\"bank\",\"status\":\"paid\",\"paidAt\":\"2025-04-15\",\"reference\":\"UPI-TEST-001\"}"
if [[ "$(cat $STATUS)" == "201" ]]; then
  PAY_ID=$(json_field id)
  printf "  %s create partial payment\n" "$(green ✓)"; PASS=$((PASS+1))
else
  printf "  %s create payment\n" "$(red ✗)"; head -c 300 "$RESP"; echo; FAIL=$((FAIL+1))
fi
do_req GET "/invoices/$INV_ID"
STATUS_AFTER=$(json_field status)
if [[ "$STATUS_AFTER" == "partial" ]]; then
  printf "  %s invoice auto-recomputed → partial\n" "$(green ✓)"; PASS=$((PASS+1))
else
  printf "  %s status recompute (got %s)\n" "$(red ✗)" "$STATUS_AFTER"; FAIL=$((FAIL+1))
fi

# ─── EXPENSES ───────────────────────────────────────────────
section "Expenses"
check "list expenses"                   GET   "/expenses"         200
do_req POST /expenses '{"category":"Office supplies","amount":1250,"date":"2025-04-05","notes":"Stationery"}'
if [[ "$(cat $STATUS)" == "201" ]]; then
  EXP_ID=$(json_field id)
  printf "  %s create expense\n" "$(green ✓)"; PASS=$((PASS+1))
else
  printf "  %s create expense\n" "$(red ✗)"; head -c 300 "$RESP"; echo; FAIL=$((FAIL+1))
fi
check "patch expense"                   PATCH "/expenses/$EXP_ID"     200 '{"amount":1500}'

# ─── TASKS ──────────────────────────────────────────────────
section "Tasks"
check "list tasks"                      GET   "/tasks"            200
do_req POST /tasks "{\"clientId\":\"$CLIENT_ID\",\"title\":\"File GSTR-3B for April\",\"priority\":\"high\",\"status\":\"todo\",\"dueDate\":\"2025-05-20\"}"
if [[ "$(cat $STATUS)" == "201" ]]; then
  TASK_ID=$(json_field id)
  printf "  %s create task\n" "$(green ✓)"; PASS=$((PASS+1))
else
  printf "  %s create task\n" "$(red ✗)"; head -c 300 "$RESP"; echo; FAIL=$((FAIL+1))
fi
check "patch task status"               PATCH "/tasks/$TASK_ID"      200 '{"status":"progress"}'

# ─── REMINDERS ──────────────────────────────────────────────
section "Reminders"
check "list reminders"                  GET   "/reminders"        200
do_req POST /reminders "{\"clientId\":\"$CLIENT_ID\",\"title\":\"GSTR-3B April 2025\",\"type\":\"GST\",\"dueDate\":\"2025-05-20\",\"offsets\":[30,15,7,3,1],\"channel\":\"email\"}"
if [[ "$(cat $STATUS)" == "201" ]]; then
  REM_ID=$(json_field id)
  printf "  %s create reminder\n" "$(green ✓)"; PASS=$((PASS+1))
else
  printf "  %s create reminder\n" "$(red ✗)"; head -c 300 "$RESP"; echo; FAIL=$((FAIL+1))
fi
check "send reminder now"               POST  "/reminders/$REM_ID/send-now" 200

# ─── REPORTS ────────────────────────────────────────────────
section "Reports"
check "revenue JSON"                    GET   "/reports/revenue"                    200
check "outstanding JSON"                GET   "/reports/outstanding"                200
check "gst JSON"                        GET   "/reports/gst"                        200
check "client-performance JSON"         GET   "/reports/client-performance"         200
check "revenue XLSX"                    GET   "/reports/revenue/export?format=xlsx" 200
check "revenue PDF"                     GET   "/reports/revenue/export?format=pdf"  200

# ─── NOTIFICATIONS ──────────────────────────────────────────
section "Notifications"
check "list"                            GET   "/notifications"              200
check "unread-count"                    GET   "/notifications/unread-count" 200
check "read-all"                        POST  "/notifications/read-all"     200

# ─── SETTINGS ───────────────────────────────────────────────
section "Settings"
check "get org"                         GET   "/settings"                200
check "patch org"                       PATCH "/settings"                200 '{"financialYear":"2025-26"}'
check "audit log"                       GET   "/settings/activity-logs"  200
check "send digest now"                 POST  "/settings/send-digest-now" 200

# ─── USERS ──────────────────────────────────────────────────
section "Users"
check "list users"                      GET   "/users"            200

# ─── CLEANUP ────────────────────────────────────────────────
section "Cleanup"
[[ -n "${PAY_ID:-}" ]]     && check "delete payment"  DELETE "/payments/$PAY_ID"       204
[[ -n "${INV_ID:-}" ]]     && check "delete invoice"  DELETE "/invoices/$INV_ID"       204
[[ -n "${EXP_ID:-}" ]]     && check "delete expense"  DELETE "/expenses/$EXP_ID"       204
[[ -n "${TASK_ID:-}" ]]    && check "delete task"     DELETE "/tasks/$TASK_ID"         204
[[ -n "${REM_ID:-}" ]]     && check "delete reminder" DELETE "/reminders/$REM_ID"      204
[[ -n "${COMPANY_ID:-}" ]] && check "delete company"  DELETE "/companies/$COMPANY_ID"  204
[[ -n "${SVC_ID:-}" ]]     && check "delete service"  DELETE "/services/$SVC_ID"       204
[[ -n "${CLIENT_ID:-}" ]]  && check "delete client"   DELETE "/clients/$CLIENT_ID"     204

# ─── SUMMARY ────────────────────────────────────────────────
echo
if [[ $FAIL -eq 0 ]]; then
  printf "%s %d/%d passed. All green.\n" "$(green ✔)" "$PASS" "$((PASS + FAIL))"
else
  printf "%s %d passed, %s %d failed\n" "$(green ✔)" "$PASS" "$(red ✗)" "$FAIL"
  printf "\nFailures:\n"
  for f in "${FAILURES[@]}"; do printf "  - %s\n" "$f"; done
  exit 1
fi
