# Prompt for the agent that will publish this

---

Publish a LinkedIn post from my account.

**Text:** use `docs/social-media/linkedin-post-en.txt` from
https://github.com/zps-commits/invoiceflow **verbatim**. Do not rewrite
it, do not add emoji, do not add a hook line, do not change the hashtags.
If it exceeds the character limit, tell me and stop rather than trimming
it.

**Images:** attach these four, in this order:
1. `docs/social-media/composed/1-cover.png`
2. `docs/social-media/composed/2-problem.png`
3. `docs/social-media/composed/3-solution.png`
4. `docs/social-media/composed/4-build.png`

**Alt text**, one per image, exactly as written:
1. "Cover: InvoiceFlow, a quote and invoice builder, with a phone showing
   the editor."
2. "The problem: a word processor where the arithmetic is done by hand, or
   a billing service with a monthly fee."
3. "The document the tool produces: an invented quote for an invented
   client, with its subtotal, discount and total."
4. "The build: React 19, TypeScript, Vite and jsPDF, with the function
   that fixes the order of operations."

**Rules:**
- Do not invent users, clients, revenue or any other metric. The only
  figures allowed are the ones in the text: 100 tests, four widths, zero
  accessibility violations.
- Do not suggest it issues fiscal documents or calculates tax. It does
  neither, and the post says so.
- Post once, to my personal profile, with no scheduling.
- Tell me the URL of the published post when it is done.

For a Portuguese audience use `linkedin-post-pt.txt` under the same rules.
