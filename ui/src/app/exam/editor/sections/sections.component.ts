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
import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import type { OnChanges, SimpleChanges } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { catchError, tap } from 'rxjs/operators';
import { SessionService } from '../../../session/session.service';
import type { Exam, ExamMaterial, ExamSection } from '../../exam.model';
import { ExamService } from '../../exam.service';
import { ExamTabService } from '../exam-tabs.service';

@Component({
    selector: 'xm-sections',
    templateUrl: './sections.component.html',
})
export class SectionsComponent implements OnInit, OnChanges {
    exam!: Exam;
    collaborative = false;

    materials: ExamMaterial[] = [];

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        private router: Router,
        private translate: TranslateService,
        private toast: ToastrService,
        private Exam: ExamService,
        private Session: SessionService,
        private Tabs: ExamTabService,
    ) {}

    ngOnInit() {
        this.exam = this.Tabs.getExam();
        this.collaborative = this.Tabs.isCollaborative();
        this.Tabs.notifyTabChange(2);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.exam) {
            this.init();
        }
    }

    loadMaterials = () => this.http.get<ExamMaterial[]>('/app/materials').subscribe((resp) => (this.materials = resp));

    moveSection = (event: CdkDragDrop<ExamSection[]>) => {
        const [from, to] = [event.previousIndex, event.currentIndex];
        if (from >= 0 && to >= 0 && from !== to) {
            this.Exam.reorderSections$(from, to, this.exam, this.collaborative).subscribe({
                next: () => {
                    moveItemInArray(this.exam.examSections, from, to);
                    this.toast.info(this.translate.instant('sitnet_sections_reordered'));
                },
                error: this.toast.error,
            });
        }
    };

    addNewSection = () => {
        this.Exam.addSection$(this.exam, this.collaborative)
            .pipe(
                tap((es) => {
                    this.toast.success(this.translate.instant('sitnet_section_added'));
                    this.exam.examSections.push(es);
                }),
                catchError(async (resp) => this.toast.error(resp)),
            )
            .subscribe();
    };

    updateExam = (silent: boolean) =>
        this.Exam.updateExam$(this.exam, {}, this.collaborative).subscribe({
            next: () => {
                if (!silent) {
                    this.toast.info(this.translate.instant('sitnet_exam_saved'));
                }
            },
            error: (resp) => this.toast.error(this.translate.instant(resp)),
        });

    previewExam = (fromTab: number) => this.Exam.previewExam(this.exam, fromTab, this.collaborative);

    removeExam = () => this.Exam.removeExam(this.exam, this.collaborative, this.Session.getUser().isAdmin);

    removeSection = (section: ExamSection) => {
        this.http
            .delete(this.Exam.getResource(`/app/exams/${this.exam.id}/sections/${section.id}`, this.collaborative))
            .subscribe({
                next: () => {
                    this.toast.info(this.translate.instant('sitnet_section_removed'));
                    this.exam.examSections.splice(this.exam.examSections.indexOf(section), 1);
                },
                error: this.toast.error,
            });
    };

    calculateExamMaxScore = () => this.Exam.getMaxScore(this.exam);

    nextTab = () => {
        this.Tabs.notifyTabChange(3);
        this.router.navigate(['..', '3'], { relativeTo: this.route });
    };

    previousTab = () => {
        this.Tabs.notifyTabChange(1);
        this.router.navigate(['..', '1'], { relativeTo: this.route });
    };

    showDelete = () => {
        if (this.collaborative) {
            return this.Session.getUser().isAdmin;
        }
        return this.exam.executionType.type === 'PUBLIC';
    };

    private init = () => {
        this.exam.examSections.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
        this.loadMaterials();
    };
}
