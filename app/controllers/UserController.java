package controllers;

import java.util.List;

import models.User;
import play.Logger;
import play.data.Form;
import play.db.ebean.Model;
import play.libs.Json;
import play.mvc.Controller;
import play.mvc.Result;

import com.avaje.ebean.Ebean;


public class UserController extends Controller {

	public static Model.Finder<String, User> find = new Model.Finder<String, User>(String.class, User.class);

	
    public static Result getUsers() {
        List<User> users = Ebean.find(User.class).findList();
        return ok(Json.toJson(users));
    }
	
	/**
	 * Authenticate a User.
	 */
	public static User authenticate(String email, String password) {
		return find.where().eq("email", email).eq("password", password).findUnique();
	}
	
	/**
	 * Find a User by email.
	 */
	public static User findByEmail(String email) {
		return find.where().eq("email", email).findUnique();
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

    public static Result deleteUser(Long id) {
        //todo: tarkasta oikeudet
        //todo: validoi syöte
        //todo: hae kannasta
    	
    	Logger.debug("Deleting user, id: "+ id);
    	
    	
    	Ebean.delete(User.class, id);
    	
        return ok(Json.toJson(id));
    }
    
    //todo: fetch by group, organization, role, ..?

}
