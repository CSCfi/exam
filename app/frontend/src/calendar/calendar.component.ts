/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

import * as moment from 'moment';
import * as toast from 'toastr';
import { DateTimeService } from '../utility/date/date.service';
import { CalendarService, Room, Slot } from './calendar.service';
import { Component, OnInit, Input, Inject, OnDestroy, ViewChild } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Subject, forkJoin } from 'rxjs';
import { SessionService } from '../session/session.service';
import { takeUntil, tap, switchMap } from 'rxjs/operators';
import { Location } from '@angular/common';
import { BookingCalendarComponent } from './bookingCalendar.component';

interface ExamInfo {
    examActiveStartDate: number;
    examActiveEndDate: number;
    course: { name: string, code: string };
}

interface AvailableSlot extends Slot {
    availableMachines: number;
}

interface Accessibility {
    id: number;
    name: string;
    filtered: boolean;
}

interface FilteredRoom extends Room {
    filtered: boolean;
}

@Component({
    selector: 'calendar',
    template: require('./calendar.component.html')
})
export class CalendarComponent implements OnInit, OnDestroy {
    @Input() isExternal: boolean;
    @Input() isCollaborative: boolean;

    @ViewChild('bc') bc: BookingCalendarComponent;

    accessibilities: Accessibility[] = [];
    isInteroperable: boolean;
    confirming = false;
    examInfo: ExamInfo = { examActiveStartDate: 0, examActiveEndDate: 0, course: { code: '', name: '' } };
    limitations = {};
    openingHours: any[];
    organisations: any[];
    reservation: { room: string, start: moment.Moment, end: moment.Moment, time: string };
    rooms: FilteredRoom[] = [];
    exceptionHours: any[] = [];
    loader = {
        loading: false
    };
    minDate: moment.Moment;
    maxDate: moment.Moment;
    reservationWindowEndDate: moment.Moment;
    reservationWindowSize: number;
    selectedRoom: FilteredRoom | undefined;
    selectedOrganisation: { _id: string, name: string, filtered: boolean };

    private ngUnsubscribe = new Subject();

    constructor(
        private http: HttpClient,
        private location: Location,
        private translate: TranslateService,
        @Inject('$routeParams') private RouteParams: any,
        private DateTime: DateTimeService,
        private Calendar: CalendarService,
        private Session: SessionService
        // private uiCalendarConfig: any
    ) { }

