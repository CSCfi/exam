// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    NgbDropdown,
    NgbDropdownItem,
    NgbDropdownMenu,
    NgbDropdownToggle,
    NgbTimepicker,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { DefaultWorkingHoursWithEditing } from 'src/app/facility/facility.model';
import { RoomService } from 'src/app/facility/rooms/room.service';
import { DefaultWorkingHours, ExamRoom } from 'src/app/reservation/reservation.model';
import { DateTimeService } from 'src/app/shared/date/date.service';
interface RoomWithAddressVisibility extends ExamRoom {
    addressVisible: boolean;
    availabilityVisible: boolean;
    extendedDwh: DefaultWorkingHoursWithEditing[];
}
@Component({
    selector: 'xm-opening-hours',
    templateUrl: './opening-hours.component.html',
    imports: [NgbTimepicker, FormsModule, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenHoursComponent {
    room = input.required<ExamRoom>();

    weekdayNames = signal<string[]>([]);
    extendedRoom = signal<RoomWithAddressVisibility | undefined>(undefined);
    newTime = signal<DefaultWorkingHoursWithEditing>({
        startTime: '',
        endTime: '',
        weekday: 'MONDAY',
        editing: false,
        pickStartingTime: { hour: 0, minute: 0, second: 0, millisecond: 0 },
        pickEndingTime: { hour: 0, minute: 0, second: 0, millisecond: 0 },
        displayStartingTime: { hour: 0, minute: 0, second: 0, millisecond: 0 },
        displayEndingTime: { hour: 0, minute: 0, second: 0, millisecond: 0 },
    });
    readonly WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    private dateTime = inject(DateTimeService);
    private roomService = inject(RoomService);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);

    constructor() {
        this.weekdayNames.set(this.dateTime.getWeekdayNames());
        this.translate.onLangChange.subscribe(() => {
            this.weekdayNames.set(this.dateTime.getWeekdayNames());
        });

        effect(() => {
            const currentRoom = this.room();
            if (currentRoom) {
                this.init(currentRoom);
            }
        });
    }

    orderByWeekday(dwhs: DefaultWorkingHoursWithEditing[]) {
        const ordinal = (dwh: DefaultWorkingHours) => this.WEEKDAYS.indexOf(dwh.weekday);
        return dwhs.sort((a, b) => ordinal(a) - ordinal(b));
    }

    updateHours(wh: DefaultWorkingHoursWithEditing) {
        const currentRoom = this.extendedRoom();
        if (!currentRoom) return;

        if (this.overlaps(wh, currentRoom)) {
            this.toast.error(this.translate.instant('i18n_time_overlaps_error'));
            return;
        }
        const start = DateTime.now()
            .set({
                month: 1,
                day: 1,
                hour: wh.pickStartingTime.hour,
                minute: wh.pickStartingTime.minute,
                second: 0,
                millisecond: 0,
            })
            .toISO();
        const end = DateTime.now()
            .set({
                month: 1,
                day: 1,
                hour: wh.pickEndingTime.hour,
                minute: wh.pickEndingTime.minute,
                second: 0,
                millisecond: 0,
            })
            .toISO();
        if (DateTime.fromISO(start || '') > DateTime.fromISO(end || '')) {
            this.toast.error(this.translate.instant('i18n_starting_cannot_be_after_ending'));
            return;
        }
        const id = wh.id;
        this.roomService
            .updateWorkingHours$({ startTime: start, endTime: end, weekday: wh.weekday }, [this.room().id])
            .subscribe((data) => {
                const updatedWh = { ...wh, id: data.id, editing: false };
                updatedWh.displayStartingTime = updatedWh.pickStartingTime;
                updatedWh.displayEndingTime = updatedWh.pickEndingTime;

                if (!id) {
                    this.extendedRoom.update((room) =>
                        room ? { ...room, extendedDwh: [...room.extendedDwh, updatedWh] } : room,
                    );
                    this.newTime.set(this.createNewTime());
                } else {
                    this.extendedRoom.update((room) =>
                        room
                            ? {
                                  ...room,
                                  extendedDwh: room.extendedDwh.map((dwh) => (dwh === wh ? updatedWh : dwh)),
                              }
                            : room,
                    );
                }
                this.toast.info(this.translate.instant('i18n_default_opening_hours_updated'));
            });
    }

    deleteHours(wh: DefaultWorkingHoursWithEditing) {
        if (!wh.id) return;
        return this.roomService.removeWorkingHours$(wh.id, this.room().id).subscribe(() => {
            this.extendedRoom.update((room) =>
                room ? { ...room, extendedDwh: room.extendedDwh.filter((dwh) => dwh !== wh) } : room,
            );
            this.toast.info(this.translate.instant('i18n_default_opening_hours_updated'));
        });
    }

    workingHourFormat(time: { hour: number; minute: number }): string {
        const zeropad = (n: number) => (String(n).length > 1 ? n.toString() : '0' + n.toString());
        return `${zeropad(time.hour)}:${zeropad(time.minute)}`;
    }

    updateNewTime(weekday: string) {
        this.newTime.update((time) => ({ ...time, weekday }));
    }

    updateNewTimePickStarting(value: { hour: number; minute: number; second: number; millisecond: number }) {
        this.newTime.update((time) => ({ ...time, pickStartingTime: value }));
        this.onStartTimeChange();
    }

    updateNewTimePickEnding(value: { hour: number; minute: number; second: number; millisecond: number }) {
        this.newTime.update((time) => ({ ...time, pickEndingTime: value }));
        this.onEndTimeChange();
    }

    onStartTimeChange() {
        const currentTime = this.newTime();
        if (this.timeToMinutes(currentTime.pickStartingTime) > this.timeToMinutes(currentTime.pickEndingTime)) {
            this.newTime.update((time) => ({ ...time, pickEndingTime: time.pickStartingTime }));
        }
    }

    onEndTimeChange() {
        const currentTime = this.newTime();
        if (this.timeToMinutes(currentTime.pickStartingTime) > this.timeToMinutes(currentTime.pickEndingTime)) {
            this.newTime.update((time) => ({ ...time, pickStartingTime: time.pickEndingTime }));
        }
    }

    translateWeekdayName(weekday: string, capitalize: boolean) {
        return this.dateTime.translateWeekdayName(weekday, capitalize);
    }

    setEditing(wh: DefaultWorkingHoursWithEditing, editing: boolean) {
        this.extendedRoom.update((room) =>
            room
                ? { ...room, extendedDwh: room.extendedDwh.map((dwh) => (dwh === wh ? { ...dwh, editing } : dwh)) }
                : room,
        );
    }

    init(room: ExamRoom) {
        this.extendedRoom.set({
            ...room,
            addressVisible: false,
            availabilityVisible: false,
            extendedDwh: room.defaultWorkingHours.map((wh) => {
                const hour = new Date(wh.startTime).getHours();
                const startMinute = new Date(wh.startTime).getMinutes();
                const endHour = new Date(wh.endTime).getHours();
                const endMinute = new Date(wh.endTime).getMinutes();
                return {
                    ...wh,
                    editing: false,
                    pickStartingTime: this.createTimeObject(hour, startMinute),
                    pickEndingTime: this.createTimeObject(endHour, endMinute),
                    displayStartingTime: this.createTimeObject(hour, startMinute),
                    displayEndingTime: this.createTimeObject(endHour, endMinute),
                };
            }),
        });
    }

    private createTimeObject(hour: number, minute: number) {
        return { hour, minute, second: 0, millisecond: 0 };
    }

    private createNewTime(): DefaultWorkingHoursWithEditing {
        return {
            startTime: '',
            endTime: '',
            weekday: 'MONDAY',
            editing: false,
            pickStartingTime: this.createTimeObject(0, 0),
            pickEndingTime: this.createTimeObject(0, 0),
            displayStartingTime: this.createTimeObject(0, 0),
            displayEndingTime: this.createTimeObject(0, 0),
        };
    }

    private timeToMinutes(time: { hour: number; minute: number }) {
        return time.hour * 100 + time.minute;
    }

    private toDate(time: { hour: number; minute: number }) {
        return DateTime.now()
            .set({ month: 1, day: 1, hour: time.hour, minute: time.minute, second: 0, millisecond: 0 })
            .toJSDate();
    }

    private overlaps(wh: DefaultWorkingHoursWithEditing, room: RoomWithAddressVisibility) {
        const newInterval = { start: this.toDate(wh.pickStartingTime), end: this.toDate(wh.pickEndingTime) };
        const intervals = room.extendedDwh
            .filter((dwh) => dwh.weekday === wh.weekday && dwh !== wh)
            .map((dwh) => ({ start: this.toDate(dwh.pickStartingTime), end: this.toDate(dwh.pickEndingTime) }));
        return intervals.some((i) => this.intervalsOverlap(i, newInterval));
    }

    private intervalsOverlap(interval1: { start: Date; end: Date }, interval2: { start: Date; end: Date }): boolean {
        return interval1.start <= interval2.end && interval2.start <= interval1.end;
    }
}
