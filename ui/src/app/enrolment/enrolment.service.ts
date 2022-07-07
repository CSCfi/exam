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
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, from, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { CollaborativeParticipation } from '../exam/collaborative/collaborative-exam.service';
import type { CollaborativeExam, Exam, ExaminationEventConfiguration, ExamParticipation } from '../exam/exam.model';
import type { ExamRoom } from '../reservation/reservation.model';
import type { User } from '../session/session.service';
import { SessionService } from '../session/session.service';
import { ConfirmationDialogService } from '../shared/dialogs/confirmation-dialog.service';
import { isObject } from '../shared/miscellaneous/helpers';
import { AddEnrolmentInformationDialogComponent } from './active/dialogs/add-enrolment-information-dialog.component';
import { SelectExaminationEventDialogComponent } from './active/dialogs/select-examination-event-dialog.component';
import { ShowInstructionsDialogComponent } from './active/dialogs/show-instructions-dialog.component';
import type { EnrolmentInfo, ExamEnrolment, ReviewedExam } from './enrolment.model';

export type ParticipationLike =
    | (ExamParticipation & { noShow: boolean })
    | (CollaborativeParticipation & { noShow: boolean })
    | (ExamEnrolment & { started?: string; ended?: string });

@Injectable({ providedIn: 'root' })
export class EnrolmentService {
    constructor(
        private translate: TranslateService,
        private http: HttpClient,
        private router: Router,
        private ngbModal: NgbModal,
        private toast: ToastrService,
        private Confirmation: ConfirmationDialogService,
        private Session: SessionService,
    ) {}

    removeExaminationEvent = (enrolment: ExamEnrolment) => {
        this.Confirmation.open$(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_are_you_sure'),
        ).subscribe({
            next: () =>
                this.http.delete(`/app/enrolments/${enrolment.id}/examination`).subscribe({
                    next: () => {
                        this.toast.info(this.translate.instant('sitnet_examination_event_removed'));
                        delete enrolment.examinationEventConfiguration;
                    },
                    error: this.toast.error,
                }),
            error: this.toast.error,
        });
    };

    removeReservation(enrolment: ExamEnrolment) {
        if (!enrolment.reservation) {
            return;
        }
        const externalRef = enrolment.reservation.externalRef;
        const successFn = () => {
            delete enrolment.reservation;
            enrolment.reservationCanceled = true;
        };
        const errorFn = (resp: { data: string }) => this.toast.error(resp.data);
        const url = externalRef
            ? `/app/iop/reservations/external/${externalRef}`
            : `/app/calendar/reservation/${enrolment.reservation.id}`;
        this.Confirmation.open$(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_are_you_sure'),
        ).subscribe({
            next: () => this.http.delete(url).subscribe({ next: successFn, error: errorFn }),
            error: this.toast.error,
        });
    }

    enroll = (exam: Exam, collaborative = false): Observable<ExamEnrolment> =>
        this.http
            .post<ExamEnrolment>(this.getResource(`${exam.id}`, collaborative), {
                code: exam.course ? exam.course.code : undefined,
            })
            .pipe(
                tap((enrolment) => {
                    this.toast.success(
                        this.translate.instant('sitnet_you_have_enrolled_to_exam') +
                            '\n' +
                            this.translate.instant('sitnet_remember_exam_machine_reservation'),
                    );
                    if (exam.implementation !== 'AQUARIUM' && exam.examinationEventConfigurations.length > 0) {
                        this.selectExaminationEvent(exam, enrolment, '/dashboard');
                    } else {
                        const params = enrolment.collaborativeExam ? enrolment.collaborativeExam.id : enrolment.exam.id;
                        const fragments = enrolment.collaborativeExam ? '/collaborative/calendar' : '/calendar';
                        this.router.navigate([fragments, params]);
                    }
                }),
            );

    getEnrolments = (examId: number, collaborative = false): Observable<ExamEnrolment[]> =>
        this.http.get<ExamEnrolment[]>(this.getResource(`exam/${examId}`, collaborative));

    checkAndEnroll$ = (exam: Exam, collaborative = false): Observable<ExamEnrolment> =>
        this.http.get<ExamEnrolment[]>(this.getResource(`exam/${exam.id}`, collaborative)).pipe(
            switchMap((resp) =>
                resp.length == 0
                    ? this.enroll(exam, collaborative)
                    : throwError(() => new Error(this.translate.instant('sitnet_already_enrolled'))),
            ),
            catchError((err) => {
                this.toast.error(err);
                return throwError(() => new Error(err));
            }),
        );

