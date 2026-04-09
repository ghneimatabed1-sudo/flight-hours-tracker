# Flight Hours Tracker — 90-100 Day Comprehensive Simulation Test

## Objective
Test all features of the app under realistic conditions over a 90-100 day period, logging flights in various scenarios, testing currency tracking, export, and identifying any bugs or issues.

---

## PHASE 1: Setup (Day 0)
- **Flight Name**: CAPT. TEST PILOT
- **Initial Hours**:
  - Total: 500 hours
  - Day: 300 hours
  - Night: 120 hours
  - NVG: 80 hours
  - Captain: 400 hours
  - Instrument: 150 hours

- **Initial Currency Baselines**:
  - Last Day Flying: 30/12/2024 (90+ days ago from test start)
  - Last Night/NVG Flying: NVG on 25/12/2024

- **Settings**:
  - Day Currency Mode: `day_flight_only` (first 45 days)
  - Then switch to: `duration_half_hour` (next 45+ days)
  - All currency validity: 30 days
  - Reminder days: 3 days

---

## PHASE 2: Days 1-30 (No Flights Logged)
**Objective**: Test currency expiration detection with baseline dates

### Expected Behavior:
- Day Currency: VALID (last flight baseline: 30/12/2024 = 31+ days ago, but within 30-day window starting fresh)
- Night Currency: VALID (baseline: 25/12/2024)
- NVG Currency: VALID (baseline: 25/12/2024)
- Medical/IRT: EXPIRED (no baseline set)

### Test Actions:
1. Check home screen — verify currency status matches above
2. Check notifications — should schedule alerts if getting close to expiration

---

## PHASE 3: Days 31-45 (Log Day Flights - Mode: "day_flight_only")
**Scenario**: Regular training flights

### Flights to Log:
- Day 5: 1.5 hrs day, 1st PLT, Captain qualified (Day currency refresh)
- Day 10: 0.3 hrs day, 2nd PLT (should count in "day_flight_only" mode)
- Day 15: 2.0 hrs day, 1st PLT, NOT Captain (for position testing)
- Day 20: 0.8 hrs day, 1st PLT, Captain qualified
- Day 25: 1.2 hrs day with 0.5 hrs dual, 1st PLT
- Day 30: 0.2 hrs day, 2nd PLT (short flight)
- Day 35: 1.0 hrs day, 1st PLT, Captain
- Day 40: 0.5 hrs day, 1st PLT
- Day 45: 1.5 hrs day, 1st PLT, Captain

### For Each Flight, Log:
- Date
- Aircraft: UH-60M
- Crew: CAPT. TEST (yourself) + CPT. WINGMAN
- Mission: TRAINING
- Condition: DAY
- Position: 1st PLT or 2nd PLT (alternate)
- Flight Time: as specified
- Dual Hours: if specified
- Captain Qualification Flag: YES (for 1st PLT flights only)
- NVG: OFF
- Instrument Flight: NO

### Expected Results After Phase 3:
- Total flights: 9
- Day total: ~9.9 hours
- Day currency: VALID (most recent flight: Day 45)
- Totals screen: Show day hours increased
- Export: Excel should show all 9 flights with hours correctly categorized

---

## PHASE 4: Days 46-75 (Add Night + NVG Flights + Switch to "duration_half_hour" Mode)
**Scenario**: Mix of day/night/NVG training

### Switch Setting on Day 46:
- Day Currency Refresh Mode → `duration_half_hour`

### Flights to Log:
- Day 50: 0.3 hrs night, 1st PLT (should NOT refresh in "duration_half_hour" mode)
- Day 55: 1.5 hrs night, 2nd PLT (SHOULD refresh - exceeds 0.5 hrs)
- Day 60: 2.0 hrs NVG, 1st PLT, Captain (NVG currency refresh)
- Day 65: 0.4 hrs day, 1st PLT (should NOT refresh day currency)
- Day 70: 0.6 hrs day, 1st PLT (SHOULD refresh day currency)
- Day 75: 1.5 hrs night with 0.5 hrs dual, 1st PLT

### Expected Results After Phase 4:
- Total flights: 15
- Night currency: VALID (Day 55 flight)
- NVG currency: VALID (Day 60 flight)
- Day currency: VALID (Day 70 flight)
- Dual hours: Should show increased in totals
- Mode switch: Verify that 0.3 hr flight on Day 50 does NOT refresh day, but 0.6 hr on Day 70 DOES

---

## PHASE 5: Days 76-100 (Advanced Scenarios)
**Objective**: Test edge cases and instrument flights

