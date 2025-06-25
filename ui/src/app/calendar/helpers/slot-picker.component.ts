// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import type { SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewEncapsulation, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EventApi, EventInput } from '@fullcalendar/core';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { BookingCalendarComponent } from 'src/app/calendar/booking-calendar.component';
import type { FilterableAccessibility, Organisation, Slot } from 'src/app/calendar/calendar.model';
import { CalendarService } from 'src/app/calendar/calendar.service';
import { MaintenancePeriod } from 'src/app/facility/facility.model';
import type { Accessibility, ExamRoom } from 'src/app/reservation/reservation.model';
import { updateList } from 'src/app/shared/miscellaneous/helpers';
import { AccessibilityPickerComponent } from './accessibility-picker.component';
import { SelectedRoomComponent } from './selected-room.component';

type FilterableRoom = ExamRoom & { filtered: boolean };
type AvailableSlot = Slot & { availableMachines: number };

@Component({
    selector: 'xm-calendar-slot-picker',
    templateUrl: './slot-picker.component.html',
    styleUrls: ['../calendar.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        NgClass,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
        SelectedRoomComponent,
        AccessibilityPickerComponent,
        BookingCalendarComponent,
        TranslateModule,
    ],
})
export class SlotPickerComponent implements OnInit, OnChanges {
    @Input() sequenceNumber = 0;
    @Input() isInteroperable = false;
    @Input() isCollaborative = false;
    @Input() isExternal = false;
    @Input() organisation?: Organisation;
    @Input() disabled = false;
    @Input() minDate = new Date();
    @Input() maxDate = new Date();
    @Output() cancelled = new EventEmitter<void>();
    @Output() selected = new EventEmitter<{
        start: string;
        end: string;
        room: ExamRoom;
        accessibilities: Accessibility[];
    }>();

    rooms = signal<FilterableRoom[]>([]);
    maintenancePeriods = signal<(MaintenancePeriod & { remote: boolean })[]>([]);
    selectedRoom?: ExamRoom;
    accessibilities: FilterableAccessibility[] = [];
    currentWeek = signal(DateTime.now());
    examId = signal(0);

    constructor(
        private translate: TranslateService,
        private route: ActivatedRoute,
        private toast: ToastrService,
        private Calendar: CalendarService,
    ) {}

    ngOnInit() {
        this.examId.set(Number(this.route.snapshot.paramMap.get('id')));
        this.Calendar.listAccessibilityCriteria$().subscribe(
            (resp) => (this.accessibilities = resp.map((a) => ({ ...a, filtered: false }))),
        );
        this.Calendar.listRooms$().subscribe((resp) => {
            const rooms = resp.map((r: ExamRoom) => ({ ...r, filtered: false })).filter((r) => r.name);
            this.rooms.set(rooms.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1)));
        });
        this.Calendar.listMaintenancePeriods$().subscribe((periods) => {
            const localMaintenances = periods.map((p) => ({ ...p, remote: false }));
            this.maintenancePeriods.set(localMaintenances);
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.organisation && this.organisation) {
            this.rooms.set(this.organisation.facilities.map((f) => ({ ...f, filtered: false })));
            delete this.selectedRoom;
            const remoteMaintenances = (this.organisation.maintenancePeriods || []).map((p) => ({
                ...p,
                remote: true,
            }));
            this.maintenancePeriods.set(
                this.maintenancePeriods()
                    .filter((p) => !p.remote)
                    .concat(remoteMaintenances),
            );
        }
    }

    eventSelected = ($event: EventApi) =>
        this.selected.emit({
            start: $event.startStr,
            end: $event.endStr,
            room: this.selectedRoom as ExamRoom,
            accessibilities: this.accessibilities.filter((i) => i.filtered),
        });

    refresh($event: { date: string; timeZone: string; success: (events: EventInput[]) => void }) {
        if (!this.selectedRoom) {
            return;
        }
        const start = DateTime.fromISO($event.date, { zone: $event.timeZone }).startOf('week');
        this.currentWeek.set(start as DateTime<true>);
        const accessibilities = this.accessibilities.filter((i) => i.filtered).map((i) => i.id);

        const getColor = (slot: AvailableSlot) => {
            if (slot.availableMachines < 0) {
                // conflicting event
                return '#fc3858'; // red
            } else if (slot.availableMachines > 0) {
                return '#a6e9b2'; // green
            } else {
                // none available
                return '#92c3e4'; // blueish
            }
        };

        const successFn = (resp: AvailableSlot[]) => {
            const events: EventInput[] = resp.map((slot: AvailableSlot, i) => ({
                id: i.toString(),
                title: this.getTitle(slot),
                start: this.adjust(slot.start, this.selectedRoom?.localTimezone as string),
                end: this.adjust(slot.end, this.selectedRoom?.localTimezone as string),
                backgroundColor: getColor(slot),
                textColor: 'black',
                availableMachines: slot.availableMachines,
            }));
            $event.success(events);
        };
        const errorFn = (resp: string) => this.toast.error(resp);
        this.query(start.toFormat('yyyy-MM-dd'), accessibilities).subscribe({
            next: successFn,
            error: errorFn,
        });
    }

    makeExternalReservation = () => {
        delete this.selectedRoom;
        this.cancelled.emit();
    };

    accesibilitiesChanged = (items: FilterableAccessibility[]) => (this.accessibilities = [...items]);

    selectRoom = (room: FilterableRoom) => {
        if (!room.outOfService) {
            this.selectedRoom = room;
            this.rooms.update((rs) => {
                const unfiltered = rs.map((r) => ({ ...r, filtered: false }));
                return updateList(unfiltered, 'id', { ...room, filtered: true });
            });
        }
    };

    getDescription(room: ExamRoom): string {
        const status = room.statusComment ? ': ' + room.statusComment : '';
        return this.translate.instant('i18n_room_out_of_service') + status;
    }

    outOfServiceGate = (room: ExamRoom, text: string) => (room.outOfService ? text : undefined);

    private getTitle(slot: AvailableSlot): string {
        if (slot.availableMachines > 0) {
            return `${this.translate.instant('i18n_slot_available')} (${slot.availableMachines})`;
        } else {
            return slot.conflictingExam
                ? this.translate.instant('i18n_own_reservation')
                : this.translate.instant('i18n_reserved');
        }
    }

    private query(date: string, accessibilityIds: number[]): Observable<AvailableSlot[]> {
        const room = this.selectedRoom as ExamRoom;
        const params = new HttpParams({
            fromObject:
                this.isExternal && this.organisation
                    ? { org: this.organisation._id, date: date }
                    : { day: date, aids: accessibilityIds.map((i) => i.toString()) },
        });
        return this.Calendar.listSlots$(this.isExternal, this.isCollaborative, room, this.examId(), params);
    }

    private adjust = (date: string, tz: string): Date => {
        const adjusted = DateTime.fromISO(date, { zone: tz });
        const offset = adjusted.isInDST ? -1 : 0;
        return adjusted.plus({ hours: offset }).toJSDate();
    };
}
