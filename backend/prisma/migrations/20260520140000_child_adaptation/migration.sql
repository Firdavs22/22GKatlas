-- Период адаптации для новых детей. По умолчанию false для существующих записей,
-- админ/педагог отмечает галкой при добавлении и снимает когда ребёнок освоился.

ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "inAdaptation" BOOLEAN NOT NULL DEFAULT false;
