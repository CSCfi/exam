// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    ViewChild,
    ViewEncapsulation,
    effect,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
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
import { PasswordPromptComponent } from 'src/app/calendar/helpers/password-prompt.component';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgClass,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
        SelectedRoomComponent,
        AccessibilityPickerComponent,
        BookingCalendarComponent,
        PasswordPromptComponent,
        TranslateModule,
    ],
})
export class SlotPickerComponent {
    @ViewChild('passwordPrompt') passwordPrompt!: PasswordPromptComponent;

    sequenceNumber = input(0);
    isInteroperable = input(false);
    isCollaborative = input(false);
    isExternal = input(false);
    organisation = input<Organisation | undefined>(undefined);
    disabled = input(false);
    minDate = input<Date>(new Date());
    maxDate = input<Date>(new Date());
    cancelled = output<void>();
    selected = output<{
        start: string;
        end: string;
        room: ExamRoom;
        accessibilities: Accessibility[];
    }>();

    rooms = signal<FilterableRoom[]>([]);
    maintenancePeriods = signal<(MaintenancePeriod & { remote: boolean })[]>([]);
    selectedRoom = signal<ExamRoom | undefined>(undefined);
    accessibilities = signal<FilterableAccessibility[]>([]);
    currentWeek = signal(DateTime.now());
    examId = signal(0);
    passwordVerified = signal(false);

    private translate = inject(TranslateService);
    private route = inject(ActivatedRoute);
    private toast = inject(ToastrService);
    private Calendar = inject(CalendarService);

    constructor() {
        this.examId.set(Number(this.route.snapshot.paramMap.get('id')));
        this.Calendar.listAccessibilityCriteria$().subscribe((resp) =>
            this.accessibilities.set(resp.map((a) => ({ ...a, filtered: false }))),
        );
        this.Calendar.listRooms$().subscribe((resp) => {
            const rooms = resp.map((r: ExamRoom) => ({ ...r, filtered: false })).filter((r) => r.name);
            this.rooms.set(rooms.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1)));
        });
        this.Calendar.listMaintenancePeriods$().subscribe((periods) => {
            const localMaintenances = periods.map((p) => ({ ...p, remote: false }));
            this.maintenancePeriods.set(localMaintenances);
        });

        // React to organisation changes
        effect(() => {
            const org = this.organisation();
            if (org) {
                this.rooms.set(org.facilities.map((f) => ({ ...f, filtered: false })));
                this.selectedRoom.set(undefined);
                this.passwordVerified.set(false);
                const remoteMaintenances = (org.maintenancePeriods || []).map((p) => ({
                    ...p,
                    remote: true,
                }));
                this.maintenancePeriods.set(
                    this.maintenancePeriods()
                        .filter((p) => !p.remote)
                        .concat(remoteMaintenances),
                );
            }
        });
    }

    eventSelected($event: EventApi) {
        const room = this.selectedRoom();
        if (!room) {
            return;
        }
        this.selected.emit({
            start: $event.startStr,
            end: $event.endStr,
            room: room,
            accessibilities: this.accessibilities().filter((i) => i.filtered),
        });
    }

    refresh($event: { date: string; timeZone: string; success: (events: EventInput[]) => void }) {
        const room = this.selectedRoom();
        if (!room) {
            return;
        }
        const start = DateTime.fromISO($event.date, { zone: $event.timeZone }).startOf('week');
        this.currentWeek.set(start as DateTime<true>);
        const accessibilities = this.accessibilities()
            .filter((i) => i.filtered)
            .map((i) => i.id);

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
            const currentRoom = this.selectedRoom();
            if (!currentRoom) {
                return;
            }
            const events: EventInput[] = resp.map((slot: AvailableSlot, i) => ({
                id: i.toString(),
                title: this.getTitle(slot),
                start: this.adjust(slot.start, currentRoom.localTimezone),
                end: this.adjust(slot.end, currentRoom.localTimezone),
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

    makeExternalReservation() {
        this.selectedRoom.set(undefined);
        this.cancelled.emit();
    }

    accesibilitiesChanged(items: FilterableAccessibility[]) {
        this.accessibilities.set([...items]);
    }

    onPasswordValidated(password: string): void {
        const room = this.selectedRoom();
        if (room && password) {
            this.Calendar.validatePassword$(room.id, password, this.isExternal(), room._id).subscribe({
                next: () => this.passwordVerified.set(true),
                error: () => this.toast.error(this.translate.instant('i18n_invalid_password')),
            });
        }
    }

    selectRoom(room: FilterableRoom) {
        if (!room.outOfService) {
            // Always set the room immediately to show room information
            this.setSelectedRoom(room);
        }
    }

    getDescription(room: ExamRoom): string {
        const status = room.statusComment ? ': ' + room.statusComment : '';
        return this.translate.instant('i18n_room_out_of_service') + status;
    }

    outOfServiceGate(room: ExamRoom, text: string): string | undefined {
        return room.outOfService ? text : undefined;
    }

    private getTitle(slot: AvailableSlot): string {
        if (slot.availableMachines > 0) {
            return `${this.translate.instant('i18n_slot_available')} (${slot.availableMachines})`;
        } else {
            return slot.conflictingExam
                ? this.translate.instant('i18n_own_reservation')
                : this.translate.instant('i18n_reserved');
        }
    }

    private setSelectedRoom(room: FilterableRoom) {
        this.selectedRoom.set(room);
        // Only set password verified to true if room doesn't require password
        if (!this.isExternal() && room.internalPasswordRequired) {
            this.passwordVerified.set(false);
        } else if (this.isExternal() && room.externalPasswordRequired) {
            this.passwordVerified.set(false);
        } else {
            this.passwordVerified.set(true);
        }
        this.rooms.update((rs) => {
            const unfiltered = rs.map((r) => ({ ...r, filtered: false }));
            return updateList(unfiltered, 'id', { ...room, filtered: true });
        });
    }

    private query(date: string, accessibilityIds: number[]): Observable<AvailableSlot[]> {
        const room = this.selectedRoom();
        if (!room) {
            throw new Error('No room selected');
        }
        const org = this.organisation();
        const params = new HttpParams({
            fromObject:
                this.isExternal() && org
                    ? { org: org._id, date: date }
                    : { day: date, aids: accessibilityIds.map((i) => i.toString()) },
        });
        return this.Calendar.listSlots$(this.isExternal(), this.isCollaborative(), room, this.examId(), params);
    }

    private adjust(date: string, tz: string): Date {
        const adjusted = DateTime.fromISO(date, { zone: tz });
        const offset = adjusted.isInDST ? -1 : 0;
        return adjusted.plus({ hours: offset }).toJSDate();
    }
}
