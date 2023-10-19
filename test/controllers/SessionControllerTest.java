package controllers;

import static org.fest.assertions.Assertions.assertThat;

import base.IntegrationTestCase;
import com.google.common.collect.ImmutableMap;
import io.ebean.DB;
import models.Role;
import models.User;
import org.junit.Test;

public class SessionControllerTest extends IntegrationTestCase {

    @Test
    public void testLoginAsNewUser() {
        String eppn = "newuser@test.org";
        User user = DB.find(User.class).where().eq("eppn", eppn).findOne();
        assertThat(user).isNull();

        login(eppn);

        user = DB.find(User.class).where().eq("eppn", eppn).findOne();
        assertThat(user).isNotNull();
        assertThat(user.getRoles()).hasSize(1);
        assertThat(user.getOrganisation()).isNotNull();
        assertThat(user.getRoles().get(0).getName()).isEqualTo(Role.Name.TEACHER.toString());
        assertThat(user.getFirstName()).isEqualTo("George");
        assertThat(user.getLastName()).isEqualTo("Lazenby");
        assertThat(user.getUserIdentifier()).isEqualTo("org1.org:11111 org2.org:22222 org3.org:33333");
    }

    @Test
    public void testLoginWithDuplicateUserIdentifierKeys() {
        String eppn = "newuser@test.org";
        User user = DB.find(User.class).where().eq("eppn", eppn).findOne();
        assertThat(user).isNull();

        login(
            eppn,
            ImmutableMap.of(
                "schacPersonalUniqueCode",
                "urn:schac:personalUniqueCode:int:studentID:org2.org:aaaaa;" +
                "urn:schac:personalUniqueCode:int:studentID:org1.org:33333;" +
                "urn:schac:personalUniqueCode:int:studentID:org1.org:22222;" +
                "urn:schac:personalUniqueCode:int:studentID:org1.org:11111"
            )
        );

        user = DB.find(User.class).where().eq("eppn", eppn).findOne();
        assertThat(user).isNotNull();
        assertThat(user.getUserIdentifier()).isEqualTo("org1.org:null org2.org:aaaaa");
    }

    @Test
    public void testLoginWithOtherIdentifierKeys() {
        String eppn = "newuser@test.org";
        User user = DB.find(User.class).where().eq("eppn", eppn).findOne();
        assertThat(user).isNull();

        login(
            eppn,
            ImmutableMap.of(
                "schacPersonalUniqueCode",
                "urn:schac:personalUniqueCode:int:studentID:org2.org:aaaaa;" +
                "urn:schac:personalUniqueCode:org:org1.org:dirid:33333;" +
                "urn:schac:personalUniqueCode:org:org1.org:arturid:22222"
            )
        );

        user = DB.find(User.class).where().eq("eppn", eppn).findOne();
        assertThat(user).isNotNull();
        assertThat(user.getUserIdentifier()).isEqualTo("org2.org:aaaaa");
    }

    @Test
    public void testLoginWithInvalidUserIdentifierString() {
        String eppn = "newuser@test.org";
        User user = DB.find(User.class).where().eq("eppn", eppn).findOne();
        assertThat(user).isNull();

        login(eppn, ImmutableMap.of("schacPersonalUniqueCode", "11111"));

        user = DB.find(User.class).where().eq("eppn", eppn).findOne();
        assertThat(user).isNotNull();
        assertThat(user.getUserIdentifier()).isEqualTo("11111");
    }

    @Test
    public void testLoginWithMissingUserIdentifierValue() {
        String eppn = "newuser@test.org";
        User user = DB.find(User.class).where().eq("eppn", eppn).findOne();
        assertThat(user).isNull();

        login(eppn, ImmutableMap.of("schacPersonalUniqueCode", "urn:schac:personalUniqueCode:int:studentID:org2.org:"));

        user = DB.find(User.class).where().eq("eppn", eppn).findOne();
        assertThat(user).isNotNull();
        assertThat(user.getUserIdentifier()).isEqualTo("org2.org:null");
    }

    @Test
    public void testLoginWithNationalUserIdentifier() {
        String eppn = "newuser@test.org";
        User user = DB.find(User.class).where().eq("eppn", eppn).findOne();
        assertThat(user).isNull();

        login(
            eppn,
            ImmutableMap.of(
                "schacPersonalUniqueCode",
                "urn:schac:personalUniqueCode:int:studentID:org2.org:111;" +
                "urn:schac:personalUniqueCode:int:esi:FI:xxx"
            )
        );

        user = DB.find(User.class).where().eq("eppn", eppn).findOne();
        assertThat(user).isNotNull();
        assertThat(user.getUserIdentifier()).isEqualTo("org2.org:111");
    }
}
