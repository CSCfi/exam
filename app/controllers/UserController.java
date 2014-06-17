package controllers;

import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Expr;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.ExamInspection;
import models.Session;
import models.User;
import play.Logger;
import play.cache.Cache;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;

//todo authorization!
public class UserController extends SitnetController {

    @Restrict({@Group("ADMIN")})
    public static Result getUsers() {
        List<User> users = Ebean.find(User.class).findList();
        return ok(Json.toJson(users));

    }

    @Restrict({@Group("ADMIN")})
    public static Result getUser(Long id) {
        User user = Ebean.find(User.class, id);
        
		if (user == null) {
			return notFound();
		} else {
			JsonContext jsonContext = Ebean.createJsonContext();
			JsonWriteOptions options = new JsonWriteOptions();
			options.setRootPathProperties("id, email, firstName, lastName, roles, userLanguage");
			options.setPathProperties("roles", "name");

			return ok(jsonContext.toJsonString(user, true, options)).as("application/json");
		}
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getUsersByRole(String role) {
    	  
    	List<User> users = Ebean.find(User.class)
    			.where()
    			.eq("roles.name", role)
    			.findList();
        
    	List<User> filteredUsers =
    			Ebean.filter(User.class) 
    			.sort("lastName asc")
    			.filter(users);
    	
    	ArrayNode array = JsonNodeFactory.instance.arrayNode();    	    	   
        for(User u : filteredUsers) {
        	ObjectNode part = Json.newObject();
        	part.put("id", u.getId());
//        	part.put("firstName", u.getFirstName());
//        	part.put("lastName", u.getLastName());
        	part.put("name", new String(u.getFirstName() +" "+u.getLastName()));
        	array.add(part);
        }
        
    	return ok(Json.toJson(array));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getUsersByRoleFilter(String role, String criteria) {

        List<User> users = Ebean.find(User.class)
                .where()
                .and(
                        Expr.eq("roles.name", role),
                        Expr.or(
                                Expr.icontains("lastName", criteria),
                                Expr.icontains("firstName", criteria)
                        )
                )
                .findList();

        ArrayNode array = JsonNodeFactory.instance.arrayNode();
        for(User u : users) {
            ObjectNode part = Json.newObject();
            part.put("id", u.getId());
            part.put("name", new String(u.getFirstName() +" "+u.getLastName()));
            array.add(part);
        }

        return ok(Json.toJson(array));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getExamInspectorsByRoleFilter(String role, Long eid, String criteria) {

        List<User> users = Ebean.find(User.class)
                .where()
                .and(
                        Expr.eq("roles.name", role),
                        Expr.or(
                                Expr.icontains("lastName", criteria),
                                Expr.icontains("firstName", criteria)
                        )
                )
                .findList();

        List<ExamInspection> inspections = Ebean.find(ExamInspection.class).where().eq("exam.id", eid).findList();

        ArrayNode array = JsonNodeFactory.instance.arrayNode();

        // removes all user who are already inspectors
        for(User u : users) {
            boolean b = true;
            for(ExamInspection i : inspections) {
                if(u.getId() == i.getUser().getId()) {
                    b = false;
                }
            }
            if(b) {
                ObjectNode part = Json.newObject();
                part.put("id", u.getId());
                part.put("name", new String(u.getFirstName() + " " + u.getLastName()));
                array.add(part);
            }
        }

        return ok(Json.toJson(array));
    }

    @Restrict({@Group("ADMIN")})
    public static Result addUser() throws MalformedDataException {
        User user = bindForm(User.class);
        Ebean.save(user);
        return ok(Json.toJson(user.getId()));
    }

    @Restrict({@Group("ADMIN")})
    public static Result updateUser(long id) throws MalformedDataException {
        User user = bindForm(User.class);
        user.setId(id);
        Ebean.update(user);
        return ok(Json.toJson(user.getId()));
    }

    @Restrict({@Group("ADMIN")})
    public static Result deleteUser(Long id) {
        Logger.debug("Delete user with id {}.", id);
        Ebean.delete(User.class, id);
        return ok("success");
    }
    
    public static User getLoggedUser()
    {
        String token = request().getHeader(SITNET_TOKEN_HEADER_KEY);
        Session session = (Session) Cache.get(SITNET_CACHE_KEY + token);
        User user = Ebean.find(User.class, session.getUserId());
        return user;
    }
}
