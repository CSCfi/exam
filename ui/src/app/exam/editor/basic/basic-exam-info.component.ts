// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { switchMap } from 'rxjs/operators';
import { LanguageSelectorComponent } from 'src/app/exam/editor/common/language-picker.component';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { Course, ExamLanguage, ExamType, GradeScale } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { Software } from 'src/app/facility/facility.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import type { Attachment } from 'src/app/shared/attachment/attachment.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { CKEditorComponent } from 'src/app/shared/ckeditor/ckeditor.component';
import { FileService } from 'src/app/shared/file/file.service';
import { ExamCourseComponent } from './exam-course.component';
import { ExamInspectorSelectorComponent } from './exam-inspector-picker.component';
import { ExamOwnerSelectorComponent } from './exam-owner-picker.component';
import { SoftwareSelectorComponent } from './software-picker.component';

@Component({
    selector: 'xm-basic-exam-info',
    templateUrl: './basic-exam-info.component.html',
    styleUrls: ['../../exam.shared.scss'],
    imports: [
        NgbPopover,
        ExamCourseComponent,
        LanguageSelectorComponent,
        ExamOwnerSelectorComponent,
        ExamInspectorSelectorComponent,
        SoftwareSelectorComponent,
        CKEditorComponent,
        TranslateModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicExamInfoComponent {
    readonly exam = computed(() => this.ExamTabs.examSignal()!);
    readonly collaborative = signal(false);
    readonly byodExaminationSupported = signal(false);
    readonly anonymousReviewEnabled = signal(false);
    readonly gradeScaleSetting = signal({ overridable: false });
    readonly examTypes = signal<(ExamType & { name: string })[]>([]);
    readonly gradeScales = signal<GradeScale[]>([]);
    readonly pwdInputType = signal('password');
    readonly user: User;

    private readonly http = inject(HttpClient);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly Exam = inject(ExamService);
    private readonly ExamTabs = inject(ExamTabService);
    private readonly Attachment = inject(AttachmentService);
    private readonly Files = inject(FileService);
    private readonly Session = inject(SessionService);

    constructor() {
        this.user = this.Session.getUser();
        this.collaborative.set(this.ExamTabs.isCollaborative());
        this.http
            .get<{ homeExaminationSupported: boolean; sebExaminationSupported: boolean }>('/app/settings/byod')
            .subscribe((setting) =>
                this.byodExaminationSupported.set(setting.homeExaminationSupported || setting.sebExaminationSupported),
            );
        this.http
            .get<{ overridable: boolean }>('/app/settings/gradescale')
            .subscribe((setting) => this.gradeScaleSetting.set(setting));
        this.http
            .get<{ anonymousReviewEnabled: boolean }>('/app/settings/anonymousReviewEnabled')
            .subscribe((setting) => this.anonymousReviewEnabled.set(setting.anonymousReviewEnabled));
        this.ExamTabs.notifyTabChange(1);
    }

    onExamNameInput = (event: Event) => this.updateExamName((event.target as HTMLInputElement).value);

    onExamAnonymousChange = (event: Event) => {
        this.updateExamAnonymous((event.target as HTMLInputElement).checked);
        this.toggleAnonymous();
    };

    onInternalRefInput = (event: Event) => this.updateInternalRef((event.target as HTMLInputElement).value);

    updateExam = () => this.ExamTabs.saveExam$().subscribe();

    onCourseChange(course: Course) {
        const currentExam = this.exam();
        const gradeScale =
            !this.gradeScaleSetting().overridable && !this.collaborative()
                ? (course.gradeScale ?? currentExam.gradeScale)
                : currentExam.gradeScale;
        this.ExamTabs.setExam({ ...currentExam, course, gradeScale });
    }

    updateExamName(value: string) {
        const currentExam = this.exam();
        this.ExamTabs.setExam({ ...currentExam, name: value });
        this.updateExam();
    }

    updateExamAnonymous(value: boolean) {
        const currentExam = this.exam();
        this.ExamTabs.setExam({ ...currentExam, anonymous: value });
        this.updateExam();
    }

    updateInternalRef(value: string) {
        const currentExam = this.exam();
        this.ExamTabs.setExam({ ...currentExam, internalRef: value });
        this.updateExam();
    }

    setSubjectToLanguageInspection(value: boolean) {
        const currentExam = this.exam();
        this.ExamTabs.setExam({ ...currentExam, subjectToLanguageInspection: value });
        this.updateExam();
    }

    enrollInstructionsChanged(event: string) {
        const currentExam = this.exam();
        this.ExamTabs.setExam({ ...currentExam, enrollInstruction: event });
    }

    instructionChanged(event: string) {
        const currentExam = this.exam();
        this.ExamTabs.setExam({ ...currentExam, instruction: event });
    }

    getExecutionTypeTranslation() {
        const currentExam = this.exam();
        return currentExam ? this.Exam.getExecutionTypeTranslation(currentExam.executionType) : '';
    }

    getExaminationTypeName() {
        const currentExam = this.exam();
        switch (currentExam.implementation) {
            case 'AQUARIUM':
                return 'i18n_examination_type_aquarium';
            case 'CLIENT_AUTH':
                return 'i18n_examination_type_seb';
            case 'WHATEVER':
                return 'i18n_examination_type_home_exam';
        }
    }

    toggleAnonymous() {
        this.updateExam();
    }

    toggleAnonymousDisabled() {
        const currentExam = this.exam();
        return (
            !this.Session.getUser().isAdmin ||
            !this.Exam.isAllowedToUnpublishOrRemove(currentExam, this.collaborative()) ||
            this.collaborative()
        );
    }

    showAnonymousReview() {
        const currentExam = this.exam();
        return this.collaborative() || (currentExam.executionType.type === 'PUBLIC' && this.anonymousReviewEnabled());
    }

    selectAttachmentFile() {
        this.Attachment.selectFile$(true, {})
            .pipe(
                switchMap((data) => {
                    const currentExam = this.exam();
                    const url = this.collaborative() ? '/app/iop/collab/attachment/exam' : '/app/attachment/exam';
                    return this.Files.upload$<Attachment>(url, data.$value.attachmentFile, {
                        examId: currentExam.id.toString(),
                    });
                }),
            )
            .subscribe((resp) => {
                this.ExamTabs.setExam({ ...this.exam(), attachment: resp });
            });
    }

    togglePasswordInputType() {
        this.pwdInputType.update((v) => (v === 'text' ? 'password' : 'text'));
    }

    downloadExamAttachment() {
        this.Attachment.downloadExamAttachment(this.exam(), this.collaborative());
    }

    removeExamAttachment() {
        this.Attachment.removeExamAttachment$(this.exam(), this.collaborative()).subscribe(() => {
            this.ExamTabs.setExam({ ...this.exam(), attachment: undefined });
        });
    }

    removeExam() {
        this.Exam.removeExam(this.exam(), this.collaborative(), this.Session.getUser().isAdmin);
    }

    nextTab() {
        this.ExamTabs.notifyTabChange(2);
        this.router.navigate(['..', '2'], { relativeTo: this.route });
    }

    showDelete() {
        const currentExam = this.exam();
        if (this.collaborative()) {
            return this.Session.getUser().isAdmin;
        }
        return currentExam.executionType.type === 'PUBLIC';
    }

    updateExamSoftwares(softwares: Software[]) {
        const currentExam = this.exam();
        this.ExamTabs.setExam({ ...currentExam, softwares });
    }

    updateExamLanguages(examLanguages: ExamLanguage[]) {
        const currentExam = this.exam();
        this.ExamTabs.setExam({ ...currentExam, examLanguages });
    }
}
