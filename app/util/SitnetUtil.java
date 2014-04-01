package util;

import Exceptions.SitnetException;
import com.fasterxml.jackson.annotation.JsonBackReference;
import controllers.UserController;
import models.SitnetModel;
import models.User;
import org.apache.commons.codec.digest.DigestUtils;

import java.lang.reflect.Field;
import java.sql.Timestamp;

/**
 * Created by avainik on 3/19/14.
 */
public class SitnetUtil {


    public static Object getClone(Object object)
    {
        Object clone = null;

        try
        {
            clone = object.getClass().newInstance();
        } catch (InstantiationException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        }

        // Walk up the superclass hierarchy
        for (Class obj = object.getClass(); !obj.equals(Object.class); obj = obj.getSuperclass())
        {
            // Todo: check annotation
            Field[] fields = obj.getDeclaredFields();
            for (int i = 0; i < fields.length; i++)
            {
//                // Todo: Get declaring class here
//                Class<?> clazz = fields[i].getDeclaringClass();
//                if (SitnetModel.class.isAssignableFrom(clazz)) {
//
//                    Method method = null;
//                    try {
//                            method = clazz.getDeclaredMethod ("clone",  Void.TYPE);
//                        if(method == null) {
//                            break;
//                        } else {
//
//                            fields[i] = method.invoke (fields[i],  Void.TYPE);
//                        }
//                    } catch (NoSuchMethodException e) {
//                        e.printStackTrace();
//                    } catch (InvocationTargetException e) {
//                        e.printStackTrace();
//                    } catch (IllegalAccessException e) {
//                        e.printStackTrace();
//                    }
//
//                }
                if (fields[i].getAnnotation(JsonBackReference.class) == null) {
                    fields[i].setAccessible(true);
                    try {
                        // for each class/superclass, copy all fields
                        // from this object to the clone
                        fields[i].set(clone, fields[i].get(object));
                    } catch (IllegalAccessException e) {
                        e.printStackTrace();
                    }

                }
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
