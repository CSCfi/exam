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
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import * as _ from 'lodash';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import { Exam, ExaminationEventConfiguration } from '../exam/exam.model';
import { ExamRoom } from '../reservation/reservation.model';
import { User } from '../session/session.service';
import { ConfirmationDialogService } from '../utility/dialogs/confirmationDialog.service';
import { LanguageService } from '../utility/language/language.service';
import { AddEnrolmentInformationDialogComponent } from './active/dialogs/addEnrolmentInformationDialog.component';
import { SelectExaminationEventDialogComponent } from './active/dialogs/selectExaminationEventDialog.component';
import { ShowInstructionsDialogComponent } from './active/dialogs/showInstructionsDialog.component';
import { EnrolmentInfo, ExamEnrolment } from './enrolment.model';

@Injectable()
export class EnrolmentService {
    constructor(
        private translate: TranslateService,
        private http: HttpClient,
        private State: StateService,
        private ngbModal: NgbModal,
        private Confirmation: ConfirmationDialogService,
        private Language: LanguageService,
    ) {}

    private getMaturityInstructions = (exam: Exam): Observable<string> => {
        if (exam.executionType.type !== 'MATURITY') {
            return of('');
        }
        if (exam.examLanguages.length !== 1) {
            console.warn('Exam has no exam languages or it has several!');
        }
        const lang = exam.examLanguages.length > 0 ? exam.examLanguages[0].code : 'fi';
        return this.http
            .get<{ value: string }>(`/app/settings/maturityInstructions?lang=${lang}`)
            .pipe(map(data => data.value));
    };

    private getResource = (path: string, collaborative: boolean) =>
        (collaborative ? '/integration/iop/enrolments/' : '/app/enrolments/') + path;

    selectExaminationEvent = (exam: Exam, enrolment: ExamEnrolment, nextState?: string) => {
        const modalRef = this.ngbModal.open(SelectExaminationEventDialogComponent, {
            backdrop: 'static',
            keyboard: false,
        });
        modalRef.componentInstance.exam = exam;
        modalRef.componentInstance.existingEventId = enrolment.examinationEventConfiguration
            ? enrolment.examinationEventConfiguration.id
            : undefined;
        modalRef.result.then((data: ExaminationEventConfiguration) => {
            this.http.post(`/app/enrolments/${enrolment.id}/examination/${data.id}`, {}).subscribe(() => {
                enrolment.examinationEventConfiguration = data;
                if (nextState) {
                    this.State.go(nextState);
                }
            });
        });
    };

