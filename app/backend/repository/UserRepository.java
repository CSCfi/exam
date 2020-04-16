package backend.repository;

import backend.models.Session;
import backend.models.User;
import io.ebean.Ebean;
import io.ebean.EbeanServer;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import play.db.ebean.EbeanConfig;

public class UserRepository {
    private final EbeanServer db;
    private final DatabaseExecutionContext ec;

    @Inject
    public UserRepository(EbeanConfig ebeanConfig, DatabaseExecutionContext databaseExecutionContext) {
        this.db = Ebean.getServer(ebeanConfig.defaultServer());
        this.ec = databaseExecutionContext;
    }

    public CompletionStage<Optional<User>> getLoggedInUser(Session session) {
        return CompletableFuture.supplyAsync(
            () -> db.find(User.class).where().idEq(session.getUserId()).findOneOrEmpty(),
            ec
        );
    }
}
