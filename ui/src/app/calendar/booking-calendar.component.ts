// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    OnInit,
    ViewChild,
    input,
    output,
    signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventApi, EventClickArg, EventInput } from '@fullcalendar/core';
import enLocale from '@fullcalendar/core/locales/en-gb';
import fiLocale from '@fullcalendar/core/locales/fi';
import svLocale from '@fullcalendar/core/locales/sv';
import luxon2Plugin from '@fullcalendar/luxon2';
import timeGridPlugin from '@fullcalendar/timegrid';
import { TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { Accessibility, ExamRoom } from 'src/app/reservation/reservation.model';
import { CalendarService } from './calendar.service';

@Component({
    selector: 'xm-booking-calendar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (visible()) {
            <div class="row my-2">
                @if (visible()) {
                    <div class="col-md-12">
                        <full-calendar #fc [options]="calendarOptions()"></full-calendar>
                    </div>
                }
            </div>
        }
    `,
    imports: [FullCalendarModule],
})
export class BookingCalendarComponent implements OnInit, AfterViewInit {
    @ViewChild('fc') calendar!: FullCalendarComponent;

    eventSelected = output<EventApi>();
    moreEventsNeeded = output<{
        date: string;
        timeZone: string;
        success: (events: EventInput[]) => void;
    }>();

    room = input.required<ExamRoom>();
    visible = input(false);
    minDate = input<Date>();
    maxDate = input<Date>();
    accessibilities = input<Accessibility[]>([]);

    calendarOptions = signal<CalendarOptions>({});
    searchStart = DateTime.now().startOf('week').toISO();
    searchEnd = DateTime.now().endOf('week').toISO();

    constructor(
        private translate: TranslateService,
        private Calendar: CalendarService,
    ) {
        this.calendarOptions.set({
            plugins: [luxon2Plugin, timeGridPlugin],
            initialView: 'timeGridWeek',
            firstDay: 1,
            locale: this.translate.currentLang,
            locales: [fiLocale, svLocale, enLocale],
            ...this.getFormatOverrides(this.translate.currentLang),
            allDaySlot: false,
            height: 'auto',
            nowIndicator: true,
            slotLabelFormat: { hour: 'numeric', minute: '2-digit', hour12: false },
            eventMinHeight: 45,
            events: this.refetch,
            eventClick: this.eventClicked.bind(this),
        });
        this.translate.onLangChange.subscribe((event) => {
            this.calendarOptions.set({
                ...this.calendarOptions(),
                locale: event.lang,
                ...this.getFormatOverrides(event.lang),
            });
        });
        // Change detection ->
        toObservable(this.room).subscribe((room) => {
            const earliestOpening = this.Calendar.getEarliestOpening(room, this.searchStart, this.searchEnd);
            const minTime =
                earliestOpening.getHours() > 1
                    ? DateTime.fromJSDate(earliestOpening).minus({ hour: 1 }).toJSDate()
                    : earliestOpening;
            const latestClosing = this.Calendar.getLatestClosing(room, this.searchStart, this.searchEnd);
            const maxTime =
                latestClosing.getHours() < 23
                    ? DateTime.fromJSDate(latestClosing).plus({ hour: 1 }).toJSDate()
                    : latestClosing;
            this.calendarOptions.update((cos) => ({
                ...cos,
                hiddenDays: this.Calendar.getClosedWeekdays(room, this.searchStart, this.searchEnd),
                slotMinTime: DateTime.fromJSDate(minTime).toFormat('HH:mm:ss'),
                slotMaxTime: DateTime.fromJSDate(maxTime).toFormat('HH:mm:ss'),
                timeZone: room.localTimezone,
            }));
            this.calendar.getApi().refetchEvents();
        });
        toObservable(this.accessibilities).subscribe(() => this.calendar.getApi().refetchEvents());
    }

    ngOnInit() {
        if (this.minDate() && this.maxDate()) {
            this.calendarOptions.update((options) => ({
                ...options,
                validRange: {
                    end: DateTime.fromJSDate(this.maxDate() as Date)
                        .endOf('week')
                        .plus({ hours: 1 })
                        .toFormat('yyyy-MM-dd'),
                    start: DateTime.fromJSDate(this.minDate() as Date)
                        .startOf('week')
                        .toFormat('yyyy-MM-dd'),
                },
            }));
        }
    }

    ngAfterViewInit() {
        if (!this.minDate()) {
            this.calendar.getApi().render(); // TODO: see if needed
        }
    }

    refetch = (input: { startStr: string; timeZone: string }, success: (events: EventInput[]) => void) => {
        this.searchStart = input.startStr;
        this.searchEnd = DateTime.fromISO(input.startStr).endOf('week').toISO() as string;
        const hidden = this.Calendar.getClosedWeekdays(this.room(), this.searchStart, this.searchEnd);
        const earliestOpening = this.Calendar.getEarliestOpening(this.room(), this.searchStart, this.searchEnd);
        const latestClosing = this.Calendar.getLatestClosing(this.room(), this.searchStart, this.searchEnd);
        this.calendarOptions.update((cos) => ({
            ...cos,
            hiddenDays: hidden,
            slotMinTime: DateTime.fromJSDate(earliestOpening).toFormat('HH:mm:ss'),
            slotMaxTime: DateTime.fromJSDate(latestClosing).toFormat('HH:mm:ss'),
        }));

        this.moreEventsNeeded.emit({ date: input.startStr, timeZone: input.timeZone, success: success });
    };

    eventClicked(arg: EventClickArg): void {
        if (arg.event.extendedProps?.availableMachines > 0) {
            this.eventSelected.emit(arg.event);
        }
    }

    private getFormatOverrides(lang: string) {
        return {
            dayHeaderFormat:
                lang === 'fi'
                    ? 'cccc d.L.'
                    : {
                          weekday: 'short' as const,
                          month: 'numeric' as const,
                          day: 'numeric' as const,
                          omitCommas: true,
                      },
            titleFormat:
                lang === 'fi'
                    ? (info: { start: { marker: Date }; end?: { marker: Date } }) => {
                          const start = new Date(info.start.marker);
                          if (!info.end) return start.toLocaleDateString('fi');
                          const end = new Date(info.end.marker);
                          end.setDate(end.getDate() - 1);

                          if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
                              return `${start.getDate()}. – ${end.getDate()}.${start.getMonth() + 1}.${start.getFullYear()}`;
                          } else {
                              return `${start.getDate()}.${start.getMonth() + 1}. – ${end.getDate()}.${end.getMonth() + 1}.${end.getFullYear()}`;
                          }
                      }
                    : { year: 'numeric' as const, month: 'short' as const, day: 'numeric' as const },
        };
    }
}
