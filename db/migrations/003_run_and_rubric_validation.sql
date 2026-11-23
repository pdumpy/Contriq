ALTER TABLE scoring_runs ADD CONSTRAINT terminal_time_present
 CHECK (status='running' OR finished_at IS NOT NULL);

CREATE FUNCTION validate_run_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status<>'running' THEN
  RAISE EXCEPTION 'New scoring attempts must start running';
 END IF;
 IF jsonb_typeof(NEW.input_manifest->'employees') IS DISTINCT FROM 'array'
    OR jsonb_array_length(NEW.input_manifest->'employees')<>200 THEN
  RAISE EXCEPTION 'Run capture requires the complete cohort manifest';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER run_capture BEFORE INSERT ON scoring_runs
 FOR EACH ROW EXECUTE FUNCTION validate_run_insert();

CREATE OR REPLACE FUNCTION protect_rubric() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
 dimensions jsonb;
 d jsonb;
 m jsonb;
 total numeric := 0;
 metric_total numeric;
 keys text[] := '{}';
 metric_keys text[] := '{}';
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Rubric history is append-only'; END IF;
 IF TG_OP='UPDATE' AND OLD.status<>'draft' AND (
   NEW.id<>OLD.id OR NEW.job_family<>OLD.job_family OR NEW.version<>OLD.version
   OR NEW.rules<>OLD.rules OR NEW.created_at<>OLD.created_at
   OR NEW.status NOT IN (OLD.status,'retired')
 ) THEN RAISE EXCEPTION 'Activated rubric is immutable'; END IF;
 IF NEW.status='active' THEN
  IF NEW.rules->>'id' IS DISTINCT FROM NEW.id::text
     OR NEW.rules->>'jobFamily' IS DISTINCT FROM NEW.job_family
     OR NEW.rules->>'version' IS DISTINCT FROM NEW.version::text THEN
   RAISE EXCEPTION 'Rubric identity mismatch';
  END IF;
  dimensions := NEW.rules->'dimensions';
  IF jsonb_typeof(dimensions) IS DISTINCT FROM 'array' OR jsonb_array_length(dimensions)<>6 THEN
   RAISE EXCEPTION 'Six rubric dimensions required';
  END IF;
  FOR d IN SELECT value FROM jsonb_array_elements(dimensions) LOOP
   IF d->>'key' IS NULL
      OR d->>'key'<>ALL(ARRAY['delivery','quality','validation','reliability','maintainability','collaboration'])
      OR d->>'key'=ANY(keys) THEN
    RAISE EXCEPTION 'Invalid rubric dimensions';
   END IF;
   keys := array_append(keys,d->>'key');
   IF jsonb_typeof(d->'weight') IS DISTINCT FROM 'number'
      OR (d->>'weight')::numeric NOT BETWEEN 0 AND 100
      OR trunc((d->>'weight')::numeric)<>(d->>'weight')::numeric
      OR (d->>'key'='collaboration' AND (d->>'weight')::numeric<>2)
      OR jsonb_typeof(d->'metrics') IS DISTINCT FROM 'array'
      OR jsonb_array_length(d->'metrics')=0 THEN
    RAISE EXCEPTION 'Invalid rubric weights or metrics';
   END IF;
   total := total+(d->>'weight')::numeric;
   metric_total := 0;
   FOR m IN SELECT value FROM jsonb_array_elements(d->'metrics') LOOP
    IF m->>'key' IS NULL OR btrim(m->>'key')='' OR m->>'key'=ANY(metric_keys)
       OR m->>'source' IS NULL OR btrim(m->>'source')=''
       OR jsonb_typeof(m->'weight') IS DISTINCT FROM 'number'
       OR (m->>'weight')::numeric NOT BETWEEN 1 AND 100
       OR trunc((m->>'weight')::numeric)<>(m->>'weight')::numeric THEN
     RAISE EXCEPTION 'Invalid binary metric definition';
    END IF;
    metric_keys := array_append(metric_keys,m->>'key');
    metric_total := metric_total+(m->>'weight')::numeric;
   END LOOP;
   IF metric_total<>100 THEN RAISE EXCEPTION 'Metric weights must sum to 100'; END IF;
  END LOOP;
  IF total<>100 THEN RAISE EXCEPTION 'Rubric weights must sum to 100'; END IF;
 END IF;
 RETURN NEW;
END $$;
