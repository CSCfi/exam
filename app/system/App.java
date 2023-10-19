/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

package system;

import com.google.inject.AbstractModule;
import javax.inject.Singleton;
import play.libs.pekko.PekkoGuiceSupport;
import system.actors.*;

@Singleton
public class App extends AbstractModule implements PekkoGuiceSupport {

    @Override
    protected void configure() {
        bind(SystemInitializer.class).asEagerSingleton();
        bindActor(ExamAutoSaverActor.class, "exam-auto-saver-actor");
        bindActor(ReservationPollerActor.class, "reservation-checker-actor");
        bindActor(AutoEvaluationNotifierActor.class, "auto-evaluation-notifier-actor");
        bindActor(AssessmentTransferActor.class, "assessment-transfer-actor");
        bindActor(ExamExpirationActor.class, "exam-expiration-actor");
        bindActor(ReservationReminderActor.class, "reservation-reminder-actor");
        bindActor(CollaborativeAssessmentSenderActor.class, "collaborative-assessment-sender-actor");
        bindActor(ExternalExamExpirationActor.class, "external-exam-expiration-actor");
    }
}
