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
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as toast from 'toastr';

import { SessionService } from '../../../session/session.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { ConfirmationDialogService } from '../../../utility/dialogs/confirmationDialog.service';
import { FileService } from '../../../utility/file/file.service';
import { Exam, ExamExecutionType, ExaminationEventConfiguration, GradeScale } from '../../exam.model';
import { ExamService } from '../../exam.service';
import { ExaminationEventDialogComponent } from '../events/examinationEventDialog.component';

export type UpdateProps = {
    props: {
        code: string | null;
        name: string | null;
        scaleChange: boolean;
    };
};

@Component({
    selector: 'basic-exam-info',
    template: require('./basicExamInfo.component.html'),
})
export class BasicExamInfoComponent implements OnInit, OnDestroy, OnChanges {
    @Input() exam: Exam;
    @Input() collaborative: boolean;
    @Output() onUpdate = new EventEmitter<UpdateProps>();
    @Output() onNextTabSelected = new EventEmitter<void>();

    anonymousReviewEnabled: boolean;
    gradeScaleSetting: { overridable: boolean };
    examTypes: ExamExecutionType[];
    gradeScales: GradeScale[];
    pwdInputType = 'password';

    unsubscribe = new Subject<unknown>();

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private Exam: ExamService,
        private modal: NgbModal,
        private Confirmation: ConfirmationDialogService,
        private Attachment: AttachmentService,
        private Files: FileService,
        private Session: SessionService,
    ) {
        this.translate.onTranslationChange.pipe(takeUntil(this.unsubscribe)).subscribe(() => {
            this.refreshExamTypes();
            this.refreshGradeScales();
        });
    }

    ngOnInit = () => {
        this.refreshExamTypes();
        this.refreshGradeScales();
        this.http
            .get<{ overridable: boolean }>('/app/settings/gradescale')
            .subscribe(setting => (this.gradeScaleSetting = setting));
        this.http
            .get<{ anonymousReviewEnabled: boolean }>('/app/settings/anonymousReviewEnabled')
            .subscribe(setting => (this.anonymousReviewEnabled = setting.anonymousReviewEnabled));
        this.initGradeScale();
    };

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
                this.onUpdate.emit({
                    props: {
                        name: this.exam.name,
                        code: code,
                        scaleChange: resetAutoEvaluationConfig,
                    },
                });
            },
            resp => toast.error(this.translate.instant(resp.error)),
        );
    };

    onCourseChange = () => {
        this.initGradeScale(); //  Grade scale might need changing based on new course
        const code = this.exam.course ? this.exam.course.code : null;
        this.onUpdate.emit({
            props: { name: this.exam.name, code: code, scaleChange: false },
        });
    };

    getExecutionTypeTranslation = () => !this.exam || this.Exam.getExecutionTypeTranslation(this.exam.executionType);

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

    toggleAnonymous = () => this.updateExam(false);

    toggleAnonymousDisabled = () =>
        !this.Session.getUser().isAdmin || !this.Exam.isAllowedToUnpublishOrRemove(this.exam, this.collaborative);

    selectAttachmentFile = () => {
        this.Attachment.selectFile(true, {}).then(data => {
            const url = this.collaborative ? '/integration/iop/attachment/exam' : '/app/attachment/exam';
            this.Files.upload(url, data.$value.attachmentFile, { examId: this.exam.id }, this.exam);
        });
    };

    togglePasswordInputType = () => (this.pwdInputType = this.pwdInputType === 'text' ? 'password' : 'text');

    addExaminationEvent = () => {
        this.modal
            .open(ExaminationEventDialogComponent, {
                backdrop: 'static',
                keyboard: true,
            })
            .result.then((data: ExaminationEventConfiguration) => {
                this.Exam.addExaminationEvent(this.exam.id, data).subscribe((config: ExaminationEventConfiguration) => {
                    this.exam.examinationEventConfigurations.push(config);
                });
            });
    };

    modifyExaminationEvent = (configuration: ExaminationEventConfiguration) => {
        const modalRef = this.modal.open(ExaminationEventDialogComponent, {
            backdrop: 'static',
            keyboard: true,
        });
        modalRef.componentInstance.config = configuration;
        modalRef.result.then((data: ExaminationEventConfiguration) => {
            this.Exam.updateExaminationEvent(this.exam.id, Object.assign(data, { id: configuration.id })).subscribe(
                (config: ExaminationEventConfiguration) => {
                    const index = this.exam.examinationEventConfigurations.indexOf(configuration);
                    console.log(index);
                    this.exam.examinationEventConfigurations.splice(index, 1, config);
                    console.log(this.exam.examinationEventConfigurations[0].settingsPassword);
                },
            );
        });
    };

    removeExaminationEvent = (configuration: ExaminationEventConfiguration) => {
        this.Confirmation.open(
            this.translate.instant('sitnet_remove_examination_event'),
            this.translate.instant('sitnet_are_you_sure'),
        ).result.then(() =>
            this.Exam.removeExaminationEvent(this.exam.id, configuration).subscribe(() => {
                this.exam.examinationEventConfigurations.splice(
                    this.exam.examinationEventConfigurations.indexOf(configuration),
                    1,
                );
            }),
        );
    };

    downloadExamAttachment = () => this.Attachment.downloadExamAttachment(this.exam, this.collaborative);

    removeExamAttachment = () => this.Attachment.removeExamAttachment(this.exam, this.collaborative);

    removeExam = () => this.Exam.removeExam(this.exam, this.collaborative);

    nextTab = () => this.onNextTabSelected.emit();

    showDelete = () => {
        if (this.collaborative) {
            return this.Session.getUser().isAdmin;
        }
        return this.exam.executionType.type === 'PUBLIC';
    };

    private refreshExamTypes = () => {
        this.Exam.refreshExamTypes().subscribe((types: ExamExecutionType[]) => {
            // Maturity can only have a FINAL type
            if (this.exam.executionType.type === 'MATURITY') {
                types = types.filter(t => t.type === 'FINAL');
            }
            this.examTypes = types;
        });
    };

    private refreshGradeScales = () => {
        this.Exam.refreshGradeScales(this.collaborative).subscribe((scales: GradeScale[]) => {
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
