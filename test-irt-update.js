const { calculateCurrencyStatus } = require('./lib/currency-calculator');

// Test IRT Currency with flight-based update
const irtCurrency = {
  type: 'irt',
  validityDays: 90,
  reminderDays: 30,
  status: 'current'
};

const irtFlight = {
  id: '1',
  date: '2026-01-20',
  aircraftType: 'IRT',
  aircraftNumber: '001',
  captainName: 'Test',
  coPilotName: 'Test',
  mission: 'Training',
  condition: 'day',
  nvg: false,
  position: '1st_plt',
  countsAsCaptain: true,
  flightTime: 2.0,
  dualHours: 0,
  type: 'act',
  instrumentFlight: true,
  actualHours: 2.0,
  simulationTime: 0,
  ilsCount: 2,
  vorCount: 1,
  createdAt: '2026-01-20T10:00:00Z',
  updatedAt: '2026-01-20T10:00:00Z'
};

console.log('Testing IRT Currency Update...\n');

// Test 1: No flights
console.log('Test 1: No flights');
const status1 = calculateCurrencyStatus(irtCurrency, []);
console.log('Status:', status1.status);
console.log('Days Remaining:', status1.daysRemaining);
console.log('Last Flight Date:', status1.lastFlightDate);
console.log('');

// Test 2: With IRT flight
console.log('Test 2: With IRT flight');
const status2 = calculateCurrencyStatus(irtCurrency, [irtFlight]);
console.log('Status:', status2.status);
console.log('Days Remaining:', status2.daysRemaining);
console.log('Last Flight Date:', status2.lastFlightDate);
console.log('');

// Test 3: With testDate (old behavior)
console.log('Test 3: With testDate (should be ignored now)');
const irtCurrencyWithTestDate = {
  ...irtCurrency,
  testDate: '2026-01-15'
};
const status3 = calculateCurrencyStatus(irtCurrencyWithTestDate, []);
console.log('Status:', status3.status);
console.log('Days Remaining:', status3.daysRemaining);
console.log('Test Date:', status3.testDate);
console.log('');
