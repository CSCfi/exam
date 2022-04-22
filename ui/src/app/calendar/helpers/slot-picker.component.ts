import { WeekDay } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import type { SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { UIRouterGlobals } from '@uirouter/core';
import type { CalendarEvent } from 'angular-calendar';
import { addHours, format, startOfWeek } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { MaintenancePeriod } from '../../exam/exam.model';
import type { Accessibility, ExamRoom } from '../../reservation/reservation.model';
import { DateTimeService } from '../../shared/date/date.service';
import type { SlotMeta } from '../booking-calendar.component';
import type { Organisation, Slot } from '../calendar.service';
import { CalendarService } from '../calendar.service';

type FilterableAccessibility = Accessibility & { filtered: boolean };
type FilterableRoom = ExamRoom & { filtered: boolean };
type AvailableSlot = Slot & { availableMachines: number };

@Component({
    selector: 'xm-calendar-slot-picker',
    templateUrl: './slot-picker.component.html',
    styles: [
        `
            .black-event-text span {
                color: black !important;
            }
        `,
    ],
    encapsulation: ViewEncapsulation.None,
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
        start: Date;
        end: Date;
        room: ExamRoom;
        accessibilities: Accessibility[];
    }>();

    rooms: FilterableRoom[] = [];
    maintenancePeriods: MaintenancePeriod[] = [];
    selectedRoom?: ExamRoom;
    accessibilities: FilterableAccessibility[] = [];
    showAccessibilityMenu = false;
    currentWeek = new Date();
    events: CalendarEvent<SlotMeta>[] = [];

    constructor(
        private translate: TranslateService,
        private uiRouter: UIRouterGlobals,
        private toast: ToastrService,
        private Calendar: CalendarService,
        private DateTime: DateTimeService,
    ) {}

    ngOnInit() {
        this.Calendar.listAccessibilityCriteria$().subscribe(
            (resp) => (this.accessibilities = resp.map((a) => ({ ...a, filtered: false }))),
        );
        this.Calendar.listRooms$().subscribe((resp) => {
            const rooms = resp.map((r: ExamRoom) => ({ ...r, filtered: false })).filter((r) => r.name);
            this.rooms = rooms.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1));
        });
        this.Calendar.listMaintenancePeriods$().subscribe((periods) => (this.maintenancePeriods = periods));
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.organisation && this.organisation) {
            this.rooms = this.organisation.facilities.map((f) => ({ ...f, filtered: false }));
            delete this.selectedRoom;
        }
    }

    eventSelected = ($event: CalendarEvent<SlotMeta>) =>
        this.selected.emit({
            start: $event.start,
            end: $event.end as Date,
            room: this.selectedRoom as ExamRoom,
            accessibilities: this.accessibilities.filter((i) => i.filtered),
        });

    refresh($event: { date: Date }) {
        if (!this.selectedRoom) {
            return;
        }
        this.currentWeek = startOfWeek($event.date, { weekStartsOn: WeekDay.Monday });
        const accessibilities = this.accessibilities.filter((i) => i.filtered).map((i) => i.id);

        const colorFn = (slot: AvailableSlot) => {
            if (slot.availableMachines < 0) {
                return { primary: '#f50f35', secondary: '#fc3858' }; // red
            } else if (slot.availableMachines > 0) {
                return { primary: '#27542f', secondary: '#a6e9b2' }; // green
            } else {
                return { primary: '#8f8f8f', secondary: '#d8d8d8' }; // grey
            }
        };
        const successFn = (resp: AvailableSlot[]) => {
            const events: CalendarEvent<SlotMeta>[] = resp.map((slot: AvailableSlot, i) => ({
                id: i,
                title: this.getTitle(slot),
                start: this.adjust(slot.start, this.selectedRoom?.localTimezone as string),
                end: this.adjust(slot.end, this.selectedRoom?.localTimezone as string),
                color: colorFn(slot),
                cssClass: 'black-event-text',
                meta: { availableMachines: slot.availableMachines },
            }));
            this.events = events;
        };
        const errorFn = (resp: string) => this.toast.error(resp);
        this.query(format($event.date, 'yyyy-MM-dd'), accessibilities).subscribe({ next: successFn, error: errorFn });
    }

    makeExternalReservation = () => {
        delete this.selectedRoom;
        this.events = [];
        this.cancelled.emit();
    };

    selectAccessibility = (accessibility: FilterableAccessibility) => {
        accessibility.filtered = !accessibility.filtered;
        this.refresh({ date: this.currentWeek });
    };

    selectRoom = (room: FilterableRoom) => {
        if (!room.outOfService) {
            this.selectedRoom = room;
            this.rooms.forEach((r) => (r.filtered = false));
            room.filtered = true;
            this.refresh({ date: this.currentWeek });
        }
    };

    getDescription(room: ExamRoom): string {
        const status = room.statusComment ? ': ' + room.statusComment : '';
        return this.translate.instant('sitnet_room_out_of_service') + status;
    }

    outOfServiceGate = (room: ExamRoom, text: string) => (room.outOfService ? text : undefined);

    private getTitle(slot: AvailableSlot): string {
        const start = format(this.adjust(slot.start, this.selectedRoom?.localTimezone as string), 'HH:mm');
        const end = format(this.adjust(slot.end, this.selectedRoom?.localTimezone as string), 'HH:mm');
        if (slot.availableMachines > 0) {
            return `${start}-${end} ${this.translate.instant('sitnet_slot_available')} (${slot.availableMachines})`;
        } else {
            return slot.conflictingExam
                ? this.translate.instant('sitnet_own_reservation')
                : this.translate.instant('sitnet_reserved');
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
        return this.Calendar.listSlots$(this.isExternal, this.isCollaborative, room, this.uiRouter.params.id, params);
    }

    private adjust = (date: string, tz: string): Date => {
        const adjusted = zonedTimeToUtc(date, tz);
        const offset = this.DateTime.isDST(adjusted) ? -1 : 0;
        return addHours(adjusted, offset);
    };
}