    removeExaminationEvent = (enrolment: ExamEnrolment) => {
        this.Confirmation.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_are_you_sure'),
        ).result.then(() => {
            this.http.delete(`/app/enrolments/${enrolment.id}/examination`).subscribe(
                () => {
                    toast.info(this.translate.instant('sitnet_examination_event_removed'));
                    delete enrolment.examinationEventConfiguration;
                },
                err => toast.error(err.data),
            );
        });
    };

    enroll = (exam: Exam, collaborative = false): Observable<ExamEnrolment> =>
        this.http
            .post<ExamEnrolment>(this.getResource(`${exam.id}`, collaborative), {
                code: exam.course ? exam.course.code : undefined,
            })
            .pipe(
                tap(enrolment => {
                    toast.success(
                        this.translate.instant('sitnet_you_have_enrolled_to_exam') +
                            '<br/>' +
                            this.translate.instant('sitnet_remember_exam_machine_reservation'),
                    );
                    if (exam.requiresUserAgentAuth && exam.examinationEventConfigurations.length > 0) {
                        this.selectExaminationEvent(exam, enrolment, 'dashboard');
                    } else {
                        this.State.go(collaborative ? 'collaborativeCalendar' : 'calendar', { id: exam.id });
                    }
                }),
            );

    getEnrolments = (examId: number, collaborative = false): Observable<ExamEnrolment[]> =>
        this.http.get<ExamEnrolment[]>(this.getResource(`exam/${examId}`, collaborative));

    checkAndEnroll = (exam: Exam, collaborative = false): Observable<ExamEnrolment> =>
        this.http.get<ExamEnrolment[]>(this.getResource(`exam/${exam.id}`, collaborative)).pipe(
            switchMap(enrolments => {
                if (enrolments.length > 0) {
                    toast.error(this.translate.instant('sitnet_already_enrolled'));
                    return throwError('already enrolled');
                }
                return this.enroll(exam, collaborative);
            }),
        );

    enrollStudent = (exam: Exam, student: Partial<User>): Observable<ExamEnrolment> => {
        const data = { uid: student.id, email: student.email };
        return this.http
            .post<ExamEnrolment>(`/app/enrolments/student/${exam.id}`, data)
            .pipe(tap(() => toast.success(this.translate.instant('sitnet_student_enrolled_to_exam'))));
    };

    getEnrolmentInfo = (code: string, id: number): Observable<EnrolmentInfo> =>
        this.http.get<Exam>(`/app/enrolments/${id}?code=${code}`).pipe(
            switchMap(exam =>
                this.getMaturityInstructions(exam).pipe(
                    map(instructions => {
                        return {
                            ...exam,
                            languages: exam.examLanguages.map(el => this.Language.getLanguageNativeName(el.code)),
                            maturityInstructions: instructions,
                            alreadyEnrolled: false,
                            reservationMade: false,
                            noTrialsLeft: false,
                        };
                    }),
                ),
            ),
            switchMap(ei =>
                this.http.get<ExamEnrolment[]>(`/app/enrolments/exam/${ei.id}`).pipe(
                    map(resp => {
                        if (resp.length > 0) {
                            ei.alreadyEnrolled = true;
                            ei.reservationMade = resp.some(e => _.isObject(e.reservation));
                        }
                        return ei;
                    }),
                    catchError(() => {
                        ei.noTrialsLeft = true;
                        return of(ei);
                    }),
                ),
            ),
        );

    private check = (info: EnrolmentInfo): Observable<EnrolmentInfo> =>
        this.http.get<ExamEnrolment[]>(`/app/enrolments/exam/${info.id}`).pipe(
            map(resp => {
                if (resp.length > 0) {
                    info.alreadyEnrolled = true;
                    info.reservationMade = resp.some(e => _.isObject(e.reservation));
                } else {
                    info.alreadyEnrolled = info.reservationMade = false;
                }
                return info;
            }),
            catchError(() => {
                info.alreadyEnrolled = false;
                info.reservationMade = false;
                return of(info);
            }),
        );

    private checkEnrolments = (infos: EnrolmentInfo[]): Observable<EnrolmentInfo[]> => forkJoin(infos.map(this.check));

    listEnrolments = (code: string, id: number): Observable<EnrolmentInfo[]> =>
        this.http.get<Exam[]>(`/app/enrolments?code=${code}`).pipe(
            map(resp =>
                resp
                    .filter(e => e.id !== id)
                    .map(e => {
                        return {
                            ...e,
                            languages: e.examLanguages.map(el => this.Language.getLanguageNativeName(el.code)),
                            maturityInstructions: null,
                            alreadyEnrolled: false,
                            reservationMade: false,
                            noTrialsLeft: false,
                        };
                    }),
            ),
            switchMap(this.checkEnrolments),
        );

    removeEnrolment = (enrolment: ExamEnrolment) => this.http.delete<void>(`/app/enrolments/${enrolment.id}`);

    addEnrolmentInformation = (enrolment: ExamEnrolment): void => {
        const modalRef = this.ngbModal.open(AddEnrolmentInformationDialogComponent, {
            backdrop: 'static',
            keyboard: false,
        });
        modalRef.componentInstance.information = enrolment.information;
        modalRef.result.then((information: string) => {
            this.http.put(`/app/enrolments/${enrolment.id}`, { information: information }).subscribe(
                () => {
                    toast.success(this.translate.instant('sitnet_saved'));
                    enrolment.information = information;
                },
                err => toast.error(err),
            );
        });
    };

    getRoomInstructions = (hash: string): Observable<ExamRoom> =>
        this.http.get<ExamRoom>(`/app/enrolments/room/${hash}`);

    showInstructions = (enrolment: ExamEnrolment): void => {
        const modalRef = this.ngbModal.open(ShowInstructionsDialogComponent, {
            backdrop: 'static',
            keyboard: false,
        });
        modalRef.componentInstance.instructions = enrolment.exam.enrollInstruction;
        modalRef.componentInstance.title = 'sitnet_instructions';
        modalRef.result.catch(err => toast.error(err));
    };

    showMaturityInstructions = (enrolment: { exam: Exam }) => {
        this.getMaturityInstructions(enrolment.exam).subscribe(instructions => {
            const modalRef = this.ngbModal.open(ShowInstructionsDialogComponent, {
                backdrop: 'static',
                keyboard: false,
            });
            modalRef.componentInstance.instructions = instructions;
            modalRef.componentInstance.title = 'sitnet_maturity_instructions';
            modalRef.result.catch(err => toast.error(err));
        });
    };
}
