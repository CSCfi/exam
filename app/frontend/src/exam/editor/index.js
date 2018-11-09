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

require('./editor.module.ts');
require('./examTabs.component.ts');

require('./basic/basicExamInfo.component.ts');
require('./basic/examCourse.component');
require('./basic/examInspectorSelector.component');
require('./basic/examOwnerSelector.component');

require('./basic/softwareSelector.component');

require('./common/coursePicker.service');
require('./common/coursePicker.component');
require('./common/languageSelector.component.ts');

require('./creation/courseSelection.component');
require('./creation/newExam.component');

require('./publication/autoEvaluation.component');
require('./publication/examParticipantSelector.component');
require('./publication/examPreParticipantSelector.component');
require('./publication/examPublication.component.ts');
require('./publication/publicationErrorDialog.component');
require('./publication/publicationDialog.component');
require('./publication/publicationRevokeDialog.component');
require('./publication/collaborativeExamOwnerSelector.component.ts');

require('./sections/section.component.ts');
require('./sections/sectionQuestion.component.ts');
require('./sections/sectionsList.component.ts');
