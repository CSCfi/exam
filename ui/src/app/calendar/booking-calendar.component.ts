// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    Injector,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventApi, EventClickArg, EventInput } from '@fullcalendar/core';
import enLocale from '@fullcalendar/core/locales/en-gb';
import fiLocale from '@fullcalendar/core/locales/fi';
import svLocale from '@fullcalendar/core/locales/sv';
import luxon2Plugin from '@fullcalendar/luxon3';
import timeGridPlugin from '@fullcalendar/timegrid';
import { TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { combineLatest, skip } from 'rxjs';
import type { Accessibility, ExamRoom } from 'src/app/reservation/reservation.model';
import { SessionService } from 'src/app/session/session.service';
import { CalendarService } from './calendar.service';

/** Align with `definitions.scss` `$mobile-width` — below this, use day grid instead of week. */
const CALENDAR_MOBILE_MAX_WIDTH_PX = 920;

@Component({
    selector: 'xm-booking-calendar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (visible()) {
            <div class="row my-2">
                @if (visible() && (passwordVerified() || isAdmin())) {
                    <div class="col-md-12">
                        <full-calendar #fc [options]="calendarOptions()"></full-calendar>
                    </div>
                }
            </div>
        }
    `,
    imports: [FullCalendarModule],
})
export class BookingCalendarComponent {
    readonly calendar = viewChild<FullCalendarComponent>('fc');

    readonly eventSelected = output<EventApi>();
    readonly moreEventsNeeded = output<{
        date: string;
        timeZone: string;
        success: (events: EventInput[]) => void;
    }>();

    readonly room = input.required<ExamRoom>();
    readonly visible = input(false);
    readonly passwordVerified = input(false);
    readonly minDate = input<Date>();
    readonly maxDate = input<Date>();
    readonly accessibilities = input<Accessibility[]>([]);

    readonly calendarOptions = signal<CalendarOptions>({});
    readonly searchStart = signal(DateTime.now().startOf('week').toISO());
    readonly searchEnd = signal(DateTime.now().endOf('week').toISO());
    readonly isAdmin = signal(false);

    private readonly translate = inject(TranslateService);
    private readonly Calendar = inject(CalendarService);
    private readonly Session = inject(SessionService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly injector = inject(Injector);

    constructor() {
        this.isAdmin.set(this.Session.getUser().isAdmin);

        const narrowQuery =
            typeof globalThis.matchMedia === 'function'
                ? globalThis.matchMedia(`(max-width: ${CALENDAR_MOBILE_MAX_WIDTH_PX}px)`)
                : null;
        const initialNarrow = narrowQuery?.matches === true;

        this.calendarOptions.set({
            plugins: [luxon2Plugin, timeGridPlugin],
            initialView: initialNarrow ? 'timeGridDay' : 'timeGridWeek',
            firstDay: 1,
            locale: this.resolveCalendarLocale(this.translate.getCurrentLang() ?? 'en'),
            locales: [fiLocale, svLocale, enLocale],
            ...this.getFormatOverrides(this.translate.getCurrentLang() ?? 'en'),
            /** Day view: column header already shows the date; hide toolbar title (FC may put it in left chunk if center is empty). */
            views: {
                timeGridDay: {
                    headerToolbar: {
                        left: 'prev,next',
                        center: '',
                        right: 'today',
                    },
                    titleFormat: () => '',
                },
            },
            allDaySlot: false,
            height: 'auto',
            nowIndicator: true,
            slotLabelFormat: { hour: 'numeric', minute: '2-digit', hour12: false },
            eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
            // note: do not set eventMinHeight here, it will cause a mess in calendar grid
            events: this.refetch.bind(this),
            eventClick: this.eventClicked.bind(this),
        });

        if (narrowQuery) {
            const onViewportChange = () => this.applyResponsiveCalendarView(narrowQuery.matches);
            narrowQuery.addEventListener('change', onViewportChange);
            this.destroyRef.onDestroy(() => narrowQuery.removeEventListener('change', onViewportChange));
        }

        this.translate.onLangChange.subscribe((event) => {
            this.calendarOptions.set({
                ...this.calendarOptions(),
                locale: this.resolveCalendarLocale(event.lang),
                ...this.getFormatOverrides(event.lang),
            });
        });

        toObservable(this.room)
            .pipe(takeUntilDestroyed())
            .subscribe((roomVal) => {
                const searchStart = this.searchStart();
                const searchEnd = this.searchEnd();
                const earliestOpening = this.Calendar.getEarliestOpening(roomVal, searchStart, searchEnd);
                const latestClosing = this.Calendar.getLatestClosing(roomVal, searchStart, searchEnd);
                const minTime =
                    earliestOpening.getHours() > 1
                        ? DateTime.fromJSDate(earliestOpening).minus({ hour: 1 }).toJSDate()
                        : earliestOpening;
                const maxTime =
                    latestClosing.getHours() < 23
                        ? DateTime.fromJSDate(latestClosing).plus({ hour: 1 }).toJSDate()
                        : latestClosing;
                this.calendarOptions.update((cos) => ({
                    ...cos,
                    hiddenDays: this.Calendar.getClosedWeekdays(roomVal, searchStart, searchEnd),
                    slotMinTime: DateTime.fromJSDate(minTime).toFormat('HH:mm:ss'),
                    slotMaxTime: DateTime.fromJSDate(maxTime).toFormat('HH:mm:ss'),
                    timeZone: roomVal.localTimezone,
                }));
                this.calendar()?.getApi().refetchEvents();
                this.applyResponsiveCalendarView(narrowQuery?.matches === true);
            });

        toObservable(this.visible)
            .pipe(takeUntilDestroyed())
            .subscribe((isVisible) => {
                if (isVisible) {
                    afterNextRender(() => this.applyResponsiveCalendarView(narrowQuery?.matches === true), {
                        injector: this.injector,
                    });
                }
            });

        toObservable(this.accessibilities)
            .pipe(skip(1), takeUntilDestroyed())
            .subscribe(() => this.calendar()?.getApi().refetchEvents());

        combineLatest([toObservable(this.minDate), toObservable(this.maxDate)])
            .pipe(takeUntilDestroyed())
            .subscribe(([min, max]) => {
                if (min && max) {
                    this.calendarOptions.update((options) => ({
                        ...options,
                        validRange: {
                            start: DateTime.fromJSDate(min).startOf('week').toFormat('yyyy-MM-dd'),
                            end: DateTime.fromJSDate(max).endOf('week').plus({ hours: 1 }).toFormat('yyyy-MM-dd'),
                        },
                    }));
                }
            });
    }

    refetch(input: { startStr: string; timeZone: string }, success: (events: EventInput[]) => void) {
        this.searchStart.set(input.startStr);
        this.searchEnd.set(DateTime.fromISO(input.startStr).endOf('week').toISO() as string);
        const hidden = this.Calendar.getClosedWeekdays(this.room(), this.searchStart(), this.searchEnd());
        const earliestOpening = this.Calendar.getEarliestOpening(this.room(), this.searchStart(), this.searchEnd());
        const latestClosing = this.Calendar.getLatestClosing(this.room(), this.searchStart(), this.searchEnd());
        this.calendarOptions.update((cos) => ({
            ...cos,
            hiddenDays: hidden,
            slotMinTime: DateTime.fromJSDate(earliestOpening).toFormat('HH:mm:ss'),
            slotMaxTime: DateTime.fromJSDate(latestClosing).toFormat('HH:mm:ss'),
        }));

        this.moreEventsNeeded.emit({ date: input.startStr, timeZone: input.timeZone, success: success });
    }

    eventClicked(arg: EventClickArg): void {
        if (arg.event.extendedProps?.availableMachines > 0) {
            this.eventSelected.emit(arg.event);
        }
    }

    private applyResponsiveCalendarView(isNarrow: boolean): void {
        const api = this.calendar()?.getApi();
        if (!api) {
            return;
        }
        const next = isNarrow ? 'timeGridDay' : 'timeGridWeek';
        if (api.view.type !== next) {
            api.changeView(next);
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
                    : // English title format
                      lang === 'en'
                      ? (info: { start: { marker: Date }; end?: { marker: Date } }) => {
                            const start = new Date(info.start.marker);
                            if (!info.end) {
                                return `${start.getDate()} ${start.toLocaleString('en-GB', { month: 'short' })} ${start.getFullYear()}`;
                            }
                            const end = new Date(info.end.marker);
                            end.setDate(end.getDate() - 1);

                            const sameMonth =
                                start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
                            const sameYear = start.getFullYear() === end.getFullYear();

                            if (sameMonth) {
                                return `${start.getDate()} - ${end.getDate()} ${end.toLocaleString('en-GB', { month: 'short' })} ${end.getFullYear()}`;
                            }
                            if (sameYear) {
                                const sm = start.toLocaleString('en-GB', { month: 'short' });
                                const em = end.toLocaleString('en-GB', { month: 'short' });
                                return `${start.getDate()} ${sm} - ${end.getDate()} ${em} ${end.getFullYear()}`;
                            }
                            const sm = start.toLocaleString('en-GB', { month: 'short' });
                            const em = end.toLocaleString('en-GB', { month: 'short' });
                            return `${start.getDate()} ${sm} ${start.getFullYear()} - ${end.getDate()} ${em} ${end.getFullYear()}`;
                        }
                      : { year: 'numeric' as const, month: 'short' as const, day: 'numeric' as const },
        };
    }
    // Fix for FullCalendar locale
    private resolveCalendarLocale(lang: string): string {
        return lang === 'en' ? 'en-gb' : lang;
    }
}
