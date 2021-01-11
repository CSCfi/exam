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
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import * as toast from 'toastr';

import { ExamParticipation } from '../../enrolment/enrolment.model';

type Selection = { [k: string]: boolean };
type SelectableParticipation = ExamParticipation & { selected: boolean };

@Injectable()
export class ReviewListService {
    constructor(private http: HttpClient, private translate: TranslateService) {}

    getDisplayName = (review: ExamParticipation, collaborative = false) => {
        return review.user
            ? `${review.user.lastName} ${review.user.firstName}`
            : collaborative
            ? review._id
            : review.exam.id;
    };

    filterReview = (filter: string, review: ExamParticipation) => {
        if (!filter) {
            return true;
        }
        const s = filter.toLowerCase();
        const name = _.get(review, 'user.firstName', '') + ' ' + _.get(review, 'user.lastName', '');
        return (
            name.toLowerCase().indexOf(s) > -1 ||
            _.get(review, 'user.email', '')
                .toLowerCase()
                .indexOf(s) > -1
        );
    };
    filterByState = (reviews: ExamParticipation[], states: string[]) => {
        return reviews.filter(r => {
            return states.indexOf(r.exam.state) > -1;
        });
    };
    prepareView = (items: ExamParticipation[], setup: (p: ExamParticipation) => void) => {
        items.forEach(setup);
        return {
            items: items,
            filtered: items,
            toggle: items.length > 0,
            pageSize: 30,
        };
    };
    applyFilter = (filter: string, items: ExamParticipation[]) => {
        if (!filter) {
            return items;
        }
        return items.filter(i => {
            return this.filterReview(filter, i);
        });
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
    selectAll = (scope: Selection, items: SelectableParticipation[]) => {
        const override = this.resetSelections(scope, 'all');
        items.forEach(i => (i.selected = !i.selected || override));
    };
    selectPage = (scope: Selection, items: SelectableParticipation[], selector: string) => {
        const override = this.resetSelections(scope, 'page');
        // eslint-disable-next-line angular/document-service
        const boxes: NodeList = document.querySelectorAll('.' + selector);
        const ids: number[] = [];
        boxes.forEach(node => ids.push(parseInt(node.nodeValue as string)));
        // init all as not selected
        if (override) {
            items.forEach(i => (i.selected = false));
        }
        items.filter(i => ids.indexOf(i.exam.id) > -1).forEach(pi => (pi.selected = !pi.selected || override));
    };
    getSelectedReviews = (items: SelectableParticipation[]) => {
        const objects = items.filter(i => i.selected);
        if (objects.length === 0) {
            toast.warning(this.translate.instant('sitnet_choose_atleast_one'));
            return;
        }
        return objects;
    };
    private send = (review: ExamParticipation, examId: number, state: string): Observable<ExamParticipation> => {
        const exam = review.exam;
        if ((exam.grade || exam.gradeless) && exam.creditType && exam.answerLanguage) {
            const examToRecord = {
                id: exam.id,
                state: state,
                grade: exam.grade,
                customCredit: exam.customCredit,
                totalScore: exam.totalScore,
                creditType: exam.creditType,
                answerLanguage: exam.answerLanguage,
                rev: review._rev,
            };
            if (examId) {
                const url = `/integration/iop/reviews/${examId}/${review._id}/record`;
                return this.http
                    .put<ExamParticipation & { rev: string }>(url, examToRecord)
                    .pipe(map(resp => ({ ...review, _rev: resp.rev })));
            } else {
                const resource = exam.gradeless ? '/app/exam/register' : 'app/exam/record';
                return this.http.post<ExamParticipation>(resource, examToRecord);
            }
        } else {
            toast.error(this.translate.instant('sitnet_failed_to_record_review'));
            return of();
        }
    };
    sendToArchive = (review: ExamParticipation, examId: number) => this.send(review, examId, 'ARCHIVED');
    sendToRegistry = (review: ExamParticipation, examId: number) => this.send(review, examId, 'GRADED_LOGGED');
}
