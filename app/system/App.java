package system;

import com.google.inject.AbstractModule;
import play.libs.akka.AkkaGuiceSupport;
import system.actors.AssessmentSenderActor;
import system.actors.AutoEvaluationNotifierActor;
import system.actors.ExamAutoSaverActor;
import system.actors.ExamExpirationActor;
import system.actors.ReservationPollerActor;

import javax.inject.Singleton;

@Singleton
public class App extends AbstractModule implements AkkaGuiceSupport {

    @Override
    protected void configure() {
        bind(SystemInitializer.class).asEagerSingleton();
        bindActor(ExamAutoSaverActor.class, "exam-auto-saver-actor");
        bindActor(ReservationPollerActor.class, "reservation-checker-actor");
        bindActor(AutoEvaluationNotifierActor.class, "auto-evaluation-notifier-actor");
        bindActor(AssessmentSenderActor.class, "assessment-sender-actor");
        bindActor(ExamExpirationActor.class, "exam-expiration-actor");
    }

}
