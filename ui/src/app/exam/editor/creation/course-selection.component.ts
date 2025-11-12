// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamCourseComponent } from 'src/app/exam/editor/basic/exam-course.component';
import { LanguageSelectorComponent } from 'src/app/exam/editor/common/language-picker.component';
import type { Course, Exam, ExamLanguage } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';

@Component({
    selector: 'xm-course-selection',
    templateUrl: './course-selection.component.html',
    imports: [
        NgbPopover,
        ExamCourseComponent,
        FormsModule,
        LanguageSelectorComponent,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseSelectionComponent {
    exam = signal<Exam | undefined>(undefined);

    private translate = inject(TranslateService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private http = inject(HttpClient);
    private toast = inject(ToastrService);
    private Exam = inject(ExamService);
    private Session = inject(SessionService);

    constructor() {
        this.http.get<Exam>(`/app/exams/${this.route.snapshot.params.id}`).subscribe((exam) => this.exam.set(exam));
    }

    getExecutionTypeTranslation() {
        const currentExam = this.exam();
        return currentExam ? this.Exam.getExecutionTypeTranslation(currentExam.executionType) : '';
    }

    updateExamName() {
        const currentExam = this.exam();
        if (!currentExam) return;
        this.Exam.updateExam$(currentExam).subscribe({
            next: () => this.toast.info(this.translate.instant('i18n_exam_saved')),
            error: (error) => {
                if (error.data) {
                    const msg = error.data.message || error.data;
                    this.toast.error(this.translate.instant(msg));
                }
            },
        });
    }

    updateExamNameValue(value: string) {
        const currentExam = this.exam();
        if (!currentExam) return;
        this.exam.set({ ...currentExam, name: value });
    }

    onCourseSelected(course: Course) {
        const currentExam = this.exam();
        if (!currentExam) return;
        this.http.put(`/app/exams/${currentExam.id}/course/${course.id}`, {}).subscribe(() => {
            this.toast.success(this.translate.instant('i18n_exam_associated_with_course'));
            this.exam.set({ ...currentExam, course });
        });
    }

    updateExamLanguages(examLanguages: ExamLanguage[]) {
        const currentExam = this.exam();
        if (!currentExam) return;
        this.exam.set({ ...currentExam, examLanguages });
    }

    cancelNewExam() {
        const currentExam = this.exam();
        if (!currentExam) return;
        this.http.delete(`/app/exams/${currentExam.id}`).subscribe(() => {
            this.toast.success(this.translate.instant('i18n_exam_removed'));
            this.router.navigate(['/staff', this.Session.getUser()?.isAdmin ? 'admin' : 'teacher']);
        });
    }

    continueToExam() {
        const currentExam = this.exam();
        if (!currentExam) return;
        this.router.navigate(['/staff/exams', currentExam.id, 1]);
    }
}
