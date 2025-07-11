CREATE TABLE IF NOT EXISTS excaliapp (
    id varchar(50) PRIMARY KEY,
    userId varchar(255) NOT NULL,
    name varchar(255) NOT NULL,
    data blob NOT NULL,
    thumbnail blob,
    isPublic boolean DEFAULT false,
    inStorage varchar(10) DEFAULT 'api',
    createdAt timestamp DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER [UpdateLastTime]
    AFTER UPDATE
    ON excaliapp
    FOR EACH ROW
    WHEN NEW.updatedAt < OLD.updatedAt
BEGIN
    UPDATE excaliapp SET updatedAt=CURRENT_TIMESTAMP WHERE id=OLD.id;
END;