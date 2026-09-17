// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.core

import org.jsoup.safety.Safelist

/** Shared HTML safelist for sanitizing user input
  *
  * Allows common HTML elements and attributes needed for rich text editing, including math-related
  * attributes and math-field tags.
  */
object HtmlSafelist:
  val SAFELIST: Safelist = Safelist
    .relaxed()
    // Inline images are not a feature: no editor offers one (CKEditor 4 had `removePlugins =
    // 'image'` and the CKEditor 5 config never loads an image plugin), and the Moodle importer
    // turns an imported <img> into an attachment plus a text placeholder. Only `relaxed()` itself
    // brought <img> in, so hand-written or pasted markup was the one way to store one. Media that
    // renders remote content is an escape from an exam room with no network restrictions, so the
    // supported route for pictures stays what it already is: attachments.
    // `relaxed()` carries no <video>, <audio>, <iframe>, <object> or <embed> to begin with.
    .removeTags("img")
    .addAttributes("a", "target")
    .addAttributes(
      "span",
      "class",
      "id",
      "style",
      "case-sensitive",
      "cloze",
      "numeric",
      "precision",
      "xmmath",
      "xmmathjax",
      "xmmathlive"
    )
    .addAttributes("div", "xmmath", "xmmathjax", "xmmathlive")
    .addAttributes("table", "cellspacing", "cellpadding", "border", "style", "caption")
    .addAttributes("p", "style")
    .addAttributes("abbr", "title", "id")
    .addAttributes("code", "class")
    .addAttributes("pre", "class")
    .addTags("math-field", "mark", "s", "figure", "hr")
    .addAttributes("math-field", "data-expression", "read-only", "math-virtual-keyboard-policy")
    .addAttributes("mark", "class")
    .addAttributes("figure", "class")
