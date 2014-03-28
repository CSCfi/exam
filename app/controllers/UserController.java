package controllers;

import Exceptions.MalformedDataException;
import actions.Authenticate;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.Session;
import models.User;
import play.Logger;
import play.cache.Cache;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;

//todo authorization!
public class UserController extends SitnetController {

//    @Authenticate
    public static Result getUsers() {
        List<User> users = Ebean.find(User.class).findList();
        return ok(Json.toJson(users));
    }

    @Authenticate
    public static Result getUser(long id) {
        User user = Ebean.find(User.class, id);
        return ok(Json.toJson(user));
    }

//    @Restrict(@Group({"TEACHER"}))
    public static Result getUsersByRole(String role) {
    	  
    	List<User> users = Ebean.find(User.class)
    			.where()
    			.eq("roles.name", role)
    			.findList();

        // didnt work, lazy loading still initializes the object
//        List<User> immutableUsers = Collections.unmodifiableList(users);
        
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
    
    @Authenticate
    public static Result addUser() throws MalformedDataException {
        User user = bindForm(User.class);
        Ebean.save(user);
        return ok(Json.toJson(user.getId()));
    }

    @Authenticate
    public static Result updateUser(long id) throws MalformedDataException {
        User user = bindForm(User.class);
        user.setId(id);
        Ebean.update(user);
        return ok("ok");
    }

    @Authenticate
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
