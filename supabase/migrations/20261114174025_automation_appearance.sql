alter table public.automations
  add column description text not null default '',
  add column color jsonb,
  add column icon jsonb,
  add constraint automations_description_length check (char_length(description) <= 10000),
  add constraint automations_color_object check (color is null or jsonb_typeof(color) = 'object'),
  add constraint automations_icon_object check (icon is null or jsonb_typeof(icon) = 'object');

comment on column public.automations.description is 'User-facing summary, separate from the chat start message.';
