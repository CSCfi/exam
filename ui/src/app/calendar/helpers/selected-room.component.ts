// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { OpeningHours } from 'src/app/calendar/calendar.model';
import { CalendarService } from 'src/app/calendar/calendar.service';
import { MaintenancePeriod } from 'src/app/facility/facility.model';
import type { ExamRoom, ExceptionWorkingHours } from 'src/app/reservation/reservation.model';
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
                        {{ period.startsAt | date: 'dd.MM.yyyy HH:mm' }} -
                        {{ period.endsAt | date: 'dd.MM.yyyy HH:mm' }}
                        {{ period.description }}
                        @if (period.remote) {
                            <span class="text-danger">(remote)</span>
                        }
                    }
                </div>
            </div>
        } @else {
            <div class="row mt-2">
                <div class="">{{ 'i18n_no_maintenance_periods_this_week' | translate }}</div>
            </div>
        }
        @if (getRoomInstructions()) {
            <div class="row mt-2">
                <div class="col-md-2 col-12">{{ 'i18n_room_guidance' | translate }}:</div>
                <div class="col-md-10 col-12">{{ getRoomInstructions() }}</div>
            </div>
        }
        @if (getRoomAccessibility()) {
            <div class="row mt-2">
                <div class="col-md-2 col-12">{{ 'i18n_room_accessibility' | translate }}:</div>
                <div class="col-md-10 col-12">{{ getRoomAccessibility() }}</div>
            </div>
        }
    `,
    styleUrls: ['../calendar.component.scss'],
    imports: [NgClass, NgbPopover, UpperCasePipe, DatePipe, TranslateModule, OrderByPipe],
})
export class SelectedRoomComponent {
    room = input.required<ExamRoom>();
    maintenancePeriods = input<(MaintenancePeriod & { remote: boolean })[]>([]);
    viewStart = input<DateTime>(DateTime.now());

    openingHours = signal<OpeningHours[]>([]);
    exceptionHours = signal<(ExceptionWorkingHours & { start: string; end: string; description: string })[]>([]);
    showAllMaintenancePeriods = false;

    private translate = inject(TranslateService);
    private Calendar = inject(CalendarService);

    constructor() {
        // React to changes in room, viewStart, or language
        effect(() => {
            const currentRoom = this.room();
            const currentViewStart = this.viewStart();
            this.init(currentRoom, currentViewStart);
        });

        // React to language changes
        this.translate.onLangChange.subscribe(() => {
            this.openingHours.set(this.Calendar.processOpeningHours(this.room()));
        });
    }

    getRoomInstructions(): string | undefined {
        const currentRoom = this.room();
        switch (this.translate.currentLang) {
            case 'fi':
                return currentRoom.roomInstruction;
            case 'sv':
                return currentRoom.roomInstructionSV;
            case 'en':
            default:
                return currentRoom.roomInstructionEN;
        }
    }

    getRoomAccessibility(): string {
        const currentRoom = this.room();
        return currentRoom.accessibilities ? currentRoom.accessibilities.map((a) => a.name).join(', ') : '';
    }

    thisWeeksMaintenancePeriods() {
        const mp = [...this.maintenancePeriods()];
        const currentViewStart = this.viewStart();
        return mp.filter((p) => {
            const start = DateTime.fromISO(p.startsAt);
            return start >= currentViewStart && start < currentViewStart.plus({ week: 1 });
        });
    }

    private init(room: ExamRoom, viewStart: DateTime) {
        this.openingHours.set(this.Calendar.processOpeningHours(room));
        this.exceptionHours.set(this.Calendar.getExceptionHours(room, viewStart, viewStart.plus({ week: 1 })));
    }
}
