# Flight Hours Tracker - Mobile App Design

## Design Philosophy
This app follows **Apple Human Interface Guidelines (HIG)** and mainstream iOS mobile app design standards. The interface is optimized for **mobile portrait orientation (9:16)** and **one-handed usage**.

## Color Scheme
- **Primary**: Aviation blue (#0a7ea4) - represents sky and professionalism
- **Background**: Clean white (light) / Dark gray (dark mode)
- **Surface**: Light gray cards for data sections
- **Success**: Green for completed entries
- **Warning**: Amber for validation warnings
- **Error**: Red for invalid inputs

## Screen List

### 1. Home/Dashboard Screen
**Primary Content:**
- Quick stats card showing current month totals (Day/Night/NVG/Total hours)
- Recent flights list (last 5-7 entries with date, aircraft, and hours)
- Large "Add Flight" button (primary action)
- Month selector to view different periods

**Key Functionality:**
- Tap "Add Flight" → Navigate to Flight Entry screen
- Tap any recent flight → Navigate to Flight Detail/Edit screen
- Swipe left on flight entry → Delete option
- Month selector → Filter view by selected month

### 2. Add Flight Screen
**Primary Content:**
- Form with all input fields organized in logical sections:
  - **Flight Info Section**: Date picker, Aircraft Type dropdown, Aircraft Number input
  - **Crew Section**: Pilot Name, Captain Name, Co-Pilot Name inputs
  - **Flight Details Section**: Mission/Duty input, Flight Condition (Day/Night segmented control), NVG toggle, Flight Role picker
  - **Flight Time Section**: Large numeric input for hours (e.g., 1.5, 2.3)
  - **Type Section**: SIM vs ACT segmented control
- Save button (primary action at bottom)
- Cancel button (top-left)

**Key Functionality:**
- All inputs validated before save
- Automatic calculation happens on save (user never sees calculation)
- Success feedback → Return to Home with new entry visible

### 3. Monthly Report Screen
**Primary Content:**
- Excel-like table view showing all flights for selected month
- Columns: Date, Aircraft, Flight Time, Day/Night, Role, NVG, SIM/ACT
- Scrollable table with sticky header
- Totals section at bottom (read-only, system-generated):
  - Day Flying (1st/2nd/Dual)
  - Night Flying (1st/2nd/Dual)
  - NVG Total
  - CAP Total
  - SIM Total
  - ACT Total
  - Monthly Total
  - Grand Total (cumulative)
- Export button (share as PDF/CSV)

**Key Functionality:**
- Month/Year picker at top
- Tap any row → Navigate to Flight Detail screen
- Export button → Generate and share report
- All totals automatically calculated and displayed

### 4. Flight Detail/Edit Screen
**Primary Content:**
- Same form layout as Add Flight screen
- Pre-populated with existing flight data
- Delete button (destructive action)
- Save button to update

**Key Functionality:**
- Edit any field
- Save updates → Recalculate all totals automatically
- Delete → Confirmation alert → Remove entry and recalculate totals

### 5. Settings Screen (Optional)
**Primary Content:**
- Default aircraft type
- Pilot name presets
- Export preferences
- Dark mode toggle

## Key User Flows

### Flow 1: Add New Flight Entry
1. User opens app → Home screen
2. Tap "Add Flight" button
3. Fill in form fields (date, aircraft, crew, mission, condition, role, NVG, time, SIM/ACT)
4. Tap "Save"
5. App validates input
6. App automatically classifies hours and updates all totals
7. Return to Home screen with new entry visible and updated stats

### Flow 2: View Monthly Report
1. User taps "Reports" tab in bottom navigation
2. Monthly Report screen displays current month
3. User selects different month/year from picker
4. Table updates with flights for selected period
5. Scroll to see all entries and totals at bottom
6. Tap "Export" to share report

### Flow 3: Edit Existing Flight
1. User taps on flight entry from Home or Report screen
2. Flight Detail screen opens with pre-filled data
3. User edits any field (e.g., changes flight time from 1.5 to 2.0)
4. Tap "Save"
5. App recalculates all affected totals automatically
6. Return to previous screen with updated data

### Flow 4: Delete Flight Entry
1. User swipes left on flight entry OR taps flight and then "Delete" button
2. Confirmation alert appears
3. User confirms deletion
4. App removes entry and recalculates all totals
5. UI updates to reflect changes

## Bottom Tab Navigation
- **Home**: House icon - Dashboard with quick stats and recent flights
- **Add**: Plus icon - Quick access to add new flight
- **Reports**: Document icon - Monthly report view with totals
- **Settings**: Gear icon - App preferences (optional)

## Design Principles
- **No manual calculations**: All totals are system-generated and read-only
- **One-handed operation**: Primary actions within thumb reach
- **Clear visual hierarchy**: Most important info (flight time, totals) is prominent
- **Instant feedback**: Haptic feedback on button presses, visual confirmation on save
- **Error prevention**: Input validation before save, confirmation for destructive actions
- **Professional aesthetic**: Clean, organized, aviation-themed design

## Data Display Conventions
- Flight times displayed with one decimal place (e.g., 1.5, 2.3)
- Dates in short format (e.g., Jan 21, 2026)
- Totals sections clearly labeled and visually separated from input areas
- Read-only fields have subtle visual treatment (lighter background, no border)
