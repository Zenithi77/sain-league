'use client';

import { useState, useRef, useEffect } from 'react';

interface DateSliderProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  gamesCountByDate: Record<string, number>;
}

function formatDateShort(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDayName(date: Date): string {
  const days = ['Ням', 'Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям'];
  return days[date.getDay()];
}

function formatDayNumber(date: Date): number {
  return date.getDate();
}

function formatMonthName(date: Date): string {
  const months = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', 
                  '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
  return months[date.getMonth()];
}

function isToday(date: Date): boolean {
  const today = new Date();
  return formatDateShort(date) === formatDateShort(today);
}

export default function DateSlider({ selectedDate, onDateSelect, gamesCountByDate }: DateSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [dates, setDates] = useState<Date[]>([]);
  
  useEffect(() => {
    // Generate dates: 7 days before and 7 days after today
    const today = new Date();
    const dateArray: Date[] = [];
    
    for (let i = -7; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dateArray.push(date);
    }
    
    setDates(dateArray);
  }, []);

  useEffect(() => {
    // Scroll to selected date
    if (sliderRef.current) {
      const selectedElement = sliderRef.current.querySelector('.date-item.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedDate]);

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

  return (
    <div className="date-slider-container">
      <button className="slider-arrow left" onClick={scrollLeft}>
        <i className="fas fa-chevron-left"></i>
      </button>
      
      <div className="date-slider" ref={sliderRef}>
        {dates.map((date) => {
          const dateStr = formatDateShort(date);
          const gamesCount = gamesCountByDate[dateStr] || 0;
          const isSelected = dateStr === selectedDate;
          const isTodayDate = isToday(date);
          
          return (
            <div
              key={dateStr}
              className={`date-item ${isSelected ? 'selected' : ''} ${isTodayDate ? 'today' : ''}`}
              onClick={() => onDateSelect(dateStr)}
            >
              <span className="date-day-name">{formatDayName(date)}</span>
              <span className="date-day-number">{formatDayNumber(date)}</span>
              <span className="date-month">{formatMonthName(date)}</span>
              {gamesCount > 0 && (
                <span className="games-count-badge">{gamesCount}</span>
              )}
            </div>
          );
        })}
      </div>
      
      <button className="slider-arrow right" onClick={scrollRight}>
        <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  );
}
