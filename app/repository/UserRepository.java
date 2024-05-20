// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package repository;

import io.ebean.DB;
import io.ebean.Database;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import models.user.User;

public class UserRepository {

    private final Database db;
    private final DatabaseExecutionContext ec;

    @Inject
    public UserRepository(DatabaseExecutionContext databaseExecutionContext) {
        this.db = DB.getDefault();
        this.ec = databaseExecutionContext;
    }

    public CompletionStage<Optional<User>> getLoggedInUser(Long id) {
        return CompletableFuture.supplyAsync(() -> db.find(User.class).where().idEq(id).findOneOrEmpty(), ec);
    }
}
