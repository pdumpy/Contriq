CREATE TABLE employees (
 id uuid PRIMARY KEY, employee_code text NOT NULL UNIQUE CHECK (btrim(employee_code) <> ''),
 name text NOT NULL CHECK (btrim(name) <> ''),
 job_family text NOT NULL CHECK(job_family IN ('data_science','backend_engineering','full_stack_engineering','applied_agentic_ai')),
 job_level text NOT NULL CHECK(job_level = 'mid'), team text NOT NULL CHECK(btrim(team) <> ''), joined_at date NOT NULL CHECK(isfinite(joined_at))
);
CREATE INDEX employee_directory ON employees(job_family,job_level,employee_code);
CREATE TABLE scoring_rubrics (
 id uuid PRIMARY KEY, job_family text NOT NULL CHECK(job_family IN ('data_science','backend_engineering','full_stack_engineering','applied_agentic_ai')),
 version integer NOT NULL CHECK(version>0), rules jsonb NOT NULL CHECK(jsonb_typeof(rules)='object'),
 status text NOT NULL CHECK(status IN ('draft','active','retired')), created_at timestamptz NOT NULL CHECK(isfinite(created_at)),
 UNIQUE(job_family,version), UNIQUE(id,job_family)
);
CREATE UNIQUE INDEX rubric_active ON scoring_rubrics(job_family) WHERE status='active';
CREATE TABLE evidence_records (
 id uuid PRIMARY KEY, employee_id uuid NOT NULL REFERENCES employees(id), source text NOT NULL CHECK(btrim(source)<>''), source_record_id text NOT NULL CHECK(btrim(source_record_id)<>''),
 revision integer NOT NULL CHECK(revision>0), supersedes_id uuid UNIQUE REFERENCES evidence_records(id), record_type text NOT NULL CHECK(btrim(record_type)<>''),
 observed_at timestamptz CHECK(isfinite(observed_at)), ingested_at timestamptz NOT NULL CHECK(isfinite(ingested_at)),
 raw_payload jsonb NOT NULL CHECK(jsonb_typeof(raw_payload)='object'), normalizer_version text NOT NULL CHECK(btrim(normalizer_version)<>''),
 validation_status text NOT NULL CHECK(validation_status IN ('valid','invalid','retracted')), validation_reason text,
 UNIQUE(source,source_record_id,revision), CHECK((revision=1 AND supersedes_id IS NULL) OR (revision>1 AND supersedes_id IS NOT NULL)),
 CHECK((validation_status='valid' AND observed_at IS NOT NULL AND validation_reason IS NULL) OR (validation_status<>'valid' AND btrim(validation_reason)<>''))
);
CREATE INDEX evidence_trace ON evidence_records(employee_id,observed_at);
CREATE TABLE evidence_facts (
 id uuid PRIMARY KEY, evidence_id uuid NOT NULL REFERENCES evidence_records(id), fact_type text NOT NULL CHECK(btrim(fact_type)<>''), fact_key text NOT NULL CHECK(btrim(fact_key)<>''), canonical_fact_key text,
 value_number numeric CHECK(value_number NOT IN ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric)), value_boolean boolean, value_text text,
 attributes jsonb NOT NULL CHECK(jsonb_typeof(attributes)='object'), observed_at timestamptz NOT NULL CHECK(isfinite(observed_at)),
 validation_status text NOT NULL CHECK(validation_status IN ('valid','invalid')), validation_reason text,
 UNIQUE(evidence_id,fact_type,fact_key), CHECK(num_nonnulls(value_number,value_boolean,value_text)=1),
 CHECK((validation_status='valid' AND btrim(canonical_fact_key)<>'' AND validation_reason IS NULL) OR (validation_status='invalid' AND btrim(validation_reason)<>''))
);
CREATE TABLE evidence_coverage (
 id uuid PRIMARY KEY, employee_id uuid NOT NULL REFERENCES employees(id), source text NOT NULL CHECK(btrim(source)<>''), period_start date NOT NULL, period_end date NOT NULL,
 revision integer NOT NULL CHECK(revision>0), completeness_status text NOT NULL CHECK(completeness_status IN ('complete','partial','unavailable','unknown')),
 last_checked_at timestamptz NOT NULL CHECK(isfinite(last_checked_at)), reason text,
 UNIQUE(employee_id,source,period_start,period_end,revision), CHECK(isfinite(period_start) AND isfinite(period_end) AND period_start<period_end)
);
CREATE TABLE scoring_runs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, run_key uuid NOT NULL UNIQUE,
 started_at timestamptz NOT NULL DEFAULT now() CHECK(isfinite(started_at)), finished_at timestamptz CHECK(isfinite(finished_at)),
 status text NOT NULL CHECK(status IN ('running','published','failed')), evaluation_start date NOT NULL, evaluation_end date NOT NULL,
 engine_version text NOT NULL CHECK(btrim(engine_version)<>''), input_manifest jsonb NOT NULL CHECK(jsonb_typeof(input_manifest)='object'), failure_code text,
 CHECK(isfinite(evaluation_start) AND isfinite(evaluation_end) AND evaluation_end=evaluation_start+90),
 CHECK((status='running' AND finished_at IS NULL AND failure_code IS NULL) OR (status='published' AND finished_at>=started_at AND failure_code IS NULL) OR (status='failed' AND finished_at>=started_at AND btrim(failure_code)<>''))
);
CREATE INDEX published_runs ON scoring_runs(evaluation_start,evaluation_end,id DESC) WHERE status='published';
CREATE TABLE scores (
 id uuid PRIMARY KEY, employee_id uuid NOT NULL REFERENCES employees(id), run_id bigint NOT NULL REFERENCES scoring_runs(id), rubric_id uuid NOT NULL,
 job_family text NOT NULL, total_score numeric CHECK(total_score BETWEEN 0 AND 100), status text NOT NULL CHECK(status IN ('calculated','insufficient_evidence')),
 reason_code text, calculated_at timestamptz NOT NULL CHECK(isfinite(calculated_at)), UNIQUE(run_id,employee_id),
 FOREIGN KEY(rubric_id,job_family) REFERENCES scoring_rubrics(id,job_family),
 CHECK((status='calculated' AND total_score IS NOT NULL AND reason_code IS NULL) OR (status='insufficient_evidence' AND total_score IS NULL AND btrim(reason_code)<>''))
);
CREATE INDEX employee_history ON scores(employee_id,run_id DESC);
CREATE INDEX score_rubrics ON scores(rubric_id,job_family);
CREATE TABLE score_components (
 id uuid PRIMARY KEY, score_id uuid NOT NULL REFERENCES scores(id), dimension text NOT NULL CHECK(dimension IN ('delivery','quality','validation','reliability','maintainability','collaboration')),
 submetric text CHECK(btrim(submetric)<>''), numerator numeric, denominator numeric, component_score numeric CHECK(component_score BETWEEN 0 AND 100),
 weight_percent numeric CHECK(weight_percent BETWEEN 0 AND 100), status text NOT NULL CHECK(status IN ('calculated','unavailable')), reason_code text,
 calculation_details jsonb NOT NULL CHECK(jsonb_typeof(calculation_details)='object'),
 CHECK((numerator IS NULL)=(denominator IS NULL)), CHECK(numerator IS NULL OR numerator NOT IN ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric)),
 CHECK(denominator IS NULL OR denominator NOT IN ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric)),
 CHECK(submetric IS NOT NULL OR weight_percent IS NOT NULL),
 CHECK((status='calculated' AND component_score IS NOT NULL AND reason_code IS NULL AND (denominator IS NULL OR denominator<>0)) OR (status='unavailable' AND component_score IS NULL AND btrim(reason_code)<>''))
);
CREATE UNIQUE INDEX dimension_unique ON score_components(score_id,dimension) WHERE submetric IS NULL;
CREATE UNIQUE INDEX metric_unique ON score_components(score_id,dimension,submetric) WHERE submetric IS NOT NULL;
CREATE INDEX component_score ON score_components(score_id);
CREATE TABLE score_evidence_links (
 component_id uuid NOT NULL REFERENCES score_components(id), fact_id uuid NOT NULL REFERENCES evidence_facts(id), usage text NOT NULL CHECK(usage IN ('used','excluded')), exclusion_reason text,
 PRIMARY KEY(component_id,fact_id), CHECK((usage='used' AND exclusion_reason IS NULL) OR (usage='excluded' AND btrim(exclusion_reason)<>''))
);
CREATE INDEX link_fact ON score_evidence_links(fact_id);

