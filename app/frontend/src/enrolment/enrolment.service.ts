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
import * as uib from 'angular-ui-bootstrap';
import * as _ from 'lodash';
import * as toast from 'toastr';

import { Exam } from '../exam/exam.model';
import { User } from '../session/session.service';
import { EnrolmentInfo, ExamEnrolment } from './enrolment.model';
import { StateService } from '@uirouter/core';

export class EnrolmentService {
    constructor(
        private $translate: ng.translate.ITranslateService,
        private $q: ng.IQService,
        private $http: ng.IHttpService,
        private $state: StateService,
        private $uibModal: uib.IModalService,
        private Language: any,
    ) {
        'ngInject';
    }

    private getMaturityInstructions(exam: Exam): Promise<{ instructions: string | null }> {
        if (exam.examLanguages.length !== 1) {
            console.warn('Exam has no exam languages or it has several!');
        }
        return new Promise<{ instructions: string | null }>((resolve, reject) => {
            if (exam.executionType.type !== 'MATURITY') {
                return resolve({ instructions: null });
            }
            const lang = exam.examLanguages.length > 0 ? exam.examLanguages[0].code : 'fi';
            this.$http
                .get(`/app/settings/maturityInstructions?lang=${lang}`)
                .then((resp: ng.IHttpResponse<{ value: string }>) => {
                    resolve({ instructions: resp.data.value || 'N/A' });
                })
                .catch(resp => {
                    toast.error(resp.data);
                    reject();
                });
        });
    }

    private getResource = (path: string, collaborative: boolean) =>
        (collaborative ? '/integration/iop/enrolments/' : '/app/enrolments/') + path;

    enroll(exam: Exam, collaborative = false): ng.IPromise<any> {
        const deferred = this.$q.defer();
        this.$http
            .post(this.getResource(`${exam.id}`, collaborative), { code: exam.course ? exam.course.code : undefined })
            .then(() => {
                toast.success(
                    this.$translate.instant('sitnet_you_have_enrolled_to_exam') +
                        '<br/>' +
                        this.$translate.instant('sitnet_remember_exam_machine_reservation'),
                );
                this.$state.go(collaborative ? 'collaborativeCalendar' : 'calendar', { id: exam.id });
                deferred.resolve();
            })
            .catch(error => {
                toast.error(error.data);
                deferred.reject(error);
            });
        return deferred.promise;
    }

    getEnrolments(examId: number, collaborative = false): ng.IPromise<ExamEnrolment[]> {
        const deferred: ng.IDeferred<ExamEnrolment[]> = this.$q.defer();
        this.$http
            .get(this.getResource(`exam/${examId}`, collaborative))
            .then((resp: ng.IHttpResponse<ExamEnrolment[]>) => {
                deferred.resolve(resp.data);
            })
            .catch(() => deferred.reject());
        return deferred.promise;
    }

    checkAndEnroll(exam: Exam, collaborative = false): ng.IPromise<any> {
        const deferred = this.$q.defer();
        this.$http
            .get(this.getResource(`exam/${exam.id}`, collaborative))
            .then(() => {
                toast.error(this.$translate.instant('sitnet_already_enrolled'));
                deferred.reject();
            })
            .catch((err: ng.IHttpResponse<any>) => {
                if (err.status === 403) {
                    toast.error(err.data);
                    deferred.reject(err);
                } else if (err.status === 404) {
                    this.enroll(exam, collaborative)
                        .then(() => deferred.resolve())
                        .catch(error => deferred.reject(error));
                } else {
                    deferred.resolve();
                }
            });
        return deferred.promise;
    }

    enrollStudent(exam: Exam, student: User): ng.IPromise<ExamEnrolment> {
        const deferred: ng.IDeferred<ExamEnrolment> = this.$q.defer();
        const data = { uid: student.id, email: student.email };
        this.$http
            .post(`/app/enrolments/student/${exam.id}`, data)
            .then((resp: ng.IHttpResponse<ExamEnrolment>) => {
                toast.success(this.$translate.instant('sitnet_student_enrolled_to_exam'));
                deferred.resolve(resp.data);
            })
            .catch(err => deferred.reject(err));
        return deferred.promise;
    }

