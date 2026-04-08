// Test script to verify new Dual hours logic
import { classifyFlight, createEmptyTotals } from './lib/calculations.ts';

console.log('=== Test 1: Captain Dual Day Flight ===');
const test1 = {
  id: '1',
  date: '2026-01-25',
  aircraftType: 'UH-60',
  position: '1st_plt',
  countsAsCaptain: true,
  condition: 'day',
  flightTime: 2.0,
  dualHours: 0.5,
  instrumentFlight: false,
  nvg: false,
};
const totals1 = classifyFlight(test1, createEmptyTotals());
console.log('Flight Time: 2.0, Dual: 0.5');
console.log('Captain Hours:', totals1.captainTotal, '(expected: 2.5)');
console.log('Dual Hours:', totals1.dualTotal, '(expected: 0.5)');
console.log('Day Hours:', totals1.dayTotal, '(expected: 2.5)');
console.log('✅ Test 1:', totals1.captainTotal === 2.5 ? 'PASS' : 'FAIL');
console.log('');

console.log('=== Test 2: Captain Dual IF Flight ===');
const test2 = {
  id: '2',
  date: '2026-01-25',
  aircraftType: 'UH-60',
  position: '1st_plt',
  countsAsCaptain: true,
  condition: 'day',
  flightTime: 1.5,
  dualHours: 0.3,
  instrumentFlight: true,
  nvg: false,
};
const totals2 = classifyFlight(test2, createEmptyTotals());
console.log('Flight Time: 1.5, Dual: 0.3, IF: Yes');
console.log('Captain Hours:', totals2.captainTotal, '(expected: 1.8)');
console.log('IF Hours:', totals2.instrumentFlightTotal, '(expected: 1.8)');
console.log('✅ Test 2:', totals2.captainTotal === 1.8 && totals2.instrumentFlightTotal === 1.8 ? 'PASS' : 'FAIL');
console.log('');

console.log('=== Test 3: Co-Pilot Dual Night Flight ===');
const test3 = {
  id: '3',
  date: '2026-01-25',
  aircraftType: 'UH-60',
  position: '2nd_plt',
  countsAsCaptain: false,
  condition: 'night',
  flightTime: 1.0,
  dualHours: 0.5,
  instrumentFlight: false,
  nvg: false,
};
const totals3 = classifyFlight(test3, createEmptyTotals());
console.log('Flight Time: 1.0, Dual: 0.5, Position: 2nd PLT');
console.log('Captain Hours:', totals3.captainTotal, '(expected: 0.5)');
console.log('2nd PLT Hours:', totals3.secondPilotTotal, '(expected: 1.0)');
console.log('✅ Test 3:', totals3.captainTotal === 0.5 ? 'PASS' : 'FAIL');
console.log('');

console.log('=== Test 4: Captain Dual NVG Flight ===');
const test4 = {
  id: '4',
  date: '2026-01-25',
  aircraftType: 'UH-60',
  position: '1st_plt',
  countsAsCaptain: true,
  condition: 'night',
  flightTime: 2.0,
  dualHours: 0.8,
  instrumentFlight: false,
  nvg: true,
};
const totals4 = classifyFlight(test4, createEmptyTotals());
console.log('Flight Time: 2.0, Dual: 0.8, NVG: Yes');
console.log('Captain Hours:', totals4.captainTotal, '(expected: 2.8)');
console.log('NVG Hours:', totals4.nvgTotal, '(expected: 2.8)');
console.log('✅ Test 4:', totals4.captainTotal === 2.8 && totals4.nvgTotal === 2.8 ? 'PASS' : 'FAIL');
