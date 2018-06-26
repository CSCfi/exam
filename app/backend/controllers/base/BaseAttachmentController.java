/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */

package backend.controllers.base;

import akka.stream.Attributes;
import akka.stream.FlowShape;
import akka.stream.Inlet;
import akka.stream.Outlet;
import akka.stream.javadsl.Source;
import akka.stream.stage.AbstractInHandler;
import akka.stream.stage.AbstractOutHandler;
import akka.stream.stage.GraphStage;
import akka.stream.stage.GraphStageLogic;
import akka.util.ByteString;
import backend.models.Attachment;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import play.mvc.Result;
import scala.Tuple2;

import java.util.Base64;
import java.util.concurrent.CompletionStage;

public abstract class BaseAttachmentController<T> extends BaseController {

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public abstract CompletionStage<Result> deleteQuestionAnswerAttachment(Long qid, String hash);

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public abstract CompletionStage<Result> downloadQuestionAnswerAttachment(Long qid, String hash);

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public abstract CompletionStage<Result> downloadExamAttachment(T id);

    @Restrict({@Group("STUDENT")})
    public abstract CompletionStage<Result> addAttachmentToQuestionAnswer();

    protected CompletionStage<Result> serveAsBase64Stream(Attachment attachment, Source<ByteString, ?> source) {
        return wrapAsPromise(ok().chunked(source.via(new ChunkMaker(3 * 1024))
                .map(this::encode)).as(attachment.getMimeType())
                .withHeader("Content-Disposition", "attachment; filename=\"" + attachment.getFileName() + "\""));
    }

    private ByteString encode(ByteString byteString) {
        final byte[] encoded = Base64.getEncoder().encode(byteString.toArray());
        return ByteString.fromArray(encoded);
    }

    class ChunkMaker extends GraphStage<FlowShape<ByteString, ByteString>> {

        private final int chunkSize;

        public Inlet<ByteString> in = Inlet.create("ChunkMaker.in");
        public Outlet<ByteString> out = Outlet.create("ChunkMaker.out");
        private FlowShape<ByteString, ByteString> shape = FlowShape.of(in, out);

        ChunkMaker(int chunkSize) {
            this.chunkSize = chunkSize;
        }

        @Override
        public FlowShape<ByteString, ByteString> shape() {
            return shape;
        }

        @Override
        public GraphStageLogic createLogic(Attributes inheritedAttributes) {
            return new GraphStageLogic(shape) {
                private ByteString buffer = ByteString.empty();

                {
                    setHandler(out, new AbstractOutHandler() {
                        @Override
                        public void onPull() {
                            emitChunk();
                        }
                    });

                    setHandler(in, new AbstractInHandler() {

                        @Override
                        public void onPush() {
                            ByteString elem = grab(in);
                            buffer = buffer.concat(elem);
                            emitChunk();
                        }

                        @Override
                        public void onUpstreamFinish() {
                            if (buffer.isEmpty()) {
                                completeStage();
                                return;
                            }

                            if (isAvailable(out)) {
                                emitChunk();
                            }
                        }
                    });
                }

                private void emitChunk() {
                    if (buffer.isEmpty() && isClosed(in)) {
                        completeStage();
                        return;
                    }
                    if (buffer.size() < chunkSize && !isClosed(in)) {
                        pull(in);
                        return;
                    }
                    Tuple2<ByteString, ByteString> split = buffer.splitAt(chunkSize);
                    ByteString chunk = split._1();
                    buffer = split._2();
                    push(out, chunk);
                }
            };
        }

    }
}
