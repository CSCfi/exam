// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
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
    template: `
        <div class="xm-stack xm-gap-3">
            <div class="room-heading">
                <strong class="selected-room-title">{{ room().name }}</strong>
                <span class="selected-room-address xm-text-muted">
                    {{ room().mailAddress.street }} {{ room().mailAddress.zip }}
                    {{ room().mailAddress.city }}
                </span>
            </div>
            <dl class="xm-details">
                <dt>
                    <span class="d-block">{{ 'i18n_room_default_working_hours' | translate }}</span>
                    <small class="xm-text-muted">({{ room().localTimezone }})</small>
                </dt>
                <dd>
                    <dl class="opening-hours">
                        @for (oh of openingHours(); track oh.ord) {
                            <dt>{{ oh.name | uppercase }}</dt>
                            <dd>{{ oh.periodText }}</dd>
                        }
                    </dl>
                </dd>
                <dt>{{ 'i18n_exception_datetimes' | translate }}:</dt>
                <dd>
                    @for (eh of exceptionHours(); track eh.id) {
                        <div
                            [class.xm-text-danger]="eh.outOfService"
                            [class.xm-text-success]="!eh.outOfService"
                            triggers="mouseenter:mouseleave"
                            ngbPopover="{{ eh.description | translate }}"
                            popoverTitle="{{ 'i18n_instructions' | translate }}"
                        >
                            {{ eh.start }} - {{ eh.end }} {{ eh.description + '' | translate }}
                        </div>
                    } @empty {
                        {{ 'i18n_no_exceptions_this_week' | translate }}
                    }
                </dd>
                <dt>{{ 'i18n_maintenance_periods' | translate }}:</dt>
                <dd>
                    @for (period of thisWeeksMaintenancePeriods() | orderBy: 'startsAt'; track period.id) {
                        <div>
                            {{ period.startsAt | date: 'dd.MM.yyyy HH:mm' }} -
                            {{ period.endsAt | date: 'dd.MM.yyyy HH:mm' }}
                            {{ period.description }}
                            @if (period.org) {
                                <span class="xm-text-danger">({{ period.org }})</span>
                            }
                        </div>
                    } @empty {
                        {{ 'i18n_no_maintenance_periods_this_week' | translate }}
                    }
                </dd>
                @if (roomInstructions()) {
                    <dt>{{ 'i18n_room_guidance' | translate }}:</dt>
                    <dd>{{ roomInstructions() }}</dd>
                }
                @if (roomAccessibility()) {
                    <dt>{{ 'i18n_room_accessibility' | translate }}:</dt>
                    <dd>{{ roomAccessibility() }}</dd>
                }
            </dl>
        </div>
    `,
    styleUrls: ['./selected-room.component.scss'],
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
