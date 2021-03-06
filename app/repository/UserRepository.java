package repository;

import io.ebean.Ebean;
import io.ebean.EbeanServer;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import models.User;
import play.db.ebean.EbeanConfig;

public class UserRepository {

    private final EbeanServer db;
    private final DatabaseExecutionContext ec;

    @Inject
    public UserRepository(EbeanConfig ebeanConfig, DatabaseExecutionContext databaseExecutionContext) {
        this.db = Ebean.getServer(ebeanConfig.defaultServer());
        this.ec = databaseExecutionContext;
    }

    public CompletionStage<Optional<User>> getLoggedInUser(Long id) {
        return CompletableFuture.supplyAsync(() -> db.find(User.class).where().idEq(id).findOneOrEmpty(), ec);
    }
}
