import { isRealGrade } from '../../../exam/exam.model';

import type { HttpClient } from '@angular/common/http';

import type { Exam, ExamLanguage, ExamType, GradeScale, NoGrade, SelectableGrade } from '../../../exam/exam.model';
import type { ExamService } from '../../../exam/exam.service';
import type { LanguageService } from '../../../utility/language/language.service';
import type { AssessmentService } from '../assessment.service';

export abstract class GradingBaseComponent {
    selections: { grade: SelectableGrade | null; type: ExamType | null; language: ExamLanguage | null };
    grades: SelectableGrade[];
    creditTypes: (ExamType & { name: string })[];
    languages: (ExamLanguage & { name: string })[];

    constructor(
        protected http: HttpClient,
        protected Assessment: AssessmentService,
        protected Exam: ExamService,
        protected Language: LanguageService,
    ) {
        this.selections = {
            grade: null,
            type: null,
            language: null,
        };
    }

    protected abstract getExam(): Exam;

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

    protected initGrade = () => {
        const scale = this.resolveGradeScale();
        this.grades = scale.grades.map((grade) => {
            return {
                ...grade,
                name: this.Exam.getExamGradeDisplayName(grade.name),
                type: grade.name,
            };
        });
        const exam = this.getExam();
        this.grades
            .filter((g) => exam.grade && isRealGrade(g) && isRealGrade(exam.grade) && exam.grade.id === g.id)
            .forEach(this._setGrade);

        // The "no grade" option
        const noGrade: NoGrade = {
            name: this.Exam.getExamGradeDisplayName('NONE'),
            type: 'NONE',
            marksRejection: false,
        };
        if (exam.gradeless && !this.selections.grade) {
            this.selections.grade = noGrade;
        }
        this.grades.push(noGrade);
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
        if (exam.course && !this.Exam.hasCustomCredit(exam)) {
            exam.customCredit = exam.course.credits;
        }
    };

    protected initLanguages = () => {
        const exam = this.getExam();
        const lang = this.Assessment.pickExamLanguage(exam);
        if (!exam.answerLanguage) {
            exam.answerLanguage = lang.code;
        }
        this.Language.getExamLanguages().then((languages) => {
            this.languages = languages.map((language) => {
                if (lang.code === language.code) {
                    this.selections.language = language;
                }
                language.name = this.Language.getLanguageNativeName(language.code);
                return language;
            });
        });
    };

    setGrade = () => {
        const exam = this.getExam();
        if (this.selections.grade && (isRealGrade(this.selections.grade) || this.selections.grade.type === 'NONE')) {
            exam.grade = this.selections.grade;
            exam.gradeless = this.selections.grade.type === 'NONE';
        } else {
            delete exam.grade;
            exam.gradeless = false;
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
}
