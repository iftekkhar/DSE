import { useState, useEffect } from 'react';

/**
 * Custom hook providing real-time Dhaka (UTC+6) time and market trading status.
 * DSE Regular Trading Session: Sunday - Thursday, 10:00 AM - 02:30 PM BST.
 */
export function useDhakaClock() {
  const [dhakaTime, setDhakaTime] = useState('');
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [dhakaDateStr, setDhakaDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeOptions = {
        timeZone: 'Asia/Dhaka',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      setDhakaTime(new Intl.DateTimeFormat('en-US', timeOptions).format(now));

      const dateOptions = {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      setDhakaDateStr(new Intl.DateTimeFormat('en-US', dateOptions).format(now));

      const dhakaDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
      const day = dhakaDate.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
      const hours = dhakaDate.getHours();
      const minutes = dhakaDate.getMinutes();
      const currentMinutes = hours * 60 + minutes;

      // DSE Trading Days: Sunday (0) to Thursday (4)
      const isTradingDay = day >= 0 && day <= 4;
      // Trading Hours: 10:00 AM (600 mins) to 2:30 PM (870 mins)
      const isTradingHours = currentMinutes >= 600 && currentMinutes <= 870;

      setIsMarketOpen(isTradingDay && isTradingHours);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return { dhakaTime, isMarketOpen, dhakaDateStr };
}
