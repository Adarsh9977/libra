-- CreateTable
CREATE TABLE "chats" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL DEFAULT 'default',
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_turns" (
    "id" UUID NOT NULL,
    "chat_id" UUID NOT NULL,
    "task" TEXT NOT NULL,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "finalAnswer" JSONB NOT NULL,
    "toolsUsed" JSONB NOT NULL DEFAULT '[]',
    "token_usage" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_turns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chats_user_id_idx" ON "chats"("user_id");

-- CreateIndex
CREATE INDEX "chat_turns_chat_id_idx" ON "chat_turns"("chat_id");

-- AddForeignKey
ALTER TABLE "chat_turns" ADD CONSTRAINT "chat_turns_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
