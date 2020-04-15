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
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateParams } from '@uirouter/core';
import * as toast from 'toastr';

import isRealGrade, {
    Exam,
    ExamExecutionType,
    ExamLanguage,
    GradeScale,
    NoGrade,
    Participation,
    SelectableGrade,
} from '../../../exam/exam.model';
import { ExamService } from '../../../exam/exam.service';
import { Examination } from '../../../examination/examination.service';
import { User } from '../../../session/session.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { LanguageService } from '../../../utility/language/language.service';
import { AssessmentService } from '../assessment.service';
import { CollaborativeAssesmentService } from '../collaborativeAssessment.service';

@Component({
    selector: 'r-grading',
    template: require('./grading.component.html'),
})
export class GradingComponent implements OnInit {
    @Input() exam: Examination;
    @Input() questionSummary: any;
    @Input() participation: Participation;
    @Input() collaborative: boolean;
    @Input() user: User;
    @Output() onUpdate = new EventEmitter<unknown>();
    message: { text: string };
    selections: { grade: SelectableGrade; type: ExamExecutionType; language: ExamLanguage };
    grades: SelectableGrade[];
    creditTypes: ExamExecutionType[];
    languages: (ExamLanguage & { name: string })[];

    constructor(
        private translate: TranslateService,
        private stateParams: StateParams,
        private http: HttpClient,
        private Assessment: AssessmentService,
        private CollaborativeAssessment: CollaborativeAssesmentService,
        private Exam: ExamService,
        private Attachment: AttachmentService,
        private Language: LanguageService,
    ) {}

    ngOnInit() {
        this.initGrade();
        this.initCreditTypes();
        this.initLanguages();

        this.translate.onLangChange.subscribe(() => {
            this.initCreditTypes();
            this.grades.forEach(g => (g.name = this.Exam.getExamGradeDisplayName(g.type)));
        });
    }

    private resolveGradeScale = (): GradeScale => {
        if (this.exam.gradeScale) {
            return this.exam.gradeScale;
        } else if (this.exam.parent && this.exam.parent.gradeScale) {
            return this.exam.parent.gradeScale;
        } else if (this.exam.course && this.exam.course.gradeScale) {
            return this.exam.course.gradeScale;
        } else {
            throw Error('No GradeScale for Assessment!');
        }
    };

    private _setGrade = (grade: SelectableGrade) => {
        this.selections.grade = grade;
    };

    private initGrade = () => {
        const scale = this.resolveGradeScale();
        this.grades = scale.grades.map(grade => {
            return {
                ...grade,
                name: this.Exam.getExamGradeDisplayName(grade.name),
                type: grade.name,
            };
        });
        this.grades
            .filter(
                g => this.exam.grade && isRealGrade(g) && isRealGrade(this.exam.grade) && this.exam.grade.id === g.id,
            )
            .forEach(this._setGrade);

        // The "no grade" option
        const noGrade: NoGrade = {
            name: this.Exam.getExamGradeDisplayName('NONE'),
            type: 'NONE',
            marksRejection: false,
        };
        if (this.exam.gradeless && !this.selections.grade) {
            this.selections.grade = noGrade;
        }
        this.grades.push(noGrade);
    };

    initCreditTypes = () => {
        this.Exam.refreshExamTypes().subscribe(types => {
            const creditType = this.exam.creditType || this.exam.examType;
            this.creditTypes = types;
            types.forEach(type => {
                if (creditType.id === type.id) {
                    // Reset also exam's credit type in case it was taken from its exam type.
                    // Confusing isn't it :)
                    this.exam.creditType = this.selections.type = type;
                }
            });
        });
        if (this.exam.course && !this.Exam.hasCustomCredit(this.exam)) {
            this.exam.customCredit = this.exam.course.credits;
        }
    };

    initLanguages = () => {
        const lang = this.Assessment.pickExamLanguage(this.exam);
        if (!this.exam.answerLanguage) {
            this.exam.answerLanguage = lang.code;
        }
        this.Language.getExamLanguages().then(languages => {
            this.languages = languages.map(language => {
                if (lang.code === language.code) {
                    this.selections.language = language;
                }
                language.name = this.Language.getLanguageNativeName(language.code);
                return language;
            });
        });
    };

    getExamMaxPossibleScore = () => this.Exam.getMaxScore(this.exam);

    getExamTotalScore = () => this.Exam.getTotalScore(this.exam);

    inspectionDone = () => this.onUpdate.emit();

    isOwnerOrAdmin = () => this.Exam.isOwnerOrAdmin(this.exam, this.collaborative);

    isReadOnly = () => this.Assessment.isReadOnly(this.exam);

    isGraded = () => this.Assessment.isGraded(this.exam);

    getTeacherCount = () => {
        // Do not add up if user exists in both groups
        const examOwners = this.collaborative ? this.exam.examOwners : (this.exam.parent as Exam).examOwners;
        const owners = examOwners.filter(
            owner => this.exam.examInspections.map(inspection => inspection.user?.id).indexOf(owner.id) === -1,
        );
        return this.exam.examInspections.length + owners.length;
    };

    sendEmailMessage = () => {
        if (!this.message.text) {
            toast.error(this.translate.instant('sitnet_email_empty'));
            return;
        }
        if (this.collaborative) {
            this.CollaborativeAssessment.sendEmailMessage(
                this.stateParams.id,
                this.stateParams.ref,
                this.message.text,
            ).subscribe(
                () => {
                    delete this.message.text;
                    toast.info(this.translate.instant('sitnet_email_sent'));
                },
                err => toast.error(err.data),
            );
        } else {
            this.http.post(`/app/email/inspection/${this.exam.id}`, { msg: this.message.text }).subscribe(() => {
                toast.info(this.translate.instant('sitnet_email_sent'));
                delete this.message.text;
            }, toast.error);
        }
    };

    saveAssessmentInfo = () => {
        if (this.collaborative) {
            this.CollaborativeAssessment.saveAssessmentInfo(
                this.stateParams.id,
                this.stateParams.ref,
                this.participation,
            );
        } else {
            this.Assessment.saveAssessmentInfo(this.exam);
        }
    };

    downloadFeedbackAttachment = () => {
        const attachment = this.exam.examFeedback.attachment;
        if (this.collaborative && attachment && attachment.externalId) {
            this.Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName);
        } else {
            this.Attachment.downloadFeedbackAttachment(this.exam);
        }
    };

    setGrade = () => {
        if (this.selections.grade && (isRealGrade(this.selections.grade) || this.selections.grade.type === 'NONE')) {
            this.exam.grade = this.selections.grade;
            this.exam.gradeless = this.selections.grade.type === 'NONE';
        } else {
            delete this.exam.grade;
            this.exam.gradeless = false;
        }
    };

    setCreditType = () => {
        if (this.selections.type && this.selections.type.type) {
            this.exam.creditType = this.selections.type;
        } else {
            delete this.exam.creditType;
        }
    };

    setLanguage = () => {
        this.exam.answerLanguage = this.selections.language ? this.selections.language.code : undefined;
    };

    isCommentRead = () => this.Assessment.isCommentRead(this.exam);
}