    getEnrolmentInfo(code: string, id: number): ng.IPromise<EnrolmentInfo> {
        const deferred: ng.IDeferred<EnrolmentInfo> = this.$q.defer();
        this.$http
            .get(`/app/enrolments/${id}?code=${code}`)
            .then((resp: ng.IHttpResponse<Exam>) => {
                const exam = resp.data;
                this.getMaturityInstructions(exam)
                    .then(data => {
                        const info: EnrolmentInfo = _.assign(exam, {
                            languages: exam.examLanguages.map(el => this.Language.getLanguageNativeName(el.code)),
                            maturityInstructions: data.instructions,
                            alreadyEnrolled: false,
                            reservationMade: false,
                            noTrialsLeft: false,
                        });
                        this.$http
                            .get(`/app/enrolments/exam/${exam.id}`)
                            .then((resp: ng.IHttpResponse<ExamEnrolment[]>) => {
                                info.alreadyEnrolled = true;
                                info.reservationMade = resp.data.some(e => e.reservation);
                                deferred.resolve(info);
                            })
                            .catch((err: ng.IHttpResponse<any>) => {
                                info.alreadyEnrolled = err.status !== 404;
                                if (err.status === 403) {
                                    info.noTrialsLeft = true;
                                }
                                info.reservationMade = false;
                                deferred.resolve(info);
                            });
                    })
                    .catch(resp => deferred.reject(resp));
            })
            .catch(resp => deferred.reject(resp));

        return deferred.promise;
    }

    private check(info: EnrolmentInfo): ng.IPromise<EnrolmentInfo> {
        const deferred: ng.IDeferred<EnrolmentInfo> = this.$q.defer();
        this.$http
            .get(`/app/enrolments/exam/${info.id}`)
            .then((resp: ng.IHttpResponse<ExamEnrolment[]>) => {
                // check if student has reservation
                info.reservationMade = resp.data.some(e => e.reservation);
                // enrolled to exam
                info.alreadyEnrolled = true;
                deferred.resolve(info);
            })
            .catch(() => {
                // not enrolled or made reservations
                info.alreadyEnrolled = false;
                info.reservationMade = false;
                deferred.resolve(info);
            });
        return deferred.promise;
    }

    private checkEnrolments(infos: EnrolmentInfo[]): ng.IPromise<EnrolmentInfo[]> {
        const deferred: ng.IDeferred<EnrolmentInfo[]> = this.$q.defer();
        const promises: ng.IPromise<EnrolmentInfo>[] = [];
        infos.forEach(i => promises.push(this.check(i)));
        this.$q
            .all(promises)
            .then(() => deferred.resolve(infos))
            .catch(angular.noop);
        return deferred.promise;
    }

    listEnrolments(code: string, id: number): ng.IPromise<EnrolmentInfo[]> {
        const deferred: ng.IDeferred<EnrolmentInfo[]> = this.$q.defer();
        this.$http
            .get(`/app/enrolments?code=${code}`)
            .then((resp: ng.IHttpResponse<Exam[]>) => {
                const exams = resp.data.filter(e => e.id !== id);
                const infos: EnrolmentInfo[] = exams.map(e =>
                    _.assign(e, {
                        languages: e.examLanguages.map(el => this.Language.getLanguageNativeName(el.code)),
                        maturityInstructions: null,
                        alreadyEnrolled: false,
                        reservationMade: false,
                        noTrialsLeft: false,
                    }),
                );
                this.checkEnrolments(infos)
                    .then(function(data) {
                        deferred.resolve(data);
                    })
                    .catch(err => toast.error(err.data));
            })
            .catch(err => {
                toast.error(err.data);
                deferred.reject();
            });
        return deferred.promise;
    }

    removeEnrolment = (enrolment: ExamEnrolment) => this.$http.delete(`/app/enrolments/${enrolment.id}`);

    addEnrolmentInformation(enrolment: ExamEnrolment): void {
        this.$uibModal
            .open({
                backdrop: 'static',
                keyboard: true,
                component: 'addEnrolmentInformationDialog',
                resolve: {
                    information: () => enrolment.information,
                },
            })
            .result.then((information: string) => {
                this.$http.put(`/app/enrolments/${enrolment.id}`, { information: information }).then(() => {
                    toast.success(this.$translate.instant('sitnet_saved'));
                    enrolment.information = information;
                });
            })
            .catch(angular.noop);
    }

    getRoomInstructions = (hash: string) => this.$http.get(`/app/enrolments/room/${hash}`);

    showInstructions = (enrolment: ExamEnrolment) => {
        this.$uibModal
            .open({
                backdrop: 'static',
                keyboard: true,
                component: 'showInstructionsDialog',
                resolve: {
                    title: () => 'sitnet_instructions',
                    instructions: () => enrolment.exam.enrollInstruction,
                },
            })
            .result.catch(angular.noop);
    };

    showMaturityInstructions = (enrolment: ExamEnrolment) => {
        this.getMaturityInstructions(enrolment.exam)
            .then(resp => {
                this.$uibModal
                    .open({
                        backdrop: 'static',
                        keyboard: true,
                        component: 'showInstructionsDialog',
                        resolve: {
                            title: () => 'sitnet_maturity_instructions',
                            instructions: () => resp.instructions,
                        },
                    })
                    .result.catch(angular.noop);
            })
            .catch(err => toast.error(err.data));
    };
}

angular.module('app.enrolment').service('Enrolment', EnrolmentService);
