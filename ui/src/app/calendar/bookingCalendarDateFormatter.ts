import { DatePipe } from '@angular/common';
import { CalendarDateFormatter } from 'angular-calendar';

import type { DateFormatterParams } from 'angular-calendar';

export class DateFormatter extends CalendarDateFormatter {
    // you can override any of the methods defined in the parent class

    public override dayViewHour({ date, locale }: DateFormatterParams): string {
        return new DatePipe(locale as string).transform(date, 'HH:mm', locale) as string;
    }

    public override weekViewHour({ date, locale }: DateFormatterParams): string {
        return this.dayViewHour({ date, locale });
    }
}
