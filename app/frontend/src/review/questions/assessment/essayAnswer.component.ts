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

import * as angular from 'angular';
import * as _ from 'lodash';
import { ReviewQuestion, QuestionReview } from '../../review.model';
import { AttachmentService } from '../../../utility/attachment/attachment.service';

export const EssayAnswerComponent: angular.IComponentOptions = {
    template: require('./essayAnswer.template.html'),
    require: {
        parentCtrl: '^^essayAnswers',
    },
    bindings: {
        answer: '<',
        editable: '<',
        action: '@',
        onSelection: '&',
    },
    controller: class EssayAnswerComponentController implements angular.IComponentController {
        answer: ReviewQuestion;
        editable: boolean;
        action: string;
        name: string;
        onSelection: (_: { answer: ReviewQuestion }) => any;
        criteria: string | undefined;
        parentCtrl: { parentCtrl: { selectedReview: QuestionReview } };

        constructor(private Assessment: any, private Attachment: AttachmentService) {
            'ngInject';
        }

        $onInit() {
            this.name = this.answer.examSection.exam.creator
                ? `${this.answer.examSection.exam.creator.lastName} ${this.answer.examSection.exam.creator.firstName}`
                : this.answer.examSection.exam.id.toString();
            this.answer.expanded = true;
            this.answer.essayAnswer = this.answer.essayAnswer || {};
            this.answer.essayAnswer.temporaryScore = this.answer.essayAnswer.evaluatedScore;
            if (this.answer.evaluationType === 'Selection') {
                this.answer.essayAnswer.textualScore = this.answer.essayAnswer.evaluatedScore
                    ? this.answer.essayAnswer.evaluatedScore.toString()
                    : '';
            }
            this.criteria = this.parentCtrl.parentCtrl.selectedReview.question.defaultEvaluationCriteria;
        }

        getWordCount = () => this.Assessment.countWords(this.answer.essayAnswer.answer);

        getCharacterCount = () => this.Assessment.countCharacters(this.answer.essayAnswer.answer);

        saveScore = () => {
            if (this.answer.essayAnswer.textualScore) {
                this.answer.essayAnswer.temporaryScore = parseFloat(this.answer.essayAnswer.textualScore);
            }
            this.onSelection({ answer: this.answer });
            this.answer.selected = false;
        };

        isAssessed = () =>
            this.answer.essayAnswer &&
            (_.isNumber(this.answer.essayAnswer.temporaryScore) || this.answer.essayAnswer.textualScore);

        displayMaxScore = () => (this.answer.evaluationType === 'Points' ? this.answer.maxScore : 1);

        downloadAttachment = () => this.Attachment.downloadQuestionAnswerAttachment(this.answer);
    },
};

angular.module('app.review').component('essayAnswer', EssayAnswerComponent);
