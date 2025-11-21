// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass, UpperCasePipe } from '@angular/common';
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
        <div class="row">
            <div class="col-md-2 col-12">
                <strong>{{ room().name }}</strong>
            </div>
            <div class="col-md-10 col-12">
                {{ room().mailAddress.street }} {{ room().mailAddress.zip }}
                {{ room().mailAddress.city }}
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-md-2 col-12">
                <span class="d-block">{{ 'i18n_room_default_working_hours' | translate }}</span>
                <small class="text-muted">({{ room().localTimezone }})</small>
            </div>
            <div class="col-md-10 col-12">
                @for (oh of openingHours(); track oh.ord) {
                    <div class="row">
                        <div class="col-md-1 col-6">{{ oh.name | uppercase }}</div>
                        <div class="col-md-11 col-6">{{ oh.periodText }}</div>
                    </div>
                }
            </div>
        </div>
        @if (exceptionHours().length > 0) {
            <div class="row mt-2">
                <div class="col-md-2 col-12">{{ 'i18n_exception_datetimes' | translate }}:</div>
                <div class="col-md-10 col-12">
                    @for (eh of exceptionHours(); track eh.id) {
                        <div
                            [ngClass]="eh.outOfService ? 'text-danger' : 'text-success'"
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
                <div class="">{{ 'i18n_no_exceptions_this_week' | translate }}</div>
            </div>
        }
        @if (thisWeeksMaintenancePeriods().length > 0) {
            <div class="row mt-2">
                <div class="col-md-2 col-12">{{ 'i18n_maintenance_periods' | translate }}:</div>
                <div class="col-md-10 col-12">
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
                <div class="">{{ 'i18n_no_maintenance_periods_this_week' | translate }}</div>
            </div>
        }
        @if (roomInstructions()) {
            <div class="row mt-2">
                <div class="col-md-2 col-12">{{ 'i18n_room_guidance' | translate }}:</div>
                <div class="col-md-10 col-12">{{ roomInstructions() }}</div>
            </div>
        }
        @if (roomAccessibility()) {
            <div class="row mt-2">
                <div class="col-md-2 col-12">{{ 'i18n_room_accessibility' | translate }}:</div>
                <div class="col-md-10 col-12">{{ roomAccessibility() }}</div>
            </div>
        }
    `,
    styleUrls: ['../calendar.component.scss'],
    imports: [NgClass, NgbPopover, UpperCasePipe, DatePipe, TranslateModule, OrderByPipe],
})
export class SelectedRoomComponent {
    room = input.required<ExamRoom>();
    maintenancePeriods = input<(MaintenancePeriod & { org: string })[]>([]);
    viewStart = input<DateTime>(DateTime.now());

    showAllMaintenancePeriods = false;

    // Convert language change observable to signal
    currentLang = toSignal(inject(TranslateService).onLangChange.pipe(map((event) => event.lang)), {
        initialValue: inject(TranslateService).getCurrentLang(),
    });

    openingHours = computed(() => {
        const room = this.room();
        this.currentLang(); // Track language changes - weekday names are language-dependent
        return this.Calendar.processOpeningHours(room);
    });

    exceptionHours = computed(() => {
        const room = this.room();
        const start = this.viewStart();
        const end = start.plus({ week: 1 });
        return this.Calendar.getExceptionHours(room, start, end);
    });

    thisWeeksMaintenancePeriods = computed(() => {
        const mp = this.maintenancePeriods();
        const viewStart = this.viewStart();
        const end = viewStart.plus({ week: 1 });

        return mp.filter((p) => {
            const start = DateTime.fromISO(p.startsAt);
            return start >= viewStart && start < end;
        });
    });

    roomInstructions = computed(() => {
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

    roomAccessibility = computed(() => {
        const currentRoom = this.room();
        return currentRoom.accessibilities ? currentRoom.accessibilities.map((a) => a.name).join(', ') : '';
    });

    private Calendar = inject(CalendarService);
}
