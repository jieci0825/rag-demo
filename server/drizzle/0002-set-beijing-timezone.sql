DO $$
BEGIN
    EXECUTE format(
        'ALTER DATABASE %I SET timezone TO %L',
        current_database(),
        'Asia/Shanghai'
    );
END
$$;
--> statement-breakpoint
SET TIME ZONE 'Asia/Shanghai';
