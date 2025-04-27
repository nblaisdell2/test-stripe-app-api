USE [TestStripe]

CREATE TABLE Users (
	UserID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
	UserName VARCHAR(100) NOT NULL,
	UserEmail VARCHAR(255) NOT NULL,
	StripeCustomerID VARCHAR(255) NULL
) ON 'primary';

CREATE TABLE Activity (
	UserID UNIQUEIDENTIFIER PRIMARY KEY,
	CurrCount INT NOT NULL DEFAULT 0
) ON 'primary';

CREATE TABLE SubscriptionDetails (
	UserID UNIQUEIDENTIFIER NOT NULL,
	SubscriptionID VARCHAR(255) NOT NULL,
	SubscriptionStatus VARCHAR(100) NULL,
	IsInTrial BIT NULL,
	StartDateTime DATETIME NULL,
	EndDateTime DATETIME NULL,
	PRIMARY KEY (UserID, SubscriptionID)
) ON 'primary';

SELECT *
FROM Users
SELECT *
FROM Activity
SELECT *
FROM SubscriptionDetails

--UPDATE SubscriptionDetails
--SET EndDateTime = DATEADD(year, -2, EndDateTime)

TRUNCATE TABLE Users
TRUNCATE TABLE Activity
TRUNCATE TABLE SubscriptionDetails
