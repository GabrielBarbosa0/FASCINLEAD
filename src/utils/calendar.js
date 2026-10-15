const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function monthKeyFromDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function shiftMonth(monthKey, offset) {
  if (!MONTH_KEY_PATTERN.test(monthKey)) return monthKeyFromDate();
  const [year, month] = monthKey.split('-').map(Number);
  return monthKeyFromDate(new Date(year, month - 1 + offset, 1));
}

export function monthRange(monthKey) {
  const validMonth = MONTH_KEY_PATTERN.test(monthKey) ? monthKey : monthKeyFromDate();
  const [year, month] = validMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    startDate: `${validMonth}-01`,
    endDate: `${validMonth}-${String(lastDay).padStart(2, '0')}`
  };
}

export function calendarDays(monthKey, today = new Date()) {
  const { startDate } = monthRange(monthKey);
  const [year, month] = startDate.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const gridStart = new Date(year, month - 1, 1 - firstDay.getDay());
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      date: dateKey,
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === month - 1,
      isToday: dateKey === todayKey
    };
  });
}

export function appointmentsByDate(records) {
  return records.reduce((groups, record) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.appointmentDate || '')) return groups;
    if (!groups[record.appointmentDate]) groups[record.appointmentDate] = [];
    groups[record.appointmentDate].push(record);
    groups[record.appointmentDate].sort((a, b) => String(a.appointmentTime || '').localeCompare(String(b.appointmentTime || '')));
    return groups;
  }, {});
}

export function formatMonthLabel(monthKey) {
  const { startDate } = monthRange(monthKey);
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(`${startDate}T12:00:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
