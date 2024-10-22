// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, LowerCasePipe, NgClass, SlicePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbModal, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { saveAs } from 'file-saver-es';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { forkJoin, noop, throwError } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Course, Exam, Grade, GradeScale, NoGrade, SelectableGrade } from 'src/app/exam/exam.model';
import { isRealGrade } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import type { Review } from 'src/app/review/review.model';
import type { User } from 'src/app/session/session.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { DiffInDaysPipe } from 'src/app/shared/date/day-diff.pipe';
import { DiffInMinutesPipe } from 'src/app/shared/date/minute-diff.pipe';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { FileService } from 'src/app/shared/file/file.service';
import { HistoryBackComponent } from 'src/app/shared/history/history-back.component';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { CourseCodeService } from 'src/app/shared/miscellaneous/course-code.service';
import { PageFillPipe } from 'src/app/shared/paginator/page-fill.pipe';
import { PaginatorComponent } from 'src/app/shared/paginator/paginator.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';
import { SpeedReviewFeedbackComponent } from './dialogs/feedback.component';

@Component({
    selector: 'xm-speed-review',
    templateUrl: './speed-review.component.html',
    standalone: true,
    imports: [
        HistoryBackComponent,
        TableSortComponent,
        RouterLink,
        NgClass,
        FormsModule,
        PaginatorComponent,
        NgbPopover,
        LowerCasePipe,
        SlicePipe,
        DatePipe,
        TranslateModule,
        ApplyDstPipe,
        PageFillPipe,
        DiffInMinutesPipe,
        DiffInDaysPipe,
        OrderByPipe,
        PageHeaderComponent,
        PageContentComponent,
    ],
    styleUrl: './speed-review.component.scss',
})
export class SpeedReviewComponent implements OnInit {
    pageSize = 10;
    currentPage = 0;
    reviewPredicate = 'deadline';
    reverse = false;
    examId = 0;
    examInfo?: { examOwners: User[]; title: string; anonymous: boolean };
    toggleReviews = false;
    examReviews: Review[] = [];

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        private router: Router,
        private translate: TranslateService,
        private modal: NgbModal,
        private toast: ToastrService,
        private Exam: ExamService,
        private CommonExam: CommonExamService,
        private Confirmation: ConfirmationDialogService,
        private Files: FileService,
        private Attachment: AttachmentService,
        private DateTime: DateTimeService,
        private CourseCode: CourseCodeService,
    ) {}

    ngOnInit() {
        this.examId = this.route.snapshot.params.id;
        this.http
            .get<Exam>(`/app/exams/${this.examId}`)
            .pipe(
                tap(
                    (exam) =>
                        (this.examInfo = {
                            examOwners: exam.examOwners,
                            title: `${this.CourseCode.formatCode((exam.course as Course).code)} ${exam.name}`,
                            anonymous: exam.anonymous,
                        }),
                ),
                switchMap(() => this.http.get<ExamParticipation[]>(`/app/reviews/${this.examId}`)),
            )
            .subscribe({
                next: (reviews) => {
                    this.examReviews = reviews
                        .filter((r) => r.exam.state === 'REVIEW' || r.exam.state === 'REVIEW_STARTED')
                        .map((r) => ({
                            examParticipation: r,
                            grades: this.initGrades(r.exam),
                            displayName: r.user ? `${r.user.lastName} ${r.user.firstName}` : r.exam.id.toString(),
                            duration: this.DateTime.getDuration(r.duration),
                            isUnderLanguageInspection: (r.exam.languageInspection &&
                                !r.exam.languageInspection.finishedAt) as boolean,
                            selected: false,
                        }));
                    this.toggleReviews = this.examReviews.length > 0;
                },
                error: (err) => this.toast.error(err.data),
            });
    }

    showFeedbackEditor = (review: Review) => {
        const modalRef = this.modal.open(SpeedReviewFeedbackComponent, {
            backdrop: 'static',
            keyboard: true,
        });
        modalRef.componentInstance.exam = review.examParticipation.exam;
    };

    isAllowedToGrade = (review: Review) => this.Exam.isOwnerOrAdmin(review.examParticipation.exam);

    setPredicate = (predicate: string) => (this.reviewPredicate = predicate);

    isGradeable = (review: Review) => this.getErrors(review).length === 0;

    hasModifications = () => {
        if (this.examReviews) {
            return (
                this.examReviews.filter(
                    (r) =>
                        r.selectedGrade &&
                        (isRealGrade(r.selectedGrade) || r.selectedGrade.type === 'NONE') &&
                        this.isGradeable(r),
                ).length > 0
            );
        }
        return false;
    };

    pageSelected = ($event: { page: number }) => (this.currentPage = $event.page);

    isOwner = (user: User, owners: User[]) => {
        if (owners) {
            return owners.some((o) => o.firstName + o.lastName === user.firstName + user.lastName);
        }
        return false;
    };

    gradeExams = () => {
        const reviews = this.examReviews.filter((r) => r.selectedGrade && r.selectedGrade.type && this.isGradeable(r));
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_confirm_grade_review'),
        ).subscribe({
            next: () => {
                forkJoin(reviews.map(this.gradeExam$)).subscribe(() => {
                    this.toast.info(this.translate.instant('i18n_saved'));
                    if (this.examReviews.length === 0) {
                        this.router.navigate(['/staff/exams', this.examId, '5']);
                    }
                });
            },
        });
    };

    importGrades = () => {
        this.Attachment.selectFile(false, {}, 'i18n_import_grades_from_csv')
            .then((result) => {
                this.Files.upload('/app/gradeimport', result.$value.attachmentFile, {}, undefined, () => this.reload());
                this.toast.success(`${this.translate.instant('i18n_csv_uploaded_successfully')}`);
            })
            .catch(() => {
                this.toast.info(`${this.translate.instant('i18n_csv_uploading_cancelled')}`);
                return noop;
            });
    };

    createGradingTemplate = () => {
        const rows = this.examReviews
            .map(
                (r) =>
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
        saveAs(blob, 'grading.csv', { autoBom: false });
    };

    private reload = () =>
        this.router
            .navigateByUrl('/', { skipLocationChange: true })
            .then(() => this.router.navigate(['/staff/assessments', this.examId, 'speedreview']));

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
            .map((grade) => {
                return {
                    ...grade,
                    name: this.CommonExam.getExamGradeDisplayName(grade.name),
                    type: grade.name,
                };
            })
            .filter(isRealGrade);
        // The "no grade" option
        const noGrade: NoGrade = {
            name: this.CommonExam.getExamGradeDisplayName('NONE'),
            type: 'NONE',
            marksRejection: false,
        };
        return [...grades, noGrade];
    };

    private getErrors = (review: Review) => {
        const messages = [];
        if (!this.isAllowedToGrade(review)) {
            messages.push('i18n_error_unauthorized');
        }
        const exam = review.examParticipation.exam;
        if (!exam.creditType && !exam.examType) {
            messages.push('i18n_exam_choose_credit_type');
        }
        if (!exam.answerLanguage && exam.examLanguages.length !== 1) {
            messages.push('i18n_exam_choose_response_language');
        }
        return messages;
    };

    private getAnswerLanguage = (review: Review) =>
        review.examParticipation.exam.answerLanguage || review.examParticipation.exam.examLanguages[0].code;

    private gradeExam$ = (review: Review): Observable<void> => {
        const messages = this.getErrors(review);
        const exam = review.examParticipation.exam;
        const gradeId = exam.grade && (exam.grade as Grade).id;
        if (!review.selectedGrade && !gradeId) {
            messages.push('i18n_participation_unreviewed');
        }
        messages.forEach((msg) => this.toast.warning(this.translate.instant(msg)));
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
}
