// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule, NgbTimepicker } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { DefaultWorkingHoursWithEditing } from 'src/app/facility/facility.model';
import { RoomService } from 'src/app/facility/rooms/room.service';
import { DefaultWorkingHours, ExamRoom } from 'src/app/reservation/reservation.model';
import { DateTimeService } from 'src/app/shared/date/date.service';

const ZERO_TIME = { hour: 0, minute: 0, second: 0, millisecond: 0 };
const DEFAULT_NEW_TIME: DefaultWorkingHoursWithEditing = {
    startTime: '',
    endTime: '',
    weekday: 'MONDAY',
    editing: false,
    pickStartingTime: ZERO_TIME,
    pickEndingTime: ZERO_TIME,
    displayStartingTime: ZERO_TIME,
    displayEndingTime: ZERO_TIME,
};

interface RoomWithAddressVisibility extends ExamRoom {
    addressVisible: boolean;
    availabilityVisible: boolean;
    extendedDwh: DefaultWorkingHoursWithEditing[];
}
@Component({
    selector: 'xm-opening-hours',
    templateUrl: './opening-hours.component.html',
    imports: [NgbTimepicker, FormsModule, NgbDropdownModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenHoursComponent {
    readonly room = input.required<ExamRoom>();

    readonly weekdayNames = signal<string[]>([]);
    readonly extendedRoom = linkedSignal<RoomWithAddressVisibility | undefined>(() =>
        this.room() ? this.buildExtendedRoom(this.room()) : undefined,
    );
    readonly newTime = signal<DefaultWorkingHoursWithEditing>({ ...DEFAULT_NEW_TIME });
    readonly WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    private readonly dateTime = inject(DateTimeService);
    private readonly roomService = inject(RoomService);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);

    constructor() {
        this.weekdayNames.set(this.dateTime.getWeekdayNames());
        this.translate.onLangChange.subscribe(() => {
            this.weekdayNames.set(this.dateTime.getWeekdayNames());
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
        const toHmm = (t: { hour: number; minute: number }) => `${t.hour}:${t.minute.toString().padStart(2, '0')}`;
        const start = toHmm(wh.pickStartingTime);
        const end = toHmm(wh.pickEndingTime);
        if (
            wh.pickStartingTime.hour * 60 + wh.pickStartingTime.minute >
            wh.pickEndingTime.hour * 60 + wh.pickEndingTime.minute
        ) {
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
                    this.newTime.set({ ...DEFAULT_NEW_TIME });
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

    private buildExtendedRoom(room: ExamRoom): RoomWithAddressVisibility {
        return {
            ...room,
            addressVisible: false,
            availabilityVisible: false,
            extendedDwh: room.defaultWorkingHours.map((wh) => {
                const parseHmm = (s: string) => {
                    const [h, m] = s.split(':').map(Number);
                    return { hour: h, minute: m };
                };
                const start = parseHmm(wh.startTime);
                const end = parseHmm(wh.endTime);
                return {
                    ...wh,
                    editing: false,
                    pickStartingTime: this.createTimeObject(start.hour, start.minute),
                    pickEndingTime: this.createTimeObject(end.hour, end.minute),
                    displayStartingTime: this.createTimeObject(start.hour, start.minute),
                    displayEndingTime: this.createTimeObject(end.hour, end.minute),
                };
            }),
        };
    }

    private createTimeObject(hour: number, minute: number) {
        return { hour, minute, second: 0, millisecond: 0 };
    }

    private timeToMinutes(time: { hour: number; minute: number }) {
        return time.hour * 100 + time.minute;
    }

    private toMinutes(time: { hour: number; minute: number }) {
        return time.hour * 60 + time.minute;
    }

    private overlaps(wh: DefaultWorkingHoursWithEditing, room: RoomWithAddressVisibility) {
        const newStart = this.toMinutes(wh.pickStartingTime);
        const newEnd = this.toMinutes(wh.pickEndingTime);
        return room.extendedDwh
            .filter((dwh) => dwh.weekday === wh.weekday && dwh !== wh)
            .some((dwh) => {
                const s = this.toMinutes(dwh.pickStartingTime);
                const e = this.toMinutes(dwh.pickEndingTime);
                return s <= newEnd && newStart <= e;
            });
    }
}
