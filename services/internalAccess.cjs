'use strict';
// Only persisted, operator-issued grants qualify. Never use request body fields.
function isInternal(row) {
 return !!row && row.access_kind==='internal_complimentary' &&
  typeof row.access_granted_by==='string' && !!row.access_granted_by.trim() &&
  !!row.access_granted_at && Number.isFinite(+new Date(row.access_granted_at));
}
function accessSummary(row) {
 const internal=isInternal(row);
 return {accessKind:internal?'internal_complimentary':'standard',accessLabel:internal?'Internal / Complimentary':null,isComplimentary:internal,isPaid:internal?false:!!(row&&row.is_paid)};
}
module.exports={isInternal,accessSummary};