CREATE FUNCTION prevent_history_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION '% history is append-only', TG_TABLE_NAME; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['evidence_records','evidence_facts','evidence_coverage','scores','score_components','score_evidence_links'] LOOP EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION prevent_history_change()',t); END LOOP; END $$;
CREATE FUNCTION check_evidence_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.revision>1 AND NOT EXISTS(SELECT 1 FROM evidence_records p WHERE p.id=NEW.supersedes_id AND p.source=NEW.source AND p.source_record_id=NEW.source_record_id AND p.revision=NEW.revision-1) THEN RAISE EXCEPTION 'Evidence predecessor mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER evidence_revision BEFORE INSERT ON evidence_records FOR EACH ROW EXECUTE FUNCTION check_evidence_revision();
CREATE FUNCTION protect_rubric() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dimensions jsonb; d jsonb; total numeric := 0; keys text[] := '{}';
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Rubric history is append-only'; END IF;
 IF TG_OP='UPDATE' AND OLD.status<>'draft' AND (NEW.id<>OLD.id OR NEW.job_family<>OLD.job_family OR NEW.version<>OLD.version OR NEW.rules<>OLD.rules OR NEW.created_at<>OLD.created_at OR NEW.status NOT IN (OLD.status,'retired')) THEN RAISE EXCEPTION 'Activated rubric is immutable'; END IF;
 IF NEW.status='active' THEN
  IF NEW.rules->>'id' IS DISTINCT FROM NEW.id::text OR NEW.rules->>'jobFamily' IS DISTINCT FROM NEW.job_family OR (NEW.rules->>'version')::integer IS DISTINCT FROM NEW.version THEN RAISE EXCEPTION 'Rubric identity mismatch'; END IF;
  dimensions := NEW.rules->'dimensions';
  IF jsonb_typeof(dimensions) IS DISTINCT FROM 'array' OR jsonb_array_length(dimensions)<>6 THEN RAISE EXCEPTION 'Six rubric dimensions required'; END IF;
  FOR d IN SELECT value FROM jsonb_array_elements(dimensions) LOOP
   IF d->>'key' <> ALL(ARRAY['delivery','quality','validation','reliability','maintainability','collaboration']) OR d->>'key'=ANY(keys) THEN RAISE EXCEPTION 'Invalid rubric dimensions'; END IF;
   keys := array_append(keys,d->>'key'); total := total+(d->>'weight')::numeric;
   IF (d->>'weight')::numeric NOT BETWEEN 0 AND 100 OR (d->>'key'='collaboration' AND (d->>'weight')::numeric<>2) OR jsonb_typeof(d->'metrics') IS DISTINCT FROM 'array' OR jsonb_array_length(d->'metrics')=0 THEN RAISE EXCEPTION 'Invalid rubric weights or metrics'; END IF;
  END LOOP;
  IF total<>100 THEN RAISE EXCEPTION 'Rubric weights must sum to 100'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER rubric_contract BEFORE INSERT OR UPDATE OR DELETE ON scoring_rubrics FOR EACH ROW EXECUTE FUNCTION protect_rubric();
