# Coordinator narrow-change review

The entire save.js module becomes byte-identical to frozen a17 when only createStore.load is restored. The sole runtime changed file is save.js; all other125 runtime source files, including main/controller/state/input/guard modules and original resources, are unchanged. The head,slot0,slot1 getItem reads remain in the original order before decoding, inside the original outer catch.

A selected slot is decoded once and accepted only by the unchanged receipt predicate. A failed selected slot is remembered even when null; fallback decodes only the other slot, then preserves the original receipt list/order, matching, stable descending-revision selection and CORRUPT/empty classification. No alternate entry can be promoted without an existing commit receipt. There is no persistent cross-call state or cache to invalidate. Every later load reads and parses current bytes again, preserving detached mutable outputs.

The complete decoder, createStore.save and createSession remain unchanged. Thus checksum/schema/semantic validation on all actually selected/fallback candidates, payload limits, revision CAS, staged bytes/readback, unchanged-head check, atomic head/readback, uncertainty classification, exclusive Web Lock and upgrade backup/fences remain in their original functions. The omitted alternate-slot validation was unused when the head already matched a valid primary.

Read the fresh aggregate receipts separately; this static review alone is not a test result. The patch retains R14a17 release labels intentionally and is not a newly published candidate. No Git, deployment or Library operation is part of this ready checkpoint. A separately reviewed release label/version step is needed before publication.
