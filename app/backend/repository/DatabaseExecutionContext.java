package backend.repository;

import akka.actor.ActorSystem;
import javax.inject.Inject;
import play.libs.concurrent.CustomExecutionContext;

public class DatabaseExecutionContext extends CustomExecutionContext {

  @Inject
  public DatabaseExecutionContext(ActorSystem actorSystem) {
    super(actorSystem, "database.dispatcher");
  }
}
