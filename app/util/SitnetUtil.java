package util;

import java.lang.reflect.Field;
import java.sql.Timestamp;

import models.SitnetModel;
import models.User;

import org.apache.commons.codec.digest.DigestUtils;

import Exceptions.MalformedDataException;
import Exceptions.SitnetException;
import controllers.UserController;

/**
 * Created by avainik on 3/19/14.
 */
public class SitnetUtil {


    public static Object getClone(Object o)
    {
        Object clone = null;

        try
        {
            clone = o.getClass().newInstance();
        }
        catch (InstantiationException e)
        {
            e.printStackTrace();
        }
        catch (IllegalAccessException e)
        {
            e.printStackTrace();
        }

        // Walk up the superclass hierarchy
        for (Class obj = o.getClass();
             !obj.equals(Object.class);
             obj = obj.getSuperclass())
        {
            Field[] fields = obj.getDeclaredFields();
            for (int i = 0; i < fields.length; i++)
            {
                fields[i].setAccessible(true);
                try
                {
                    // for each class/suerclass, copy all fields
                    // from this object to the clone
                    fields[i].set(clone, fields[i].get(o));
                }
                catch (IllegalArgumentException e){}
                catch (IllegalAccessException e){}
            }
        }
        return clone;
    }

    static public SitnetModel setCreator(SitnetModel object) throws SitnetException {

        User user = UserController.getLoggedUser();
        Timestamp currentTime = new Timestamp(System.currentTimeMillis());

        if(object.getCreator() != null) {
        	throw new SitnetException("Object already has creator");
        } else {
            object.setCreator(user);
            object.setCreated(currentTime);
        }

        return object;
    }

    static public SitnetModel setModifier(SitnetModel object) throws SitnetException {
    	
    	User user = UserController.getLoggedUser();
    	Timestamp currentTime = new Timestamp(System.currentTimeMillis());
    	
    	// check if user is the owner of this object
    	if(object.getCreator() != user) {
        	throw new SitnetException("User id:"+ user.getId() +" is not owner of this object");
    	} else {
    		object.setModifier(user);
    		object.setModified(currentTime);
    	}
    	
    	return object;
    }
    
    static public String encodeMD5(String str) {
        return DigestUtils.md5Hex(str);
    }
}