CREATE FUNCTION guard_run_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Run history is append-only'; END IF;
 IF OLD.status<>'running' OR NEW.id<>OLD.id OR NEW.run_key<>OLD.run_key OR NEW.started_at<>OLD.started_at OR NEW.evaluation_start<>OLD.evaluation_start OR NEW.evaluation_end<>OLD.evaluation_end OR NEW.engine_version<>OLD.engine_version OR NEW.input_manifest<>OLD.input_manifest OR NEW.status='running' THEN RAISE EXCEPTION 'Invalid run transition'; END IF;
 IF NEW.status='published' AND ((SELECT count(*) FROM scores WHERE run_id=NEW.id)<>200 OR jsonb_array_length(NEW.input_manifest->'employees')<>200) THEN RAISE EXCEPTION 'Publication requires the complete 200 employee cohort'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER run_transition BEFORE UPDATE OR DELETE ON scoring_runs FOR EACH ROW EXECUTE FUNCTION guard_run_transition();
CREATE FUNCTION guard_result_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE run_status text;
BEGIN
 IF TG_TABLE_NAME='scores' THEN SELECT status INTO run_status FROM scoring_runs WHERE id=NEW.run_id FOR UPDATE;
 ELSIF TG_TABLE_NAME='score_components' THEN SELECT r.status INTO run_status FROM scoring_runs r JOIN scores s ON s.run_id=r.id WHERE s.id=NEW.score_id FOR UPDATE OF r;
 ELSE SELECT r.status INTO run_status FROM scoring_runs r JOIN scores s ON s.run_id=r.id JOIN score_components c ON c.score_id=s.id WHERE c.id=NEW.component_id FOR UPDATE OF r; END IF;
 IF run_status IS DISTINCT FROM 'running' THEN RAISE EXCEPTION 'Results may only be inserted into a running attempt'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER score_write BEFORE INSERT ON scores FOR EACH ROW EXECUTE FUNCTION guard_result_insert();
CREATE TRIGGER component_write BEFORE INSERT ON score_components FOR EACH ROW EXECUTE FUNCTION guard_result_insert();
CREATE TRIGGER link_write BEFORE INSERT ON score_evidence_links FOR EACH ROW EXECUTE FUNCTION guard_result_insert();
