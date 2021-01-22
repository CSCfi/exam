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
import { Component } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import * as FileSaver from 'file-saver';
import * as moment from 'moment';
import { forkJoin, Observable, throwError } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import {
    Course,
    Exam,
    ExamParticipation,
    Grade,
    GradeScale,
    isRealGrade,
    NoGrade,
    SelectableGrade,
} from '../../exam/exam.model';
import { ExamService } from '../../exam/exam.service';
import { User } from '../../session/session.service';
import { AttachmentService } from '../../utility/attachment/attachment.service';
import { ConfirmationDialogService } from '../../utility/dialogs/confirmationDialog.service';
import { FileService } from '../../utility/file/file.service';
import { Review } from '../review.model';
import { SpeedReviewFeedbackComponent } from './dialogs/feedback.component';
import { ReviewListService } from './reviewList.service';

@Component({
    selector: 'speed-review',
    template: require('./speedReview.component.html'),
})
export class SpeedReviewComponent {
    pageSize = 10;
    currentPage = 0;
    reviewPredicate = 'deadline';
    examId: number;
    examInfo: { examOwners: User[]; title: string; anonymous: boolean };
    toggleReviews = false;
    examReviews: Review[];

    constructor(
        private http: HttpClient,
        private state: StateService,
        private translate: TranslateService,
        private modal: NgbModal,
        private Exam: ExamService,
        private ReviewList: ReviewListService,
        private Confirmation: ConfirmationDialogService,
        private Files: FileService,
        private Attachment: AttachmentService,
    ) {}

    private resolveGradeScale = (exam: Exam): GradeScale => {
        if (exam.gradeScale) {
            return exam.gradeScale;
        } else if (exam.parent?.gradeScale) {
            return exam.parent.gradeScale;
        } else if (exam?.course?.gradeScale) {
            return exam.course.gradeScale;
        } else {
            throw Error('No GradeScale for Assessment!');
        }
    };

    private initGrades = (exam: Exam): SelectableGrade[] => {
        const scale = this.resolveGradeScale(exam);
        const grades: SelectableGrade[] = scale.grades
            .map(grade => {
                return {
                    ...grade,
                    name: this.Exam.getExamGradeDisplayName(grade.name),
                    type: grade.name,
                };
            })
            .filter(g => exam.grade && isRealGrade(g) && isRealGrade(exam.grade) && exam.grade.id === g.id);

        // The "no grade" option
        const noGrade: NoGrade = {
            name: this.Exam.getExamGradeDisplayName('NONE'),
            type: 'NONE',
            marksRejection: false,
        };
        return [...grades, noGrade];
    };

    ngOnInit() {
        this.examId = this.state.params.id;
        this.http
            .get<Exam>(`/app/exams/${this.examId}`)
            .pipe(
                tap(
                    exam =>
                        (this.examInfo = {
                            examOwners: exam.examOwners,
                            title: `${(exam.course as Course).code.split('_')[0]} ${exam.name}`,
                            anonymous: exam.anonymous,
                        }),
                ),
                switchMap(() => this.http.get<ExamParticipation[]>(`/app/reviews/${this.examId}`)),
            )
            .subscribe(
                reviews => {
                    this.examReviews = reviews
                        .filter(r => r.exam.state === 'REVIEW' || r.exam.state === 'REVIEW_STARTED')
                        .map(r => ({
                            examParticipation: r,
                            grades: this.initGrades(r.exam),
                            displayName: r.user ? `${r.user.lastName} ${r.user.firstName}` : r.exam.id.toString(),
                            duration: moment.utc(Date.parse(r.duration)).format('HH:mm'),
                            isUnderLanguageInspection: (r.exam.languageInspection &&
                                !r.exam.languageInspection.finishedAt) as boolean,
                            selected: false,
                        }));
                    this.toggleReviews = this.examReviews.length > 0;
                },
                err => toast.error(err.data),
            );
    }

    showFeedbackEditor = (review: Review) => {
        const modalRef = this.modal.open(SpeedReviewFeedbackComponent, {
            backdrop: 'static',
            keyboard: true,
        });
        modalRef.componentInstance.exam = review.examParticipation.exam;
    };

