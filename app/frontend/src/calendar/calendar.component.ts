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
import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateParams } from '@uirouter/core';
import { CalendarEvent } from 'calendar-utils';
import * as moment from 'moment';
import { Observable, Subject } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import { Exam, ExamSection } from '../exam/exam.model';
import { Accessibility, ExamRoom, ExceptionWorkingHours } from '../reservation/reservation.model';
import { SessionService } from '../session/session.service';
import { DateTimeService } from '../utility/date/date.service';
import { ConfirmationDialogService } from '../utility/dialogs/confirmationDialog.service';
import { SlotMeta } from './bookingCalendar.component';
import { CalendarService, OpeningHours, Slot } from './calendar.service';

type SelectableSection = ExamSection & { selected: boolean };
type ExamInfo = {
    examActiveStartDate: number;
    examActiveEndDate: number;
    examSections: SelectableSection[];
};
type AvailableSlot = Slot & { availableMachines: number };
type FilteredAccessibility = Accessibility & { filtered: boolean };
type FilteredRoom = ExamRoom & { filtered: boolean };
type ReservationInfo = {
    id: number;
    optionalSections: ExamSection[];
};
type Organisation = {
    _id: string;
    name: string;
    filtered: boolean;
};

@Component({
    selector: 'calendar',
    template: require('./calendar.component.html'),
})
export class CalendarComponent implements OnInit, OnDestroy {
    @Input() isExternal: boolean;
    @Input() isCollaborative: boolean;

    accessibilities: FilteredAccessibility[] = [];
    isInteroperable: boolean;
    confirming = false;
    examInfo: ExamInfo = { examActiveStartDate: 0, examActiveEndDate: 0, examSections: [] };
    limitations = {};
    openingHours: OpeningHours[];
    organisations: Organisation[];
    reservation: { room: string; start: moment.Moment; end: moment.Moment; time: string };
    rooms: FilteredRoom[] = [];
    exceptionHours: ExceptionWorkingHours[] = [];
    loader = {
        loading: false,
    };
    minDate: moment.Moment;
    maxDate: moment.Moment;
    minHours: number;
    maxHours: number;
    reservationWindowEndDate: moment.Moment;
    reservationWindowSize: number;
    selectedRoom: FilteredRoom;
    selectedOrganisation: Organisation;
    calendarVisible: boolean;

    events: CalendarEvent<SlotMeta>[];

    private ngUnsubscribe = new Subject();

    constructor(
        private http: HttpClient,
        private location: Location,
        private translate: TranslateService,
        @Inject('$stateParams') private stateParams: StateParams,
        private DateTime: DateTimeService,
        private Dialog: ConfirmationDialogService,
        private Calendar: CalendarService,
        private Session: SessionService,
    ) {}

    private fetchOrganisations = () => {
        // TODO: allow making external reservations to collaborative exams in the future
        if (this.isInteroperable && this.isExternal && !this.isCollaborative) {
            this.http
                .get<any[]>('/integration/iop/organisations')
                .subscribe(
                    resp => (this.organisations = resp.filter(org => !org.homeOrg && org.facilities.length > 0)),
                );
        }
    };

    private prepareOptionalSections = (data: ReservationInfo | null) => {
        if (data && data.optionalSections) {
            this.examInfo.examSections
                .filter(es => es.optional)
                .forEach(es => (es.selected = data.optionalSections.map(es => es.id).indexOf(es.id) > -1));
        }
    };

