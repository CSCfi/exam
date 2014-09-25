package models;

import com.avaje.ebean.event.BeanPersistListener;
import util.SitnetUtil;

import java.util.Set;
/**
 * Created by alahtinen on 2.6.2014.
 */
public class AttachmentListener implements BeanPersistListener<Attachment> {
    @Override
    public boolean inserted(Attachment attachment) {
        return false;  //To change body of implemented methods use File | Settings | File Templates.
    }

    @Override
    public boolean updated(Attachment attachment, Set<String> strings) {
        return false;  //To change body of implemented methods use File | Settings | File Templates.
    }

    @Override
    public boolean deleted(Attachment attachment) {

        SitnetUtil.removeAttachmentFile(attachment.getFilePath());

        return false;  //To change body of implemented methods use File | Settings | File Templates.
    }

    @Override
    public void remoteInsert(Object o) {
        //To change body of implemented methods use File | Settings | File Templates.
    }

    @Override
    public void remoteUpdate(Object o) {
        //To change body of implemented methods use File | Settings | File Templates.
    }

    @Override
    public void remoteDelete(Object o) {
        //To change body of implemented methods use File | Settings | File Templates.
    }                                                                               }