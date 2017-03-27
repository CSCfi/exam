package controllers;

import base.IntegrationTestCase;
import com.avaje.ebean.Ebean;
import models.Reservation;
import models.Role;
import models.User;
import org.joda.time.DateTime;
import org.junit.Test;
import play.mvc.Result;

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

    @Test
    public void testLoginAsTemporalStudentVisitor() throws Exception {
        String eppn = "newuser@test.org";
        User user = Ebean.find(User.class).where().eq("eppn", eppn).findUnique();
        assertThat(user).isNull();

        Reservation reservation = new Reservation();
        reservation.setExternalRef("abcd1234");
        reservation.setExternalUserRef(eppn);
        reservation.setStartAt(DateTime.now().plusHours(2).toDate());
        reservation.setEndAt(DateTime.now().plusHours(3).toDate());
        reservation.save();

        login(eppn);

        user = Ebean.find(User.class).where().eq("eppn", eppn).findUnique();
        assertThat(user).isNotNull();
        assertThat(user.getRoles()).hasSize(1);
        assertThat(user.getRoles().get(0).getName()).isEqualTo(Role.Name.TEACHER.toString());

        reservation = Ebean.find(Reservation.class).where().eq("externalRef", "abcd1234").findUnique();
        assertThat(reservation.getUser().getId()).isEqualTo(user.getId());

        // Try do some teacher stuff, see that it is not allowed
        Result result = get("/app/reviewerexams");
        assertThat(result.status()).isEqualTo(403);

    }
}