    ngOnInit() {
        this.Session.languageChange$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
            const optionalRoom = this.selectedRoom;
            if (optionalRoom !== undefined) {
                this.openingHours = this.Calendar.processOpeningHours(optionalRoom);
            }
        });

        const url = this.isCollaborative
            ? `/integration/iop/exams/${this.stateParams.id}/info`
            : `/app/student/exam/${this.stateParams.id}/info`;
        this.http
            .get<ExamInfo>(url)
            .pipe(
                tap(resp => (this.examInfo = resp)),
                switchMap(() => this.http.get<{ value: number }>('/app/settings/reservationWindow')),
                tap(resp => {
                    this.reservationWindowSize = resp.value;
                    this.reservationWindowEndDate = moment().add(resp.value, 'days');
                    this.minDate = moment.max(moment(), moment(this.examInfo.examActiveStartDate));
                    this.maxDate = moment.min(this.reservationWindowEndDate, moment(this.examInfo.examActiveEndDate));
                }),
                switchMap(() => this.http.get<Accessibility[]>('/app/accessibility')),
                tap(resp => (this.accessibilities = resp.map(a => ({ ...a, filtered: false })))),
                switchMap(() => this.http.get<ExamRoom[]>('/app/rooms')),
                tap(resp => (this.rooms = resp.map(r => ({ ...r, filtered: false })))),
                switchMap(() => this.http.get<{ isExamVisitSupported: boolean }>('/app/settings/iop/examVisit')),
                tap(resp => (this.isInteroperable = resp.isExamVisitSupported)),
                tap(() => this.fetchOrganisations()),
                switchMap(() =>
                    this.http.get<ReservationInfo | null>(`/app/calendar/enrolment/${this.stateParams.id}/reservation`),
                ),
                tap((resp: ReservationInfo | null) => this.prepareOptionalSections(resp)),
            )
            .subscribe();
    }

    hasOptionalSections = (): boolean => this.examInfo.examSections.some(es => es.optional);

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
        const room: ExamRoom = optionalRoom;
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
        ).result.then(() => this.location.go('/iop/calendar/' + this.stateParams.id));
    }

    makeInternalReservation() {
        this.location.go('/calendar/' + this.stateParams.id);
    }

    private adjust(date: string, tz: string): Date {
        const adjusted: moment.Moment = moment.tz(date, tz);
        const offset = adjusted.isDST() ? -1 : 0;
        return adjusted.add(offset, 'hour').toDate();
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

    /*private getColor(slot: AvailableSlot) {
        if (slot.availableMachines < 0) {
            return '#92c3e4'; // blueish
        } else if (slot.availableMachines > 0) {
            return '#A6E9B2'; // light green
        } else {
            return '#D8D8D8'; // grey
        }
    }*/

    private query(date: string, room: ExamRoom, accessibilityIds: number[]): Observable<AvailableSlot[]> {
        if (this.isExternal) {
            return this.http.get<AvailableSlot[]>(`/integration/iop/calendar/${this.stateParams.id}/${room._id}`, {
                params: {
                    org: this.selectedOrganisation._id,
                    date: date,
                },
            });
        } else {
            const url = this.isCollaborative
                ? `/integration/iop/exams/${this.stateParams.id}/calendar/${room.id}`
                : `/app/calendar/${this.stateParams.id}/${room.id}`;
            return this.http.get<AvailableSlot[]>(url, {
                params: {
                    day: date,
                    aids: accessibilityIds.join(','),
                },
            });
        }
    }

    hide() {
        this.calendarVisible = false;
    }

    render() {
        this.calendarVisible = true;
    }

    renderExceptionHours = ($event: { start: Date; end: Date }) =>
        (this.exceptionHours =
            !$event.start || !$event.end
                ? []
                : this.Calendar.getExceptionHours(this.selectedRoom, moment($event.start), moment($event.end)));

    refresh($event: { date: Date }) {
        const room = this.selectedRoom;
        if (!room) {
            return;
        }
        const date = $event.date;
        const accessibilities = this.accessibilities.filter(i => i.filtered).map(i => i.id);
        this.loader.loading = true;
        const tz = room.localTimezone;

        const successFn = (resp: AvailableSlot[]) => {
            const events: CalendarEvent<SlotMeta>[] = resp.map((slot: AvailableSlot, i) => ({
                id: i,
                title: this.getTitle(slot),
                start: this.adjust(slot.start, tz),
                end: this.adjust(slot.end, tz),
                meta: { availableMachines: slot.availableMachines },
            }));
            this.loader.loading = false;
            this.events = events;
            this.render();
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
        this.query(moment(date).format('YYYY-MM-DD'), room, accessibilities).subscribe(successFn, errorFn);
    }

    selectRoom(room: FilteredRoom) {
        if (!room.outOfService) {
            this.rooms.forEach(r => (r.filtered = false));
            room.filtered = true;
            this.selectedRoom = room;
            delete this.reservation;
            this.openingHours = this.Calendar.processOpeningHours(room);
            this.refresh({ date: new Date() });
        }
    }

    createReservation($event: { start: Date; end: Date }) {
        const room = this.selectedRoom;
        if (room !== undefined) {
            this.reservation = {
                room: room.name,
                time: moment($event.start).format('DD.MM.YYYY HH:mm') + ' - ' + moment($event.end).format('HH:mm'),
                start: moment($event.start),
                end: moment($event.end),
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
            .subscribe(
                () => this.location.go('/'),
                resp => {
                    toast.error(resp.error);
                },
            )
            .add(() => (this.confirming = false));
    }

    setOrganisation(org: { _id: string; name: string; facilities: FilteredRoom[]; filtered: boolean }) {
        this.organisations.forEach(o => (o.filtered = false));
        org.filtered = true;
        this.selectedOrganisation = org;
        delete this.selectedRoom;
        this.rooms = org.facilities;
        this.hide();
    }

    selectAccessibility(accessibility: FilteredAccessibility) {
        accessibility.filtered = !accessibility.filtered;
        if (this.selectedRoom) {
            // this.bc.bookingCalendar.getApi().refetchEvents();
        }
    }

    getDescription(room: ExamRoom): string {
        if (room.outOfService) {
            const status = room.statusComment ? ': ' + room.statusComment : '';
            return this.translate.instant('sitnet_room_out_of_service') + status;
        }
        return room.name;
    }

    printExamDuration(exam: Exam) {
        return this.DateTime.printExamDuration(exam);
    }
}
