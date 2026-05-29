ALTER TABLE procedure_requests
ADD COLUMN created_procedure_id UUID REFERENCES procedures(id) ON DELETE SET NULL;
