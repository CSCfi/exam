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
/// <reference types="angular-dialog-service" />
import { Location } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateParams } from '@uirouter/core';
import * as moment from 'moment';
import { forkJoin, Subject } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import { ExamSection } from '../exam/exam.model';
import { SessionService } from '../session/session.service';
import { DateTimeService } from '../utility/date/date.service';
import { ConfirmationDialogService } from '../utility/dialogs/confirmationDialog.service';
import { BookingCalendarComponent } from './bookingCalendar.component';
import { CalendarService, Room, Slot } from './calendar.service';

interface SelectableSection extends ExamSection {
    selected: boolean;
}

interface ExamInfo {
    examActiveStartDate: number;
    examActiveEndDate: number;
    examSections: SelectableSection[];
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

interface ReservationInfo {
    id: number;
    optionalSections: ExamSection[];
}

@Component({
    selector: 'calendar',
    template: require('./calendar.component.html'),
})
export class CalendarComponent implements OnInit, OnDestroy {
    @Input() isExternal: boolean;
    @Input() isCollaborative: boolean;

    @ViewChild('bc') bc: BookingCalendarComponent;

    accessibilities: Accessibility[] = [];
    isInteroperable: boolean;
    confirming = false;
    examInfo: ExamInfo = { examActiveStartDate: 0, examActiveEndDate: 0, examSections: [] };
    limitations = {};
    openingHours: any[];
    organisations: any[];
    reservation: { room: string; start: moment.Moment; end: moment.Moment; time: string };
    rooms: FilteredRoom[] = [];
    exceptionHours: any[] = [];
    loader = {
        loading: false,
    };
    minDate: moment.Moment;
    maxDate: moment.Moment;
    reservationWindowEndDate: moment.Moment;
    reservationWindowSize: number;
    selectedRoom: FilteredRoom | undefined;
    selectedOrganisation: { _id: string; name: string; filtered: boolean };

    private ngUnsubscribe = new Subject();

    constructor(
        private http: HttpClient,
        private location: Location,
        private translate: TranslateService,
        @Inject('$stateParams') private StateParams: StateParams,
        private DateTime: DateTimeService,
        private Dialog: ConfirmationDialogService,
        private Calendar: CalendarService,
        private Session: SessionService, // private uiCalendarConfig: any
    ) {}

    ngOnInit() {
        this.Session.languageChange$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
            const optionalRoom = this.selectedRoom;
            if (optionalRoom !== undefined) {
                this.openingHours = this.Calendar.processOpeningHours(optionalRoom);
            }
        });

