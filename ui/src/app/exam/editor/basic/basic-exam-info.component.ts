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
import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnDestroy, OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { LanguageSelectorComponent } from 'src/app/exam/editor/common/language-picker.component';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { Exam, ExamType, GradeScale } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import type { User } from 'src/app/session/session.service';
import { SessionService } from 'src/app/session/session.service';
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
    standalone: true,
    imports: [
        ExamCourseComponent,
        NgbPopover,
        FormsModule,
        LanguageSelectorComponent,
        ExamOwnerSelectorComponent,
        NgClass,
        ExamInspectorSelectorComponent,
        SoftwareSelectorComponent,
        CKEditorComponent,
        TranslateModule,
    ],
})
export class BasicExamInfoComponent implements OnInit, OnDestroy {
    exam!: Exam;
    collaborative = false;
    byodExaminationSupported = false;
    anonymousReviewEnabled = false;
    gradeScaleSetting = { overridable: false };
    examTypes: (ExamType & { name: string })[] = [];
    gradeScales: GradeScale[] = [];
    pwdInputType = 'password';
    user: User;

    unsubscribe = new Subject<unknown>();

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        private router: Router,
        private translate: TranslateService,
        private toast: ToastrService,
        private Exam: ExamService,
        private ExamTabs: ExamTabService,
        private Attachment: AttachmentService,
        private Files: FileService,
        private Session: SessionService,
        private Tabs: ExamTabService,
    ) {
        this.user = this.Session.getUser();
    }

    ngOnInit() {
        this.exam = this.Tabs.getExam();
        this.collaborative = this.Tabs.isCollaborative();
        this.http
            .get<{ homeExaminationSupported: boolean; sebExaminationSupported: boolean }>('/app/settings/byod')
            .subscribe(
                (setting) =>
                    (this.byodExaminationSupported =
                        setting.homeExaminationSupported || setting.sebExaminationSupported),
            );
        this.http
            .get<{ overridable: boolean }>('/app/settings/gradescale')
            .subscribe((setting) => (this.gradeScaleSetting = setting));
        this.http
            .get<{ anonymousReviewEnabled: boolean }>('/app/settings/anonymousReviewEnabled')
            .subscribe((setting) => (this.anonymousReviewEnabled = setting.anonymousReviewEnabled));
        this.Tabs.notifyTabChange(1);
    }

    ngOnDestroy() {
        this.unsubscribe.next(undefined);
        this.unsubscribe.complete();
    }

    updateExam = (resetAutoEvaluationConfig: boolean) => {
        this.Exam.updateExam$(this.exam, {}, this.collaborative).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_exam_saved'));
                const code = this.exam.course ? this.exam.course.code : null;
                this.ExamTabs.notifyExamUpdate({
                    name: this.exam.name,
                    code: code,
                    scaleChange: resetAutoEvaluationConfig,
                    initScale: false,
                });
            },
            error: (err) => this.toast.error(err),
        });
    };

    onCourseChange = () => {
        const code = this.exam.course ? this.exam.course.code : null;
        this.ExamTabs.notifyExamUpdate({
            name: this.exam.name,
            code: code,
            scaleChange: !this.gradeScaleSetting.overridable,
            initScale: !this.gradeScaleSetting.overridable && !this.collaborative,
        });
    };

    getExecutionTypeTranslation = () => !this.exam || this.Exam.getExecutionTypeTranslation(this.exam.executionType);

    getExaminationTypeName = () => {
        switch (this.exam.implementation) {
            case 'AQUARIUM':
                return 'i18n_examination_type_aquarium';
            case 'CLIENT_AUTH':
                return 'i18n_examination_type_seb';
            case 'WHATEVER':
                return 'i18n_examination_type_home_exam';
        }
    };

    toggleAnonymous = () => this.updateExam(false);

    toggleAnonymousDisabled = () =>
        !this.Session.getUser().isAdmin ||
        !this.Exam.isAllowedToUnpublishOrRemove(this.exam, this.collaborative) ||
        this.collaborative;

    showAnonymousReview = () =>
        this.collaborative || (this.exam.executionType.type === 'PUBLIC' && this.anonymousReviewEnabled);

    selectAttachmentFile = () => {
        this.Attachment.selectFile(true, {}).then((data) => {
            const url = this.collaborative ? '/app/iop/collab/attachment/exam' : '/app/attachment/exam';
            this.Files.upload(url, data.$value.attachmentFile, { examId: this.exam.id.toString() }, this.exam);
        });
    };

    togglePasswordInputType = () => (this.pwdInputType = this.pwdInputType === 'text' ? 'password' : 'text');

    downloadExamAttachment = () => this.Attachment.downloadExamAttachment(this.exam, this.collaborative);

    removeExamAttachment = () => this.Attachment.removeExamAttachment(this.exam, this.collaborative);

    removeExam = () => this.Exam.removeExam(this.exam, this.collaborative, this.Session.getUser().isAdmin);

    nextTab = () => {
        this.Tabs.notifyTabChange(2);
        this.router.navigate(['..', '2'], { relativeTo: this.route });
    };

    showDelete = () => {
        if (this.collaborative) {
            return this.Session.getUser().isAdmin;
        }
        return this.exam.executionType.type === 'PUBLIC';
    };
}
