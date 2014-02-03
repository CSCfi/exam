package controllers;

import com.avaje.ebean.Ebean;
import models.User;
import play.data.Form;
import play.libs.Json;
import play.mvc.Controller;
import play.mvc.Result;

import java.util.List;


public class UserController extends Controller {


    public static Result getUsers() {
        List<User> users = Ebean.find(User.class).findList();
        return ok(Json.toJson(users));
    }

    public static Result getUser(long id) {
        //todo: tarkasta oikeudet
        //todo: validoi syöte
        //todo: hae kannasta
        return ok(Json.toJson(new User()));
    }

    public static Result addUser() {
        //todo: tarkasta oikeudet
        //todo: validoi syöte
        //todo: tallenna kantaan
        Form<User> userForm = Form.form(User.class);
        User user = userForm.bindFromRequest().get();
        Ebean.save(user);
        return ok(Json.toJson(user.getId()));
    }

    public static Result updateUser(long id) {
        //todo: tarkasta oikeudet
        //todo: validoi syöte
        //todo: tallenna kantaan
        Form<User> userForm = Form.form(User.class);
        User user = userForm.bindFromRequest().get();
        return ok("ok");

    }

    public static Result deleteUser(long id) {
        //todo: tarkasta oikeudet
        //todo: validoi syöte
        //todo: hae kannasta
        return ok("ok");
    }

    //todo: fetch by group, organization, role, ..?

}
