-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- documents: firm isolation
CREATE POLICY "firms_own_documents" ON documents
    USING (firm_id = (auth.jwt() ->> 'firm_id')::UUID);

-- chunks: firm isolation
CREATE POLICY "firms_own_chunks" ON chunks
    USING (firm_id = (auth.jwt() ->> 'firm_id')::UUID);

-- matters: firm isolation
CREATE POLICY "firms_own_matters" ON matters
    USING (firm_id = (auth.jwt() ->> 'firm_id')::UUID);

-- alerts: firm isolation
CREATE POLICY "firms_own_alerts" ON alerts
    USING (firm_id = (auth.jwt() ->> 'firm_id')::UUID);

-- normativa_items: read-only for all authenticated users
ALTER TABLE normativa_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_normativa" ON normativa_items
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role bypasses RLS (used by backend and GitHub Actions)
