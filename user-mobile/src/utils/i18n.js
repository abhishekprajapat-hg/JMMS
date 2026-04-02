import { safeFormatCurrency, safeFormatDate, safeFormatNumber } from './intlSafe'

const LOCALES = {
  en: 'en-IN',
  hi: 'hi-IN',
}

const VALUE_TRANSLATIONS = {
  hi: {
    All: 'सभी',
    Pravachan: 'प्रवचन',
    Bhajan: 'भजन',
    Aarti: 'आरती',
    'Jain History': 'जैन इतिहास',
    Scripture: 'शास्त्र',
    'General Fund': 'सामान्य निधि',
    'Mandir Nirman': 'मंदिर निर्माण',
    'Shanti Dhara': 'शांति धारा',
    'Jiv Daya': 'जीव दया',
    'Aahar Daan': 'आहार दान',
    'Jain Mandir Library': 'जैन मंदिर लाइब्रेरी',
    'Bank Transfer': 'बैंक ट्रांसफर',
    'Direct Bank Transfer (No Commission)': 'डायरेक्ट बैंक ट्रांसफर (बिना कमीशन)',
    'Direct UPI (No Commission)': 'डायरेक्ट यूपीआई (बिना कमीशन)',
    Pending: 'लंबित',
    Paid: 'भुगतान हुआ',
    'Proof Submitted': 'प्रमाण जमा',
    'Any UPI App': 'कोई भी यूपीआई ऐप',
    'Google Pay': 'गूगल पे',
    'PhonePe': 'फोनपे',
    Paytm: 'पेटीएम',
    BHIM: 'भीम',
    Bhent: 'भेंट',
  },
}

function parseDateValue(value) {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yearText, monthText, dayText] = value.split('-')
    const parsed = new Date(Number(yearText), Number(monthText) - 1, Number(dayText))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getLocale(language = 'en') {
  return LOCALES[language] || LOCALES.en
}

export function pickByLanguage(language, values) {
  return language === 'hi' ? values.hi : values.en
}

export function translateValue(language, value) {
  if (value === null || value === undefined || value === '') return value || ''
  return VALUE_TRANSLATIONS[language]?.[value] || value
}

export function formatLocalizedDate(value, language = 'en', options = {}) {
  if (!value) return '-'
  const parsed = parseDateValue(value)
  if (!parsed) return '-'
  return safeFormatDate(parsed, getLocale(language), options)
}

export function formatLocalizedCurrency(amount, language = 'en', options = {}) {
  return safeFormatCurrency(amount, getLocale(language), options)
}

export function formatLocalizedNumber(value, language = 'en', options = {}) {
  return safeFormatNumber(value, getLocale(language), options)
}
