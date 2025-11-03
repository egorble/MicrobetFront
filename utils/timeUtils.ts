/**
 * Утилітні функції для роботи з часом
 */

/**
 * Парсить timestamp з різних форматів (мікросекунди, мілісекунди, ISO string)
 * @param dateInput - Вхідні дані часу
 * @returns timestamp в мілісекундах
 */
export function parseTimestamp(dateInput: string | number | Date | null | undefined): number {
  if (!dateInput) return Date.now();
  
  if (dateInput instanceof Date) {
    return dateInput.getTime();
  }
  
  if (typeof dateInput === 'string') {
    const numericValue = parseFloat(dateInput);
    if (!isNaN(numericValue)) {
      // Перевіряємо чи це мікросекунди (дуже великі числа)
      if (numericValue > 1000000000000000) {
        return numericValue / 1000; // Конвертуємо мікросекунди в мілісекунди
      } else if (numericValue < 10000000000) {
        return numericValue * 1000; // Конвертуємо секунди в мілісекунди
      } else {
        return numericValue; // Вже в мілісекундах
      }
    } else {
      return new Date(dateInput).getTime();
    }
  }
  
  if (typeof dateInput === 'number') {
    // Якщо це число, перевіряємо формат
    if (dateInput > 1000000000000000) {
      return dateInput / 1000; // Мікросекунди в мілісекунди
    } else if (dateInput < 10000000000) {
      return dateInput * 1000; // Секунди в мілісекунди
    } else {
      return dateInput; // Вже в мілісекундах
    }
  }
  
  return Date.now();
}

/**
 * Форматує час з урахуванням локального часового поясу користувача
 * @param dateInput - Вхідні дані часу
 * @param options - Опції форматування (необов'язково)
 * @returns Відформатований час
 */
export function formatLocalTime(
  dateInput: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return 'N/A';
  
  const timestamp = parseTimestamp(dateInput);
  const date = new Date(timestamp);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  // Використовуємо локальні налаштування користувача (undefined означає автовизначення)
  return date.toLocaleTimeString(undefined, formatOptions);
}

/**
 * Форматує дату з урахуванням локального часового поясу користувача
 * @param dateInput - Вхідні дані часу
 * @param options - Опції форматування (необов'язково)
 * @returns Відформатована дата
 */
export function formatLocalDate(
  dateInput: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return 'N/A';
  
  const timestamp = parseTimestamp(dateInput);
  const date = new Date(timestamp);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  // Використовуємо локальні налаштування користувача
  return date.toLocaleDateString(undefined, formatOptions);
}

/**
 * Форматує дату та час разом з урахуванням локального часового поясу
 * @param dateInput - Вхідні дані часу
 * @param options - Опції форматування (необов'язково)
 * @returns Відформатовані дата та час
 */
export function formatLocalDateTime(
  dateInput: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return 'N/A';
  
  const timestamp = parseTimestamp(dateInput);
  const date = new Date(timestamp);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  // Використовуємо локальні налаштування користувача
  return date.toLocaleString(undefined, formatOptions);
}

/**
 * Отримує інформацію про часовий пояс користувача
 * @returns Об'єкт з інформацією про часовий пояс
 */
export function getUserTimezone() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = new Date().getTimezoneOffset();
  const offsetHours = Math.abs(offset) / 60;
  const offsetSign = offset <= 0 ? '+' : '-';
  
  return {
    timezone,
    offset,
    offsetString: `UTC${offsetSign}${offsetHours.toString().padStart(2, '0')}:${(Math.abs(offset) % 60).toString().padStart(2, '0')}`
  };
}