-- RAID-Z V125: seguro por uso removido.
-- Os planos antigos ficam inativos; o bootstrap migra veículos vinculados para o seguro mensal.
UPDATE "VehicleInsurancePlan"
SET "active" = false
WHERE "billingType" = 'PER_USE';

ALTER TABLE "VehicleInsurancePlan"
ALTER COLUMN "billingType" SET DEFAULT 'SUBSCRIPTION';
