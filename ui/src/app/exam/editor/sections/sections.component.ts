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
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { catchError, tap } from 'rxjs/operators';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { ExamMaterial, ExamSection } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { SessionService } from 'src/app/session/session.service';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { SectionComponent } from './section.component';

@Component({
    selector: 'xm-sections',
    templateUrl: './sections.component.html',
    imports: [CdkDropList, CdkDrag, CdkDragPlaceholder, CdkDragPreview, SectionComponent, TranslateModule, OrderByPipe],
    styleUrls: ['../../exam.shared.scss', './sections.component.scss', './sections.shared.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionsComponent {
    readonly exam = computed(() => this.Tabs.examSignal()!);
    readonly collaborative = signal(false);
    readonly materials = signal<ExamMaterial[]>([]);

    private readonly http = inject(HttpClient);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Exam = inject(ExamService);
    private readonly Session = inject(SessionService);
    private readonly Tabs = inject(ExamTabService);

    constructor() {
        this.collaborative.set(this.Tabs.isCollaborative());
        this.Tabs.notifyTabChange(2);
        this.init();
    }

    loadMaterials() {
        this.http.get<ExamMaterial[]>('/app/materials').subscribe((resp) => this.materials.set(resp));
    }

    moveSection(event: CdkDragDrop<ExamSection[]>) {
        const currentExam = this.exam();
        const [from, to] = [event.previousIndex, event.currentIndex];
        if (from >= 0 && to >= 0 && from !== to) {
            this.Exam.reorderSections$(from, to, currentExam, this.collaborative()).subscribe({
                next: () => {
                    const reordered = [...currentExam.examSections];
                    moveItemInArray(reordered, from, to);
                    const updated = {
                        ...currentExam,
                        examSections: reordered.map((es, i) => ({ ...es, sequenceNumber: i })),
                    };
                    this.Tabs.setExam(updated);
                    this.toast.info(this.translate.instant('i18n_sections_reordered'));
                },
                error: (err) => this.toast.error(err),
            });
        }
    }

    addNewSection() {
        const currentExam = this.exam();
        this.Exam.addSection$(currentExam, this.collaborative())
            .pipe(
                tap((es) => {
                    this.toast.success(this.translate.instant('i18n_section_added'));
                    const updated = {
                        ...currentExam,
                        examSections: [...currentExam.examSections, es],
                    };
                    this.Tabs.setExam(updated);
                }),
                catchError(async (resp) => this.toast.error(resp)),
            )
            .subscribe();
    }

    updateExam(silent: boolean) {
        this.Tabs.saveExam$({}, silent).subscribe();
    }

    previewExam(fromTab: number) {
        this.Exam.previewExam(this.exam(), fromTab, this.collaborative());
    }

    removeExam() {
        this.Exam.removeExam(this.exam(), this.collaborative(), this.Session.getUser().isAdmin);
    }

    removeSection(section: ExamSection) {
        const currentExam = this.exam();
        this.http
            .delete(this.Exam.getResource(`/app/exams/${currentExam.id}/sections/${section.id}`, this.collaborative()))
            .subscribe({
                next: () => {
                    this.toast.info(this.translate.instant('i18n_section_removed'));
                    const updated = {
                        ...currentExam,
                        examSections: currentExam.examSections.filter((s) => s.id !== section.id),
                    };
                    this.Tabs.setExam(updated);
                },
                error: (err) => this.toast.error(err),
            });
    }

    updateSection(updatedSection: ExamSection) {
        const currentExam = this.exam();
        const index = currentExam.examSections.findIndex((s) => s.id === updatedSection.id);
        if (index >= 0) {
            const updated = {
                ...currentExam,
                examSections: [
                    ...currentExam.examSections.slice(0, index),
                    updatedSection,
                    ...currentExam.examSections.slice(index + 1),
                ],
            };
            this.Tabs.setExam(updated);
        }
    }

    calculateExamMaxScore() {
        return this.Exam.getMaxScore(this.exam());
    }

    nextTab() {
        this.Tabs.notifyTabChange(3);
        this.router.navigate(['..', '3'], { relativeTo: this.route });
    }

    previousTab() {
        this.Tabs.notifyTabChange(1);
        this.router.navigate(['..', '1'], { relativeTo: this.route });
    }

    showDelete() {
        if (this.collaborative()) {
            return this.Session.getUser().isAdmin;
        }
        return this.exam().executionType.type === 'PUBLIC';
    }

    private init() {
        const currentExam = this.exam();
        const sorted = [...currentExam.examSections].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
        const updated = {
            ...currentExam,
            examSections: sorted,
        };
        this.Tabs.setExam(updated);
        this.loadMaterials();
    }
}
