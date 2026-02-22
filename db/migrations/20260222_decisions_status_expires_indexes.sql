create index if not exists decisions_status_idx
  on decisions(status);

create index if not exists decisions_expires_at_idx
  on decisions(expires_at);
