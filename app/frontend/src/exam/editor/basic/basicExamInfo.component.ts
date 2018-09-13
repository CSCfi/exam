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
/// <reference types="angular-dialog-service" />

import * as ng from 'angular';
import * as toast from 'toastr';
import { IModalService } from 'angular-ui-bootstrap';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { FileService } from '../../../utility/file/file.service';
import { Course, Exam, ExamExecutionType, GradeScale } from '../../exam.model';
import { SessionService } from '../../../session/session.service';

export const BasicExamInfoComponent: ng.IComponentOptions = {
    template: require('./basicExamInfo.template.html'),
    bindings: {
        exam: '<',
        collaborative: '<',
        onUpdate: '&',
        onNextTabSelected: '&'
    },
    controller: class BasicExamInfoController implements ng.IComponentController {

        exam: Exam;
        collaborative: boolean;
        anonymousReviewEnabled: boolean;
        onUpdate: (_: { props: { code: string | null, name: string | null } }) => any;
        onNextTabSelected: () => any;

        gradeScaleSetting: { overridable: boolean };
        examTypes: ExamExecutionType[];
        gradeScales: GradeScale[];

        constructor(
            private $location: ng.ILocationService,
            private $scope: ng.IScope,
            private $translate: ng.translate.ITranslateService,
            private $uibModal: IModalService,
            private dialogs: angular.dialogservice.IDialogService,
            private Exam: any,
            private ExamRes: any,
            private SettingsResource: any,
            private Attachment: AttachmentService,
            private Files: FileService,
            private Session: SessionService
        ) {
            'ngInject';

            $scope.$on('$localeChangeSuccess', () => {
                this.refreshExamTypes();
                this.refreshGradeScales();
            });

        }

        $onInit = () => {
            this.refreshExamTypes();
            this.refreshGradeScales();
            this.SettingsResource.gradeScale.get((data) => {
                this.gradeScaleSetting = data;
            });
            this.SettingsResource.anonymousReviewEnabled.get((data) => {
                this.anonymousReviewEnabled = data.anonymousReviewEnabled;
            });
            this.initGradeScale();
        }

        $onChanges = (props: { exam?: Exam }) => {
            if (props.exam) {
                this.initGradeScale();
            }
        }

        updateExam = (resetAutoEvaluationConfig: boolean) => {
            this.Exam.updateExam(this.exam, {}, this.collaborative).then(() => {
                toast.info(this.$translate.instant('sitnet_exam_saved'));
                if (resetAutoEvaluationConfig) {
                    delete this.exam.autoEvaluationConfig;
                }
                const code = this.exam.course ? this.exam.course.code : null;
                this.onUpdate({ props: { name: this.exam.name, code: code } });
            }, (error) => {
                if (error.data) {
                    const msg = error.data.message || error.data;
                    toast.error(this.$translate.instant(msg));
                }
            });
        }

        onCourseChange = (course: Course) => {
            this.exam.course = course;
            this.initGradeScale(); //  Grade scale might need changing based on new course
            const code = this.exam.course ? this.exam.course.code : null;
            this.onUpdate({ props: { name: this.exam.name, code: code } });
        }

        getExecutionTypeTranslation = () =>
            !this.exam || this.Exam.getExecutionTypeTranslation(this.exam.executionType.type)


        checkExamType = (type: string) =>
            this.exam.examType.type === type ? 'btn-primary' : ''

        setExamType = (type: string) => {
            this.exam.examType.type = type;
            this.updateExam(false);
        }

        getSelectableScales = () => {
            if (!this.gradeScales || !this.exam || angular.isUndefined(this.gradeScaleSetting)) {
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
        }

        checkScale = (scale: GradeScale) => {
            if (!this.exam.gradeScale) {
                return '';
            }
            return this.exam.gradeScale.id === scale.id ? 'btn-primary' : '';
        }

        checkScaleDisabled = (scale: GradeScale) => {
            if (!scale || !this.exam.course || !this.exam.course.gradeScale) {
                return false;
            }
            return !this.gradeScaleSetting.overridable && this.exam.course.gradeScale.id === scale.id;
        }

        setScale = (grading: GradeScale) => {
            this.exam.gradeScale = grading;
            this.updateExam(true);
        }

        showAnonymousReview = () => {
            return this.collaborative || (this.exam.executionType.type === 'PUBLIC' && this.anonymousReviewEnabled);
        }

        toggleAnonymous = () => {
            this.updateExam(false);
        }

        toggleAnonymousDisabled = () => {
            return !this.Session.getUser().isAdmin ||
                !this.isAllowedToUnpublishOrRemove();
        }

        selectAttachmentFile = () => {
            this.$uibModal.open({
                backdrop: 'static',
                keyboard: true,
                animation: true,
                component: 'attachmentSelector',
                resolve: {
                    isTeacherModal: () => true
                }
            }).result.then((data) => {
                let url = this.collaborative ? '/integration/iop/attachment/exam' : '/app/attachment/exam';
                this.Files.upload(url,
                    data.attachmentFile, { examId: this.exam.id }, this.exam);
            });
        }

        downloadExamAttachment = () => {
            this.Attachment.downloadExamAttachment(this.exam, this.collaborative);
        }

        removeExamAttachment = () => {
            this.Attachment.removeExamAttachment(this.exam, this.collaborative);
        }

        removeExam = (canRemoveWithoutConfirmation: boolean) => {
            if (this.isAllowedToUnpublishOrRemove()) {
                const fn = () => {
                    this.ExamRes.exams.remove({ id: this.exam.id }, () => {
                        toast.success(this.$translate.instant('sitnet_exam_removed'));
                        this.$location.path('/');
                    }, error => toast.error(error.data));
                };
                if (canRemoveWithoutConfirmation) {
                    fn();
                } else {
                    const dialog = this.dialogs.confirm(this.$translate.instant('sitnet_confirm'),
                        this.$translate.instant('sitnet_remove_exam'));
                    dialog.result.then(() => fn());
                }
            } else {
                toast.warning(this.$translate.instant('sitnet_exam_removal_not_possible'));
            }
        }

        nextTab = () => this.onNextTabSelected();

        private refreshExamTypes = () => {
            this.Exam.refreshExamTypes().then((types: ExamExecutionType[]) => {
                // Maturity can only have a FINAL type
                if (this.exam.executionType.type === 'MATURITY') {
                    types = types.filter(t => t.type === 'FINAL');
                }
                this.examTypes = types;
            });
        }

        private refreshGradeScales = () => {
            this.Exam.refreshGradeScales().then((scales: GradeScale[]) => {
                this.gradeScales = scales;
            });
        }

        private initGradeScale = () => {
            // Set exam grade scale from course default if not specifically set for exam
            if (!this.exam.gradeScale && this.exam.course && this.exam.course.gradeScale) {
                this.exam.gradeScale = this.exam.course.gradeScale;
            }
        }

        private isAllowedToUnpublishOrRemove = () =>
            // allowed if no upcoming reservations and if no one has taken this yet
            !this.exam.hasEnrolmentsInEffect && this.exam.children.length === 0

    }
};

angular.module('app.exam.editor').component('basicExamInfo', BasicExamInfoComponent);
