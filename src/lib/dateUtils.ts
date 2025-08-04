export const parseDate = (dateStr: string | number): Date => {
  if (typeof dateStr === 'number') {
    return new Date(dateStr, 0, 1); // January 1st of the year
  }
  
  const str = dateStr.toString().trim();
  
  // Handle formats like "July 2005", "Jan 2009", "Sep 2017"
  const monthYearMatch = str.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i);
  if (monthYearMatch) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = monthNames.indexOf(monthYearMatch[1].toLowerCase());
    return new Date(parseInt(monthYearMatch[2]), monthIndex, 1);
  }
  
  // Handle full month names like "July 2005", "August 2007"
  const fullMonthMatch = str.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i);
  if (fullMonthMatch) {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = monthNames.indexOf(fullMonthMatch[1].toLowerCase());
    return new Date(parseInt(fullMonthMatch[2]), monthIndex, 1);
  }
  
  // Handle just year like "2013"
  const yearMatch = str.match(/^(\d{4})$/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1]), 0, 1);
  }
  
  // Fallback to Date constructor
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

export const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long' 
  });
};