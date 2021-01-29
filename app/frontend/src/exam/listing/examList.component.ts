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
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import { from, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, map, takeUntil, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import { ConfirmationDialogService } from '../../utility/dialogs/confirmationDialog.service';
import { Exam, Implementation } from '../exam.model';
import { ExamService } from '../exam.service';

type ExamListExam = Exam & { expired: boolean; ownerAggregate: string };

@Component({
    selector: 'exam-list',
    templateUrl: './examList.component.html',
})
export class ExamListingComponent {
    view: string;
    showExpired: boolean;
    examsPredicate: string;
    reverse: boolean;
    filter: { text: string };
    loader: { loading: boolean };
    executionTypes: { type: string; name: string; examinationTypes: { type: string; name: string }[] }[];
    selectedType: { type: string; name: string; examinationTypes: { type: string; name: string }[] };
    byodExaminationSupported: boolean;
    exams: ExamListExam[] = [];
    subject = new Subject<string>();
    ngUnsubscribe = new Subject();

    constructor(
        private translate: TranslateService,
        private state: StateService,
        private http: HttpClient,
        private Confirmation: ConfirmationDialogService,
        private Exam: ExamService,
    ) {}

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    ngOnInit() {
        this.view = 'PUBLISHED';
        this.showExpired = false;
        this.examsPredicate = 'examActiveEndDate';
        this.reverse = true;
        this.filter = { text: '' };
        this.loader = { loading: false };

        this.http.get<{ isByodExaminationSupported: boolean }>('/app/settings/byod').subscribe(resp => {
            const byodSupported = resp.isByodExaminationSupported;
            this.Exam.listExecutionTypes().subscribe(types => {
                this.executionTypes = types.map(t => {
                    const implementations =
                        t.type != 'PRINTOUT' && byodSupported
                            ? [
                                  { type: 'AQUARIUM', name: 'sitnet_examination_type_aquarium' },
                                  { type: 'CLIENT_AUTH', name: 'sitnet_examination_type_seb' },
                                  { type: 'WHATEVER', name: 'sitnet_examination_type_home_exam' },
                              ]
                            : [];
                    return { ...t, examinationTypes: implementations };
                });
            });
            this.subject
                .pipe(
                    tap(() => (this.loader.loading = true)),
                    debounceTime(500),
                    distinctUntilChanged(),
                    exhaustMap(term =>
                        term.length < 2
                            ? from([])
                            : this.http.get<ExamListExam[]>('/app/exams', { params: { filter: term } }),
                    ),
                    map((exams: ExamListExam[]) => {
                        exams.forEach(e => {
                            e.ownerAggregate = e.examOwners.map(o => `${o.firstName} ${o.lastName}`).join();
                            if (e.state === 'PUBLISHED') {
                                e.expired = new Date() > new Date(e.examActiveEndDate);
                            } else {
                                e.expired = false;
                            }
                        });
                        return exams;
                    }),
                    tap(exams => {
                        this.exams = exams;
                        this.loader.loading = false;
                    }),
                    takeUntil(this.ngUnsubscribe),
                )
                .subscribe();
        });
    }

    search = (event: { target: { value: string } }) => this.subject.next(event.target.value);

    createExam = (executionType: Implementation) => this.Exam.createExam(executionType);

    copyExam = (exam: Exam, type: string, examinationType = 'AQUARIUM') =>
        this.http
            .post<Exam>(`/app/exams/${exam.id}`, { type: type, examinationType: examinationType })
            .subscribe(
                resp => {
                    toast.success(this.translate.instant('sitnet_exam_copied'));
                    this.state.go('examEditor', { id: resp.id, tab: 1 });
                },
                err => toast.error(err.data),
            );

    deleteExam = (exam: ExamListExam) => {
        const dialog = this.Confirmation.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_remove_exam'),
        );
        dialog.result.then(() => {
            this.http.delete(`/app/exams/${exam.id}`).subscribe(
                () => {
                    toast.success(this.translate.instant('sitnet_exam_removed'));
                    this.exams.splice(this.exams.indexOf(exam), 1);
                },
                err => toast.error(err.data),
            );
        });
    };

    filterByStateAndExpiration = (state: string, expired: boolean) =>
        this.exams.filter(e => e.state === state && e.expired == expired);
    filterByState = (state: string) => this.exams.filter(e => e.state === state);

    getExecutionTypeTranslation = (exam: ExamListExam) => this.Exam.getExecutionTypeTranslation(exam.executionType);

    setPredicate = (predicate: string) => {
        if (this.examsPredicate === predicate) {
            this.reverse = !this.reverse;
        }
        this.examsPredicate = predicate;
    };
}
