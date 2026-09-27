<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Create the chat views and the chat stored procedures.
     *
     * Writes go through three stored procedures (create / update / delete) so the
     * ownership and validation rules live in the database instead of the
     * controller. Reads go through two views (conversation headers and the
     * message rows of a thread) so every read query joins the same shape.
     */
    public function up(): void
    {
        if (DB::selectOne("SELECT OBJECT_ID('dbo.chat_view_and_procedures', 'U') AS [id]")->id) {
            DB::statement('DROP TABLE [dbo].[chat_view_and_procedures]');
        }

        $this->dropChatObjects();

        $this->createConversationView();
        $this->createMessageView();

        $this->createCreateMessageProcedure();
        $this->createUpdateMessageProcedure();
        $this->createDeleteMessageProcedure();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->dropChatObjects();
    }

    private function dropChatObjects(): void
    {
        DB::statement('DROP PROCEDURE IF EXISTS [dbo].[sp_create_chat_message]');
        DB::statement('DROP PROCEDURE IF EXISTS [dbo].[sp_update_chat_message]');
        DB::statement('DROP PROCEDURE IF EXISTS [dbo].[sp_delete_chat_message]');
        DB::statement('DROP VIEW IF EXISTS [dbo].[vw_chat_conversations]');
        DB::statement('DROP VIEW IF EXISTS [dbo].[vw_chat_messages]');
    }

    /**
     * One row per conversation (a pair of users), holding the newest message.
     * The viewer is not baked into the view, so the caller resolves the "other"
     * participant from user_a / user_b.
     */
    private function createConversationView(): void
    {
        DB::statement("
            CREATE VIEW [dbo].[vw_chat_conversations] AS
            SELECT
                g.[user_a],
                g.[user_b],
                m.[id] AS [last_message_id],
                m.[conversation] AS [last_message],
                m.[created_at] AS [last_message_at]
            FROM (
                SELECT
                    LEAST([from_user_id], [to_user_id]) AS [user_a],
                    GREATEST([from_user_id], [to_user_id]) AS [user_b],
                    MAX([id]) AS [last_message_id]
                FROM [dbo].[messages]
                GROUP BY LEAST([from_user_id], [to_user_id]), GREATEST([from_user_id], [to_user_id])
            ) g
            INNER JOIN [dbo].[messages] m ON m.[id] = g.[last_message_id]
        ");
    }

    /**
     * Every message row, enriched with the sender and the recipient.
     */
    private function createMessageView(): void
    {
        DB::statement("
            CREATE VIEW [dbo].[vw_chat_messages] AS
            SELECT
                m.[id],
                m.[from_user_id],
                m.[to_user_id],
                m.[conversation],
                m.[created_at],
                m.[updated_at],
                s.[name] AS [sender_name],
                s.[role] AS [sender_role],
                s.[phone] AS [sender_phone],
                r.[name] AS [recipient_name],
                r.[role] AS [recipient_role]
            FROM [dbo].[messages] m
            INNER JOIN [dbo].[users] s ON s.[id] = m.[from_user_id]
            INNER JOIN [dbo].[users] r ON r.[id] = m.[to_user_id]
        ");
    }

    private function createCreateMessageProcedure(): void
    {
        DB::statement("
            CREATE PROCEDURE [dbo].[sp_create_chat_message]
                @fromUserId BIGINT,
                @toUserId BIGINT,
                @conversation NVARCHAR(MAX)
            AS
            BEGIN
                SET NOCOUNT ON;

                IF @toUserId IS NULL OR @toUserId = 0 OR @toUserId = @fromUserId
                BEGIN
                    SELECT 0 AS [result], CAST(NULL AS BIGINT) AS [id], 'Invalid recipient.' AS [message];
                    RETURN;
                END

                IF NOT EXISTS (SELECT 1 FROM [dbo].[users] WHERE [id] = @toUserId)
                BEGIN
                    SELECT 0 AS [result], CAST(NULL AS BIGINT) AS [id], 'Recipient not found.' AS [message];
                    RETURN;
                END

                IF @conversation IS NULL OR LTRIM(RTRIM(@conversation)) = ''
                BEGIN
                    SELECT 0 AS [result], CAST(NULL AS BIGINT) AS [id], 'Message cannot be empty.' AS [message];
                    RETURN;
                END

                INSERT INTO [dbo].[messages] ([from_user_id], [to_user_id], [conversation], [created_at], [updated_at])
                VALUES (@fromUserId, @toUserId, @conversation, GETDATE(), GETDATE());

                SELECT
                    v.[id],
                    v.[from_user_id],
                    v.[to_user_id],
                    v.[conversation],
                    v.[created_at],
                    1 AS [result],
                    'Message sent successfully.' AS [message]
                FROM [dbo].[vw_chat_messages] v
                WHERE v.[id] = CAST(SCOPE_IDENTITY() AS BIGINT);
            END
        ");
    }

    private function createUpdateMessageProcedure(): void
    {
        DB::statement("
            CREATE PROCEDURE [dbo].[sp_update_chat_message]
                @messageId BIGINT,
                @userId BIGINT,
                @conversation NVARCHAR(MAX)
            AS
            BEGIN
                SET NOCOUNT ON;

                DECLARE @ownerId BIGINT;
                SELECT @ownerId = [from_user_id] FROM [dbo].[messages] WHERE [id] = @messageId;

                IF @ownerId IS NULL
                BEGIN
                    SELECT -1 AS [result], CAST(NULL AS BIGINT) AS [id], 'Message not found.' AS [message];
                    RETURN;
                END

                IF @ownerId <> @userId
                BEGIN
                    SELECT -2 AS [result], CAST(NULL AS BIGINT) AS [id], 'You can only edit your own messages.' AS [message];
                    RETURN;
                END

                IF @conversation IS NULL OR LTRIM(RTRIM(@conversation)) = ''
                BEGIN
                    SELECT 0 AS [result], CAST(NULL AS BIGINT) AS [id], 'Message cannot be empty.' AS [message];
                    RETURN;
                END

                UPDATE [dbo].[messages]
                SET [conversation] = @conversation, [updated_at] = GETDATE()
                WHERE [id] = @messageId;

                SELECT
                    v.[id],
                    v.[from_user_id],
                    v.[to_user_id],
                    v.[conversation],
                    v.[created_at],
                    v.[updated_at],
                    1 AS [result],
                    'Message updated.' AS [message]
                FROM [dbo].[vw_chat_messages] v
                WHERE v.[id] = @messageId;
            END
        ");
    }

    private function createDeleteMessageProcedure(): void
    {
        DB::statement("
            CREATE PROCEDURE [dbo].[sp_delete_chat_message]
                @messageId BIGINT,
                @userId BIGINT
            AS
            BEGIN
                SET NOCOUNT ON;

                DECLARE @ownerId BIGINT;
                SELECT @ownerId = [from_user_id] FROM [dbo].[messages] WHERE [id] = @messageId;

                IF @ownerId IS NULL
                BEGIN
                    SELECT -1 AS [result], 'Message not found.' AS [message];
                    RETURN;
                END

                IF @ownerId <> @userId
                BEGIN
                    SELECT -2 AS [result], 'You can only delete your own messages.' AS [message];
                    RETURN;
                END

                DELETE FROM [dbo].[messages] WHERE [id] = @messageId;

                SELECT 1 AS [result], 'Message deleted.' AS [message];
            END
        ");
    }
};
