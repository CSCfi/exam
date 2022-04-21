import { WeekDay } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
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
import type { Organisation } from '../calendar.component';
import type { Slot } from '../calendar.service';
import { CalendarService } from '../calendar.service';

type FilterableAccessibility = Accessibility & { filtered: boolean };
type FilterableRoom = ExamRoom & { filtered: boolean };
type AvailableSlot = Slot & { availableMachines: number };

@Component({
    selector: 'xm-calendar-slot-picker',
    template: `<div class="row student-enrolment-wrapper details-view" [ngClass]="selectedRoom ? '' : 'notactive'">
        <div class="col-md-12">
            <div class="row">
                <span class="col-md-11 col-9">
                    <span class="calendar-phase-title">
                        {{ sequenceNumber }}. {{ 'sitnet_calendar_phase_2' | translate }}
                        <small class="col-12 pl-0">
                            <button
                                class="btn btn-sm btn-outline-dark"
                                (click)="makeExternalReservation()"
                                *ngIf="isInteroperable && !isExternal"
                            >
                                {{ 'sitnet_external_reservation' | translate }}&nbsp;
                            </button>
                        </small>
                    </span>
                </span>
                <span class="col-md-1 col-3">
                    <span class="calendar-phase-icon float-right" *ngIf="selectedRoom">
                        <img class="arrow_icon" src="/assets/images/icon-phase.png" alt="choose room" />
                    </span>
                </span>
            </div>
            <div class="row mt-2 mb-2">
                <!-- todo: make this a component -->
                <div class="col-md-12 mart10 marb20" [hidden]="isExternal">
                    <div class="row">
                        <span class="col-md-12">
                            <button
                                class="infolink pointer border rounded"
                                *ngIf="!disabled"
                                tabindex="0"
                                (click)="showAccessibilityMenu = !showAccessibilityMenu"
                            >
                                {{ 'sitnet_calendar_room_accessibility_info' | translate }}
                                <img
                                    class="arrow_icon"
                                    *ngIf="!showAccessibilityMenu"
                                    alt="show accessibility selection"
                                    src="/assets/images/arrow_right.png"
                                />
                                <img
                                    class="arrow_icon"
                                    *ngIf="showAccessibilityMenu"
                                    alt="hide accessibility selection"
                                    src="/assets/images/arrow_down.png"
                                />
                            </button>
                            <span *ngIf="disabled" class="text text-muted">
                                {{ 'sitnet_calendar_room_accessibility_info' | translate }}
                            </span>
                            <div class="row" [hidden]="!showAccessibilityMenu">
                                <div class="col-md-12">
                                    <div class="calendar-accs-title">
                                        {{ 'sitnet_exam_room_accessibility' | translate }}
                                    </div>
                                </div>
                            </div>
                            <div class="row" [hidden]="!showAccessibilityMenu">
                                <div class="col-md-12 calendar-accs-checkboxes">
                                    <span class="marr10 accs-list" *ngFor="let accessibility of accessibilities">
                                        <input
                                            aria-label="search for accessibility criteria"
                                            type="checkbox"
                                            role="presentation"
                                            (click)="selectAccessibility(accessibility)"
                                            value="{{ accessibility.name | slice: 0:30 }}"
                                        />
                                        {{ accessibility.name | slice: 0:30 }}
                                    </span>
                                </div>
                            </div>
                        </span>
                    </div>
                </div>
            </div>
            <div class="row ml-1 mt-3">
                <div class="dropdown" ngbDropdown>
                    <button
                        ngbDropdownToggle
                        class="btn btn-outline-dark"
                        type="button"
                        id="dropDownMenu1"
                        aria-expanded="true"
                        [disabled]="(isExternal && !organisation) || disabled"
                    >
                        {{ 'sitnet_room' | translate }}
                        <span class="caret"></span>
                    </button>
                    <div ngbDropdownMenu role="menu" aria-labelledby="dropDownMenu1">
                        <button
                            ngbDropdownItem
                            *ngFor="let room of rooms"
                            role="presentation"
                            (click)="selectRoom(room)"
                            title="{{ room.name }}"
                        >
                            <div ngbDropdownItem [disabled]="room.outOfService" role="menuitem">
                                <a> {{ room.name }}</a>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
            <div class="row mart10" *ngIf="selectedRoom">
                <div class="col-md-12">
                    <xm-calendar-selected-room
                        [room]="selectedRoom"
                        [viewStart]="currentWeek"
                        [maintenancePeriods]="maintenancePeriods"
                    ></xm-calendar-selected-room>
                </div>
            </div>
            <div class="row mart10" *ngIf="selectedRoom">
                <div class="col-md-12">
                    <xm-booking-calendar
                        (eventSelected)="eventSelected($event)"
                        (moreEventsNeeded)="refresh($event)"
                        [minDate]="minDate"
                        [maxDate]="maxDate"
                        [room]="selectedRoom"
                        [visible]="selectedRoom !== undefined"
                        [events]="events"
                    >
                    </xm-booking-calendar>
                </div>
            </div>
        </div>
    </div>`,
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
        private http: HttpClient,
        private translate: TranslateService,
        private uiRouter: UIRouterGlobals,
        private toast: ToastrService,
        private Calendar: CalendarService,
        private DateTime: DateTimeService,
    ) {}

    ngOnInit() {
        this.http
            .get<Accessibility[]>('/app/accessibility')
            .subscribe((resp) => (this.accessibilities = resp.map((a) => ({ ...a, filtered: false }))));
        this.http.get<ExamRoom[]>('/app/rooms').subscribe((resp) => {
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
        if (this.isExternal && this.organisation) {
            const url = this.isCollaborative
                ? `/app/iop/exams/${this.uiRouter.params.id}/external/calendar/${room._id}`
                : `/app/iop/calendar/${this.uiRouter.params.id}/${room._id}`;
            return this.http.get<AvailableSlot[]>(url, {
                params: {
                    org: this.organisation._id,
                    date: date,
                },
            });
        } else {
            const url = this.isCollaborative
                ? `/app/iop/exams/${this.uiRouter.params.id}/calendar/${room.id}`
                : `/app/calendar/${this.uiRouter.params.id}/${room.id}`;
            const params = new HttpParams({
                fromObject: { day: date, aids: accessibilityIds.map((i) => i.toString()) },
            });
            return this.http.get<AvailableSlot[]>(url, {
                params: params,
            });
        }
    }

    private adjust = (date: string, tz: string): Date => {
        const adjusted = zonedTimeToUtc(date, tz);
        const offset = this.DateTime.isDST(adjusted) ? -1 : 0;
        return addHours(adjusted, offset);
    };

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

    /**
     * Tests if the selected room is out of service and returns given array (for rendering), If selected room is out of service it returns Undefined.
     * @param room
     * @param text
     */
    outOfServiceGate(room: ExamRoom, text: string) {
        if (room.outOfService) {
            return text;
        }
        return undefined;
    }
}
