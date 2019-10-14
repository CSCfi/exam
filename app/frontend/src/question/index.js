/*
 * Copyright (c) 2018 Exam Consortium
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

require('./question.module');
require('./question.service');

require('./basequestion/question.component');
require('./basequestion/questionBody.component');
require('./basequestion/tagPicker.component.ts');
require('./basequestion/essayForm.component');
require('./basequestion/multipleChoiceForm.component');
require('./basequestion/multipleChoiceOptionForm.component');
require('./basequestion/weightedMultipleChoiceOptionForm.component');

require('./examquestion/examQuestion.service');
require('./examquestion/examQuestion.component');
require('./examquestion/examQuestionEditor.component');
require('./examquestion/baseQuestionEditor.component');
require('./library/library.service');
require('./library/library.component');
require('./library/owners/libraryOwners.component');
require('./library/results/libraryResults.component');
require('./library/search/librarySearch.component');
require('./selector/questionSelector.component');
