'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface DateSliderProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  gamesCountByDate: Record<string, number>;
}

function formatDateShort(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayName(date: Date): string {
  const days = ['Ням', 'Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям'];
  return days[date.getDay()];
}

function formatDayNumber(date: Date): number {
  return date.getDate();
}

function formatMonthShort(date: Date): string {
  const months = ['1 сар', '2 сар', '3 сар', '4 сар', '5 сар', '6 сар', 
                  '7 сар', '8 сар', '9 сар', '10 сар', '11 сар', '12 сар'];
  return months[date.getMonth()];
}

// Generate dates array - this runs only on client
function generateDates(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateArray: Date[] = [];
  
  // 7 days before and 7 days after today = 15 days total
  for (let i = -7; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dateArray.push(date);
  }
  
  return dateArray;
}

function getTodayString(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return formatDateShort(today);
}

export default function DateSlider({ selectedDate, onDateSelect, gamesCountByDate }: DateSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [dates, setDates] = useState<Date[]>([]);
  const [todayStr, setTodayStr] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  
  // Initialize on client only to avoid hydration mismatch
  useEffect(() => {
    setDates(generateDates());
    setTodayStr(getTodayString());
    setMounted(true);
  }, []);

  // Scroll to center the selected date
  const scrollToDate = useCallback((dateStr: string, smooth: boolean = true) => {
    if (!sliderRef.current) return;
    
    const selectedElement = sliderRef.current.querySelector(`[data-date="${dateStr}"]`) as HTMLElement;
    if (selectedElement) {
      const container = sliderRef.current;
      const containerWidth = container.offsetWidth;
      const elementLeft = selectedElement.offsetLeft;
      const elementWidth = selectedElement.offsetWidth;
      
      // Calculate scroll position to center the element
      const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);
      
      container.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  // Initial scroll to today (center it) - only after mounted
  useEffect(() => {
    if (mounted && dates.length > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        scrollToDate(selectedDate, false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [mounted, dates.length, selectedDate, scrollToDate]);

  // Scroll when date changes
  useEffect(() => {
    if (mounted && dates.length > 0) {
      scrollToDate(selectedDate, true);
    }
  }, [selectedDate, mounted, dates.length, scrollToDate]);

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const handleDateClick = (dateStr: string) => {
    onDateSelect(dateStr);
  };

  const handleTodayClick = () => {
    if (todayStr) {
      onDateSelect(todayStr);
    }
  };

  // Show loading state during SSR/initial render
  if (!mounted) {
    return (
      <div className="date-slider-wrapper">
        <div className="date-slider-container">
          <div className="date-slider-loading">
            <span>Ачаалж байна...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="date-slider-wrapper">
      <div className="date-slider-container">
        <button className="slider-arrow left" onClick={scrollLeft} aria-label="Өмнөх">
          <i className="fas fa-chevron-left"></i>
        </button>
        
        <div className="date-slider" ref={sliderRef}>
          {dates.map((date, index) => {
            const dateStr = formatDateShort(date);
            const gamesCount = gamesCountByDate[dateStr] || 0;
            const isSelected = dateStr === selectedDate;
            const isTodayDate = dateStr === todayStr;
            const isPastDate = dateStr < todayStr;
            
            // Check if month changed from previous date
            const prevDate = dates[index - 1];
            const showMonthSeparator = index > 0 && prevDate && 
              prevDate.getMonth() !== date.getMonth();
            
            return (
              <div key={dateStr} className="date-item-wrapper">
                {showMonthSeparator && (
                  <div className="month-separator">
                    <span>{formatMonthShort(date)}</span>
                  </div>
                )}
                <div
                  data-date={dateStr}
                  className={`date-item ${isSelected ? 'selected' : ''} ${isTodayDate ? 'today' : ''} ${isPastDate && !isTodayDate ? 'past' : ''} ${gamesCount > 0 ? 'has-games' : ''}`}
                  onClick={() => handleDateClick(dateStr)}
                >
                  {isTodayDate && (
                    <span className="today-indicator">Өнөөдөр</span>
                  )}
                  <span className="date-day-name">{formatDayName(date)}</span>
                  <span className="date-day-number">{formatDayNumber(date)}</span>
                  {gamesCount > 0 && (
                    <div className="games-indicator">
                      <span className="games-dot"></span>
                      <span className="games-count">{gamesCount}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <button className="slider-arrow right" onClick={scrollRight} aria-label="Дараах">
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
      
      {/* Quick navigation */}
      <div className="date-quick-nav">
        <button 
          className={`quick-nav-btn ${selectedDate === todayStr ? 'active' : ''}`}
          onClick={handleTodayClick}
        >
          <i className="fas fa-calendar-day"></i>
          Өнөөдөр
        </button>
      </div>
    </div>
  );
}
