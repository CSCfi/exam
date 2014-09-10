package util;

import Exceptions.SitnetException;
import annotations.NonCloneable;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.typesafe.config.ConfigFactory;
import controllers.UserController;
import models.SitnetModel;
import models.User;
import org.apache.commons.codec.digest.DigestUtils;
import org.joda.time.DateTime;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.channels.FileChannel;
import java.sql.Timestamp;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.FileSystems;
import java.util.Date;


/**
 * Created by avainik on 3/19/14.
 */
public class SitnetUtil {

    public static String getHostName() {
        return ConfigFactory.load().getString("sitnet.application.hostname");
    }

    public static Object getClone(Object object) {
        Object clone = null;

        try {
            clone = object.getClass().newInstance();
        } catch (InstantiationException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        }

        // Walk up the superclass hierarchy
        for (Class obj = object.getClass(); !obj.equals(Object.class); obj = obj.getSuperclass()) {
            // Todo: check annotation
            Field[] fields = obj.getDeclaredFields();
            for (int i = 0; i < fields.length; i++) {
                fields[i].setAccessible(true);

                try {
                    if (fields[i].get(object) != null) {


                        if (fields[i].getAnnotation(JsonBackReference.class) == null) {

                            if (fields[i].getAnnotation(NonCloneable.class) == null) {
                                fields[i].setAccessible(true);
                                try {

                                    Class clazz = fields[i].get(object).getClass();
                                    Class superclass = clazz.getSuperclass();

                                    if (SitnetModel.class.isAssignableFrom(superclass)) {

                                        Method method = null;
                                        try {
                                            //method = clazz.getDeclaredMethod("clone", null);
                                            method = clazz.getDeclaredMethod("clone");
                                            if (method == null) {
                                                break;
                                            } else {
                                                if (fields[i].get(object) != null) {
                                                    //Object obo = method.invoke(fields[i].get(object), null);
                                                    Object obo = method.invoke(fields[i].get(object));
                                                    fields[i].set(clone, obo);
                                                }
                                            }
                                        } catch (NoSuchMethodException e) {
                                            e.printStackTrace();
                                        } catch (InvocationTargetException e) {
                                            e.printStackTrace();
                                        } catch (IllegalAccessException e) {
                                            e.printStackTrace();
                                        }

                                    } else  // its not SitnetModel, just clone it
                                    {
                                        if (fields[i].get(object) != null) {
                                            String name = fields[i].getName().toLowerCase();

                                            // if this is SitnetModel and must be cloned; set ID null
                                            // http://avaje.org/topic-112.html
                                            // removing ebean fields helps in some cases
                                            if (!name.startsWith("_ebean"))
                                                fields[i].set(clone, fields[i].get(object));
                                            if (name.equals("id"))
                                                fields[i].set(clone, null);
                                            if (name.equals("ebeantimestamp"))
                                                fields[i].set(clone, null);

                                        }
                                    }

                                } catch (IllegalAccessException e) {
                                    e.printStackTrace();
                                }
                            } else
                                try {
                                    fields[i].setAccessible(true);
                                    if (fields[i].get(object) != null)
                                        fields[i].set(clone, fields[i].get(object));
                                } catch (IllegalAccessException e) {
                                    e.printStackTrace();
                                }
                        }

                    }
                } catch (IllegalAccessException e) {
                    e.printStackTrace();
                }
            }
        }
        return clone;
    }

    static public SitnetModel setCreator(SitnetModel object) throws SitnetException {

        User user = UserController.getLoggedUser();
        Timestamp currentTime = new Timestamp(System.currentTimeMillis());

        if(object.getCreator() == null)
        {
            object.setCreator(user);
            object.setCreated(currentTime);
        }
        else {
            throw new SitnetException("Object already has creator");
        }
        return object;
    }

    static public SitnetModel setModifier(SitnetModel object) throws SitnetException {

        User user = UserController.getLoggedUser();
        Timestamp currentTime = new Timestamp(System.currentTimeMillis());

        object.setModifier(user);
        object.setModified(currentTime);

        return object;
    }

    static public boolean isOwner(SitnetModel object) {

        User user = UserController.getLoggedUser();

        if (object.getCreator() == null) {
            Class<?> clazz = object.getClass();

            Object asd = Ebean.find(clazz)
                    .select("creator.id")
                    .where()
                    .eq("id", object.getId())
                    .findUnique();

            object.setCreator(((SitnetModel) asd).getCreator());
        }

        return object.getCreator().getId().equals(user.getId());
    }

    static public String encodeMD5(String str) {
        return DigestUtils.md5Hex(str);
    }

    static public void removeAttachmentFile(String filePath) {
        // Perform disk clean upon attachment removal.
        Path path = FileSystems.getDefault().getPath(filePath);
        try {
            if (!Files.deleteIfExists(path)) {
                System.err.println("Could not delete " + path + " because it did not exist.");
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    static public Timestamp getTime() {
        return new Timestamp(new Date().getTime());
    }

    public static boolean copyFile(File sourceFile, File destFile) throws IOException {
        if(!destFile.exists()) {
            destFile.createNewFile();
        }

        FileChannel source = null;
        FileChannel destination = null;
        boolean status = false;

        try {
            source = new FileInputStream(sourceFile).getChannel();
            destination = new FileOutputStream(destFile).getChannel();
            destination.transferFrom(source, 0, source.size());

            if(destination.size() == source.size())
                status = true;
        }
        finally {
            if(source != null) {
                source.close();
            }
            if(destination != null) {
                destination.close();
            }
        }

        return status;
    }
}
