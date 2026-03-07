import { toISODate } from '../utils/validation'

function shiftDate(days) {
  const value = new Date()
  value.setDate(value.getDate() + days)
  return toISODate(value)
}

export const seedFamilies = [
  {
    familyId: 'FAM-0001',
    headName: 'Amit Jain',
    gotra: 'Kashyap',
    whatsapp: '+919876543210',
    address: 'Bapu Nagar, Jaipur',
  },
  {
    familyId: 'FAM-0002',
    headName: 'Neha Shah',
    gotra: 'Vatsa',
    whatsapp: '+919899001122',
    address: 'Malviya Nagar, Jaipur',
  },
  {
    familyId: 'FAM-0003',
    headName: 'Pratik Doshi',
    gotra: 'Bharadwaj',
    whatsapp: '+919955443322',
    address: 'Shastri Nagar, Jaipur',
  },
]

export const seedTransactions = [
  {
    id: 'TRX-1001',
    familyId: 'FAM-0001',
    type: 'Bhent',
    fundCategory: 'Mandir Nirman',
    status: 'Paid',
    amount: 5100,
    createdAt: `${shiftDate(-2)}T09:15:00`,
    dueDate: '',
    receiptUrl: '',
    receiptFileName: '',
    cancelled: false,
  },
  {
    id: 'TRX-1002',
    familyId: 'FAM-0002',
    type: 'Boli',
    fundCategory: 'Shanti Dhara',
    status: 'Pledged',
    amount: 21000,
    createdAt: `${shiftDate(-3)}T13:25:00`,
    dueDate: shiftDate(-1),
    receiptUrl: '',
    receiptFileName: '',
    cancelled: false,
  },
  {
    id: 'TRX-1003',
    familyId: '',
    type: 'Gupt Daan',
    fundCategory: 'General Fund',
    status: 'Paid',
    amount: 1100,
    createdAt: `${shiftDate(-1)}T18:40:00`,
    dueDate: '',
    receiptUrl: '',
    receiptFileName: '',
    cancelled: false,
  },
  {
    id: 'TRX-1004',
    familyId: 'FAM-0003',
    type: 'Boli',
    fundCategory: 'Aahar Daan',
    status: 'Pledged',
    amount: 51000,
    createdAt: `${shiftDate(-1)}T11:10:00`,
    dueDate: shiftDate(3),
    receiptUrl: '',
    receiptFileName: '',
    cancelled: false,
  },
]

export const seedAssets = [
  { id: 'AST-101', name: 'Silver Chhatra', totalUnits: 2, availableUnits: 1 },
  { id: 'AST-102', name: 'Steel Thali', totalUnits: 50, availableUnits: 44 },
  { id: 'AST-103', name: 'PA Sound System', totalUnits: 1, availableUnits: 1 },
]

export const seedAssetCheckouts = [
  {
    id: 'CHK-501',
    assetId: 'AST-101',
    familyId: 'FAM-0001',
    quantity: 1,
    expectedReturnDate: shiftDate(-1),
    checkedOutAt: `${shiftDate(-5)}T10:00:00`,
    returnedAt: '',
    status: 'Checked Out',
  },
  {
    id: 'CHK-502',
    assetId: 'AST-102',
    familyId: 'FAM-0002',
    quantity: 6,
    expectedReturnDate: shiftDate(2),
    checkedOutAt: `${shiftDate(-1)}T12:45:00`,
    returnedAt: '',
    status: 'Checked Out',
  },
]

export const seedPoojaBookings = [
  {
    id: 'POO-9001',
    date: shiftDate(0),
    slot: 'Main Kalash',
    familyId: 'FAM-0001',
    notes: 'Paryushan special',
  },
]

