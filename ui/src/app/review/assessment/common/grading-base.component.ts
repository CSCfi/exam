// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import type { Exam, ExamLanguage, ExamType, GradeScale, NoGrade, SelectableGrade } from 'src/app/exam/exam.model';
import { isRealGrade } from 'src/app/exam/exam.model';
import type { ExamService } from 'src/app/exam/exam.service';
import type { AssessmentService } from 'src/app/review/assessment/assessment.service';
import type { LanguageService } from 'src/app/shared/language/language.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';

export abstract class GradingBaseComponent {
    selections: { grade: SelectableGrade | null; type: ExamType | null; language: ExamLanguage | null };
    grades: SelectableGrade[] = [];
    creditTypes: (ExamType & { name: string })[] = [];
    languages: (ExamLanguage & { name: string })[] = [];

    constructor(
        protected http: HttpClient,
        protected toast: ToastrService,
        protected Assessment: AssessmentService,
        protected Exam: ExamService,
        protected CommonExam: CommonExamService,
        protected Language: LanguageService,
    ) {
        this.selections = {
            grade: null,
            type: null,
            language: null,
        };
    }

    setGrade = () => {
        const exam = this.getExam();
        if (
            this.selections.grade &&
            (isRealGrade(this.selections.grade) ||
                this.selections.grade.type === 'NOT_GRADED' ||
                this.selections.grade.type === 'POINT_GRADED')
        ) {
            exam.grade = this.selections.grade;
            if (this.selections.grade.type === 'NOT_GRADED') {
                exam.gradingType = 'NOT_GRADED';
            } else if (this.selections.grade.type === 'POINT_GRADED') {
                exam.gradingType = 'POINT_GRADED';
            } else {
                exam.gradingType = 'GRADED';
            }
        } else {
            delete exam.grade;
            exam.gradingType = 'NOT_GRADED';
        }
    };

    setCreditType = () => {
        const exam = this.getExam();
        if (this.selections.type && this.selections.type.type) {
            exam.creditType = this.selections.type;
        } else {
            delete exam.creditType;
        }
    };

    setLanguage = () =>
        (this.getExam().answerLanguage = this.selections.language ? this.selections.language.code : undefined);

    protected initGrades = (isMaturity: boolean = false, isCollaborative: boolean = false) => {
        const scale = this.resolveGradeScale();
        this.grades = scale.grades.map((grade) => {
            return {
                ...grade,
                name: this.CommonExam.getExamGradeDisplayName(grade.name),
                type: grade.name,
            };
        });
        const exam = this.getExam();
        this.grades
            .filter((g) => exam.grade && isRealGrade(g) && isRealGrade(exam.grade) && exam.grade.id === g.id)
            .forEach(this._setGrade);

        // The "not graded" option
        const notGraded: NoGrade = {
            name: this.CommonExam.getExamGradeDisplayName('NOT_GRADED'),
            type: 'NOT_GRADED',
            marksRejection: false,
        };

        // The "point graded" option
        const pointGraded: NoGrade = {
            name: this.CommonExam.getExamGradeDisplayName('POINT_GRADED'),
            type: 'POINT_GRADED',
            marksRejection: false,
        };

        if (exam.gradingType === 'NOT_GRADED' && !this.selections.grade) {
            this.selections.grade = notGraded;
        } else if (exam.gradingType === 'POINT_GRADED' && !this.selections.grade) {
            this.selections.grade = pointGraded;
        }
        const extraGrades = isMaturity || isCollaborative ? [notGraded] : [notGraded, pointGraded];
        this.grades.push(...extraGrades);
    };

    protected initCreditTypes = () => {
        const exam = this.getExam();
        this.Exam.refreshExamTypes$().subscribe((types) => {
            const creditType = exam.creditType || exam.examType;
            this.creditTypes = types;
            types.forEach((type) => {
                if (creditType.id === type.id) {
                    // Reset also exam's credit type in case it was taken from its exam type.
                    // Confusing isn't it :)
                    exam.creditType = this.selections.type = type;
                }
            });
        });
        if (exam.course && !this.CommonExam.hasCustomCredit(exam)) {
            exam.customCredit = exam.course.credits;
        }
    };

    protected initLanguages = () => {
        const exam = this.getExam();
        const lang = this.Assessment.pickExamLanguage(exam);
        if (!exam.answerLanguage && lang) {
            exam.answerLanguage = lang.code;
        }
        this.Language.getExamLanguages$().subscribe((languages) => {
            this.languages = languages.map((language) => {
                if (lang?.code === language.code) {
                    this.selections.language = language;
                }
                return language;
            });
        });
    };

    private resolveGradeScale = (): GradeScale => {
        const exam: Exam = this.getExam();
        if (exam.gradeScale) {
            return exam.gradeScale;
        } else if (exam.parent?.gradeScale) {
            return exam.parent.gradeScale;
        } else if (exam?.course?.gradeScale) {
            return exam.course.gradeScale;
        } else {
            throw Error('No GradeScale for Assessment!');
        }
    };

    private _setGrade = (grade: SelectableGrade) => {
        this.selections.grade = grade;
    };

    protected abstract getExam(): Exam;
}
