import { WeekDay } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { UIRouterGlobals } from '@uirouter/core';
import { startOfWeek } from 'date-fns';
import * as moment from 'moment';
import * as toast from 'toastr';

import { Organisation } from '../calendar.component';

import type { SimpleChanges } from '@angular/core';
import type { Accessibility, ExamRoom } from '../../reservation/reservation.model';
import type { CalendarEvent } from 'angular-calendar';
import type { SlotMeta } from '../bookingCalendar.component';
import type { Slot } from '../calendar.service';
import type { Observable } from 'rxjs';

type FilterableAccessibility = Accessibility & { filtered: boolean };
type FilterableRoom = ExamRoom & { filtered: boolean };
type AvailableSlot = Slot & { availableMachines: number };

@Component({
    selector: 'calendar-slot-picker',
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
                        <img class="arrow_icon" src="/assets/assets/images/icon-phase.png" alt="choose room" />
                    </span>
                </span>
            </div>
            <div class="row mt-2 mb-2">
                <!-- todo: make this a component -->
                <div class="col-md-12" [hidden]="isExternal">
                    <div class="row">
                        <span class="col-md-12">
                            <a
                                class="infolink pointer"
                                *ngIf="!disabled"
                                tabindex="0"
                                (click)="showAccessibilityMenu = !showAccessibilityMenu"
                                (keyup.enter)="showAccessibilityMenu = !showAccessibilityMenu"
                            >
                                {{ 'sitnet_calendar_room_accessibility_info' | translate }}
                                <img
                                    class="arrow_icon"
                                    *ngIf="!showAccessibilityMenu"
                                    alt="show accessibility selection"
                                    src="/assets/assets/images/arrow_right.png"
                                />
                                <img
                                    class="arrow_icon"
                                    *ngIf="showAccessibilityMenu"
                                    alt="hide accessibility selection"
                                    src="/assets/assets/images/arrow_down.png"
                                />
                            </a>
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
                                    <span class="marr10" *ngFor="let accessibility of accessibilities">
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
            <div class="row mart10">
                <div class="col student-exam-row-title" ngbDropdown>
                    <button
                        ngbDropdownToggle
                        class="btn btn-outline-dark"
                        type="button"
                        id="dropDownMenu1"
                        [disabled]="(isExternal && !organisation) || disabled"
                    >
                        {{ 'sitnet_room' | translate }}&nbsp;
                        <span class="caret"></span>
                    </button>
                    <ul class="student-select-room" ngbDropdownMenu aria-labelledby="dropDownMenu1">
                        <li
                            ngbDropdownItem
                            *ngFor="let room of rooms"
                            [hidden]="room.filtered"
                            role="presentation"
                            [ngClass]="room.outOfService ? 'disabled' : ''"
                            (click)="selectRoom(room)"
                            tabindex="0"
                            (ngEnter)="selectRoom(room)"
                        >
                            <a
                                role="menuitem"
                                ngbPopover="{{ getDescription(room) }}"
                                popoverTitle="{{ 'sitnet_instructions' | translate }}"
                                container="body"
                                triggers="mouseenter:mouseleave"
                            >
                                {{ room.name | slice: 0:30 }}</a
                            >
                        </li>
                    </ul>
                </div>
            </div>
            <div class="row mart10" *ngIf="selectedRoom">
                <div class="col-md-12">
                    <calendar-selected-room [room]="selectedRoom" [viewStart]="currentWeek"></calendar-selected-room>
                </div>
            </div>
            <div class="row mart10" *ngIf="selectedRoom">
                <div class="col-md-12">
                    <booking-calendar
                        (onEventSelected)="eventSelected($event)"
                        (onNeedMoreEvents)="refresh($event)"
                        [minDate]="minDate"
                        [maxDate]="maxDate"
                        [room]="selectedRoom"
                        [visible]="selectedRoom !== undefined"
                        [events]="events"
                    >
                    </booking-calendar>
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
export class SlotPickerComponent {
    @Input() sequenceNumber: number;
    @Input() isInteroperable: boolean;
    @Input() isCollaborative: boolean;
    @Input() isExternal: boolean;
    @Input() organisation?: Organisation;
    @Input() disabled: boolean;
    @Input() minDate: Date;
    @Input() maxDate: Date;
    @Output() onCancel = new EventEmitter<void>();
    @Output() onEventSelected = new EventEmitter<{
        start: Date;
        end: Date;
        room: ExamRoom;
        accessibilities: Accessibility[];
    }>();

    rooms: FilterableRoom[] = [];
    selectedRoom?: ExamRoom;
    accessibilities: FilterableAccessibility[] = [];
    showAccessibilityMenu = false;
    currentWeek = new Date();
    events: CalendarEvent<SlotMeta>[] = [];

    constructor(private http: HttpClient, private translate: TranslateService, private uiRouter: UIRouterGlobals) {}

    ngOnInit() {
        this.http
            .get<Accessibility[]>('/app/accessibility')
            .subscribe((resp) => (this.accessibilities = resp.map((a) => ({ ...a, filtered: false }))));
        this.http.get<ExamRoom[]>('/app/rooms').subscribe((resp) => {
            const rooms = resp.map((r: ExamRoom) => ({ ...r, filtered: false })).filter((r) => r.name);
            this.rooms = rooms.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1));
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.organisation && this.organisation) {
            this.rooms = this.organisation.facilities.map((f) => ({ ...f, filtered: false }));
            delete this.selectedRoom;
        }
    }

    eventSelected = ($event: CalendarEvent<SlotMeta>) =>
        this.onEventSelected.emit({
            start: $event.start,
            end: $event.end as Date,
            room: this.selectedRoom as ExamRoom,
            accessibilities: [], // todo
        });

    private getTitle(slot: AvailableSlot): string {
        const start = moment(this.adjust(slot.start, this.selectedRoom?.localTimezone as string)).format('HH:mm');
        const end = moment(this.adjust(slot.end, this.selectedRoom?.localTimezone as string)).format('HH:mm');
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
                ? `/integration/iop/exams/${this.uiRouter.params.id}/external/calendar/${room._id}`
                : `/integration/iop/calendar/${this.uiRouter.params.id}/${room._id}`;
            return this.http.get<AvailableSlot[]>(url, {
                params: {
                    org: this.organisation._id,
                    date: date,
                },
            });
        } else {
            const url = this.isCollaborative
                ? `/integration/iop/exams/${this.uiRouter.params.id}/calendar/${room.id}`
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
        const adjusted: moment.Moment = moment.tz(date, tz);
        const offset = adjusted.isDST() ? -1 : 0;
        return adjusted.add(offset, 'hour').toDate();
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
        const errorFn = (resp: string) => toast.error(resp);
        this.query(moment($event.date).format('YYYY-MM-DD'), accessibilities).subscribe(successFn, errorFn);
    }

    makeExternalReservation = () => {
        delete this.selectedRoom;
        this.events = [];
        this.onCancel.emit();
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
        if (room.outOfService) {
            const status = room.statusComment ? ': ' + room.statusComment : '';
            return this.translate.instant('sitnet_room_out_of_service') + status;
        }
        return room.name;
    }
}