### Flights to Log:
- Day 80: 1.5 hrs instrument (SIM: 0.5, ACT: 1.0), 2 ILS approaches, 1st PLT
- Day 85: 2.0 hrs NVG with 1.0 hrs dual, 1st PLT, Captain
- Day 90: 1.5 hrs day, 1st PLT, Captain
- Day 95: 0.1 hrs day, 2nd PLT (tiny flight - edge case)
- Day 100: 1.5 hrs night, 1st PLT

### IRT Flight (Test IRT Currency):
- Day 92: 1.5 hrs night with Instrument Flight enabled, mission: "IRT", 3 VOR approaches, 1st PLT

### Expected Results:
- IRT Currency: VALID (Day 92 mission)
- Total flights: 21
- Instrument hours: ~3.5 hrs
- Approach counts: 5 total (2 ILS + 3 VOR)
- Captain hours: Should be accurate including all dual hours

---

## PHASE 6: Testing & Validation

### Test 1: Export to Excel
**Action**: 
1. Go to Tracking screen
2. Select Month with most flights
3. Export to Excel

**Validation**:
- [ ] File downloads successfully
- [ ] All flight dates are correct
- [ ] All hours are correctly categorized
- [ ] Totals sheet shows accurate sums
- [ ] Currency status matches home screen
- [ ] Aircraft totals correct
- [ ] Month totals correct

### Test 2: Delete and Undo
**Action**:
1. Delete a flight from the middle (Day 50)
2. Check that currency updates correctly
3. Recreate the flight with same data

**Validation**:
- [ ] Flight is removed from list
- [ ] Totals decrease correctly
- [ ] Currency status updates if that was the "most recent" flight
- [ ] Recreated flight matches original data
- [ ] App doesn't crash

### Test 3: Edit Flight
**Action**:
1. Edit a flight: change hours, position, or condition
2. Check totals and currency

**Validation**:
- [ ] Changes save correctly
- [ ] Totals recalculate
- [ ] Currency status updates if affected

### Test 4: Currency Countdown
**Action**:
1. Find a flight that will expire in 3-7 days
2. Check home screen status
3. Wait/simulate advancing time (or manually check calculations)

**Validation**:
- [ ] Status shows "EXPIRING SOON" (yellow)
- [ ] Days remaining is accurate
- [ ] Notification should be scheduled

### Test 5: Data Integrity Check
**Action**:
1. Go to Data Integrity screen
2. Click "Check Integrity"
3. Review any warnings/errors

**Validation**:
- [ ] No unexpected errors
- [ ] Any warnings are for known reasons
- [ ] "Repair" button works if errors found

### Test 6: Theme Switch
**Action**:
1. Go to Settings
2. Switch to Dark theme
3. Check all screens

**Validation**:
- [ ] Background changes to dark
- [ ] Text is readable
- [ ] Colors are correct
- [ ] Switch back to Default works

---

## PHASE 7: Results & Report

### Metrics to Collect:
1. **Total Hours**: Should match sum of all flight time + initial hours
2. **Day/Night/NVG Hours**: Verify against logged flights
3. **Captain Hours**: Verify logic (position=1st PLT AND countsAsCaptain + all dual hours)
4. **Currency Status**: Day, Night, NVG, Medical, IRT
5. **Export Accuracy**: Compare Excel output to app totals

### Issues to Document:
- [ ] Any crashes or errors?
- [ ] Are calculations correct?
- [ ] Do currency updates work properly?
- [ ] Does theme switch work?
- [ ] Does export work?
- [ ] Are there UI glitches?
- [ ] Do date inputs work correctly?

---

## Example Expected Totals After 100 Days:

| Metric | Expected | Notes |
|--------|----------|-------|
| Total Flights Logged | 21 | Across days 1-100 |
| Total Hours | ~32 hours | Logged flights only |
| Day Hours | ~9.9 hours | From Phase 3 + Phase 4 + Phase 5 |
| Night Hours | ~5 hours | Phase 4 + Phase 5 |
| NVG Hours | ~3.5 hours | Phase 4 + Phase 5 |
| Instrument Hours | ~3.5 hours | Phase 5 IFR training |
| Captain Hours | ~24 hours | All flights where qualified + all dual |
| ILS Approaches | 2 | Day 80 |
| VOR Approaches | 3 | Day 92 |

---

## Success Criteria:
✅ App runs without crashing for 100 days of simulated use
✅ All currency statuses update correctly
✅ Hour calculations are accurate
✅ Export produces valid Excel file
✅ Date inputs work in DD/MM/YYYY format
✅ Theme switch works visually
✅ Day currency "duration_half_hour" mode filters flights correctly
✅ Initial hours baseline dates affect currency calculations

---

## Notes:
- This simulation tests realistic pilot use with daily/regular training flights
- It covers all currency types, hour categories, and major features
- It tests both happy paths and edge cases (0.1 hr flights, instrument flights, etc.)
- Results should identify any data integrity issues or calculation bugs
