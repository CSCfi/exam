// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { map } from 'rxjs';
import { CalendarService } from 'src/app/calendar/calendar.service';
import { MaintenancePeriod } from 'src/app/facility/facility.model';
import { ExamRoom } from 'src/app/reservation/reservation.model';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-calendar-selected-room',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="row g-2">
            <div class="col-12">
                <div class="d-flex flex-column flex-lg-row flex-lg-wrap align-items-lg-baseline gap-2 min-w-0">
                    <strong class="selected-room-title mb-0">{{ room().name }}</strong>
                    <span class="selected-room-address text-body-secondary">
                        {{ room().mailAddress.street }} {{ room().mailAddress.zip }}
                        {{ room().mailAddress.city }}
                    </span>
                </div>
            </div>
        </div>
        <div class="row mt-3 g-2">
            <div class="col-12 col-md-4 col-lg-3 col-xl-2">
                <span class="d-block">{{ 'i18n_room_default_working_hours' | translate }}</span>
                <small class="text-muted">({{ room().localTimezone }})</small>
            </div>
            <div class="col-12 col-md-8 col-lg-9 col-xl-10">
                @for (oh of openingHours(); track oh.ord) {
                    <div class="row g-0 gx-md-2">
                        <div class="col-4 col-sm-3 col-md-2 col-lg-2">{{ oh.name | uppercase }}</div>
                        <div class="col-8 col-sm-9 col-md-10 col-lg-10">{{ oh.periodText }}</div>
                    </div>
                }
            </div>
        </div>
        @if (exceptionHours().length > 0) {
            <div class="row mt-2 g-2">
                <div class="col-12 col-sm-4 col-lg-3 col-xl-2">{{ 'i18n_exception_datetimes' | translate }}:</div>
                <div class="col-12 col-sm-8 col-lg-9 col-xl-10">
                    @for (eh of exceptionHours(); track eh.id) {
                        <div
                            [class.text-danger]="eh.outOfService"
                            [class.text-success]="!eh.outOfService"
                            triggers="mouseenter:mouseleave"
                            ngbPopover="{{ eh.description | translate }}"
                            popoverTitle="{{ 'i18n_instructions' | translate }}"
                        >
                            {{ eh.start }} - {{ eh.end }} {{ eh.description + '' | translate }}
                        </div>
                    }
                </div>
            </div>
        } @else {
            <div class="row mt-2">
                <div class="col-12">{{ 'i18n_no_exceptions_this_week' | translate }}</div>
            </div>
        }
        @if (thisWeeksMaintenancePeriods().length > 0) {
            <div class="row mt-2 g-2">
                <div class="col-12 col-sm-4 col-lg-3 col-xl-2">{{ 'i18n_maintenance_periods' | translate }}:</div>
                <div class="col-12 col-sm-8 col-lg-9 col-xl-10">
                    @for (period of thisWeeksMaintenancePeriods() | orderBy: 'startsAt'; track period.id) {
                        <div>
                            {{ period.startsAt | date: 'dd.MM.yyyy HH:mm' }} -
                            {{ period.endsAt | date: 'dd.MM.yyyy HH:mm' }}
                            {{ period.description }}
                            @if (period.org) {
                                <span class="text-danger">({{ period.org }})</span>
                            }
                        </div>
                    }
                </div>
            </div>
        } @else {
            <div class="row mt-2">
                <div class="col-12">{{ 'i18n_no_maintenance_periods_this_week' | translate }}</div>
            </div>
        }
        @if (roomInstructions()) {
            <div class="row mt-2 g-2">
                <div class="col-12 col-sm-4 col-lg-3 col-xl-2">{{ 'i18n_room_guidance' | translate }}:</div>
                <div class="col-12 col-sm-8 col-lg-9 col-xl-10 text-break">{{ roomInstructions() }}</div>
            </div>
        }
        @if (roomAccessibility()) {
            <div class="row mt-2 g-2">
                <div class="col-12 col-sm-4 col-lg-3 col-xl-2">{{ 'i18n_room_accessibility' | translate }}:</div>
                <div class="col-12 col-sm-8 col-lg-9 col-xl-10 text-break">{{ roomAccessibility() }}</div>
            </div>
        }
    `,
    styleUrls: ['./selected-room.component.scss', '../calendar.component.scss'],
    imports: [NgbPopover, UpperCasePipe, DatePipe, TranslateModule, OrderByPipe],
})
export class SelectedRoomComponent {
    readonly room = input.required<ExamRoom>();
    readonly maintenancePeriods = input<(MaintenancePeriod & { org: string })[]>([]);
    readonly viewStart = input<DateTime>(DateTime.now());

    // Convert language change observable to signal
    readonly currentLang = toSignal(inject(TranslateService).onLangChange.pipe(map((event) => event.lang)), {
        initialValue: inject(TranslateService).getCurrentLang(),
    });

    readonly openingHours = computed(() => {
        const room = this.room();
        this.currentLang(); // Track language changes - weekday names are language-dependent
        return this.Calendar.processOpeningHours(room);
    });

    readonly exceptionHours = computed(() => {
        const room = this.room();
        const start = this.viewStart();
        const end = start.plus({ week: 1 });
        return this.Calendar.getExceptionHours(room, start, end);
    });

    readonly thisWeeksMaintenancePeriods = computed(() => {
        const mp = this.maintenancePeriods();
        const viewStart = this.viewStart();
        const end = viewStart.plus({ week: 1 });

        return mp.filter((p) => {
            const start = DateTime.fromISO(p.startsAt);
            return start >= viewStart && start < end;
        });
    });

    readonly roomInstructions = computed(() => {
        const currentRoom = this.room();
        const lang = this.currentLang();
        switch (lang) {
            case 'fi':
                return currentRoom.roomInstruction;
            case 'sv':
                return currentRoom.roomInstructionSV;
            case 'en':
            default:
                return currentRoom.roomInstructionEN;
        }
    });

    readonly roomAccessibility = computed(() => {
        const currentRoom = this.room();
        return currentRoom.accessibilities ? currentRoom.accessibilities.map((a) => a.name).join(', ') : '';
    });

    private readonly Calendar = inject(CalendarService);
}