    ngOnInit() {
        this.Session.languageChange$.pipe(
            takeUntil(this.ngUnsubscribe))
            .subscribe(() => {
                const optionalRoom = this.selectedRoom;
                if (optionalRoom !== undefined) {
                    this.openingHours = this.Calendar.processOpeningHours(optionalRoom);
                }
            });

        const url = this.isCollaborative ?
            `/integration/iop/exams/${this.RouteParams.id}/info` :
            `/app/student/exam/${this.RouteParams.id}/info`;
        this.http.get<ExamInfo>(url).pipe(
            tap(resp => this.examInfo = resp),
            switchMap(r => this.http.get<{ value: number }>('/app/settings/reservationWindow')),
            tap(resp => {
                this.reservationWindowSize = resp.value;
                this.reservationWindowEndDate = moment().add(resp.value, 'days');
                this.minDate = moment.max(moment(),
                    moment(this.examInfo.examActiveStartDate));
                this.maxDate = moment.min(this.reservationWindowEndDate,
                    moment(this.examInfo.examActiveEndDate));
            }),
            tap(() => {
                forkJoin(
                    this.http.get<Accessibility[]>('/app/accessibility'),
                    this.http.get<Room[]>('/app/rooms'),
                    this.http.get<{ isInteroperable: boolean }>('/app/settings/iop')
                ).subscribe(
                    resp => {
                        this.accessibilities = resp[0];
                        this.rooms = resp[1].map(r => Object.assign(r, { filtered: false }));
                        this.isInteroperable = resp[2].isInteroperable;
                        // TODO: allow making external reservations to collaborative exams in the future
                        if (this.isInteroperable && this.isExternal && !this.isCollaborative) {
                            this.http.get<any[]>('/integration/iop/organisations').subscribe(resp => {
                                this.organisations = resp.filter(org => !org.homeOrg);
                            });
                        }
                    }
                );
            })
        ).subscribe();
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    showReservationWindowInfo(): boolean {
        return moment(this.examInfo.examActiveEndDate) > this.reservationWindowEndDate;
    }

    getReservationWindowDescription(): string {
        const text = this.translate.instant('sitnet_description_reservation_window')
            .replace('{}', this.reservationWindowSize.toString());
        return `${text} ( ${this.reservationWindowEndDate.format('DD.MM.YYYY')} )`;
    }

    selectedAccessibilities() {
        return this.accessibilities.filter(a => a.filtered);
    }

    getRoomInstructions(): string | undefined {
        const optionalRoom = this.selectedRoom;
        if (optionalRoom == undefined) {
            return;
        }
        const room: Room = optionalRoom;
        let info;
        switch (this.translate.currentLang) {
            case 'fi':
                info = room.roomInstruction;
                break;
            case 'sv':
                info = room.roomInstructionSV;
                break;
            case 'en':
            /* falls through */
            default:
                info = room.roomInstructionEN;
                break;
        }
        return info;
    }

    getRoomAccessibility(): string {
        const room = this.selectedRoom;
        return room ? room.accessibilities.map(a => a.name).join(', ') : '';
    }

    makeExternalReservation() {
        this.location.go('/iop/calendar/' + this.RouteParams.id);
    }

    makeInternalReservation() {
        this.location.go('/calendar/' + this.RouteParams.id);
    }

    private adjust(date, tz): string {
        let adjusted: moment.Moment = moment.tz(date, tz);
        const offset = adjusted.isDST() ? -1 : 0;
        return adjusted.add(offset, 'hour').format();
    }

    private getTitle(slot: AvailableSlot): string {
        if (slot.availableMachines > 0) {
            return `${this.translate.instant('sitnet_slot_available')} (${slot.availableMachines})`;
        } else {
            return slot.conflictingExam ?
                this.translate.instant('sitnet_own_reservation') :
                this.translate.instant('sitnet_reserved');
        }
    }

    private getColor(slot: AvailableSlot) {
        if (slot.availableMachines < 0) {
            return '#92c3e4'; // blueish
        } else if (slot.availableMachines > 0) {
            return '#A6E9B2'; // light green
        } else {
            return '#D8D8D8'; // grey
        }
    }

    private query(success: (_: AvailableSlot[]) => void,
        error: (_: HttpErrorResponse) => void, date: string, room: Room, accessibility) {

        if (this.isExternal) {
            this.http.get<AvailableSlot[]>(`/integration/iop/calendar/${this.RouteParams.id}/${room._id}`, {
                params: {
                    org: this.selectedOrganisation._id,
                    date: date
                }
            }).subscribe(success, error);
        } else {
            const url = this.isCollaborative ?
                `/integration/iop/exams/${this.RouteParams.id}/calendar/${room.id}` :
                `/app/calendar/${this.RouteParams.id}/${room.id}`;
            this.http.get(url, {
                params: {
                    day: date,
                    aids: accessibility
                }
            }).subscribe(success, error);
        }
    }

    hide() { // TBD
        $('#calendarBlock').css({ display: 'none' });
    }

    render() { // TBD
        $('#calendarBlock').css({ display: 'block' });
        $('#calendar').css({ position: 'relative', visibility: 'visible', display: 'block' });
        this.bc.render();
    }

    refresh($event: any) {
        const room = this.selectedRoom;
        if (!room) {
            // callback([]);
            return;
        }
        const date = $event.start.format();
        const accessibilities = this.accessibilities.filter(i => i.filtered).map(i => i.id);
        this.loader.loading = true;
        const tz = room.localTimezone;
        const successFn = (resp: AvailableSlot[]) => {
            const events = resp.map(slot => {
                return {
                    title: this.getTitle(slot),
                    color: this.getColor(slot),
                    start: this.adjust(slot.start, tz),
                    end: this.adjust(slot.end, tz),
                    availableMachines: slot.availableMachines
                };
            });
            $event.callback(events);
            this.loader.loading = false;
        };
        const errorFn = (resp: HttpErrorResponse) => {
            this.loader.loading = false;
            if (resp.status === 404) {
                toast.error(this.translate.instant('sitnet_exam_not_active_now'));
            } else if (resp.error) {
                toast.error(resp.error);
            } else {
                toast.error(this.translate.instant('sitnet_no_suitable_enrolment_found'));
            }
        };
        this.query(successFn, errorFn, date, room, accessibilities);
        const view = this.bc.bookingCalendar.fullCalendar('getView');
        this.exceptionHours = (view.start === undefined || view.end === undefined)
            ? [] : this.Calendar.getExceptionHours(room, moment(view.start), moment(view.end));
    }

    private listExternalRooms() {
        if (this.selectedOrganisation) {
            this.http.get<FilteredRoom[]>('/integration/iop/facilities', {
                params: {
                    org: this.selectedOrganisation._id
                }
            }).subscribe(resp => this.rooms = resp);
        }
    }

    createReservation(start: moment.Moment, end: moment.Moment) {
        const room = this.selectedRoom;
        if (room !== undefined) {
            this.reservation = {
                room: room.name,
                time: start.format('DD.MM.YYYY HH:mm') + ' - ' + end.format('HH:mm'),
                start: start,
                end: end
            };
        }
    }

    confirmReservation() {
        const room = this.selectedRoom;
        if (!room || !this.reservation || this.confirming) {
            return;
        }
        this.confirming = true;
        this.Calendar.reserve$(
            this.reservation.start,
            this.reservation.end,
            room,
            this.accessibilities,
            { _id: this.selectedOrganisation ? this.selectedOrganisation._id : null },
            this.isCollaborative
        ).subscribe(
            () => {
                this.confirming = false;
                this.location.go('/');
            },
            resp => toast.error(resp.error)
        );
    }

    setOrganisation(org: { _id: string, name: string, filtered: boolean }) {
        this.organisations.forEach(o => o.filtered = false);
        org.filtered = true;
        this.selectedOrganisation = org;
        this.selectedRoom = undefined;
        this.listExternalRooms();
        this.hide();
    }

    selectAccessibility(accessibility) {
        accessibility.filtered = !accessibility.filtered;
        if (this.selectedRoom) {
            this.bc.bookingCalendar.fullCalendar('refetchEvents');
        }
    }

    getDescription(room: Room): string {
        if (room.outOfService) {
            const status = room.statusComment ? ': ' + room.statusComment : '';
            return this.translate.instant('sitnet_room_out_of_service') + status;
        }
        return room.name;
    }

    printExamDuration(exam) {
        return this.DateTime.printExamDuration(exam);
    }

    selectRoom(room: FilteredRoom) {
        if (!room.outOfService) {
            this.rooms.forEach(r => r.filtered = false);
            room.filtered = true;
            this.selectedRoom = room;
            delete this.reservation;
            this.openingHours = this.Calendar.processOpeningHours(room);
            this.render();
        }
    }
}

