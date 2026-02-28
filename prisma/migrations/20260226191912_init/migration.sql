-- Enable pgvector extension (run with DB user that can create extensions)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "drive_tokens" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drive_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_documents" (
    "id" UUID NOT NULL,
    "file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drive_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_chunks" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drive_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drive_tokens_user_id_key" ON "drive_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drive_documents_file_id_key" ON "drive_documents"("file_id");

-- CreateIndex
CREATE INDEX "drive_chunks_document_id_idx" ON "drive_chunks"("document_id");

-- AddForeignKey
ALTER TABLE "drive_chunks" ADD CONSTRAINT "drive_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "drive_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
