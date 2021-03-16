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
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as toast from 'toastr';

import { SessionService } from '../../../session/session.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { FileService } from '../../../utility/file/file.service';
import { Exam } from '../../exam.model';
import { ExamService } from '../../exam.service';
import { ExamTabService } from '../examTabs.service';

import type { OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import type { ExamType, GradeScale } from '../../exam.model';
@Component({
    selector: 'basic-exam-info',
    templateUrl: './basicExamInfo.component.html',
})
export class BasicExamInfoComponent implements OnInit, OnDestroy, OnChanges {
    @Input() exam: Exam;
    @Input() collaborative: boolean;

    byodExaminationSupported = false;
    anonymousReviewEnabled: boolean;
    gradeScaleSetting: { overridable: boolean };
    examTypes: (ExamType & { name: string })[] = [];
    gradeScales: GradeScale[] = [];
    pwdInputType = 'password';

    unsubscribe = new Subject<unknown>();

    constructor(
        private http: HttpClient,
        private state: StateService,
        private translate: TranslateService,
        private Exam: ExamService,
        private ExamTabs: ExamTabService,
        private Attachment: AttachmentService,
        private Files: FileService,
        private Session: SessionService,
        private Tabs: ExamTabService,
    ) {
        this.translate.onTranslationChange.pipe(takeUntil(this.unsubscribe)).subscribe(() => {
            this.refreshExamTypes();
            this.refreshGradeScales();
        });
    }

    ngOnInit() {
        this.refreshExamTypes();
        this.refreshGradeScales();
        this.http
            .get<{ isByodExaminationSupported: boolean }>('/app/settings/byod')
            .subscribe((setting) => (this.byodExaminationSupported = setting.isByodExaminationSupported));
        this.http
            .get<{ overridable: boolean }>('/app/settings/gradescale')
            .subscribe((setting) => (this.gradeScaleSetting = setting));
        this.http
            .get<{ anonymousReviewEnabled: boolean }>('/app/settings/anonymousReviewEnabled')
            .subscribe((setting) => (this.anonymousReviewEnabled = setting.anonymousReviewEnabled));
        this.initGradeScale();
        this.Tabs.notifyTabChange(1);
    }

    ngOnChanges = (changes: SimpleChanges) => {
        if (changes.exam) {
            this.initGradeScale();
        }
    };

    ngOnDestroy = () => {
        this.unsubscribe.next();
        this.unsubscribe.complete();
    };

    updateExam = (resetAutoEvaluationConfig: boolean) => {
        this.Exam.updateExam$(this.exam, {}, this.collaborative).subscribe(
            () => {
                toast.info(this.translate.instant('sitnet_exam_saved'));
                if (resetAutoEvaluationConfig) {
                    delete this.exam.autoEvaluationConfig;
                }
                const code = this.exam.course ? this.exam.course.code : null;
                this.ExamTabs.notifyExamUpdate({
                    name: this.exam.name,
                    code: code,
                    scaleChange: resetAutoEvaluationConfig,
                });
            },
            (resp) => toast.error(resp),
        );
    };

    onCourseChange = () => {
        this.initGradeScale(); //  Grade scale might need changing based on new course
        const code = this.exam.course ? this.exam.course.code : null;
        this.ExamTabs.notifyExamUpdate({
            name: this.exam.name,
            code: code,
            scaleChange: false,
        });
    };

    getExecutionTypeTranslation = () => !this.exam || this.Exam.getExecutionTypeTranslation(this.exam.executionType);

    getExaminationTypeName = () => {
        switch (this.exam.implementation) {
            case 'AQUARIUM':
                return 'sitnet_examination_type_aquarium';
            case 'CLIENT_AUTH':
                return 'sitnet_examination_type_seb';
            case 'WHATEVER':
                return 'sitnet_examination_type_home_exam';
        }
    };

    checkExamType = (type: string) => (this.exam.examType.type === type ? 'btn-primary' : '');

    setExamType = (type: string) => {
        this.exam.examType.type = type;
        this.updateExam(false);
    };

    getSelectableScales = () => {
        if (!this.gradeScales || !this.exam || !this.gradeScaleSetting) {
            return [];
        }

        return this.gradeScales.filter((scale: GradeScale) => {
            if (this.gradeScaleSetting.overridable) {
                return true;
            } else if (this.exam.course && this.exam.course.gradeScale) {
                return this.exam.course.gradeScale.id === scale.id;
            } else {
                return true;
            }
        });
    };

    checkScale = (scale: GradeScale) => {
        if (!this.exam.gradeScale) {
            return '';
        }
        return this.exam.gradeScale.id === scale.id ? 'btn-primary' : '';
    };

    toggleAnonymous = () => this.updateExam(false);

    toggleAnonymousDisabled = () =>
        !this.Session.getUser().isAdmin ||
        !this.Exam.isAllowedToUnpublishOrRemove(this.exam, this.collaborative) ||
        this.collaborative;

    checkScaleDisabled = (scale: GradeScale) => {
        if (!scale || !this.exam.course || !this.exam.course.gradeScale) {
            return false;
        }
        return !this.gradeScaleSetting.overridable && this.exam.course.gradeScale.id === scale.id;
    };

    setScale = (grading: GradeScale) => {
        this.exam.gradeScale = grading;
        this.updateExam(true);
    };

    showAnonymousReview = () =>
        this.collaborative || (this.exam.executionType.type === 'PUBLIC' && this.anonymousReviewEnabled);

    selectAttachmentFile = () => {
        this.Attachment.selectFile(true, {}).then((data) => {
            const url = this.collaborative ? '/integration/iop/attachment/exam' : '/app/attachment/exam';
            this.Files.upload(url, data.$value.attachmentFile, { examId: this.exam.id.toString() }, this.exam);
        });
    };

    togglePasswordInputType = () => (this.pwdInputType = this.pwdInputType === 'text' ? 'password' : 'text');

    downloadExamAttachment = () => this.Attachment.downloadExamAttachment(this.exam, this.collaborative);

    removeExamAttachment = () => this.Attachment.removeExamAttachment(this.exam, this.collaborative);

    removeExam = () => this.Exam.removeExam(this.exam, this.collaborative);

    nextTab = () => {
        this.Tabs.notifyTabChange(3);
        this.state.go('examEditor.sections');
    };

    showDelete = () => {
        if (this.collaborative) {
            return this.Session.getUser().isAdmin;
        }
        return this.exam.executionType.type === 'PUBLIC';
    };

    private refreshExamTypes = () => {
        this.Exam.refreshExamTypes$().subscribe((types) => {
            // Maturity can only have a FINAL type
            if (this.exam.executionType.type === 'MATURITY') {
                types = types.filter((t) => t.type === 'FINAL');
            }
            this.examTypes = types;
        });
    };

    private refreshGradeScales = () => {
        this.Exam.refreshGradeScales$(this.collaborative).subscribe((scales: GradeScale[]) => {
            this.gradeScales = scales;
        });
    };

    private initGradeScale = () => {
        // Set exam grade scale from course default if not specifically set for exam
        if (!this.exam.gradeScale && this.exam.course && this.exam.course.gradeScale) {
            this.exam.gradeScale = this.exam.course.gradeScale;
        }
    };
}
