// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { switchMap } from 'rxjs/operators';
import { LanguageSelectorComponent } from 'src/app/exam/editor/common/language-picker.component';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { Exam, ExamLanguage, ExamType, GradeScale } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { Software } from 'src/app/facility/facility.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { Attachment } from 'src/app/shared/attachment/attachment.model';
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
    readonly exam = signal<Exam>({} as Exam);
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
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Exam = inject(ExamService);
    private readonly ExamTabs = inject(ExamTabService);
    private readonly Attachment = inject(AttachmentService);
    private readonly Files = inject(FileService);
    private readonly Session = inject(SessionService);
    private readonly Tabs = inject(ExamTabService);

    constructor() {
        this.user = this.Session.getUser();
        this.exam.set(this.Tabs.getExam());
        this.collaborative.set(this.Tabs.isCollaborative());
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
        this.Tabs.notifyTabChange(1);
    }

    onExamNameInput = (event: Event) => this.updateExamName((event.target as HTMLInputElement).value);

    onExamAnonymousChange = (event: Event) => {
        this.updateExamAnonymous((event.target as HTMLInputElement).checked);
        this.toggleAnonymous();
    };

    onInternalRefInput = (event: Event) => this.updateInternalRef((event.target as HTMLInputElement).value);

    updateExam(resetAutoEvaluationConfig: boolean) {
        const currentExam = this.exam();
        this.Exam.updateExam$(currentExam, {}, this.collaborative()).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_exam_saved'));
                this.ExamTabs.setExam(currentExam);
                const code = currentExam.course ? currentExam.course.code : null;
                this.ExamTabs.notifyExamUpdate({
                    name: currentExam.name,
                    code: code,
                    scaleChange: resetAutoEvaluationConfig,
                    initScale: false,
                });
            },
            error: (err) => this.toast.error(err),
        });
    }

    onCourseChange() {
        const currentExam = this.exam();
        const code = currentExam.course ? currentExam.course.code : null;
        this.ExamTabs.notifyExamUpdate({
            name: currentExam.name,
            code: code,
            scaleChange: !this.gradeScaleSetting().overridable,
            initScale: !this.gradeScaleSetting().overridable && !this.collaborative(),
        });
    }

    updateExamName(value: string) {
        const currentExam = this.exam();
        this.exam.set({ ...currentExam, name: value });
        this.updateExam(false);
    }

    updateExamAnonymous(value: boolean) {
        const currentExam = this.exam();
        this.exam.set({ ...currentExam, anonymous: value });
        this.updateExam(false);
    }

    updateInternalRef(value: string) {
        const currentExam = this.exam();
        this.exam.set({ ...currentExam, internalRef: value });
        this.updateExam(false);
    }

    setSubjectToLanguageInspection(value: boolean) {
        const currentExam = this.exam();
        this.exam.set({ ...currentExam, subjectToLanguageInspection: value });
        this.updateExam(false);
    }

    enrollInstructionsChanged(event: string) {
        const currentExam = this.exam();
        this.exam.set({ ...currentExam, enrollInstruction: event });
    }

    instructionChanged(event: string) {
        const currentExam = this.exam();
        this.exam.set({ ...currentExam, instruction: event });
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
        this.updateExam(false);
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
                const currentExam = this.exam();
                this.exam.set({ ...currentExam, attachment: resp });
            });
    }

    togglePasswordInputType() {
        this.pwdInputType.update((v) => (v === 'text' ? 'password' : 'text'));
    }

    downloadExamAttachment() {
        this.Attachment.downloadExamAttachment(this.exam(), this.collaborative());
    }

    removeExamAttachment() {
        this.Attachment.removeExamAttachment(this.exam(), this.collaborative());
    }

    removeExam() {
        this.Exam.removeExam(this.exam(), this.collaborative(), this.Session.getUser().isAdmin);
    }

    nextTab() {
        this.Tabs.notifyTabChange(2);
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
        this.exam.set({ ...currentExam, softwares });
    }

    updateExamLanguages(examLanguages: ExamLanguage[]) {
        const currentExam = this.exam();
        this.exam.set({ ...currentExam, examLanguages });
    }
}
