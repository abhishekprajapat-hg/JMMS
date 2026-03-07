function toISODate(date = new Date(), timeZone = 'Asia/Kolkata') {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return formatter.format(date)
}

function toIsoTimestamp(date = new Date()) {
  return date.toISOString()
}

function isPastOrToday(dateString, referenceDateString) {
  if (!dateString) return false
  return dateString <= referenceDateString
}

module.exports = {
  toISODate,
  toIsoTimestamp,
  isPastOrToday,
}