    isAllowedToGrade = (review: Review) => this.Exam.isOwnerOrAdmin(review.examParticipation.exam);

    private getErrors = (review: Review) => {
        const messages = [];
        if (!this.isAllowedToGrade(review)) {
            messages.push('sitnet_error_unauthorized');
        }
        const exam = review.examParticipation.exam;
        if (!exam.creditType && !exam.examType) {
            messages.push('sitnet_exam_choose_credit_type');
        }
        if (!exam.answerLanguage && exam.examLanguages.length !== 1) {
            messages.push('sitnet_exam_choose_response_language');
        }
        return messages;
    };

    private getAnswerLanguage = (review: Review) =>
        review.examParticipation.exam.answerLanguage || review.examParticipation.exam.examLanguages[0].code;

    private isGradeable = (review: Review) => this.getErrors(review).length === 0;

    private hasModifications = () => {
        if (this.examReviews) {
            return (
                this.examReviews.filter(
                    r =>
                        r.selectedGrade &&
                        (isRealGrade(r.selectedGrade) || r.selectedGrade.type === 'NONE') &&
                        this.isGradeable(r),
                ).length > 0
            );
        }
    };

    pageSelected = ($event: { page: number }) => (this.currentPage = $event.page);

    isOwner = (user: User, owners: User[]) => {
        if (owners) {
            return owners.some(o => o.firstName + o.lastName === user.firstName + user.lastName);
        }
        return false;
    };

    gradeExams = () => {
        const reviews = this.examReviews.filter(r => r.selectedGrade && r.selectedGrade.type && this.isGradeable(r));
        this.Confirmation.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_confirm_grade_review'),
        ).result.then(() => {
            forkJoin(reviews.map(this.gradeExam$)).subscribe(() => {
                toast.info(this.translate.instant('sitnet_saved'));
                if (this.examReviews.length === 0) {
                    this.state.go('examEditor', { id: this.state.params.id, tab: 4 });
                }
            });
        });
    };

    private gradeExam$ = (review: Review): Observable<void> => {
        const messages = this.getErrors(review);
        const exam = review.examParticipation.exam;
        const gradeId = exam.grade && (exam.grade as Grade).id;
        if (!review.selectedGrade && !gradeId) {
            messages.push('sitnet_participation_unreviewed');
        }
        messages.forEach(msg => toast.warning(this.translate.instant(msg)));
        if (messages.length === 0) {
            let grade: SelectableGrade | undefined;
            if (review.selectedGrade?.type === 'NONE') {
                exam.gradeless = true;
            } else {
                grade = review.selectedGrade?.id ? review.selectedGrade : exam.grade;
                exam.gradeless = false;
            }
            const data = {
                id: exam.id,
                state: 'GRADED',
                gradeless: exam.gradeless,
                grade: grade ? grade.id : undefined,
                customCredit: exam.customCredit,
                creditType: exam.creditType ? exam.creditType.type : exam.examType.type,
                answerLanguage: this.getAnswerLanguage(review),
            };
            return this.http.put<void>(`/app/review/${exam.id}`, data).pipe(
                tap(() => {
                    this.examReviews.splice(this.examReviews.indexOf(review), 1);
                    exam.gradedTime = new Date();
                    exam.grade = grade;
                }),
            );
        } else {
            return throwError(() => 'no can do');
        }
    };

    importGrades = () => {
        this.Attachment.selectFile(false, 'sitnet_import_grades_from_csv').then(result =>
            this.Files.upload('/app/gradeimport', result.$value.attachmentFile, {}, null, this.state.reload),
        );
    };

    createGradingTemplate = () => {
        const rows = this.examReviews
            .map(
                r =>
                    [
                        r.examParticipation.exam.id,
                        '',
                        '',
                        r.examParticipation.exam.totalScore + ' / ' + r.examParticipation.exam.maxScore,
                        r.displayName,
                        r.examParticipation.user ? r.examParticipation.user.userIdentifier : '',
                    ].join() + '\n',
            )
            .reduce((a, b) => a + b, '');

        const content = 'exam id,grade,feedback,total score,student,student id\n' + rows;
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
        FileSaver.saveAs(blob, 'grading.csv');
    };
}
