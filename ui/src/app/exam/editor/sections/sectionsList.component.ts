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
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import { catchError, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import { SessionService } from '../../../session/session.service';
import { ExamService } from '../../exam.service';
import { ExamTabService } from '../examTabs.service';

import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import type { OnChanges, SimpleChanges } from '@angular/core';
import type { Exam, ExamMaterial, ExamSection } from '../../exam.model';

@Component({
    selector: 'sections',
    templateUrl: './sectionsList.component.html',
})
export class SectionsListComponent implements OnChanges {
    @Input() exam!: Exam;
    @Input() collaborative = false;

    materials: ExamMaterial[] = [];

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private State: StateService,
        private Exam: ExamService,
        private Session: SessionService,
        private Tabs: ExamTabService,
    ) {}

    loadMaterials = () => {
        this.http.get<ExamMaterial[]>('/app/materials').subscribe((resp) => (this.materials = resp));
    };

    private init = () => {
        this.exam.examSections.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
        this.loadMaterials();
    };

    ngOnChanges(changes: SimpleChanges) {
        if (changes.exam) {
            this.init();
        }
    }

    ngOnInit() {
        this.Tabs.notifyTabChange(2);
    }

    moveSection = (event: CdkDragDrop<ExamSection[]>) => {
        const [from, to] = [event.previousIndex, event.currentIndex];
        if (from >= 0 && to >= 0 && from !== to) {
            this.Exam.reorderSections$(from, to, this.exam, this.collaborative).subscribe(
                () => {
                    moveItemInArray(this.exam.examSections, from, to);
                    toast.info(this.translate.instant('sitnet_sections_reordered'));
                },
                (err) => toast.error(err),
            );
        }
    };

    addNewSection = () => {
        this.Exam.addSection$(this.exam, this.collaborative)
            .pipe(
                tap((es) => {
                    toast.success(this.translate.instant('sitnet_section_added'));
                    this.exam.examSections.push(es);
                }),
                catchError((resp) => toast.error(resp)),
            )
            .subscribe();
    };

    updateExam = (silent: boolean) =>
        this.Exam.updateExam$(this.exam, {}, this.collaborative).pipe(
            tap(() => {
                if (!silent) {
                    toast.info(this.translate.instant('sitnet_exam_saved'));
                }
            }),
            catchError((resp) => toast.error(this.translate.instant(resp))),
        );

    previewExam = (fromTab: number) => this.Exam.previewExam(this.exam, fromTab, this.collaborative);

    removeExam = () => this.Exam.removeExam(this.exam, this.collaborative);

    removeSection = (section: ExamSection) => {
        this.http
            .delete(this.Exam.getResource(`/app/exams/${this.exam.id}/sections/${section.id}`, this.collaborative))
            .subscribe(
                () => {
                    toast.info(this.translate.instant('sitnet_section_removed'));
                    this.exam.examSections.splice(this.exam.examSections.indexOf(section), 1);
                },
                (resp) => toast.error(resp.data),
            );
    };

    calculateExamMaxScore = () => this.Exam.getMaxScore(this.exam);

    nextTab = () => {
        this.Tabs.notifyTabChange(3);
        this.State.go('staff.examEditor.publication');
    };

    previousTab = () => {
        this.Tabs.notifyTabChange(1);
        this.State.go('staff.examEditor.basic');
    };

    showDelete = () => {
        if (this.collaborative) {
            return this.Session.getUser().isAdmin;
        }
        return this.exam.executionType.type === 'PUBLIC';
    };
}