        const url = this.isCollaborative
            ? `/integration/iop/exams/${this.StateParams.id}/info`
            : `/app/student/exam/${this.StateParams.id}/info`;
        this.http
            .get<ExamInfo>(url)
            .pipe(
                tap(resp => (this.examInfo = resp)),
                switchMap(r => this.http.get<{ value: number }>('/app/settings/reservationWindow')),
                tap(resp => {
                    this.reservationWindowSize = resp.value;
                    this.reservationWindowEndDate = moment().add(resp.value, 'days');
                    this.minDate = moment.max(moment(), moment(this.examInfo.examActiveStartDate));
                    this.maxDate = moment.min(this.reservationWindowEndDate, moment(this.examInfo.examActiveEndDate));
                }),
                tap(() => {
                    forkJoin(
                        this.http.get<Accessibility[]>('/app/accessibility'),
                        this.http.get<Room[]>('/app/rooms'),
                        this.http.get<{ isExamVisitSupported: boolean }>('/app/settings/iop'),
                        this.http.get<ReservationInfo>(`/app/calendar/enrolment/${this.StateParams.id}/reservation`),
                    ).subscribe(resp => {
                        this.accessibilities = resp[0];
                        this.rooms = resp[1].map(r => Object.assign(r, { filtered: false }));
                        this.isInteroperable = resp[2].isExamVisitSupported;
                        // TODO: allow making external reservations to collaborative exams in the future
                        if (this.isInteroperable && this.isExternal && !this.isCollaborative) {
                            this.http
                                .get<any[]>('/integration/iop/organisations')
                                .subscribe(
                                    resp =>
                                        (this.organisations = resp.filter(
                                            org => !org.homeOrg && org.facilities.length > 0,
                                        )),
                                );
                        }
                        if (resp[3].optionalSections) {
                            this.examInfo.examSections
                                .filter(es => es.optional)
                                .forEach(
                                    es => (es.selected = resp[3].optionalSections.map(es => es.id).indexOf(es.id) > -1),
                                );
                        }
                    });
                }),
            )
            .subscribe();
    }

    hasOptionalSections(): boolean {
        return this.examInfo.examSections.some(es => es.optional);
    }

    getSequenceNumber(area: string): number {
        const hasOptionalSections = this.hasOptionalSections();
        switch (area) {
            case 'info':
                return 1;
            case 'material':
                return 2;
            case 'organization':
                return hasOptionalSections ? 3 : 2;
            case 'room':
                if (this.isExternal && hasOptionalSections) {
                    return 4;
                } else if (this.isExternal || hasOptionalSections) {
                    return 3;
                } else {
                    return 2;
                }
            case 'confirmation':
                if (this.isExternal && hasOptionalSections) {
                    return 5;
                } else if (this.isExternal || hasOptionalSections) {
                    return 4;
                } else {
                    return 3;
                }
        }
        return 0;
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    showReservationWindowInfo(): boolean {
        return moment(this.examInfo.examActiveEndDate) > this.reservationWindowEndDate;
    }

    getReservationWindowDescription(): string {
        const text = this.translate
            .instant('sitnet_description_reservation_window')
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
        return room && room.accessibilities ? room.accessibilities.map(a => a.name).join(', ') : '';
    }

    makeExternalReservation() {
        this.Dialog.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_confirm_external_reservation'),
        ).result.then(() => this.location.go('/iop/calendar/' + this.StateParams.id));
    }

    makeInternalReservation() {
        this.location.go('/calendar/' + this.StateParams.id);
    }

    private adjust(date, tz): string {
        const adjusted: moment.Moment = moment.tz(date, tz);
        const offset = adjusted.isDST() ? -1 : 0;
        return adjusted.add(offset, 'hour').format();
    }

    private getTitle(slot: AvailableSlot): string {
        if (slot.availableMachines > 0) {
            return `${this.translate.instant('sitnet_slot_available')} (${slot.availableMachines})`;
        } else {
            return slot.conflictingExam
                ? this.translate.instant('sitnet_own_reservation')
                : this.translate.instant('sitnet_reserved');
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

    private query(
        success: (_: AvailableSlot[]) => void,
        error: (_: HttpErrorResponse) => void,
        date: string,
        room: Room,
        accessibility,
    ) {
        if (this.isExternal) {
            this.http
                .get<AvailableSlot[]>(`/integration/iop/calendar/${this.StateParams.id}/${room._id}`, {
                    params: {
                        org: this.selectedOrganisation._id,
                        date: date,
                    },
                })
                .subscribe(success, error);
        } else {
            const url = this.isCollaborative
                ? `/integration/iop/exams/${this.StateParams.id}/calendar/${room.id}`
                : `/app/calendar/${this.StateParams.id}/${room.id}`;
            this.http
                .get(url, {
                    params: {
                        day: date,
                        aids: accessibility,
                    },
                })
                .subscribe(success, error);
        }
    }

    hide() {
        // TBD
        $('#calendarBlock').css({ display: 'none' });
    }

    render() {
        // TBD
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
                    availableMachines: slot.availableMachines,
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
        this.exceptionHours =
            view.start === undefined || view.end === undefined
                ? []
                : this.Calendar.getExceptionHours(room, moment(view.start), moment(view.end));
    }

    createReservation(start: moment.Moment, end: moment.Moment) {
        const room = this.selectedRoom;
        if (room !== undefined) {
            this.reservation = {
                room: room.name,
                time: start.format('DD.MM.YYYY HH:mm') + ' - ' + end.format('HH:mm'),
                start: start,
                end: end,
            };
        }
    }

    checkSectionSelections = () => {
        if (!this.sectionSelectionOk()) {
            delete this.selectedOrganisation;
            delete this.selectedRoom;
            delete this.reservation;
            this.render();
        }
    };

    sectionSelectionOk = () => this.examInfo.examSections.some(es => !es.optional || es.selected);

    confirmReservation() {
        const room = this.selectedRoom;
        if (!room || !this.reservation || this.confirming) {
            return;
        }
        const selectedSectionIds = this.examInfo.examSections.filter(es => es.selected).map(es => es.id);
        if (!this.sectionSelectionOk()) {
            toast.error(this.translate.instant('sitnet_select_at_least_one_section'));
            return;
        }
        this.confirming = true;
        this.Calendar.reserve$(
            this.reservation.start,
            this.reservation.end,
            room,
            this.accessibilities,
            { _id: this.selectedOrganisation ? this.selectedOrganisation._id : null },
            this.isCollaborative,
            selectedSectionIds,
        )
            .subscribe(() => this.location.go('/'), resp => toast.error(resp.error))
            .add(() => (this.confirming = false));
    }

    setOrganisation(org: { _id: string; name: string; facilities: FilteredRoom[]; filtered: boolean }) {
        this.organisations.forEach(o => (o.filtered = false));
        org.filtered = true;
        this.selectedOrganisation = org;
        this.selectedRoom = undefined;
        this.rooms = org.facilities;
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
            this.rooms.forEach(r => (r.filtered = false));
            room.filtered = true;
            this.selectedRoom = room;
            delete this.reservation;
            this.openingHours = this.Calendar.processOpeningHours(room);
            this.render();
        }
    }
}
