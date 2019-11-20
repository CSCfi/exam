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
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { catchError, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import { SessionService } from '../../../session/session.service';
import { Exam, ExamMaterial, ExamSection } from '../../exam.model';
import { ExamService } from '../../exam.service';

@Component({
    selector: 'sections',
    template: require('./sectionsList.component.html'),
})
export class SectionsListComponent implements OnInit, OnChanges {
    @Input() exam: Exam;
    @Input() collaborative: boolean;
    @Output() onNextTabSelected = new EventEmitter<void>();
    @Output() onPreviousTabSelected = new EventEmitter<void>();
    @Output() onNewLibraryQuestion = new EventEmitter<void>();
    materials: ExamMaterial[];

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private Exam: ExamService,
        private Session: SessionService,
    ) {}

    loadMaterials = () => {
        this.http.get<ExamMaterial[]>('/app/materials').subscribe(resp => (this.materials = resp));
    };

    private init = () => {
        this.exam.examSections.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
        this.loadMaterials();
        this.updateSectionIndices();
    };

    private updateSectionIndices = () =>
        // set sections and question numbering
        this.exam.examSections.forEach((section, index) => (section.index = index + 1));

    ngOnInit() {
        this.init();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.exam) {
            this.init();
        }
    }

    moveSection = (event: any) => {
        if (event.from >= 0 && event.to >= 0 && event.from !== event.to) {
            this.Exam.reorderSections(event.from, event.to, this.exam, this.collaborative).subscribe(
                () => {
                    this.updateSectionIndices();
                    toast.info(this.translate.instant('sitnet_sections_reordered'));
                },
                err => toast.error(err),
            );
        }
    };

    addNewSection = () =>
        this.Exam.addSection(this.exam, this.collaborative).pipe(
            tap(es => {
                toast.success(this.translate.instant('sitnet_section_added'));
                this.exam.examSections.push(es);
                this.updateSectionIndices();
            }),
            catchError(resp => toast.error(resp)),
        );

    updateExam = (silent: boolean) =>
        this.Exam.updateExam$(this.exam, {}, this.collaborative).pipe(
            tap(() => {
                if (!silent) {
                    toast.info(this.translate.instant('sitnet_exam_saved'));
                }
            }),
            catchError(resp => toast.error(this.translate.instant(resp))),
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
                    this.updateSectionIndices();
                },
                resp => toast.error(resp.data),
            );
    };

    calculateExamMaxScore = () => this.Exam.getMaxScore(this.exam);

    nextTab = () => this.onNextTabSelected.emit();

    previousTab = () => this.onPreviousTabSelected.emit();

    showDelete = () => {
        if (this.collaborative) {
            return this.Session.getUser().isAdmin;
        }
        return this.exam.executionType.type === 'PUBLIC';
    };

    onReloadRequired = () => this.onNewLibraryQuestion.emit();
}
