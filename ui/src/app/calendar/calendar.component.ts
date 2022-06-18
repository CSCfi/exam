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
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { addDays, format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { switchMap, tap } from 'rxjs/operators';
import { ExamEnrolment } from '../enrolment/enrolment.model';
import type { Accessibility, ExamRoom } from '../reservation/reservation.model';
import { DateTimeService } from '../shared/date/date.service';
import { ConfirmationDialogService } from '../shared/dialogs/confirmation-dialog.service';
import { CalendarService, ExamInfo, Organisation } from './calendar.service';

@Component({
    selector: 'xm-calendar',
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
    examId = 0;
    selectedSections: string[] = [];

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private translate: TranslateService,
        private toast: ToastrService,
        private DateTime: DateTimeService,
        private Dialog: ConfirmationDialogService,
        private Calendar: CalendarService,
    ) {}

    ngOnInit() {
        if (
            this.route.snapshot.data['isCollaborative'] === 'true' ||
            this.route.snapshot.queryParamMap.get('isCollaborative') === 'true'
        ) {
            this.isCollaborative = true;
        }
        this.examId = Number(this.route.snapshot.paramMap.get('id'));
        this.selectedSections = this.route.snapshot.queryParamMap.getAll('selected');

        this.Calendar.getExamInfo$(this.isCollaborative, this.examId)
            .pipe(
                tap((resp) => {
                    resp.examSections.sort((es1, es2) => es1.sequenceNumber - es2.sequenceNumber);
                    this.examInfo = resp;
                }),
                switchMap(() => this.Calendar.getReservationiWindowSize$()),
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
                switchMap(() => this.Calendar.getExamVisitSupportStatus$()),
                tap((resp) => (this.isInteroperable = resp.isExamVisitSupported)),
                switchMap(() =>
                    // TODO: move to section selector
                    this.Calendar.getCurrentEnrolment$(this.examId),
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
        this.Dialog.open$(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_confirm_external_reservation'),
        ).subscribe({
            next: () =>
                this.router.navigate(['iop/calendar', this.examId], {
                    queryParams: {
                        selected: this.examInfo.examSections.filter((es) => es.selected).map((es) => es.id),
                        isCollaborative: this.isCollaborative,
                    },
                }),
            error: this.toast.error,
        });
    }

    makeInternalReservation() {
        const nextState = this.isCollaborative ? 'calendar/collaborative' : 'calendar';
        this.router.navigate([nextState, this.examId], {
            queryParams: { selected: this.examInfo.examSections.filter((es) => es.selected).map((es) => es.id) },
        });
    }

    cancel = () => this.router.navigate(['dashboard']);

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
            this.examId,
            this.reservation.start,
            this.reservation.end,
            room,
            this.reservation.accessibilities || [],
            { _id: this.selectedOrganisation ? this.selectedOrganisation._id : null },
            this.isCollaborative,
            selectedSectionIds,
        )
            .subscribe({
                next: () => this.router.navigate(['dashboard']),
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

    private prepareOptionalSections = (data: ExamEnrolment | null) => {
        this.examInfo.examSections
            .filter((es) => es.optional)
            .forEach((es) => {
                es.selected =
                    (data && data.optionalSections.map((os) => os.id).indexOf(es.id) > -1) ||
                    this.selectedSections.map((s) => parseInt(s)).indexOf(es.id) > -1;
            });
    };
}
