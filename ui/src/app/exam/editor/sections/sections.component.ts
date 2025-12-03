// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    CdkDrag,
    CdkDragDrop,
    CdkDragPlaceholder,
    CdkDragPreview,
    CdkDropList,
    moveItemInArray,
} from '@angular/cdk/drag-drop';

import { HttpClient } from '@angular/common/http';
import type { OnChanges, SimpleChanges } from '@angular/core';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { catchError, tap } from 'rxjs/operators';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { Exam, ExamMaterial, ExamSection } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { SessionService } from 'src/app/session/session.service';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { SectionComponent } from './section.component';

@Component({
    selector: 'xm-sections',
    templateUrl: './sections.component.html',
    imports: [CdkDropList, CdkDrag, CdkDragPlaceholder, CdkDragPreview, SectionComponent, TranslateModule, OrderByPipe],
    styleUrls: ['../../exam.shared.scss', './sections.component.scss', './sections.shared.scss'],
})
export class SectionsComponent implements OnInit, OnChanges {
    exam!: Exam;
    collaborative = false;
    materials: ExamMaterial[] = [];

    private http = inject(HttpClient);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Exam = inject(ExamService);
    private Session = inject(SessionService);
    private Tabs = inject(ExamTabService);

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
                    this.updateIndices();
                    this.toast.info(this.translate.instant('i18n_sections_reordered'));
                },
                error: (err) => this.toast.error(err),
            });
        }
    };

    addNewSection = () => {
        this.Exam.addSection$(this.exam, this.collaborative)
            .pipe(
                tap((es) => {
                    this.toast.success(this.translate.instant('i18n_section_added'));
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
                    this.toast.info(this.translate.instant('i18n_exam_saved'));
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
                    this.toast.info(this.translate.instant('i18n_section_removed'));
                    this.exam.examSections.splice(this.exam.examSections.indexOf(section), 1);
                },
                error: (err) => this.toast.error(err),
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

    private updateIndices = () => this.exam.examSections.forEach((es, i) => (es.sequenceNumber = i));

    private init = () => {
        this.exam.examSections.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
        this.loadMaterials();
    };
}
