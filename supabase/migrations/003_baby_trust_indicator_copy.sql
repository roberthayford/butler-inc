-- Baby Butler hero trust bar: align first indicator with current product copy
-- (site_content overrides butler-page-configs when a row exists)
update site_content
set content = jsonb_set(
  content,
  '{trustIndicators,0}',
  to_jsonb('Enhanced DBS check verified Butlers'::text)
)
where page_slug = 'baby'
  and content->'trustIndicators'->>0 = 'Enhanced DBS checked';