    enrollStudent$ = (exam: Exam, student: Partial<User>): Observable<ExamEnrolment> => {
        const data = { uid: student.id, email: student.email };
        return this.http
            .post<ExamEnrolment>(`/app/enrolments/student/${exam.id}`, data)
            .pipe(tap(() => this.toast.success(this.translate.instant('sitnet_student_enrolled_to_exam'))));
    };

    getEnrolmentInfo$ = (code: string, id: number): Observable<EnrolmentInfo> =>
        this.http.get<Exam>(`/app/enrolments/${id}?code=${code}`).pipe(
            switchMap((exam) =>
                this.getMaturityInstructions$(exam).pipe(
                    map((instructions) => {
                        return {
                            ...exam,
                            languages: exam.examLanguages.map((el) => el.name),
                            maturityInstructions: instructions,
                            alreadyEnrolled: false,
                            reservationMade: false,
                            noTrialsLeft: false,
                        };
                    }),
                ),
            ),
            switchMap((ei) =>
                this.http.get<ExamEnrolment[]>(`/app/enrolments/exam/${ei.id}`).pipe(
                    map((resp) => {
                        if (resp.length > 0) {
                            ei.alreadyEnrolled = true;
                            ei.reservationMade = resp.some((e) => isObject(e.reservation));
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

    listEnrolments$ = (code: string, id: number): Observable<EnrolmentInfo[]> =>
        this.http.get<Exam[]>(`/app/enrolments?code=${code}`).pipe(
            map((resp) =>
                resp
                    .filter((e) => e.id !== id)
                    .map((e) => {
                        return {
                            ...e,
                            languages: e.examLanguages.map((el) => el.name),
                            maturityInstructions: null,
                            alreadyEnrolled: false,
                            reservationMade: false,
                            noTrialsLeft: false,
                        };
                    }),
            ),
            switchMap(this.checkEnrolments$),
        );

    listStudentParticipations$ = (): Observable<CollaborativeParticipation[]> =>
        this.http.get<CollaborativeParticipation[]>('/app/iop/student/finishedExams');

    searchExams$ = (searchTerm: string): Observable<CollaborativeExam[]> => {
        const paramStr = '?filter=' + (searchTerm && searchTerm.length > 0 ? encodeURIComponent(searchTerm) : '');
        // This path is used to search from student view only
        const path = this.Session.getUser().isStudent
            ? `/app/iop/enrolment/search${paramStr}`
            : `/app/iop/exams/search${paramStr}`;
        return this.http.get<CollaborativeExam[]>(path);
    };

    removeEnrolment$ = (enrolment: ExamEnrolment) => this.http.delete<void>(`/app/enrolments/${enrolment.id}`);

    addEnrolmentInformation = (enrolment: ExamEnrolment): void => {
        const modalRef = this.ngbModal.open(AddEnrolmentInformationDialogComponent, {
            backdrop: 'static',
            keyboard: false,
        });
        modalRef.componentInstance.information = enrolment.information;
        modalRef.result.then((information: string) => {
            this.http.put(`/app/enrolments/${enrolment.id}`, { information: information }).subscribe({
                next: () => {
                    this.toast.success(this.translate.instant('sitnet_saved'));
                    enrolment.information = information;
                },
                error: this.toast.error,
            });
        });
    };

    removeAllEventEnrolmentConfigs$ = (config: ExaminationEventConfiguration) =>
        this.http.delete<void>(`/app/enrolments/configs/${config.id}`);

    setCommentRead = (exam: Exam | ReviewedExam) => {
        if (!this.isCommentRead(exam)) {
            const examFeedback = {
                feedbackStatus: true,
            };
            this.http
                .put<void>(`/app/review/${exam.id}/comment/${exam.examFeedback?.id}/feedbackstatus`, examFeedback)
                .subscribe(() => {
                    if (exam.examFeedback) {
                        exam.examFeedback.feedbackStatus = true;
                    }
                });
        }
    };

    setCommentRead$(examId: string, examRef: string, revision: string) {
        const url = `/app/iop/reviews/${examId}/${examRef}/comment`;
        return this.http.post(url, { rev: revision });
    }

    getRoomInstructions$ = (hash: string): Observable<ExamRoom> =>
        this.http.get<ExamRoom>(`/app/enrolments/room/${hash}`);

    showInstructions = (enrolment: ExamEnrolment): void => {
        const modalRef = this.ngbModal.open(ShowInstructionsDialogComponent, {
            backdrop: 'static',
            keyboard: false,
        });
        modalRef.componentInstance.instructions = enrolment.exam.enrollInstruction;
        modalRef.componentInstance.title = 'sitnet_instructions';
        modalRef.result.catch((err) => this.toast.error(err));
    };

    showMaturityInstructions = (enrolment: { exam: Exam }, external = false) => {
        this.getMaturityInstructions$(enrolment.exam, external).subscribe((instructions) => {
            const modalRef = this.ngbModal.open(ShowInstructionsDialogComponent, {
                backdrop: 'static',
                keyboard: false,
            });
            modalRef.componentInstance.instructions = instructions;
            modalRef.componentInstance.title = 'sitnet_maturity_instructions';
            modalRef.result.catch((err) => this.toast.error(err));
        });
    };

    hasUpcomingAlternativeEvents = (enrolment: ExamEnrolment) =>
        enrolment.exam &&
        enrolment.exam.examinationEventConfigurations.some(
            (eec) =>
                new Date(eec.examinationEvent.start) > new Date() &&
                (!enrolment.examinationEventConfiguration || eec.id !== enrolment.examinationEventConfiguration.id),
        );

    makeReservation = (enrolment: ExamEnrolment) => {
        if (enrolment.exam && enrolment.exam.implementation !== 'AQUARIUM') {
            this.selectExaminationEvent(enrolment.exam, enrolment);
        } else {
            const params = enrolment.collaborativeExam ? enrolment.collaborativeExam.id : enrolment.exam.id;
            const fragments = enrolment.collaborativeExam ? '/collaborative/calendar' : '/calendar';
            this.router.navigate([fragments, params]);
        }
    };

    loadFeedback$ = (id: number) => this.http.get<ReviewedExam>(`/app/feedback/exams/${id}`);
    loadScore$ = (id: number) => this.http.get<ReviewedExam>(`/app/feedback/exams/${id}/score`);
    loadParticipations$ = (filter: string) =>
        this.http.get<ParticipationLike[]>('/app/student/finishedexams', { params: { filter: filter } });

    private selectExaminationEvent = (exam: Exam, enrolment: ExamEnrolment, nextState?: string) => {
        const modalRef = this.ngbModal.open(SelectExaminationEventDialogComponent, {
            backdrop: 'static',
            keyboard: false,
        });
        modalRef.componentInstance.exam = exam;
        modalRef.componentInstance.existingEventId = enrolment.examinationEventConfiguration
            ? enrolment.examinationEventConfiguration.id
            : undefined;
        from(modalRef.result).subscribe({
            next: (data: ExaminationEventConfiguration) => {
                this.http.post(`/app/enrolments/${enrolment.id}/examination/${data.id}`, {}).subscribe({
                    next: () => {
                        enrolment.examinationEventConfiguration = data;
                        if (nextState) {
                            this.router.navigate([nextState]);
                        }
                    },
                    error: (err) => this.toast.error(err),
                });
            },
            error: this.toast.error,
        });
    };

    private getMaturityInstructions$ = (exam: Exam, external = false): Observable<string> => {
        if (exam.executionType.type !== 'MATURITY') {
            return of('');
        }
        if (exam.examLanguages.length !== 1) {
            console.warn('Exam has no exam languages or it has several!');
        }
        const lang = exam.examLanguages.length > 0 ? exam.examLanguages[0].code : 'fi';
        const ref = external ? `&ref=${exam.hash}` : '';
        return this.http
            .get<{ value: string }>(`/app/settings/maturityInstructions?lang=${lang}${ref}`)
            .pipe(map((data) => data.value));
    };

    private getResource = (path: string, collaborative: boolean) =>
        (collaborative ? '/app/iop/enrolments/' : '/app/enrolments/') + path;

    private check$ = (info: EnrolmentInfo): Observable<EnrolmentInfo> =>
        this.http.get<ExamEnrolment[]>(`/app/enrolments/exam/${info.id}`).pipe(
            map((resp) => {
                if (resp.length > 0) {
                    info.alreadyEnrolled = true;
                    info.reservationMade = resp.some((e) => isObject(e.reservation));
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

    private checkEnrolments$ = (infos: EnrolmentInfo[]): Observable<EnrolmentInfo[]> =>
        forkJoin(infos.map(this.check$));

    private isCommentRead = (exam: Exam | ReviewedExam) => exam.examFeedback && exam.examFeedback.feedbackStatus;
}
