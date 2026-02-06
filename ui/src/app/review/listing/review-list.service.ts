// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { Exam } from 'src/app/exam/exam.model';
import type { Review, ReviewListView } from 'src/app/review/review.model';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';

type Selection = { [k: string]: boolean };

@Injectable({ providedIn: 'root' })
export class ReviewListService {
    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private CommonExam = inject(CommonExamService);

    getDisplayName = (review: ExamParticipation, collaborative = false): string => {
        if (review.user) return `${review.user.lastName} ${review.user.firstName}`;
        else if (collaborative && review._id) return review._id;
        else return review.exam.id.toString();
    };

    filterReview = (filter: string, review: Review): boolean => {
        if (!filter) {
            return true;
        }
        const s = filter.toLowerCase();
        const name = `${review.examParticipation.user.firstName || ''} ${review.examParticipation.user.lastName || ''}`;
        return (
            name.toLowerCase().indexOf(s) > -1 ||
            (review.examParticipation.user.email || ' ').toLowerCase().indexOf(s) > -1
        );
    };

    filterByState = (reviews: ExamParticipation[], states: string[]) => {
        return reviews.filter((r) => {
            return states.indexOf(r.exam.state) > -1;
        });
    };

    filterByStateAndEnhance = (states: string[], reviews: ExamParticipation[], collaborative = false): Review[] =>
        reviews
            .filter((r) => states.indexOf(r.exam.state) > -1)
            .map((r) => ({
                examParticipation: r,
                grades: [],
                displayName: this.getDisplayName(r, collaborative),
                duration: this.diffInMinutes(r.started, r.ended).toString(),
                isUnderLanguageInspection: (r.exam.languageInspection &&
                    !r.exam.languageInspection.finishedAt) as boolean,
                selected: false,
            }));

    prepareView = (items: Review[], setup: (p: Review) => void, predicate: string): ReviewListView => {
        items.forEach(setup);
        return {
            items: items,
            filtered: items,
            toggle: items.length > 0,
            pageSize: 30,
            predicate: predicate,
            reverse: false,
            page: 0,
            filter: '',
        };
    };
    applyFilter = (filter: string, items: Review[]) => {
        if (!filter) {
            return items;
        }
        return items.filter((i) => {
            return this.filterReview(filter, i);
        });
    };

    selectAll = (scope: Selection, items: Review[]) => {
        const override = this.resetSelections(scope, 'all');
        items.forEach((i) => (i.selected = !i.selected || override));
    };

    selectPage = (scope: Selection, items: Review[], selector: string) => {
        const override = this.resetSelections(scope, 'page');
        const boxes = document.querySelectorAll<HTMLInputElement>('.' + selector);
        const ids: string[] = [];
        boxes.forEach((node) => ids.push(node.value));
        // init all as not selected
        if (override) {
            items.forEach((i) => (i.selected = false));
        }
        items
            .filter(
                (i) =>
                    ids.indexOf(i.examParticipation.id.toString()) > -1 ||
                    (i.examParticipation._id && ids.indexOf(i.examParticipation._id) > -1),
            )
            .forEach((pi) => (pi.selected = !pi.selected || override));
    };
    getSelectedReviews = (items: Review[]) => {
        const objects = items.filter((i) => i.selected);
        if (objects.length === 0) {
            this.toast.warning(this.translate.instant('i18n_choose_atleast_one'));
        }
        return objects;
    };

    sendToArchive$ = (review: ExamParticipation, examId?: number) => this.send$(review, 'ARCHIVED', examId);
    sendToRegistry$ = (review: ExamParticipation, examId?: number) => this.send$(review, 'GRADED_LOGGED', examId);

    getReviews$ = (examId: number, collaborative = false) =>
        this.http.get<ExamParticipation[]>(this.getResource(examId, collaborative));

    diffInMinutes = (from: string, to: string) => {
        const diff = (new Date(to).getTime() - new Date(from).getTime()) / 1000 / 60;
        return Math.round(diff);
    };

    translateGrade = (exam: Exam) => {
        if (exam.gradingType === 'GRADED' && exam.grade?.name) {
            return this.CommonExam.getExamGradeDisplayName(exam.grade.name);
        } else if (exam.gradingType === 'NOT_GRADED') {
            return this.translate.instant('i18n_no_grading');
        } else if (exam.gradingType === 'POINT_GRADED') {
            return this.translate.instant('i18n_point_graded');
        }
        return '';
    };

    private resetSelections = (scope: Selection, view: string) => {
        let [prev, next] = [false, false];
        for (const k in scope) {
            if (Object.prototype.hasOwnProperty.call(scope, k)) {
                if (k === view) {
                    scope[k] = !scope[k];
                    next = scope[k];
                } else {
                    if (scope[k]) {
                        prev = true;
                    }
                    scope[k] = false;
                }
            }
        }
        return prev && next;
    };

    private send$ = (review: ExamParticipation, state: string, examId?: number): Observable<ExamParticipation> => {
        const exam = review.exam;
        if (
            (exam.grade || exam.gradingType === 'NOT_GRADED' || exam.gradingType === 'POINT_GRADED') &&
            exam.creditType &&
            exam.answerLanguage
        ) {
            const examToRecord = {
                id: exam.id,
                state: state,
                grade: exam.grade,
                gradingType: exam.gradingType || (exam.grade ? 'GRADED' : 'NOT_GRADED'),
                customCredit: exam.customCredit,
                totalScore: exam.totalScore,
                creditType: exam.creditType,
                answerLanguage: exam.answerLanguage,
                rev: review._rev,
            };
            if (examId) {
                const url = `/app/iop/reviews/${examId}/${review._id}/record`;
                return this.http
                    .put<ExamParticipation & { rev: string }>(url, examToRecord)
                    .pipe(map((resp) => ({ ...review, _rev: resp.rev })));
            } else {
                const resource = exam.gradingType === 'NOT_GRADED' ? '/app/exam/register' : 'app/exam/record';
                return this.http.post<ExamParticipation>(resource, examToRecord);
            }
        } else {
            this.toast.error(this.translate.instant('i18n_failed_to_record_review'));
            return of();
        }
    };

    private getResource = (examId: number, collaborative: boolean) =>
        collaborative ? `/app/iop/reviews/${examId}` : `/app/reviews/${examId}`;
}
