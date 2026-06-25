ALTER TABLE "cards" DROP CONSTRAINT "cards_qr_token_unique";--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "qr_token";--> statement-breakpoint
ALTER TABLE "queue_sessions" DROP COLUMN "qr_token";--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_card_number_unique" UNIQUE("card_number");