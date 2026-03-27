#!/bin/bash
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

# Run e2e tests for all sign-up modes and present a summary table

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Sign-up modes to test
MODES=("open-sign-up" "no-sign-up" "gated-sign-up" "interest-sign-up" "both-sign-up")
MODE_NAMES=("OPEN_SIGN_UP" "NO_SIGN_UP" "GATED_SIGN_UP" "INTEREST_SIGN_UP" "BOTH_SIGN_UP")

# Arrays to store results
declare -a PASSED_COUNTS
declare -a FAILED_COUNTS
declare -a SKIPPED_COUNTS
declare -a FAILURES_OUTPUT

# Report flag
REPORT_FAILURES=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

cleanup() {
  echo -e "${BLUE}Stopping any running servers...${NC}"
  pkill -f "wrangler dev" 2>/dev/null || true
  pkill -f "mailpit" 2>/dev/null || true
  sleep 1
}

start_server() {
  local mode=$1
  echo -e "${BLUE}Starting server in ${mode} mode...${NC}"
  
  # Start the server in background
  npm run "dev-${mode}" > /dev/null 2>&1 &
  SERVER_PID=$!
  
  # Wait for server to be ready
  local max_attempts=30
  local attempt=0
  while ! curl -s http://localhost:3000/test/sign-up-mode > /dev/null 2>&1; do
    sleep 1
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
      echo -e "${RED}Server failed to start after ${max_attempts} seconds${NC}"
      return 1
    fi
  done
  
  echo -e "${GREEN}Server ready${NC}"
  return 0
}

