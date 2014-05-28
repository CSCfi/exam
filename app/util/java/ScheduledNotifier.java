package util.java;
import akka.actor.UntypedActor;
import akka.actor.Cancellable;
import scala.concurrent.duration.Duration;
import java.util.concurrent.TimeUnit;


/**
 * Created by alahtinen on 23.5.2014.
 */
public class ScheduledNotifier extends UntypedActor {

    private final Cancellable tick = getContext().system().scheduler().schedule(
            Duration.create(1, TimeUnit.SECONDS),
            Duration.create(7, TimeUnit.SECONDS),
            getSelf(), "tick", getContext().dispatcher(), null);

    @Override
    public void postStop() {
        tick.cancel();
    }

    @Override
    public void onReceive(Object message) throws Exception {
        if (message.equals("tick")) {
            // do something useful here
            System.out.println("TICK");
        }
        else {
            unhandled(message);
        }
    }
}
