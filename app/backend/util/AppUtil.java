/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.util;

import java.io.File;
import java.io.IOException;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Collection;

import org.apache.commons.codec.digest.DigestUtils;
import org.joda.time.DateTime;
import play.Logger;

import backend.impl.EmailComposer;
import backend.models.Exam;
import backend.models.User;
import backend.models.base.OwnedModel;

public final class AppUtil {

    private AppUtil() {}

    public static OwnedModel setCreator(OwnedModel object, User user) {
        object.setCreator(user);
        object.setCreated(DateTime.now());
        return object;
    }

    public static OwnedModel setModifier(OwnedModel object, User user) {
        object.setModifier(user);
        object.setModified(DateTime.now());
        return object;
    }

    public static String encodeMD5(String str) {
        return DigestUtils.md5Hex(str);
    }

    public static void removeAttachmentFile(String filePath) {
        // Remove physical file upon attachment removal.
        Path path = FileSystems.getDefault().getPath(filePath);
        try {
            if (!Files.deleteIfExists(path)) {
                Logger.error("Could not delete " + path + " because it does not exist.");
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void copyFile(File sourceFile, File destFile) throws IOException {
        Files.copy(sourceFile.toPath(), destFile.toPath(), StandardCopyOption.REPLACE_EXISTING,
                StandardCopyOption.COPY_ATTRIBUTES);
    }

    public static void notifyPrivateExamEnded(Collection<User> recipients, Exam exam, EmailComposer composer) {
        for (User r : recipients) {
            composer.composePrivateExamEnded(r, exam);
            Logger.info("Email sent to {}", r.getEmail());
        }
    }

}
