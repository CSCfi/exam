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
    .addAttributes("abbr", "title", "id")
    .addAttributes("code", "class")
    .addAttributes("pre", "class")
    .addTags("math-field")
    .addAttributes("math-field", "data-expression", "read-only", "math-virtual-keyboard-policy")
