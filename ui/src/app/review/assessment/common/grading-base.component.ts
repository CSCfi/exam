// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import type { Exam, ExamLanguage, ExamType, GradeScale, NoGrade, SelectableGrade } from 'src/app/exam/exam.model';
import { isRealGrade } from 'src/app/exam/exam.model';
import type { ExamService } from 'src/app/exam/exam.service';
import type { AssessmentService } from 'src/app/review/assessment/assessment.service';
import type { LanguageService } from 'src/app/shared/language/language.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';

export abstract class GradingBaseComponent {
    readonly grades = signal<SelectableGrade[]>([]);
    readonly creditTypes = signal<(ExamType & { name: string })[]>([]);
    readonly languages = signal<(ExamLanguage & { name: string })[]>([]);
    readonly gradingForm = new FormGroup({
        grade: new FormControl<SelectableGrade | null>(null),
        type: new FormControl<ExamType | null>(null),
        language: new FormControl<ExamLanguage | null>(null),
        customCredit: new FormControl<number | null>(null),
    });

    constructor(
        protected http: HttpClient,
        protected toast: ToastrService,
        protected Assessment: AssessmentService,
        protected Exam: ExamService,
        protected CommonExam: CommonExamService,
        protected Language: LanguageService,
    ) {}

    setGrade = () => {
        const grade = this.gradingForm.controls.grade.value;
        const exam = this.getExam();
        if (grade && (isRealGrade(grade) || grade.type === 'NOT_GRADED' || grade.type === 'POINT_GRADED')) {
            exam.grade = grade;
            if (grade.type === 'NOT_GRADED') {
                exam.gradingType = 'NOT_GRADED';
            } else if (grade.type === 'POINT_GRADED') {
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
        const type = this.gradingForm.controls.type.value;
        const exam = this.getExam();
        if (type && type.type) {
            exam.creditType = type;
        } else {
            delete exam.creditType;
        }
    };

    setLanguage = () => {
        const language = this.gradingForm.controls.language.value;
        this.getExam().answerLanguage = language ? language.code : undefined;
    };

    protected initGrades = (isMaturity: boolean = false, isCollaborative: boolean = false) => {
        const scale = this.resolveGradeScale();
        this.grades.set(
            scale.grades.map((grade) => ({
                ...grade,
                name: this.CommonExam.getExamGradeDisplayName(grade.name),
                type: grade.name,
            })),
        );
        const exam = this.getExam();
        const matchingGrade = this.grades().find(
            (g) => exam.grade && isRealGrade(g) && isRealGrade(exam.grade) && exam.grade.id === g.id,
        );
        if (matchingGrade) {
            this.gradingForm.controls.grade.setValue(matchingGrade, { emitEvent: false });
        }

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

        if (exam.gradingType === 'NOT_GRADED' && !this.gradingForm.controls.grade.value) {
            this.gradingForm.controls.grade.setValue(notGraded, { emitEvent: false });
        } else if (exam.gradingType === 'POINT_GRADED' && !this.gradingForm.controls.grade.value) {
            this.gradingForm.controls.grade.setValue(pointGraded, { emitEvent: false });
        }
        const extraGrades = isMaturity || isCollaborative ? [notGraded] : [pointGraded, notGraded];
        this.grades.update((g) => [...g, ...extraGrades]);
    };

    protected initCreditTypes = () => {
        const exam = this.getExam();
        this.Exam.refreshExamTypes$().subscribe((types) => {
            const creditType = exam.creditType || exam.examType;
            this.creditTypes.set(types);
            types.forEach((type) => {
                if (creditType.id === type.id) {
                    // Reset also exam's credit type in case it was taken from its exam type.
                    // Confusing isn't it :)
                    exam.creditType = type;
                    this.gradingForm.controls.type.setValue(type, { emitEvent: false });
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
            this.languages.set(
                languages.map((language) => {
                    if (lang?.code === language.code) {
                        this.gradingForm.controls.language.setValue(language, { emitEvent: false });
                    }
                    return language;
                }),
            );
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

    protected abstract getExam(): Exam;
}
