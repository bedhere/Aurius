-- Rename the Chinese series while retaining product IDs, SKUs and English names.
UPDATE "Product" SET "series" = '锐净' WHERE "series" = '瑞景';
