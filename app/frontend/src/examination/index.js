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

require('./examination.module');
require('./examination.service');
require('./examination.component');

require('./clock/examinationClock.component');
require('./header/examinationHeader.component');
require('./instructions/answerInstructions.component');
require('./logout/examinationLogout.component.ts');
require('./navigation/examinationNavigation.component');
require('./navigation/examinationToolbar.component');

require('./question/examinationQuestion.component');
require('./question/examinationClozeTest.component');
require('./question/examinationEssayQuestion.component');
require('./question/examinationMultiChoiceQuestion.component');
require('./question/examinationWeightedMultiChoiceQuestion.component');

require('./section/examinationSection.component');
