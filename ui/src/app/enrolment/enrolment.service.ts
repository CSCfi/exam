// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import type { CollaborativeExam, Exam, ExaminationEventConfiguration } from 'src/app/exam/exam.model';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import type { User } from 'src/app/session/session.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { isObject } from 'src/app/shared/miscellaneous/helpers';
import { AddEnrolmentInformationDialogComponent } from './active/dialogs/add-enrolment-information-dialog.component';
import { SelectExaminationEventDialogComponent } from './active/dialogs/select-examination-event-dialog.component';
import { ShowInstructionsDialogComponent } from './active/dialogs/show-instructions-dialog.component';
import type {
    CollaborativeParticipation,
    EnrolmentInfo,
    ExamEnrolment,
    ParticipationLike,
    ReviewedExam,
} from './enrolment.model';

@Injectable({ providedIn: 'root' })
export class EnrolmentService {
    private readonly translate = inject(TranslateService);
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly modal = inject(ModalService);
    private readonly toast = inject(ToastrService);
    private readonly Confirmation = inject(ConfirmationDialogService);
    private readonly Modal = inject(ModalService);

    removeExaminationEvent$ = (enrolment: ExamEnrolment): Observable<void> =>
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_are_you_sure'),
        ).pipe(
            switchMap(() => this.http.delete<void>(`/app/enrolments/${enrolment.id}/examination`)),
            tap(() => this.toast.info(this.translate.instant('i18n_examination_event_removed'))),
            catchError((err) => {
                this.toast.error(err);
                return EMPTY;
            }),
        );

    removeReservation$ = (enrolment: ExamEnrolment): Observable<void> => {
        if (!enrolment.reservation) return EMPTY;
        const externalRef = enrolment.reservation.externalRef;
        const url = externalRef
            ? `/app/iop/reservations/external/${externalRef}`
            : `/app/calendar/reservation/${enrolment.reservation.id}`;
        return this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_confirm_delete_exam_reservation'),
        ).pipe(
            switchMap(() => this.http.delete<void>(url)),
            catchError((resp: { data: string }) => {
                this.toast.error(resp.data);
                return EMPTY;
            }),
        );
    };

    enroll$ = (exam: Exam, collaborative = false): Observable<ExamEnrolment> =>
        this.http
            .post<ExamEnrolment>(this.getResource(`${exam.id}`, collaborative), {
                code: exam.course ? exam.course.code : undefined,
            })
            .pipe(
                tap(() =>
                    this.toast.success(
                        this.translate.instant('i18n_remember_exam_machine_reservation'),
                        this.translate.instant('i18n_you_have_enrolled_to_exam'),
                    ),
                ),
                switchMap((enrolment) => {
                    if (exam.implementation !== 'AQUARIUM' && exam.examinationEventConfigurations.length > 0) {
                        return this.selectExaminationEvent$(exam, enrolment, '/dashboard').pipe(map(() => enrolment));
                    }
                    const path = collaborative ? ['/calendar', exam.id, 'collaborative'] : ['/calendar', exam.id];
                    this.router.navigate(path);
                    return of(enrolment);
                }),
            );

    getEnrolments$ = (examId: number, collaborative = false): Observable<ExamEnrolment[]> =>
        this.http.get<ExamEnrolment[]>(this.getResource(`exam/${examId}`, collaborative));

    checkAndEnroll$ = (exam: Exam, collaborative = false): Observable<ExamEnrolment> =>
        this.http.get<ExamEnrolment[]>(this.getResource(`exam/${exam.id}`, collaborative)).pipe(
            switchMap((resp) =>
                resp.length == 0
                    ? this.enroll$(exam, collaborative)
                    : throwError(() => new Error(this.translate.instant('i18n_already_enrolled'))),
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
            .pipe(tap(() => this.toast.success(this.translate.instant('i18n_student_enrolled_to_exam'))));
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
        const paramStr = searchTerm ? `?filter=${encodeURIComponent(searchTerm)}` : '';
        const path = `/app/iop/enrolment${paramStr}`;
        return this.http.get<CollaborativeExam[]>(path);
    };

    removeEnrolment$ = (enrolment: ExamEnrolment) => this.http.delete<void>(`/app/enrolments/${enrolment.id}`);

    addEnrolmentInformation$ = (enrolment: ExamEnrolment): Observable<string> => {
        const modalRef = this.modal.openRef(AddEnrolmentInformationDialogComponent);
        modalRef.componentInstance.information = enrolment.information;
        return this.Modal.result$<string>(modalRef).pipe(
            switchMap((information) =>
                this.http
                    .put(`/app/enrolments/${enrolment.id}`, { information: information })
                    .pipe(map(() => information)),
            ),
            tap(() => this.toast.success(this.translate.instant('i18n_saved'))),
            catchError((err) => {
                this.toast.error(err);
                return EMPTY;
            }),
        );
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
        const modalRef = this.modal.openRef(ShowInstructionsDialogComponent);
        modalRef.componentInstance.instructions.set(enrolment.exam.enrollInstruction);
        modalRef.componentInstance.title.set('i18n_instructions');
    };

    showMaturityInstructions = (enrolment: { exam: Exam }, external = false) => {
        this.getMaturityInstructions$(enrolment.exam, external).subscribe((instructions) => {
            const modalRef = this.modal.openRef(ShowInstructionsDialogComponent);
            modalRef.componentInstance.instructions.set(instructions);
            modalRef.componentInstance.title.set('i18n_maturity_instructions');
        });
    };

    hasUpcomingAlternativeEvents = (enrolment: ExamEnrolment) =>
        enrolment.exam &&
        enrolment.exam.examinationEventConfigurations.some(
            (eec) =>
                new Date(eec.examinationEvent.start) > new Date() &&
                (!enrolment.examinationEventConfiguration || eec.id !== enrolment.examinationEventConfiguration.id),
        );

    makeReservation$ = (enrolment: ExamEnrolment): Observable<ExaminationEventConfiguration> => {
        if (enrolment.exam && enrolment.exam.implementation !== 'AQUARIUM') {
            return this.selectExaminationEvent$(enrolment.exam, enrolment);
        }
        const params = enrolment.collaborativeExam ? enrolment.collaborativeExam.id : enrolment.exam.id;
        const fragments = enrolment.collaborativeExam ? ['/calendar', params, 'collaborative'] : ['/calendar', params];
        this.router.navigate(fragments);
        return EMPTY;
    };

    loadFeedback$ = (id: number) => this.http.get<ReviewedExam>(`/app/feedback/exams/${id}`);
    loadScore$ = (id: number) => this.http.get<ReviewedExam>(`/app/feedback/exams/${id}/score`);
    loadParticipations$ = (filter: string) =>
        this.http.get<ParticipationLike[]>('/app/student/finishedexams', { params: { filter: filter } });

    selectExaminationEvent$ = (
        exam: Exam,
        enrolment: ExamEnrolment,
        nextState?: string,
    ): Observable<ExaminationEventConfiguration> => {
        const modalRef = this.modal.openRef(SelectExaminationEventDialogComponent);
        modalRef.componentInstance.exam.set(exam);
        modalRef.componentInstance.existingEventId.set(enrolment.examinationEventConfiguration?.id);
        return this.modal.result$<ExaminationEventConfiguration>(modalRef).pipe(
            switchMap((data) =>
                this.http.post(`/app/enrolments/${enrolment.id}/examination/${data.id}`, {}).pipe(map(() => data)),
            ),
            tap(() => {
                if (nextState) this.router.navigate([nextState]);
            }),
            catchError((err) => {
                this.toast.error(err);
                return EMPTY;
            }),
        );
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
        infos.length === 0 ? of([]) : forkJoin(infos.map(this.check$));

    private isCommentRead = (exam: Exam | ReviewedExam) => exam.examFeedback && exam.examFeedback.feedbackStatus;
}
