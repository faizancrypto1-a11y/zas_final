-- AlterTable
ALTER TABLE `Order` ADD COLUMN `amountDue` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `amountPaid` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `codAdvanceAmount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `prepaidDiscountAmount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `razorpayOrderId` VARCHAR(191) NULL,
    ADD COLUMN `razorpayPaymentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Order_razorpayOrderId_key` ON `Order`(`razorpayOrderId`);

-- CreateIndex
CREATE UNIQUE INDEX `Order_razorpayPaymentId_key` ON `Order`(`razorpayPaymentId`);
