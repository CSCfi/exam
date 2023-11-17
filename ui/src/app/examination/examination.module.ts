import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '../shared/shared.module';
import { ExaminationClockComponent } from './clock/examination-clock.component';
import { ExaminationStatusService } from './examination-status.service';
import { ExaminationComponent } from './examination.component';
import { ExaminationService } from './examination.service';
import { ExaminationHeaderComponent } from './header/examination-header.component';
import { AnswerInstructionsComponent } from './instructions/answer-instructions.component';
import { ExaminationLogoutComponent } from './logout/examination-logout.component';
import { ExaminationNavigationComponent } from './navigation/examination-navigation.component';
import { ExaminationToolbarComponent } from './navigation/examination-toolbar.component';
import { DynamicClozeTestComponent } from './question/dynamic-cloze-test.component';
import { ExaminationClozeTestComponent } from './question/examination-cloze-test.component';
import { ExaminationEssayQuestionComponent } from './question/examination-essay-question.component';
import { ExaminationMultiChoiceComponent } from './question/examination-multi-choice-question.component';
import { ExaminationQuestionComponent } from './question/examination-question.component';
import { ExaminationWeightedMultiChoiceComponent } from './question/examination-weighted-multi-choice-question.component';
import { ExaminationSectionComponent } from './section/examination-section.component';

@NgModule({
    imports: [
        RouterModule,
        NgbPopoverModule,
        SharedModule,
        AnswerInstructionsComponent,
        ExaminationClockComponent,
        ExaminationClozeTestComponent,
        ExaminationEssayQuestionComponent,
        ExaminationHeaderComponent,
        ExaminationLogoutComponent,
        ExaminationMultiChoiceComponent,
        ExaminationQuestionComponent,
        ExaminationWeightedMultiChoiceComponent,
        ExaminationNavigationComponent,
        ExaminationSectionComponent,
        ExaminationToolbarComponent,
        ExaminationComponent,
        DynamicClozeTestComponent,
    ],
    providers: [ExaminationService, ExaminationStatusService],
})
export class ExaminationModule {}
