import { DatePipe } from '@angular/common';
import { CalendarDateFormatter, DateFormatterParams } from 'angular-calendar';

export class DateFormatter extends CalendarDateFormatter {
    // you can override any of the methods defined in the parent class

    public dayViewHour({ date, locale }: DateFormatterParams): string {
        return new DatePipe(locale as string).transform(date, 'HH:mm', locale) as string;
    }

    public weekViewHour({ date, locale }: DateFormatterParams): string {
        return this.dayViewHour({ date, locale });
    }
}
