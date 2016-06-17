package controllers;

import base.IntegrationTestCase;
import com.avaje.ebean.Ebean;
import models.Role;
import models.User;
import org.junit.Test;

import static org.fest.assertions.Assertions.assertThat;

public class SessionControllerTest extends IntegrationTestCase {

    @Test
    public void testLoginAsNewUser() throws Exception {
        String eppn = "newuser@test.org";
        User user = Ebean.find(User.class).where().eq("eppn", eppn).findUnique();
        assertThat(user).isNull();

        login(eppn);

        user = Ebean.find(User.class).where().eq("eppn", eppn).findUnique();
        assertThat(user).isNotNull();
        assertThat(user.getRoles()).hasSize(1);
        assertThat(user.getOrganisation()).isNotNull();
        assertThat(user.getRoles().get(0).getName()).isEqualTo(Role.Name.TEACHER.toString());
        assertThat(user.getFirstName()).isEqualTo("George");
        assertThat(user.getLastName()).isEqualTo("Lazenby");

    }
}
