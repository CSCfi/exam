import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { UIRouterModule } from '@uirouter/angular';
import { OrderModule } from 'ngx-order-pipe';

import { QuestionModule } from '../question/question.module';
import { UtilityModule } from '../utility/utility.module';
import { ExaminationClockComponent } from './clock/examinationClock.component';
import { ExaminationComponent } from './examination.component';
import { ExaminationService } from './examination.service';
import { ExaminationStatusService } from './examinationStatus.service';
import { ExaminationHeaderComponent } from './header/examinationHeader.component';
import { AnswerInstructionsComponent } from './instructions/answerInstructions.component';
import { ExaminationLogoutComponent } from './logout/examinationLogout.component';
import { ExaminationNavigationComponent } from './navigation/examinationNavigation.component';
import { ExaminationToolbarComponent } from './navigation/examinationToolbar.component';
import { ExaminationClozeTestComponent } from './question/examinationClozeTest.component';
import { ExaminationEssayQuestionComponent } from './question/examinationEssayQuestion.component';
import { ExaminationMultiChoiceQuestionComponent } from './question/examinationMultiChoiceQuestion.component';
import { ExaminationQuestionComponent } from './question/examinationQuestion.component';
import { ExaminationWeighteidMultiChoiceQuestionComponent } from './question/examinationWeightedMultiChoiceQuestion.component';
import { ExaminationSectionComponent } from './section/examinationSection.component';

@NgModule({
    imports: [NgbModule, UIRouterModule, QuestionModule, UtilityModule, OrderModule],
    declarations: [
        AnswerInstructionsComponent,
        ExaminationClockComponent,
        ExaminationClozeTestComponent,
        ExaminationEssayQuestionComponent,
        ExaminationHeaderComponent,
        ExaminationLogoutComponent,
        ExaminationMultiChoiceQuestionComponent,
        ExaminationQuestionComponent,
        ExaminationWeighteidMultiChoiceQuestionComponent,
        ExaminationNavigationComponent,
        ExaminationSectionComponent,
        ExaminationToolbarComponent,
        ExaminationComponent,
    ],
    entryComponents: [ExaminationComponent],
    providers: [ExaminationService, ExaminationStatusService],
})
export class ExaminationModule {}
