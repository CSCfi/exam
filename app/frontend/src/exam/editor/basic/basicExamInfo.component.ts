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
import * as ng from 'angular';
import { IModalService } from 'angular-ui-bootstrap';
import * as toast from 'toastr';

import { SessionService } from '../../../session/session.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { FileService } from '../../../utility/file/file.service';
import { Exam, ExamExecutionType, GradeScale } from '../../exam.model';

export const BasicExamInfoComponent: ng.IComponentOptions = {
    template: require('./basicExamInfo.template.html'),
    bindings: {
        exam: '<',
        collaborative: '<',
        onUpdate: '&',
        onNextTabSelected: '&',
    },
    controller: class BasicExamInfoController implements ng.IComponentController {
        exam: Exam;
        collaborative: boolean;
        anonymousReviewEnabled: boolean;
        onUpdate: (_: { props: { code: string | null; name: string | null; scaleChange: boolean } }) => any;
        onNextTabSelected: () => any;

        gradeScaleSetting: { overridable: boolean };
        byodExaminationSupported = false;
        examTypes: ExamExecutionType[];
        gradeScales: GradeScale[];
        pwdInputType = 'password';

        constructor(
            private $scope: ng.IScope,
            private $http: ng.IHttpService,
            private $translate: ng.translate.ITranslateService,
            private $uibModal: IModalService,
            private Exam: any,
            private SettingsResource: any,
            private Attachment: AttachmentService,
            private Files: FileService,
            private Session: SessionService,
        ) {
            'ngInject';

            this.$scope.$on('$localeChangeSuccess', () => {
                this.refreshExamTypes();
                this.refreshGradeScales();
            });
        }

        $onInit = () => {
            this.$http
                .get('/app/settings/byod')
                .then(
                    (resp: ng.IHttpResponse<{ isByodExaminationSupported: boolean }>) =>
                        (this.byodExaminationSupported = resp.data.isByodExaminationSupported),
                );
            this.refreshExamTypes();
            this.refreshGradeScales();
            this.SettingsResource.gradeScale.get(data => {
                this.gradeScaleSetting = data;
            });
            this.SettingsResource.anonymousReviewEnabled.get(data => {
                this.anonymousReviewEnabled = data.anonymousReviewEnabled;
            });
            this.initGradeScale();
        };

        $onChanges = (props: ng.IOnChangesObject) => {
            if (props.exam) {
                this.initGradeScale();
            }
        };

        updateExam = (resetAutoEvaluationConfig: boolean) => {
            this.Exam.updateExam(this.exam, {}, this.collaborative).then(
                () => {
                    toast.info(this.$translate.instant('sitnet_exam_saved'));
                    if (resetAutoEvaluationConfig) {
                        delete this.exam.autoEvaluationConfig;
                    }
                    const code = this.exam.course ? this.exam.course.code : null;
                    this.onUpdate({
                        props: { name: this.exam.name, code: code, scaleChange: resetAutoEvaluationConfig },
                    });
                },
                error => toast.error(error),
            );
        };

        onCourseChange = () => {
            this.initGradeScale(); //  Grade scale might need changing based on new course
            const code = this.exam.course ? this.exam.course.code : null;
            this.onUpdate({ props: { name: this.exam.name, code: code, scaleChange: false } });
        };

        getExecutionTypeTranslation = () =>
            !this.exam || this.Exam.getExecutionTypeTranslation(this.exam.executionType.type);

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
            if (!this.gradeScales || !this.exam || ng.isUndefined(this.gradeScaleSetting)) {
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
            !this.Session.getUser().isAdmin ||
            !this.Exam.isAllowedToUnpublishOrRemove(this.exam, this.collaborative) ||
            this.collaborative;

        togglePasswordInputType = () => (this.pwdInputType = this.pwdInputType === 'text' ? 'password' : 'text');

        selectAttachmentFile = () => {
            this.$uibModal
                .open({
                    backdrop: 'static',
                    keyboard: true,
                    animation: true,
                    component: 'attachmentSelector',
                    resolve: {
                        isTeacherModal: () => true,
                    },
                })
                .result.then(data => {
                    const url = this.collaborative ? '/integration/iop/attachment/exam' : '/app/attachment/exam';
                    this.Files.upload(url, data.attachmentFile, { examId: this.exam.id }, this.exam);
                });
        };

        downloadExamAttachment = () => this.Attachment.downloadExamAttachment(this.exam, this.collaborative);

        removeExamAttachment = () => this.Attachment.removeExamAttachment(this.exam, this.collaborative);

        removeExam = () => this.Exam.removeExam(this.exam, this.collaborative);

        nextTab = () => this.onNextTabSelected();

        showDelete = () => {
            if (this.collaborative) {
                return this.Session.getUser().isAdmin;
            }
            return this.exam.executionType.type === 'PUBLIC';
        };

        private refreshExamTypes = () => {
            this.Exam.refreshExamTypes().then((types: ExamExecutionType[]) => {
                // Maturity can only have a FINAL type
                if (this.exam.executionType.type === 'MATURITY') {
                    types = types.filter(t => t.type === 'FINAL');
                }
                this.examTypes = types;
            });
        };

        private refreshGradeScales = () => {
            this.Exam.refreshGradeScales(this.collaborative).then((scales: GradeScale[]) => {
                this.gradeScales = scales;
            });
        };

        private initGradeScale = () => {
            // Set exam grade scale from course default if not specifically set for exam
            if (!this.exam.gradeScale && this.exam.course && this.exam.course.gradeScale) {
                this.exam.gradeScale = this.exam.course.gradeScale;
            }
        };
    },
};

ng.module('app.exam.editor').component('basicExamInfo', BasicExamInfoComponent);
