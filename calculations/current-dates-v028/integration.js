/* Refresh only ceilings on deliberate review; never rewrite raw dates. */
function reviewDateMaximums(context,ids){for(const id of ids){const input=$('#'+id);if(input)input.max=context.day;}}
/* v0.28 bounded existing-policy viewer. The one-future-slot format is not editable history. */
function policyDialog(id='ilp') {
 captureValue();const h=getHolding(id),p=h.policy;
 showModal(`<h2 id="modal-title">Policy premium schedule · read-only</h2><p id="policy-readonly-reason" class="notice">Existing schedules are read-only in v0.28: the single future segment cannot safely preserve historical schedule edits. Original dates and cadence are retained. Correct or skip individual premium records in transaction history; new policies can still be created.</p><p>Base: ${esc(p.start)} · ${esc(h.currency)} ${p.premium} · ${esc(p.frequency)} · end ${esc(p.end||'not set')}</p>${p.future?`<p>Saved segment: ${esc(p.future.effective)} · ${esc(h.currency)} ${p.future.premium} · ${esc(p.future.frequency)} · end ${esc(p.future.end||'not set')}</p>`:''}${button('View recorded premiums',`closeModal();viewTransactions('${h.id}')`)}`);
}
