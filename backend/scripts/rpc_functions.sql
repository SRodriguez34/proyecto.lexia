-- Semantic similarity search on chunks (all matters in a firm)
CREATE OR REPLACE FUNCTION match_chunks(
    query_embedding VECTOR(1024),
    firm_id_param UUID,
    match_count INT DEFAULT 20
)
RETURNS TABLE (
    id UUID, document_id UUID, firm_id UUID,
    content TEXT, metadata JSONB, chunk_index INT, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT id, document_id, firm_id, content, metadata, chunk_index,
           1 - (embedding <=> query_embedding) AS similarity
    FROM chunks
    WHERE firm_id = firm_id_param
      --AND status IS DISTINCT FROM 'deleted'
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Semantic similarity search filtered by matter
CREATE OR REPLACE FUNCTION match_chunks_by_matter(
    query_embedding VECTOR(1024),
    firm_id_param UUID,
    matter_id_param UUID,
    match_count INT DEFAULT 20
)
RETURNS TABLE (
    id UUID, document_id UUID, firm_id UUID,
    content TEXT, metadata JSONB, chunk_index INT, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT c.id, c.document_id, c.firm_id, c.content, c.metadata, c.chunk_index,
           1 - (c.embedding <=> query_embedding) AS similarity
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE c.firm_id = firm_id_param
      AND d.matter_id = matter_id_param
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Keyword (BM25) search on chunks (all matters in a firm)
CREATE OR REPLACE FUNCTION keyword_search_chunks(
    query_text TEXT,
    firm_id_param UUID,
    match_count INT DEFAULT 20
)
RETURNS TABLE (
    id UUID, document_id UUID, firm_id UUID,
    content TEXT, metadata JSONB, chunk_index INT, rank FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT id, document_id, firm_id, content, metadata, chunk_index,
           ts_rank(to_tsvector('spanish', content), plainto_tsquery('spanish', query_text)) AS rank
    FROM chunks
    WHERE firm_id = firm_id_param
      AND to_tsvector('spanish', content) @@ plainto_tsquery('spanish', query_text)
    ORDER BY rank DESC
    LIMIT match_count;
$$;

-- Keyword search filtered by matter
CREATE OR REPLACE FUNCTION keyword_search_chunks_by_matter(
    query_text TEXT,
    firm_id_param UUID,
    matter_id_param UUID,
    match_count INT DEFAULT 20
)
RETURNS TABLE (
    id UUID, document_id UUID, firm_id UUID,
    content TEXT, metadata JSONB, chunk_index INT, rank FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT c.id, c.document_id, c.firm_id, c.content, c.metadata, c.chunk_index,
           ts_rank(to_tsvector('spanish', c.content), plainto_tsquery('spanish', query_text)) AS rank
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE c.firm_id = firm_id_param
      AND d.matter_id = matter_id_param
      AND to_tsvector('spanish', c.content) @@ plainto_tsquery('spanish', query_text)
    ORDER BY rank DESC
    LIMIT match_count;
$$;

-- Match all firm chunks against a normativa embedding (for alert generation)
CREATE OR REPLACE FUNCTION match_chunks_for_normativa(
    query_embedding VECTOR(1024),
    similarity_threshold FLOAT DEFAULT 0.75,
    match_count INT DEFAULT 50
)
RETURNS TABLE (
    id UUID, document_id UUID, firm_id UUID,
    content TEXT, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT id, document_id, firm_id, content,
           1 - (embedding <=> query_embedding) AS similarity
    FROM chunks
    WHERE 1 - (embedding <=> query_embedding) >= similarity_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
