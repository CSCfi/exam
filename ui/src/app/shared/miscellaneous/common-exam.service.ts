/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the 'Licence');
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an 'AS IS' basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ReviewedExam } from '../../enrolment/enrolment.model';
import type { Exam, ExamSection, GradeScale, Implementation } from '../../exam/exam.model';
import { isNumber } from './helpers';

type SectionContainer = { examSections: ExamSection[] };
@Injectable({ providedIn: 'root' })
export class CommonExamService {
    constructor(@Inject(DOCUMENT) private document: Document, private translate: TranslateService) {}

    getExamTypeDisplayName = (type: string): string => {
        let name = '';
        switch (type) {
            case 'PARTIAL':
                name = 'sitnet_exam_credit_type_partial';
                break;
            case 'FINAL':
                name = 'sitnet_exam_credit_type_final';
                break;
            default:
                break;
        }
        return this.translate.instant(name);
    };

    getScaleDisplayName = (gs?: GradeScale): string => {
        if (!gs) {
            return '';
        }
        let name = '';
        const description = gs.description;
        switch (description) {
            case 'ZERO_TO_FIVE':
                name = '0-5';
                break;
            case 'LATIN':
                name = 'Improbatur-Laudatur';
                break;
            case 'APPROVED_REJECTED':
                name = this.translate.instant('sitnet_evaluation_select');
                break;
            case 'OTHER':
                name = gs.displayName;
        }
        return name;
    };

    getExamGradeDisplayName = (grade: string): string => {
        let name;
        switch (grade) {
            case 'NONE':
                name = this.translate.instant('sitnet_no_grading');
                break;
            case 'I':
                name = 'Improbatur';
                break;
            case 'A':
                name = 'Approbatur';
                break;
            case 'B':
                name = 'Lubenter approbatur';
                break;
            case 'N':
                name = 'Non sine laude approbatur';
                break;
            case 'C':
                name = 'Cum laude approbatur';
                break;
            case 'M':
                name = 'Magna cum laude approbtur';
                break;
            case 'E':
                name = 'Eximia cum laude approbatur';
                break;
            case 'L':
                name = 'Laudatur approbatur';
                break;
            case 'REJECTED':
                name = this.translate.instant('sitnet_rejected');
                break;
            case 'APPROVED':
                name = this.translate.instant('sitnet_approved');
                break;
            default:
                name = grade;
                break;
        }
        return name;
    };

    getCredit = (exam: Exam | ReviewedExam) => {
        if (this.hasCustomCredit(exam)) {
            return exam.customCredit;
        } else {
            return exam.course && exam.course.credits ? exam.course.credits : 0;
        }
    };

    getExamDisplayCredit = (exam: Exam) => {
        const courseCredit = exam.course ? exam.course.credits : 0;
        return this.hasCustomCredit(exam) ? exam.customCredit : courseCredit;
    };

    hasCustomCredit = (exam: Exam | ReviewedExam) => isNumber(exam.customCredit) && exam.customCredit >= 0;

    getExamImplementationTranslation = (impl: Implementation) => {
        switch (impl) {
            case 'AQUARIUM':
                return 'sitnet_examination_type_aquarium';
            case 'CLIENT_AUTH':
                return 'sitnet_examination_type_seb';
            case 'WHATEVER':
                return 'sitnet_examination_type_home_exam';
        }
    };

    countCharacters = (text?: string) => {
        let normalizedText = text
            ? text
                  .replace(/\s/g, '')
                  .replace(/&nbsp;/g, '')
                  .replace(/(\r\n|\n|\r)/gm, '')
                  .replace(/&nbsp;/gi, ' ')
            : '';
        normalizedText = this.strip(normalizedText).replace(/^([\t\r\n]*)$/, '');
        return normalizedText.length;
    };

    countWords = (text?: string) => {
        let normalizedText = text
            ? text
                  .replace(/(\r\n|\n|\r)/gm, ' ')
                  .replace(/^\s+|\s+$/g, '')
                  .replace('&nbsp;', ' ')
            : '';
        normalizedText = this.strip(normalizedText);
        const words = normalizedText.split(/\s+/);
        for (let wordIndex = words.length - 1; wordIndex >= 0; wordIndex--) {
            if (words[wordIndex].match(/^([\s\t\r\n]*)$/)) {
                words.splice(wordIndex, 1);
            }
        }
        return words.length;
    };

    private strip = (html: string) => {
        const tmp = this.document.createElement('div');
        tmp.innerHTML = html;
        if (!tmp.textContent && typeof tmp.innerText === 'undefined') {
            return '';
        }
        return tmp.textContent || tmp.innerText;
    };
}
