-- CAD Downtime Log — migration 0016
-- Round out the CJI/PHI restriction comment (§3.1) on the remaining
-- free-text columns not covered by earlier migrations.

comment on column public.outages.detected_by is 'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.outages.restoration_confirmed_by is 'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.outages.paper_form_call_numbers is 'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.outages.back_entry_performed_by is 'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.outages.back_entry_verified_by is 'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system. Must differ from back_entry_performed_by — enforced in the application layer.';

comment on column public.calls.nfirs_number is 'CJI/PHI RESTRICTION: internal reference only. No criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.calls.cad_call_number is 'CJI/PHI RESTRICTION: internal reference only. No criminal justice or protected health information may be stored anywhere in this system.';
