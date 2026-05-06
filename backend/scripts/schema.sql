-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- firms
CREATE TABLE IF NOT EXISTS firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'lawyer' CHECK (role IN ('admin', 'lawyer', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- matters
CREATE TABLE IF NOT EXISTS matters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    caratula TEXT NOT NULL,
    client_name TEXT NOT NULL,
    matter_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES matters(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'indexed', 'failed', 'deleted')),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- chunks
CREATE TABLE IF NOT EXISTS chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(1024),
    chunk_index INTEGER NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat index for approximate cosine similarity search
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
    ON chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Full-text search index on chunk content
CREATE INDEX IF NOT EXISTS chunks_content_fts_idx
    ON chunks USING GIN (to_tsvector('spanish', content));

-- normativa_items
CREATE TABLE IF NOT EXISTS normativa_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL CHECK (source IN ('infoleg', 'saij', 'scba')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    url TEXT,
    published_at TIMESTAMPTZ,
    embedding VECTOR(1024),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS normativa_embedding_idx
    ON normativa_items USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

-- alerts
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    normativa_item_id UUID NOT NULL REFERENCES normativa_items(id) ON DELETE CASCADE,
    affected_documents JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
