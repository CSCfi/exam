import { WeekDay } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import type { SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EventApi, EventInput } from '@fullcalendar/angular';
import { TranslateService } from '@ngx-translate/core';
import { format, startOfWeek } from 'date-fns';
import * as moment from 'moment-timezone';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { MaintenancePeriod } from '../../exam/exam.model';
import type { Accessibility, ExamRoom } from '../../reservation/reservation.model';
import { DateTimeService } from '../../shared/date/date.service';
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
        start: string;
        end: string;
        room: ExamRoom;
        accessibilities: Accessibility[];
    }>();

    rooms: FilterableRoom[] = [];
    maintenancePeriods: MaintenancePeriod[] = [];
    selectedRoom?: ExamRoom;
    accessibilities: FilterableAccessibility[] = [];
    showAccessibilityMenu = false;
    currentWeek = new Date();
    examId = 0;

    constructor(
        private translate: TranslateService,
        private route: ActivatedRoute,
        private toast: ToastrService,
        private Calendar: CalendarService,
        private DateTime: DateTimeService,
    ) {}

    ngOnInit() {
        this.examId = Number(this.route.snapshot.paramMap.get('id'));
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

    eventSelected = ($event: EventApi) =>
        this.selected.emit({
            start: $event.startStr,
            end: $event.endStr,
            room: this.selectedRoom as ExamRoom,
            accessibilities: this.accessibilities.filter((i) => i.filtered),
        });

    refresh($event: { date: Date; success: (events: EventInput[]) => void }) {
        if (!this.selectedRoom) {
            return;
        }
        this.currentWeek = startOfWeek($event.date, { weekStartsOn: WeekDay.Monday });
        const accessibilities = this.accessibilities.filter((i) => i.filtered).map((i) => i.id);

        const getColor = (slot: AvailableSlot) => {
            if (slot.availableMachines < 0) {
                return '#92c3e4'; // blueish
            } else if (slot.availableMachines > 0) {
                return '#0d6efd';
            } else {
                return '#D8D8D8'; // grey
            }
        };

        const successFn = (resp: AvailableSlot[]) => {
            const events: EventInput[] = resp.map((slot: AvailableSlot, i) => ({
                id: i.toString(),
                title: this.getTitle(slot),
                start: this.adjust(slot.start, this.selectedRoom?.localTimezone as string),
                end: this.adjust(slot.end, this.selectedRoom?.localTimezone as string),
                color: getColor(slot),
                availableMachines: slot.availableMachines,
            }));
            $event.success(events);
        };
        const errorFn = (resp: string) => this.toast.error(resp);
        this.query(format($event.date, 'yyyy-MM-dd'), accessibilities).subscribe({ next: successFn, error: errorFn });
    }

    makeExternalReservation = () => {
        delete this.selectedRoom;
        this.cancelled.emit();
    };

    selectAccessibility = (accessibility: FilterableAccessibility) => {
        accessibility.filtered = !accessibility.filtered;
        this.accessibilities = [...this.accessibilities]; // copy to ignite change deteccttion
    };

    selectRoom = (room: FilterableRoom) => {
        if (!room.outOfService) {
            this.selectedRoom = room;
            this.rooms.forEach((r) => (r.filtered = false));
            room.filtered = true;
        }
    };

    getDescription(room: ExamRoom): string {
        const status = room.statusComment ? ': ' + room.statusComment : '';
        return this.translate.instant('sitnet_room_out_of_service') + status;
    }

    outOfServiceGate = (room: ExamRoom, text: string) => (room.outOfService ? text : undefined);

    private getTitle(slot: AvailableSlot): string {
        if (slot.availableMachines > 0) {
            return `${this.translate.instant('sitnet_slot_available')} (${slot.availableMachines})`;
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
        return this.Calendar.listSlots$(this.isExternal, this.isCollaborative, room, this.examId, params);
    }

    private adjust = (date: string, tz: string): Date => {
        const adjusted = moment.tz(date, tz);
        const offset = this.DateTime.isDST(adjusted.toDate()) ? -1 : 0;
        return adjusted.add(offset, 'hour').toDate();
    };
}
