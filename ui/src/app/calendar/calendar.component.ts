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
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService, UIRouterGlobals } from '@uirouter/core';
import { addDays, format } from 'date-fns';
import { isArray } from 'lodash';
import { ToastrService } from 'ngx-toastr';
import { switchMap, tap } from 'rxjs/operators';
import { ExamEnrolment } from '../enrolment/enrolment.model';
import type { Course, Exam, ExamSection } from '../exam/exam.model';
import type { Accessibility, ExamRoom } from '../reservation/reservation.model';
import { DateTimeService } from '../utility/date/date.service';
import { ConfirmationDialogService } from '../utility/dialogs/confirmationDialog.service';
import { CalendarService } from './calendar.service';
export type SelectableSection = ExamSection & { selected: boolean };
export type ExamInfo = Omit<Partial<Exam>, 'course' | 'examSections'> & { course: Course } & {
    duration: number;
    examSections: (ExamSection & { selected: boolean })[];
};
export type Organisation = {
    _id: string;
    name: string;
    code: string;
    filtered: boolean;
    homeOrg: string;
    facilities: ExamRoom[];
};

@Component({
    selector: 'calendar',
    templateUrl: './calendar.component.html',
})
export class CalendarComponent implements OnInit {
    @Input() isExternal = false;
    @Input() isCollaborative = false;

    isInteroperable = false;
    confirming = false;
    examInfo: ExamInfo = {
        examActiveStartDate: null,
        examActiveEndDate: null,
        name: '',
        duration: 0,
        anonymous: false,
        examSections: [],
        course: { code: '', name: '', id: 0, credits: 0 },
    };
    reservation?: {
        room: ExamRoom;
        start: Date;
        end: Date;
        time: string;
        accessibilities: Accessibility[];
    };
    minDate = new Date();
    maxDate = new Date();
    reservationWindowEndDate?: Date;
    reservationWindowSize = 0;
    selectedOrganisation?: Organisation;

    constructor(
        private http: HttpClient,
        private state: StateService,
        private uiRouter: UIRouterGlobals,
        private translate: TranslateService,
        private toast: ToastrService,
        private DateTime: DateTimeService,
        private Dialog: ConfirmationDialogService,
        private Calendar: CalendarService,
    ) {}

    private resolveOptionalSections = (): string[] => {
        if (!this.uiRouter.params.selected) return [];
        if (isArray(this.uiRouter.params.selected)) return this.uiRouter.params.selected;
        else return [this.uiRouter.params.selected];
    };

    private prepareOptionalSections = (data: ExamEnrolment | null) => {
        this.examInfo.examSections
            .filter((es) => es.optional)
            .forEach((es) => {
                es.selected =
                    (data && data.optionalSections.map((os) => os.id).indexOf(es.id) > -1) ||
                    this.resolveOptionalSections()
                        .map((p: string) => parseInt(p))
                        .indexOf(es.id) > -1;
            });
    };

    ngOnInit() {
        if (this.uiRouter.params.isCollaborative === 'true') {
            this.isCollaborative = true;
        }

        const url = this.isCollaborative
            ? `/app/iop/exams/${this.uiRouter.params.id}/info`
            : `/app/student/exam/${this.uiRouter.params.id}/info`;
        this.http
            .get<ExamInfo>(url)
            .pipe(
                tap((resp) => {
                    resp.examSections.sort((es1, es2) => es1.sequenceNumber - es2.sequenceNumber);
                    this.examInfo = resp;
                }),
                switchMap(() => this.http.get<{ value: number }>('/app/settings/reservationWindow')),
                tap((resp) => {
                    this.reservationWindowSize = resp.value;
                    this.reservationWindowEndDate = addDays(new Date(), resp.value);
                    this.minDate = [new Date(), new Date(this.examInfo.examActiveStartDate as string)].reduce((a, b) =>
                        a > b ? a : b,
                    );
                    this.maxDate = [
                        this.reservationWindowEndDate,
                        new Date(this.examInfo.examActiveEndDate as string),
                    ].reduce((a, b) => (a < b ? a : b));
                }),
                switchMap(() => this.http.get<{ isExamVisitSupported: boolean }>('/app/settings/iop/examVisit')),
                tap((resp) => (this.isInteroperable = resp.isExamVisitSupported)),
                switchMap(() =>
                    // TODO: move to section selector
                    this.http.get<ExamEnrolment | null>(`/app/calendar/enrolment/${this.uiRouter.params.id}/current`),
                ),
                tap((resp: ExamEnrolment | null) => this.prepareOptionalSections(resp)),
            )
            .subscribe();
    }

    hasOptionalSections = (): boolean => this.examInfo.examSections.some((es) => es.optional);

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

    makeExternalReservation() {
        this.Dialog.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_confirm_external_reservation'),
        ).result.then(() =>
            this.state.go('externalCalendar', {
                id: this.uiRouter.params.id,
                selected: this.examInfo.examSections.filter((es) => es.selected).map((es) => es.id),
                isCollaborative: this.isCollaborative,
            }),
        );
    }

    makeInternalReservation() {
        const nextState = this.isCollaborative ? 'collaborativeCalendar' : 'calendar';
        this.state.go(nextState, {
            id: this.uiRouter.params.id,
            selected: this.examInfo.examSections.filter((es) => es.selected).map((es) => es.id),
        });
    }

    cancel = () => this.state.go('dashboard');

    createReservation($event: { start: Date; end: Date; room: ExamRoom; accessibilities: Accessibility[] }) {
        this.reservation = {
            room: $event.room,
            time: format($event.start, 'dd.MM.yyyy HH:mm') + ' - ' + format($event.end, 'HH:mm'),
            start: $event.start,
            end: $event.end,
            accessibilities: $event.accessibilities,
        };
    }

    onSectionSelection = (event: { valid: boolean }) => {
        // TODO: how to invalidate calendar
        if (!event.valid) {
            delete this.selectedOrganisation;
            // delete this.selectedRoom;
            delete this.reservation;
        }
    };

    sectionSelectionOk = () => this.examInfo.examSections.some((es) => !es.optional || es.selected);

    confirmReservation = () => {
        const room = this.reservation?.room;
        if (!room || !this.reservation || this.confirming) {
            return;
        }
        const selectedSectionIds = this.examInfo.examSections.filter((es) => es.selected).map((es) => es.id);
        if (!this.sectionSelectionOk()) {
            this.toast.error(this.translate.instant('sitnet_select_at_least_one_section'));
            return;
        }
        this.confirming = true;
        this.Calendar.reserve$(
            this.reservation.start,
            this.reservation.end,
            room,
            this.reservation.accessibilities || [],
            { _id: this.selectedOrganisation ? this.selectedOrganisation._id : null },
            this.isCollaborative,
            selectedSectionIds,
        )
            .subscribe({
                next: () => this.state.go('dashboard'),
                error: (resp) => {
                    this.toast.error(resp);
                },
            })
            .add(() => (this.confirming = false));
    };

    setOrganisation(org: Organisation) {
        this.selectedOrganisation = org;
    }

    printExamDuration(exam: { duration: number }) {
        return this.DateTime.printExamDuration(exam);
    }
}
