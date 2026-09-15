-- AlterTable
ALTER TABLE "Child" ADD COLUMN     "monthlyFee" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "groupId" TEXT,
    "groupName" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmStage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'active',
    "position" INTEGER NOT NULL,

    CONSTRAINT "CrmStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLead" (
    "id" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "childName" TEXT NOT NULL DEFAULT '',
    "birthDate" DATE,
    "direction" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "ownerId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'Вручную',
    "utmSource" TEXT NOT NULL DEFAULT '',
    "utmMedium" TEXT NOT NULL DEFAULT '',
    "utmCampaign" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "stageId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "nextActionAt" TIMESTAMP(3),
    "remindedAt" TIMESTAMP(3),
    "nextAction" TEXT NOT NULL DEFAULT '',
    "enrollmentId" TEXT,
    "externalKey" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_requestKey_key" ON "Enrollment"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "CrmLead_enrollmentId_key" ON "CrmLead"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmLead_externalKey_key" ON "CrmLead"("externalKey");

-- CreateIndex
CREATE INDEX "CrmLead_phone_idx" ON "CrmLead"("phone");

-- CreateIndex
CREATE INDEX "CrmLead_state_stageId_idx" ON "CrmLead"("state", "stageId");

-- CreateIndex
CREATE INDEX "CrmLead_nextActionAt_idx" ON "CrmLead"("nextActionAt");

-- CreateIndex
CREATE INDEX "CrmActivity_leadId_createdAt_idx" ON "CrmActivity"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "CrmStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Default pipeline is data, not a hard-coded client-side transition order.
INSERT INTO "CrmStage" (id, title, kind, position) VALUES
('crm-new', 'Новая заявка', 'active', 0),
('crm-contact', 'Общение', 'active', 1),
('crm-tour', 'Экскурсия', 'active', 2),
('crm-meeting', 'Встреча', 'active', 3),
('crm-contract', 'Оформление', 'active', 4),
('crm-later', 'Связаться позже', 'deferred', 5),
('crm-lost', 'Отказ', 'lost', 6);