run_tests() {
  local mode_name=$1
  echo -e "${BLUE}Running tests for ${mode_name}...${NC}"
  
  # Run tests and capture output
  local output
  local test_exit_code
  if [ "$REPORT_FAILURES" = true ]; then
    # Capture full output including failures
    output=$(npx playwright test --reporter=line e2e-tests 2>&1)
    test_exit_code=$?
  else
    # Just capture summary for normal operation
    output=$(npx playwright test --reporter=line e2e-tests 2>&1)
    test_exit_code=$?
  fi
  
  # Parse results - look for the summary line like "X passed (time)" or "X failed"
  local passed=0
  local failed=0
  local skipped=0
  
  # Extract counts from the summary line
  if echo "$output" | grep -q "passed"; then
    passed=$(echo "$output" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  fi
  
  if echo "$output" | grep -q "failed"; then
    failed=$(echo "$output" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' | tail -1)
  fi
  
  if echo "$output" | grep -q "skipped"; then
    skipped=$(echo "$output" | grep -oE '[0-9]+ skipped' | grep -oE '[0-9]+' | tail -1)
  fi
  
  # Default to 0 if not found
  passed=${passed:-0}
  failed=${failed:-0}
  skipped=${skipped:-0}
  
  echo -e "  Passed: ${GREEN}${passed}${NC}, Failed: ${RED}${failed}${NC}, Skipped: ${YELLOW}${skipped}${NC}"
  
  # Store results
  PASSED_COUNTS+=("$passed")
  FAILED_COUNTS+=("$failed")
  SKIPPED_COUNTS+=("$skipped")
  
  # Store full output for reporting if there are failures and reporting is enabled
  if [ "$REPORT_FAILURES" = true ] && [ "$failed" -gt 0 ]; then
    FAILURES_OUTPUT+=("${mode_name}")
    FAILURES_OUTPUT+=("$output")
    FAILURES_OUTPUT+=("---")
  fi
}

print_failures() {
  if [ "$REPORT_FAILURES" = true ] && [ ${#FAILURES_OUTPUT[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}                        FAILURE REPORT                        ${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    local current_mode=""
    local printing_output=false
    
    for line in "${FAILURES_OUTPUT[@]}"; do
      if [ "$line" = "---" ]; then
        printing_output=false
        echo ""
        continue
      fi
      
      # Check if this line is a mode name (all caps with underscores)
      if [[ "$line" =~ ^[A-Z_]+$ ]]; then
        current_mode="$line"
        echo -e "${RED}Failures in ${current_mode}:${NC}"
        echo ""
        printing_output=true
        continue
      fi
      
      # Print the output if we're in output mode
      if [ "$printing_output" = true ]; then
        echo "$line"
      fi
    done
  fi
}

print_summary() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}                      TEST RESULTS SUMMARY                      ${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  
  # Print header
  printf "%-20s %10s %10s %10s\n" "Mode" "Passed" "Failed" "Skipped"
  printf "%-20s %10s %10s %10s\n" "--------------------" "----------" "----------" "----------"
  
  # Print results for each mode
  local total_passed=0
  local total_failed=0
  local total_skipped=0
  
  for i in "${!MODE_NAMES[@]}"; do
    local mode_name="${MODE_NAMES[$i]}"
    local passed="${PASSED_COUNTS[$i]}"
    local failed="${FAILED_COUNTS[$i]}"
    local skipped="${SKIPPED_COUNTS[$i]}"
    
    # Color the failed count red if > 0
    if [ "$failed" -gt 0 ]; then
      printf "%-20s ${GREEN}%10s${NC} ${RED}%10s${NC} ${YELLOW}%10s${NC}\n" "$mode_name" "$passed" "$failed" "$skipped"
    else
      printf "%-20s ${GREEN}%10s${NC} %10s ${YELLOW}%10s${NC}\n" "$mode_name" "$passed" "$failed" "$skipped"
    fi
    
    total_passed=$((total_passed + passed))
    total_failed=$((total_failed + failed))
    total_skipped=$((total_skipped + skipped))
  done
  
  printf "%-20s %10s %10s %10s\n" "--------------------" "----------" "----------" "----------"
  
  # Print totals
  if [ "$total_failed" -gt 0 ]; then
    printf "%-20s ${GREEN}%10s${NC} ${RED}%10s${NC} ${YELLOW}%10s${NC}\n" "TOTAL" "$total_passed" "$total_failed" "$total_skipped"
  else
    printf "%-20s ${GREEN}%10s${NC} %10s ${YELLOW}%10s${NC}\n" "TOTAL" "$total_passed" "$total_failed" "$total_skipped"
  fi
  
  echo ""
  
  # Final status
  if [ "$total_failed" -gt 0 ]; then
    echo -e "${RED}✗ Some tests failed${NC}"
    return 1
  else
    echo -e "${GREEN}✓ All tests passed${NC}"
    return 0
  fi
}

main() {
  echo -e "${BLUE}Running e2e tests for all sign-up modes${NC}"
  if [ "$REPORT_FAILURES" = true ]; then
    echo -e "${YELLOW}Failure reporting enabled${NC}"
  fi
  echo ""
  
  # Clean up any existing servers
  cleanup
  
  # Run tests for each mode
  for i in "${!MODES[@]}"; do
    local mode="${MODES[$i]}"
    local mode_name="${MODE_NAMES[$i]}"
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Testing: ${mode_name}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if start_server "$mode"; then
      run_tests "$mode_name"
    else
      echo -e "${RED}Skipping tests for ${mode_name} - server failed to start${NC}"
      PASSED_COUNTS+=("0")
      FAILED_COUNTS+=("0")
      SKIPPED_COUNTS+=("0")
    fi
    
    cleanup
  done
  
  # Print summary
  print_summary
  
  # Print detailed failure report if requested
  print_failures
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Parse arguments
echo "Processing arguments: $@"
for arg in "$@"; do
  echo "Processing argument: $arg"
  case $arg in
    --report)
      REPORT_FAILURES=true
      shift
      ;;
    *)
      echo "Unknown argument: $arg"
      echo "Usage: $0 [--report]"
      exit 1
      ;;
  esac
done

main
