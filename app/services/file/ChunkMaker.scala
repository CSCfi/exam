// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.file

import org.apache.pekko.stream._
import org.apache.pekko.stream.stage._
import org.apache.pekko.util.ByteString

/** GraphStage that chunks incoming ByteStrings into fixed-size chunks
  *
  * @param chunkSize
  *   the size of each chunk in bytes
  */
class ChunkMaker(chunkSize: Int) extends GraphStage[FlowShape[ByteString, ByteString]]:
  val in: Inlet[ByteString]   = Inlet("ChunkMaker.in")
  val out: Outlet[ByteString] = Outlet("ChunkMaker.out")

  override val shape: FlowShape[ByteString, ByteString] = FlowShape(in, out)

  override def createLogic(inheritedAttributes: Attributes): GraphStageLogic =
    new GraphStageLogic(shape):
      private var buffer: ByteString = ByteString.empty

      setHandler(
        out,
        new OutHandler:
          override def onPull(): Unit = emitChunk()
      )

      setHandler(
        in,
        new InHandler:
          override def onPush(): Unit =
            val elem = grab(in)
            buffer = buffer.concat(elem)
            emitChunk()

          override def onUpstreamFinish(): Unit =
            if buffer.isEmpty then completeStage()
            else if isAvailable(out) then emitChunk()
      )

      private def emitChunk(): Unit =
        if buffer.isEmpty && isClosed(in) then completeStage()
        else if buffer.size < chunkSize && !isClosed(in) then pull(in)
        else
          val (chunk, remainder) = buffer.splitAt(chunkSize)
          buffer = remainder
          push(out, chunk)
