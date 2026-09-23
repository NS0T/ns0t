BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;




CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);



CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
    ON users (LOWER(email));

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE IF NOT EXISTS portfolio_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin'
        CHECK (role IN ('owner', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash BYTEA PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    CHECK (octet_length(token_hash) = 32)
);

CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx
    ON admin_sessions (expires_at);




CREATE TABLE IF NOT EXISTS portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    project_url TEXT,
    source_url TEXT,
    image_url TEXT,
    cloudinary_public_id TEXT,
    cloudinary_resource_type TEXT DEFAULT 'image',
    technologies TEXT[] NOT NULL DEFAULT '{}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (slug)
);


DROP TRIGGER IF EXISTS portfolio_items_set_updated_at ON portfolio_items;
CREATE TRIGGER portfolio_items_set_updated_at
    BEFORE UPDATE ON portfolio_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();



CREATE TABLE IF NOT EXISTS guestbook_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    message TEXT NOT NULL,
    website_url TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);



DROP TRIGGER IF EXISTS guestbook_comments_set_updated_at ON guestbook_comments;
CREATE TRIGGER guestbook_comments_set_updated_at
    BEFORE UPDATE ON guestbook_comments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();



CREATE TABLE IF NOT EXISTS guestbook_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL
        REFERENCES guestbook_comments(id) ON DELETE CASCADE,
    user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);



DROP TRIGGER IF EXISTS guestbook_replies_set_updated_at ON guestbook_replies;
CREATE TRIGGER guestbook_replies_set_updated_at
    BEFORE UPDATE ON guestbook_replies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS portfolio_admins_user_id_idx
    ON portfolio_admins (user_id);

CREATE INDEX IF NOT EXISTS portfolio_items_published_order_idx
    ON portfolio_items (is_published, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS portfolio_items_cloudinary_public_id_idx
    ON portfolio_items (cloudinary_public_id);

CREATE INDEX IF NOT EXISTS guestbook_comments_approved_created_idx
    ON guestbook_comments (is_approved, created_at DESC);

CREATE INDEX IF NOT EXISTS guestbook_replies_comment_created_idx
    ON guestbook_replies (comment_id, created_at ASC);

CREATE INDEX IF NOT EXISTS guestbook_replies_published_idx
    ON guestbook_replies (is_published, created_at DESC);

COMMIT;
